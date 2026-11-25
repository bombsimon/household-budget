import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney } from '../utils/expenseCalculations';

export interface CostPart {
  label: string;
  amount: number;
  color: string;
}

interface CostChartProps {
  parts: CostPart[];
  hideShares?: boolean;
}

const sumOf = (parts: CostPart[]): number =>
  parts.reduce((sum, part) => sum + part.amount, 0);

export function SegmentedBar({
  parts,
  isThin = false,
}: CostChartProps & { isThin?: boolean }) {
  const visibleParts = parts.filter((part) => part.amount > 0);
  const total = sumOf(visibleParts);

  return (
    <div
      role="img"
      aria-label={visibleParts
        .map((part) => `${part.label} ${formatMoney(part.amount)} kr`)
        .join(', ')}
      className={`flex w-full gap-0.5 ${isThin ? 'h-2' : 'h-7'}`}
    >
      {visibleParts.map((part) => (
        <div
          key={part.label}
          title={`${part.label}: ${formatMoney(part.amount)} kr`}
          className={`min-w-0.5 transition-opacity hover:opacity-80 ${isThin ? 'rounded-full' : 'rounded'}`}
          style={{
            width: `${(part.amount / total) * 100}%`,
            backgroundColor: part.color,
          }}
        />
      ))}
    </div>
  );
}

export function CostLegend({ parts, hideShares = false }: CostChartProps) {
  const visibleParts = parts.filter((part) => part.amount > 0);
  const total = sumOf(visibleParts);

  return (
    <ul className="divide-y divide-slate-100">
      {visibleParts.map((part) => (
        <li key={part.label} className="flex items-center gap-3 py-2 text-sm">
          <span
            aria-hidden="true"
            className="h-3 w-3 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: part.color }}
          />
          <span className="min-w-0 flex-1 break-words">{part.label}</span>
          <span className="money font-semibold">
            {formatMoney(part.amount)} kr
          </span>
          <span
            className={`money w-12 text-right text-slate-600 ${hideShares ? 'select-none blur-md' : ''}`}
          >
            {Math.round((part.amount / total) * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CostDonut({ parts }: CostChartProps) {
  const visibleParts = parts.filter((part) => part.amount > 0);

  return (
    <div className="relative mx-auto h-56 w-56 flex-shrink-0">
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">
          {formatMoney(sumOf(visibleParts))}
        </span>
        <span className="text-sm text-slate-600">kr a month</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer>
          <Pie
            data={visibleParts}
            dataKey="amount"
            nameKey="label"
            innerRadius={76}
            outerRadius={106}
            startAngle={90}
            endAngle={-270}
            stroke="#fff"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {visibleParts.map((part) => (
              <Cell key={part.label} fill={part.color} />
            ))}
          </Pie>
          <Tooltip
            wrapperStyle={{ zIndex: 1 }}
            formatter={(value: number, name: string) => [
              `${formatMoney(value)} kr`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProgressRing({ percentage }: { percentage: number }) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const circumference = 2 * Math.PI * 42;

  return (
    <div className="relative h-28 w-28 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="-rotate-90" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#d1fae5"
          strokeWidth="10"
        />
        {clamped > 0 && (
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#059669"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold">{percentage.toFixed(0)}%</span>
        <span className="text-xs text-slate-600">paid off</span>
      </div>
    </div>
  );
}
