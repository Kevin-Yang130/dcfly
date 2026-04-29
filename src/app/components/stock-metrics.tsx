import { useState } from "react";
import { Activity, BarChart3, DollarSign, Loader2, Star } from "lucide-react";
import type { Stock, TimeFrameData } from "./stock-search";

type TimeFrame = keyof TimeFrameData;

interface StockMetricsProps {
  stock: Stock;
  isSaved?: boolean;
  isSaving?: boolean;
  onToggleSave?: () => void;
}

export function StockMetrics({
  stock,
  isSaved = false,
  isSaving = false,
  onToggleSave,
}: StockMetricsProps) {
  const [epsTimeFrame, setEpsTimeFrame] = useState<TimeFrame>("1Y");
  const [fcfTimeFrame, setFcfTimeFrame] = useState<TimeFrame>("1Y");
  const [cagrTimeFrame, setCagrTimeFrame] = useState<TimeFrame>("1Y");

  const timeFrames: TimeFrame[] = ["TTM", "1Y", "3Y", "5Y", "7Y", "10Y"];

  const TimeFrameSelector = ({
    value,
    onChange,
    label
  }: {
    value: TimeFrame;
    onChange: (tf: TimeFrame) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
        <span>{label}</span>
      </div>
      <div className="flex gap-1">
        {timeFrames.map((tf) => (
          <button
            key={tf}
            onClick={() => onChange(tf)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
              value === tf
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-sm p-8">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div className="sm:flex-1">
          <h2 className="text-gray-900 mb-1">{stock.symbol}</h2>
          <p className="text-gray-500">{stock.name}</p>
        </div>
        {onToggleSave && (
          <button
            type="button"
            onClick={onToggleSave}
            disabled={isSaving}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition disabled:opacity-60 ${
              isSaved
                ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50"
            }`}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Star className={`h-4 w-4 ${isSaved ? "fill-amber-400 text-amber-400" : ""}`} />
            )}
            {isSaved ? "Saved" : "Save"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Stock Price */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-gray-600">Stock Price</span>
          </div>
          <div className="text-3xl font-semibold text-gray-900">
            ${stock.price.toFixed(2)}
          </div>
        </div>

        {/* EPS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-gray-600">EPS</span>
          </div>
          <div className="text-3xl font-semibold text-gray-900">
            ${stock.eps.toFixed(2)}
          </div>
        </div>

        {/* P/E Ratio */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-gray-600">P/E Ratio</span>
          </div>
          <div className="text-3xl font-semibold text-gray-900">
            {stock.peRatio.toFixed(1)}
          </div>
        </div>

        {/* EPS Growth Rate with Time Frame */}
        <div className="space-y-3">
          <TimeFrameSelector
            value={epsTimeFrame}
            onChange={setEpsTimeFrame}
            label="EPS Growth Rate"
          />
          <div className="text-3xl font-semibold text-emerald-600">
            {stock.epsGrowthRate[epsTimeFrame].toFixed(1)}%
          </div>
        </div>

        {/* FCF Growth Rate with Time Frame */}
        <div className="space-y-3">
          <TimeFrameSelector
            value={fcfTimeFrame}
            onChange={setFcfTimeFrame}
            label="FCF Growth Rate"
          />
          <div className="text-3xl font-semibold text-emerald-600">
            {stock.fcfGrowthRate[fcfTimeFrame].toFixed(1)}%
          </div>
        </div>

        {/* CAGR with Time Frame */}
        <div className="space-y-3">
          <TimeFrameSelector
            value={cagrTimeFrame}
            onChange={setCagrTimeFrame}
            label="CAGR"
          />
          <div className="text-3xl font-semibold text-emerald-600">
            {stock.cagr[cagrTimeFrame].toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
