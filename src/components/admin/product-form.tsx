import { saveProductAction } from "@/app/admin/actions";
import {
  DOG_SIZE_VALUES,
  FOOD_TYPE_LABEL,
  FOOD_TYPE_VALUES,
  LIFE_STAGE_LABEL,
  LIFE_STAGE_VALUES,
  NEED_LABEL,
  NEEDS,
  SIZE_LABEL,
} from "@/lib/catalog/vocab";
import type { Product } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { btn, input } from "./ui";

function Field({ label, htmlFor, required, hint, children, className }: { label: string; htmlFor?: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium">
        {label}
        {required && <span className="text-muted-foreground"> *</span>}
      </label>
      {children}
      {hint && <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="-ml-1 px-1 font-display text-sm font-semibold">{title}</legend>
      {description && <p className="-mt-1 mb-3 text-xs text-muted-foreground">{description}</p>}
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

const radio =
  "flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-[:checked]:border-foreground has-[:checked]:bg-foreground/[0.04] has-[:checked]:font-medium";

/**
 * Cadastro da ração exata. Espécie, marca, linha, indicação, sabor, peso e
 * "castrado" formam a identidade: mudar qualquer um deles é outro produto.
 */
export function ProductForm({ product }: { product: Product | null }) {
  const p = product;
  const kg = !p || p.weightGrams >= 1000;
  const weight = p ? (kg ? String(p.weightGrams / 1000).replace(".", ",") : String(p.weightGrams)) : "";
  return (
    <form action={saveProductAction} className="space-y-4">
      {p && <input type="hidden" name="id" value={p.id} />}

      <Group title="Identidade da ração" description="Como está na embalagem. Outro peso, outro sabor ou a versão para castrados = outro produto.">
        <Field label="Espécie" required className="sm:col-span-2">
          <div className="flex gap-2">
            {(
              [
                ["caes", "Cachorro"],
                ["gatos", "Gato"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className={radio}>
                <input type="radio" name="especie" value={v} required defaultChecked={p?.species === v} className="accent-foreground" /> {l}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Marca" htmlFor="marca" required>
          <input id="marca" name="marca" required defaultValue={p?.brand} placeholder="Ex.: Golden" className={input} />
        </Field>
        <Field label="Linha" htmlFor="linha" hint="Ex.: Golden Fórmula, PremieR Fórmula, Size Health Nutrition.">
          <input id="linha" name="linha" defaultValue={p?.line ?? ""} className={input} />
        </Field>
        <Field label="Indicação (nome da fórmula)" htmlFor="indicacao" required hint="Ex.: Cães Adultos Raças Médias, Gatos Filhotes.">
          <input id="indicacao" name="indicacao" required defaultValue={p?.indication} className={input} />
        </Field>
        <Field label="Sabor" htmlFor="sabor" hint="Deixe vazio se a embalagem não informa.">
          <input id="sabor" name="sabor" defaultValue={p?.flavor ?? ""} placeholder="Ex.: Frango e Arroz" className={input} />
        </Field>
        <Field label="Peso da embalagem" htmlFor="peso" required>
          <div className="flex gap-2">
            <input id="peso" name="peso" required inputMode="decimal" defaultValue={weight} placeholder="Ex.: 10,1" className={input} />
            <select name="pesoUnidade" defaultValue={kg ? "kg" : "g"} aria-label="Unidade do peso" className={input + " w-20"}>
              <option value="kg">kg</option>
              <option value="g">g</option>
            </select>
          </div>
        </Field>
        <Field label="Versão para castrados">
          <label className="flex h-8 items-center gap-2 text-sm">
            <input type="checkbox" name="castrado" defaultChecked={p?.neutered} className="size-4 accent-foreground" /> Sim, é a versão para castrados
          </label>
        </Field>
      </Group>

      <Group title="Classificação (filtros do site)">
        <Field label="Idade" htmlFor="idade">
          <select id="idade" name="idade" defaultValue={p?.lifeStage ?? ""} className={input}>
            <option value="">Não informado</option>
            {LIFE_STAGE_VALUES.map((v) => (
              <option key={v} value={v}>
                {LIFE_STAGE_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Porte (só cachorros)" htmlFor="porte">
          <select id="porte" name="porte" defaultValue={p?.size ?? ""} className={input}>
            <option value="">Não informado / não se aplica</option>
            {DOG_SIZE_VALUES.map((v) => (
              <option key={v} value={v}>
                {SIZE_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo" htmlFor="tipo">
          <select id="tipo" name="tipo" defaultValue={p?.foodType ?? "seca"} className={input}>
            {FOOD_TYPE_VALUES.map((v) => (
              <option key={v} value={v}>
                {FOOD_TYPE_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unidades na embalagem" htmlFor="unidades" hint="Só para caixas de sachês ou latas.">
          <input id="unidades" name="unidades" inputMode="numeric" defaultValue={p?.unitCount ?? ""} className={input} />
        </Field>
        <Field label="Necessidades" className="sm:col-span-2">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {NEEDS.filter((n) => n !== "castrados").map((n) => (
              <label key={n} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="necessidades" value={n} defaultChecked={p?.needs.includes(n)} className="size-4 accent-foreground" /> {NEED_LABEL[n]}
              </label>
            ))}
          </div>
        </Field>
      </Group>

      <Group title="Códigos, foto e descrição">
        <Field label="GTIN/EAN (código de barras)" htmlFor="gtin" hint="Confira o dígito verificador na embalagem.">
          <input id="gtin" name="gtin" inputMode="numeric" defaultValue={p?.gtin ?? ""} className={input} />
        </Field>
        <Field label="Foto (endereço https)" htmlFor="imagem" hint="Só imagem com direito de uso.">
          <input id="imagem" name="imagem" type="url" defaultValue={p?.imageUrl ?? ""} placeholder="https://" className={input} />
        </Field>
        <Field label="Descrição" htmlFor="descricao" className="sm:col-span-2">
          <textarea id="descricao" name="descricao" rows={3} defaultValue={p?.description ?? ""} className={input + " h-auto py-1.5"} />
        </Field>
        <Field label="Fontes (uma por linha: endereço e o que comprova)" htmlFor="fontes" className="sm:col-span-2">
          <textarea id="fontes" name="fontes" rows={3} defaultValue={p?.sources.map((s) => `${s.url} ${s.note}`.trim()).join("\n") ?? ""} className={input + " h-auto py-1.5 font-mono text-xs"} />
        </Field>
        <Field label="Observações internas" htmlFor="observacoes" className="sm:col-span-2">
          <textarea id="observacoes" name="observacoes" rows={2} defaultValue={p?.notes ?? ""} className={input + " h-auto py-1.5"} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="ativo" defaultChecked={p ? p.active : true} className="size-4 accent-foreground" /> Ativo (aparece no site)
        </label>
      </Group>

      <div className="flex items-center gap-3">
        <button type="submit" className={btn.primary + " h-9 px-4"}>
          {p ? "Salvar produto" : "Cadastrar produto"}
        </button>
        <p className="text-xs text-muted-foreground">* obrigatório</p>
      </div>
    </form>
  );
}
