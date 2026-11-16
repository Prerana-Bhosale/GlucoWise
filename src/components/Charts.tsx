import React, { useMemo, useState } from 'react';
import type { GlucoseReading, ImpactLevel, WeeklyDayPoint } from '../types/glucowise';
import { classifyGlucose } from '../utils/nutrition';

interface CalorieRingProps {
  consumed: number;
  target: number;
}

export const CalorieRingSvg: React.FC<CalorieRingProps> = ({ consumed, target }) => {
  const safeTarget = Math.max(1, target);
  const ratio = Math.min(1, consumed / safeTarget);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);
  const overTarget = consumed > safeTarget;

  return (
    <div className="relative inline-flex items-center justify-center w-36 h-36 shrink-0">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90" aria-label={`Calories consumed ${consumed} of ${target}`}>
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-emerald-950/10 dark:text-emerald-100/10"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={
            overTarget
              ? 'text-amber-500 dark:text-amber-400 transition-all duration-500'
              : 'text-[#1b7a52] dark:text-emerald-400 transition-all duration-500'
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-[#0f2419] dark:text-emerald-50">
          {consumed}
        </span>
        <span className="text-[11px] text-[#476354] dark:text-emerald-200/70">
          of {target} kcal
        </span>
      </div>
    </div>
  );
};

interface SpikeScoreGaugeProps {
  score: number;
  impactLevel: ImpactLevel;
}

export const SpikeScoreGaugeSvg: React.FC<SpikeScoreGaugeProps> = ({ score, impactLevel }) => {
  const clamped = Math.min(100, Math.max(0, score));
  const r = 48;
  const arcLength = Math.PI * r; // Half circle
  const offset = arcLength * (1 - clamped / 100);

  const strokeColor =
    impactLevel === 'Low'
      ? 'text-[#1b7a52] dark:text-emerald-400'
      : impactLevel === 'Moderate'
      ? 'text-amber-500 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 120 72" className="w-36 h-22 overflow-visible" aria-label={`Glucose Spike Score ${clamped} out of 100 (${impactLevel})`}>
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className="text-emerald-950/10 dark:text-emerald-100/10"
        />
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={offset}
          className={`${strokeColor} transition-all duration-500`}
        />
        <text
          x="60"
          y="50"
          textAnchor="middle"
          className="fill-[#0f2419] dark:fill-emerald-50 font-mono text-2xl font-semibold tabular-nums"
        >
          {clamped}
        </text>
        <text
          x="60"
          y="65"
          textAnchor="middle"
          className="fill-[#476354] dark:fill-emerald-200/70 text-[9px] font-medium"
        >
          SPIKE SCORE / 100
        </text>
      </svg>
    </div>
  );
};

interface GlucoseLineChartProps {
  readings: GlucoseReading[];
  lowThreshold?: number;
  highThreshold?: number;
}

export const GlucoseLineChartSvg: React.FC<GlucoseLineChartProps> = ({
  readings,
  lowThreshold = 70,
  highThreshold = 180,
}) => {
  const sorted = useMemo(
    () => [...readings].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [readings]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activePoint = useMemo(() => {
    if (sorted.length === 0) return null;
    return sorted.find((r) => r.id === selectedId) ?? sorted[sorted.length - 1];
  }, [sorted, selectedId]);

  if (sorted.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center rounded-xl border border-dashed border-emerald-950/15 dark:border-emerald-200/15 text-sm text-[#476354] dark:text-emerald-200/70">
        Log your first glucose reading to view the target range chart.
      </div>
    );
  }

  const width = 640;
  const height = 240;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minVal = Math.min(40, ...sorted.map((r) => r.value)) - 5;
  const maxVal = Math.max(220, ...sorted.map((r) => r.value)) + 15;
  const span = Math.max(1, maxVal - minVal);

  const yFor = (val: number) => padTop + plotH - ((val - minVal) / span) * plotH;

  const firstTime = new Date(sorted[0].timestamp).getTime();
  const lastTime = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const timeSpan = Math.max(1, lastTime - firstTime);

  const xFor = (ts: string, idx: number) => {
    if (sorted.length === 1) return padLeft + plotW / 2;
    if (timeSpan < 60_000) {
      return padLeft + (idx / (sorted.length - 1)) * plotW;
    }
    return padLeft + ((new Date(ts).getTime() - firstTime) / timeSpan) * plotW;
  };

  const yHigh = yFor(highThreshold);
  const yLow = yFor(lowThreshold);
  const bandHeight = Math.max(0, yLow - yHigh);

  const points = sorted.map((r, idx) => ({
    ...r,
    x: xFor(r.timestamp, idx),
    y: yFor(r.value),
    classification: classifyGlucose(r.value, lowThreshold, highThreshold),
  }));

  const linePath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  const yTicks = [50, 70, 120, 180, 240].filter((v) => v >= minVal && v <= maxVal);

  const formatPointTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-3">
      {activePoint && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#476354] dark:text-emerald-200/80 px-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50">
              {activePoint.value} mg/dL
            </span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{activePoint.context.replace('-', ' ')}</span>
            <span aria-hidden="true">·</span>
            <span>{classifyGlucose(activePoint.value, lowThreshold, highThreshold).label}</span>
          </div>
          <div className="tabular-nums">
            {formatPointTime(activePoint.timestamp)}
            {activePoint.note ? ` · ${activePoint.note}` : ''}
          </div>
        </div>
      )}

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Glucose readings line chart with 70 to 180 mg/dL shaded target band"
        >
          {/* Shaded Target Range Band (70-180 mg/dL) */}
          <rect
            x={padLeft}
            y={yHigh}
            width={plotW}
            height={bandHeight}
            rx="4"
            className="fill-emerald-500/12 dark:fill-emerald-400/14"
          />

          {/* Reference Lines for 70 and 180 */}
          <line
            x1={padLeft}
            x2={padLeft + plotW}
            y1={yHigh}
            y2={yHigh}
            stroke="currentColor"
            strokeDasharray="4 4"
            strokeWidth="1"
            className="text-emerald-700/40 dark:text-emerald-300/40"
          />
          <line
            x1={padLeft}
            x2={padLeft + plotW}
            y1={yLow}
            y2={yLow}
            stroke="currentColor"
            strokeDasharray="4 4"
            strokeWidth="1"
            className="text-emerald-700/40 dark:text-emerald-300/40"
          />

          {/* Y Axis Ticks */}
          {yTicks.map((tick) => {
            const ty = yFor(tick);
            const isBoundary = tick === 70 || tick === 180;
            return (
              <g key={tick}>
                <text
                  x={padLeft - 8}
                  y={ty + 3.5}
                  textAnchor="end"
                  className={`font-mono text-[10px] tabular-nums ${
                    isBoundary
                      ? 'fill-[#1b7a52] dark:fill-emerald-300 font-semibold'
                      : 'fill-[#476354]/80 dark:fill-emerald-200/60'
                  }`}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Range Label inside Shaded Band */}
          <text
            x={padLeft + plotW - 6}
            y={yHigh + 14}
            textAnchor="end"
            className="fill-[#1b7a52]/80 dark:fill-emerald-300/80 text-[10px] font-medium"
          >
            Target 70–180 mg/dL
          </text>

          {/* Connecting Line */}
          {points.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#1b7a52] dark:text-emerald-400"
            />
          )}

          {/* Data Points */}
          {points.map((pt) => {
            const isSelected = activePoint?.id === pt.id;
            const dotClass =
              pt.classification.status === 'in-range'
                ? 'fill-[#1b7a52] dark:fill-emerald-400'
                : pt.classification.status === 'low' || pt.classification.status === 'severe-low'
                ? 'fill-rose-600 dark:fill-rose-400'
                : 'fill-amber-500 dark:fill-amber-400';

            return (
              <g
                key={pt.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(pt.id)}
                onMouseEnter={() => setSelectedId(pt.id)}
              >
                {/* Invisible hit target */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                {isSelected && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8"
                    className="fill-emerald-500/20 dark:fill-emerald-300/25"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 5.5 : 4}
                  strokeWidth="2"
                  className={`${dotClass} stroke-white dark:stroke-[#121f18] transition-all`}
                />
              </g>
            );
          })}

          {/* X Axis Start & End Time Labels */}
          <text
            x={padLeft}
            y={height - 6}
            textAnchor="start"
            className="fill-[#476354]/80 dark:fill-emerald-200/60 text-[10px]"
          >
            {new Date(sorted[0].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </text>
          <text
            x={padLeft + plotW}
            y={height - 6}
            textAnchor="end"
            className="fill-[#476354]/80 dark:fill-emerald-200/60 text-[10px]"
          >
            {new Date(sorted[sorted.length - 1].timestamp).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            })}
          </text>
        </svg>
      </div>
    </div>
  );
};

interface WeeklyProgressChartProps {
  data: WeeklyDayPoint[];
}

export const WeeklyProgressChartSvg: React.FC<WeeklyProgressChartProps> = ({ data }) => {
  const width = 560;
  const height = 190;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const colW = plotW / Math.max(1, data.length);
  const barW = Math.min(28, colW * 0.45);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="7-day weekly progress report showing Time-in-Range percentage per day"
    >
      {[0, 50, 70, 100].map((pct) => {
        const y = padTop + plotH - (pct / 100) * plotH;
        return (
          <g key={pct}>
            <line
              x1={padLeft}
              x2={padLeft + plotW}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeDasharray={pct === 70 ? '4 4' : undefined}
              strokeWidth="1"
              className={
                pct === 70
                  ? 'text-emerald-600/40 dark:text-emerald-400/40'
                  : 'text-emerald-950/8 dark:text-emerald-100/8'
              }
            />
            <text
              x={padLeft - 6}
              y={y + 3.5}
              textAnchor="end"
              className="fill-[#476354]/80 dark:fill-emerald-200/60 font-mono text-[10px] tabular-nums"
            >
              {pct}%
            </text>
          </g>
        );
      })}

      {data.map((day, idx) => {
        const cx = padLeft + colW * idx + colW / 2;
        const barH = Math.max(4, (day.tirPercent / 100) * plotH);
        const y = padTop + plotH - barH;
        const isGoalMet = day.tirPercent >= 70;

        return (
          <g key={day.dateKey}>
            <rect
              x={cx - barW / 2}
              y={y}
              width={barW}
              height={barH}
              rx="6"
              className={
                isGoalMet
                  ? 'fill-[#1b7a52] dark:fill-emerald-400'
                  : 'fill-amber-500/85 dark:fill-amber-400/85'
              }
            />
            <text
              x={cx}
              y={y - 5}
              textAnchor="middle"
              className="fill-[#0f2419] dark:fill-emerald-100 font-mono text-[10px] tabular-nums"
            >
              {day.tirPercent}%
            </text>
            <text
              x={cx}
              y={height - 8}
              textAnchor="middle"
              className="fill-[#476354] dark:fill-emerald-200/75 text-[11px] font-medium"
            >
              {day.dayLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
