import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { searchStocks, fetchStock, type SearchResult } from "../../lib/api";

export interface TimeFrameData {
  "1Y": number | null;
  "3Y": number | null;
  "5Y": number | null;
  "7Y": number | null;
  "10Y": number | null;
}

export interface AnnualFinancialData {
  year: string;
  date?: string;
  earnings: number;
  freeCashFlow: number;
}

export interface GrowthRateSet {
  earnings: TimeFrameData;
  eps?: TimeFrameData;
  fcf: TimeFrameData;
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  earnings: number;
  eps: number;
  freeCashFlow: number;
  sharesOutstanding: number;
  annualFinancials: AnnualFinancialData[];
  growthRates?: {
    fiscalYear: GrowthRateSet;
  };
  earningsGrowthRate?: TimeFrameData;
  epsGrowthRate: TimeFrameData;
  fcfGrowthRate: TimeFrameData;
  cagr: TimeFrameData;
  peRatio: number;
  priceFcfRatio: number;
  fcfPayoutRatio?: number | null;
  cash?: number;
  totalDebt?: number;
  netDebt?: number;
  netDebtFcfRatio?: number | null;
}

interface StockSearchProps {
  onSelectStock: (stock: Stock) => void;
}

export function StockSearch({ onSelectStock }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const data = await searchStocks(query);
        setResults(data);
        setShowResults(true);
      } catch (e: any) {
        const msg = e.message || "";
        if (msg.includes("429") || msg.includes("rate")) {
          setError("Rate limited by data provider — wait a moment and try again.");
        } else {
          setError("Search unavailable — is the backend running on port 8000?");
        }
        setShowResults(false);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = async (result: SearchResult) => {
    setShowResults(false);
    setQuery(result.symbol);
    setIsLoadingStock(true);
    setError(null);
    try {
      const stock = await fetchStock(result.symbol);
      onSelectStock(stock);
    } catch (e: any) {
      setError(e.message || `Failed to load ${result.symbol}`);
    } finally {
      setIsLoadingStock(false);
    }
  };

  const isBusy = isSearching || isLoadingStock;

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="group relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
          {isBusy ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin text-accent" />
          ) : (
            <Search className="h-[18px] w-[18px] text-ink-subtle transition-colors group-focus-within:text-ink-muted" />
          )}
        </div>
        <input
          type="text"
          placeholder="Search a ticker or company  ·  e.g. AAPL, Microsoft"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          spellCheck={false}
          autoComplete="off"
          className="h-12 w-full rounded-lg border border-hairline bg-paper-elevated pl-11 pr-4 text-[0.95rem] text-ink placeholder:text-ink-subtle outline-none transition focus:border-hairline-strong focus:ring-2 focus:ring-accent/15"
        />
      </div>

      {error && (
        <p className="mt-3 text-center text-xs text-bear">{error}</p>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-hairline bg-paper-elevated shadow-[0_8px_28px_-12px_rgba(26,24,21,0.18)]">
          <div className="border-b border-hairline px-4 py-2">
            <span className="eyebrow">Results</span>
          </div>
          {results.map((r) => (
            <button
              key={r.symbol}
              onMouseDown={() => handleSelect(r)}
              className="group/item flex w-full items-center justify-between gap-4 border-b border-hairline px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink">{r.symbol}</div>
                <div className="truncate text-[13px] text-ink-muted">{r.name}</div>
              </div>
              {r.price > 0 && (
                <div className="tabular text-sm font-medium text-ink-soft">
                  ${r.price.toFixed(2)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
