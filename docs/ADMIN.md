# Área administrativa (`/admin`)

Painel privado para cadastrar rações, acompanhar ofertas, administrar links de afiliado e corrigir problemas.
Fica separado do site público: rotas em `src/app/admin`, layout próprio, sem cabeçalho/rodapé do comparador,
`noindex` e bloqueado no `robots.txt`.

## O que está pronto e o que falta conectar

| Parte | Situação hoje | O que falta para produção |
|---|---|---|
| Acesso | Login por e-mail e senha de **um administrador**, definidos em variáveis de ambiente. Sessão em cookie assinado (HMAC-SHA256), `httpOnly`, `SameSite=Strict`, 8 h. O `src/proxy.ts` bloqueia `/admin` e `/api/admin`, e cada página e ação confere a sessão de novo no servidor. Limite de 5 tentativas por IP a cada 15 min (em memória). | Para vários usuários, papéis ou recuperação de senha: trocar por um serviço de autenticação (ex.: Supabase Auth) mantendo `requireAdmin()` como ponto único. O limite de tentativas precisa de armazenamento compartilhado se houver mais de um servidor. |
| Dados | Arquivo JSON no servidor (`.data/admin-db.json`, fora do git), com gravação atômica e fila de escrita. Criado na primeira abertura com os 20 produtos reais. | **Banco de dados.** O arquivo não serve para hospedagem serverless (disco efêmero) nem para vários servidores. Implementar `AdminRepository` (`src/lib/admin/repository.ts`) sobre Postgres/Supabase; as telas não mudam. |
| Site público | Continua lendo os dados de exemplo (`src/lib/data`). A ficha mostra uma prévia do cartão público. | Fazer `src/lib/data` ler os produtos **publicados** e as ofertas **reais, visíveis e disponíveis** deste catálogo. Ofertas de demonstração nunca devem ir para o site (`demo: true`). |
| Atualização automática | Motor pronto: frequência por loja (padrão 48 h), prazo de desatualização, regra opcional de ocultar, histórico, execuções e alertas. **Nenhum conector real implementado.** Sem conector, a execução registra “integração pendente de configuração” e **não consulta nada**. | Implementar um `StoreConnector` por loja (`src/lib/admin/checks.ts`, objeto `realConnectors`) usando **somente** API ou feed autorizado, com as credenciais abaixo. Não há coleta de páginas prevista. |
| Agendamento | Rota `POST /api/admin/cron` com `Authorization: Bearer $CRON_SECRET`. Sem `CRON_SECRET`, a rota responde 503. | Chamar a rota de hora em hora (Vercel Cron, GitHub Actions ou cron do servidor); cada loja só é consultada quando vence a própria frequência. |
| Links de afiliado | Cadastro e correção manuais, com alertas para vazio, malformado, domínio errado, quebrado ou redirecionando para outro produto. | A checagem de “quebrado” e “redireciona para outro produto” depende do conector de cada loja (ou de uma verificação de redirecionamento autorizada). |
| Imagens | Campo de URL (https) com prévia e alerta de ausente/quebrada. | Armazenamento de arquivos (ex.: Supabase Storage) e confirmação de direito de uso da foto oficial. |

## Integrações por loja

Todas aparecem em **Lojas e integrações** como “Pendente de configuração” ou “Somente manual”.

| Loja | Fonte prevista | Variáveis | Observação |
|---|---|---|---|
| Amazon | API oficial do Amazon Associados (Creators API) | `AMAZON_CREATORS_API_CLIENT_ID`, `AMAZON_CREATORS_API_CLIENT_SECRET`, `AMAZON_TAG_RACAO` | Exige conta aprovada; respeitar limites e regras de exibição de preço. |
| Mercado Livre | API de itens com aplicativo registrado (OAuth) | `MERCADOLIVRE_CLIENT_ID`, `MERCADOLIVRE_CLIENT_SECRET`, `MERCADOLIVRE_REFRESH_TOKEN` | Links de afiliado são gerados no painel de afiliados e colados na oferta. |
| Cobasi | Feed da rede de afiliados, se aprovado | `AWIN_API_TOKEN`, `AWIN_AFFILIATE_ID`, `AWIN_MID_COBASI` | Depende de aprovação do anunciante. |
| Petz | Nenhuma fonte autorizada confirmada | — | Somente manual até haver feed ou API do programa. |
| Petlove | Nenhuma fonte autorizada confirmada | — | Somente manual. |

Credenciais ficam só em variáveis de ambiente do servidor. A tela mostra apenas se cada variável existe, nunca o valor.

## Configuração

```bash
cp .env.example .env.local
npm run admin:hash-senha -- "uma senha longa"   # cole o resultado em ADMIN_PASSWORD_HASH
openssl rand -base64 48                            # ADMIN_SESSION_SECRET
openssl rand -hex 24                               # CRON_SECRET (opcional)
npm run dev                                        # http://localhost:3000/admin
```

O hash usa o formato `scrypt:<sal>:<hash>` (sem `$`, que arquivos `.env` interpretam).

## Regras de dados

- **Produto canônico** = marca + linha + fórmula + espécie + fase + porte + sabor + peso. Outro sabor ou peso é outra ficha.
- **Oferta** = anúncio desse produto numa loja: identificador externo, vendedor, preço, disponibilidade, URL original,
  link de afiliado, última consulta e origem dos dados.
- **Histórico** = preços, verificações, importações e edições, com data, resultado e responsável.
- Cada campo guarda valor exibido, último valor automático, origem, horário, correção manual, trava, data de revisão e
  verificação (`verificado`, `fonte localizada`, `pendente`).
- Corrigir à mão trava o campo por padrão. Com trava, a importação guarda o novo valor como **pendente** e mostra a
  diferença; o administrador aceita ou mantém. Sem trava, a importação pode substituir, mas registra no histórico.
- Marca, fórmula, sabor, peso, imagem e produto vinculado **nunca** mudam automaticamente sem revisão.
- Consulta com falha **não** altera o preço: conta falhas, marca como desatualizado e, se a loja tiver a regra, oculta
  depois do prazo configurado.
- Alertas são deduplicados por chave: um problema contínuo é um único alerta com início, última ocorrência, contagem e
  o que foi feito. Se a condição some, o alerta é resolvido automaticamente.

## Modo de demonstração

Em **Visão geral → Carregar dados de demonstração**, o sistema cria ofertas, preços, execuções e cenários de problema
**fictícios**, todos com o selo “Demonstração”, para testar telas e alertas. “Remover dados de demonstração” apaga
exatamente esses registros. Os 20 produtos reais não mudam.

## Os 20 produtos do cadastro inicial

Definidos em `src/data/admin/seed-products.ts`, cada um com URLs de loja ou fabricante que trazem nome, fórmula e peso.
Foram localizados por busca na web em 27/09/2026; **as páginas não puderam ser abertas** no ambiente de desenvolvimento
(domínios bloqueados pela rede). Por isso nenhum campo está como “verificado”: o melhor estado é “fonte localizada ·
conferir página”. Sabor ausente no nome oficial, GTIN, SKU, grão, descrição e foto ficam vazios e pendentes. Divergências
entre fontes estão anotadas na ficha (ex.: peso do Hill's Science Diet, nome da fórmula PremieR Gatos Castrados).
