import type { DogSize, FoodType, LifeStage, Species } from "@/lib/catalog/vocab";
import { IMPORT_COLUMNS } from "@/lib/domain/catalog-import";
import { normalizeText, weightFromTitle } from "@/lib/domain/validation";

/**
 * Catálogo do Mercado Livre → linhas da planilha de importação (Produtos → Importar planilha).
 * Só usa os atributos oficiais do produto de catálogo; o que falta fica de fora
 * (a linha é pulada com o motivo), nunca é adivinhado.
 */

export const FOOD_DOMAIN = "MLB-CAT_AND_DOG_FOODS";
/** Por enquanto o site só recebe ração seca: úmida (sachê, lata, patê) fica de fora. */
export const SKIP_WET = true;
export const CATALOG_COLUMNS = ["nome_mercado_livre", ...IMPORT_COLUMNS] as const;

export interface MlCatalogProduct {
  id?: string;
  name?: string;
  domain_id?: string;
  attributes?: { id: string; value_name?: string | null }[];
}

export type CatalogRow = Record<(typeof CATALOG_COLUMNS)[number], string>;

const LIFE_LABEL: Record<LifeStage, string> = { filhote: "Filhotes", adulto: "Adultos", senior: "Sênior", todas: "Todas as idades" };
const SIZE_LABEL: Partial<Record<DogSize, string>> = {
  mini: "Mini",
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  mini_pequeno: "Mini e Pequeno",
  medio_grande: "Médio e Grande",
};
export const SIZE_WORD: Record<DogSize, string> = {
  mini: "mini",
  pequeno: "pequeno",
  medio: "médio",
  grande: "grande",
  mini_pequeno: "mini e pequeno",
  medio_grande: "médio e grande",
  todos: "todos",
};

function speciesOf(text: string): Species | null {
  const dog = /\b(caes|cao|cachorros?|dogs?|canin[oa]s?)\b/.test(text);
  const cat = /\b(gat[oa]s?|cats?|felin[oa]s?)\b/.test(text);
  return dog === cat ? null : dog ? "caes" : "gatos";
}

function lifeOf(text: string): LifeStage | null {
  const pup = /\b(filhotes?|puppy|junior|kitten)\b/.test(text);
  const adult = /\badult/.test(text);
  const senior = /\b(senior|idosos?|mature)\b/.test(text) || /\b7\s*(anos|mais)\b/.test(text);
  if (/\btodas\b/.test(text) || (pup && adult)) return "todas";
  if (senior && !pup) return "senior";
  if (pup) return "filhote";
  if (adult) return "adulto";
  return null;
}

function sizeOf(text: string): DogSize | null {
  const mini = /\b(mini|toy)\b/.test(text);
  const small = /\bpequen/.test(text);
  const medium = /\bmedi[oa]s?\b/.test(text);
  const big = /\b(grandes?|gigantes?)\b/.test(text);
  if (/\btod[oa]s\b/.test(text)) return "todos";
  if ((mini || small) && (medium || big)) return "todos";
  if (mini && small) return "mini_pequeno";
  if (medium && big) return "medio_grande";
  if (mini) return "mini";
  if (small) return "pequeno";
  if (medium) return "medio";
  if (big) return "grande";
  return null;
}

function foodTypeOf(text: string): FoodType | null {
  if (/\bsec[oa]\b/.test(text)) return "seca";
  if (/\b(umid[oa]|sache|pate|lata)\b/.test(text)) return "umida";
  if (/\bnatural\b/.test(text)) return "natural";
  return null;
}

export function kg(grams: number) {
  return `${String(grams / 1000).replace(".", ",")} kg`;
}

export function catalogRow(p: MlCatalogProduct): { row: CatalogRow } | { skip: string } {
  if (!p.id || !p.name) return { skip: "sem nome" };
  if (p.domain_id && p.domain_id !== FOOD_DOMAIN) return { skip: "não é ração" };
  const attr = (id: string) => p.attributes?.find((a) => a.id === id)?.value_name?.trim() || "";
  const name = normalizeText(p.name);

  if (/\b(petiscos?|snacks?|bifinhos?|biscoitos?|ossinhos?|palitos?)\b/.test(name)) return { skip: "petisco" };

  const units = Number(attr("UNITS_PER_PACK") || "1");
  if (units > 1 || /\bkit\b/.test(normalizeText(attr("SALE_FORMAT")))) return { skip: "kit com várias embalagens" };

  const species = speciesOf(normalizeText(attr("RECOMMENDED_PET"))) ?? speciesOf(name);
  if (!species) return { skip: "espécie (cão ou gato) não definida" };

  const brand = attr("BRAND");
  if (!brand) return { skip: "sem marca" };

  const weight = weightFromTitle(attr("NET_WEIGHT")) ?? weightFromTitle(p.name);
  if (!weight) return { skip: "sem peso da embalagem" };

  const life = lifeOf(normalizeText(attr("PET_LIFE_STAGE"))) ?? lifeOf(name);
  const size = species === "caes" ? (sizeOf(normalizeText(attr("BREED_SIZE"))) ?? sizeOf(name)) : null;
  const neutered = /\bcastrad/.test(normalizeText(`${attr("SPECIAL_NEEDS")} ${p.name}`));
  if (!life && (!size || size === "todos")) return { skip: "sem idade nem porte (indicação)" };

  const indication = [life ? LIFE_LABEL[life] : null, size ? SIZE_LABEL[size] : null, neutered ? "Castrados" : null].filter(Boolean).join(" ");
  const flavorRaw = attr("FLAVOR");
  const flavor = /^(sem sabor|nao se aplica|nao aplica|n a|sabor unico|original)$/.test(normalizeText(flavorRaw)) ? "" : flavorRaw;
  const foodType = foodTypeOf(normalizeText(attr("PET_FOOD_TYPE"))) ?? (/\b(sache|saches|lata|pate|umida)\b/.test(name) ? "umida" : null);
  if (SKIP_WET && foodType === "umida") return { skip: "ração úmida (sachê, lata, patê)" };

  return {
    row: {
      nome_mercado_livre: p.name,
      especie: species === "caes" ? "Cachorro" : "Gato",
      marca: brand,
      linha: attr("LINE"),
      indicacao: indication,
      sabor: flavor,
      peso: kg(weight),
      castrado: neutered ? "sim" : "não",
      idade: life ? (life === "todas" ? "todas" : life === "senior" ? "sênior" : life) : "",
      porte: size ? SIZE_WORD[size] : "",
      tipo: foodType ?? "",
      gtin: attr("GTIN").split(/[,;\s]+/)[0] ?? "",
      link_anuncio: `https://www.mercadolivre.com.br/p/${p.id}`,
      id_anuncio: p.id,
      preco: "",
      disponivel: "",
      frete_gratis: "",
      link_afiliado: "",
      observacao: "",
    },
  };
}

/** CSV com ";" (abre direto no Excel em português) e BOM para os acentos. */
export function toCsv(rows: CatalogRow[]): string {
  const cell = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + [CATALOG_COLUMNS.join(";"), ...rows.map((r) => CATALOG_COLUMNS.map((c) => cell(r[c] ?? "")).join(";"))].join("\r\n") + "\r\n";
}

export interface LinkEntry {
  position: number;
  /** Outro sabor ou peso da ração mais vendida logo acima. */
  variant?: boolean;
  /** Sem nenhum vendedor agora: o Mercado Livre não gera link de afiliado. */
  unavailable?: boolean;
  name: string;
  imageUrl: string | null;
  pageUrl: string;
  /** Linha pronta para a planilha; sem ela o produto aparece só como aviso (ex.: já está no site). */
  row: CatalogRow | null;
  note: string | null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Página para abrir no navegador: um botão por produto para abrir o anúncio no
 * Mercado Livre (onde se gera o link de afiliado), um campo para colar o link e
 * um botão que baixa a planilha já com a coluna link_afiliado preenchida.
 */
export function linksPage(title: string, groups: { title: string; entries: LinkEntry[] }[]): string {
  const rows = groups.flatMap((g) => g.entries.filter((e) => e.row).map((e) => e.row!));
  let n = 0;
  const sections = groups
    .map((g) => {
      const items = g.entries
        .map((e) => {
          const idx = e.row ? n++ : -1;
          return `<li class="${[e.row ? "" : "off", e.variant ? "var" : ""].join(" ").trim()}">
  <span class="pos">${e.variant ? "↳" : `${e.position}º`}</span>
  ${e.imageUrl ? `<img src="${esc(e.imageUrl)}" alt="" loading="lazy">` : `<span class="noimg"></span>`}
  <div class="info">
    <b>${esc(e.name)}</b>
    ${e.note ? `<small>${esc(e.note)}</small>` : ""}
    ${e.row && e.unavailable ? `<small class="na">Indisponível no momento: o Mercado Livre não gera link de afiliado agora. Pode deixar em branco: no site ela aparece como “Indisponível no momento” e, quando voltar ao estoque, o painel avisa “Sem link de afiliado”.</small>` : ""}
    <a href="${esc(e.pageUrl)}" target="_blank" rel="noopener">Abrir no Mercado Livre ↗</a>
    ${e.row ? `<input data-i="${idx}" placeholder="Cole aqui o link de afiliado (https://mercadolivre.com/sec/…)">` : ""}
  </div>
</li>`;
        })
        .join("\n");
      return `<h2>${esc(g.title)}</h2>\n<ol>\n${items}\n</ol>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:0 auto;max-width:860px;padding:16px;background:#f7f7f5;color:#222}
h1{font-size:1.4rem}h2{margin-top:2rem;font-size:1.15rem}
ol{list-style:none;padding:0;margin:0}
li{display:flex;gap:12px;align-items:flex-start;background:#fff;border:1px solid #ddd;border-radius:10px;padding:10px;margin:8px 0}
li.off{opacity:.55}
li.var{margin-left:2.6rem}
.pos{font-weight:700;font-size:1.1rem;min-width:2.2rem}
img,.noimg{width:72px;height:72px;object-fit:contain;flex:none;background:#fafafa}
.info{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}
small{color:#a15c00}
small.na{color:#b42318;font-weight:600}
a{color:#2d5bd0;font-weight:600}
input{width:100%;box-sizing:border-box;padding:8px;border:1px solid #bbb;border-radius:6px;font-size:.95rem}
input.ok{border-color:#2a9d4b;background:#effaf2}
.bar{position:sticky;bottom:0;background:#fff;border-top:1px solid #ddd;padding:12px;margin-top:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
button{background:#2a9d4b;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-size:1rem;cursor:pointer}
.help{background:#fff8d6;border:1px solid #eedc82;border-radius:10px;padding:10px 14px}
</style></head><body>
<h1>${esc(title)}</h1>
<div class="help">
<b>Como usar:</b> clique em “Abrir no Mercado Livre”, gere o link de afiliado na barra de afiliados do topo da página,
copie e cole no campo do produto. No fim, clique em “Baixar planilha com os links” e importe o arquivo em
<b>Produtos → Importar planilha</b>. O que você colar fica guardado neste navegador, mesmo se fechar a página.
Produto sem link pode ficar em branco: ele entra no site mesmo assim e você completa depois.
</div>
${sections}
<div class="bar"><button id="baixar">Baixar planilha com os links</button><span id="conta"></span></div>
<script>
const COLS=${JSON.stringify(CATALOG_COLUMNS)};
const ROWS=${JSON.stringify(rows).replace(/</g, "\\u003c")};
const KEY="links-afiliado:"+${JSON.stringify(title)};
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){}
const inputs=[...document.querySelectorAll("input[data-i]")];
function update(){const n=inputs.filter(i=>i.value.trim()).length;document.getElementById("conta").textContent=n+" de "+inputs.length+" com link de afiliado";}
inputs.forEach(i=>{const id=ROWS[i.dataset.i].id_anuncio;i.value=saved[id]||"";i.classList.toggle("ok",!!i.value.trim());
i.addEventListener("input",()=>{saved[id]=i.value.trim();i.classList.toggle("ok",!!saved[id]);try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(e){}update();});});
update();
const cell=v=>/[;"\\n\\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;
document.getElementById("baixar").onclick=()=>{
const lines=[COLS.join(";")].concat(ROWS.map(r=>COLS.map(c=>cell(c==="link_afiliado"?(saved[r.id_anuncio]||""):(r[c]||""))).join(";")));
const blob=new Blob(["\\ufeff"+lines.join("\\r\\n")+"\\r\\n"],{type:"text/csv;charset=utf-8"});
const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="mais-vendidos-com-links.csv";a.click();};
</script>
</body></html>
`;
}
