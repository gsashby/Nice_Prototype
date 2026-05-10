'use client';
import { useEffect, useState, useRef } from 'react';
import { Sparkles, X, CheckSquare, Square } from 'lucide-react';
import type { Recommendation } from './RecommendedActions';

// ── Styles ────────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, { badge: string }> = {
  critical: { badge: 'bg-[#FEE2E2] text-[#DC2626]' },
  high:     { badge: 'bg-[#FFEDD5] text-[#C2410C]' },
  medium:   { badge: 'bg-[#FEF3C7] text-[#92400E]' },
  low:      { badge: 'bg-[#DBEAFE] text-[#1D4ED8]'  },
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  'Policy & Compliance': { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' },
  'Model Performance':   { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]' },
  'Security & Access':   { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]' },
  'Operational':         { bg: 'bg-[#F5F3FF]', text: 'text-[#7C3AED]' },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type DashboardContext = {
  governanceScore?: number;
  policyViolations?: number;
  alertCount?: number;
};

type Props = {
  recommendation: Recommendation | null;
  dashboardContext: DashboardContext;
  onClose: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecommendationDrawer({ recommendation, dashboardContext, onClose }: Props) {
  const [checked,   setChecked]   = useState<Set<number>>(new Set());
  const [analysis,  setAnalysis]  = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState<string | null>(null);
  const [aiRun,     setAiRun]     = useState(false); // true once the user has clicked the button
  const overlayRef                = useRef<HTMLDivElement>(null);

  // Reset state whenever a new recommendation is opened
  useEffect(() => {
    setChecked(new Set());
    setAnalysis('');
    setAiLoading(false);
    setAiError(null);
    setAiRun(false);
  }, [recommendation?.id]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  function toggleCheck(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function handleGetAnalysis() {
    if (!recommendation) return;
    setAiRun(true);
    setAiLoading(true);
    setAiError(null);
    setAnalysis('');

    try {
      const res = await fetch('/api/recommend-action', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          recommendation,
          dashboardContext: {
            governance_score:      dashboardContext.governanceScore,
            policy_violations_24h: dashboardContext.policyViolations,
            alertCount:            dashboardContext.alertCount,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setAnalysis(json.analysis ?? '');
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  const isOpen = !!recommendation;
  const ps     = recommendation ? PRIORITY_STYLES[recommendation.priority] : null;
  const cs     = recommendation ? CATEGORY_STYLES[recommendation.category] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-[480px] max-w-[95vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {recommendation && ps && cs && (
          <>
            {/* Header */}
            <div className="border-b border-[#E5E7EB] bg-[#F9FAFB]" style={{ padding: '16px 20px' }}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cs.bg} ${cs.text}`}>
                    {recommendation.category}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${ps.badge}`}>
                    {recommendation.priority} priority
                  </span>
                  <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] text-[#6B7280]">
                    {recommendation.module}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 rounded-[4px] p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h2 className="text-[14px] font-bold leading-snug text-[#111827]">
                {recommendation.title}
              </h2>
              <p className="mt-1 text-[12px] text-[#6B7280]">{recommendation.summary}</p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '20px' }}>

              {/* Issue detail */}
              <div className="mb-5">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280]">
                  About this issue
                </div>
                <p className="text-[12.5px] leading-relaxed text-[#374151]">
                  {recommendation.detail}
                </p>
              </div>

              {/* ── Recommended Actions (pre-defined, always visible) ──────── */}
              <div className="mb-5">
                <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280]">
                  Recommended Actions
                </div>
                <ol className="space-y-1.5">
                  {recommendation.actions.map((action, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => toggleCheck(i)}
                        className="flex w-full items-start gap-2.5 rounded-[5px] p-1.5 text-left transition-colors hover:bg-[#F9FAFB]"
                      >
                        {checked.has(i) ? (
                          <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#16A34A]" />
                        ) : (
                          <Square className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#D1D5DB]" />
                        )}
                        <span className={`text-[12.5px] leading-snug ${checked.has(i) ? 'text-[#9CA3AF] line-through' : 'text-[#374151]'}`}>
                          <span className="mr-1 font-semibold text-[#6B7280]">{i + 1}.</span>
                          {action}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
                {checked.size > 0 && (
                  <p className="mt-2 text-[10.5px] text-[#9CA3AF]">
                    {checked.size} of {recommendation.actions.length} actions completed
                  </p>
                )}
              </div>

              {/* ── AI Analysis (on-demand) ────────────────────────────────── */}
              <div className="rounded-[8px] border border-[#E9D5FF] bg-[#FAF5FF]" style={{ padding: '14px 16px' }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#7C3AED]" />
                    <span className="text-[11px] font-bold uppercase tracking-[.05em] text-[#7C3AED]">
                      AI Analysis
                    </span>
                  </div>

                  {!aiRun && (
                    <button
                      type="button"
                      onClick={handleGetAnalysis}
                      className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#7C3AED] font-semibold text-white hover:bg-[#6D28D9] transition-all"
                      style={{ padding: '3px 10px', fontSize: 11 }}
                    >
                      <Sparkles className="h-3 w-3" />
                      Get AI Analysis
                    </button>
                  )}
                </div>

                {!aiRun && (
                  <p className="mt-2 text-[11.5px] text-[#9CA3AF]">
                    Get a deeper Claude-powered analysis of this issue and its implications for your governance posture.
                  </p>
                )}

                {aiLoading && (
                  <div className="mt-3 space-y-2">
                    {[80, 95, 65].map((w, i) => (
                      <div
                        key={i}
                        className="h-3 animate-pulse rounded bg-[#E9D5FF]"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                )}

                {aiError && (
                  <p className="mt-2 text-[12px] text-red-600">{aiError}</p>
                )}

                {!aiLoading && analysis && (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#374151]">{analysis}</p>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </>
  );
}
