import { formatGrams } from "./labels";
import type { AdminAlert, AdminDb, AdminOffer, AdminProduct, AlertSeverity, AlertType } from "./types";

/**
 * Motor de alertas. A cada avaliação calcula os problemas atuais e reconcilia com
 * os alertas existentes pela `key` (tipo + entidade + detalhe):
 *  - problema novo → alerta aberto;
 *  - problema que continua → mesmo alerta, `lastSeenAt` e `occurrences` atualizados (sem duplicar);
 *  - problema que deixou de existir → resolvido automaticamente, com nota;
 *  - alerta ignorado com justificativa → continua ignorado enquanto a condição for a mesma.
 */

interface Finding {
  key: string;
  type: AlertType;
  severity: AlertSeverity;
  productId: string | null;
  offerId: string | null;
  storeId: string | null;
  title: string;
  detail: string;
  suggestedAction: string;
  lastAttemptAt: string | null;
  demo: boolean;
}

export function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9,.]+/g, " ")
    .trim();
}

/** Lê o peso do título de um anúncio ("15kg", "10,1 kg", "85g"). */
export function weightFromTitle(title: string): number | null {
  const m = normalizeText(title).match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return m[2] === "kg" ? Math.round(n * 1000) : Math.round(n);
}

export function productLabel(p: AdminProduct) {
  const f = p.fields;
  return [f.brand.value, f.formula.value, f.flavor.value, f.weightGrams.value ? formatGrams(f.weightGrams.value) : null]
    .filter(Boolean)
    .join(" · ");
}

const hours = (from: string | null, now: Date) => (from ? (now.getTime() - new Date(from).getTime()) / 3600_000 : Infinity);

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function hostMatches(url: string, domains: string[]) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function findIssues(db: AdminDb, now: Date): Finding[] {
  const out: Finding[] = [];
  const productById = new Map(db.products.map((p) => [p.id, p]));
  const storeById = new Map(db.stores.map((s) => [s.id, s]));

  const offerFinding = (
    o: AdminOffer,
    type: AlertType,
    severity: AlertSeverity,
    suffix: string,
    title: string,
    detail: string,
    suggestedAction: string,
  ): Finding => ({
    key: `${type}:${o.id}${suffix ? `:${suffix}` : ""}`,
    type,
    severity,
    productId: o.productId,
    offerId: o.id,
    storeId: o.storeId,
    title,
    detail,
    suggestedAction,
    lastAttemptAt: o.lastCheckedAt,
    demo: o.demo,
  });

  // ── Ofertas ─────────────────────────────────────────────────────────
  for (const o of db.offers) {
    const product = productById.get(o.productId);
    const store = storeById.get(o.storeId);
    if (!product || !store) continue;
    const label = `${productLabel(product)} — ${store.name}`;
    const f = o.fields;
    const active = !o.hidden;

    if (active && hours(o.lastSuccessAt, now) > store.staleAfterHours) {
      const age = o.lastSuccessAt ? `${Math.round(hours(o.lastSuccessAt, now))} h` : "nunca atualizado";
      out.push(
        offerFinding(o, "preco_desatualizado", "media", "", `Preço desatualizado: ${label}`,
          `Última atualização bem-sucedida: ${age}. Prazo da loja: ${store.staleAfterHours} h. O preço anterior foi mantido e marcado como desatualizado.`,
          "Verificar agora ou atualizar o preço manualmente."),
      );
    }

    if (o.consecutiveFailures >= db.settings.failuresBeforeAlert) {
      out.push(
        offerFinding(o, "falha_repetida", "alta", "", `Consulta falhou ${o.consecutiveFailures} vezes: ${label}`,
          `Último erro: ${o.lastError ?? "sem mensagem"}. O preço exibido é o da última consulta bem-sucedida.`,
          "Ver histórico da oferta e conferir a integração ou o anúncio."),
      );
    }

    const hasProgram = store.affiliateProgram != null && o.commissionEligibility !== "sem_programa";
    const aff = f.affiliateUrl.value?.trim() ?? "";
    if (hasProgram && !aff) {
      out.push(offerFinding(o, "link_afiliado", "media", "vazio", `Link de afiliado vazio: ${label}`,
        "A oferta não tem link de afiliado cadastrado.", "Gerar o link no painel do programa e colar na oferta."));
    } else if (aff && (!isValidHttpUrl(aff) || !aff.startsWith("https://"))) {
      out.push(offerFinding(o, "link_afiliado", "alta", "malformado", `Link de afiliado malformado: ${label}`,
        `Valor atual: “${aff}”. Precisa ser um endereço https completo.`, "Corrigir o link de afiliado."));
    }
    if (o.linkStatus === "quebrado") {
      out.push(offerFinding(o, "link_afiliado", "alta", "quebrado", `Link de afiliado quebrado: ${label}`,
        "A última checagem do link retornou erro.", "Gerar um novo link no programa de afiliados."));
    } else if (o.linkStatus === "redireciona_outro") {
      out.push(offerFinding(o, "link_afiliado", "critica", "redireciona", `Link de afiliado leva a outro produto: ${label}`,
        "O redirecionamento do link termina em um anúncio diferente do cadastrado.", "Ocultar a oferta e corrigir o link."));
    }
    const url = f.url.value?.trim() ?? "";
    if (url && !hostMatches(url, store.domains)) {
      out.push(offerFinding(o, "link_afiliado", "alta", "dominio", `URL do anúncio fora do domínio da loja: ${label}`,
        `“${url}” não pertence a ${store.domains.join(", ")}.`, "Conferir a URL original do anúncio."));
    }

    // Divergências entre ficha e anúncio (pelo título do anúncio).
    const title = f.listingTitle.value ?? "";
    if (title) {
      const t = normalizeText(title);
      const problems: string[] = [];
      const brand = product.fields.brand.value;
      if (brand && !t.includes(normalizeText(brand).split(" ")[0])) problems.push(`marca “${brand}” não aparece`);
      const w = weightFromTitle(title);
      const pw = product.fields.weightGrams.value;
      if (w && pw && w !== pw) problems.push(`peso do anúncio ${formatGrams(w)} × ficha ${formatGrams(pw)}`);
      const flavor = product.fields.flavor.value;
      if (flavor) {
        const main = normalizeText(flavor).split(/\s|,/)[0];
        if (main && !t.includes(main)) problems.push(`sabor “${flavor}” não aparece`);
      }
      if (problems.length) {
        out.push(offerFinding(o, "divergencia", "alta", problems.join("|"), `Anúncio diverge da ficha: ${label}`,
          `${problems.join("; ")}. Título do anúncio: “${title}”.`, "Conferir se o anúncio é da mesma embalagem; se não for, desvincular ou ocultar."));
      }
    }

    if (o.sellerChangedAt && hours(o.sellerChangedAt, now) < 24 * 14) {
      out.push(offerFinding(o, "mudanca_vendedor", "media", o.sellerChangedAt, `Vendedor mudou: ${label}`,
        `Vendedor atual: ${f.sellerName.value ?? "—"}. Mudança detectada em ${new Date(o.sellerChangedAt).toLocaleString("pt-BR")}.`,
        "Confirmar se o anúncio continua elegível e confiável."));
    }
    if (o.variationChangedAt && hours(o.variationChangedAt, now) < 24 * 14) {
      out.push(offerFinding(o, "mudanca_variacao", "alta", o.variationChangedAt, `Variação do anúncio mudou: ${label}`,
        `Variação atual: ${f.variationLabel.value ?? "—"}.`, "Conferir se a variação ainda corresponde à ficha (sabor e peso)."));
    }

    const history = db.history
      .filter((h) => h.offerId === o.id && h.type === "preco" && h.result === "ok" && typeof h.to === "number")
      .map((h) => h.to as number);
    const price = f.price.value;
    if (price && history.length >= 4) {
      const m = median(history.slice(0, -1).length ? history.slice(0, -1) : history);
      const up = db.settings.priceOutlierUp;
      const down = db.settings.priceOutlierDown;
      if (price > m * (1 + up) || price < m * (1 - down)) {
        const pct = Math.round(((price - m) / m) * 100);
        out.push(offerFinding(o, "preco_fora_da_curva", "alta", String(price),
          `Preço ${pct > 0 ? "muito acima" : "muito abaixo"} do histórico: ${label}`,
          `Atual R$ ${price.toFixed(2)} × mediana R$ ${m.toFixed(2)} (${pct > 0 ? "+" : ""}${pct}%).`,
          "Conferir se não é erro de leitura, embalagem diferente ou kit."));
      }
    }

    if (f.availability.value === "indisponivel" || f.availability.value === "removido") {
      out.push(offerFinding(o, "indisponivel", f.availability.value === "removido" ? "alta" : "baixa", f.availability.value,
        f.availability.value === "removido" ? `Anúncio removido: ${label}` : `Produto indisponível: ${label}`,
        "A oferta aparece no fim da lista pública ou fica oculta, conforme a regra da loja.",
        f.availability.value === "removido" ? "Ocultar a oferta ou cadastrar o novo anúncio." : "Aguardar a próxima verificação."));
    }

    if (o.imageStatus === "quebrada") {
      out.push(offerFinding(o, "imagem", "baixa", "oferta", `Imagem do anúncio quebrada: ${label}`,
        "A imagem informada pela loja não carregou.", "Usar a imagem da ficha do produto."));
    }

    const published = product.status === "publicado";
    if (active && published && hasProgram && o.commissionEligibility !== "confirmada") {
      out.push(offerFinding(o, "sem_elegibilidade", "media", "", `Comissão não confirmada: ${label}`,
        "A oferta está visível num produto publicado, mas a elegibilidade para comissão não foi confirmada no programa.",
        "Confirmar no painel do programa ou marcar como sem programa."));
    }

    for (const [key, field] of Object.entries(f)) {
      if (field.pendingAuto) {
        out.push(offerFinding(o, "valor_automatico_divergente", "media", key, `Novo valor automático aguardando revisão: ${label}`,
          `Campo ${key}: exibido “${String(field.value)}”, recebido “${String(field.pendingAuto.value)}”.`,
          "Abrir a oferta para aceitar o novo valor ou manter a correção."));
      }
    }
  }

  // ── Produtos ────────────────────────────────────────────────────────
  for (const p of db.products) {
    const label = productLabel(p) || p.id;
    const base = { productId: p.id, offerId: null, storeId: null, lastAttemptAt: null, demo: false };
    if (p.status !== "oculto" && (p.imageStatus === "ausente" || p.imageStatus === "quebrada" || !p.fields.imageUrl.value)) {
      const broken = p.imageStatus === "quebrada";
      out.push({ ...base, key: `imagem:${p.id}`, type: "imagem", severity: p.status === "publicado" ? "media" : "baixa",
        title: `${broken ? "Imagem quebrada" : "Imagem ausente"}: ${label}`,
        detail: broken ? "A URL da imagem não carregou na última checagem." : "Sem foto oficial da embalagem com fonte adequada para exibição.",
        suggestedAction: "Cadastrar a foto oficial (com autorização ou fonte do fabricante)." });
    }
    const pending = Object.entries(p.fields)
      .filter(([k, fs]) => fs.verification === "pendente" && ["brand", "formula", "species", "lifeStage", "flavor", "weightGrams", "foodType"].includes(k))
      .map(([k]) => k);
    if (pending.length) {
      out.push({ ...base, key: `dados_pendentes:${p.id}:${pending.join(",")}`, type: "dados_pendentes",
        severity: p.status === "publicado" ? "alta" : "baixa",
        title: `Dados pendentes de verificação: ${label}`,
        detail: `Campos: ${pending.join(", ")}.${p.verificationNote ? ` Nota: ${p.verificationNote}` : ""}`,
        suggestedAction: "Conferir na embalagem ou no site do fabricante e corrigir a ficha." });
    }
    for (const [key, field] of Object.entries(p.fields)) {
      if (field.pendingAuto) {
        out.push({ ...base, key: `valor_automatico_divergente:${p.id}:${key}`, type: "valor_automatico_divergente", severity: "media",
          title: `Novo valor automático aguardando revisão: ${label}`,
          detail: `Campo ${key}: exibido “${String(field.value)}”, recebido “${String(field.pendingAuto.value)}” (${field.pendingAuto.source}).`,
          suggestedAction: "Comparar e decidir: aceitar o novo valor ou manter a correção." });
      }
      if (field.reviewAt && new Date(field.reviewAt) <= now) {
        out.push({ ...base, key: `revisao_agendada:${p.id}:${key}:${field.reviewAt}`, type: "revisao_agendada", severity: "baixa",
          title: `Revisão agendada vencida: ${label}`, detail: `Campo ${key}, revisão marcada para ${new Date(field.reviewAt).toLocaleDateString("pt-BR")}.`,
          suggestedAction: "Rever a correção manual e remover a trava se não for mais necessária." });
      }
    }
  }

  // Possíveis duplicatas: mesmo GTIN, ou mesma marca + fórmula + sabor + peso.
  const groups = new Map<string, AdminProduct[]>();
  for (const p of db.products) {
    const f = p.fields;
    const keys: string[] = [];
    if (f.gtin.value) keys.push(`gtin:${f.gtin.value.trim()}`);
    if (f.brand.value && f.formula.value && f.weightGrams.value) {
      keys.push(`id:${normalizeText(`${f.brand.value}|${f.formula.value}|${f.flavor.value ?? ""}|${f.species.value}`)}|${f.weightGrams.value}`);
    }
    for (const k of keys) groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  for (const [k, list] of groups) {
    if (list.length < 2) continue;
    const ids = list.map((p) => p.id).sort();
    out.push({ key: `possivel_duplicata:${ids.join("+")}`, type: "possivel_duplicata", severity: "media",
      productId: ids[0], offerId: null, storeId: null, lastAttemptAt: null, demo: false,
      title: `Fichas parecem a mesma embalagem: ${productLabel(list[0])}`,
      detail: `${list.length} fichas com ${k.startsWith("gtin") ? "o mesmo GTIN" : "mesma marca, fórmula, sabor, espécie e peso"}: ${ids.join(", ")}.`,
      suggestedAction: "Unificar as fichas ou corrigir o dado que as diferencia." });
  }

  // Integrações: lojas com ofertas ativas e sem integração funcionando.
  for (const store of db.stores) {
    const offers = db.offers.filter((o) => o.storeId === store.id && !o.hidden);
    if (!offers.length) continue;
    out.push({ key: `integracao_pendente:${store.id}`, type: "integracao_pendente", severity: "baixa",
      productId: null, offerId: null, storeId: store.id, lastAttemptAt: null, demo: offers.every((o) => o.demo),
      title: `Integração pendente de configuração: ${store.name}`,
      detail: `${offers.length} oferta(s) ativas dependem de atualização manual. ${store.integration.description}`,
      suggestedAction: store.integration.requiredEnv.length
        ? `Configurar ${store.integration.requiredEnv.join(", ")} e implementar o conector aprovado.`
        : "Manter atualização manual ou obter uma fonte autorizada." });
  }
  return out;
}

let seq = 0;
const newId = () => `alr-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function reconcileAlerts(existing: AdminAlert[], findings: Finding[], now: Date): AdminAlert[] {
  const at = now.toISOString();
  const byKey = new Map(existing.map((a) => [a.key, a]));
  const seen = new Set<string>();
  const next: AdminAlert[] = [];

  for (const f of findings) {
    if (seen.has(f.key)) continue;
    seen.add(f.key);
    const prev = byKey.get(f.key);
    if (prev && prev.status !== "resolvido") {
      next.push({ ...prev, ...f, status: prev.status, lastSeenAt: at, occurrences: prev.occurrences + 1, firstSeenAt: prev.firstSeenAt, resolution: prev.resolution, id: prev.id });
    } else {
      // Problema que voltou depois de resolvido: guarda o antigo e abre um novo.
      if (prev) next.push({ ...prev, key: `${prev.key}#${prev.resolution?.at ?? prev.lastSeenAt}` });
      next.push({
        id: newId(),
        ...f,
        status: "aberto",
        firstSeenAt: at,
        lastSeenAt: at,
        occurrences: 1,
        resolution: null,
      });
    }
  }
  for (const a of existing) {
    if (seen.has(a.key)) continue;
    if (a.status === "aberto") {
      next.push({ ...a, status: "resolvido", resolution: { by: "sistema", at, note: "A condição deixou de ocorrer na última avaliação.", action: "resolvido_automaticamente" } });
    } else {
      next.push(a);
    }
  }
  // Mantém o histórico enxuto: resolvidos há mais de 90 dias saem da lista.
  return next.filter((a) => a.status !== "resolvido" || !a.resolution || now.getTime() - new Date(a.resolution.at).getTime() < 90 * 86400_000);
}

export function evaluateAlerts(db: AdminDb, now = new Date()): AdminDb {
  return { ...db, alerts: reconcileAlerts(db.alerts, findIssues(db, now), now) };
}
