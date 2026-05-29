import { Loader2, Star } from "lucide-react";
import type { SavedStock } from "../../lib/api";

interface SavedStocksPanelProps {
  savedStocks: SavedStock[];
  selectedSymbol?: string;
  isLoading: boolean;
  onSelectSymbol: (symbol: string) => void;
  variant?: "default" | "inline";
}

export function SavedStocksPanel({
  savedStocks,
  selectedSymbol,
  isLoading,
  onSelectSymbol,
  variant = "default",
}: SavedStocksPanelProps) {
  if (variant === "inline") {
    if (savedStocks.length === 0) return null;
    return (
      <div>
        <p className="eyebrow mb-3 text-center">Your watchlist</p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {savedStocks.map((stock) => {
            const isSelected = stock.symbol === selectedSymbol;
            return (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => onSelectSymbol(stock.symbol)}
                title={stock.name}
                className={`tabular rounded-full border px-3 py-1 text-xs font-medium transition ${
                  isSelected
                    ? "border-accent/40 bg-accent-soft text-accent-ink"
                    : "border-hairline bg-paper-elevated text-ink-soft hover:border-hairline-strong hover:text-ink"
                }`}
              >
                {stock.symbol}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-hairline bg-paper-elevated px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Star className="h-3.5 w-3.5 fill-accent text-accent" />
          <p className="eyebrow">Watchlist</p>
        </div>
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-muted" />}
      </div>

      {savedStocks.length === 0 ? (
        <p className="text-xs text-ink-muted">
          Star a company to keep it close at hand.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {savedStocks.map((stock) => {
            const isSelected = stock.symbol === selectedSymbol;
            return (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => onSelectSymbol(stock.symbol)}
                title={stock.name}
                className={`group flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition ${
                  isSelected
                    ? "border-accent/40 bg-accent-soft text-accent-ink"
                    : "border-hairline bg-paper text-ink-soft hover:border-hairline-strong hover:text-ink"
                }`}
              >
                <span className="tabular text-xs font-semibold tracking-wide">
                  {stock.symbol}
                </span>
                <span className="hidden max-w-[140px] truncate text-[11px] text-ink-muted group-hover:text-ink-soft sm:inline">
                  {stock.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
