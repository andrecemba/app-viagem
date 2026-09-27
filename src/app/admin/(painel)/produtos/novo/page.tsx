import type { Metadata } from "next";
import Link from "next/link";

import { btn, Flash, input, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { FOOD_TYPE_LABEL, LIFE_STAGE_LABEL, SIZE_LABEL, SPECIES_LABEL } from "@/lib/admin/labels";

import { createProductAction } from "../../../actions";

export const metadata: Metadata = { title: "Cadastrar ração" };

function Field({ label, name, hint, children, wide }: { label: string; name?: string; hint?: string; children?: React.ReactNode; wide?: boolean }) {
  return (
    <label className={"block space-y-1 text-sm" + (wide ? " sm:col-span-2" : "")}>
      <span className="font-medium">{label}</span>
      {children ?? <input name={name} className={input + " h-9"} />}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Select({ name, options, required }: { name: string; options: Record<string, string>; required?: boolean }) {
  return (
    <select name={name} required={required} defaultValue="" className={input + " h-9"}>
      <option value="">— Não informado —</option>
      {Object.entries(options).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export default async function NewProductPage({ searchParams }: PageProps<"/admin/produtos/novo">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <div className="max-w-3xl space-y-6">
      <nav className="text-sm text-muted-foreground">
        <Link href="/admin/produtos" className="hover:text-foreground hover:underline">
          Produtos
        </Link>{" "}
        / Nova ficha
      </nav>
      <PageHeader
        title="Cadastrar ração"
        description="Uma ficha = uma embalagem exata. Deixe vazio o que não conseguir confirmar: o campo fica “pendente de verificação”. A ficha nasce como rascunho."
      />
      <Flash erro={one(sp.erro)} />
      <form action={createProductAction} className="space-y-8">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Identidade da embalagem</legend>
          <Field label="Marca *" name="brand" />
          <Field label="Linha" name="line" hint="Ex.: Golden Fórmula, Pro Plan" />
          <Field label="Fórmula *" name="formula" hint="Como no nome oficial, ex.: Cães Adultos Raças Médias" wide />
          <Field label="Sabor" name="flavor" hint="Deixe vazio se o nome oficial não informa" />
          <Field label="Peso líquido (gramas)" hint="Ex.: 15000 para 15 kg">
            <input name="weightGrams" inputMode="numeric" pattern="[0-9]*" className={input + " h-9"} />
          </Field>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Para quem</legend>
          <Field label="Espécie *">
            <Select name="species" options={SPECIES_LABEL} required />
          </Field>
          <Field label="Fase da vida">
            <Select name="lifeStage" options={LIFE_STAGE_LABEL} />
          </Field>
          <Field label="Porte" hint="Para gatos, deixe vazio">
            <Select name="size" options={SIZE_LABEL} />
          </Field>
          <Field label="Tipo de ração">
            <Select name="foodType" options={FOOD_TYPE_LABEL} />
          </Field>
          <Field label="Indicação veterinária" name="vetIndication" hint="Só para dietas medicamentosas" wide />
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Códigos e detalhes (opcionais)</legend>
          <Field label="GTIN/EAN" name="gtin" hint="Da embalagem; não copie de outro tamanho" />
          <Field label="SKU do fabricante" name="manufacturerSku" />
          <Field label="Tamanho do grão" name="kibbleSize" />
          <Field label="Imagem da embalagem (URL https)" name="imageUrl" hint="Somente foto oficial ou autorizada" />
          <Field label="Descrição" wide>
            <textarea name="description" rows={3} className={input + " h-auto py-1.5"} />
          </Field>
          <Field label="Fonte que comprova nome, fórmula e peso" name="fonte" hint="URL da página do fabricante ou da loja" wide />
        </fieldset>
        <div className="flex gap-2">
          <button type="submit" className={btn.primary + " h-9"}>
            Criar ficha (rascunho)
          </button>
          <Link href="/admin/produtos" className={btn.ghost + " h-9"}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
