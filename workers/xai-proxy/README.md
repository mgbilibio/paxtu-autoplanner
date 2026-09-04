# Proxy xOAuth xAI do ScoutsAuto

Worker CORS mínimo para o Device Authorization Grant da xAI. Ele aceita somente
a origem `https://mgbilibio.github.io`, não registra tokens e não encaminha URLs
arbitrárias. As chamadas de modelos e geração continuam indo diretamente do
navegador para `api.x.ai`.

```powershell
cd workers/xai-proxy
npx wrangler login
npm run deploy
```

Depois do deploy, configure a URL retornada no secret GitHub
`VITE_XAI_PROXY_URL` do repositório `mgbilibio/paxtu-autoplanner`.
