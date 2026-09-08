# Proxy xOAuth xAI do ScoutsAuto

Worker CORS para o Device Authorization Grant da xAI **e** para o catálogo/chat
no navegador. O Pages não pode chamar `auth.x.ai` nem `api.x.ai` direto — o
browser bloqueia por CORS e mostra só “Failed to fetch”.

Origens sempre aceitas: `https://mgbilibio.github.io` e qualquer
`http://localhost` / `http://127.0.0.1` (porta livre). Tokens não são gravados
no Worker. Só estas rotas existem (não é proxy aberto):

| Método | Caminho | Destino |
| --- | --- | --- |
| POST | `/oauth/device` | `https://auth.x.ai/oauth2/device/code` |
| POST | `/oauth/token` | `https://auth.x.ai/oauth2/token` |
| GET | `/oauth/userinfo` | `https://auth.x.ai/oauth2/userinfo` |
| GET | `/v1/language-models` | `https://api.x.ai/v1/language-models` |
| POST | `/v1/chat/completions` | `https://api.x.ai/v1/chat/completions` |

As rotas `/v1/*` exigem `Authorization: Bearer`.

## Deploy (obrigatório para o botão web “Entrar com X / Grok”)

```powershell
cd workers/xai-proxy
npx wrangler login
npm run deploy
```

A URL retornada (ex.: `https://paxtu-xai-proxy.<conta>.workers.dev`) deve ir na
**variável** (não secret) do GitHub Actions:

`Settings → Secrets and variables → Actions → Variables → VITE_XAI_PROXY_URL`

O workflow `deploy-pages.yml` injeta essa variável no `npm run build:web`. Sem
rebuild do Pages, o site antigo continua sem proxy (ou com URL velha) e o login
falha.

Também dá para colar a URL do Worker em Configurações → IA neste navegador
(`localStorage`, não vai para o Firestore).

## Desenvolvimento local

`npm run dev:web` sobe um proxy same-origin em `/__xai_oauth` (Vite). Não vaza
tokens: só encaminha o pedido para a xAI. No Pages isso **não** existe — o
Worker e `VITE_XAI_PROXY_URL` continuam obrigatórios.
