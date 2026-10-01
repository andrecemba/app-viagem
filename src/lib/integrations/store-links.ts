import type { Product } from "@/lib/domain/types";
import { checkUrlText } from "@/lib/domain/listing-check";
import { IMPORT_COLUMNS } from "@/lib/domain/catalog-import";
import { normalizeText, weightFromTitle } from "@/lib/domain/validation";

import { kg, SIZE_WORD } from "./ml-catalog";

/**
 * Mesmas rações do site em outra loja sem API (ex.: Cobasi): acha o link do
 * produto na loja e monta a página para colar os links de afiliado.
 * A planilha repete os dados do produto já cadastrado, então a importação
 * junta a oferta nova ao mesmo produto (não cria ração repetida).
 */

export const STORE_COLUMNS = ["nome_no_site", "achado_na_loja", ...IMPORT_COLUMNS] as const;
export type StoreRow = Record<(typeof STORE_COLUMNS)[number], string>;

export function productRow(p: Product, name: string): StoreRow {
  const life = p.lifeStage === "senior" ? "sênior" : (p.lifeStage ?? "");
  return {
    nome_no_site: name,
    achado_na_loja: "",
    especie: p.species === "caes" ? "Cachorro" : "Gato",
    marca: p.brand,
    linha: p.line ?? "",
    indicacao: p.indication,
    sabor: p.flavor ?? "",
    peso: p.weightGrams >= 1000 ? kg(p.weightGrams) : `${p.weightGrams} g`,
    castrado: p.neutered ? "sim" : "não",
    idade: life,
    porte: p.size ? SIZE_WORD[p.size] : "",
    tipo: p.foodType ?? "",
    gtin: p.gtin ?? "",
    link_anuncio: "",
    id_anuncio: "",
    preco: "",
    disponivel: "",
    frete_gratis: "",
    link_afiliado: "",
    observacao: "",
  };
}

/** Produto como a busca das lojas VTEX devolve (Cobasi e outras). */
export interface VtexProduct {
  productId?: string;
  productName?: string;
  brand?: string;
  link?: string;
  items?: {
    itemId?: string;
    name?: string;
    nameComplete?: string;
    ean?: string;
    images?: { imageUrl?: string }[];
    sellers?: { commertialOffer?: { Price?: number; AvailableQuantity?: number; IsAvailable?: boolean } }[];
  }[];
}

export interface StoreMatch {
  url: string;
  itemId: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  available: boolean | null;
  /** true = mesmo código de barras; false = achado pelo nome (confira). */
  sure: boolean;
}

/**
 * Escolhe o item certo: pelo código de barras (certeza) ou, sem ele, pelo nome,
 * só quando o peso é o mesmo e nada no nome contradiz o produto (idade, porte, sabor, marca).
 */
export function pickVtexMatch(p: Pick<Product, "brand" | "flavor" | "weightGrams" | "lifeStage" | "size" | "neutered" | "gtin">, results: VtexProduct[]): StoreMatch | null {
  const candidates = results.flatMap((r) => (r.items ?? []).map((it) => ({ r, it })));
  const toMatch = ({ r, it }: (typeof candidates)[number], sure: boolean): StoreMatch | null => {
    if (!r.link || !it.itemId) return null;
    const offer = it.sellers?.map((s) => s.commertialOffer).find((o) => o) ?? null;
    const price = typeof offer?.Price === "number" && offer.Price > 0 ? offer.Price : null;
    const available = offer ? Boolean(offer.IsAvailable ?? (offer.AvailableQuantity ?? 0) > 0) : null;
    return {
      url: r.link,
      itemId: it.itemId,
      name: it.nameComplete || [r.productName, it.name].filter(Boolean).join(" "),
      imageUrl: it.images?.[0]?.imageUrl?.replace(/^http:/, "https:") ?? null,
      price,
      available,
      sure,
    };
  };

  const gtin = p.gtin?.replace(/^0+/, "");
  if (gtin) {
    const hit = candidates.find((c) => c.it.ean?.replace(/^0+/, "") === gtin);
    if (hit) return toMatch(hit, true);
  }
  for (const c of candidates) {
    const title = `${c.r.productName ?? ""} ${c.it.name ?? ""}`;
    const weight = weightFromTitle(c.it.name) ?? weightFromTitle(c.it.nameComplete) ?? weightFromTitle(c.r.productName);
    if (weight !== p.weightGrams) continue;
    const slug = `https://loja/${normalizeText(title).replace(/\s+/g, "-")}`;
    if (checkUrlText(p, slug).every((l) => l.ok)) return toMatch(c, false);
  }
  return null;
}

export interface StoreLinkEntry {
  name: string;
  imageUrl: string | null;
  row: StoreRow;
  match: StoreMatch | null;
  searchUrl: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Página com cada ração: o link achado na loja (ou a busca pronta), um campo para
 * o link do produto na loja e outro para o link de afiliado, e o botão que baixa
 * a planilha de importação. Só entram na planilha as linhas com link da loja.
 */
export function storeLinksPage(storeName: string, entries: StoreLinkEntry[], fileName: string): string {
  const items = entries
    .map((e, i) => {
      const m = e.match;
      const status = !m
        ? `<small class="na">Não achei automaticamente: clique em “Buscar na ${esc(storeName)}”, abra a ração certa e cole o link dela abaixo.</small>`
        : m.sure
          ? `<small class="ok">Achado pelo código de barras (mesmo produto)${m.available === false ? " · indisponível no momento" : ""}.</small>`
          : `<small>Achado pelo nome: “${esc(m.name)}”. Confira se é a mesma ração (peso, sabor, idade) antes de usar.</small>`;
      return `<li>
  ${e.imageUrl ? `<img src="${esc(e.imageUrl)}" alt="" loading="lazy">` : `<span class="noimg"></span>`}
  <div class="info">
    <b>${esc(e.name)}</b>
    ${status}
    <span class="links">${m ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">Abrir na ${esc(storeName)} ↗</a>` : ""}<a href="${esc(e.searchUrl)}" target="_blank" rel="noopener">Buscar na ${esc(storeName)} ↗</a></span>
    <label>Link da ração na ${esc(storeName)}<input data-i="${i}" data-k="page" value="${m ? esc(m.url) : ""}" placeholder="https://www.cobasi.com.br/…"></label>
    <label>Link de afiliado<input data-i="${i}" data-k="aff" placeholder="Cole aqui o link de afiliado"></label>
  </div>
</li>`;
    })
    .join("\n");

  const rows = entries.map((e) => ({
    ...e.row,
    achado_na_loja: e.match?.name ?? "",
    link_anuncio: e.match?.url ?? "",
    id_anuncio: e.match?.itemId ?? "",
    preco: e.match?.price != null ? e.match.price.toFixed(2).replace(".", ",") : "",
    disponivel: e.match?.available == null ? "" : e.match.available ? "sim" : "não",
  }));

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(storeName)}: links das rações</title>
<style>
body{font-family:system-ui,sans-serif;margin:0 auto;max-width:860px;padding:16px;background:#f7f7f5;color:#222}
h1{font-size:1.4rem}
ol{list-style:none;padding:0;margin:0}
li{display:flex;gap:12px;align-items:flex-start;background:#fff;border:1px solid #ddd;border-radius:10px;padding:10px;margin:8px 0}
img,.noimg{width:72px;height:72px;object-fit:contain;flex:none;background:#fafafa}
.info{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}
small{color:#a15c00}small.na{color:#b42318;font-weight:600}small.ok{color:#1d7a3a;font-weight:600}
.links{display:flex;gap:16px;flex-wrap:wrap}
a{color:#2d5bd0;font-weight:600}
label{font-size:.85rem;color:#555;display:flex;flex-direction:column;gap:3px}
input{width:100%;box-sizing:border-box;padding:8px;border:1px solid #bbb;border-radius:6px;font-size:.95rem}
input.ok{border-color:#2a9d4b;background:#effaf2}
.bar{position:sticky;bottom:0;background:#fff;border-top:1px solid #ddd;padding:12px;margin-top:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
button{background:#2a9d4b;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-size:1rem;cursor:pointer}
.help{background:#fff8d6;border:1px solid #eedc82;border-radius:10px;padding:10px 14px}
</style></head><body>
<h1>${esc(storeName)}: links das rações do site</h1>
<div class="help">
<b>Como usar:</b> confira o link de cada ração (verde = mesmo código de barras; laranja = achado pelo nome, confira;
vermelho = não achei, use “Buscar na ${esc(storeName)}” e cole o link da ração certa). Gere o link de afiliado
no painel do programa de afiliados e cole no segundo campo. No fim, clique em “Baixar planilha” e importe em
<b>Produtos → Importar planilha</b>. A oferta entra na mesma ração que já está no site.
Só vão para a planilha as rações com o link da ${esc(storeName)} preenchido. O que você colar fica guardado neste navegador.
</div>
<ol>
${items}
</ol>
<div class="bar"><button id="baixar">Baixar planilha</button><span id="conta"></span></div>
<script>
const COLS=${JSON.stringify(STORE_COLUMNS)};
const ROWS=${JSON.stringify(rows).replace(/</g, "\\u003c")};
const KEY="links-loja:"+${JSON.stringify(storeName)};
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){}
const inputs=[...document.querySelectorAll("input[data-i]")];
const key=i=>ROWS[i.dataset.i].nome_no_site+"|"+i.dataset.k;
function update(){const pages=inputs.filter(i=>i.dataset.k==="page"&&i.value.trim()).length;const affs=inputs.filter(i=>i.dataset.k==="aff"&&i.value.trim()).length;
document.getElementById("conta").textContent=pages+" com link da loja · "+affs+" com link de afiliado";}
inputs.forEach(i=>{if(saved[key(i)]!=null)i.value=saved[key(i)];i.classList.toggle("ok",!!i.value.trim());
i.addEventListener("input",()=>{saved[key(i)]=i.value.trim();i.classList.toggle("ok",!!i.value.trim());try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(e){}update();});});
update();
const cell=v=>/[;"\\n\\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;
const val=(i,k)=>{const el=document.querySelector('input[data-i="'+i+'"][data-k="'+k+'"]');return el?el.value.trim():"";};
document.getElementById("baixar").onclick=()=>{
const out=[];ROWS.forEach((r,i)=>{const page=val(i,"page");if(!page)return;
const same=page===r.link_anuncio;
// Link trocado à mão: preço e disponibilidade achados eram de outro anúncio.
out.push({...r,link_anuncio:page,id_anuncio:same?r.id_anuncio:"",preco:same?r.preco:"",disponivel:same?r.disponivel:"",achado_na_loja:same?r.achado_na_loja:"",link_afiliado:val(i,"aff")});});
if(!out.length){alert("Nenhuma ração com o link da loja preenchido.");return;}
const lines=[COLS.join(";")].concat(out.map(r=>COLS.map(c=>cell(r[c]||"")).join(";")));
const blob=new Blob(["\\ufeff"+lines.join("\\r\\n")+"\\r\\n"],{type:"text/csv;charset=utf-8"});
const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=${JSON.stringify(fileName)};a.click();};
</script>
</body></html>
`;
}
