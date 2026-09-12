export default function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: "1px solid #1a1a1a" }}>
      <div className="skeleton shrink-0" style={{ width: 36, height: 36, borderRadius: "50%" }} />
      <div className="skeleton shrink-0" style={{ width: 40, height: 40, borderRadius: 8 }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="skeleton" style={{ width: "45%", height: 12 }} />
        <div className="skeleton" style={{ width: "28%", height: 10 }} />
      </div>
      <div className="hidden lg:flex gap-1.5">
        <div className="skeleton" style={{ width: 52, height: 22, borderRadius: 99 }} />
        <div className="skeleton" style={{ width: 52, height: 22, borderRadius: 99 }} />
      </div>
      <div className="skeleton" style={{ width: 56, height: 12, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: 60, height: 30, borderRadius: 8 }} />
    </div>
  );
}

export function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}

export function SkeletonGridCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton rounded-2xl" style={{ height: 280 }} />
      ))}
    </div>
  );
}

export function SkeletonNarrowRows({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e1e1e" }}>
          <div className="skeleton shrink-0" style={{ width: 40, height: 40, borderRadius: 10 }} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="skeleton" style={{ width: "55%", height: 13 }} />
            <div className="skeleton" style={{ width: "35%", height: 10 }} />
          </div>
          <div className="skeleton" style={{ width: 70, height: 28, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetailHero() {
  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-10">
      <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-10">
        <div className="skeleton shrink-0 rounded-2xl" style={{ width: 220, height: 220 }} />
        <div className="flex-1 flex flex-col gap-4 pt-2">
          <div className="skeleton" style={{ width: "60%", height: 20 }} />
          <div className="skeleton" style={{ width: "40%", height: 14 }} />
          <div className="flex gap-2 mt-2">
            <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 99 }} />
            <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 99 }} />
            <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 99 }} />
          </div>
          <div className="mt-auto flex gap-3">
            <div className="skeleton" style={{ width: 120, height: 40, borderRadius: 12 }} />
            <div className="skeleton" style={{ width: 100, height: 40, borderRadius: 12 }} />
          </div>
        </div>
      </div>
      <SkeletonRows count={5} />
    </div>
  );
}

export function SkeletonProfilePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-10">
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
        <div className="skeleton shrink-0" style={{ width: 88, height: 88, borderRadius: "50%" }} />
        <div className="flex flex-col gap-3 pt-1">
          <div className="skeleton" style={{ width: 160, height: 20 }} />
          <div className="skeleton" style={{ width: 110, height: 13 }} />
          <div className="flex gap-2 mt-1">
            <div className="skeleton" style={{ width: 72, height: 28, borderRadius: 10 }} />
            <div className="skeleton" style={{ width: 72, height: 28, borderRadius: 10 }} />
          </div>
        </div>
      </div>
      <div className="flex gap-4 mb-6 border-b" style={{ borderColor: "#1e1e1e" }}>
        {[120, 90, 90].map((w, i) => (
          <div key={i} className="skeleton mb-[-1px]" style={{ width: w, height: 36, borderRadius: "6px 6px 0 0" }} />
        ))}
      </div>
      <SkeletonRows count={6} />
    </div>
  );
}
