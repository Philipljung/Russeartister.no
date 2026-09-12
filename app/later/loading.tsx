export default function LaterLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <div className="relative w-full h-[220px] md:h-[300px]" style={{ background: "#0f0a2a" }}>
        <div className="flex h-full flex-col justify-center px-8 md:px-20 gap-3">
          <div className="skeleton" style={{ width: 80, height: 22 }} />
          <div className="skeleton" style={{ width: 340, maxWidth: "80%", height: 28 }} />
          <div className="skeleton hidden sm:block" style={{ width: 260, maxWidth: "60%", height: 16 }} />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="skeleton" style={{ width: 200, height: 40 }} />
          <div className="skeleton" style={{ width: 100, height: 40 }} />
          <div className="skeleton" style={{ width: 100, height: 40 }} />
        </div>
      </div>

      {/* List skeleton */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <div className="skeleton" style={{ width: 60, height: 24 }} />
          <div className="skeleton" style={{ width: 50, height: 16 }} />
        </div>

        {/* Column header skeleton */}
        <div className="mb-2 flex items-center gap-4 px-4">
          <div style={{ width: 36 }} />
          <div style={{ width: 40 }} />
          <div className="skeleton flex-1" style={{ height: 12, maxWidth: 50 }} />
        </div>

        {/* Beat row skeletons */}
        <div className="flex flex-col gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl px-4 py-3"
              style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}
            >
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }} />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="skeleton" style={{ width: `${50 + (i * 7) % 30}%`, height: 14 }} />
                <div className="skeleton" style={{ width: `${30 + (i * 11) % 20}%`, height: 10 }} />
              </div>
              <div className="skeleton hidden sm:block" style={{ width: 60, height: 14 }} />
              <div className="skeleton" style={{ width: 50, height: 14 }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
