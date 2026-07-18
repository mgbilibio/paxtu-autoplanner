# Design: Provedor xAI / Grok via OAuth (assinatura, sem API key)

**Status:** em planejamento — decisões Q1–Q3 e Q5 fechadas (2026-07-18)  
**App:** Paxtu AutoPlanner  
**Data:** 2026-07-18  
**Mapa de todos os perfis LLM:** [llm-provider-profiles](./2026-07-18-llm-provider-profiles.md)  
**Objetivo de produto:** permitir que chefes com **SuperGrok** e/ou **X Premium+** usem Grok no Paxtu **sem custo extra da API** (`XAI_API_KEY`), consumindo os **limites inclusos na conta**.

---

## 1. Contexto e motivação

### Posição no mapa de provedores (preferência de produto)
Ver [llm-provider-profiles](./2026-07-18-llm-provider-profiles.md). Ordem canônica:

1. **Gemini** (API key AI Studio) — preferencial, grátis e simples  
2. **Ollama local** (`:11434`)  
3. **Ollama Cloud** (API web + key)  
4. **xAI Grok OAuth** (este doc) — por último; só quem tem SuperGrok / X Premium+  

### Desejo deste doc (4º perfil)
| Provedor | Auth | Custo |
|----------|------|--------|
| **xAI Grok** | **OAuth** (conta xAI / X) | **Incluso na assinatura** SuperGrok ou X Premium+ |

**Fora de escopo do MVP (explícito):**
- Provedor xAI só com API key como caminho principal (pode existir depois como fallback opcional se a assinatura não liberar OAuth API).
- TTS / imagem / vídeo Grok.
- Multi-conta xAI por perfil de login do Paxtu (começar com **1 sessão OAuth por máquina / instalação**).

---

## 2. Premissas e restrições

1. **Só OAuth para o valor de produto** — a proposta de valor é “já pago Grok/X, uso no Paxtu”. API key paga à parte **não** resolve o pedido.
2. **Público-alvo restrito** — UI deve deixar claro: *“Requer SuperGrok ou X Premium+”*. Quem não tem vê erro amigável, não “bug”.
3. **App Electron local** — tokens não podem ir para `localStorage` em texto puro; preferir **safeStorage / keytar / arquivo cifrado no main process**.
4. **Privacidade** — prompts de reunião (progressão, nomes de seção) saem da máquina para `api.x.ai` (mesmo risco conceitual do Gemini). Documentar no help.
5. **Risco de plataforma (crítico)** — fluxos OAuth consumer da xAI (device code em `accounts.x.ai` / `auth.x.ai`) são usados por ferramentas de terceiros (ex.: Hermes Agent), mas:
   - **não** é o fluxo “oficial de app enterprise” tão estável quanto API key;
   - há relatos de **HTTP 403** por allowlist/tier mesmo com SuperGrok ativo;
   - client_id / endpoints podem mudar sem aviso.
6. **Compatibilidade de API** — após OAuth, a inferência usa Bearer no host `https://api.x.ai/v1` (chat/completions e/ou Responses). O pipeline de geração do Paxtu (multiphase + JSON) deve ser **independente** do transporte.

### Hipótese de auth (a validar em spike)

Fluxo **OAuth 2.0 Device Code** (adequado a Electron):

```
Paxtu (main)  →  POST device_code  →  auth.x.ai / accounts.x.ai
Usuário       →  browser: URL + código de uso único
Paxtu         →  poll token até approved
Paxtu         →  guarda access_token + refresh_token (seguro)
Paxtu         →  Authorization: Bearer <access>  →  api.x.ai/v1/...
```

Referência de comportamento observado em clientes open-source (Hermes `xai-oauth`):
- Auth server: `accounts.x.ai` / device em `auth.x.ai`
- API: `https://api.x.ai/v1`
- Refresh em background; re-login se `invalid_grant`
- Modelos de chat citados em catálogos de terceiros: `grok-build-0.1`, variantes `grok-4.x`, etc. (lista viva — não hardcodar só um para sempre)

---

## 3. Objetivos de UX

### Configurações / Setup
- Quarto radio (última posição na UI): **xAI Grok (assinatura)** — depois de Gemini, Ollama local e Ollama Cloud.
- Botões:
  - **Entrar com conta xAI / X** → abre browser + mostra código se device flow.
  - **Sair** → apaga tokens locais.
  - **Status:** “Conectado como … / expira em … / reconectar”.
- Lista de modelos (após login): preferir descoberta via API; fallback lista estática curada.
- Copy legal/clara:
  - “Usa cotas da sua assinatura SuperGrok ou X Premium+.”
  - “Não usa chave de API faturada em console.x.ai (a menos que ativemos fallback no futuro).”

### Geração (roteiro / ciclo / help)
- Mesmos modos já existentes: `from_selection` e `auto_link`.
- Mesmo multiphase (esqueleto → atividades → guias).
- Banner de progresso com `provider: xai-oauth`.
- Erros traduzidos:
  - 401 → “Sessão expirou — entre de novo.”
  - 403 → “Sua conta não tem permissão OAuth para API (tier/allowlist). Conta SuperGrok/X Premium+ é necessária; se o login funcionou mas a geração falha, a xAI pode estar restringindo o acesso OAuth.”
  - 429 → “Limite da assinatura / rate limit. Aguarde ou reduza paralelismo.”

### Quem pode usar no grupo
- OAuth é **por instalação do app** (máquina), não por jovem.
- Perfis de chefia do Paxtu compartilham o mesmo token da máquina (igual Gemini key hoje).
- **Discussão aberta:** um token por usuário Paxtu vs um por máquina (ver Open Questions).

---

## 4. Arquitetura proposta

### 4.1 Camadas

```
┌─────────────────────────────────────────────┐
│ UI: SetupWizard / App settings (provider)   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ llmProvider (router)                        │
│  gemini | ollama | xai-oauth                │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ xaiOAuthService (renderer-facing API)       │
│  login(), logout(), status(), listModels()  │
│  generateScoutPlan / Cycle / ask            │
└──────────────────┬──────────────────────────┘
                   │ IPC
┌──────────────────▼──────────────────────────┐
│ electron main                               │
│  xai:deviceStart / xai:devicePoll            │
│  xai:refresh / xai:chat / xai:models        │
│  token store (safeStorage + file userData)  │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
              api.x.ai / auth.x.ai
```

### 4.2 Por que main process
- Evita CORS e reduz vazamento da chave/token no DevTools do renderer.
- Um único lugar para refresh e fila de requests.
- Alinhado ao padrão já usado em `ollama:request`.

### 4.3 Token store (proposto)
| Campo | Onde |
|-------|------|
| access_token | cifrado (Electron `safeStorage`) em `userData/xai-oauth.json` ou keytar |
| refresh_token | idem |
| expires_at | epoch ms |
| account_hint | e-mail ou handle se a API devolver (só display) |
| token_type | Bearer |

**Nunca** versionar nem mandar em backup HTML/export de progresso sem consentimento.  
**Backup local do app:** decidir se inclui tokens (default: **não**).

### 4.4 Transporte de chat (adapter próprio — **não** copiar Ollama/Gemini)

Ver mapa geral e regra de adapters em [llm-provider-profiles §4.1](./2026-07-18-llm-provider-profiles.md).

Payloads de **ida/volta mudam entre provedores**. O domínio Paxtu fala em “mensagens lógicas + texto/JSON”; o **xAI adapter** sozinho traduz para o formato que o spike validar.

Duas variantes a escolher no spike:

| Variante | Prós | Contras |
|----------|------|---------|
| **Chat Completions** OpenAI-compat (`/v1/chat/completions`) | Simples; parecido com vários exemplos | Pode diferir do que o OAuth consumer libera |
| **Responses API** (clientes OAuth tipo Grok Build) | Alinhado a alguns fluxos de assinatura | Shape de request/response diferente |

**Spike obrigatório (PR0):** conta real SuperGrok/Premium+ → device login + **uma** completion + **um** JSON mínimo. Documentar:
- URL, method, headers, body de ida  
- JSON de volta e caminho do campo `content` / `output_text`  
- Se `format`/schema existe ou só prompt  

### 4.5 Geração de planos
Reutilizar a estratégia multiphase **no domínio**:
1. Esqueleto JSON  
2. Detalhe por atividade  
3. Study guide  

O provider xAI implementa apenas o adapter (`toProviderRequest` / `fromProviderResponse` / auth) + `callJson` com retries; **não** reutilizar body `num_ctx`/`format:json` do Ollama.  
`extractJson` roda sobre o **texto já normalizado**.  
Modos `auto_link` / `from_selection` e `catalogDigest` permanecem no contrato `GeneratorParams`.

---

## 5. Modelo de dados (config)

Estender (conceitualmente):

```ts
type LlmProviderId = 'gemini' | 'ollama' | 'xai-oauth';

interface AppConfig {
  // ...
  llmProvider?: LlmProviderId;
  xaiOAuthModel?: string;       // ex. grok-build-0.1 / grok-4.x
  // tokens NÃO ficam em AppConfig se forem para o main store
}
```

Sinal no renderer: `xaiOAuthStatus: { connected: boolean; accountHint?: string; expiresAt?: number }`.

---

## 6. Fluxos detalhados

### 6.1 Login
1. Usuário clica “Entrar com xAI / X”.
2. Main pede device code; UI mostra:
   - URL (ex. página de device)
   - código de um uso
   - botão “Abrir no navegador”
3. Poll até sucesso / timeout / cancel.
4. Persist tokens; UI mostra conectado.
5. Carrega lista de modelos.

### 6.2 Geração
1. Router vê `llmProvider === 'xai-oauth'`.
2. Main garante access token válido (refresh se necessário).
3. N chamadas multiphase com timeouts longos (cloud thinking).
4. Em 401: um refresh + retry; se falhar → pedir re-login.

### 6.3 Logout
1. Apaga store local.
2. (Opcional) revoke no auth server se endpoint existir.
3. Se provider ativo era xai-oauth, volta UI para “desconectado” e bloqueia gerar até login ou troca de provider.

---

## 7. Segurança e LGPD / dados do grupo

| Risco | Mitigação |
|-------|-----------|
| Token roubado do disco | safeStorage; permissões de arquivo userData |
| Prompt com dados de jovens | Aviso na UI; preferir códigos + descrições, não CPF/registro se não for necessário |
| Backup exporta tokens | Excluir de backup completo por default |
| Log de erros com Bearer | Sanitizar headers nos logs (como Gemini sanitize) |

---

## 8. Testes e aceite

### Spike (bloqueante)
- [ ] Device code login com conta real SuperGrok **ou** X Premium+
- [ ] Refresh token funciona
- [ ] Uma chamada de chat retorna texto
- [ ] Uma chamada com “responda só JSON” + `extractJson` ok
- [ ] Documentar se 403 acontece no tier da conta de teste

### MVP aceite produto
- [ ] Selecionar xAI OAuth em Configurações
- [ ] Login / logout
- [ ] Gerar roteiro modo auto_link e from_selection
- [ ] Gerar ciclo (pelo menos auto_link)
- [ ] Mensagens de erro 401/403/429 compreensíveis
- [ ] Ollama e Gemini intactos

### Não-bloqueante pós-MVP
- Help panel ask via xAI
- Lista dinâmica de modelos na UI do gerador
- Fallback API key opcional (só se produto quiser)

---

## 9. Plano de PRs (incremental)

### PR0 — Spike OAuth (branch throwaway ou `docs` + script)
- Script/Electron mínimo: device flow + 1 chat
- Doc: endpoints reais, payload, modelos que responderam, limitações 403
- **Gate:** go/no-go do MVP

### PR1 — Infra auth no Electron
- IPC `xai:oauth*`, token store, refresh
- Sem UI de geração ainda (só “status” de dev ou tela mínima)

### PR2 — Provider `xai-oauth` no router
- `xaiOAuthService` multiphase (espelho Gemini/Ollama)
- `LlmProviderId` + listModels
- Sem SetupWizard polido se necessário (settings só)

### PR3 — UI Config + Setup
- Radio, login, logout, modelo, textos de assinatura
- Bloqueio de “Gerar” se desconectado

### PR4 — Hardening
- Timeouts, cancel, sanitize logs, exclusão de tokens no backup
- Help content
- Testes manuais checklist

### PR5 (opcional) — Ciclo + Q&A help
- `generateScoutCycle` + `askLlm` no mesmo provider

---

## 10. Key Decisions (propostos para validar)

| # | Decisão | Rationale |
|---|---------|-----------|
| K1 | **OAuth-only no MVP** (sem API key na UI) | Atende “sem custo extra da API” e cotas da assinatura; Q2 fechado sem fallback key |
| K2 | **Device code flow** | Ideal para Electron; sem servidor de redirect próprio |
| K3 | **Tokens no main + safeStorage** | Segurança melhor que localStorage |
| K4 | **Multiphase reutilizado** | Já estável no Paxtu; reduz risco de JSON monolítico |
| K5 | **1 sessão OAuth por instalação** | Q3 fechado — igual chave Gemini |
| K6 | **Spike bloqueante antes de UI** | Risco de 403/allowlist da xAI é real |
| K7 | **SuperGrok + X Premium+** | Q1 fechado |
| K8 | **client_id open-source no spike** | Q5 fechado — isolar para trocar depois |

---

## 11. Decisões fechadas (product owner, 2026-07-18)

| ID | Decisão |
|----|---------|
| **Q1** | Suportar **SuperGrok e X Premium+** no MVP. |
| **Q2** | Em 403 OAuth/inference: **só mensagem clara** e continuar com Gemini/Ollama. **Sem** API key de escape no MVP. |
| **Q3** | Token **um por instalação/máquina** (como a chave Gemini hoje). |
| **Q5** | Spike com **client_id público** de ferramentas open-source; aceitar risco de revogação e isolar em um módulo. |

## 11b. Ainda abertas (defaults sugeridos)

### Q4 — Modelos default — **sugestão: híbrido**
- Default fixo = o modelo que o **spike** provar estável (ex. o que Hermes pinna no topo quando aplicável).  
- Lista: tentar `/v1/models` se o Bearer OAuth permitir; senão lista estática curada no código.  
- **Confirmar na implementação do spike.**

### Q6 — Tamanho do catalogDigest no auto_link — **sugestão: igual Ollama no MVP**
- Reutilizar o mesmo digest (~450 linhas).  
- Se 429/timeout forem frequentes, segundo passo: digest reduzido só para xAI.  
- **Confirmar após primeiras gerações reais.**

---

## 12. Riscos e mitigação (resumo)

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| OAuth API allowlist / 403 | Média–alta | MVP inviável p/ algumas contas | Spike com conta real; mensagem clara; Ollama/Gemini continuam |
| Mudança de endpoints OAuth | Média | Login quebra | Isolar em `xaiOAuthAuth.ts`; versionar; testar em release |
| ToS / uso de client_id de terceiros | Média | Jurídico / técnico | Preferir client próprio; documentar risco |
| Rate limit assinatura | Alta em uso intenso | Geração falha no meio | Multiphase + retry; avisar “1 geração por vez” |
| Vazamento de token em backup | Baixa | Alto | Não exportar tokens |

---

## 13. Critério go / no-go após spike

**GO** se:
- Login device code completa com conta SuperGrok **ou** Premium+ de teste, e  
- Pelo menos 1 completion JSON bem-sucedida com o Bearer OAuth.

**NO-GO (adiar OAuth no Paxtu)** se:
- Login impossível sem client_id privado, ou  
- Toda conta de teste recebe 403 em inference, ou  
- Só funciona com API key paga.

Nesse caso o plano vira: documentar limitação e manter Gemini/Ollama; reavaliar quando a xAI publicar OAuth oficial para apps.

---

## 14. Próximos passos imediatos (discussão → execução)

1. **Fechar Open Questions Q1–Q6** com o product owner (você).  
2. **PR0 spike** em máquina de dev com conta real (sem merge se throwaway).  
3. Se GO → PR1…PR4 conforme acima.  
4. Atualizar `docs/usersmanual` / help: provedor xAI OAuth e privacidade.

---

## 15. Referências de desenho (não oficiais)

- xAI API (API key): https://docs.x.ai / https://x.ai/api  
- Comportamento OAuth documentado por terceiros (Hermes Agent “xAI Grok OAuth”): device code, `api.x.ai/v1`, SuperGrok / X Premium+, risco 403  
- Código Paxtu: `llmProvider.ts`, `geminiService.ts`, `ollamaService.ts`, `electron/main.ts` (IPC Ollama como padrão de proxy)

---

*Documento vivo: atualizar após o spike com endpoints e modelos reais validados.*
