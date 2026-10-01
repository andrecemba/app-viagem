import { NEED_LABEL } from "@/lib/catalog/vocab";

import type { ComparatorItem } from "./types";

/**
 * Busca tolerante do comparador: ignora acentos e maiúsculas, entende sinônimos
 * ("cachorro" = "cão"), plurais, nomes incompletos ("gold" → Golden), pequenos
 * erros de digitação ("goldem") e peso da embalagem ("15kg", "10,1 kg", "500 g").
 *
 * Funções puras, sem dependências de React: testadas em tests/search.test.ts.
 */

const STOPWORDS = new Set([
  "racao", "racoes", "de", "da", "do", "das", "dos", "para", "pra", "p", "com", "sabor", "e", "a", "o", "os", "as",
  "em", "pacote", "saco", "embalagem", "tipo", "linha", "pet", "pets",
]);

const SYNONYM_GROUPS: [canonical: string, words: string[]][] = [
  ["cao", ["cao", "caes", "cachorro", "cachorros", "cachorra", "cadela", "dog", "dogs", "canino", "canina", "caninos"]],
  ["gato", ["gato", "gatos", "gata", "gatas", "gatinho", "gatinhos", "felino", "felina", "felinos", "cat", "cats"]],
  ["filhote", ["filhote", "filhotes", "puppy", "junior", "kitten"]],
  ["adulto", ["adulto", "adultos", "adulta", "adultas", "adult"]],
  ["senior", ["senior", "seniors", "idoso", "idosos", "mature"]],
  ["castrado", ["castrado", "castrados", "castrada", "castradas", "esterilizado", "esterilizados", "sterilised", "sterilized", "neutered"]],
  ["umida", ["umida", "umidas", "umido", "sache", "saches", "pate", "lata", "latas", "wet"]],
  ["seca", ["seca", "secas", "seco", "dry"]],
  ["natural", ["natural", "naturais"]],
  ["medicamentosa", ["medicamentosa", "medicamentoso", "veterinaria", "veterinario", "veterinary", "prescription", "terapeutica", "clinica", "dieta", "dietas", "vet"]],
  ["mini", ["mini", "minis", "toy"]],
  ["pequeno", ["pequeno", "pequenos", "pequena", "pequenas", "small"]],
  ["medio", ["medio", "medios", "media", "medias", "medium"]],
  ["grande", ["grande", "grandes", "gigante", "gigantes", "maxi", "large"]],
  ["frango", ["frango", "frangos", "galinha", "chicken", "ave", "aves"]],
  ["carne", ["carne", "carnes", "beef", "bovina"]],
  ["salmao", ["salmao", "salmon"]],
  ["peixe", ["peixe", "peixes", "fish"]],
];

const SYNONYMS = new Map<string, string>();
for (const [canonical, words] of SYNONYM_GROUPS) for (const w of words) SYNONYMS.set(w, canonical);

/** Minúsculas, sem acentos, com vírgula decimal virando ponto ("10,1" → "10.1"). */
export function normalize(text: string): string {
  return foldCase(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function foldCase(text: string) {
  return text
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/([a-z])\/([a-z])/g, "$1$2") // "S/O", "c/d" → "so", "cd"
    .replace(/[’']/g, "");
}

/** Forma canônica de uma palavra já normalizada: sinônimo → plural → sinônimo. */
export function canonical(word: string): string {
  const direct = SYNONYMS.get(word);
  if (direct) return direct;
  const singular = word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
  return SYNONYMS.get(singular) ?? singular;
}

/** Distância de Damerau-Levenshtein (com transposição de letras vizinhas). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[rows - 1][cols - 1];
}

function maxEdits(length: number) {
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  return 2;
}

// ── Consulta ────────────────────────────────────────────────────────────

export interface QueryTerm {
  /** Como a pessoa digitou (minúsculas), para mensagens de correção. */
  typed: string;
  token: string;
  /** Palavra conhecida usada no lugar de um erro de digitação. */
  corrected?: string;
}

export interface ParsedQuery {
  terms: QueryTerm[];
  /** Peso pedido na busca, em gramas ("15 kg" → 15000). */
  weightGrams: number | null;
}

const UNIT_RE = /^(kgs?|quilos?|kilos?|k|gramas?|grs?|g)$/;
const NUMBER_RE = /^(\d+(?:\.\d+)?)(kgs?|quilos?|kilos?|k|gramas?|grs?|g)?$/;

function toGrams(n: number, unit: string | undefined): number | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit) return unit.startsWith("g") ? Math.round(n) : Math.round(n * 1000);
  if (n <= 30) return Math.round(n * 1000); // "golden 15" = 15 kg
  if (n >= 100) return Math.round(n); // "whiskas 500" = 500 g
  return null;
}

function closestSynonym(word: string): string | null {
  const limit = maxEdits(word.length);
  if (!limit) return null;
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of SYNONYMS.keys()) {
    if (Math.abs(candidate.length - word.length) > limit) continue;
    const d = editDistance(word, candidate);
    if (d <= limit && d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}

export function parseQuery(query: string, vocabulary?: ReadonlySet<string>): ParsedQuery {
  let weightGrams: number | null = null;
  const typedWords = foldCase(query)
    .split(/[^\p{L}0-9.]+/u)
    .map((w) => w.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);
  const plain = typedWords.map((w) => normalize(w));

  const terms: QueryTerm[] = [];
  for (let i = 0; i < plain.length; i++) {
    const word = plain[i];
    const number = word.match(NUMBER_RE);
    if (number) {
      let unit = number[2];
      if (!unit && plain[i + 1] && UNIT_RE.test(plain[i + 1])) unit = plain[++i];
      const grams = toGrams(Number(number[1]), unit);
      if (grams != null) {
        weightGrams = grams;
        continue;
      }
    }
    if (UNIT_RE.test(word) || STOPWORDS.has(word)) continue;
    // "gran plus" → "granplus", quando a palavra junta existe no catálogo.
    const next = plain[i + 1];
    if (next && vocabulary?.has(word + next)) {
      terms.push({ typed: `${typedWords[i]} ${typedWords[i + 1]}`, token: word + next });
      i++;
      continue;
    }
    let token = canonical(word);
    let corrected: string | undefined;
    // Erro de digitação num sinônimo ("cachoro", "filhtoe"): corrige para a palavra conhecida.
    if (vocabulary && !vocabulary.has(token) && !SYNONYMS.has(word)) {
      const synonym = closestSynonym(word);
      if (synonym) {
        token = SYNONYMS.get(synonym)!;
        corrected = synonym;
      }
    }
    if (!STOPWORDS.has(token)) terms.push({ typed: typedWords[i], token, corrected });
  }
  return { terms, weightGrams };
}

// ── Índice ──────────────────────────────────────────────────────────────

export interface IndexedItem {
  item: ComparatorItem;
  tokens: string[];
  /** Tokens da marca (a correspondência na marca pesa um pouco mais). */
  brandTokens: Set<string>;
}

export interface SearchIndex {
  entries: IndexedItem[];
  vocabulary: Set<string>;
  /** Token canônico → palavra como aparece no catálogo (com acento), para exibir. */
  display: Map<string, string>;
}

const SPECIES_WORDS = { caes: "cachorro", gatos: "gato" } as const;
const KIND_WORDS = { seca: "seca", natural: "natural", umida: "úmida", medicamentosa: "medicamentosa" } as const;

export function buildSearchIndex(items: ComparatorItem[]): SearchIndex {
  const vocabulary = new Set<string>();
  const display = new Map<string, string>();

  const tokenize = (text: string) => {
    const out: string[] = [];
    for (const raw of foldCase(text).split(/[^\p{L}0-9]+/u).filter(Boolean)) {
      const token = canonical(normalize(raw));
      if (!token || STOPWORDS.has(token)) continue;
      out.push(token);
      vocabulary.add(token);
      if (!display.has(token)) display.set(token, raw);
    }
    return out;
  };

  const entries = items.map((item) => {
    const brandWords = tokenize(item.brand.name);
    // Nome da marca sem espaços ("royalcanin", "proplan") também vale.
    if (brandWords.length > 1) {
      const joined = brandWords.join("");
      brandWords.push(joined);
      vocabulary.add(joined);
      if (!display.has(joined)) display.set(joined, item.brand.name.toLowerCase());
    }
    const tokens = [
      ...brandWords,
      ...tokenize(item.lineName),
      ...tokenize(item.title),
      ...tokenize(item.flavor),
      ...tokenize(SPECIES_WORDS[item.species]),
      ...tokenize(KIND_WORDS[item.kind]),
      ...item.lifeStages.flatMap((s) => tokenize(s)),
      // "Todos os portes" não vira palavra de busca (senão "mini" acharia qualquer ração).
      ...(item.sizes && item.sizes.length < 4 ? item.sizes : []).flatMap((s) => tokenize(s)),
      ...item.needs.flatMap((n) => tokenize(NEED_LABEL[n])),
    ];
    return { item, tokens: [...new Set(tokens)], brandTokens: new Set(brandWords) };
  });

  return { entries, vocabulary, display };
}

// ── Pontuação ───────────────────────────────────────────────────────────

type MatchKind = "exact" | "prefix" | "fuzzy" | "none";

interface TermMatch {
  score: number;
  kind: MatchKind;
  token: string | null;
}

const MATCHED = 0.55;

export function matchTerm(term: string, tokens: Iterable<string>): TermMatch {
  let best: TermMatch = { score: 0, kind: "none", token: null };
  const limit = maxEdits(term.length);
  for (const token of tokens) {
    let candidate: TermMatch | null = null;
    if (token === term) candidate = { score: 1, kind: "exact", token };
    else if (term.length >= 2 && token.startsWith(term)) {
      candidate = { score: 0.72 + 0.2 * (term.length / token.length), kind: "prefix", token };
    } else if (limit > 0) {
      const full = editDistance(term, token);
      // Palavra incompleta e com erro: compara com o começo do token ("goldn" ~ "golde").
      const partial = token.length > term.length ? editDistance(term, token.slice(0, term.length)) + 0.5 : Infinity;
      const d = Math.min(full, partial);
      if (d <= limit) candidate = { score: 0.75 - 0.12 * (d - 1), kind: "fuzzy", token };
    }
    if (candidate && candidate.score > best.score) {
      best = candidate;
      if (best.score === 1) break;
    }
  }
  return best;
}

function weightScore(requested: number, actual: number) {
  if (requested === actual) return 1;
  // Peso diferente nunca conta como correspondência, mas pesos próximos sobem na lista.
  return 0.35 * (Math.min(requested, actual) / Math.max(requested, actual));
}

export interface Correction {
  typed: string;
  suggestion: string;
}

export interface SearchResult {
  /** "all" = sem busca; "exact" = todos os termos encontrados; "closest" = melhores aproximações; "none" = nada parecido. */
  mode: "all" | "exact" | "closest" | "none";
  items: ComparatorItem[];
  /** Relevância por id (0–1), para ordenar depois dos filtros. */
  scores: Map<string, number>;
  corrections: Correction[];
  /** Termos que não correspondem a nada no catálogo. */
  unknownTerms: string[];
  weightGrams: number | null;
}

export function searchItems(index: SearchIndex, query: string): SearchResult {
  const parsed = parseQuery(query, index.vocabulary);
  const { terms, weightGrams } = parsed;
  const base = { corrections: [] as Correction[], unknownTerms: [] as string[], weightGrams };

  if (!terms.length && weightGrams == null) {
    return { ...base, mode: "all", items: index.entries.map((e) => e.item), scores: new Map() };
  }

  // Correções e termos desconhecidos, olhando o catálogo inteiro.
  for (const term of terms) {
    if (term.corrected) {
      base.corrections.push({ typed: term.typed, suggestion: term.corrected });
      continue;
    }
    const global = matchTerm(term.token, index.vocabulary);
    if (global.kind === "none") base.unknownTerms.push(term.typed);
    else if (global.kind === "fuzzy" && global.token) {
      base.corrections.push({ typed: term.typed, suggestion: index.display.get(global.token) ?? global.token });
    }
  }

  const scored = index.entries.map((entry) => {
    let sum = 0;
    let complete = true;
    let brandHit = false;
    for (const term of terms) {
      const m = matchTerm(term.token, entry.tokens);
      sum += m.score;
      if (m.score < MATCHED) complete = false;
      if (m.token && entry.brandTokens.has(m.token) && m.score >= MATCHED) brandHit = true;
    }
    if (weightGrams != null) {
      const w = weightScore(weightGrams, entry.item.netWeightGrams);
      sum += w;
      if (w < 1) complete = false;
    }
    const count = terms.length + (weightGrams != null ? 1 : 0);
    const score = sum / count + (brandHit ? 0.04 : 0);
    return { item: entry.item, score, complete };
  });

  const byScore = (a: { score: number; item: ComparatorItem }, b: { score: number; item: ComparatorItem }) =>
    b.score - a.score || (a.item.bestPrice ?? 1e9) - (b.item.bestPrice ?? 1e9);

  const exact = scored.filter((s) => s.complete).sort(byScore);
  if (exact.length) {
    return { ...base, mode: "exact", items: exact.map((s) => s.item), scores: new Map(exact.map((s) => [s.item.id, s.score])) };
  }

  // Sem correspondência completa: os mais próximos, exigindo alguma semelhança real.
  const closest = scored.filter((s) => s.score >= 0.3).sort(byScore).slice(0, 24);
  if (closest.length) {
    return {
      ...base,
      mode: "closest",
      items: closest.map((s) => s.item),
      scores: new Map(closest.map((s) => [s.item.id, s.score])),
    };
  }
  return { ...base, mode: "none", items: [], scores: new Map() };
}
