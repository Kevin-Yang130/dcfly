import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnnualFinancialData, GrowthRateSet, Stock, TimeFrameData } from "./stock-search";

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

function formatOptionalCurrencyCompact(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return formatCurrencyCompact(value);
}

function formatNumberCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBillions(value: number) {
  return `$${(value / 1e9).toFixed(3)}B`;
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
        {label}
      </span>
      <span className="tabular text-xl font-medium text-ink">{value}</span>
      {hint && <span className="text-[11px] text-ink-subtle">{hint}</span>}
    </div>
  );
}

const fiscalTimeFrames: TimeFrame[] = ["1Y", "3Y", "5Y", "7Y", "10Y"];

function getGrowthRates(stock: Stock): GrowthRateSet {
  const fiscalRates = stock.growthRates?.fiscalYear;
  if (fiscalRates) {
    return {
      earnings:
        fiscalRates.earnings ??
        fiscalRates.eps ??
        stock.earningsGrowthRate ??
        stock.epsGrowthRate,
      fcf: fiscalRates.fcf ?? stock.fcfGrowthRate,
    };
  }

  return {
    earnings: stock.earningsGrowthRate ?? stock.epsGrowthRate,
    fcf: stock.fcfGrowthRate,
  };
}

function formatGrowthValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatPercentValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatMultipleValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value.toFixed(2)}x`;
}

function TimeFrameToggle({
  value,
  onChange,
  options,
}: {
  value: TimeFrame;
  onChange: (tf: TimeFrame) => void;
  options: TimeFrame[];
}) {
  return (
    <div className="inline-flex rounded-md border border-hairline bg-paper p-0.5">
      {options.map((tf) => (
        <button
          key={tf}
          type="button"
          onClick={() => onChange(tf)}
          className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
            value === tf
              ? "bg-paper-elevated text-ink shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

function GrowthMetric({
  label,
  value,
  timeFrame,
  onTimeFrameChange,
  timeFrameOptions,
}: {
  label: string;
  value: number | null | undefined;
  timeFrame: TimeFrame;
  onTimeFrameChange: (tf: TimeFrame) => void;
  timeFrameOptions: TimeFrame[];
}) {
  const positive = (value ?? 0) >= 0;
  return (
    <div className="rounded-lg border border-hairline bg-paper-elevated p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
          {label}
        </span>
        <TimeFrameToggle
          value={timeFrame}
          onChange={onTimeFrameChange}
          options={timeFrameOptions}
        />
      </div>
      <div
        className={`tabular text-2xl font-medium ${
          positive ? "text-bull" : "text-bear"
        }`}
      >
        {formatGrowthValue(value)}
      </div>
    </div>
  );
}

function FinancialsChart({
  financials,
}: {
  financials: AnnualFinancialData[];
}) {
  const chartData = financials.map((item) => ({
    period: item.year,
    earningsBillions: item.earnings / 1e9,
    freeCashFlowBillions: item.freeCashFlow / 1e9,
  }));
  const latestFinancial = financials.at(-1);

  if (chartData.length === 0) return null;

  return (
    <div className="border-t border-hairline pt-8">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Annual Financials</p>
          <h3 className="mt-1 text-base font-medium text-ink">
            Free cash flow vs. earnings
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[12px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-bull" />
            Free Cash Flow
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-neutral-data" />
            Earnings
          </span>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" vertical={false} />
            <XAxis
              dataKey="period"
              stroke="var(--ink-subtle)"
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              style={{ fontSize: "11px", fontWeight: 500 }}
            />
            <YAxis
              stroke="var(--ink-subtle)"
              tickLine={false}
              axisLine={false}
              style={{ fontSize: "11px", fontWeight: 500 }}
              tickFormatter={(value) => `$${Number(value).toFixed(3)}B`}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                backgroundColor: "var(--paper-elevated)",
                border: "1px solid var(--hairline-strong)",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "12px",
                boxShadow: "0 8px 24px -12px rgba(26,24,21,0.18)",
              }}
              labelStyle={{
                color: "var(--ink-muted)",
                fontWeight: 500,
                marginBottom: "4px",
              }}
              formatter={(value: number, name: string) => {
                const label =
                  name === "freeCashFlowBillions" ? "Free Cash Flow" : "Earnings";
                return [`$${value.toFixed(3)}B`, label];
              }}
            />
            <Bar
              dataKey="freeCashFlowBillions"
              fill="var(--bull)"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="earningsBillions"
              fill="var(--neutral-data)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {latestFinancial && (
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-hairline pt-4 text-xs text-ink-muted">
          <div>
            Latest annual FCF{" "}
            <span className="tabular ml-1 font-medium text-ink">
              {formatBillions(latestFinancial.freeCashFlow)}
            </span>
          </div>
          <div>
            Latest annual earnings{" "}
            <span className="tabular ml-1 font-medium text-ink">
              {formatBillions(latestFinancial.earnings)}
            </span>
          </div>
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

  const growthRates = getGrowthRates(stock);
  const financials = stock.annualFinancials;

  const stats: { label: string; value: string; hint?: string }[] = [
    { label: "Earnings (Annual)", value: formatCurrencyCompact(stock.earnings) },
    { label: "EPS (Annual)", value: `$${stock.eps.toFixed(2)}` },
    { label: "P/E Ratio", value: stock.peRatio.toFixed(2) },
    { label: "Free Cash Flow (Annual)", value: formatCurrencyCompact(stock.freeCashFlow) },
    { label: "P/FCF Ratio", value: stock.priceFcfRatio.toFixed(2) },
    { label: "FCF Payout Ratio", value: formatPercentValue(stock.fcfPayoutRatio) },
    {
      label: "Shares Outstanding",
      value: formatNumberCompact(stock.sharesOutstanding),
    },
  ];
  const debtStats: { label: string; value: string; hint?: string }[] = [
    { label: "Cash", value: formatOptionalCurrencyCompact(stock.cash) },
    { label: "Total Debt", value: formatOptionalCurrencyCompact(stock.totalDebt) },
    { label: "Net Debt / FCF", value: formatMultipleValue(stock.netDebtFcfRatio) },
  ];

  return (
    <div className="rounded-xl border border-hairline bg-paper-elevated">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-hairline px-6 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-2xl font-medium text-ink">
              {stock.symbol}
            </h2>
            <span className="truncate text-sm text-ink-muted">{stock.name}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="tabular font-serif text-3xl font-medium text-ink">
              ${stock.price.toFixed(2)}
            </span>
            <span className="text-xs text-ink-subtle">last traded price</span>
          </div>
        </div>
        {onToggleSave && (
          <button
            type="button"
            onClick={onToggleSave}
            disabled={isSaving}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition disabled:opacity-60 ${
              isSaved
                ? "border-accent/30 bg-accent-soft text-accent-ink hover:border-accent/50"
                : "border-hairline bg-paper text-ink-soft hover:border-hairline-strong hover:text-ink"
            }`}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Star
                className={`h-3.5 w-3.5 ${isSaved ? "fill-accent text-accent" : ""}`}
              />
            )}
            {isSaved ? "Saved" : "Save"}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="space-y-8 px-6 py-7 sm:px-8 sm:py-8">
        {/* Fundamentals grid */}
        <div>
          <p className="eyebrow mb-4">Fundamentals</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-7">
            {stats.map((s) => (
              <Stat key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
          <div className="mt-6 border-t border-hairline pt-5">
            <p className="eyebrow mb-4">Debt</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              {debtStats.map((s) => (
                <Stat key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
          </div>
        </div>

        {/* Growth grid */}
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Growth Metrics</p>
              <p className="mt-1 text-xs text-ink-muted">
                Annual filing endpoint analysis
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <GrowthMetric
              label="Earnings CAGR"
              value={growthRates.earnings[epsTimeFrame]}
              timeFrame={epsTimeFrame}
              onTimeFrameChange={setEpsTimeFrame}
              timeFrameOptions={fiscalTimeFrames}
            />
            <GrowthMetric
              label="FCF CAGR"
              value={growthRates.fcf[fcfTimeFrame]}
              timeFrame={fcfTimeFrame}
              onTimeFrameChange={setFcfTimeFrame}
              timeFrameOptions={fiscalTimeFrames}
            />
            <GrowthMetric
              label="Price CAGR"
              value={stock.cagr[cagrTimeFrame]}
              timeFrame={cagrTimeFrame}
              onTimeFrameChange={setCagrTimeFrame}
              timeFrameOptions={fiscalTimeFrames}
            />
          </div>
        </div>

        <FinancialsChart financials={financials} />
      </div>
    </div>
  );
}
