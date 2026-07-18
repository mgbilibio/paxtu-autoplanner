# Roadmap unificado Paxtu AutoPlanner (plano vivo)

**Data:** 2026-07-18  
**Status:** implementação parcial (2026-07-18) — progressão editável + Ollama Cloud + UI multi-provider; xAI OAuth ainda stub

---

## 1. Eixos do plano

| Eixo | Doc detalhado | Prioridade produto |
|------|----------------|--------------------|
| **A. Perfis de LLM** | [llm-provider-profiles](./2026-07-18-llm-provider-profiles.md) | Alta — default Gemini |
| **B. xAI OAuth (assinatura)** | [xai-oauth-provider](./2026-07-18-xai-oauth-provider.md) | 4º na ordem de uso |
| **C. Progressão: presença + edição de crédito** | [progressao-presenca-edicao](./2026-07-18-progressao-presenca-edicao.md) | Alta operacional (Agenda) |

Trabalho recente já no `main` (referência): modos `auto_link` / `from_selection`, multiphase Ollama, cadastro rápido de efetivo — **não** reabrir salvo bugfix.

---

## 2. Preferência de uso da IA (canônica)

1. **Gemini** — API key grátis/simples (AI Studio) ← **preferencial e default**  
2. **Ollama local** — app + porta `11434`  
3. **Ollama Cloud** — API web + chave (`ollama.com`)  
4. **xAI Grok OAuth** — SuperGrok / X Premium+ (limites da assinatura; sem API key faturada no MVP)

Todos selecionáveis em **Configurações**; um ativo por vez; credenciais dos outros preservadas.

---

## 3. Regra transversal de IA: adapters e payloads

**Não tratar todos os provedores como o mesmo HTTP body.**

- **Domínio único:** `GeneratorParams`, multiphase, `extractJson`, modos de planejamento.  
- **Adapter por provedor:** auth, host, **payload de request**, parsing da **response**, erros, timeouts, listagem de modelos.  
- Ollama local e Ollama Cloud: mesmo *dialeto* Ollama, transporte/auth diferentes.  
- Gemini e xAI: contratos **próprios** (SDK Google vs chat/responses xAI).  
- Detalhe: §4.1 do doc de perfis LLM.

---

## 4. Progressão por atividade (Agenda)

**Problema:** lançamento atual = todos os presentes recebem os códigos; não há “excluir quem não atingiu a avaliação”.

**Solução planejada:**
1. Marcar presença (todos que vieram).  
2. Lançar progressão → cria **lançamento** e credita (default = presentes).  
3. **Revisar crédito** → desmarcar / excluir quem não cumpriu objetivos de avaliação.  
4. Presença e frequência **não** mudam ao excluir crédito.  
5. Reversão de bloco só se o crédito veio **deste** lançamento.

Detalhe e PRs P0–P4: doc de progressão.

---

## 5. Ordem de entrega sugerida (PRs de produto)

Ordem pensada para valor cedo + risco controlado:

| Fase | Entrega | Depende |
|------|---------|---------|
| **Agora / base** | Gemini + Ollama local estáveis (já no ar) | — |
| **A0** | Interface `LlmTransportAdapter` + encapsular Gemini/Ollama | — |
| **A1** | Perfil Ollama Cloud (key + HTTPS allowlist) | A0 |
| **A2** | UI Config 4 perfis (ordem 1→4) | A1 |
| **C0–C2** | ProgressLaunch + lançar com audit + UI revisar crédito | pode **paralelizar** com A* |
| **C3–C4** | Reversão segura + help | C2 |
| **B0** | Spike xAI OAuth (conta real) GO/NO-GO | — |
| **B1–B4** | Auth + adapter xAI + UI (só se GO) | A0, B0 |

**xAI por último na preferência de uso** e **depois do spike**; não bloqueia Agenda/progressão nem Ollama Cloud.

---

## 6. Decisões já fechadas

| Tema | Decisão |
|------|---------|
| Ordem IA | Gemini → Ollama local → Ollama web → xAI |
| xAI contas | SuperGrok **e** X Premium+ |
| xAI 403 | Mensagem clara; fallback Gemini/Ollama; **sem** API key xAI no MVP |
| xAI token | Um por máquina/instalação |
| xAI spike client | client_id open-source (risco isolado) |
| Progressão | Presença ≠ crédito; cadastra todos → exclui |
| Payloads IA | Adapter por provedor; domínio compartilhado |

---

## 7. Ainda em aberto (menores)

| ID | Tema | Default sugerido |
|----|------|------------------|
| R1 | Nome UI Ollama Cloud | “Ollama Cloud (chave web)” |
| R2 | Onde guardar key Ollama Cloud no 1º PR | Como Gemini; depois safeStorage |
| Q4 | Modelo default xAI | O que o spike validar |
| G-extra | Um launch por eventId | Sim no MVP |

---

## 8. Critérios de “plano cumprido” (macro)

- [x] Chefia escolhe Gemini (default), Ollama local ou Ollama Cloud em Configurações; xAI listado como “em breve”.  
- [x] Ollama local e cloud usam transporte/auth distintos (loopback vs `ollama.com` + Bearer).  
- [x] Na Agenda: lançar para presentes e **revisar crédito** (excluir/re-incluir), sem perder presença.  
- [ ] xAI OAuth completo (spike GO + adapter)  
- [x] Help Agenda atualizado.

---

## 9. Índice dos design docs

1. [Perfis LLM + adapters/payloads](./2026-07-18-llm-provider-profiles.md)  
2. [xAI OAuth](./2026-07-18-xai-oauth-provider.md)  
3. [Progressão presença + edição](./2026-07-18-progressao-presenca-edicao.md)  
4. Este roadmap  

---

*Atualizar este arquivo quando spikes fecharem GO/NO-GO ou mudarem prioridades de produto.*
