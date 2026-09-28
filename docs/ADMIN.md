# Área administrativa (`/admin`)

Painel privado com **dois itens**:

- **Produtos**: cadastro da ração por tópicos (os mesmos que o cliente vê na página do produto) e os preços e links de
  cada loja.
- **Dados**: o que as pessoas procuram no site, para quais lojas vão e quanto isso pode gerar de comissão.

Fica separado do site público: rotas em `src/app/admin`, layout próprio, `noindex` e bloqueado no `robots.txt`.

## Produtos

Uma ficha = uma embalagem exata (outro sabor ou peso = outra ficha). O formulário segue os tópicos da página pública:

| # | Tópico | Campos |
|---|---|---|
| 1 | Identificação | marca*, linha, fórmula*, sabor |
| 2 | Para quem | espécie*, idade*, porte (só cães) |
| 3 | Tipo de alimento | seca, natural, úmida ou medicamentosa*; indicação veterinária |
| 4 | Embalagem | peso líquido*, unidades (caixas de sachê) |
| 5 | Indicações | castrados, controle de peso, pele sensível, digestão sensível, trato urinário, sem grãos, sem corantes; tamanho do grão |
| 6 | Descrição | texto para o cliente |
| 7 | Códigos e foto | GTIN/EAN, SKU, foto (https) |
| 8 | Fontes e conferência | fontes, observações, “conferi na embalagem ou no fabricante” |

\* obrigatório para publicar. Campo vazio aparece como **Pendente de verificação** no admin e “Não informado” no site;
nada é preenchido por semelhança com outra embalagem.

**Preços nas lojas**: loja, preço, link de afiliado (ou link comum), vendedor e disponível. O link precisa ser do domínio
da loja escolhida (ex.: `petz.com.br` para Petz). Cada mudança de preço fica no histórico (90 dias) e alimenta a
“média de 30 dias” usada na observação *Preço normal / X% abaixo da média / X% acima da média* (±5% = normal).

O link **nunca vai para o navegador**: o site mostra “Ir à loja”, que passa por `/ir/<id>`, conta o clique e redireciona
(302) para o link cadastrado.

## Dados

Registrados sem dados pessoais (sem IP, cookie ou identificação; buscas com cara de e-mail, telefone ou documento são
descartadas; robôs e pré-carregamentos não contam):

| Evento | Onde nasce | O que guarda |
|---|---|---|
| Busca | campo de busca, 1,5 s depois de parar de digitar | termo e quantas embalagens apareceram |
| Filtro | ao marcar uma opção | dimensão e valor |
| Visita a produto | página do produto | ração, marca, tipo, porte, peso |
| Clique | `/ir/<oferta>` | ração, loja, preço na hora e se havia link |

Relatórios (7, 30 ou 90 dias): **cliques nos links das lojas** (principal, com gráfico por dia), plataformas mais
direcionadas, rações e marcas mais procuradas, tamanho da embalagem, tipo, porte, termos mais buscados e buscas sem
resultado.

**Comissão estimada** = valor dos produtos clicados × conversão × comissão da loja. As taxas são digitadas na própria tela
(as do contrato de cada programa); loja sem taxa fica fora da conta. É uma estimativa: as lojas não informam as vendas a
este site — o valor real está no painel de cada programa de afiliados.

**Demonstração**: “Carregar dados de demonstração” gera 90 dias de acessos **fictícios** num arquivo separado, sempre
exibidos com o selo “Demonstração”. “Remover” apaga esse arquivo; os dados reais não são tocados.

## O que está pronto e o que falta conectar

| Parte | Hoje | Para produção |
|---|---|---|
| Acesso | Um administrador (e-mail e senha em variáveis de ambiente), sessão em cookie assinado de 8 h, `proxy.ts` + checagem em cada página e ação, limite de tentativas. | Vários usuários ou recuperação de senha: serviço de autenticação (ex.: Supabase Auth), mantendo `requireAdmin()`. |
| Dados do admin | Arquivo JSON em `.data/admin-db.json` (fora do git), gravação atômica. Um arquivo do modelo antigo é guardado como `.v1.bak` e o cadastro recomeça dos 20 produtos. | **Banco de dados** (o disco de hospedagem serverless é apagado). Implementar `AdminRepository`. |
| Eventos | Arquivos `.data/eventos.jsonl` e `eventos-demo.jsonl`. | Tabela no banco (mesmo formato de `AnalyticsEvent`). |
| Site público | Dados de exemplo por padrão. Com `CATALOGO_PUBLICO=admin`, mostra só rações **publicadas** e completas, com os preços cadastrados. | Ligar `CATALOGO_PUBLICO=admin` quando houver rações publicadas com preço. |
| Preços | Cadastro manual. | Integrações oficiais por loja (abaixo). Nenhuma coleta de páginas. |
| Logotipos | Selos com iniciais e cor (marcas e lojas). | Arquivos autorizados em `public/marcas/` e `public/lojas/` (campo `logo` em `src/config/stores.ts` e nas marcas). |

### Integrações que dependem das lojas

| Loja | Fonte autorizada | Situação |
|---|---|---|
| Amazon | API oficial do Amazon Associados (Creators API) | Exige conta aprovada e vendas qualificadas. |
| Mercado Livre | API de itens com aplicativo registrado; link gerado no painel de afiliados | Pendente de aplicativo. |
| Cobasi | Feed da Awin, se o anunciante aprovar | Pendente de aprovação. |
| Petz, Petlove, Magalu, Shopee | Nenhuma fonte confirmada aqui | Cadastro manual. |

## Configuração

```bash
cp .env.example .env.local
npm run admin:hash-senha -- "uma senha longa"   # cole em ADMIN_PASSWORD_HASH
openssl rand -base64 48                            # ADMIN_SESSION_SECRET
npm run dev                                        # http://localhost:3000/admin
```

## Os 20 produtos do cadastro inicial

Em `src/data/admin/seed-products.ts`, cada um com URLs de loja ou fabricante que trazem nome, fórmula e peso. Foram
localizados por busca na web em 27/09/2026; as páginas não puderam ser abertas no ambiente de desenvolvimento (domínios
bloqueados). Por isso nenhum está marcado como conferido, e GTIN, grão, descrição e foto estão vazios. Divergências
ficam vazias e anotadas: peso do Hill's Science Diet (2,4 kg × 2,04 kg) e nome da fórmula PremieR Gatos Castrados.
Gatos “castrados” viraram idade *adulto* + indicação *Castrados* (todas as fontes dizem “adultos castrados”).

## Avisar oferta

Botão âmbar “Avisar oferta” na página do produto (em cima da lista de lojas) e “Avisar ofertas no meu e-mail” no
Top descontos. A pessoa informa o e-mail, escolhe “qualquer queda” ou um preço desejado e autoriza o envio. O pedido é
validado no servidor e guardado em `.data/avisos.jsonl` (e-mail só no servidor; o admin vê contagens em **Dados**).

**Falta conectar:** um serviço de envio de e-mail (ex.: Resend, Amazon SES) com `EMAIL_API_KEY` e `EMAIL_FROM`, uma
rotina que compare os preços com os pedidos e envie o aviso, e o link de cancelamento em cada e-mail. Sem essas
variáveis, a tela avisa que o envio ainda não está ligado.
