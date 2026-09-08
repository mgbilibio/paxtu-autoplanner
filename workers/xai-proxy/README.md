# Proxy xOAuth xAI do ScoutsAuto

Worker Cloudflare **deste** app (`name = "paxtu-xai-proxy"`). O site publicado
em `https://mgbilibio.github.io/paxtu-autoplanner/` usa
`https://paxtu-xai-proxy.margusbilibio.workers.dev` só para Device OAuth
(`/oauth/device`, `/oauth/token`, `/oauth/userinfo`). Depois do token no
`sessionStorage`, catálogo e chat chamam `https://api.x.ai/v1` direto.

Allowlist CORS: `https://mgbilibio.github.io` e localhost/127.0.0.1 (testes
locais).

O escotista só abre o site. Não precisa de Vite, npm nem instalar nada.
