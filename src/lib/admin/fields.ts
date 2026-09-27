import type { AutoValue, FieldState, Verification } from "./types";

/**
 * Regras de convivência entre valor automático e correção manual.
 * Funções puras: recebem o estado atual e devolvem o novo estado + o que aconteceu,
 * para quem chamou registrar histórico e alertas. Testadas em tests/admin-fields.test.ts.
 */

export function emptyField<T>(verification: Verification = "pendente"): FieldState<T> {
  return { value: null, auto: null, manual: null, locked: false, reviewAt: null, pendingAuto: null, verification };
}

export function fieldFrom<T>(value: T | null, source: string, at: string, verification: Verification): FieldState<T> {
  return {
    value,
    auto: value == null ? null : { value, source, at },
    manual: null,
    locked: false,
    reviewAt: null,
    pendingAuto: null,
    verification: value == null ? "pendente" : verification,
  };
}

export function sameValue(a: unknown, b: unknown) {
  if (a == null && b == null) return true;
  if (typeof a === "string" && typeof b === "string") return a.trim() === b.trim();
  return a === b;
}

export type AutoOutcome =
  /** Igual ao exibido: só renova a leitura. */
  | "unchanged"
  /** Sem correção manual: o valor automático passa a ser exibido. */
  | "applied"
  /** Havia correção manual sem trava: substituída, com registro (nunca em silêncio). */
  | "replaced_manual"
  /** Campo travado ou sensível: novo valor guardado como pendente de aprovação. */
  | "held"
  /** Leitura vazia/inválida: nada muda (um erro não apaga o valor anterior). */
  | "ignored_empty";

export interface AutoResult<T> {
  field: FieldState<T>;
  outcome: AutoOutcome;
  previous: T | null;
}

/**
 * Aplica um valor vindo de uma importação.
 * `sensitive` = campos que nunca trocam sem revisão (marca, sabor, peso, imagem, vínculo).
 */
export function applyAutoValue<T>(
  field: FieldState<T>,
  incoming: T | null | undefined,
  source: string,
  at: string,
  { sensitive = false }: { sensitive?: boolean } = {},
): AutoResult<T> {
  const previous = field.value;
  if (incoming == null || (typeof incoming === "number" && !(incoming > 0)) || (typeof incoming === "string" && !incoming.trim())) {
    return { field, outcome: "ignored_empty", previous };
  }
  const auto: AutoValue<T> = { value: incoming, source, at };

  if (sameValue(incoming, field.value)) {
    return { field: { ...field, auto, pendingAuto: null }, outcome: "unchanged", previous };
  }
  if (field.locked || (sensitive && field.value != null)) {
    return { field: { ...field, pendingAuto: auto }, outcome: "held", previous };
  }
  if (field.manual) {
    return {
      field: { ...field, value: incoming, auto, manual: null, pendingAuto: null },
      outcome: "replaced_manual",
      previous,
    };
  }
  return { field: { ...field, value: incoming, auto, pendingAuto: null }, outcome: "applied", previous };
}

/** Correção manual. Por padrão trava o campo para a próxima importação não sobrescrever. */
export function applyManualValue<T>(
  field: FieldState<T>,
  value: T | null,
  by: string,
  at: string,
  { lock = true, note, reviewAt }: { lock?: boolean; note?: string; reviewAt?: string | null } = {},
): FieldState<T> {
  return {
    ...field,
    value,
    manual: { value, by, at, note },
    locked: lock,
    reviewAt: reviewAt === undefined ? field.reviewAt : reviewAt,
    // Quem corrige à mão confirmou o dado; valor vazio volta a ser pendente.
    verification: value == null || value === "" ? "pendente" : field.verification === "verificado" ? "verificado" : field.verification,
  };
}

/** Aceita o valor automático pendente (ou o último automático) e remove a correção manual. */
export function acceptAutoValue<T>(field: FieldState<T>): FieldState<T> {
  const candidate = field.pendingAuto ?? field.auto;
  if (!candidate) return field;
  return { ...field, value: candidate.value, auto: candidate, manual: null, locked: false, pendingAuto: null, reviewAt: null };
}

export function setLock<T>(field: FieldState<T>, locked: boolean): FieldState<T> {
  return { ...field, locked };
}

export function setReviewDate<T>(field: FieldState<T>, reviewAt: string | null): FieldState<T> {
  return { ...field, reviewAt };
}

/** Origem legível do valor exibido. */
export function displayedOrigin(field: FieldState<unknown>): string {
  if (field.manual && sameValue(field.manual.value, field.value)) return `Correção manual (${field.manual.by})`;
  if (field.auto && sameValue(field.auto.value, field.value)) return field.auto.source;
  return field.value == null ? "Sem valor" : "Desconhecida";
}
