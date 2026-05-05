import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { searchStocks, fetchStock, type SearchResult } from "../../lib/api";

export interface TimeFrameData {
  TTM: number;
  "1Y": number;
  "3Y": number;
  "5Y": number;
  "7Y": number;
  "10Y": number;
}

export interface AnnualFinancialData {
  year: string;
  earnings: number;
  freeCashFlow: number;
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
  epsGrowthRate: TimeFrameData;
  fcfGrowthRate: TimeFrameData;
  cagr: TimeFrameData;
  peRatio: number;
  priceFcfRatio: number;
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

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        {isSearching || isLoadingStock ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500 animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        )}
        <Input
          type="text"
          placeholder="Search for a stock (e.g., AAPL, Microsoft)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          className="w-full pl-12 pr-4 py-6 bg-white border border-gray-200 rounded-2xl shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onMouseDown={() => handleSelect(r)}
              className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900">{r.symbol}</div>
                  <div className="text-sm text-gray-500">{r.name}</div>
                </div>
                {r.price > 0 && (
                  <div className="text-gray-900 font-medium">
                    ${r.price.toFixed(2)}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
