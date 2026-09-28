# Passo a passo: zerar os dados e cadastrar 3 rações do Mercado Livre

Guia para quem nunca mexeu com programação. Leva uns 30 a 40 minutos na primeira vez.
Você vai: instalar um programa, baixar o site, criar sua senha do painel, apagar os dados de exemplo
e cadastrar 3 rações com o preço e o link do Mercado Livre.

> **Palavras que aparecem aqui**
> - **Terminal**: uma janela onde você digita comandos. Não precisa entender o comando, só copiar, colar e apertar **Enter**.
> - **Painel**: a área de administração do site, em `/admin`, protegida por senha.
> - **Produto**: a ração exata (marca, linha, indicação, sabor e peso). **Oferta**: o anúncio dessa ração numa loja, com o preço.

---

## Parte 1 — Preparar o computador (só na primeira vez)

### 1. Instale o Node.js

1. Abra o site **nodejs.org**.
2. Clique no botão da versão **LTS** (a recomendada).
3. Abra o arquivo baixado e clique em **Avançar / Next** até terminar. Não precisa mudar nenhuma opção.

### 2. Abra o terminal

- **Windows**: aperte a tecla **Windows**, digite **PowerShell** e abra o programa.
- **Mac**: aperte **Cmd + Espaço**, digite **Terminal** e abra.

Para conferir se o Node.js foi instalado, digite o comando abaixo e aperte **Enter**:

```
node -v
```

Deve aparecer algo como `v22.…`. Se aparecer “não é reconhecido” ou “command not found”, feche o terminal,
abra de novo e tente outra vez (se continuar, reinstale o Node.js).

### 3. Baixe o site

1. No GitHub, abra o repositório **andrecemba/app-viagem**.
2. No botão que mostra o nome do ramo (normalmente **main**), escolha **claude/bold-turing-6vq203**
   (depois que a PR for aprovada, pode usar o **main**).
3. Clique no botão verde **Code** → **Download ZIP**.
4. Descompacte o arquivo (clique com o botão direito → **Extrair tudo**) numa pasta fácil, como **Documentos**.

### 4. Entre na pasta do site pelo terminal

No terminal, digite `cd` e um **espaço**, depois **arraste a pasta do site** (a que tem o arquivo `package.json`)
para dentro da janela do terminal. O caminho aparece sozinho. Aperte **Enter**.

```
cd C:\Users\voce\Documents\app-viagem-claude-bold-turing-6vq203
```

(O seu caminho vai ser diferente. Tudo bem.)

### 5. Instale as peças do site

```
npm install
```

Demora alguns minutos e mostra muitas linhas. Espere voltar a aparecer o cursor piscando.
Avisos em amarelo (“warn”) são normais.

### 6. Crie o seu acesso ao painel

```
npm run configurar
```

O programa pergunta:
1. **E-mail** para entrar no painel.
2. **Senha** (mínimo 12 caracteres). Enquanto você digita, aparecem só asteriscos — é assim mesmo.
3. A mesma senha de novo.

No fim aparece **“Pronto! Configuração salva”**. Guarde a senha: ela não fica escrita em lugar nenhum.

---

## Parte 2 — Zerar os dados

O site vem com rações e preços **de exemplo** para demonstração. Para começar do zero:

```
npm run db:zerar
```

O programa explica o que vai apagar e pede confirmação. Digite **ZERAR** (em maiúsculas) e aperte **Enter**.

- **É apagado:** todos os produtos, ofertas, históricos, pedidos de “Avisar oferta” e acessos registrados.
- **Continua:** as 6 lojas (Mercado Livre, Shopee, Amazon, Petz, Cobasi, Petlove) e as configurações.
- **Não dá para desfazer.** Se quiser guardar uma cópia antes, copie o arquivo `.data/racao.db` da pasta do site para outro lugar.

> Se digitar qualquer outra coisa, nada é apagado.

---

## Parte 3 — Abrir o site e o painel

```
npm run dev
```

Quando aparecer **“Ready”**, **deixe essa janela do terminal aberta** (se fechar, o site sai do ar).
Abra o navegador e acesse:

- Site: **http://localhost:3000** — agora deve dizer “Ainda não há rações no comparador”.
- Painel: **http://localhost:3000/admin** — entre com o e-mail e a senha do passo 6.

![Tela de entrada do painel](guia/1-entrar.png)

---

## Parte 4 — Separar as 3 rações no Mercado Livre

Faça isto para cada uma das 3 rações. Vale anotar num papel ou bloco de notas.

1. No Mercado Livre, abra o anúncio da ração.
2. **Copie o link** da barra de endereço do navegador (clique na barra, **Ctrl+C** no Windows ou **Cmd+C** no Mac).
3. Anote, olhando o **título** e a parte **“Características do produto”** do anúncio:

| Anote | Exemplo | Onde achar no anúncio |
|---|---|---|
| Espécie | Cachorro | título |
| Marca | Golden | título ou “Marca” |
| Linha | Golden Fórmula | título ou “Linha” |
| Indicação | Cães Adultos | título (para quem é: adulto, filhote, raça pequena, castrado…) |
| Sabor | Frango e Arroz | título ou “Sabor” |
| Peso | 15 kg | título ou “Peso” |
| Preço | 189,90 | preço grande do anúncio (**sem** somar frete) |
| Frete grátis? | Sim / Não | aparece “Frete grátis” perto do preço? |

> **Atenção à embalagem:** 3 kg e 15 kg são **produtos diferentes**. Sabor diferente ou versão “castrados” também.
> Se o anúncio vende vários pesos (tem botões para escolher o tamanho), escolha o peso antes de anotar o preço e copiar o link.

**Link de afiliado (opcional):** se você participa do programa de afiliados do Mercado Livre, use a barra de afiliados
que aparece no topo do anúncio para **gerar o link** (costuma começar com `https://mercadolivre.com/sec/` ou `https://meli.la/`).
Copie esse link também. Sem ele a oferta funciona, só não gera comissão.

---

## Parte 5 — Cadastrar cada ração no painel

### 5.1 Cadastre o produto

1. No painel, clique em **Produtos** → **Novo produto**.
2. Preencha com o que você anotou:
   - **Espécie**: Cachorro ou Gato.
   - **Marca**, **Linha**, **Indicação**, **Sabor**.
   - **Peso da embalagem**: só o número (ex.: `15`) e escolha **kg** ou **g** ao lado. Use vírgula para decimais: `10,1`.
   - **Versão para castrados**: marque só se o nome da ração disser “castrados”.
   - **Idade** e **Porte** ajudam nos filtros do site (se não souber, deixe “Não informado”).
3. Clique em **Cadastrar produto**.

![Formulário de novo produto preenchido](guia/3-novo-produto.png)

Se aparecer **“Já existe um produto com a mesma…”**, essa ração já está cadastrada: volte em **Produtos**,
abra a que já existe e vá para o passo 5.2.

### 5.2 Adicione a oferta do Mercado Livre

1. Na página do produto que acabou de salvar, clique em **Nova oferta** (botão no lado direito).
2. **Cole o link do anúncio** no campo e clique em **Continuar**.
3. Confira o que o sistema preencheu sozinho:
   - **Loja**: deve aparecer **Mercado Livre**.
   - **ID do anúncio**: pode ficar vazio. Links de catálogo (com `/p/` no endereço) não trazem o ID, e para cadastro manual tudo bem.
4. Preencha:
   - **Preço (R$)**: ex.: `189,90`.
   - **Disponibilidade**: Disponível.
   - **Selo de frete grátis no anúncio**: Sim, Não ou Não informado.
   - **Link de afiliado**: cole o link gerado no programa de afiliados (ou deixe vazio).
5. Na caixa **“Conferência: é a mesma ração?”**:
   - Escreva o **peso** e o **sabor** como estão no anúncio.
   - Marque **“Conferi: peso e sabor do anúncio são os do produto”**.
6. Clique em **Salvar oferta**.

![Nova oferta do Mercado Livre revisada](guia/5-nova-oferta.png)

Se o peso ou o sabor do anúncio for diferente do produto, a oferta é salva com o aviso **“correspondência incerta”**
e aparece em **Ofertas e alertas**. Confira se colou o link certo.

### 5.3 Repita para as outras 2 rações

Volte ao passo 5.1 para a segunda e a terceira ração.

---

## Parte 6 — Conferir no site

Abra **http://localhost:3000**. As 3 rações aparecem com o preço, o preço por kg e “Atualizado há …”.
Clique numa delas para ver a página com a oferta do Mercado Livre e o botão **Ver oferta**
(que leva ao link de afiliado, ou ao link do anúncio se não houver afiliado).

![Página da ração no site com a oferta do Mercado Livre](guia/6-site-produto.png)

**É normal ver:**
- **“Sem histórico suficiente para comparar com a média”**: a comparação com a média precisa de pelo menos 7 dias de preços.
- **“Top descontos do dia”** não aparece ainda, pelo mesmo motivo.
- **“Frete: informe o CEP ou confira na loja”**: o frete por CEP só é calculado quando a integração automática do Mercado Livre estiver ligada.

---

## Parte 7 — Manter o preço atualizado

Depois de **48 horas**, o site marca o preço como **desatualizado** (em amarelo). Para atualizar à mão:

1. No painel, abra **Ofertas e alertas** (ou o produto) e clique na oferta.
2. Troque o **Preço** e clique em **Salvar**. O preço antigo fica guardado no histórico.

Para o preço atualizar sozinho, é preciso ligar a integração oficial do Mercado Livre (criar um aplicativo no
site de desenvolvedores do Mercado Livre). Os passos técnicos estão no `README.md`, seção **Integrações**.

---

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| `npm` ou `node` “não é reconhecido” | Feche e abra o terminal. Se continuar, reinstale o Node.js (Parte 1). |
| “A URL não é de Mercado Livre” | O link precisa ser do anúncio (`mercadolivre.com.br`). Links curtos de compartilhamento (`meli.la`) vão no campo **Link de afiliado**, não no da URL. |
| “O link de afiliado não é de Mercado Livre…” | Confira se colou o link de afiliado do Mercado Livre, e não de outra loja. |
| “Já existe um produto com a mesma espécie, marca…” | A ração já está cadastrada. Abra a existente e adicione a oferta nela. |
| O site não abre em localhost:3000 | Veja se a janela do `npm run dev` ainda está aberta. Se fechou, rode `npm run dev` de novo. |
| “Port 3000 is in use” | Já tem um site aberto em outra janela. Feche-a ou use o endereço que o terminal mostrar. |
| Esqueci a senha do painel | Rode `npm run configurar` de novo e crie outra. |
| Quero os dados de exemplo de volta | `npm run db:reset` (apaga tudo e recria com os exemplos). |

Para desligar o site: clique na janela do terminal e aperte **Ctrl+C**.
Para ligar de novo outro dia: abra o terminal, entre na pasta (passo 4) e rode `npm run dev`.
