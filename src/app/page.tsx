export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[72vh] text-center">
      <span className="inline-block text-xs font-medium tracking-widest uppercase text-gray-400 mb-6 border border-gray-200 bg-white px-4 py-1.5 rounded-full">
        Lead Distribution System
      </span>
      <h1
        className="text-5xl font-normal text-gray-900 mb-5 leading-tight"
        style={{ fontFamily: "'DM Serif Display', serif" }}
      >
        Fair, real-time leads.<br />Every time.
      </h1>
      <p className="text-base text-gray-500 mb-10 max-w-lg leading-relaxed">
        Customers submit a service enquiry and the system instantly distributes it to the right providers — fairly, concurrently, reliably.
      </p>
      <div className="flex items-center gap-3">
        <a
          href="/request-service"
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Submit a Lead
        </a>
        <a
          href="/dashboard"
          className="px-5 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:border-gray-400 transition-colors"
        >
          View Dashboard
        </a>
      </div>

      <div className="mt-20 grid grid-cols-3 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden w-full max-w-2xl">
        {[
          { label: "Fair allocation", sub: "Round-robin across providers" },
          { label: "Concurrent-safe", sub: "Serializable DB transactions" },
          { label: "Real-time", sub: "Live dashboard via SSE" },
        ].map((item) => (
          <div key={item.label} className="bg-white px-6 py-5 text-left">
            <div className="text-sm font-medium text-gray-900">{item.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
