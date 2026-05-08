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
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
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
