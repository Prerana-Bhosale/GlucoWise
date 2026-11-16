import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  AppSettings,
  GlucoseContext,
  GlucoseReading,
  UserProfile,
} from '../types/glucowise';
import { calculateGlucoseStats, classifyGlucose } from '../utils/nutrition';
import { GlucoseLineChartSvg } from './Charts';
import { GlucoseTrendsD3 } from './GlucoseTrendsD3';

interface GlucoseTabProps {
  profile: UserProfile;
  settings: AppSettings;
  readings: GlucoseReading[];
  onAddReading: (reading: GlucoseReading) => void;
  onImportReadings: (readings: GlucoseReading[], provider: AppSettings['cgmStatus']) => void;
  onDeleteReading: (id: string) => void;
  onUpdateCgmStatus: (status: AppSettings['cgmStatus']) => void;
}

type RangeFilter = '24h' | '7d' | '30d' | '90d' | 'all';

export const GlucoseTab: React.FC<GlucoseTabProps> = ({
  profile,
  settings,
  readings,
  onAddReading,
  onImportReadings,
  onDeleteReading,
  onUpdateCgmStatus,
}) => {
  const [valueInput, setValueInput] = useState('116');
  const [context, setContext] = useState<GlucoseContext>('post-meal');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<RangeFilter>('7d');
  const [formError, setFormError] = useState<string | null>(null);
  const [cgmNotice, setCgmNotice] = useState<string | null>(null);

  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const filteredReadings = useMemo(() => {
    const now = Date.now();
    const cutoff =
      filter === '24h'
        ? now - 24 * 60 * 60 * 1000
        : filter === '7d'
        ? now - 7 * 24 * 60 * 60 * 1000
        : filter === '30d'
        ? now - 30 * 24 * 60 * 60 * 1000
        : filter === '90d'
        ? now - 90 * 24 * 60 * 60 * 1000
        : 0;

    return [...readings]
      .filter((r) => new Date(r.timestamp).getTime() >= cutoff)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [readings, filter]);

  const stats = useMemo(
    () => calculateGlucoseStats(filteredReadings, profile.glucoseLow, profile.glucoseHigh),
    [filteredReadings, profile.glucoseLow, profile.glucoseHigh]
  );

  const latest = filteredReadings[0] ?? null;
  const latestClassification = latest
    ? classifyGlucose(latest.value, profile.glucoseLow, profile.glucoseHigh)
    : null;

  const abnormalReadings = filteredReadings.filter(
    (r) => classifyGlucose(r.value, profile.glucoseLow, profile.glucoseHigh).isAbnormal
  );

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const num = Number(valueInput);
    if (!Number.isFinite(num) || num < 20 || num > 600) {
      setFormError('Please enter a valid glucose reading between 20 and 600 mg/dL.');
      return;
    }

    onAddReading({
      id: `g-${Date.now()}`,
      timestamp: new Date().toISOString(),
      value: Math.round(num),
      context,
      note: note.trim() || undefined,
      source: 'manual',
    });
    setNote('');
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCgmNotice(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const parsed: GlucoseReading[] = [];

      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length < 2) continue;
        // Support timestamp,value or value,timestamp
        const maybeNum1 = Number(parts[0]);
        const maybeNum2 = Number(parts[1]);
        let val = NaN;
        let ts = '';

        if (Number.isFinite(maybeNum2) && maybeNum2 >= 20 && maybeNum2 <= 600 && !Number.isNaN(Date.parse(parts[0]))) {
          ts = new Date(parts[0]).toISOString();
          val = Math.round(maybeNum2);
        } else if (Number.isFinite(maybeNum1) && maybeNum1 >= 20 && maybeNum1 <= 600 && !Number.isNaN(Date.parse(parts[1]))) {
          ts = new Date(parts[1]).toISOString();
          val = Math.round(maybeNum1);
        }

        if (ts && Number.isFinite(val)) {
          parsed.push({
            id: `cgm-${Date.now()}-${parsed.length}`,
            timestamp: ts,
            value: val,
            context: 'random',
            note: 'CGM CSV import',
            source: 'cgm-import',
          });
        }
      }

      if (parsed.length === 0) {
        setCgmNotice('No valid rows found. Expected CSV columns like: 2026-11-16T08:30:00Z,118');
      } else {
        onImportReadings(parsed, 'health-sync');
        setCgmNotice(`Imported ${parsed.length} glucose readings from CSV.`);
      }
    } catch {
      setCgmNotice('Could not read the uploaded CSV file.');
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f2419] dark:text-emerald-50">
          Glucose Tracking
        </h1>
        <p className="text-sm text-[#476354] dark:text-emerald-200/75">
          Target band: {profile.glucoseLow}–{profile.glucoseHigh} mg/dL · Fasting target ≤ {profile.fastingTargetMax} mg/dL · Goal A1C {profile.targetA1c}%
        </p>
      </div>

      {/* Abnormal Reading Alert */}
      {latest && latestClassification?.isAbnormal && (
        <div
          role="alert"
          className={`rounded-2xl p-4 border flex items-start gap-3 ${
            latestClassification.status === 'severe-low' || latestClassification.status === 'low'
              ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-100'
              : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-100'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <div className="font-semibold">
              Abnormal Reading Alert: {latest.value} mg/dL ({latestClassification.label})
            </div>
            <p className="text-xs opacity-90 leading-relaxed">{latestClassification.guidance}</p>
          </div>
        </div>
      )}

      {/* Top Grid: Log Form + Time-in-Range KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Quick Log Reading */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5">
          <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50 mb-3">
            Log Reading
          </h2>

          <form onSubmit={handleLogSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="glucose-val" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
                  Glucose (mg/dL)
                </label>
                <input
                  id="glucose-val"
                  type="number"
                  min={20}
                  max={600}
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 font-mono text-base font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-[#1b7a52] dark:focus:ring-emerald-400"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
                  Reading Context
                </span>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] min-h-[44px]">
                  {(['fasting', 'post-meal', 'random'] as GlucoseContext[]).map((ctx) => (
                    <button
                      key={ctx}
                      type="button"
                      onClick={() => setContext(ctx)}
                      className={`rounded-lg text-[11px] font-medium capitalize transition-colors cursor-pointer whitespace-nowrap px-1 ${
                        context === ctx
                          ? 'bg-white dark:bg-[#121f18] text-[#0f2419] dark:text-emerald-50 shadow-sm'
                          : 'text-[#476354] dark:text-emerald-200/70'
                      }`}
                    >
                      {ctx === 'post-meal' ? 'Meal' : ctx}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="glucose-note" className="block text-xs font-medium text-[#476354] dark:text-emerald-200/80 mb-1">
                Optional note (meal, walk, stress)
              </label>
              <input
                id="glucose-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. 2h after lunch + 15m walk"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] border border-emerald-950/10 dark:border-emerald-200/15 text-sm text-[#0f2419] dark:text-emerald-50 placeholder:text-[#476354]/60 dark:placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#1b7a52] dark:focus:ring-emerald-400"
              />
            </div>

            {formError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{formError}</p>
            )}

            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1b7a52] hover:bg-[#156342] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-[#07150e] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Save Glucose Reading
            </button>
          </form>
        </section>

        {/* Time-in-Range & Summary Metrics */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
                Time-in-Range Analytics
              </h2>
              <p className="text-xs text-[#476354] dark:text-emerald-200/70">
                Standard ADA target ≥ 70% in {profile.glucoseLow}–{profile.glucoseHigh} mg/dL
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f3f7f4] dark:bg-[#192b21]">
              {(['24h', '7d', '30d', '90d', 'all'] as RangeFilter[]).map((rng) => (
                <button
                  key={rng}
                  type="button"
                  onClick={() => setFilter(rng)}
                  className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium uppercase cursor-pointer transition-colors ${
                    filter === rng
                      ? 'bg-white dark:bg-[#121f18] text-[#0f2419] dark:text-emerald-50 shadow-sm'
                      : 'text-[#476354] dark:text-emerald-200/70'
                  }`}
                >
                  {rng}
                </button>
              ))}
            </div>
          </div>

          {/* Stacked Range Bar */}
          <div className="space-y-2">
            <div className="h-4 rounded-full overflow-hidden flex bg-[#f3f7f4] dark:bg-[#192b21]">
              {stats.lowPct > 0 && (
                <div
                  className="bg-rose-500 dark:bg-rose-400 h-full transition-all"
                  style={{ width: `${stats.lowPct}%` }}
                  title={`Below range: ${stats.lowPct}%`}
                />
              )}
              {stats.inRangePct > 0 && (
                <div
                  className="bg-[#1b7a52] dark:bg-emerald-400 h-full transition-all"
                  style={{ width: `${stats.inRangePct}%` }}
                  title={`In range: ${stats.inRangePct}%`}
                />
              )}
              {stats.highPct > 0 && (
                <div
                  className="bg-amber-500 dark:bg-amber-400 h-full transition-all"
                  style={{ width: `${stats.highPct}%` }}
                  title={`Above range: ${stats.highPct}%`}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#476354] dark:text-emerald-200/80 tabular-nums">
              <span>Below &lt;{profile.glucoseLow}: <strong className="font-mono text-rose-600 dark:text-rose-400">{stats.lowPct}%</strong></span>
              <span>In Range ({profile.glucoseLow}–{profile.glucoseHigh}): <strong className="font-mono text-[#1b7a52] dark:text-emerald-400">{stats.inRangePct}%</strong></span>
              <span>Above &gt;{profile.glucoseHigh}: <strong className="font-mono text-amber-600 dark:text-amber-400">{stats.highPct}%</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              ['Average', stats.count ? `${stats.avg} mg/dL` : '—'],
              ['Est. GMI', stats.count ? `${stats.gmi}%` : '—'],
              ['Out-of-Range', `${abnormalReadings.length} logs`],
              ['Min / Max', stats.count ? `${stats.min}–${stats.max}` : '—'],
            ].map(([label, val]) => (
              <div key={label} className="rounded-xl bg-[#f3f7f4] dark:bg-[#192b21] p-3">
                <div className="text-[11px] text-[#476354] dark:text-emerald-200/70">{label}</div>
                <div className="font-mono text-sm font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50 mt-0.5">
                  {val}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Inline SVG Glucose Line Chart with Shaded Target Band */}
      <section className="rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
              Glucose Trend ({profile.glucoseLow}–{profile.glucoseHigh} mg/dL Shaded Band)
            </h2>
            <p className="text-xs text-[#476354] dark:text-emerald-200/70">
              Tap or hover any point to inspect timestamp, context, and range status
            </p>
          </div>
        </div>

        <GlucoseLineChartSvg
          readings={filteredReadings}
          lowThreshold={profile.glucoseLow}
          highThreshold={profile.glucoseHigh}
        />
      </section>

      {/* D3 Visual Trends Summary (7 / 30 / 90 Days Average & Standard Deviation) */}
      <GlucoseTrendsD3
        readings={readings}
        lowThreshold={profile.glucoseLow}
        highThreshold={profile.glucoseHigh}
      />

      {/* Future CGM Integration & Readings List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-3">
          <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
            Recent Readings ({filteredReadings.length})
          </h2>

          {filteredReadings.length === 0 ? (
            <p className="text-sm text-[#476354] dark:text-emerald-200/75 py-4">
              No readings in this window.
            </p>
          ) : (
            <div className="divide-y divide-emerald-950/8 dark:divide-emerald-200/10 max-h-80 overflow-y-auto pr-1">
              {filteredReadings.map((r) => {
                const cls = classifyGlucose(r.value, profile.glucoseLow, profile.glucoseHigh);
                return (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-semibold tabular-nums text-[#0f2419] dark:text-emerald-50">
                          {r.value} mg/dL
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            cls.isAbnormal
                              ? cls.status === 'low' || cls.status === 'severe-low'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-amber-600 dark:text-amber-400'
                              : 'text-[#1b7a52] dark:text-emerald-400'
                          }`}
                        >
                          {cls.isAbnormal ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          {cls.label}
                        </span>
                      </div>
                      <div className="text-xs text-[#476354] dark:text-emerald-200/75 truncate">
                        <span className="capitalize">{r.context.replace('-', ' ')}</span>
                        <span aria-hidden="true"> · </span>
                        <span>
                          {new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                          {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {r.note ? ` · ${r.note}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteReading(r.id)}
                      aria-label={`Delete reading ${r.value} mg/dL`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#476354] hover:text-rose-600 dark:text-emerald-200/60 dark:hover:text-rose-400 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Future CGM Integration Architecture Card */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#121f18] border border-emerald-950/8 dark:border-emerald-200/10 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e8f1eb] dark:bg-[#192b21] flex items-center justify-center text-[#1b7a52] dark:text-emerald-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0f2419] dark:text-emerald-50">
                CGM Integration Readiness
              </h2>
              <p className="text-xs text-[#476354] dark:text-emerald-200/75 mt-0.5 leading-relaxed">
                Designed with standardized CGM data ingestion (`source: cgm-import`) for future Dexcom Share, FreeStyle LibreLink, or Apple Health / Health Connect sync.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-[#476354] dark:text-emerald-200/80">
              Preferred Sensor Bridge Profile
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['dexcom-ready', 'Dexcom Ready'],
                ['libre-ready', 'FreeStyle Libre'],
                ['health-sync', 'Health CSV Sync'],
                ['disconnected', 'Manual Only'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onUpdateCgmStatus(id as AppSettings['cgmStatus'])}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors cursor-pointer ${
                    settings.cgmStatus === id
                      ? 'border-[#1b7a52] dark:border-emerald-400 bg-[#e8f1eb]/70 dark:bg-[#192b21] text-[#0f2419] dark:text-emerald-50'
                      : 'border-emerald-950/10 dark:border-emerald-200/15 text-[#476354] dark:text-emerald-200/75'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-950/8 dark:border-emerald-200/10 space-y-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvUpload}
              className="sr-only"
              id="cgm-csv-import"
            />
            <label
              htmlFor="cgm-csv-import"
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#f3f7f4] hover:bg-[#e8f1eb] dark:bg-[#192b21] dark:hover:bg-[#22392c] text-[#0f2419] dark:text-emerald-100 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 text-[#1b7a52] dark:text-emerald-400" />
              Import CGM CSV Export (timestamp, mg/dL)
            </label>
            {cgmNotice && (
              <p className="text-xs text-[#1b7a52] dark:text-emerald-400">{cgmNotice}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
