export function MapSkeleton() {
  return (
    <div
      data-testid="map-skeleton"
      className="relative flex h-full w-full items-center justify-center bg-slate-900"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-sm font-medium text-slate-400">
          Loading Map Canvas...
        </p>
      </div>
    </div>
  );
}
