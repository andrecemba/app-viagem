import { inflateRawSync } from "node:zlib";

/**
 * Leitura mínima de planilha .xlsx (Excel, Google Planilhas, LibreOffice): só a
 * primeira aba, só os valores das células. Sem biblioteca extra — o .xlsx é um
 * .zip com XML dentro. Fórmulas valem pelo último valor salvo no arquivo.
 */

const MAX_ENTRY_BYTES = 20_000_000;

function unzip(buf: Buffer): Map<string, Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("não é um arquivo .xlsx válido");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("índice do .xlsx corrompido");
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (!/^xl\/(sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml)$/.test(name)) continue;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    const out = method === 0 ? data : method === 8 ? inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES }) : null;
    if (out) files.set(name, out);
  }
  return files;
}

function decode(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/** Texto de um <si> ou <is>: junta os trechos <t> (texto com formatação vem em partes). */
function textOf(xml: string) {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join("");
}

function columnIndex(ref: string) {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function firstSheetPath(files: Map<string, Buffer>): string | null {
  const wb = files.get("xl/workbook.xml")?.toString("utf8");
  const rels = files.get("xl/_rels/workbook.xml.rels")?.toString("utf8");
  const rid = wb?.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const target = rid && rels ? new RegExp(`<Relationship\\b[^>]*\\bId="${rid}"[^>]*\\bTarget="([^"]+)"`).exec(rels)?.[1] ?? new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${rid}"`).exec(rels)?.[1] : null;
  if (target) {
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    if (files.has(path)) return path;
  }
  return [...files.keys()].filter((k) => k.startsWith("xl/worksheets/")).sort()[0] ?? null;
}

/** Linhas da primeira aba como tabela de textos (a primeira linha é o cabeçalho). */
export function readXlsxTable(data: ArrayBuffer | Buffer): string[][] {
  const files = unzip(Buffer.isBuffer(data) ? data : Buffer.from(data));
  const sheetPath = firstSheetPath(files);
  if (!sheetPath) throw new Error("a planilha não tem nenhuma aba");
  const shared = [...(files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  const sheet = files.get(sheetPath)!.toString("utf8");
  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    let next = 0;
    for (const c of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const col = ref ? columnIndex(ref) : next;
      next = col + 1;
      const body = c[2] ?? "";
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s") value = v != null ? (shared[Number(v)] ?? "") : "";
      else if (type === "inlineStr") value = textOf(body);
      else if (type === "b") value = v === "1" ? "sim" : "não";
      else if (v != null) {
        const raw = decode(v);
        // Números: tira o “.0” e o ruído de ponto flutuante (149.90000000000001 → 149.9).
        const num = type === "str" || type === "e" ? NaN : Number(raw);
        value = Number.isFinite(num) ? String(Math.abs(num) < 1e15 ? Number(num.toPrecision(15)) : num) : raw;
      }
      row[col] = value.trim();
    }
    rows.push(Array.from(row, (x) => x ?? ""));
  }
  return rows;
}

/** Mesmo formato do CSV: um objeto por linha, com o cabeçalho em minúsculas. */
export function readXlsxRows(data: ArrayBuffer | Buffer): Record<string, string>[] {
  const table = readXlsxTable(data).filter((r) => r.some((v) => v));
  if (!table.length) return [];
  const header = table[0].map((h) => h.trim().toLowerCase());
  return table.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h || `col${i}`, r[i] ?? ""])));
}

export function isXlsx(data: ArrayBuffer | Buffer) {
  const b = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return b.length > 4 && b.readUInt32LE(0) === 0x04034b50;
}
