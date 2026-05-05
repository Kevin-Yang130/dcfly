import { useState } from "react";
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  DollarSign,
  Loader2,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Stock, TimeFrameData } from "./stock-search";

type TimeFrame = keyof TimeFrameData;

interface StockMetricsProps {
  stock: Stock;
  isSaved?: boolean;
  isSaving?: boolean;
  onToggleSave?: () => void;
}

function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumberCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBillions(value: number) {
  return `$${(value / 1e9).toFixed(1)}B`;
}

function MetricCard({
  Icon,
  label,
  value,
  valueClassName = "text-gray-900",
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-emerald-600" />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className={`text-3xl font-semibold ${valueClassName}`}>{value}</div>
    </div>
  );
}

function AnnualFinancialsChart({ stock }: { stock: Stock }) {
  const chartData = stock.annualFinancials.map((item) => ({
    year: item.year,
    earningsBillions: item.earnings / 1e9,
    freeCashFlowBillions: item.freeCashFlow / 1e9,
  }));
  const latestAnnualFinancial = stock.annualFinancials.at(-1);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="mt-10 border-t border-gray-200 pt-8">
      <div className="mb-6">
        <h3 className="text-gray-900">Annual FCF and Earnings</h3>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              stroke="#6b7280"
              style={{ fontSize: "14px" }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: "14px" }}
              tickFormatter={(value) => `$${value}B`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px",
              }}
              formatter={(value: number, name: string) => {
                const label =
                  name === "freeCashFlowBillions" ? "Free Cash Flow" : "Earnings";
                return [`$${value.toFixed(2)}B`, label];
              }}
            />
            <Legend
              formatter={(value) =>
                value === "freeCashFlowBillions" ? "Free Cash Flow" : "Earnings"
              }
            />
            <Bar
              dataKey="freeCashFlowBillions"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="earningsBillions"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {latestAnnualFinancial && (
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
          <div>Latest annual FCF: {formatBillions(latestAnnualFinancial.freeCashFlow)}</div>
          <div>Latest annual earnings: {formatBillions(latestAnnualFinancial.earnings)}</div>
        </div>
      )}
    </div>
  );
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

  const summaryMetrics = [
    {
      label: "Stock Price",
      value: `$${stock.price.toFixed(2)}`,
      Icon: DollarSign,
    },
    {
      label: "Earnings",
      value: formatCurrencyCompact(stock.earnings),
      Icon: DollarSign,
    },
    {
      label: "EPS",
      value: `$${stock.eps.toFixed(2)}`,
      Icon: Activity,
    },
    {
      label: "P/E Ratio",
      value: stock.peRatio.toFixed(2),
      Icon: BarChart3,
    },
    {
      label: "Current FCF",
      value: formatCurrencyCompact(stock.freeCashFlow),
      Icon: CircleDollarSign,
    },
    {
      label: "P/FCF Ratio",
      value: stock.priceFcfRatio.toFixed(2),
      Icon: CircleDollarSign,
    },
    {
      label: "Shares Outstanding",
      value: formatNumberCompact(stock.sharesOutstanding),
      Icon: Users,
    },
  ];

  const growthMetrics = [
    {
      label: "EPS Growth Rate",
      value: stock.epsGrowthRate[epsTimeFrame],
      timeFrame: epsTimeFrame,
      onTimeFrameChange: setEpsTimeFrame,
    },
    {
      label: "FCF Growth Rate",
      value: stock.fcfGrowthRate[fcfTimeFrame],
      timeFrame: fcfTimeFrame,
      onTimeFrameChange: setFcfTimeFrame,
    },
    {
      label: "CAGR",
      value: stock.cagr[cagrTimeFrame],
      timeFrame: cagrTimeFrame,
      onTimeFrameChange: setCagrTimeFrame,
    },
  ];

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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            Icon={metric.Icon}
            label={metric.label}
            value={metric.value}
          />
        ))}

        {growthMetrics.map((metric) => (
          <div key={metric.label} className="space-y-3">
            <TimeFrameSelector
              value={metric.timeFrame}
              onChange={metric.onTimeFrameChange}
              label={metric.label}
            />
            <div className="text-3xl font-semibold text-emerald-600">
              {metric.value.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      <AnnualFinancialsChart stock={stock} />
    </div>
  );
}
