'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MarketingPlan } from '@/lib/types';

const statusColors: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  rejected: 'bg-neutral-700/30 text-neutral-400 border-neutral-700',
  'in-progress': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
};

export default function MarketingPlansPage() {
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/social/plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/dashboard/creative-strategy"
            className="text-sm text-[#B5A36B] hover:text-[#C9BA88] mb-2 inline-block"
          >
            ← Back to Bryce Studio
          </Link>
          <h1 className="text-3xl font-bold text-white">Marketing Plans</h1>
          <p className="text-neutral-400 mt-1">
            Review Bryce&apos;s drafts. Approve to ship to Predis for content generation.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading plans…</p>
      ) : plans.length === 0 ? (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-12 text-center">
          <p className="text-neutral-400 mb-2">No plans yet.</p>
          <p className="text-neutral-500 text-sm">
            Run Sloane from her dashboard page to generate the first weekly plan.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/dashboard/social-media/plans/${plan.id}`}
              className="block bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-[#B5A36B]/50 hover:bg-neutral-900 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-white">
                      Week of {plan.weekOf}
                    </h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        statusColors[plan.status] ||
                        'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 mb-3">
                    Created {new Date(plan.createdAt).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {plan.themes.map((theme) => (
                      <span
                        key={theme}
                        className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-white">
                    {plan.items.length}
                  </div>
                  <div className="text-xs text-neutral-500">posts</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
