# Proxy xOAuth xAI do ScoutsAuto

Worker CORS mínimo para o Device Authorization Grant da xAI. Ele aceita somente
a origem `https://mgbilibio.github.io`, não registra tokens e não encaminha URLs
arbitrárias. As chamadas de modelos e geração continuam indo diretamente do
navegador para `api.x.ai`.

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
rebuild do Pages, o site antigo continua sem proxy e a UI avisa.

Para testar em `http://localhost:5173`, publique o Worker com
`ALLOW_LOCALHOST=1` (não use isso em produção).
