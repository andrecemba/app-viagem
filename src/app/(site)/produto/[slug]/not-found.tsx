import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Ração não encontrada</h1>
      <p className="mt-2 text-muted-foreground">Ela pode ter saído do catálogo ou mudado de endereço.</p>
      <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
        Buscar outra ração
      </Link>
    </div>
  );
}
