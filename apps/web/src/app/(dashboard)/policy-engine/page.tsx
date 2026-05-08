'use client';
import PageHeader from '@/components/shared/PageHeader';
import PolicyList from '@/components/policy/PolicyList';
import PolicyBuilder from '@/components/policy/PolicyBuilder';
import { useState } from 'react';

export default function PolicyEnginePage() {
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy Engine"
        description="Create and enforce rules governing AI behavior"
        actions={
          <button
            onClick={() => setShowBuilder((v) => !v)}
            className={`inline-flex items-center rounded-[5px] font-semibold transition-all whitespace-nowrap ${showBuilder ? 'border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F9FAFB]' : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'}`}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            {showBuilder ? 'Cancel' : '+ New Policy'}
          </button>
        }
      />
      {showBuilder && <PolicyBuilder onCreated={() => setShowBuilder(false)} />}
      <PolicyList />
    </div>
  );
}
