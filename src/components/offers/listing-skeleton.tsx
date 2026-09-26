import { Skeleton } from "@/components/ui/skeleton";

export function ListingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Carregando ofertas">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-2xl border bg-card p-4">
          <Skeleton className="size-24 shrink-0 sm:size-28" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-7 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
