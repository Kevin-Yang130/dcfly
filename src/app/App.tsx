import { useEffect, useMemo, useState } from "react";
import { StockSearch } from "./components/stock-search";
import { StockMetrics } from "./components/stock-metrics";
import { DCFCalculator } from "./components/dcf-calculator";
import { AuthPanel } from "./components/auth-panel";
import { SavedStocksPanel } from "./components/saved-stocks-panel";
import { DCFlyLogo } from "./components/dcfly-logo";
import type { Stock } from "./components/stock-search";
import {
  clearAuthToken,
  fetchMe,
  fetchSavedStocks,
  fetchStock,
  getAuthToken,
  recordRecentlySeen,
  saveStock,
  unsaveStock,
  type SavedStock,
  type User,
} from "../lib/api";

export default function App() {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [savedStocks, setSavedStocks] = useState<SavedStock[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const selectedIsSaved = useMemo(
    () => savedStocks.some((stock) => stock.symbol === selectedStock?.symbol),
    [savedStocks, selectedStock],
  );

  useEffect(() => {
    if (!getAuthToken()) return;

    fetchMe()
      .then(setUser)
      .catch(() => {
        clearAuthToken();
        setUser(null);
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setSavedStocks([]);
      return;
    }

    setIsLoadingSaved(true);
    fetchSavedStocks()
      .then(setSavedStocks)
      .catch((e: any) => setAppError(e.message || "Could not load saved stocks"))
      .finally(() => setIsLoadingSaved(false));
  }, [user]);

  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
    setAppError(null);

    if (user) {
      recordRecentlySeen(stock).catch(() => {});
    }
  };

  const handleSelectSavedStock = async (symbol: string) => {
    setAppError(null);
    try {
      const stock = await fetchStock(symbol);
      handleSelectStock(stock);
    } catch (e: any) {
      setAppError(e.message || `Could not load ${symbol}`);
    }
  };

  const handleToggleSave = async () => {
    if (!selectedStock) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setIsSavingStock(true);
    setAppError(null);
    try {
      if (selectedIsSaved) {
        await unsaveStock(selectedStock.symbol);
        setSavedStocks((stocks) =>
          stocks.filter((stock) => stock.symbol !== selectedStock.symbol),
        );
      } else {
        await saveStock(selectedStock);
        setSavedStocks((stocks) => [
          {
            symbol: selectedStock.symbol,
            name: selectedStock.name,
            saved_at: new Date().toISOString(),
          },
          ...stocks,
        ]);
      }
    } catch (e: any) {
      setAppError(e.message || "Could not update saved stocks");
    } finally {
      setIsSavingStock(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSavedStocks([]);
    setAppError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-2.5">
            <DCFlyLogo className="h-7 w-7" />
            <div className="flex items-baseline gap-2">
              <span className="text-[1.05rem] font-semibold tracking-[-0.015em] text-ink">
                Auto<span className="text-accent">DCF</span>
              </span>
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle sm:block">
                Valuation Studio
              </span>
            </div>
          </div>
          <AuthPanel
            user={user}
            open={authOpen}
            onOpenChange={setAuthOpen}
            onAuthenticated={setUser}
            onLogout={handleLogout}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-16 pt-10 lg:px-8">
        {appError && (
          <div className="mx-auto mb-8 max-w-2xl rounded-md border border-bear/30 bg-bear-soft px-4 py-3 text-sm text-bear-ink">
            {appError}
          </div>
        )}

        {!selectedStock && (
          <section className="flex min-h-[60vh] items-center justify-center">
            <div className="w-full max-w-2xl text-center">
              <p className="eyebrow mb-5">Discounted Cash Flow Analysis</p>
              <h1 className="font-serif text-ink mb-4 text-[3.25rem] leading-[1] tracking-[-0.025em]">
                Find what a stock is{" "}
                <span className="italic text-accent">truly worth.</span>
              </h1>
              <p className="mx-auto mb-10 max-w-md text-[0.95rem] leading-relaxed text-ink-muted">
                Search any public company to pull live fundamentals and run a
                transparent DCF valuation in seconds.
              </p>
              <StockSearch onSelectStock={handleSelectStock} />

              {user && savedStocks.length > 0 && (
                <div className="mt-12">
                  <SavedStocksPanel
                    savedStocks={savedStocks}
                    selectedSymbol={selectedStock?.symbol}
                    isLoading={isLoadingSaved}
                    onSelectSymbol={handleSelectSavedStock}
                    variant="inline"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {selectedStock && (
          <div className="space-y-8">
            <section>
              <StockSearch onSelectStock={handleSelectStock} />
            </section>

            {user && (
              <SavedStocksPanel
                savedStocks={savedStocks}
                selectedSymbol={selectedStock?.symbol}
                isLoading={isLoadingSaved}
                onSelectSymbol={handleSelectSavedStock}
              />
            )}

            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <StockMetrics
                stock={selectedStock}
                isSaved={selectedIsSaved}
                isSaving={isSavingStock}
                onToggleSave={handleToggleSave}
              />
            </section>

            <section className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <DCFCalculator stock={selectedStock} />
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-2 px-5 py-6 text-xs text-ink-subtle sm:flex-row sm:items-center lg:px-8">
          <div className="flex items-center gap-2">
            <DCFlyLogo className="h-4 w-4" />
            <span className="font-medium text-ink-muted">AutoDCF</span>
            <span aria-hidden>·</span>
            <span>Intelligent stock valuation</span>
          </div>
          <span>
            Estimates only — not investment advice.
          </span>
        </div>
      </footer>
    </div>
  );
}
