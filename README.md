# Ração Certa — comparador de preços de ração para cães e gatos

Site brasileiro para encontrar o menor preço da ração que a pessoa já compra, com painel administrativo em `/admin`.

**Stack:** Next.js 16 (App Router, páginas no servidor) · TypeScript · Tailwind CSS v4 · SQLite embutido no Node.js (`node:sqlite`, Node 22.13 ou mais novo: nada para compilar na instalação) com migrações em SQL · Vitest.
Escolhi manter o Next.js que já estava no projeto (páginas públicas rápidas e boas para busca, painel e rotas de API no mesmo app)
e usar SQLite: persistência real num arquivo, sem serviço extra para subir. Para hospedar sem disco persistente (serverless),
troque o banco por Postgres mantendo as mesmas tabelas (`db/migrations`).

## Regra central

- **Produto** = a ração exata: espécie + marca + linha + indicação + sabor + peso (+ versão para castrados). GTIN/EAN opcional.
  A combinação é única no banco (`identity_key`); outro peso, sabor ou versão castrado é outro produto.
- **Oferta** = o anúncio desse produto numa loja: preço, moeda, horário e origem do preço, preço anterior (só quando registrado),
  disponibilidade, URL original, link de afiliado (separado, nunca derivado da URL), selo de frete grátis do anúncio,
  peso e sabor do anúncio, origem dos dados (manual, arquivo ou API) e última verificação.
- Peso ou sabor do anúncio diferente do produto marca a oferta como **correspondência incerta** e gera alerta.

## Instalação

```bash
npm install
npm run configurar   # pergunta e-mail e senha do painel e cria o .env.local (segredos gerados sozinhos)
npm run dev          # http://localhost:3000  ·  painel: /admin
```

Na primeira abertura o banco (`.data/racao.db`) é criado com as migrações, as 6 lojas e as rações reais do cadastro inicial
(sem preço). Os **dados de exemplo** (produtos e ofertas marcados `is_demo`, com selo “Exemplo” no site) só entram com
`SEED_DEMO=1` ou com `npm run db:reset`; o `.env.example` já vem com `SEED_DEMO=0`.
Os comandos `npm run db:*` leem o mesmo `.env.local` do site, então mexem no mesmo banco.
O cadastro inicial roda uma única vez; depois de `db:zerar` o catálogo continua vazio.

Guia para quem não é técnico (zerar e cadastrar rações do Mercado Livre): [`docs/PASSO-A-PASSO.md`](docs/PASSO-A-PASSO.md).

| Comando | O que faz |
|---|---|
| `npm run db:migrate` | aplica migrações pendentes |
| `npm run db:zerar` | apaga todos os produtos, ofertas e acessos (lojas ficam); pede confirmação |
| `npm run db:reset` | recria o banco local do zero, com o cadastro inicial e os exemplos (sempre com exemplos) |
| `npm run db:sem-exemplos` | remove produtos e ofertas de exemplo (também há botão em Produtos) |
| `npm run precos:atualizar` | roda a atualização de preços uma vez |
| `npm test` · `npm run lint` · `npm run typecheck` · `npm run build` | verificações |

### Variáveis de ambiente

Veja `.env.example`. Todas ficam no servidor: nenhuma chave vai para o navegador.
Obrigatórias para o painel: `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`. Para a atualização programada: `CRON_SECRET`.

## Painel (`/admin`)

Login por e-mail e senha definidos no servidor (senha só em hash scrypt, sessão em cookie assinado de 8 h, limite de tentativas).
`src/proxy.ts` bloqueia `/admin` e cada página e ação confere a sessão de novo.

- **Produtos**: pesquisar, filtrar, criar, editar, ativar/desativar em lote, remover exemplos.
- **Nova oferta** (no produto): colar a URL do anúncio → loja detectada pelo domínio e ID extraído quando o formato permite
  → revisar preço, disponibilidade, selo de frete, link de afiliado, peso e sabor do anúncio → salvar.
- **Oferta**: editar tudo; em ofertas importadas cada alteração vira **correção manual** (quem, quando, motivo), que a próxima
  sincronização não apaga; botão **Voltar ao valor automático** por campo; histórico; **Atualizar agora** quando a integração está ativa.
- **Ofertas e alertas**: preço antigo, anúncio indisponível, erro de importação, sem link de afiliado ou link inválido,
  possível produto errado, peso ou sabor diferente, sem preço.
- **Lojas**: status de cada integração e o que ela consegue fazer, variáveis que faltam, prazo de atualização (48 h),
  validade da cotação de frete, nova loja (domínios, modo manual/arquivo/API), importação de CSV, últimas execuções.
- **Dados**: buscas, rações e marcas mais procuradas, cliques por loja e comissão estimada (sem dados pessoais).

## Atualização de preços

Chame de hora em hora (cron do servidor, Vercel Cron, GitHub Actions):

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://SEU-SITE/api/cron/precos
```

Só as ofertas vencidas (prazo configurável, padrão 48 h) das lojas com API ativa são consultadas. As lojas rodam em paralelo
e uma falha não bloqueia as outras; cada consulta tem tempo limite, limite de chamadas, cache curto e novas tentativas só
para erros temporários. Falha (403, mudança de API, rede) **mantém o último preço válido**, conta falhas e gera alerta.
Depois do prazo o site mostra o preço como desatualizado.

## Integrações

Interface única em `src/lib/integrations/types.ts` (`OfferSource`), com um adaptador por loja em `src/lib/integrations/adapters/`.
Cada adaptador informa se consegue buscar anúncios, atualizar preço, consultar disponibilidade, cotar frete por CEP e gerar link
de afiliado. Nova loja com API: novo arquivo em `adapters/` + uma linha em `src/lib/integrations/index.ts`.

| Loja | Caminho que funciona hoje | Para ativar |
|---|---|---|
| Mercado Livre | Manual | Criar aplicativo em developers.mercadolivre.com.br, autorizar a conta e preencher `MERCADOLIVRE_CLIENT_ID`, `MERCADOLIVRE_CLIENT_SECRET`, `MERCADOLIVRE_REFRESH_TOKEN`. O adaptador usa `GET /items/{id}` (preço, status, estoque, frete grátis, atributos) e `GET /items/{id}/shipping_options?zip_code=` (frete por CEP). O link de afiliado vem do painel de afiliados e é colado na oferta. |
| Shopee | Manual | Com acesso à Affiliate Open API: `SHOPEE_AFFILIATE_APP_ID`, `SHOPEE_AFFILIATE_SECRET` e `SHOPEE_AFFILIATE_ENABLED=1`; em Lojas, mude a Shopee para “API” com o adaptador Shopee. Traz preço e link de afiliado; não traz estoque nem frete por CEP. Preço em faixa (variações) não é importado. Confirme os campos na documentação da sua conta antes. |
| Amazon | Manual, **sem preço público** | O site só mostra preço da Amazon obtido pela API oficial e recente (regra `somente_api`). Exige conta aprovada no Associados e a implementação da Creators API conferida com a documentação da conta; até lá a integração fica “pendente”. |
| Petz, Cobasi, Petlove | Manual | Arquivo CSV ou feed autorizado: em Lojas, mude para “Arquivo / feed” com o adaptador CSV e importe (colunas `id_anuncio, preco, disponivel, titulo, frete_gratis`). Só atualiza ofertas já cadastradas. |

Nenhuma loja depende de raspagem de páginas.

## O que é real, o que é exemplo e o que depende das plataformas

**Funcional com dados reais**
- Cadastro de produtos, ofertas, lojas, correções e histórico, gravados no banco (persistem ao recarregar e reiniciar).
- 19 rações reais no cadastro inicial (nome, linha, indicação, sabor e peso tirados de páginas de lojas e fabricantes; URLs de fonte em cada produto; conferir na embalagem antes de publicar preço). O Hill's Science Diet ficou de fora: as fontes divergem no peso (2,4 × 2,04 kg).
- Ofertas cadastradas manualmente ou por CSV aparecem no site e o “Ver oferta” leva ao link salvo (afiliado, senão a URL original).
- Busca tolerante, filtros, ordenações, preço por kg, prazo de atualização, alertas, métricas de uso e pedidos de “Avisar oferta”.

**Dados de exemplo (claramente marcados)**
- Todas as ofertas com preço do cadastro inicial e 20 produtos extras: selo “Exemplo”, faixa no topo do site, não levam a
  nenhuma loja e ficam fora dos dados estruturados de preço. Remova em Produtos → “Remover dados de exemplo”.
- Acessos fictícios da tela Dados (botão próprio, sempre com o selo “Demonstração”).

**Depende de acesso ou aprovação**
- Mercado Livre: aplicativo e autorização OAuth (adaptador pronto e testado com respostas simuladas; não testado contra a API real).
- Shopee: acesso à Affiliate Open API (adaptador pronto, não testado contra a API real).
- Amazon: conta aprovada e implementação da API oficial (pendente).
- Petz, Cobasi, Petlove: arquivo ou feed autorizado (importação pronta).
- Frete por CEP: só com a integração do Mercado Livre ativa; nas outras lojas o site diz “frete não cotado”.
- Envio dos e-mails de “Avisar oferta”: serviço de e-mail (`EMAIL_API_KEY`, `EMAIL_FROM`) e rotina de envio.
- Logotipos de lojas e marcas: arquivos com autorização de uso (hoje, selos com iniciais).

## Estrutura

```
db/migrations/              SQL versionado (aplicado na abertura ou com npm run db:migrate)
scripts/                    db.ts (migrar, recriar, remover exemplos, atualizar preços) e hash de senha
src/app/(site)/             site público: início, produto, /ir (saída para a loja), institucionais
src/app/admin/              painel: produtos, ofertas e alertas, lojas, dados, login
src/app/api/                eventos de uso, frete por CEP, avisos de preço, cron de preços
src/lib/db/                 conexão, migrações e cadastro inicial
src/lib/domain/             produtos, ofertas (correções e sincronização), lojas, alertas, validações
src/lib/integrations/       interface única, adaptadores por loja, cliente HTTP, sincronização, CSV
src/lib/catalog/public.ts   o que o site mostra (regras de exibição de preço, desatualizado, exemplo)
tests/                      Vitest: domínio, integrações, busca, relatórios
```

Para cerca de 1.500 produtos: o catálogo público vai ao navegador em formato compacto (sem links de afiliado) e a busca
roda no navegador; se crescer bem além disso, mova a busca para o servidor (`src/lib/comparator/search.ts` é função pura).
