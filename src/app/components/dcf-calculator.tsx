import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Stock } from "./stock-search";
import { calculateDCFRemote } from "../../lib/api";

interface DCFCalculatorProps {
  stock: Stock;
}

export function DCFCalculator({ stock }: DCFCalculatorProps) {
  const [growthRate, setGrowthRate] = useState(stock.fcfGrowthRate["5Y"].toString());
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

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Single unified white container */}
      <div className="bg-white rounded-3xl shadow-lg p-8 md:p-10 space-y-10">
        {/* Input Section */}
        <div>
          <h3 className="text-gray-900 mb-6">DCF Model Inputs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="space-y-2">
              <Label htmlFor="growth" className="text-gray-700">
                FCF Growth Rate (%)
              </Label>
              <Input
                id="growth"
                type="number"
                value={growthRate}
                onChange={(e) => setGrowthRate(e.target.value)}
                className="border border-gray-200 focus:border-emerald-500 focus:ring-emerald-100 rounded-xl h-12"
                placeholder="10"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount" className="text-gray-700">
                Discount Rate (%)
              </Label>
              <Input
                id="discount"
                type="number"
                value={discountRate}
                onChange={(e) => setDiscountRate(e.target.value)}
                className="border border-gray-200 focus:border-emerald-500 focus:ring-emerald-100 rounded-xl h-12"
                placeholder="10"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminal" className="text-gray-700">
                Terminal Growth (%)
              </Label>
              <Input
                id="terminal"
                type="number"
                value={terminalGrowthRate}
                onChange={(e) => setTerminalGrowthRate(e.target.value)}
                className="border border-gray-200 focus:border-emerald-500 focus:ring-emerald-100 rounded-xl h-12"
                placeholder="3"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="years" className="text-gray-700">
                Projection Years
              </Label>
              <Input
                id="years"
                type="number"
                value={projectionYears}
                onChange={(e) => setProjectionYears(e.target.value)}
                className="border border-gray-200 focus:border-emerald-500 focus:ring-emerald-100 rounded-xl h-12"
                placeholder="10"
                min="1"
                max="20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mos" className="text-gray-700">
                Margin of Safety (%)
              </Label>
              <Input
                id="mos"
                type="number"
                value={marginOfSafety}
                onChange={(e) => setMarginOfSafety(e.target.value)}
                className="border border-gray-200 focus:border-blue-500 focus:ring-blue-100 rounded-xl h-12"
                placeholder="20"
                step="1"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Quick Margin of Safety Presets */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Label className="text-gray-700 mb-3 block">Quick Margin of Safety Presets</Label>
            <div className="flex flex-wrap gap-3">
              {[10, 15, 20, 25, 30, 40, 50].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setMarginOfSafety(preset.toString())}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    parseFloat(marginOfSafety) === preset
                      ? "text-blue-600 underline decoration-2 underline-offset-4"
                      : "text-gray-600 hover:text-blue-500"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Intrinsic Value Display */}
        <div>
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-gray-900">Valuation Results</h3>
            {isCalculating && (
              <div className="text-sm text-gray-500">Calculating...</div>
            )}
          </div>
          {calculationError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {calculationError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-sm text-emerald-700 mb-2">Intrinsic Value per Share</div>
              <div className="text-4xl font-bold text-emerald-600">
                ${intrinsicValuePerShare.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-sm text-blue-700 mb-2">Target Buy Price ({mosPercentage}% MOS)</div>
              <div className="text-4xl font-bold text-blue-600">
                ${targetBuyPrice.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-2">Current Market Price</div>
              <div className="text-4xl font-bold text-gray-900">
                ${stock.price.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-2">
                {upside >= 0 ? "Upside Potential" : "Downside Risk"}
              </div>
              <div className={`text-4xl font-bold ${upside >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {upside >= 0 ? "+" : ""}{upside.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Margin of Safety Analysis */}
          <div className="mt-10 pt-8 border-t border-gray-200">
            <div className="text-center mb-6">
              <h4 className="text-blue-700 font-semibold mb-1">Margin of Safety Analysis</h4>
              <p className="text-sm text-gray-600">
                Investment recommendation based on {mosPercentage}% margin of safety
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-center max-w-2xl mx-auto">
              <div>
                <div className="text-sm text-gray-600 mb-2">To Market Price</div>
                <div className={`text-3xl font-bold ${upsideWithMOS >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {upsideWithMOS >= 0 ? "+" : ""}{upsideWithMOS.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {upsideWithMOS >= 0 ? "Still undervalued" : "Currently overvalued"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Investment Decision</div>
                <div className={`text-3xl font-bold ${stock.price <= targetBuyPrice ? "text-emerald-600" : "text-orange-600"}`}>
                  {stock.price <= targetBuyPrice ? "✓ BUY" : "⏸ WAIT"}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {stock.price <= targetBuyPrice 
                    ? "Price below target" 
                    : `Wait for $${targetBuyPrice.toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-sm text-gray-600">
              <div>
                <div className="mb-1">Total Enterprise Value</div>
                <div className="text-lg font-semibold text-gray-900">
                  ${(intrinsicValue / 1e9).toFixed(2)}B
                </div>
              </div>
              <div>
                <div className="mb-1">Shares Outstanding</div>
                <div className="text-lg font-semibold text-gray-900">
                  {(stock.sharesOutstanding / 1e9).toFixed(2)}B
                </div>
              </div>
              <div>
                <div className="mb-1">Current FCF (Annual)</div>
                <div className="text-lg font-semibold text-gray-900">
                  ${(stock.freeCashFlow / 1e9).toFixed(2)}B
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Chart Section */}
        <div>
          <h3 className="text-gray-900 mb-6">Projected Free Cash Flow</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="year"
                  stroke="#6b7280"
                  style={{ fontSize: "14px" }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: "14px" }}
                  tickFormatter={(value) => `$${(value / 1e9).toFixed(0)}B`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "12px"
                  }}
                  formatter={(value: any, name: string) => {
                    const label = name === "projectedFCF" ? "Projected FCF" : "Present Value";
                    return [`$${(value / 1e9).toFixed(2)}B`, label];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="projectedFCF"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="projectedFCF"
                  dot={{ fill: "#10b981", r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="presentValue"
                  stroke="#6ee7b7"
                  strokeWidth={2}
                  name="presentValue"
                  dot={{ fill: "#6ee7b7", r: 4 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-emerald-500"></div>
              <span className="text-gray-600">Projected FCF</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-emerald-300 border-dashed border-t-2 border-emerald-300"></div>
              <span className="text-gray-600">Present Value</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
