# droply · guia para pôr no ar

**droply** encontra clientes em qualquer país (Google Maps), analisa o que cada empresa precisa, escreve as mensagens (WhatsApp, e-mail, ligação), organiza tudo numa pipeline e cria sites com IA que se publicam no GitHub + Vercel.

- Login: **só com Google**.
- Dados do utilizador (leads, pipeline, sites, tom de voz): **guardados no navegador** dele.
- Servidor: só funções da Vercel, que escondem as tuas chaves e contam os limites.

---

## 1. Publicar na Vercel (10 min)

1. Cria uma conta em **github.com** e outra em **vercel.com** (entra na Vercel com o GitHub).
2. No GitHub, cria um repositório novo chamado `droply` (privado) e carrega todos os ficheiros desta pasta (botão **Add file → Upload files**).
3. Na Vercel: **Add New → Project → Import** o repositório `droply` → **Deploy**.
4. Fica com o endereço (ex.: `droply.vercel.app`). Mais tarde podes ligar o teu domínio em **Settings → Domains**.

## 2. Login com Google (gratuito)

1. Vai a **console.cloud.google.com** → cria um projeto "droply".
2. **APIs e serviços → Ecrã de consentimento OAuth**: tipo *Externo*, nome *droply*, o teu e-mail, links para `https://O-TEU-DOMINIO/privacidade.html` e `/termos.html`. Publica a app (*Em produção*). Com os âmbitos básicos (e-mail e perfil), não precisa de verificação demorada.
3. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicação Web**.
   - *Origens JavaScript autorizadas*: `https://droply.vercel.app` (e o teu domínio, quando tiveres).
4. Copia o **ID do cliente** → na Vercel, `GOOGLE_CLIENT_ID`.

## 3. Google Maps (Places API)

1. No mesmo projeto Google Cloud: **Faturação** → associa uma conta de faturação (precisa de cartão). O Google dá uma utilização mensal gratuita; acima disso cobra por pedido. Consulta os preços atuais em *Google Maps Platform → Pricing*.
2. **APIs e serviços → Biblioteca** → ativa **Places API (New)**.
3. **Credenciais → Criar credenciais → Chave de API** → *Restringir chave* → *Restrições de API*: só **Places API (New)**.
4. Copia a chave → na Vercel, `GOOGLE_PLACES_API_KEY`.
5. Recomendado: em **Quotas**, define um limite diário de pedidos para nunca teres surpresas na fatura.

> Cada pesquisa do droply = 1 pedido ao Google com até 20 empresas. "Carregar mais" = mais 1 pedido.

## 4. IA (OpenAI **ou** Anthropic)

- **OpenAI**: platform.openai.com → API keys → cria uma chave → `OPENAI_API_KEY` e `AI_PROVIDER=openai`.
- **Anthropic**: console.anthropic.com → API keys → `ANTHROPIC_API_KEY` e `AI_PROVIDER=anthropic`.
- Opcional: `AI_MODEL` com o modelo que quiseres (confirma o nome exato no site do fornecedor). Usa um modelo rápido e barato.
- Define um limite de gastos mensal no painel do fornecedor.

## 5. GitHub (para os utilizadores publicarem sites)

1. **github.com/settings/developers → OAuth Apps → New OAuth App**
   - *Homepage URL*: `https://droply.vercel.app`
   - *Authorization callback URL*: `https://droply.vercel.app/api/github/callback`
2. Copia o **Client ID** → `GITHUB_CLIENT_ID`. Gera um **Client secret** → `GITHUB_CLIENT_SECRET`.

Fluxo do utilizador: *Ligar o meu GitHub* → *Enviar para o GitHub* (o droply cria o repositório e o `index.html`) → *Publicar na Vercel* (abre a Vercel já com o repositório; 1 clique em Deploy, só na primeira vez). Cada atualização seguinte publica sozinha.

## 6. Limites e acessos (Upstash, grátis)

1. Na Vercel: **Storage** (ou **Marketplace**) → **Upstash → Redis** → cria e liga ao projeto `droply`. As variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` são criadas sozinhas.
2. `ADMIN_EMAILS` = o teu e-mail Google (podes pôr vários, separados por vírgula). Os admins não têm limites.
3. Ajusta `LIMIT_SEARCHES`, `LIMIT_ANALYSES` e `LIMIT_SITES` (por utilizador, por mês).

**Quando alguém paga:** entra no droply → **Acessos (admin)** → escreve o e-mail Google da pessoa → *Dar acesso*. Para cancelar, *Remover*.

> Sem o Upstash, o droply funciona, mas **não conta limites** e só podes dar acesso pela variável `ALLOWED_EMAILS`.

## 7. Restantes variáveis

- `CHECKOUT_URL`: link do teu checkout (aparece a quem ainda não tem acesso).
- `SUPPORT_WHATSAPP`: o teu número com indicativo, só dígitos (ex.: `244923000000`). Usado em "Números internacionais" e "Já paguei".
- `SUPPORT_EMAIL`: opcional.

Depois de mudares variáveis: **Deployments → ⋯ → Redeploy**.

## 8. Testar

1. Abre o site → *Continuar com Google* com o teu e-mail admin.
2. Escreve: `Dentistas em Austin, Texas, sem site` → **Encontrar**.
3. **Analisar as 5 melhores** → abre um lead → copia a mensagem / abre no WhatsApp.
4. **Criar site com IA** → *Ligar o meu GitHub* → *Enviar para o GitHub* → *Publicar na Vercel*.

---

## Custos (tu pagas, por utilização)

| Serviço | Quando gasta |
|---|---|
| Google Places | 1 pedido por pesquisa / "carregar mais" |
| IA | 1 chamada pequena por pesquisa, 1 por análise, 1 grande por site/alteração |
| Vercel, GitHub, Upstash, login Google | Grátis nos planos iniciais |

Os limites mensais por utilizador garantem que ninguém gasta mais do que aquilo que cobras. Começa com valores baixos e ajusta.

## Boas práticas (importante)

- **WhatsApp**: o droply abre a conversa com a mensagem pronta; o envio é do utilizador, um a um. Envios em massa levam a bloqueios de número.
- **E-mail frio**: as mensagens já incluem uma linha para a empresa pedir para não ser contactada. Respeita os pedidos (fase *Não contactar*).
- **Dados**: o droply usa dados públicos de empresas (Google Maps e o site da própria empresa). Não recolhe dados do LinkedIn, Instagram, Facebook ou TikTok; mostra só os links públicos que estão no site da empresa.

## Estrutura

```
index.html, app.js, app.css     → aplicação (corre no navegador)
api/config.js                   → configuração pública
api/me.js                       → sessão, acesso e limites
api/search.js                   → pesquisa (IA interpreta o pedido + Google Places)
api/analyze.js                  → análise do site + diagnóstico + mensagens
api/site.js                     → gera / altera sites
api/admin.js                    → lista de acessos
api/github/callback.js          → ligação ao GitHub
lib/util.js                     → login Google, limites, IA
privacidade.html, termos.html   → páginas legais
```

## IA e pesquisa grátis (nov. 2026)
- IA: Google Gemini (plano grátis). Variável `GEMINI_API_KEY` (Google AI Studio). Opcional: `AI_MODEL`.
- Encontrar clientes: OpenStreetMap (Nominatim + Overpass), sem chave. Se existir `GOOGLE_PLACES_API_KEY`, usa o Google Maps.
- Contas e dados: Supabase (`droply-supabase.js`).
