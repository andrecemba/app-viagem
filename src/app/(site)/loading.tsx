import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="page-container py-10" aria-busy="true" aria-label="Carregando rações">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-6 h-14 w-full max-w-3xl" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    </div>
  );
}
