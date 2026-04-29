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


def calc_growth_rates(values: List[float]) -> Dict[str, float]:
    """Compute YoY and CAGR growth rates from values list (newest → oldest)."""
    rates: Dict[str, float] = {}
    n = len(values)

    if n >= 2 and values[1] != 0:
        rates["TTM"] = round((values[0] / values[1] - 1) * 100, 1)
        rates["1Y"] = rates["TTM"]

    for label, years in [("3Y", 3), ("5Y", 5), ("7Y", 7), ("10Y", 10)]:
        if n >= years + 1 and values[years] > 0:
            c = calc_cagr_pct(values[years], values[0], years)
            if c is not None:
                rates[label] = c

    return rates


def fill_all_timeframes(rates: Dict[str, float], fallback: Dict[str, float]) -> Dict[str, float]:
    result = dict(rates)
    for tf in ["TTM", "1Y", "3Y", "5Y", "7Y", "10Y"]:
        if tf not in result:
            result[tf] = fallback.get(tf) or result.get("1Y") or result.get("3Y") or 0.0
    return result


def _price_cagrs(historical: List[Dict], current_price: float) -> Dict[str, float]:
    """Compute price CAGR for each timeframe from EOD history (newest → oldest)."""
    if not historical or current_price <= 0:
        return {}

    rates: Dict[str, float] = {}
    newest_date = datetime.fromisoformat(historical[0]["date"])

    for label, years in [("TTM", 1), ("1Y", 1), ("3Y", 3), ("5Y", 5), ("7Y", 7), ("10Y", 10)]:
        target = newest_date.replace(year=newest_date.year - years)
        closest = min(historical, key=lambda x: abs(datetime.fromisoformat(x["date"]) - target))
        past_price = safe_float(closest.get("close", 0))
        c = calc_cagr_pct(past_price, current_price, years)
        if c is not None:
            rates[label] = c

    return rates


_ETF_KEYWORDS = {"etf", "fund", "bear", "bull", "2x", "3x", "1x", "daily", "weekly",
                  "strategy", "leveraged", "inverse", "tracker", "yield", "option"}

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

    def fetch_income():
        return fmp_get("/income-statement", {"symbol": symbol, "limit": 5})

    def fetch_cashflow():
        return fmp_get("/cash-flow-statement", {"symbol": symbol, "limit": 5})

    def fetch_history():
        return fmp_get("/historical-price-eod/full", {"symbol": symbol, "from": ten_years_ago})

    fetchers = {
        "quote": fetch_quote,
        "income": fetch_income,
        "cashflow": fetch_cashflow,
        "history": fetch_history,
    }

    api_results: Dict[str, Any] = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
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

    # --- Income statement: EPS history + shares outstanding ---
    income_stmts: List[Dict] = api_results.get("income") or []
    eps_values = [safe_float(s.get("epsDiluted") or s.get("eps", 0)) for s in income_stmts]
    eps_values = [v for v in eps_values if v != 0]

    current_eps = eps_values[0] if eps_values else 0.0
    pe = round(price / current_eps, 1) if current_eps > 0 else 0.0

    # Shares from the most recent income statement
    shares = 0.0
    if income_stmts:
        shares = safe_float(income_stmts[0].get("weightedAverageShsOutDil", 0))

    eps_rates = calc_growth_rates(eps_values) if eps_values else {}

    # --- Cash flow: FCF history ---
    cf_stmts: List[Dict] = api_results.get("cashflow") or []
    fcf_values = [safe_float(s.get("freeCashFlow", 0)) for s in cf_stmts]
    fcf_values = [v for v in fcf_values if v != 0]

    current_fcf = fcf_values[0] if fcf_values else 0.0
    fcf_rates = calc_growth_rates(fcf_values) if fcf_values else {}

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
        "eps": round(current_eps, 2),
        "freeCashFlow": current_fcf,
        "sharesOutstanding": shares,
        "epsGrowthRate": fill_all_timeframes(eps_rates, price_cagrs),
        "fcfGrowthRate": fill_all_timeframes(fcf_rates, price_cagrs),
        "cagr": {**{k: 0.0 for k in ["TTM", "1Y", "3Y", "5Y", "7Y", "10Y"]}, **price_cagrs},
        "peRatio": pe,
    }

    _set_cached(cache_key, result)
    return result
