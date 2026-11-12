export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded bg-[#e3e6ed]" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-white ring-1 ring-[#e3e6ed]" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-white ring-1 ring-[#e3e6ed]" />
    </div>
  );
}
