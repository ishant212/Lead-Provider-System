"use client";

import useSWR from 'swr';
import { Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const SERVICE_COLORS: Record<string, string> = {
  "Service 1": "bg-violet-50 text-violet-600 border-violet-100",
  "Service 2": "bg-sky-50 text-sky-600 border-sky-100",
  "Service 3": "bg-amber-50 text-amber-600 border-amber-100",
};

export default function Dashboard() {
  const { data: providers, error } = useSWR('/api/providers', fetcher, { refreshInterval: 2000 });

  if (error) return (
    <div className="text-sm text-red-500 text-center mt-16">Failed to load dashboard.</div>
  );
  if (!providers) return (
    <div className="flex justify-center mt-24">
      <Loader2 className="animate-spin text-gray-300" size={32} />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Provider Dashboard
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Live lead assignments across all providers</p>
        </div>
        <span className="flex items-center gap-2 text-xs font-medium text-green-600 bg-white border border-green-100 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Live Updates Active
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {providers.map((provider: any) => {
          const atQuota = provider.quotaRemaining <= 0;
          const pct = Math.max(0, (provider.quotaRemaining / 10) * 100);

          return (
            <div key={provider.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">

              {/* Card header */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-gray-900">{provider.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${atQuota ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600'}`}>
                    {provider.quotaRemaining}/10
                  </span>
                </div>

                {/* Quota bar */}
                <div className="mt-2.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${atQuota ? 'bg-red-400' : 'bg-gray-900'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  {provider._count.assignedLeads} lead{provider._count.assignedLeads !== 1 ? 's' : ''} received
                </div>
              </div>

              {/* Lead list */}
              <div className="flex-1 overflow-y-auto max-h-[280px] divide-y divide-gray-50">
                {provider.assignedLeads.length === 0 ? (
                  <p className="text-xs text-gray-300 italic px-4 py-5">No leads assigned yet.</p>
                ) : (
                  provider.assignedLeads.map((assignment: any) => {
                    const svcName = assignment.lead.service.name;
                    const colorClass = SERVICE_COLORS[svcName] ?? "bg-gray-50 text-gray-500 border-gray-100";
                    return (
                      <div key={assignment.id} className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-800 leading-tight">{assignment.lead.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{assignment.lead.phone} · {assignment.lead.city}</div>
                        <span className={`mt-1.5 inline-block text-[10px] font-semibold tracking-wide uppercase border px-1.5 py-0.5 rounded ${colorClass}`}>
                          {svcName}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
