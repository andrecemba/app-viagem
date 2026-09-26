import Link from "next/link";
import { PawPrint } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="mb-6 flex size-20 rotate-12 items-center justify-center rounded-3xl bg-accent text-accent-foreground">
        <PawPrint className="size-10" aria-hidden />
      </span>
      <p className="font-display text-sm font-extrabold text-primary">Erro 404</p>
      <h1 className="mt-1 text-3xl font-black">Esse petisco sumiu do pote</h1>
      <p className="mt-3 text-muted-foreground">A página que você procurou não existe ou mudou de endereço.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild><Link href="/">Voltar ao início</Link></Button>
        <Button asChild variant="outline"><Link href="/marcas">Ver marcas</Link></Button>
      </div>
    </div>
  );
}
