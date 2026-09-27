import type { Metadata } from "next";

import { btn, Flash, input, PageHeader, Tag } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { integrationState } from "@/lib/admin/checks";
import { adminRepo } from "@/lib/admin/repository";

import { storeRulesAction } from "../../actions";

export const metadata: Metadata = { title: "Lojas e integrações" };

const KIND_LABEL = { api_oficial: "API oficial", feed_afiliado: "Feed da rede de afiliados", somente_manual: "Somente manual" } as const;

export default async function StoresPage({ searchParams }: PageProps<"/admin/lojas">) {
  await requireAdmin();
  const [db, sp] = await Promise.all([adminRepo.read(), searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lojas e integrações"
        description="Frequência de consulta, prazo para considerar o preço desatualizado e regra para ocultar ofertas antigas. Credenciais ficam só em variáveis de ambiente do servidor: esta tela mostra apenas se existem."
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />
      <ul className="space-y-4">
        {db.stores.map((s) => {
          const st = integrationState(s);
          const offers = db.offers.filter((o) => o.storeId === s.id);
          return (
            <li key={s.id} className="rounded-md border">
              <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                <h2 className="font-display font-semibold">{s.name}</h2>
                <Tag>{KIND_LABEL[s.integration.kind]}</Tag>
                {st.status === "configurada" ? (
                  <Tag tone="good">Configurada</Tag>
                ) : st.status === "somente_manual" ? (
                  <Tag>Cadastro manual</Tag>
                ) : st.status === "credenciais_sem_conector" ? (
                  <Tag tone="warn">Credenciais presentes · conector não implementado</Tag>
                ) : (
                  <Tag tone="warn">Pendente de configuração</Tag>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{offers.length} oferta(s)</span>
              </div>
              <div className="grid gap-4 p-3 lg:grid-cols-[1fr_22rem]">
                <div className="space-y-2 text-sm">
                  <p>{s.integration.description}</p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Condições da plataforma:</span> {s.integration.terms}
                  </p>
                  {s.integration.requiredEnv.length > 0 && (
                    <p className="text-xs">
                      <span className="font-medium">Variáveis necessárias:</span>{" "}
                      {s.integration.requiredEnv.map((k) => (
                        <code key={k} className={"mr-1.5 rounded px-1 " + (st.missingEnv.includes(k) ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100" : "bg-emerald-50 text-emerald-900")}>
                          {k} {st.missingEnv.includes(k) ? "(ausente)" : "(definida)"}
                        </code>
                      ))}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Programa de afiliados: {s.affiliateProgram ?? "nenhum conhecido"}. Domínios aceitos: {s.domains.join(", ")}.</p>
                  <p className="text-xs text-muted-foreground">Sem integração ativa, preços e links são cadastrados manualmente na ficha do produto. Não há coleta de páginas.</p>
                </div>
                <form action={storeRulesAction} className="grid grid-cols-3 gap-2 self-start text-xs lg:grid-cols-1">
                  <input type="hidden" name="id" value={s.id} />
                  <label className="space-y-1">
                    <span className="font-medium">Consultar a cada (h)</span>
                    <input name="frequencia" type="number" min={1} defaultValue={s.frequencyHours} className={input} />
                  </label>
                  <label className="space-y-1">
                    <span className="font-medium">Desatualizada após (h)</span>
                    <input name="desatualizada" type="number" min={1} defaultValue={s.staleAfterHours} className={input} />
                  </label>
                  <label className="space-y-1">
                    <span className="font-medium">Ocultar após (h, vazio = nunca)</span>
                    <input name="ocultarApos" type="number" min={1} defaultValue={s.hideStaleAfterHours ?? ""} className={input} />
                  </label>
                  <div className="col-span-3 lg:col-span-1">
                    <button className={btn.secondary} type="submit">
                      Salvar regras
                    </button>
                  </div>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
