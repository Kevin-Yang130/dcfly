import { useState, useEffect } from "react";
import { ArrowDownRight, ArrowUpRight, Check, Clock } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Stock } from "./stock-search";
import { calculateDCFRemote } from "../../lib/api";

interface DCFCalculatorProps {
  stock: Stock;
}

function preferredGrowthRate(stock: Stock) {
  const fiscalFcf = stock.growthRates?.fiscalYear.fcf ?? stock.fcfGrowthRate;
  return fiscalFcf["5Y"] ?? fiscalFcf["3Y"] ?? fiscalFcf["1Y"] ?? 0;
}

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  min?: string;
  max?: string;
  hint?: string;
}

function InputField({
  id,
  label,
  value,
  onChange,
  suffix = "%",
  step = "0.1",
  min,
  max,
  hint,
}: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={step}
          min={min}
          max={max}
          className="tabular h-10 w-full rounded-md border border-hairline bg-paper-elevated px-3 pr-9 text-[0.95rem] text-ink outline-none transition focus:border-hairline-strong focus:ring-2 focus:ring-accent/15"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-subtle">
          {suffix}
        </span>
      </div>
      {hint && <p className="text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}

export function DCFCalculator({ stock }: DCFCalculatorProps) {
  const [growthRate, setGrowthRate] = useState(() => preferredGrowthRate(stock).toString());
  const [discountRate, setDiscountRate] = useState("10");
  const [terminalGrowthRate, setTerminalGrowthRate] = useState("3");
  const [projectionYears, setProjectionYears] = useState("10");
  const [marginOfSafety, setMarginOfSafety] = useState("20");
  const [chartData, setChartData] = useState<any[]>([]);
  const [intrinsicValue, setIntrinsicValue] = useState(0);
  const [intrinsicValuePerShare, setIntrinsicValuePerShare] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState("");

  useEffect(() => {
    setGrowthRate(preferredGrowthRate(stock).toString());
  }, [stock.symbol]);

  useEffect(() => {
    let isCurrent = true;

    async function calculateDCF() {
      const years = parseInt(projectionYears) || 10;
      const params = {
        currentFCF: stock.freeCashFlow,
        growthRate: parseFloat(growthRate) || 0,
        discountRate: parseFloat(discountRate) || 0,
        terminalGrowthRate: parseFloat(terminalGrowthRate) || 0,
        projectionYears: years,
        sharesOutstanding: stock.sharesOutstanding,
      };

      setIsCalculating(true);
      setCalculationError("");

      try {
        const result = await calculateDCFRemote(params);
        if (!isCurrent) return;

        setChartData(
          result.yearsData.map((item) => ({
            ...item,
            displayFCF: (item.projectedFCF / 1e9).toFixed(2),
            displayPV: (item.presentValue / 1e9).toFixed(2),
          })),
        );
        setIntrinsicValue(result.enterpriseValue);
        setIntrinsicValuePerShare(result.intrinsicValuePerShare);
      } catch (error) {
        if (!isCurrent) return;

        setCalculationError(error instanceof Error ? error.message : "DCF calculation failed");
        setChartData([]);
        setIntrinsicValue(0);
        setIntrinsicValuePerShare(0);
      } finally {
        if (isCurrent) {
          setIsCalculating(false);
        }
      }
    }

    calculateDCF();

    return () => {
      isCurrent = false;
    };
  }, [growthRate, discountRate, terminalGrowthRate, projectionYears, stock]);

  const upside = ((intrinsicValuePerShare - stock.price) / stock.price) * 100;
  const mosPercentage = parseFloat(marginOfSafety) || 0;
  const targetBuyPrice = intrinsicValuePerShare * (1 - mosPercentage / 100);
  const upsideWithMOS = ((targetBuyPrice - stock.price) / stock.price) * 100;
  const isBuy = stock.price <= targetBuyPrice && intrinsicValuePerShare > 0;

  return (
    <div className="rounded-xl border border-hairline bg-paper-elevated">
      {/* Inputs */}
      <div className="border-b border-hairline px-6 py-7 sm:px-8 sm:py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Step 1</p>
            <h3 className="mt-1 font-serif text-xl font-medium text-ink">
              Model assumptions
            </h3>
          </div>
          {isCalculating && (
            <span className="text-[11px] text-ink-subtle">Calculating…</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <InputField
            id="growth"
            label="FCF Growth"
            value={growthRate}
            onChange={setGrowthRate}
            hint="Annual rate over projection"
          />
          <InputField
            id="discount"
            label="Discount Rate"
            value={discountRate}
            onChange={setDiscountRate}
            hint="Required rate of return"
          />
          <InputField
            id="terminal"
            label="Terminal Growth"
            value={terminalGrowthRate}
            onChange={setTerminalGrowthRate}
            hint="Perpetual rate after projection"
          />
          <InputField
            id="years"
            label="Projection Years"
            value={projectionYears}
            onChange={setProjectionYears}
            suffix="yr"
            step="1"
            min="1"
            max="20"
          />
          <InputField
            id="mos"
            label="Margin of Safety"
            value={marginOfSafety}
            onChange={setMarginOfSafety}
            step="1"
            min="0"
            max="100"
            hint="Discount applied to target"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-hairline pt-5">
          <span className="mr-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
            MoS Presets
          </span>
          {[10, 15, 20, 25, 30, 40, 50].map((preset) => {
            const active = parseFloat(marginOfSafety) === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setMarginOfSafety(preset.toString())}
                className={`tabular rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? "border-accent/40 bg-accent-soft text-accent-ink"
                    : "border-hairline bg-paper text-ink-muted hover:border-hairline-strong hover:text-ink"
                }`}
              >
                {preset}%
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="border-b border-hairline px-6 py-7 sm:px-8 sm:py-8">
        <div className="mb-6">
          <p className="eyebrow">Step 2</p>
          <h3 className="mt-1 font-serif text-xl font-medium text-ink">
            Valuation results
          </h3>
        </div>

        {calculationError && (
          <div className="mb-6 rounded-md border border-bear/30 bg-bear-soft px-4 py-3 text-sm text-bear-ink">
            {calculationError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-paper-elevated p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
              Intrinsic Value / Share
            </div>
            <div className="tabular mt-2 font-serif text-3xl font-medium text-ink">
              ${intrinsicValuePerShare.toFixed(2)}
            </div>
            <div className="mt-1 text-[11px] text-ink-subtle">
              From discounted cash flows
            </div>
          </div>
          <div className="bg-paper-elevated p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
              Target Buy Price
            </div>
            <div className="tabular mt-2 font-serif text-3xl font-medium text-accent">
              ${targetBuyPrice.toFixed(2)}
            </div>
            <div className="mt-1 text-[11px] text-ink-subtle">
              At {mosPercentage}% margin of safety
            </div>
          </div>
          <div className="bg-paper-elevated p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
              Market Price
            </div>
            <div className="tabular mt-2 font-serif text-3xl font-medium text-ink">
              ${stock.price.toFixed(2)}
            </div>
            <div className="mt-1 text-[11px] text-ink-subtle">
              Current quote
            </div>
          </div>
          <div className="bg-paper-elevated p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
              {upside >= 0 ? "Upside vs. market" : "Downside vs. market"}
            </div>
            <div
              className={`tabular mt-2 inline-flex items-center gap-1 font-serif text-3xl font-medium ${
                upside >= 0 ? "text-bull" : "text-bear"
              }`}
            >
              {upside >= 0 ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )}
              {upside >= 0 ? "+" : ""}
              {upside.toFixed(1)}%
            </div>
            <div className="mt-1 text-[11px] text-ink-subtle">
              vs. intrinsic value
            </div>
          </div>
        </div>

        {/* Recommendation row */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-hairline bg-paper p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
              Headroom to target
            </div>
            <div
              className={`tabular mt-2 text-2xl font-medium ${
                upsideWithMOS >= 0 ? "text-bull" : "text-bear"
              }`}
            >
              {upsideWithMOS >= 0 ? "+" : ""}
              {upsideWithMOS.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-ink-muted">
              {upsideWithMOS >= 0
                ? "Trades below your buy threshold"
                : "Trades above your buy threshold"}
            </div>
          </div>
          <div
            className={`rounded-lg border p-5 ${
              isBuy
                ? "border-bull/30 bg-bull-soft"
                : "border-hairline bg-paper"
            }`}
          >
            <div
              className={`text-[11px] font-medium uppercase tracking-[0.1em] ${
                isBuy ? "text-bull-ink" : "text-ink-subtle"
              }`}
            >
              Decision
            </div>
            <div
              className={`tabular mt-2 inline-flex items-center gap-2 text-2xl font-medium ${
                isBuy ? "text-bull-ink" : "text-ink"
              }`}
            >
              {isBuy ? (
                <>
                  <Check className="h-5 w-5" /> Buy
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5" /> Wait
                </>
              )}
            </div>
            <div
              className={`mt-1 text-xs ${
                isBuy ? "text-bull-ink/80" : "text-ink-muted"
              }`}
            >
              {isBuy
                ? "Price is below your margin-of-safety target"
                : `Wait for $${targetBuyPrice.toFixed(2)} or lower`}
            </div>
          </div>
        </div>

        {/* Footnotes */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-hairline pt-5 text-xs text-ink-muted sm:grid-cols-3">
          <div className="flex items-baseline justify-between gap-2">
            <span>Total enterprise value</span>
            <span className="tabular font-medium text-ink">
              ${(intrinsicValue / 1e9).toFixed(2)}B
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span>Shares outstanding</span>
            <span className="tabular font-medium text-ink">
              {(stock.sharesOutstanding / 1e9).toFixed(2)}B
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span>Annual FCF</span>
            <span className="tabular font-medium text-ink">
              ${(stock.freeCashFlow / 1e9).toFixed(2)}B
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Step 3</p>
            <h3 className="mt-1 font-serif text-xl font-medium text-ink">
              Projected free cash flow
            </h3>
          </div>
          <p className="text-xs text-ink-muted">
            Solid line = nominal · Dashed = present value
          </p>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" vertical={false} />
              <XAxis
                dataKey="year"
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
                tickFormatter={(value) => `$${(value / 1e9).toFixed(0)}B`}
              />
              <Tooltip
                cursor={{ stroke: "var(--hairline-strong)", strokeWidth: 1 }}
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
                formatter={(value: any, name: string) => {
                  const label =
                    name === "projectedFCF" ? "Projected FCF" : "Present Value";
                  return [`$${(value / 1e9).toFixed(2)}B`, label];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "var(--ink-muted)" }}
                iconType="plainline"
                formatter={(value) =>
                  value === "projectedFCF" ? "Projected FCF" : "Present Value"
                }
              />
              <Line
                type="monotone"
                dataKey="projectedFCF"
                stroke="var(--accent)"
                strokeWidth={2}
                name="projectedFCF"
                dot={{ fill: "var(--accent)", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="presentValue"
                stroke="var(--neutral-data)"
                strokeWidth={1.75}
                name="presentValue"
                strokeDasharray="4 4"
                dot={{ fill: "var(--neutral-data)", r: 2.5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
