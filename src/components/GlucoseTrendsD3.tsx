import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from 'lucide-react';
import type { GlucoseReading } from '../types/glucowise';
import {
  buildGlucoseTrendSeries,
  computeGlucoseWindowSummary,
  type GlucoseTrendBucket,
} from '../utils/nutrition';

interface GlucoseTrendsD3Props {
  readings: GlucoseReading[];
  lowThreshold?: number;
  highThreshold?: number;
}

const WINDOWS: Array<7 | 30 | 90> = [7, 30, 90];

export const GlucoseTrendsD3: React.FC<GlucoseTrendsD3Props> = ({
  readings,
  lowThreshold = 70,
  highThreshold = 180,
}) => {
  const [activeDays, setActiveDays] = useState<7 | 30 | 90>(30);
  const [hoveredBucket, setHoveredBucket] = useState<GlucoseTrendBucket | null>(null);

  const summaries = useMemo(
    () =>
      WINDOWS.map((d) =>
        computeGlucoseWindowSummary(readings, d, lowThreshold, highThreshold)
      ),
    [readings, lowThreshold, highThreshold]
  );

  const series = useMemo(
    () => buildGlucoseTrendSeries(readings, activeDays),
    [readings, activeDays]
  );

  const activeSummary = useMemo(
    () => summaries.find((s) => s.days === activeDays) ?? summaries[1],
    [summaries, activeDays]
  );

  const chartGeometry = useMemo(() => {
    const width = 680;
    const height = 260;
    const margin = { top: 20, right: 20, bottom: 32, left: 44 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    if (series.length === 0) {
      return {
        width,
        height,
        margin,
        innerW,
        innerH,
        xTicks: [] as Date[],
        yTicks: [70, 120, 180],
        sdAreaPath: '',
        avgLinePath: '',
        trendLinePath: '',
        bandY: 0,
        bandH: 0,
        points: [] as Array<GlucoseTrendBucket & { cx: number; cy: number; ty: number }>,
        xFormat: d3.timeFormat('%b %d'),
      };
    }

    const dates = series.map((d) => d.date);
    const minDate = d3.min(dates) ?? new Date();
    const maxDate = d3.max(dates) ?? new Date();
    const paddedMax =
      minDate.getTime() === maxDate.getTime()
        ? new Date(maxDate.getTime() + 24 * 60 * 60 * 1000)
        : maxDate;

    const xScale = d3.scaleTime().domain([minDate, paddedMax]).range([0, innerW]);

    const yMinRaw = Math.min(
      lowThreshold - 15,
      d3.min(series, (d) => d.lowerSd) ?? 60
    );
    const yMaxRaw = Math.max(
      highThreshold + 20,
      d3.max(series, (d) => d.upperSd) ?? 210
    );

    const yScale = d3
      .scaleLinear()
      .domain([Math.max(35, yMinRaw), yMaxRaw])
      .nice()
      .range([innerH, 0]);

    const sdAreaGenerator = d3
      .area<GlucoseTrendBucket>()
      .x((d) => xScale(d.date))
      .y0((d) => yScale(d.lowerSd))
      .y1((d) => yScale(d.upperSd))
      .curve(d3.curveMonotoneX);

    const avgLineGenerator = d3
      .line<GlucoseTrendBucket>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.avg))
      .curve(d3.curveMonotoneX);

    const trendLineGenerator = d3
      .line<GlucoseTrendBucket>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.trendAvg))
      .curve(d3.curveMonotoneX);

    const bandTop = yScale(highThreshold);
    const bandBottom = yScale(lowThreshold);

    return {
      width,
      height,
      margin,
      innerW,
      innerH,
      xTicks: xScale.ticks(activeDays === 7 ? 5 : 6),
      yTicks: yScale.ticks(5),
      sdAreaPath: sdAreaGenerator(series) ?? '',
      avgLinePath: avgLineGenerator(series) ?? '',
      trendLinePath: trendLineGenerator(series) ?? '',
      bandY: bandTop,
      bandH: Math.max(0, bandBottom - bandTop),
      points: series.map((d) => ({
        ...d,
        cx: xScale(d.date),
        cy: yScale(d.avg),
        ty: yScale(d.trendAvg),
      })),
      xFormat: d3.timeFormat('%b %d'),
    };
  }, [series, activeDays, lowThreshold, highThreshold]);

  const displayBucket = hoveredBucket ?? series[series.length - 1] ?? null;

  return (
    <section className="rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-5">
      {/* Header & Window Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1b7a52] dark:text-emerald-400" />
            Visual Trends Summary (7 / 30 / 90 Days)
          </h2>
          <p className="text-xs text-[#476354] dark:text-emerald-200/70">
            Average glucose trajectory, ±1 Standard Deviation variability band, and stability (% CV)
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] self-start">
          {WINDOWS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setActiveDays(d);
                setHoveredBucket(null);
              }}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                activeDays === d
                  ? 'bg-white dark:bg-[#121f18] text-[#0f2419] dark:text-emerald-50 shadow-sm'
                  : 'text-[#476354] dark:text-emerald-200/75 hover:text-[#0f2419] dark:hover:text-emerald-50'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* 7 / 30 / 90 Day Comparative Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaries.map((win) => {
          const isActive = win.days === activeDays;
          const isStableCv = win.cv < 36;
          return (
            <button
              key={win.days}
              type="button"
              onClick={() => {
                setActiveDays(win.days);
                setHoveredBucket(null);
              }}
              className={`rounded-xl p-3.5 text-left border transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#1b7a52] dark:border-emerald-400 bg-[#e8f1eb]/65 dark:bg-[#192b21]'
                  : 'border-emerald-950/8 dark:border-emerald-200/10 bg-[#f3f7f4]/70 dark:bg-[#192b21]/45 hover:bg-[#e8f1eb]/45 dark:hover:bg-[#192b21]/75'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#0f2419] dark:text-emerald-50">
                  Last {win.days} Days
                </span>
                <span className="text-[11px] text-[#476354] dark:text-emerald-200/70 tabular-nums">
                  {win.count} logs · {win.inRangePct}% TIR
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-[11px] text-[#476354] dark:text-emerald-200/70">
                    Average Glucose
                  </div>
                  <div className="font-mono text-xl font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50">
                    {win.count ? `${win.avg}` : '—'}{' '}
                    <span className="text-xs font-normal text-[#476354] dark:text-emerald-200/70">
                      mg/dL
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-[#476354] dark:text-emerald-200/70">
                    Std. Deviation
                  </div>
                  <div className="font-mono text-base font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50">
                    {win.count ? `±${win.sd}` : '—'}{' '}
                    <span className="text-[11px] font-normal text-[#476354] dark:text-emerald-200/70">
                      mg/dL
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-emerald-950/8 dark:border-emerald-200/10 flex items-center justify-between text-[11px] tabular-nums">
                <span
                  className={
                    win.count === 0
                      ? 'text-[#476354] dark:text-emerald-200/70'
                      : isStableCv
                      ? 'text-[#1b7a52] dark:text-emerald-400 font-medium'
                      : 'text-amber-600 dark:text-amber-400 font-medium'
                  }
                >
                  {win.count === 0
                    ? 'No data'
                    : `${win.cv}% CV (${isStableCv ? 'Stable' : 'Variable'})`}
                </span>

                {win.trendDelta !== null && (
                  <span
                    className={`inline-flex items-center gap-0.5 font-medium ${
                      win.trendDelta < 0
                        ? 'text-[#1b7a52] dark:text-emerald-400'
                        : win.trendDelta > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[#476354] dark:text-emerald-200/70'
                    }`}
                  >
                    {win.trendDelta < 0 ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : win.trendDelta > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    {win.trendDelta > 0 ? `+${win.trendDelta}` : win.trendDelta} mg/dL
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Bucket Readout & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#476354] dark:text-emerald-200/80 px-1">
        {displayBucket ? (
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="font-semibold text-[#0f2419] dark:text-emerald-50">
              {displayBucket.label}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Mean: <strong className="font-mono text-[#0f2419] dark:text-emerald-50">{displayBucket.avg} mg/dL</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              SD: <strong className="font-mono text-[#0f2419] dark:text-emerald-50">±{displayBucket.sd} mg/dL</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Trend: <strong className="font-mono text-[#1b7a52] dark:text-emerald-400">{displayBucket.trendAvg} mg/dL</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>{displayBucket.count} reading{displayBucket.count === 1 ? '' : 's'}</span>
          </div>
        ) : (
          <span>No readings available in the last {activeDays} days.</span>
        )}

        <div className="flex items-center gap-4 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#1b7a52] dark:bg-emerald-400 inline-block" />
            Smoothed Trend
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-[#476354] dark:border-emerald-200/70 inline-block" />
            Period Avg
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-xs bg-emerald-500/20 dark:bg-emerald-400/25 inline-block" />
            ±1 SD Band
          </span>
        </div>
      </div>

      {/* D3 Trend Line & SD Variability Chart */}
      {series.length === 0 ? (
        <div className="h-56 flex items-center justify-center rounded-xl border border-dashed border-emerald-950/15 dark:border-emerald-200/15 text-sm text-[#476354] dark:text-emerald-200/75">
          Log readings to visualize {activeDays}-day average glucose and standard deviation trends.
        </div>
      ) : (
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label={`${activeDays}-day D3 glucose trend line and standard deviation chart`}
          >
            <g transform={`translate(${chartGeometry.margin.left},${chartGeometry.margin.top})`}>
              {/* Target Glucose Range Backdrop (70-180) */}
              <rect
                x={0}
                y={chartGeometry.bandY}
                width={chartGeometry.innerW}
                height={chartGeometry.bandH}
                className="fill-emerald-500/8 dark:fill-emerald-400/10"
              />

              {/* Horizontal Gridlines & Y Ticks */}
              {chartGeometry.yTicks.map((tick) => {
                const yScaleRange = chartGeometry.innerH;
                // Compute y using the same scale domain by finding linear ratio from points or recomputing via d3
                const yMinRaw = Math.min(
                  lowThreshold - 15,
                  d3.min(series, (d) => d.lowerSd) ?? 60
                );
                const yMaxRaw = Math.max(
                  highThreshold + 20,
                  d3.max(series, (d) => d.upperSd) ?? 210
                );
                const yScale = d3
                  .scaleLinear()
                  .domain([Math.max(35, yMinRaw), yMaxRaw])
                  .nice()
                  .range([yScaleRange, 0]);
                const ty = yScale(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={0}
                      x2={chartGeometry.innerW}
                      y1={ty}
                      y2={ty}
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-emerald-950/8 dark:text-emerald-100/10"
                    />
                    <text
                      x={-8}
                      y={ty + 3.5}
                      textAnchor="end"
                      className="fill-[#476354]/85 dark:fill-emerald-200/70 font-mono text-[10px] tabular-nums"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* ±1 SD Variability Shaded Area */}
              <path
                d={chartGeometry.sdAreaPath}
                className="fill-emerald-600/18 dark:fill-emerald-400/20"
              />

              {/* Period Average Line (Dashed) */}
              <path
                d={chartGeometry.avgLinePath}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="text-[#476354]/75 dark:text-emerald-200/65"
              />

              {/* Smoothed Rolling Trend Line */}
              <path
                d={chartGeometry.trendLinePath}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                className="text-[#1b7a52] dark:text-emerald-400"
              />

              {/* Interactive Bucket Points */}
              {chartGeometry.points.map((pt, i) => {
                const isHovered = displayBucket?.label === pt.label;
                return (
                  <g
                    key={`${pt.label}-${i}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredBucket(pt)}
                    onClick={() => setHoveredBucket(pt)}
                  >
                    <circle cx={pt.cx} cy={pt.cy} r="13" fill="transparent" />
                    {isHovered && (
                      <line
                        x1={pt.cx}
                        x2={pt.cx}
                        y1={0}
                        y2={chartGeometry.innerH}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        className="text-[#1b7a52]/40 dark:text-emerald-300/40"
                      />
                    )}
                    <circle
                      cx={pt.cx}
                      cy={pt.cy}
                      r={isHovered ? 4.5 : 3}
                      className="fill-[#1b7a52] dark:fill-emerald-400 stroke-white dark:stroke-[#121f18]"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* X Axis Date Ticks */}
              {(() => {
                const dates = series.map((d) => d.date);
                const minDate = d3.min(dates) ?? new Date();
                const maxDate = d3.max(dates) ?? new Date();
                const paddedMax =
                  minDate.getTime() === maxDate.getTime()
                    ? new Date(maxDate.getTime() + 24 * 60 * 60 * 1000)
                    : maxDate;
                const xScale = d3
                  .scaleTime()
                  .domain([minDate, paddedMax])
                  .range([0, chartGeometry.innerW]);
                return chartGeometry.xTicks.map((t, idx) => (
                  <text
                    key={idx}
                    x={xScale(t)}
                    y={chartGeometry.innerH + 20}
                    textAnchor="middle"
                    className="fill-[#476354]/85 dark:fill-emerald-200/65 text-[10px]"
                  >
                    {chartGeometry.xFormat(t)}
                  </text>
                ));
              })()}
            </g>
          </svg>
        </div>
      )}

      {activeSummary.count > 0 && (
        <p className="text-xs text-[#476354] dark:text-emerald-200/75 leading-relaxed">
          Over the last <strong>{activeDays} days</strong>, your average glucose is{' '}
          <strong className="font-mono text-[#0f2419] dark:text-emerald-50">{activeSummary.avg} mg/dL</strong> with a standard deviation of{' '}
          <strong className="font-mono text-[#0f2419] dark:text-emerald-50">±{activeSummary.sd} mg/dL</strong> ({activeSummary.cv}% CV). Clinical guidelines generally aim for CV below 36% to minimize wide swings.
        </p>
      )}
    </section>
  );
};
