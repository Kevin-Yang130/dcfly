import { Loader2, Star } from "lucide-react";
import type { SavedStock } from "../../lib/api";

interface SavedStocksPanelProps {
  savedStocks: SavedStock[];
  selectedSymbol?: string;
  isLoading: boolean;
  onSelectSymbol: (symbol: string) => void;
}

export function SavedStocksPanel({
  savedStocks,
  selectedSymbol,
  isLoading,
  onSelectSymbol,
}: SavedStocksPanelProps) {
  return (
    <section className="w-full max-w-6xl mx-auto bg-white/90 border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <h3 className="text-gray-900">Saved Stocks</h3>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
      </div>

      {savedStocks.length === 0 ? (
        <p className="text-sm text-gray-500">
          Saved stocks will appear here after you star a company.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {savedStocks.map((stock) => {
            const isSelected = stock.symbol === selectedSymbol;
            return (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => onSelectSymbol(stock.symbol)}
                className={`min-w-24 rounded-lg border px-3 py-2 text-left transition ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                <div className="text-sm font-semibold">{stock.symbol}</div>
                <div className="max-w-40 truncate text-xs text-gray-500">{stock.name}</div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
