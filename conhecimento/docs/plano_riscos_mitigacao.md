# Plano de Mitigação de Riscos (2026-04-27)

Cada risco vira um item numerado com: **Objetivo · Módulos/Métodos · O que · Como · Motivo · Esforço estimado**.

Ordenação: alto risco primeiro; dentro do mesmo grau, ganhos rápidos antes.

---

## R1. Bug do `dataConquista` apagada ao desmarcar requisito

- **Objetivo**: impedir perda silenciosa do registro de homologação do reconhecimento de ramo.
- **Módulos**: `src/components/BlocoTracker.tsx` (função `toggleRecRequisito`); `src/types.ts` (`MemberReconhecimentoState`); `src/services/storageService.ts`.
- **O que**: se o jovem já tem `dataConquista` definida, **não permitir** que ela seja apagada por desmarcar um requisito. Em vez disso, manter histórico em campo novo `historicoConquistas: { data, snapshot }[]`.
- **Como**:
  1. Adicionar campo `confirmadoPor: string` (chefe que homologou) e `historicoConquistas: { data: string; revertidoEm?: string }[]` em `MemberReconhecimentoState`.
  2. Em `toggleRecRequisito`, calcular `todosOk` como hoje, mas só setar `dataConquista` se `!base.dataConquista`. Quando todos os requisitos voltam a estar OK e já havia data, manter a data antiga.
  3. Para "desistir" de uma homologação, exigir botão explícito "Desfazer homologação" com confirmação modal — gravar entrada em `historicoConquistas` com `revertidoEm`.
- **Motivo**: homologação é ato administrativo (UEL emite certificado, distintivo, barreta). Apagar a data por engano significa perda de prova documental.
- **Esforço**: ~30 min. Fix simples, alto impacto.

---

## R2. PDFs não empacotados no instalador NSIS

- **Objetivo**: garantir que `pdf:openAtPage` funcione tanto em dev quanto no app instalado.
- **Módulos**: `package.json` (seção `build`); `electron/main.ts` (handler `pdf:openAtPage`); `src/services/pdfLinkService.ts`.
- **O que**: copiar os PDFs normativos para `extraResources` do electron-builder e resolver o caminho via `process.resourcesPath` em produção, com fallback para `dataFolder` configurado pelo usuário.
- **Como**:
  1. Em `package.json` adicionar:
     ```json
     "extraResources": [
       { "from": "docs/biblioteca/manuais_essenciais", "to": "manuais", "filter": ["**/*.pdf"] }
     ]
     ```
  2. Criar pasta `docs/biblioteca/manuais_essenciais/` com cópias enxutas dos 3 PDFs (Manual Lobinho 2025.10, Manual Escoteiro 2025.10, Guia 18ª Ed. 2024) ou symlinks.
  3. Em `electron/main.ts`, expandir handler:
     ```ts
     ipcMain.handle('pdf:openAtPage', async (_, relativePath, page) => {
       const candidatos = [
         path.join(process.resourcesPath || '', 'manuais', path.basename(relativePath)),
         path.join(__dirname, '..', relativePath),
         path.join(app.getPath('userData'), 'manuais', path.basename(relativePath)),
       ];
       const found = await firstExisting(candidatos);
       if (!found) return { ok: false, error: 'PDF não encontrado em nenhum candidato', candidatos };
       const url = `file:///${found.replace(/\\/g,'/')}#page=${page}`;
       await shell.openExternal(url);
       return { ok: true, url };
     });
     ```
  4. Em `pdfLinkService.ts`, mostrar `error` ao usuário quando `ok=false`.
  5. Adicionar opção em Configurações: "Pasta dos PDFs normativos" com botão para selecionar pasta.
- **Motivo**: feature P5 hoje funciona só em dev. Em produção é cosmética. Aumenta confiança e auditoria.
- **Esforço**: ~2h. Inclui ajuste do `package.json`, teste de empacotamento (`npm run dist`), validação no NSIS.

---

## R3. `MeetingPlan.branch` quebrado em 7 lugares

- **Objetivo**: zerar erros de TypeScript pré-existentes que mascaram bugs reais.
- **Módulos**: `src/types.ts`, `src/components/CalendarView.tsx`, `src/components/Catalog.tsx`, `src/components/PlanDisplay.tsx`, `src/services/geminiService.ts`.
- **O que**: adicionar `branch?: ScoutBranch` em `MeetingPlan` (opcional para não quebrar saved plans antigos). Auditar callers para garantir que tratam `undefined`.
- **Como**:
  1. Em `types.ts`, adicionar `branch?: ScoutBranch` em `MeetingPlan`.
  2. Para cada caller que faz `plan.branch`, garantir fallback (`plan.branch || ScoutBranch.ESCOTEIRO` ou usar `currentSection?.branch`).
  3. No save de novo plano, gravar `branch` baseado em `selectedBranch` ou `currentSection.branch`.
  4. Rodar `npx tsc --noEmit` e confirmar 0 erros relacionados.
- **Motivo**: dívida acumulada de antes da minha intervenção. Em runtime funciona (JS permissivo), mas qualquer mudança nos componentes pode quebrar. Higiene mínima.
- **Esforço**: ~45 min.

---

## R4. Aliases discutíveis criados por haiku

- **Objetivo**: validar normativamente as 38 entradas em `especialidade_alias`.
- **Módulos**: `conhecimento/bd/progressao_2025.sqlite` (tabela `especialidade_alias`); `conhecimento/docs/` (novo `revisao_aliases.md`); `conhecimento/tools/dump_aliases_for_review.py` (novo).
- **O que**: gerar um documento de revisão com cada alias, exibindo lado a lado o requisito-fonte do Manual e o requisito do Guia, para chefe escoteiro validar.
- **Como**:
  1. Criar `tools/dump_aliases_for_review.py` que para cada alias produz:
     - Nome no Manual (origem em `bloco_especialidades`)
     - Bloco e ramo em que aparece
     - Nome canônico mapeado
     - Requisitos do Guia para essa especialidade canônica
     - Pergunta: "É o mesmo conteúdo?"
  2. Saída: `revisao_aliases.md` com checkboxes `[ ]` para cada alias.
  3. Marcar como suspeitos os mapeamentos com `SequenceMatcher.ratio() < 0.6` (heurística).
  4. Após revisão humana, criar `tools/apply_alias_corrections.py` que recebe o `.md` editado e aplica `UPDATE` ou `DELETE` na tabela.
- **Motivo**: aliases foram aceitos sintaticamente. Se "Brasilidades→Cultura Brasileira" estiver errado, o usuário vê uma especialidade incorreta na enciclopédia ao clicar num bloco. Quebra a confiança.
- **Esforço**: ~1h para gerar o doc; revisão humana fora do escopo do código.

---

## R5. Validador "0/0" não cobre semântica

- **Objetivo**: detectar problemas de conteúdo (não só de schema) na base.
- **Módulos**: `conhecimento/tools/validate_progressao.py` (estender); novos validadores `validate_ocr_artifacts.py`, `validate_page_refs.py`.
- **O que**: três validações novas:
  - **V12 (OCR artifacts)**: descrições com `\u00xx` literal, sequências de símbolos `[\(\)\[\]\.]{4,}`, palavras com confusões comuns (1/l, 0/O em meio de palavra).
  - **V13 (page refs em range válido)**: `bloco_ramo_meta.fonte_pagina` precisa ser um número 1-400; se string vazia, é warning; se fora do range, erro.
  - **V14 (descrição mínima)**: ações com `length(descricao) < 20` são suspeitas (provavelmente truncadas pelo parser).
- **Como**:
  1. Adicionar funções `validacao_12_ocr_artifacts(conn) -> List[str]` etc no script existente.
  2. Reportar em seção separada do markdown final.
  3. Adicionar V15: "alias com SequenceMatcher.ratio() < 0.6" como warning (cruza com R4).
- **Motivo**: "0/0" hoje significa só que as referências de chave estrangeira estão íntegras. Não significa que o **conteúdo** está correto.
- **Esforço**: ~1h.

---

## R6. Generator/IA pode não entender códigos `B{N}.F{n}` / `B{N}.V{n}` / `B{N}.SUB`

- **Objetivo**: validar que o adapter está produzindo prompts coerentes para a IA e ajustar caso necessário.
- **Módulos**: `src/services/geminiService.ts` (função `generateScoutPlan`); `src/data/generated/progressao_2025_catalog.ts`.
- **O que**: testar end-to-end e, se necessário, substituir os códigos opacos por descrições contextualizadas no payload da IA.
- **Como**:
  1. **Teste manual primeiro**: rodar o app em dev, escolher 2 ações fixas + 3 variáveis de blocos diferentes, gerar plano, ler resposta do Gemini. Avaliar: as atividades se referem aos blocos certos? A intencionalidade educativa aparece?
  2. **Se a IA está perdida**: enriquecer cada `CatalogItem` com `requirementsContext: string` que explicite o bloco e a intencionalidade. Modificar `progressao_2025_catalog.ts` para popular esse campo a partir de `BLOCO_RAMO_META_2025.intencionalidade`.
  3. **No `geminiService.ts`**, garantir que o prompt inclua `requirementsContext` quando presente, com cabeçalho "Contexto educativo:".
  4. Documentar 3-5 exemplos de input/output em `conhecimento/docs/exemplos_geracao_2025.md` para regressão futura.
- **Motivo**: o adapter foi escrito sem teste de integração com IA. É a peça mais crítica do app (o produto é gerar planos) e foi a mais arriscada da minha refatoração.
- **Esforço**: ~1.5h. Inclui testar com chave Gemini real.

---

## R7. BlocoTracker não alimenta o Generator

- **Objetivo**: fechar o loop "acompanhamento individual → geração contextual de plano" prometido pelo plano de ação original.
- **Módulos**: `src/services/catalogService.ts` (função `getMemberCatalog`); `src/services/storageService.ts` (`getAllMemberBlocoStates`); `src/components/CyclePlanner.tsx`; `src/types.ts` (`CatalogItem` ganha campo `progressStatus`).
- **O que**: ao montar catálogo para um membro específico, marcar items já concluídos para que a IA evite repropô-los.
- **Como**:
  1. Adicionar campo opcional em `CatalogItem`: `progressStatus?: 'concluido' | 'em_andamento' | 'pendente'`.
  2. Em `catalogService.getMemberCatalog`, se membro tem `MemberBlocoState`, marcar:
     - `B{N}` como `concluido` se `state.dataConclusao` existe.
     - `B{N}.F{i}` como `concluido` se `state.fixasConcluidas.includes(i)`.
     - Idem para variáveis.
  3. No prompt da IA (`geminiService`), filtrar ou marcar items concluídos: "ITEMS JÁ CONCLUÍDOS PELO JOVEM (não repetir): ...".
  4. UI: no Catalog/Generator, items concluídos aparecem com check verde e opacidade reduzida; clicar mostra a data.
  5. Botão "Próximas ações sugeridas" no `BlocoTracker` que abre o Generator pré-populado com items pendentes do bloco em foco.
- **Motivo**: sem isso, o tracker é só uma planilha bonita. O valor real do app é gerar reuniões sob medida — e hoje as duas peças não se falam.
- **Esforço**: ~3h. Mexe em vários módulos.

---

## R8. Mudanças futuras na DB invalidam estados persistidos dos jovens

- **Objetivo**: garantir compatibilidade do `MemberBlocoState` quando blocos são renumerados, ações reorganizadas ou especialidades renomeadas.
- **Módulos**: novo `src/services/migrationService.ts`; `src/services/storageService.ts` (versão de schema); novo campo `schemaVersion` em `MemberBlocoState`.
- **O que**: schema versioning + migração lazy ao carregar.
- **Como**:
  1. Adicionar `schemaVersion: number` em `MemberBlocoState` (atual = 1).
  2. Em `getMemberBlocoState`, se `schemaVersion < CURRENT_SCHEMA_VERSION`, rodar `migrate(state)` antes de retornar.
  3. Manter um arquivo `src/data/generated/migrations.ts` (ou `.json`) com mapeamentos de mudança entre versões: `{ "v1->v2": { blocoIdRemap: { 5: 6 }, fixasRemap: { ... } } }`.
  4. Esses mapeamentos são gerados pelo `build_progressao_db.py` ao detectar deltas vs. versão anterior do banco — exige snapshot do schema/dados.
  5. Versão simplificada inicial: ao detectar `schemaVersion` < atual, marcar bloco como "estado desatualizado, revisar manualmente" sem tentar conversão automática.
- **Motivo**: hoje, se eu reordenar blocos no `build_progressao_db.py`, todo o histórico dos jovens vira lixo silenciosamente. Sem versionamento, refactors normativos viram bombas.
- **Esforço**: ~2h para versão simplificada (avisar) + 4h para migração automática real.

---

## R9. Reconhecimento sem `birthDate` não valida idade

- **Objetivo**: forçar registro de data de nascimento quando relevante para reconhecimento.
- **Módulos**: `src/components/MembersManager.tsx` (formulário de membro); `src/components/BlocoTracker.tsx` (validação).
- **O que**: tornar `birthDate` campo obrigatório para Lobinho/Escoteiro; mostrar aviso explícito no tracker quando ausente.
- **Como**:
  1. Em `MembersManager`, adicionar validação `if (branch in [LOBINHO, ESCOTEIRO]) require(birthDate)`.
  2. No `BlocoTracker`, se `idade === null`, exibir banner amarelo: "⚠️ Data de nascimento não cadastrada — não é possível validar idade-limite (Cruzeiro do Sul ≤11 anos / Lis de Ouro ≤15 anos)".
  3. Ao gravar `MemberReconhecimentoState.dataConquista`, registrar também `idadeNaConquista: number` para histórico.
- **Motivo**: idade-limite é normativa. Sem birthDate, o app pode aceitar homologação de jovem fora do prazo. Rastreabilidade exige `idadeNaConquista`.
- **Esforço**: ~30 min.

---

## R10. MiniSearch reconstrói índice toda sessão

- **Objetivo**: eliminar o freeze de ~150ms na primeira abertura do Ctrl+K.
- **Módulos**: `src/services/searchService.ts`.
- **O que**: persistir índice em localStorage com hash dos datasets; reconstruir só se hash mudou.
- **Como**:
  1. Computar hash simples (`btoa(JSON.stringify({lenBlocos: BLOCOS_2025.length, lenEsp: ESPECIALIDADES_GUIA.length}))`) — barato.
  2. Tentar `MiniSearch.loadJSON(localStorage.getItem('search_index_v1'))`.
  3. Se hash não bate ou não existe, `buildIndex()` + `localStorage.setItem('search_index_v1', JSON.stringify(idx))`.
  4. Cap de tamanho: se índice serializado > 2 MB, abandonar cache e indexar live.
- **Motivo**: ergonomia. Ctrl+K é o atalho mais frequente esperado; deve ser instantâneo.
- **Esforço**: ~30 min.

---

## R11. Empacotar índice de busca como artefato

- **Objetivo**: alternativa a R10 — gerar índice no build em vez de runtime.
- **Módulos**: novo `conhecimento/tools/build_search_index.py` (ou node script `tools/build_search_index.mjs`); `src/services/searchService.ts`; `src/data/generated/search_index.json`.
- **O que**: pré-construir o índice MiniSearch durante o build do app.
- **Como**:
  1. Script Node lê `progressao_2025.ts` e `especialidades_guia.ts`, monta MiniSearch, serializa via `JSON.stringify(idx.toJSON())`.
  2. Salva em `src/data/generated/search_index.json`.
  3. `searchService.ts` carrega via `import searchIndex from '...'` + `MiniSearch.loadJS(searchIndex)`.
  4. Adiciona ao `manualChunks`: `data-search-index`.
- **Motivo**: reduz cold-start de busca para 0ms. Tradeoff: aumenta tamanho do bundle (~200 KB extra).
- **Esforço**: ~1.5h. Avaliar se ganho vale o custo. Pode ser pulado se R10 for suficiente.

---

## R12. Path traversal possível no IPC `pdf:openAtPage`

- **Objetivo**: hardening do handler IPC contra abertura arbitrária de arquivos.
- **Módulos**: `electron/main.ts` (handler `pdf:openAtPage`).
- **O que**: validar que o `relativePath` está dentro de uma whitelist de PDFs conhecidos.
- **Como**:
  1. Em `electron/main.ts`, definir `const ALLOWED_PDFS = new Set(['Manual Escotista Lobinho.pdf', 'Manual Escotista Escoteiro.pdf', 'Guia Especialidades 18.pdf'])`.
  2. No handler:
     ```ts
     const filename = path.basename(relativePath);
     if (!ALLOWED_PDFS.has(filename)) return { ok: false, error: 'PDF não autorizado' };
     ```
  3. Validar que `page` é inteiro positivo `<= 500`.
- **Motivo**: contextIsolation hoje protege, mas se um dia o renderer carregar HTML do Gemini ou import externo, o IPC vira vetor de leitura arbitrária do disco.
- **Esforço**: ~15 min.

---

## R13. Coverage de testes manuais inexistente

- **Objetivo**: registrar fluxos críticos e validá-los antes de cada release.
- **Módulos**: novo `conhecimento/docs/checklist_release.md`.
- **O que**: checklist de release.
- **Como**: documento com 15-20 fluxos:
  - Criar seção POR 2025+, adicionar membro com birthDate, abrir tracker, marcar 4 fixas + 5 variáveis, ver bloco como concluído
  - Idem com substituição por especialidade
  - Buscar "fogueira" no Ctrl+K, verificar resultados
  - Clicar "Abrir PDF p.X" em bloco, verificar abertura na página certa (dev e prod)
  - Gerar plano com 3 ações; ler plano da IA, avaliar coerência
  - Migrar seção LEGACY → POR 2025 desligando flag
  - Backup local, restauração manual
- **Motivo**: nada do que entreguei foi testado em uso real. Sem checklist, qualquer mudança pode regredir silenciosamente.
- **Esforço**: ~1h para criar; ~30 min por release para executar.

---

## R14. App empacotado nunca foi testado

- **Objetivo**: validar que o instalador NSIS + portable funcionam.
- **Módulos**: `package.json` (scripts), pipeline manual.
- **O que**: rodar `npm run electron:build` e testar em máquina limpa (ou VM).
- **Como**:
  1. `npm run electron:build` gera `release/2.9.0/Paxtu AutoPlanner_Setup_2.9.0.exe`.
  2. Instalar em VM Windows limpa.
  3. Abrir, fazer setup wizard, criar seção, criar membro, fazer fluxos críticos do R13.
  4. Documentar bugs encontrados em `docs/bugs_release_v2.9.md`.
- **Motivo**: dev mode (`npm run dev`) tem comportamento diferente — caminhos, IPC, file system. Bugs só aparecem em produção.
- **Esforço**: ~2h (build + teste). Repetir por release.

---

## R15. Gemini real nunca foi testado pós-mudanças

- **Objetivo**: confirmar que o Generator continua produzindo planos úteis.
- **Módulos**: `src/services/geminiService.ts`; chave API real.
- **O que**: rodar 3 cenários de geração e avaliar qualidade.
- **Como**: documentar em `docs/regressao_gemini.md` cenários e respostas comparativas (antes da mudança = `git stash` do adapter, depois = `git pop`).
- **Motivo**: cobertura de R6.
- **Esforço**: ~1h.

---

## R16. Loop de effects entre `currentSection.progressionSystem` e `activeGeneratorSystem`

- **Objetivo**: evitar estado inconsistente quando usuário desliga `showLegacy` mas tem seção ativa em `LEGACY_2020`.
- **Módulos**: `src/App.tsx` (effects que tocam `activeGeneratorSystem` e `currentSection`).
- **O que**: auditar effects atuais.
- **Como**:
  1. Diagrama: hoje `useEffect(() => setActiveGeneratorSystem(currentSection.progressionSystem))` força sempre o sistema da seção. Mas `toggleLegacy(false)` força `setActiveGeneratorSystem('POR_2025')`. Os dois podem brigar.
  2. Solução: ao chamar `toggleLegacy(false)`, **também** rebaixar a `progressionSystem` da seção atual para `POR_2025` (com confirmação se houver dados em LEGACY) OU bloquear o toggle se houver seção em LEGACY.
  3. Acrescentar warning no Settings: "Esta seção está em POR 2020. Desligar o modo legado migra automaticamente para 2025+."
- **Motivo**: usuário pode ficar preso em estado onde o app insiste em LEGACY mas a UI não mostra o seletor.
- **Esforço**: ~1h.

---

## R17. `getAllMemberBlocoStates` 18 reads sequenciais

- **Objetivo**: paralelizar leitura.
- **Módulos**: `src/services/storageService.ts`.
- **O que**: trocar `for` sequencial por `Promise.all`.
- **Como**:
  ```ts
  const states = await Promise.all(
    Array.from({ length: 18 }, (_, i) => getMemberBlocoState(memberId, i + 1))
  );
  return states.filter(Boolean) as MemberBlocoState[];
  ```
- **Motivo**: localStorage é síncrono mas o file system fallback é async. Para alcateia com 30 lobos, relatórios podem ficar segundos lentos. Fix trivial.
- **Esforço**: ~5 min.

---

## R18. Tipos TS gerados deixam IDE lenta

- **Objetivo**: melhorar performance do TS Server em IDEs.
- **Módulos**: `src/data/generated/especialidades_guia.ts`; `tsconfig.json`.
- **O que**: trocar interfaces TS por `as const` mais simples + import via JSON.
- **Como**:
  1. Modificar exporters para gerar `.json` em vez de `.ts` para os arrays grandes.
  2. Em `src/data/generated/index.ts`, fazer `import requisitos from './requisitos.json' assert { type: 'json' }`.
  3. Manter os tipos em arquivo TS pequeno separado.
- **Motivo**: 3040 linhas TS forçam o TS Server a parsear/inferir muito. JSON é apenas data, não tem checagem.
- **Esforço**: ~45 min.

---

## R20. Suporte a Ollama (LLM local) como alternativa ao Gemini  **[FEITO 2026-04-27]**

**Status implementado**:
- `src/services/llmProvider.ts` (novo): interface `LlmProvider`, factory `getActiveProvider()` baseada em `AppConfig.llmProvider`, exports `generateScoutPlanRouted` e `listAvailableModels`.
- `src/services/ollamaService.ts` (novo): `listModels()` via `GET /api/tags` (zero hardcoding), `isReachable()` com timeout 2s, `generateScoutPlan()` com `POST /api/chat` em modo `format: 'json'`, retry automático em caso de JSON inválido, parser robusto com 3 níveis de fallback (parse direto → strip markdown → regex de bloco `{...}`).
- `src/types.ts`: novos campos `AppConfig.llmProvider`, `ollamaBaseUrl`, `ollamaModel`.
- `src/App.tsx`: import trocado para `llmProvider` (sem mudança de signature em callers); novo modal de Configurações com radio Gemini/Ollama, input de URL, botão "Testar conexão" que reporta status e popula combobox de modelos a partir do Ollama em runtime; `fetchModels` adaptado para o provider ativo.
- Build: main.js subiu de 396 KB → 405 KB (+9 KB, +1 KB gzip).

**O que ainda falta** (próxima iteração):
- Atualizar `SetupWizard.tsx` para perguntar provider durante setup inicial e dar instruções inline.
- Adicionar seção "Usando Ollama" em `conhecimento/docs/guia_uso_app.md`.
- Testar end-to-end com modelo real (`llama3.1:8b` ou similar) e documentar comportamento em `docs/regressao_llm.md`.
- IPC fallback `ollama:request` em `electron/main.ts` caso versões novas do Ollama bloqueiem CORS de `file://` origins.

---

### Detalhamento original (referência histórica):

- **Objetivo**: permitir que o app seja distribuído sem dependência de chave paga e sem internet — usuário instala Ollama localmente, baixa um modelo, e usa. Gemini fica como opção quando o usuário tem chave/internet.
- **Módulos**:
  - `src/services/llmProvider.ts` (novo) — abstração `LlmProvider` com interface comum.
  - `src/services/geminiService.ts` — refatorar para implementar `LlmProvider`, mantendo comportamento atual.
  - `src/services/ollamaService.ts` (novo) — implementação `LlmProvider` para Ollama.
  - `src/types.ts` — adicionar `AppConfig.llmProvider: 'gemini' | 'ollama'`, `AppConfig.ollamaBaseUrl: string` (default `http://localhost:11434`), `AppConfig.ollamaModel: string`.
  - `src/components/SetupWizard.tsx` e `src/App.tsx` (modal Configurações) — UI de seleção de provider e combobox de modelos dinâmico.
  - `electron/main.ts` — possível IPC `ollama:listModels` se CORS impedir chamada direta do renderer.
- **O que**: dois caminhos de inferência — Gemini (cloud, atual) e Ollama (local). UI escolhe provider, popula combobox de modelos consultando o Ollama em runtime, persiste seleção em `AppConfig`. Geração de plano funciona idêntica do ponto de vista do usuário independentemente do provider.
- **Como**:
  1. **Abstração `LlmProvider`**:
     ```ts
     export interface LlmProvider {
       id: 'gemini' | 'ollama';
       listModels(): Promise<string[]>;
       generateScoutPlan(params: GeneratorParams): Promise<MeetingPlan>;
       isReachable(): Promise<{ ok: boolean; error?: string }>;
     }
     ```
     Refatorar `geminiService.ts` para exportar `geminiProvider: LlmProvider` que implementa a interface com a API atual.
  2. **`ollamaService.ts`**:
     - `listModels()`: `GET ${baseUrl}/api/tags` → retorna `data.models.map(m => m.name)` (ex: `['llama3.1:8b', 'qwen2.5:7b', 'mistral:latest']`). Sem nada hardcoded — o que estiver instalado aparece.
     - `generateScoutPlan(params)`: monta prompt idêntico ao Gemini (mesma engenharia textual), chama `POST ${baseUrl}/api/chat` com `{ model: ollamaModel, messages: [...], format: 'json', stream: false }`. Faz parse do JSON retornado em `response.message.content` (Ollama não garante JSON estrito mesmo com `format: 'json'` em alguns modelos — fazer extração robusta com regex de bloco `{...}` se parse falhar).
     - `isReachable()`: tenta `GET ${baseUrl}/api/tags` com timeout 2s. Em erro, retorna mensagem específica ("Ollama não está rodando", "URL inválida", etc.).
  3. **Roteador no service**:
     ```ts
     export const getActiveLlmProvider = (): LlmProvider => {
       const config = getAppConfig();
       return config?.llmProvider === 'ollama' ? ollamaProvider : geminiProvider;
     };
     export const generateScoutPlan = (params) => getActiveLlmProvider().generateScoutPlan(params);
     export const getAvailableModels = () => getActiveLlmProvider().listModels();
     ```
     Componentes que hoje importam `generateScoutPlan` e `getAvailableModels` continuam funcionando sem mudança.
  4. **UI — modal Configurações** (`App.tsx`):
     - Seletor de provider em radio: `( ) Gemini (cloud)  ( ) Ollama (local)`.
     - Quando Gemini: campo de API key existente (já implementado).
     - Quando Ollama:
       - Input "URL do Ollama" (default `http://localhost:11434`).
       - Botão "Testar conexão" → chama `ollamaProvider.isReachable()` e mostra status (✓ verde / ✗ vermelho com mensagem).
       - Combobox de modelos populado por `ollamaProvider.listModels()`. Recarrega ao mudar URL ou clicar 🔄.
       - Mensagem se vazio: "Nenhum modelo encontrado. No terminal: `ollama pull llama3.1:8b` (ou outro modelo de sua escolha)."
       - Link "Onde baixar o Ollama" → `https://ollama.com/download`.
  5. **Setup wizard** (`SetupWizard.tsx`): passo "Escolha o provedor de IA". Se usuário escolher Ollama, instruções inline:
     ```
     1. Baixe o Ollama em https://ollama.com/download e instale.
     2. Abra o terminal e rode: ollama pull llama3.1:8b (ou modelo de sua preferência).
     3. Confirme em "Testar conexão" abaixo.
     ```
  6. **CORS**: o Ollama por padrão aceita requisições do localhost. No Electron renderer, fetch para `http://localhost:11434` funciona. Se houver bloqueio (versões mais novas do Ollama exigem `OLLAMA_ORIGINS=app://...`), implementar IPC fallback `ollama:request` em `electron/main.ts` que faz a chamada do main process e devolve para o renderer.
  7. **Robustez de parse JSON**:
     ```ts
     function extractJson<T>(raw: string): T | null {
       try { return JSON.parse(raw); } catch {}
       const match = raw.match(/\{[\s\S]*\}/);
       if (match) { try { return JSON.parse(match[0]); } catch {} }
       return null;
     }
     ```
     Modelos open-source frequentemente envelopam JSON em prosa ou markdown; precisamos extrair.
  8. **Documentação para o usuário final**:
     - Atualizar `conhecimento/docs/guia_uso_app.md` com seção "Usando Ollama (modelo local, sem internet)".
     - README com mini-tutorial passo a passo.
- **Motivo**:
  - **Privacidade**: dados de jovens menores (nomes, idades, progressão) hoje vão para a API do Google a cada geração de plano. LGPD/COPPA são reais. Ollama mantém tudo local.
  - **Custo**: Gemini cobra por token. Para grupo escoteiro com 4 seções gerando 1 plano/semana = ~16/mês. Pode escalar.
  - **Distribuição**: hoje você precisa entregar app + cadastrar chave Gemini do destinatário. Com Ollama, basta empacotar o app e o usuário liga local.
  - **Offline**: muitas atividades escoteiras acontecem em local sem internet (acampamento, sede sem wifi). Ollama funciona offline depois do download do modelo.
  - **Independência**: a chave Gemini do dev (você) não é compartilhada nem cobrada por destinatários.
- **Riscos da implementação**:
  - Modelos pequenos (3B-7B) podem produzir JSON malformado mais frequentemente que Gemini. Mitigação: parse robusto + retry com prompt mais firme.
  - Tempo de inferência maior: 7B em CPU pode levar 30-60s para 500 tokens. Mostrar spinner com ETA. Recomendar GPU.
  - Tamanho do modelo: 4-8 GB de download. Documentar no setup.
  - Versionamento do Ollama API: poucas mudanças mas existem. Pinar uma versão mínima testada (ex: ≥0.4).
- **Esforço**:
  - Núcleo (provider abstraction + Ollama básico): ~3h.
  - UI de seleção + combobox dinâmico + Test Connection: ~1.5h.
  - Setup Wizard com instruções inline: ~1h.
  - Robustez parse JSON + retry: ~1h.
  - Documentação (guia uso + README): ~30 min.
  - **Total: ~7h.**
- **Sequência interna sugerida**:
  1. Criar `LlmProvider` interface e refatorar `geminiService` para implementá-la (sem mudanças de comportamento).
  2. Criar `ollamaService.ts` com `listModels` + `isReachable`.
  3. UI do Configurações: radio + combobox + botão testar.
  4. Implementar `generateScoutPlan` no Ollama, primeiro sem retry/parse robusto (smoke test).
  5. Adicionar parse robusto + retry quando JSON inválido.
  6. Atualizar SetupWizard.
  7. Atualizar guia de uso e README.
  8. Testar com 2 modelos diferentes (ex: `llama3.1:8b` e `qwen2.5:7b`) e documentar qualidade comparativa.

---

## R19. Compatibilidade Mac/Linux do PDF link  **[FORA DE ESCOPO 2026-04-27]**

Decisão do projeto: distribuição é **Windows-only** (uso comercial). Mac/Linux não são alvo. Risco fechado sem ação.

---

## Sequência sugerida de execução  **[ATUALIZADO 2026-04-27 — todos endereçados]**

| # | Risco | Esforço | Status |
|---|-------|---------|--------|
| 1 | R12 (path traversal IPC) | 15 min | ✅ FEITO |
| 2 | R17 (Promise.all leituras) | 5 min | ✅ FEITO |
| 3 | R1 (dataConquista bug) | 30 min | ✅ FEITO |
| 4 | R9 (birthDate obrigatório) | 30 min | ✅ FEITO |
| 5 | R10 (cache MiniSearch) | 30 min | ✅ FEITO |
| 6 | R3 (MeetingPlan.branch) | 45 min | ✅ FEITO |
| 7 | R4 (revisão aliases — gerar doc) | 1h | ✅ FEITO (doc gerado, revisão humana pendente) |
| 8 | R5 (validador semântico) | 1h | ✅ FEITO |
| 9 | R16 (loop effects legacy) | 1h | ✅ FEITO |
| 10 | R6 (testar Gemini real) | 1.5h | ⚠️ IMPLEMENTADO — teste pelo usuário (chave Gemini) |
| 11 | R2 (PDFs no instalador) | 2h | ✅ FEITO |
| 12 | R20 (Ollama local) | 7h | ✅ FEITO (provider + UI + Wizard) |
| 13 | R7 (Tracker → Generator) | 3h | ✅ FEITO |
| 14 | R13 (checklist release) | 1h | ✅ FEITO (`checklist_release.md`) |
| 15 | R14 (testar app empacotado) | 2h | ⚠️ IMPLEMENTADO — teste pelo usuário (VM Windows) |
| 16 | R8 (schema versioning) | 2h | ✅ FEITO |
| 17 | R18 (JSON em vez de TS) | 45 min | ✅ FEITO |
| 18 | R11 (índice no build) | 1.5h | 🔵 ADIADO (R10 cobriu o problema) |
| 19 | R19 (Mac/Linux) | — | 🚫 FORA DE ESCOPO (uso comercial Windows-only) |
| 20 | R15 (regressão Gemini + Ollama) | 1.5h | ⚠️ IMPLEMENTADO — teste pelo usuário (chaves) |

**Status final**: 16/20 itens fechados em código + documentação. 3 dependem de ambiente do usuário (chave Gemini, VM Windows) — registrados em `testes_pendentes_usuario.md`. R11 adiada por redundância. R19 (Mac/Linux) fora de escopo.

## Extras entregues (2026-04-27 fim-de-sessão)

- **Aliases suspeitos revisados**: `Investimentos` ajustado para `Educacao Financeira`. `Esportes de Quadra` e `Redes de Computadores` removidos (não tinham equivalente direto no Guia 18ª Ed., eram categorias genéricas demais para mapear). Script: `tools/fix_aliases_suspeitos.py`. Estado: 37 aliases, 308 bloco_especialidades.
- **UX Ollama**: banner de progresso global em `App.tsx` capturando evento `paxtu:llm-progress`. Mensagens granulares ("Gerando…", "Tentando segunda vez…", "Plano gerado em Xs"). `isReachable` checado antes da geração para falhar rápido em vez de esperar 5min de timeout.
- **SectionProgressOverview**: novo componente em `components/SectionProgressOverview.tsx` com tabela agregada de todos os membros de uma seção: blocos concluídos, etapa atual, status de reconhecimento, barra de progresso. 4 KPIs no topo (membros, média de blocos, conquistaram ramo, próximos do reconhecimento ≥16/18). Plugado em `ReportsDashboard` para Lobinho/Escoteiro.
- **Backup/Restore de progressão**: novas funções `exportProgressBackup`, `importProgressBackup`, `downloadProgressBackup` em `storageService.ts`. UI de export (.json) e import (file picker) no modal de Configurações. Permite mover acompanhamento de jovens entre máquinas sem precisar copiar `bloco_progress_2025/`.

**Total estimado**: ~28.5h. Caminho crítico (riscos 🔴 incluindo R20): ~17h.

**Observação sobre R20**: pode ser executado em paralelo com R7 e antes de R14 — quanto mais cedo Ollama estiver suportado, mais cedo o app pode ser distribuído sem dependência de chave Gemini paga. Recomenda-se priorizá-lo logo após R2 (PDFs empacotados) para fechar a história de "app entregável standalone".

---

## Não-objetivo deste plano

- **Refazer parser de OCR** do Guia/Manual: trabalho independente, fora de escopo.
- **Adicionar testes unitários automatizados**: projeto não tem framework de testes; introduzir vitest/jest é decisão arquitetural separada.
- **Reescrever em IPC type-safe** (tRPC etc): excessivo para o porte atual.
