import { saveProductAction } from "@/app/admin/actions";
import { productTopics } from "@/lib/catalog/topics";
import {
  DOG_SIZE_VALUES,
  FOOD_TYPE_LABEL,
  FOOD_TYPE_VALUES,
  LIFE_STAGE_LABEL,
  LIFE_STAGE_VALUES,
  NEED_LABEL,
  NEEDS,
  SIZE_LABEL,
  sizesCovered,
} from "@/lib/catalog/vocab";
import type { AdminProduct } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

import { btn, input } from "./ui";

export type ProductDraft = Omit<AdminProduct, "id" | "slug" | "status" | "offers" | "createdAt" | "updatedAt" | "updatedBy">;

export const EMPTY_DRAFT: ProductDraft = {
  brand: null,
  line: null,
  formula: null,
  flavor: null,
  species: null,
  lifeStage: null,
  size: null,
  foodType: null,
  vetNote: null,
  weightGrams: null,
  unitCount: null,
  needs: [],
  kibbleSize: null,
  description: null,
  gtin: null,
  sku: null,
  imageUrl: null,
  sources: [],
  note: "",
  verified: false,
};

/** Mesmos tópicos da página pública, a partir da ficha do admin. */
export function draftTopics(p: ProductDraft) {
  return productTopics({
    species: p.species,
    lifeStages: p.lifeStage ? [p.lifeStage] : [],
    sizes: p.species === "caes" && p.size ? sizesCovered(p.size) : null,
    foodType: p.foodType,
    flavor: p.flavor,
    weightGrams: p.weightGrams,
    unitCount: p.unitCount,
    needs: p.needs,
    kibbleSize: p.kibbleSize,
    vetNote: p.vetNote,
    gtin: p.gtin,
  });
}

function Pending({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="ml-1.5 rounded bg-amber-50 px-1 py-px text-[0.625rem] font-semibold text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-800">Pendente de verificação</span>;
}

function Field({ label, htmlFor, required, pending, hint, children, className }: { label: string; htmlFor?: string; required?: boolean; pending?: boolean; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium">
        {label}
        {required && <span className="text-muted-foreground"> *</span>}
        <Pending show={Boolean(pending)} />
      </label>
      {children}
      {hint && <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Topic({ n, title, description, children }: { n: number; title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="-ml-1 px-1 font-display text-sm font-semibold">
        <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-[0.6875rem] text-background">{n}</span>
        {title}
      </legend>
      {description && <p className="-mt-1 mb-3 text-xs text-muted-foreground">{description}</p>}
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * Cadastro por tópicos. A ordem é a mesma da página do produto no site.
 * Campo vazio fica "Pendente de verificação": nunca preencher por semelhança.
 */
export function ProductForm({ id, draft }: { id: string | null; draft: ProductDraft }) {
  const weightInKg = draft.weightGrams == null || draft.weightGrams >= 1000;
  const weightValue = draft.weightGrams == null ? "" : weightInKg ? String(draft.weightGrams / 1000).replace(".", ",") : String(draft.weightGrams);
  const isNew = !id;
  const empty = (v: unknown) => !isNew && (v == null || v === "");

  return (
    <form action={saveProductAction} className="space-y-4">
      {id && <input type="hidden" name="id" value={id} />}

      <Topic n={1} title="Identificação" description="Como está escrito na embalagem.">
        <Field label="Marca" htmlFor="marca" required pending={empty(draft.brand)}>
          <input id="marca" name="marca" defaultValue={draft.brand ?? ""} placeholder="Ex.: Golden" className={input} />
        </Field>
        <Field label="Linha" htmlFor="linha" pending={empty(draft.line)}>
          <input id="linha" name="linha" defaultValue={draft.line ?? ""} placeholder="Ex.: Golden Fórmula" className={input} />
        </Field>
        <Field label="Fórmula (nome do produto)" htmlFor="formula" required pending={empty(draft.formula)}>
          <input id="formula" name="formula" defaultValue={draft.formula ?? ""} placeholder="Ex.: Cães Adultos" className={input} />
        </Field>
        <Field label="Sabor" htmlFor="sabor" pending={empty(draft.flavor)} hint="Vazio se a embalagem não informa o sabor.">
          <input id="sabor" name="sabor" defaultValue={draft.flavor ?? ""} placeholder="Ex.: Frango e Arroz" className={input} />
        </Field>
      </Topic>

      <Topic n={2} title="Para quem">
        <Field label="Espécie" required pending={empty(draft.species)}>
          <div className="flex gap-2">
            {(
              [
                ["caes", "Cachorro"],
                ["gatos", "Gato"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-[:checked]:border-foreground has-[:checked]:bg-foreground/[0.04] has-[:checked]:font-medium">
                <input type="radio" name="especie" value={v} defaultChecked={draft.species === v} className="accent-foreground" /> {l}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Idade" htmlFor="idade" required pending={empty(draft.lifeStage)}>
          <select id="idade" name="idade" defaultValue={draft.lifeStage ?? ""} className={input}>
            <option value="">— Pendente —</option>
            {LIFE_STAGE_VALUES.map((v) => (
              <option key={v} value={v}>
                {LIFE_STAGE_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Porte (só cachorros)" htmlFor="porte" pending={draft.species !== "gatos" && empty(draft.size)}>
          <select id="porte" name="porte" defaultValue={draft.size ?? ""} className={input}>
            <option value="">— Pendente / não se aplica —</option>
            {DOG_SIZE_VALUES.map((v) => (
              <option key={v} value={v}>
                {SIZE_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
      </Topic>

      <Topic n={3} title="Tipo de alimento">
        <Field label="Tipo" required pending={empty(draft.foodType)} className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {FOOD_TYPE_VALUES.map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-[:checked]:border-foreground has-[:checked]:bg-foreground/[0.04] has-[:checked]:font-medium">
                <input type="radio" name="tipo" value={v} defaultChecked={draft.foodType === v} className="accent-foreground" /> {FOOD_TYPE_LABEL[v].replace(/ \(.*\)$/, "")}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Indicação veterinária" htmlFor="indicacaoVet" hint="Só para alimentos medicamentosos. Ex.: Sensibilidades gastrointestinais." className="sm:col-span-2">
          <input id="indicacaoVet" name="indicacaoVet" defaultValue={draft.vetNote ?? ""} className={input} />
        </Field>
      </Topic>

      <Topic n={4} title="Embalagem">
        <Field label="Peso líquido" htmlFor="peso" required pending={empty(draft.weightGrams)}>
          <div className="flex gap-2">
            <input id="peso" name="peso" inputMode="decimal" defaultValue={weightValue} placeholder="Ex.: 10,1" className={input} />
            <select name="pesoUnidade" defaultValue={weightInKg ? "kg" : "g"} aria-label="Unidade do peso" className={input + " w-20"}>
              <option value="kg">kg</option>
              <option value="g">g</option>
            </select>
          </div>
        </Field>
        <Field label="Unidades na embalagem" htmlFor="unidades" hint="Só para caixas de sachês ou latas.">
          <input id="unidades" name="unidades" inputMode="numeric" defaultValue={draft.unitCount ?? ""} className={input} />
        </Field>
      </Topic>

      <Topic n={5} title="Indicações e características">
        <Field label="Indicações" className="sm:col-span-2">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {NEEDS.map((n) => (
              <label key={n} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="necessidades" value={n} defaultChecked={draft.needs.includes(n)} className="size-4 accent-foreground" /> {NEED_LABEL[n]}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Tamanho do grão" htmlFor="grao" pending={empty(draft.kibbleSize)}>
          <input id="grao" name="grao" defaultValue={draft.kibbleSize ?? ""} placeholder="Ex.: pequeno, 8 mm" className={input} />
        </Field>
      </Topic>

      <Topic n={6} title="Descrição">
        <Field label="Texto para o cliente" htmlFor="descricao" pending={empty(draft.description)} className="sm:col-span-2" hint="Copie do fabricante ou escreva a partir da embalagem. Não invente benefícios.">
          <textarea id="descricao" name="descricao" rows={5} defaultValue={draft.description ?? ""} className={input + " h-auto py-1.5"} />
        </Field>
      </Topic>

      <Topic n={7} title="Códigos e foto">
        <Field label="Código de barras (GTIN/EAN)" htmlFor="gtin" pending={empty(draft.gtin)}>
          <input id="gtin" name="gtin" inputMode="numeric" defaultValue={draft.gtin ?? ""} className={input} />
        </Field>
        <Field label="Código do fabricante (SKU)" htmlFor="sku">
          <input id="sku" name="sku" defaultValue={draft.sku ?? ""} className={input} />
        </Field>
        <Field label="Foto da embalagem (endereço https)" htmlFor="foto" pending={empty(draft.imageUrl)} className="sm:col-span-2" hint="Use só foto oficial ou sua, com direito de uso.">
          <input id="foto" name="foto" type="url" defaultValue={draft.imageUrl ?? ""} placeholder="https://" className={input} />
        </Field>
      </Topic>

      <Topic n={8} title="Fontes e conferência" description="De onde vieram os dados. Uma fonte por linha: endereço e, depois, o que ela comprova.">
        <Field label="Fontes" htmlFor="fontes" className="sm:col-span-2">
          <textarea
            id="fontes"
            name="fontes"
            rows={3}
            defaultValue={draft.sources.map((s) => `${s.url} ${s.note}`.trim()).join("\n")}
            className={input + " h-auto py-1.5 font-mono text-xs"}
          />
        </Field>
        <Field label="Observações" htmlFor="nota" className="sm:col-span-2">
          <textarea id="nota" name="nota" rows={3} defaultValue={draft.note} className={input + " h-auto py-1.5"} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="conferido" defaultChecked={draft.verified} className="size-4 accent-foreground" /> Conferi os dados na embalagem ou no site do fabricante
        </label>
      </Topic>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <button type="submit" className={btn.primary + " h-9 px-4"}>
          {isNew ? "Cadastrar como rascunho" : "Salvar ficha"}
        </button>
        <p className="text-xs text-muted-foreground">* obrigatório para publicar. O resto pode ficar pendente.</p>
      </div>
    </form>
  );
}

/** Prévia: como os tópicos aparecem para o cliente. */
export function TopicsPreview({ draft }: { draft: ProductDraft }) {
  const topics = draftTopics(draft);
  const title = [draft.brand, draft.line && draft.line !== draft.brand ? draft.line : null, draft.formula].filter(Boolean).join(" ");
  return (
    <div className="rounded-lg border">
      <p className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">Como aparece no site</p>
      <div className="p-3">
        <p className="font-display text-sm font-semibold">{title || "Sem nome"}</p>
        <dl className="mt-2 divide-y text-[0.8125rem]">
          {topics.map((t) => (
            <div key={t.key} className="grid grid-cols-[6.5rem_1fr] gap-2 py-1.5">
              <dt className="text-muted-foreground">{t.label}</dt>
              <dd className={cn(!t.value && "text-amber-800 dark:text-amber-300")}>{t.value ?? "Pendente de verificação"}</dd>
            </div>
          ))}
        </dl>
        {draft.description && <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{draft.description}</p>}
      </div>
    </div>
  );
}
