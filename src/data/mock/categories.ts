import type { Category } from "@/types/catalog";

/** Hierarquia genérica: novas abas (ex.: "Areia e higiene") entram como novas raízes. */
export const categories: Category[] = [
  { id: "cat-alimentacao", slug: "alimentacao", name: "Alimentação", parentId: null, status: "active", sortOrder: 1 },
  { id: "cat-racao-seca", slug: "racao-seca", name: "Ração seca", parentId: "cat-alimentacao", status: "active", sortOrder: 1 },
  { id: "cat-racao-umida", slug: "racao-umida", name: "Ração úmida", parentId: "cat-alimentacao", status: "active", sortOrder: 2 },
  { id: "cat-petiscos", slug: "petiscos", name: "Petiscos e snacks", parentId: "cat-alimentacao", status: "active", sortOrder: 3 },
  { id: "cat-dietas-vet", slug: "dietas-veterinarias", name: "Dietas veterinárias", parentId: "cat-alimentacao", status: "active", sortOrder: 4 },
  { id: "cat-areia-higiene", slug: "areia-e-higiene", name: "Areia e higiene", parentId: null, status: "coming_soon", sortOrder: 2 },
  { id: "cat-mercado", slug: "mercado", name: "Mercado", parentId: null, status: "coming_soon", sortOrder: 3 },
];
