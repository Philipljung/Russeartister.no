export default function AppSkeleton() {
  return (
    <div className="flex items-center justify-center" style={{ background: "#080808", minHeight: "100vh" }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="animate-spin rounded-full"
          style={{
            width: 32,
            height: 32,
            border: "3px solid #1e1e1e",
            borderTop: "3px solid #f5f5f7",
          }}
        />
        <p className="text-sm" style={{ color: "#86868b" }}>Laster inn...</p>
      </div>
    </div>
  );
}
