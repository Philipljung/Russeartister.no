export default function SamplesLoading() {
  return (
    <>
      {/* Filter bar skeleton */}
      <div
        className="sticky top-14 z-40 border-b"
        style={{ background: "rgba(8,8,8,0.92)", borderColor: "#1e1e1e" }}
      >
        <div className="mx-auto max-w-7xl space-y-3 px-4 md:px-6 py-4">
          <div className="skeleton" style={{ width: "100%", height: 38, borderRadius: 12 }} />
          <div className="flex items-center gap-1">
            <div className="skeleton" style={{ width: 70, height: 34 }} />
            <div className="skeleton" style={{ width: 80, height: 34 }} />
            <div className="skeleton" style={{ width: 70, height: 34 }} />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <div className="skeleton" style={{ width: 80, height: 24 }} />
          <div className="skeleton" style={{ width: 60, height: 16 }} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "#141414", border: "1px solid #1e1e1e" }}>
              <div className="skeleton" style={{ aspectRatio: "1/1", width: "100%", borderRadius: 0 }} />
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="skeleton" style={{ width: "70%", height: 14 }} />
                <div className="skeleton" style={{ width: "40%", height: 10 }} />
                <div className="flex items-center justify-between mt-1">
                  <div className="skeleton" style={{ width: 60, height: 18 }} />
                  <div className="skeleton" style={{ width: 50, height: 16 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
