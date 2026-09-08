# Proxy xOAuth xAI (referência)

O site publicado **não** usa este Worker. “Entrar com X / Grok” no GitHub
Pages fala com o proxy já existente
`https://socialkids-xai-proxy.margusbilibio.workers.dev` e, depois do token,
chama `https://api.x.ai/v1` direto.

Esta pasta fica só como referência histórica das rotas OAuth
(`/oauth/device`, `/oauth/token`, `/oauth/userinfo`). Não publique um Worker
novo nem configure variável de build para o login funcionar.
