# Design: Perfis de acesso a LLM (múltiplos provedores)

**Status:** discussão / planejamento  
**Data:** 2026-07-18  
**Relacionado:** [xAI OAuth](./2026-07-18-xai-oauth-provider.md)

## 1. Objetivo

O Paxtu deve permitir **vários perfis de acesso a LLM**, todos selecionáveis em **Configurações** (e no Setup), **adicionais** ao que já existe — sem substituir Gemini ou Ollama local.

Cada perfil define:
- **Como autenticar**
- **Para onde apontar** (base URL / host)
- **Como listar modelos**
- **Mesmo pipeline de produto** (gerar roteiro multiphase, ciclo, help)

---

## 2. Ordem de preferência de produto (canônica)

Uso preferencial na UX, defaults e documentação — **nesta ordem**:

| Prioridade | Perfil | Por quê (product) |
|------------|--------|-------------------|
| **1º** | **Gemini (API key)** | Grátis e simples via [Google AI Studio](https://aistudio.google.com/app/apikey); onboarding mais fácil para chefia |
| **2º** | **Ollama local** (`:11434`) | Offline / privacidade / já instalado em várias máquinas |
| **3º** | **Ollama Cloud (web + key)** | Cloud sem app local; conta ollama.com |
| **4º** | **xAI Grok OAuth** | Só quem tem SuperGrok / X Premium+; sem custo extra de API key xAI |

**Implicações:**
- Default de instalação / Setup: **`gemini`** (já é o caso hoje — manter).
- Ordem dos radios/cards na UI: Gemini → Ollama local → Ollama web → xAI.
- Help e mensagens de erro 403 no xAI: sugerir **Gemini** primeiro, depois Ollama.
- Prioridade de engenharia: solidificar Gemini + local; em seguida cloud Ollama; xAI OAuth por último (após spike GO).

## 2b. Mapa de perfis (alvo)

| ID (config) | Nome na UI | Auth | Endpoint típico | Custo / cota | Estado | Prioridade |
|-------------|------------|------|-----------------|--------------|--------|------------|
| `gemini` | Google Gemini | API key (AI Studio) | Google GenAI SDK | Free tier AI Studio | **Já existe** | **1º** |
| `ollama-local` | Ollama (app local) | Nenhuma* | `http://localhost:11434` | Free local; `:cloud` via `ollama signin` | **Já existe** (hoje `ollama`) | **2º** |
| `ollama-cloud` | Ollama Cloud (API web) | **API key** Bearer | `https://ollama.com` (`/api` ou `/v1`) | Conta/planos Ollama Cloud | **Novo** | **3º** |
| `xai-oauth` | xAI Grok (assinatura) | **OAuth** SuperGrok / X Premium+ | `https://api.x.ai/v1` | **Incluso na assinatura** | **Novo** (ver doc OAuth) | **4º** |

\* Local não exige key. Modelos `:cloud` puxados no app Ollama usam a sessão do Ollama (`ollama signin`), não uma key no Paxtu.

### O que **não** é no MVP deste mapa
- xAI só com API key (faturamento console) — fora do valor “assinatura inclusa”; eventual escape futuro.
- OpenAI / Anthropic genéricos (pode entrar depois no mesmo padrão de perfil).
- Vários perfis nomeados pelo usuário (“casa”, “sede”) — começar com **um config ativo** por tipo de provedor, não multi-slot.

---

## 3. Dois jeitos de usar Ollama (o ponto desta discussão)

### 3.1 Ollama local — app instalado + porta 11434

```
Paxtu  →  HTTP  →  localhost:11434  →  modelos locais e/ou :cloud (via daemon Ollama)
```

| Campo UI | Valor default |
|----------|----------------|
| URL | `http://localhost:11434` (ou 127.0.0.1) |
| API key | *(vazio / oculto)* |
| Testar | `GET /api/tags` |
| Modelos | lista do daemon |

**Privacidade:** prompts de modelos **locais** não saem da máquina. Modelos `:cloud` no daemon **saem** via Ollama Cloud (sessão do app Ollama).

**Segurança atual:** URL restrita a loopback no Electron (bom manter para este perfil).

### 3.2 Ollama Cloud — chamada web direta + chave

Documentação Ollama (cloud):
- Host: `https://ollama.com`
- Auth: `Authorization: Bearer <OLLAMA_API_KEY>`
- Key em: https://ollama.com/settings/keys
- API nativa: `https://ollama.com/api/chat` (mesmo shape do local)
- Também existe surface OpenAI-compat: `https://ollama.com/v1/...`

```
Paxtu  →  HTTPS + Bearer  →  ollama.com  →  modelos cloud
```

| Campo UI | Valor |
|----------|--------|
| URL base | fixa `https://ollama.com` (ou editável avançado) |
| API key | obrigatória |
| Testar | `GET /api/tags` ou `/v1/models` com Bearer |
| Modelos | nomes **cloud** (em geral **sem** sufixo `:cloud` do catálogo local) |

**Vantagens vs local+`:cloud`:**
- Não precisa do app Ollama rodando na máquina
- Notebook fraco ainda gera com cloud
- Key gerenciável no site Ollama

**Desvantagens:**
- Exige conta/key Ollama
- Dados saem sempre para a nuvem Ollama
- Electron precisa **permitir HTTPS externo** (hoje o proxy Ollama é loopback-only — mudar com cuidado)

---

## 4. Modelo mental unificado: “LLM Access Profile”

Em vez de espalhar flags (`ollamaBaseUrl` + `apiKey` misturados), o desenho alvo é:

```ts
type LlmProviderId =
  | 'gemini'
  | 'ollama-local'   // hoje: 'ollama' (migrar com alias)
  | 'ollama-cloud'
  | 'xai-oauth';

interface AppConfig {
  llmProvider: LlmProviderId;
  // Gemini
  apiKey?: string;
  // Ollama local
  ollamaBaseUrl?: string;           // default localhost:11434
  ollamaModel?: string;
  ollamaGenerationContext?: number;
  ollamaGenerationOutput?: number;
  // Ollama Cloud
  ollamaCloudApiKey?: string;       // safeStorage preferível a longo prazo
  ollamaCloudModel?: string;
  // xAI OAuth — tokens no main, não na config em claro
  xaiOAuthModel?: string;
}
```

**Compatibilidade:** `llmProvider: 'ollama'` legado → tratar como `ollama-local`.

### Router

```
getActiveProvider()
  gemini        → geminiService
  ollama-local  → ollamaService (sem Authorization; baseUrl loopback)
  ollama-cloud  → ollamaService (baseUrl ollama.com + Bearer key)
  xai-oauth     → xaiOAuthService
```

**Importante:** local e cloud Ollama podem reutilizar **grande parte** da lógica de multiphase e `extractJson`, mas **não** assumir que o payload de ida/volta é idêntico entre todos os provedores (ver §4.1).

---

## 4.1 Camada de adaptação: chamadas e payloads **diferem** entre sistemas

Atenção explícita de produto/engenharia: **cada provedor tem seu contrato de API**. Unificar demais no router sem adapter quebra geração e dificulta debug.

### O que muda entre perfis (exemplos reais)

| Aspecto | Gemini | Ollama local | Ollama Cloud | xAI OAuth |
|---------|--------|--------------|--------------|-----------|
| **Auth** | API key no SDK / header Google | Nenhuma (loopback) | `Bearer` API key | `Bearer` access token (+ refresh) |
| **Host** | APIs Google | `localhost:11434` | `https://ollama.com` | `https://api.x.ai` |
| **Shape do request** | `generateContent` / parts / roles Google | `/api/chat` messages + `options.num_ctx` | Mesmo *shape* Ollama, URL e auth diferentes | Chat Completions OpenAI-like **e/ou** Responses API |
| **JSON forçado** | Prompt + parse; às vezes schema | `format: 'json'` (alguns cloud devolvem vazio) | Idem Ollama | Depende do endpoint; testar no spike |
| **Streaming** | Possível; Paxtu usa batch | `stream: false` no app | Idem | Preferir non-stream no MVP |
| **Lista de modelos** | Fixa / API Google | `GET /api/tags` | `GET /api/tags` ou `/v1/models` + Bearer; **nomes ≠** sufixo `:cloud` local | `/v1/models` ou lista curada pós-OAuth |
| **Erros** | finishReason MAX_TOKENS/SAFETY | HTTP + `done_reason` | 401 key, 429 cota | 401 refresh, **403 allowlist**, 429 cota assinatura |
| **Timeouts** | Médio | Local variável; cloud no daemon longo | Longo (rede) | Longo (thinking) |
| **Contexto** | Limite do modelo Google | `num_ctx` configurável | Alto na prática | Depende do modelo Grok |

### Arquitetura obrigatória: **dois níveis**

```
┌──────────────────────────────────────────────┐
│  Domínio Paxtu (único)                       │
│  GeneratorParams, MeetingPlan, multiphase    │
│  planningMode, catalogDigest, extractJson    │
└───────────────────┬──────────────────────────┘
                    │  mensagens lógicas:
                    │  { role: system|user, content: string }[]
                    │  expect: 'json' | 'text'
┌───────────────────▼──────────────────────────┐
│  LlmTransportAdapter (por provider)          │
│  - toProviderRequest(messages, opts)         │
│  - fromProviderResponse(raw) → text          │
│  - listModels()                              │
│  - ensureAuth() / refresh                    │
│  - mapError(err) → mensagem PT-BR            │
└───────────────────┬──────────────────────────┘
                    │  HTTP/SDK nativo do provedor
              Gemini | Ollama | xAI | …
```

**Regras:**
1. O router **não** monta body HTTP genérico “OpenAI para todo mundo”.  
2. Cada adapter **possui** o formato nativo (Gemini parts, Ollama `messages`+`options`, xAI chat vs responses).  
3. A saída normalizada para o domínio é sempre **`string` de texto** (e depois `extractJson` se a etapa for JSON).  
4. Opções de produto (`temperature`, “queremos JSON”, timeout) são **hints**; o adapter traduz ou ignora com log se o provedor não suportar.  
5. **Testes de contrato por adapter** no spike/PR: 1 completion texto + 1 JSON mínimo.  
6. Novos provedores = **novo adapter**, não `if` espalhado no `generateScoutPlan`.

### Ollama local vs cloud (mesmo “dialeto”, transporte diferente)

- Podem compartilhar `OllamaAdapter` com `mode: 'local' | 'cloud'`.  
- Cloud: base URL + `Authorization` + allowlist HTTPS.  
- Local: loopback only, sem Bearer.  
- **Nomes de modelo** podem divergir; `listModels()` sempre do host ativo.

### xAI (atenção extra)

- Spike define se OAuth usa **Chat Completions** ou **Responses**.  
- Não copiar o body Ollama.  
- Token refresh **antes** da chamada, não no renderer.

### Gemini

- Manter SDK / fluxo atual encapsulado no adapter.  
- Tratar `finishReason` no `mapError`.

---

## 5. UX em Configurações (seleção de uso)

### Layout proposto (ordem = preferência de produto)

```
Provedor de IA  (escolha na ordem recomendada)
○ Google Gemini (recomendado)   [ chave AI Studio ........ ]  ← 1º
○ Ollama — app local            [ URL localhost:11434 ] [ Testar ]  ← 2º
○ Ollama — Cloud (web)          [ chave ollama.com ] [ Testar ]  ← 3º
○ xAI Grok (assinatura)         [ Entrar com xAI/X ] [ Sair ]  ← 4º
Modelo: [ dropdown dependente do provedor ]
Contexto / saída: (visível p/ Ollama local e cloud; defaults 256k / parte)
```

### Regras de UI
1. Só um provedor **ativo** por vez (`llmProvider`).
2. Campos de outros provedores ficam recolhidos ou desabilitados, mas **preservados** (não apagar key Gemini ao usar Ollama).
3. “Testar conexão” por perfil:
   - local → tags sem auth  
   - cloud → tags com Bearer  
   - xAI → status token / mini completion  
   - Gemini → key presente (ping barato se houver)
4. No gerador: dropdown de modelos recarrega ao mudar provedor.

### Setup wizard
Mesmos quatro cards/opções, com copy curta de custo/privacidade.

---

## 6. Segurança de rede (Electron)

| Perfil | Política de URL no main |
|--------|-------------------------|
| `ollama-local` | **Só** loopback (`localhost`, `127.0.0.1`, `::1`) — como hoje |
| `ollama-cloud` | Allowlist: `https://ollama.com` (e subpaths `/api`, `/v1`) |
| `xai-oauth` | Allowlist: `https://api.x.ai`, `https://auth.x.ai`, `https://accounts.x.ai` |
| `gemini` | SDK / hosts Google já usados |

**Não** abrir “qualquer URL Ollama remota” no MVP sem allowlist (SSRF).  
Se no futuro quiserem “Ollama na LAN da sede”, isso vira perfil `ollama-remote` com IP privado + optional key — **fora do MVP**.

---

## 7. Pipeline de geração (domínio único; transporte por adapter)

**Camada de domínio (igual para todos):**

- `GeneratorParams` + `planningMode` (`from_selection` | `auto_link`)
- `catalogDigest` no auto_link
- Multiphase: esqueleto → atividades → study guide
- Ciclo com os mesmos modos
- `extractJson` compartilhado no **texto** retornado

**Camada de adapter (varia por provedor) — ver §4.1:**

- Como empacotar mensagens (payload de ida)
- Como autenticar e para qual host
- Como extrair o texto útil (payload de volta)
- Timeouts, retries, `format: json` vs prompt-only
- Mapeamento de erros e limites de contexto/modelo

Nunca assumir que “funciona no Ollama ⇒ cola no xAI/Gemini sem adapter”.

---

## 8. Migração do que já existe

| Hoje | Amanhã |
|------|--------|
| `llmProvider: 'ollama'` | Alias de `ollama-local` |
| `ollamaBaseUrl` | Continua no perfil local |
| Modelos `:cloud` via daemon | Continuam válidos no perfil **local** (app Ollama + signin) |
| Novo cloud direto | Perfil **`ollama-cloud`** com key, sem app local |

Usuário pode:
- Preferir **local** com `minimax-m3:cloud` (daemon), **ou**
- Preferir **ollama-cloud** com key e modelos do catálogo web  

São caminhos paralelos, não excludentes na config salva — só um ativo por vez.

---

## 9. Plano de PRs (visão conjunta)

Ordem sugerida (pode paralelizar após fundações):

| PR | Conteúdo |
|----|----------|
| **L0** | Introduzir interface `LlmTransportAdapter` + encapsular Gemini e Ollama local; alias `ollama` → `ollama-local` |
| **L1** | Adapter **`ollama-cloud`**: key, base `https://ollama.com`, IPC allowlist HTTPS, listModels + generate (payload Ollama + Bearer) |
| **L2** | UI Config/Setup: 4 opções na ordem de preferência (Gemini → local → cloud → xAI) |
| **X0** | Spike xAI OAuth (doc separado) — validar payload real (chat vs responses) + go/no-go |
| **X1–X4** | Adapter xAI + auth + UI (doc xAI) — **sem** reutilizar body Ollama |
| **L3** | Hardening: backup sem secrets; help; `mapError` por perfil; testes de contrato por adapter |

---

## 10. Key decisions (esta discussão)

| # | Decisão | Rationale |
|---|---------|-----------|
| P1 | Ollama local e Ollama Cloud são **dois perfis** | Auth e rede diferentes; UX clara |
| P2 | Cloud Ollama = **API key** oficial ollama.com | Documentado; sem app local |
| P3 | xAI assinatura = **OAuth**, não key de console | Cotas inclusas SuperGrok/Premium+ |
| P4 | **Gemini é o default e 1º na UI** | Free + simples via AI Studio |
| P5 | Seleção única em Configurações | Simples para chefia |
| P6 | Allowlist de hosts no Electron | Evita SSRF ao abrir cloud |
| P7 | Ordem preferencial: Gemini → local → Ollama web → xAI | Product owner 2026-07-18 |

---

## 11. Open questions

### R1 — Nome na UI do cloud Ollama
- “Ollama Cloud (chave web)”  
- “Ollama.com (API)”  
- Outro?

### R2 — Key Ollama Cloud: onde guardar no MVP
- A) `AppConfig` / localStorage como Gemini (rápido, menos seguro)  
- B) safeStorage no main (melhor; alinhado a xAI tokens)  

**Sugestão:** A no primeiro PR cloud; migrar para B junto com xAI se o spike for em paralelo.

### R3 — Modelos cloud locais (`:cloud` no daemon) vs cloud web
- Manter os dois caminhos documentados no help?  
- **Sugestão:** sim — “Com app Ollama” vs “Sem app, só chave ollama.com”.

### R4 — Ordem de implementação — **fechado com prioridade de produto**
1. Manter/polir **Gemini** (1º uso preferencial; free AI Studio).  
2. Manter/polir **Ollama local**.  
3. Entregar **Ollama Cloud (key)** — L0 → L1 → L2.  
4. **xAI OAuth** por último — X0 spike GO/NO-GO → X1… (só se GO).

### R5 — Preferência de produto — **fechado (2026-07-18)**
Ordem canônica: **Gemini → Ollama local → Ollama web → xAI OAuth**.

---

## 12. Resumo em uma frase

O Paxtu oferece **perfis de LLM plugáveis** na ordem preferencial **Gemini (AI Studio, grátis/simples) → Ollama local → Ollama Cloud (key) → xAI Grok OAuth (assinatura)** — todos em Configurações, mesmo motor de geração.

---

*Atualizar este doc quando R1–R4 forem fechados e quando o spike xAI reportar GO/NO-GO.*
