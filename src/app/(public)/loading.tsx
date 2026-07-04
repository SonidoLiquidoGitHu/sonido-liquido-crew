export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero skeleton */}
      <div className="animate-pulse">
        <div className="h-[70vh] bg-slc-card" />
      </div>
      {/* Content skeleton */}
      <div className="section-container py-20 space-y-8">
        <div className="h-8 w-48 bg-slc-card rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={`loading-skeleton-${i}`} className="aspect-square bg-slc-card rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
