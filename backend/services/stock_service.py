import os
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional, List, Dict, Any, Tuple

import numpy as np
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("FMP_API_KEY", "")
BASE_URL = "https://financialmodelingprep.com/stable"

# 5-minute in-memory cache
_cache: Dict[str, Tuple[Any, float]] = {}
CACHE_TTL = 300

US_EXCHANGES = {"NYSE", "NASDAQ", "AMEX", "NYSEArca", "CBOE"}
TIME_FRAMES = ["1Y", "3Y", "5Y", "7Y", "10Y"]


def _get_cached(key: str) -> Optional[Any]:
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
        del _cache[key]
    return None


def _set_cached(key: str, data: Any) -> None:
    _cache[key] = (data, time.time())


def fmp_get(path: str, params: Optional[Dict] = None) -> Any:
    p: Dict[str, Any] = {"apikey": API_KEY}
    if params:
        p.update(params)
    resp = requests.get(f"{BASE_URL}{path}", params=p, timeout=15)
    resp.raise_for_status()
    return resp.json()


def safe_float(val: Any, default: float = 0.0) -> float:
    try:
        result = float(val)
        return default if (np.isnan(result) or np.isinf(result)) else result
    except (TypeError, ValueError):
        return default


def calc_cagr_pct(start: float, end: float, years: float) -> Optional[float]:
    if start <= 0 or end <= 0 or years <= 0:
        return None
    try:
        return round(((end / start) ** (1.0 / years) - 1) * 100, 1)
    except Exception:
        return None


def calc_yoy_pct(start: float, end: float) -> Optional[float]:
    if start == 0:
        return None
    try:
        return round(((end - start) / abs(start)) * 100, 1)
    except Exception:
        return None


def calc_growth_rates(values: List[float]) -> Dict[str, float]:
    """Compute fiscal-year YoY and CAGR rates from values list (newest → oldest)."""
    rates: Dict[str, float] = {}
    n = len(values)

    if n >= 2:
        one_year = calc_yoy_pct(values[1], values[0])
        if one_year is not None:
            rates["1Y"] = one_year

    for label, years in [("3Y", 3), ("5Y", 5), ("7Y", 7), ("10Y", 10)]:
        if n >= years + 1:
            c = calc_cagr_pct(values[years], values[0], years)
            if c is not None:
                rates[label] = c

    return rates


def _annual_year(item: Dict[str, Any]) -> str:
    return str(item.get("calendarYear") or item.get("date", "")[:4])


def _dividends_paid(item: Dict[str, Any]) -> float:
    return abs(
        safe_float(
            item.get("dividendsPaid")
            or item.get("cashDividendsPaid")
            or item.get("commonDividendsPaid", 0)
        )
    )


def _cash_balance(item: Dict[str, Any]) -> float:
    return safe_float(
        item.get("cashAndCashEquivalents")
        or item.get("cashAndShortTermInvestments")
        or item.get("cash", 0)
    )


def _total_debt(item: Dict[str, Any]) -> float:
    total_debt = safe_float(item.get("totalDebt", 0))
    if total_debt != 0:
        return total_debt

    return safe_float(item.get("shortTermDebt", 0)) + safe_float(
        item.get("longTermDebt", 0)
    )


def fill_all_timeframes(rates: Dict[str, float]) -> Dict[str, Optional[float]]:
    return {tf: rates.get(tf) for tf in TIME_FRAMES}


def _price_cagrs(historical: List[Dict], current_price: float) -> Dict[str, float]:
    """Compute price CAGR for each timeframe from EOD history (newest → oldest)."""
    if not historical or current_price <= 0:
        return {}

    rates: Dict[str, float] = {}
    newest_date = datetime.fromisoformat(historical[0]["date"])

    for label, years in [("1Y", 1), ("3Y", 3), ("5Y", 5), ("7Y", 7), ("10Y", 10)]:
        target = newest_date.replace(year=newest_date.year - years)
        closest = min(
            historical, key=lambda x: abs(datetime.fromisoformat(x["date"]) - target)
        )
        past_price = safe_float(closest.get("close", 0))
        c = calc_cagr_pct(past_price, current_price, years)
        if c is not None:
            rates[label] = c

    return rates


_ETF_KEYWORDS = {
    "etf",
    "fund",
    "bear",
    "bull",
    "2x",
    "3x",
    "1x",
    "daily",
    "weekly",
    "strategy",
    "leveraged",
    "inverse",
    "tracker",
    "yield",
    "option",
}

# Common aliases for companies whose ticker/name don't match the popular search term
_ALIASES: Dict[str, str] = {
    "google": "GOOGL",
    "alphabet": "GOOGL",
    "facebook": "META",
    "amazon": "AMZN",
    "tesla": "TSLA",
    "nvidia": "NVDA",
    "netflix": "NFLX",
    "salesforce": "CRM",
    "berkshire": "BRK-B",
    "jpmorgan": "JPM",
    "jp morgan": "JPM",
}


def _is_etf_like(name: str) -> bool:
    lower = name.lower()
    return any(kw in lower for kw in _ETF_KEYWORDS)


def search_stocks(query: str) -> List[Dict[str, Any]]:
    cache_key = f"search:{query.lower()}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    # Resolve alias (e.g. "Google" → "GOOGL") before hitting the API
    alias_symbol = _ALIASES.get(query.lower().strip())
    effective_query = alias_symbol if alias_symbol else query

    # Fetch both in parallel but keep results separate so we can prioritise
    sym_results: List[Dict] = []
    name_results: List[Dict] = []

    def by_symbol():
        return fmp_get("/search-symbol", {"query": effective_query, "limit": 8})

    def by_name():
        return fmp_get("/search-name", {"query": effective_query, "limit": 8})

    with ThreadPoolExecutor(max_workers=2) as ex:
        f_sym = ex.submit(by_symbol)
        f_name = ex.submit(by_name)
        try:
            sym_results = f_sym.result() or []
        except Exception:
            pass
        try:
            name_results = f_name.result() or []
        except Exception:
            pass

    # symbol-exact results first, then name results — deduplicate as we go
    seen: set = set()
    filtered: List[Dict] = []

    for item in sym_results + name_results:
        sym = item.get("symbol", "")
        exc = item.get("exchange", "")
        name = item.get("name", "")
        if sym in seen or exc not in US_EXCHANGES:
            continue
        # Skip ETF-like names unless it's an exact symbol match
        if _is_etf_like(name) and sym.upper() != query.upper():
            continue
        seen.add(sym)
        filtered.append(item)
        if len(filtered) >= 6:
            break

    if not filtered:
        _set_cached(cache_key, [])
        return []

    results = [
        {"symbol": s["symbol"], "name": s.get("name", s["symbol"]), "price": 0.0}
        for s in filtered
    ]

    _set_cached(cache_key, results)
    return results


def get_stock_data(symbol: str) -> Optional[Dict[str, Any]]:
    symbol = symbol.upper().strip()
    cache_key = f"stock:{symbol}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    ten_years_ago = (datetime.now() - timedelta(days=3660)).strftime("%Y-%m-%d")

    def fetch_quote():
        return fmp_get("/quote", {"symbol": symbol})

    def fetch_annual_income():
        return fmp_get(
            "/income-statement",
            {"symbol": symbol, "period": "annual", "limit": 11},
        )

    def fetch_annual_cashflow():
        return fmp_get(
            "/cash-flow-statement",
            {"symbol": symbol, "period": "annual", "limit": 11},
        )

    def fetch_annual_balance_sheet():
        return fmp_get(
            "/balance-sheet-statement",
            {"symbol": symbol, "period": "annual", "limit": 1},
        )

    def fetch_history():
        return fmp_get(
            "/historical-price-eod/full", {"symbol": symbol, "from": ten_years_ago}
        )

    fetchers = {
        "quote": fetch_quote,
        "annual_income": fetch_annual_income,
        "annual_cashflow": fetch_annual_cashflow,
        "annual_balance_sheet": fetch_annual_balance_sheet,
        "history": fetch_history,
    }

    api_results: Dict[str, Any] = {}
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_key = {executor.submit(fn): key for key, fn in fetchers.items()}
        for future in as_completed(future_to_key):
            key = future_to_key[future]
            try:
                api_results[key] = future.result()
            except Exception:
                api_results[key] = None

    # --- Quote: price and name ---
    quote_list = api_results.get("quote") or []
    if not quote_list:
        return None
    q = quote_list[0]
    price = safe_float(q.get("price", 0))
    name = q.get("name", symbol)

    # --- Annual financials: current metrics, growth rates, and bar chart ---
    annual_income: List[Dict] = api_results.get("annual_income") or []
    annual_cashflow: List[Dict] = api_results.get("annual_cashflow") or []
    annual_balance_sheet: List[Dict] = api_results.get("annual_balance_sheet") or []
    annual_income_newest_first = sorted(
        annual_income,
        key=_annual_year,
        reverse=True,
    )
    annual_cashflow_newest_first = sorted(
        annual_cashflow,
        key=_annual_year,
        reverse=True,
    )

    latest_annual_income = annual_income_newest_first[0] if annual_income_newest_first else {}
    latest_annual_cashflow = (
        annual_cashflow_newest_first[0] if annual_cashflow_newest_first else {}
    )
    latest_annual_balance_sheet = (
        annual_balance_sheet[0] if annual_balance_sheet else {}
    )

    earnings = safe_float(latest_annual_income.get("netIncome", 0))
    current_eps = safe_float(
        latest_annual_income.get("epsDiluted") or latest_annual_income.get("eps", 0)
    )
    pe = round(price / current_eps, 2) if current_eps > 0 else 0.0

    shares = safe_float(
        latest_annual_income.get("weightedAverageShsOutDil")
        or latest_annual_income.get("weightedAverageShsOut", 0)
    )

    current_fcf = safe_float(latest_annual_cashflow.get("freeCashFlow", 0))
    fcf_per_share = round(current_fcf / shares, 2) if shares > 0 else 0.0
    price_fcf_ratio = round(price / fcf_per_share, 2) if fcf_per_share > 0 else 0.0
    dividends_paid = _dividends_paid(latest_annual_cashflow)
    fcf_payout_ratio = (
        round((dividends_paid / current_fcf) * 100, 1) if current_fcf > 0 else None
    )
    cash = _cash_balance(latest_annual_balance_sheet)
    total_debt = _total_debt(latest_annual_balance_sheet)
    net_debt = total_debt - cash
    net_debt_fcf_ratio = round(net_debt / current_fcf, 2) if current_fcf > 0 else None

    annual_earnings_values = [
        safe_float(item.get("netIncome", 0))
        for item in annual_income_newest_first
    ]
    annual_earnings_values = [value for value in annual_earnings_values if value != 0]

    annual_fcf_values = [
        safe_float(item.get("freeCashFlow", 0)) for item in annual_cashflow_newest_first
    ]
    annual_fcf_values = [value for value in annual_fcf_values if value != 0]

    fiscal_earnings_rates = (
        calc_growth_rates(annual_earnings_values) if annual_earnings_values else {}
    )
    fiscal_fcf_rates = calc_growth_rates(annual_fcf_values) if annual_fcf_values else {}

    cashflow_by_year = {
        _annual_year(item): item for item in annual_cashflow if _annual_year(item)
    }
    annual_financials: List[Dict[str, Any]] = []

    for item in annual_income:
        year = _annual_year(item)
        if not year or year not in cashflow_by_year:
            continue

        cashflow_item = cashflow_by_year[year]
        annual_financials.append(
            {
                "year": year,
                "earnings": safe_float(item.get("netIncome", 0)),
                "freeCashFlow": safe_float(cashflow_item.get("freeCashFlow", 0)),
            }
        )

    annual_financials = sorted(annual_financials, key=lambda item: item["year"])[-11:]
    fiscal_growth_rates = {
        "earnings": fill_all_timeframes(fiscal_earnings_rates),
        "fcf": fill_all_timeframes(fiscal_fcf_rates),
    }

    # --- Historical prices: CAGR ---
    history_raw = api_results.get("history") or []
    # /historical-price-eod/full returns a flat list of {symbol, date, open, high, low, close, ...}
    if isinstance(history_raw, list):
        historical = sorted(history_raw, key=lambda x: x["date"], reverse=True)
    else:
        historical = []
    price_cagrs = _price_cagrs(historical, price)

    result = {
        "symbol": symbol,
        "name": name,
        "price": round(price, 2),
        "earnings": round(earnings, 2),
        "eps": round(current_eps, 2),
        "freeCashFlow": current_fcf,
        "sharesOutstanding": shares,
        "annualFinancials": annual_financials,
        "growthRates": {
            "fiscalYear": {
                **fiscal_growth_rates,
                "eps": fiscal_growth_rates["earnings"],
            },
        },
        "earningsGrowthRate": fiscal_growth_rates["earnings"],
        "epsGrowthRate": fiscal_growth_rates["earnings"],
        "fcfGrowthRate": fiscal_growth_rates["fcf"],
        "cagr": {
            **{k: 0.0 for k in TIME_FRAMES},
            **price_cagrs,
        },
        "peRatio": pe,
        "priceFcfRatio": price_fcf_ratio,
        "fcfPayoutRatio": fcf_payout_ratio,
        "cash": cash,
        "totalDebt": total_debt,
        "netDebt": net_debt,
        "netDebtFcfRatio": net_debt_fcf_ratio,
    }

    _set_cached(cache_key, result)
    return result
