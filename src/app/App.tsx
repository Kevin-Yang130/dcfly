import { useEffect, useMemo, useState } from "react";
import { StockSearch } from "./components/stock-search";
import { StockMetrics } from "./components/stock-metrics";
import { DCFCalculator } from "./components/dcf-calculator";
import { AuthPanel } from "./components/auth-panel";
import { SavedStocksPanel } from "./components/saved-stocks-panel";
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
      recordRecentlySeen(stock).catch(() => {
        // Recently seen is helpful, but it should never block valuation.
      });
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
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-6">
        <AuthPanel
          user={user}
          open={authOpen}
          onOpenChange={setAuthOpen}
          onAuthenticated={setUser}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 relative z-10">
        {appError && (
          <div className="max-w-3xl mx-auto rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {appError}
          </div>
        )}

        {user && (
          <SavedStocksPanel
            savedStocks={savedStocks}
            selectedSymbol={selectedStock?.symbol}
            isLoading={isLoadingSaved}
            onSelectSymbol={handleSelectSavedStock}
          />
        )}

        {/* Search Section - Centered and Minimal */}
        {!selectedStock && (
          <section className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-2xl text-center">
              <h2 className="text-gray-900 mb-3">Search for a Stock</h2>
              <p className="text-gray-600 mb-8">
                Enter a stock symbol to begin your DCF valuation
              </p>
              <StockSearch onSelectStock={handleSelectStock} />
            </div>
          </section>
        )}

        {/* Search Section - Top aligned when stock is selected */}
        {selectedStock && (
          <section className="space-y-4">
            <StockSearch onSelectStock={handleSelectStock} />
          </section>
        )}

        {/* Stock Metrics Section */}
        {selectedStock && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StockMetrics
              stock={selectedStock}
              isSaved={selectedIsSaved}
              isSaving={isSavingStock}
              onToggleSave={handleToggleSave}
            />
          </section>
        )}

        {/* DCF Calculator Section */}
        {selectedStock && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <DCFCalculator stock={selectedStock} />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            DCFly • Intelligent Stock Valuation
          </p>
        </div>
      </footer>
    </div>
  );
}
