"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TestTools() {
  const { data: providers } = useSWR('/api/providers', fetcher);
  const { data: services } = useSWR('/api/services', fetcher);

  const [logs, setLogs] = useState<{ time: string; text: string; type: 'info' | 'success' | 'error' }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addLog = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [{ time, text, type }, ...prev].slice(0, 50));
  };

  const handleWebhookTest = async (providerId: number, times: number) => {
    setIsProcessing(true);
    addLog(`Testing webhook ${times}× for Provider ID: ${providerId}`, 'info');
    const idempotencyKey = `test_payment_${Date.now()}`;

    try {
      const promises = Array.from({ length: times }).map((_, i) =>
        fetch('/api/webhooks/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId, idempotencyKey })
        }).then(async r => ({ status: r.status, data: await r.json(), attempt: i + 1 }))
      );
      const results = await Promise.all(promises);
      results.forEach(res => {
        const isSuccess = res.data.message?.toLowerCase().includes('success');
        addLog(`Attempt ${res.attempt}: ${res.status} — ${res.data.message}`, isSuccess ? 'success' : 'info');
      });
    } catch (err: any) {
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConcurrencyTest = async () => {
    if (!services?.length) { addLog('Services not loaded yet.', 'error'); return; }
    setIsProcessing(true);
    addLog('Firing 10 simultaneous lead creation requests...', 'info');
    const serviceIds = services.map((s: any) => s.id);

    try {
      const promises = Array.from({ length: 10 }).map((_, i) => {
        const randomServiceId = serviceIds[Math.floor(Math.random() * serviceIds.length)];
        return fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Concurrent User ${Date.now()}_${i}`,
            phone: `555000${Math.floor(1000 + Math.random() * 9000)}`,
            city: 'Test City',
            serviceId: randomServiceId,
            description: 'Concurrency test batch'
          })
        }).then(r => r.json());
      });

      const results = await Promise.all(promises);
      const success = results.filter(r => !r.error).length;
      const errors = results.length - success;
      addLog(`Done — ${success} succeeded, ${errors} failed/duplicate`, success > 0 ? 'success' : 'error');
    } catch (err: any) {
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const logColor = { info: 'text-gray-400', success: 'text-emerald-400', error: 'text-red-400' };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Test Tools
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">Simulate webhooks and concurrency scenarios</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: controls */}
        <div className="space-y-5">

          {/* Webhook simulator */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Webhook Simulator</h3>
              <p className="text-xs text-gray-400 mt-0.5">Simulate a payment gateway confirming a subscription to reset quota.</p>
            </div>

            <div className="space-y-2">
              {providers?.map((provider: any) => (
                <div key={provider.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{provider.name}</span>
                    <span className="text-xs text-gray-400 ml-2">quota: {provider.quotaRemaining}/10</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={isProcessing}
                      onClick={() => handleWebhookTest(provider.id, 1)}
                      className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => handleWebhookTest(provider.id, 3)}
                      className="px-3 py-1 text-xs font-medium bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 disabled:opacity-50 transition-colors"
                    >
                      Test 3×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Concurrency tester */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Concurrency Tester</h3>
              <p className="text-xs text-gray-400 mt-0.5">Fires 10 simultaneous POST requests to stress-test transaction locks and quota enforcement.</p>
            </div>
            <button
              disabled={isProcessing}
              onClick={handleConcurrencyTest}
              className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {isProcessing && <Loader2 className="animate-spin" size={15} />}
              Generate 10 Leads Instantly
            </button>
          </div>
        </div>

        {/* Right: logs */}
        <div className="bg-[#0F1117] rounded-xl p-5 h-[520px] flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            <span className="text-xs text-white/30 font-mono ml-1">system.log</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs">
            {logs.length === 0 && (
              <span className="text-white/20">Waiting for actions...</span>
            )}
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-white/25 shrink-0">{log.time}</span>
                <span className={logColor[log.type]}>{log.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
