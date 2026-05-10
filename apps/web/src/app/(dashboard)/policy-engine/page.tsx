'use client';
import { useState } from 'react';
import { ShieldCheck, AlertTriangle, ToggleRight, FileSearch } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import PolicyList from '@/components/policy/PolicyList';
import PolicyBuilder from '@/components/policy/PolicyBuilder';

type EditablePolicy = {
  id: string;
  name: string;
  description: string;
  severity: string;
  enabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rule_config?: Record<string, any>;
};

export default function PolicyEnginePage() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<EditablePolicy | null>(null);

  function handleEdit(policy: EditablePolicy) {
    setShowBuilder(false);
    setEditingPolicy(policy);
  }

  function handleDone() {
    setShowBuilder(false);
    setEditingPolicy(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Policy Engine"
        description="Create and enforce rules governing AI behavior"
        actions={
          <button
            onClick={() => { setEditingPolicy(null); setShowBuilder((v) => !v); }}
            className={`inline-flex items-center rounded-[5px] font-semibold transition-all whitespace-nowrap ${showBuilder && !editingPolicy ? 'border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F9FAFB]' : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'}`}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            {showBuilder && !editingPolicy ? 'Cancel' : '+ New Policy'}
          </button>
        }
      />

      {/* ── Page description ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]" style={{ padding: '16px 20px' }}>
        <div className="mb-2 text-[12px] font-bold text-[#111827]">About the Policy Engine</div>
        <p className="text-[12px] leading-relaxed text-[#4B5563]">
          The Policy Engine is the real-time governance gate that evaluates every AI request passing through the NICE CXone Mpower trust layer.
          Each policy defines a rule — such as blocking personally identifiable information, flagging low-confidence responses, or preventing biased outputs —
          that is applied automatically before the AI model responds. Violations are tracked, alerted on, and recorded in the immutable audit log.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              icon: <ShieldCheck className="h-4 w-4 text-[#2563EB]" />,
              bg: '#EFF6FF',
              title: 'Real-time enforcement',
              body: 'Every AI request is checked against all active policies before a response is returned.',
            },
            {
              icon: <AlertTriangle className="h-4 w-4 text-[#D97706]" />,
              bg: '#FFFBEB',
              title: 'Severity levels',
              body: 'Critical and High violations block the request outright. Medium and Low flag it for review.',
            },
            {
              icon: <ToggleRight className="h-4 w-4 text-[#059669]" />,
              bg: '#ECFDF5',
              title: 'Enable / disable',
              body: 'Policies can be toggled on or off without deletion — useful for testing or seasonal rules.',
            },
            {
              icon: <FileSearch className="h-4 w-4 text-[#7C3AED]" />,
              bg: '#F5F3FF',
              title: 'Violation tracking',
              body: 'The 7-day violation count shows which policies are triggering most frequently.',
            },
          ].map(({ icon, bg, title, body }) => (
            <div key={title} className="flex items-start gap-2.5 rounded-[6px] border border-[#F3F4F6]" style={{ background: bg, padding: '10px 12px' }}>
              <div className="mt-0.5 flex-shrink-0">{icon}</div>
              <div>
                <div className="text-[11px] font-bold text-[#111827] mb-0.5">{title}</div>
                <div className="text-[10.5px] text-[#6B7280] leading-snug">{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Builder / Editor ─────────────────────────────────────────────── */}
      {(showBuilder || editingPolicy) && (
        <PolicyBuilder
          onDone={handleDone}
          policy={editingPolicy ?? undefined}
        />
      )}

      <PolicyList onEdit={handleEdit} />
    </div>
  );
}
