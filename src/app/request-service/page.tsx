"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function RequestService() {
  const { data: services } = useSWR('/api/services', fetcher);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    serviceId: '',
    description: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit lead');

      setStatus('success');
      setFormData({ name: '', phone: '', city: '', serviceId: '', description: '' });
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  };

  const inputClass = "w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors placeholder-gray-300";
  const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Service Enquiry
        </h2>
        <p className="text-sm text-gray-400 mt-1">Fill in the details and we'll match you with the right providers.</p>
      </div>

      {status === 'success' && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg">
          ✓ Enquiry submitted. Providers have been notified.
        </div>
      )}
      {status === 'error' && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
          {errorMessage}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name</label>
              <input
                required
                type="text"
                placeholder="Full name"
                className={inputClass}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                required
                type="tel"
                placeholder="10-digit number"
                className={inputClass}
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input
                required
                type="text"
                placeholder="Your city"
                className={inputClass}
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Service Type</label>
              <select
                required
                className={inputClass}
                value={formData.serviceId}
                onChange={e => setFormData({ ...formData, serviceId: e.target.value })}
              >
                <option value="" disabled>Select a service</option>
                {services?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              placeholder="Briefly describe what you need..."
              className={`${inputClass} h-24 resize-none`}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-60 flex justify-center items-center gap-2 transition-colors"
          >
            {status === 'submitting' && <Loader2 className="animate-spin" size={16} />}
            {status === 'submitting' ? 'Submitting...' : 'Submit Enquiry'}
          </button>
        </form>
      </div>
    </div>
  );
}
