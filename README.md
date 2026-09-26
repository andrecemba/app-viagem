# Comparador de preços de ração (cães e gatos) — Fase 0

Front-end navegável com **dados de exemplo** para avaliar visual e experiência.
Ainda sem Supabase, robôs de coleta, APIs de afiliados ou autenticação.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · componentes no padrão shadcn/ui (Radix) · lucide-react · Recharts · Vitest.

## Como rodar

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # testes das funções puras (Vitest)
npm run lint && npm run typecheck && npm run build
```

Para ver no celular da mesma rede: `npm run dev -- -H 0.0.0.0` e acesse `http://IP-DO-COMPUTADOR:3000`.

## Telas para revisar

| Tela | Endereço de exemplo |
|---|---|
| Home (funil de espécie + ofertas do dia) | `/` |
| Funil + resultados (etapas com ícones, contadores, “Todas”, chips, lojas, ordenação) | `/caes`, `/caes/racao-seca/adulto/medio`, `/gatos/racao-seca/castrado` |
| Dietas veterinárias (aviso) | `/caes/dietas-veterinarias` |
| Lista vazia | `/gatos/racao-seca/castrado/economica` |
| Página do produto (comparação, histórico, embalagens, Compre junto, Kit do mês) | `/produto/royal-canin-mini-adult-7-5-kg`, `/produto/golden-gatos-castrados-10-1-kg` |
| Painel pós-clique “Aproveite e leve também” | clique em **Ver oferta** em qualquer produto |
| Redirecionamento simulado (mostra a URL de afiliado em `npm run dev`) | `/ir/of-002-amazon`, `/ir/of-001-mercado-livre` |
| Marca / lista de marcas | `/marca/golden`, `/marcas` |
| Calculadora de gasto mensal | `/calculadora`, `/calculadora?produto=three-dogs-original-adultos-15-kg` (sem tabela → pede g/dia) |
| Institucionais | `/sobre`, `/faq`, `/divulgacao-de-afiliados`, `/contato`, `/termos`, `/privacidade`, `/cookies` |
| 404 | `/qualquer-coisa` |

Tema claro/escuro no ícone de sol/lua. Estados de carregamento aparecem ao navegar no funil e nos produtos.

## Estrutura

```
src/
  app/                      rotas (App Router)
    [especie]/[[...filtros]]  funil: /caes/racao-seca/adulto/medio/premium/golden
    produto/[slug]            página do produto
    ir/[offerId]              saída para a loja (simulada na Fase 0)
    api/relacionados          itens da mesma loja para o painel pós-clique
  components/               UI (ui/ = base shadcn; funnel/, offers/, product/…)
  config/                   site.ts (nome, textos) e taxonomy.ts (vocabulário do funil)
  data/mock/                dados fictícios tipados (marcas, lojas, produtos, ofertas, histórico, complementares)
  lib/
    data/                   camada de dados: DataSource + mock-source (trocar por Supabase na Fase 1)
    affiliate/              buildAffiliateUrl (cadeia API → manual → regra → comum) + config por env
    pricing/                preço/kg, ordenação honesta (empate de 1%), selos, calculadora
    related/                ranking do “Compre junto” (relevância × comissão, mesma loja, diversidade)
    funnel/                 leitura/escrita da URL do funil
  types/catalog.ts          modelo de dados (espelha as tabelas planejadas)
tests/                      Vitest
```

### Como a camada de dados será trocada

Componentes e páginas só importam de `@/lib/data` (`getOffers(filtros)`, `getProduct(slug)`, `getRelated(produto, loja)`…).
Essas funções seguem a interface `DataSource` (`src/lib/data/types.ts`). Na Fase 1 basta criar `supabase-source.ts`
implementando a mesma interface e trocar uma linha em `src/lib/data/index.ts`.

## Regras de negócio já refletidas no front

- Ordenação sempre pelo menor preço unitário; a comissão só desempata diferenças de até 1% (`rankOffersHonestly`, com testes).
- Todo link de saída passa por `/ir/[offerId]`, com `rel="sponsored nofollow noopener"` e `target="_blank"`.
- O painel pós-clique não é modal, não atrasa o redirect e não tem contagem regressiva.
- “Compre junto” com rótulo “Sugestões — podemos receber comissão por compras”.
- Ofertas suspeitas (`status: pending_review`) não aparecem no site.
- Logos: placeholder com iniciais e cor; ícones próprios/lucide; nenhuma imagem de terceiros.

## TODOs que dependem de você

- [ ] Nome definitivo do site (`NEXT_PUBLIC_SITE_NAME`) e domínio.
- [ ] Amazon: confirmar o percentual de **Pet Shop** na tabela oficial do Associados (o mock usa 11%, conforme o briefing) e criar as tags por categoria. A PA-API foi substituída pela **Creators API**, que exige vendas qualificadas recentes para liberar acesso.
- [ ] Mercado Livre: não há API pública oficial para gerar link de afiliado — os links são gerados no painel do afiliado e cadastrados pelo admin (passo 2 da cadeia). Confirmar o percentual da categoria pet.
- [ ] Shopee: criar credenciais da Affiliate Open API (GraphQL em `open-api.affiliate.shopee.com.br`) — `productOfferV2` (busca) e `generateShortLink` (link curto).
- [ ] Petz: confirmar se o Parceiro Petz permite deeplink direto para produto.
- [ ] Cobasi/Awin: exige CNPJ; obter `awinaffid` e o `awinmid` da Cobasi.
- [ ] Petlove e Magalu: verificar se há programa ativo (hoje tratadas como loja de referência).
- [ ] Supermercado de referência em Curitiba (o mock usa o fictício “Mercado Exemplo”).
- [ ] Textos legais (Termos, Privacidade/LGPD, Cookies) estão provisórios — revisar com assessoria jurídica.

## Próximas fases (esboço)

1. **Fundação** — migrations Supabase (`categories`, `brands`, `product_lines`, `products`, `stores`, `offers`, `price_history`,
   `commission_rates`, `complementary_rules`, `clicks`, `contact_messages`) com RLS; seed; `supabase-source.ts`; `/ir/[offerId]`
   como Route Handler (registra clique + 302); contato gravando no banco.
2. **Coleta Amazon + Mercado Livre + Shopee** — worker em `/workers` (fetch/JSON; Playwright só se necessário), parser de peso
   com testes e fallback LLM com cache, histórico, GitHub Actions a cada 2 dias + quintas.
3. **Admin** — Supabase Auth + papel admin; fila de revisão, “ofertas sem link de afiliado” por cliques, auditoria diária de links, relatórios.
4. **Lojas pet, calculadora com tabelas reais e SEO completo** (ISR, sitemap, Product/AggregateOffer em todas as páginas).
5. **Alertas de queda de preço** (e-mail/Telegram; WhatsApp só via API oficial com opt-in).
