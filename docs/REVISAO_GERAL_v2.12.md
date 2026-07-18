# Relatorio de Revisao Geral — Paxtu AutoPlanner v2.12.0

> Revisao multi-agente (60 achados levantados, 48 confirmados apos verificacao adversarial). Gerado em 2026-06-13.

## 1. Resumo Executivo

O Paxtu AutoPlanner e um app Electron 39 + React 18 + TypeScript + Vite 5, assistente de progressao escoteira, com boa separacao de servicos (LLM roteado por `llmProvider`, storage dual-backend, catalogo gerado em TS) e guards de seguranca solidos na janela principal e no IPC. A arquitetura central e coerente, mas a revisao revelou um nucleo de bugs de **logica de negocio** que invalidam silenciosamente funcionalidades inteiras (premiacao, niveis de especialidade, mapa de progressao), alem de **riscos de perda de dados** na camada de storage compartilhado (lost-update e cache stale).

O ponto mais grave nao e isolado: cinco achados altos convergem num mesmo defeito sistemico — a confusao entre o **prefixo de especialidade `ESP-` (esperado pelo codigo) e `SP-` (real no catalogo)** somada a inferencia de ramo por substring. Isso quebra de ponta a ponta o calculo de premiacoes e o seletor de niveis N1/N2/N3.

| Severidade | Quantidade |
|---|---|
| Critico/Alto | 7 |
| Medio | 16 |
| Baixo | 16 |
| Info | 5 |
| **Total** | **44** |

Categorias mais afetadas: **logica de negocio** (premiacao/niveis/ramos), **storage/concorrencia** (sharedFolder), **conectores LLM** (parse fragil, timeout, vazamento de chave) e **UI** (cores Tailwind purgadas, modais persistentes).

---

## 2. Achados Criticos e Altos

### 2.1. Cluster "prefixo de especialidade" — funcionalidade morta (5 achados)

O catalogo real carrega especialidades com prefixo **`SP-`** (`SP-SV-*`, `SP-CT-*`, `SP-CU-*`, `SP-DE-*`, `SP-HA-*`), vindos de `specs_*.json`. Os unicos itens com prefixo `ESP-` estao em `specialties.json`, mas em `src/data/catalog/index.ts:70-78` somente `insignias_especiais` e `cordoes` viram itens — as especialidades `ESP-*` nunca entram no catalogo. Todo o codigo que assume `ESP-` opera sobre um conjunto vazio.

**(A) `src/services/awardService.ts:24` — detector de especialidade** [ALTO/logica]
`earnedSpecs = achievements.filter(a => a.code.startsWith('ESP-'))`. Como os achievements gravados usam `SP-*`, `earnedSpecs` e **sempre 0**. Zera `SPECIALTY_COUNT` (linha 55) e `SPECIALTY_BRANCH_DISTRIBUTION` (linha 60).
**Correcao:** trocar para `startsWith('SP-')` ou criar helper unico `isSpecialtyCode()`.

**(B) `src/App.tsx:479` — seletor de nivel nunca abre** [ALTO/bug]
`initiateAddObjective` faz `if (item.code.startsWith('ESP-')) setLevelSelectorTarget(...)`. Mesmo erro em `ProgressionMap.tsx:47` e `CyclePlanner.tsx:267/271`. Como os itens reais sao `SP-*`, o seletor N1/N2/N3 **nunca abre** e a especialidade vira objetivo binario.
**Correcao:** alinhar o predicado a `SP-` nos tres arquivos via helper compartilhado.

**(C) `src/services/awardService.ts:35` — dupla contagem de ramo "CUL"** [ALTO/logica]
A linha 35 adiciona "Habilidades" quando `s.code.includes('CUL')` e a linha 37 adiciona "Cultura" pelo mesmo `'CUL'`. Qualquer especialidade com `CUL` no code conta para **dois ramos**, inflando `getKnowledgeBranchCount()` e liberando indevidamente "3 Ramos" (Cruzeiro do Sul) e "5 Ramos" (Cordao Vermelho e Branco).
**Correcao:** derivar o ramo do segmento estavel do code (`SV/CT/CU/DE/HA`) ou do `ramoId` oficial.

**(D) `src/services/awardService.ts:34` — substrings de ramo nao casam o catalogo** [ALTO/logica]
`getKnowledgeBranchCount` usa substrings inventados (`TEC`, `SRV`, `CUL`, `DES`, `CIE`). Os codigos reais sao `SP-SV-*/SP-CT-*/SP-CU-*/SP-DE-*/SP-HA-*`. Mesmo corrigindo o prefixo (A), a contagem de ramos continua **zerada/errada**.
**Correcao:** mapear ramo pelo segmento estavel ou cruzar por `ramoId` do guia.

**(E) `src/data/awardsRules.ts:64` — SPECIFIC_ITEM aponta para id, nao para code** [ALTO/logica]
Lis de Ouro exige `{ type: SPECIFIC_ITEM, target: 'CORD_VERMELHO_BRANCO' }` (id de premiacao). `hasItem` (`awardService.ts:27`) so checa achievements por **code**, e o code real do cordao e `CORD-VB` (`specialties.json:79`). O requisito **nunca** e satisfeito.
**Correcao:** apontar para `CORD-VB`, ou implementar RequirementType que consulte o `isUnlocked` da premiacao.

### 2.2. Perda de dados em escrita concorrente de agregados [ALTO/banco]
**`src/services/storage/memberStorage.ts:35`** — `saveMemberAsync` (e identicos `saveSectionAsync`, `saveUserAsync`, `saveCalendarEventAsync`, `saveGroupAsync`) faz read-modify-write nao atomico: le o array inteiro, altera por `findIndex` e reescreve o agregado. Duas operacoes concorrentes (ou dois usuarios em `sharedFolder`) produzem **lost update**. O lock so cobre `assertCanWriteSection`, nao serializa a escrita.
**Correcao:** serializar escritas por arquivo (fila/mutex) e reler antes de gravar; em `sharedFolder`, considerar arquivo por entidade.

### 2.3. Regex de requisitos por nivel quebrada [ALTO/bug]
**`src/components/ProgressionMap.tsx:60`** — `new RegExp(\`N${level}:\s*([^N]+)(?=N\d:|$)\`, 'i')`: dentro de template literal, `\s` e `\d` **nao** sao escapes validos e colapsam para `s` e `d`. O regex efetivo vira `N2:s*([^N]+)(?=Nd:|$)`. `extractLevelRequirements` quase nunca casa e cai sempre no fallback "Consultar requisitos no manual."
**Correcao:** usar `String.raw\`N${level}:\s*([^N]+)(?=N\d:|$)\``.

---

## 3. Achados Medios (por dimensao)

### 3.1. Storage / fluxo de dados
- **Cache localStorage stale** — `dualBackend.ts:57`: `readCachedEntity` retorna do localStorage sem reler o FS. Em `sharedFolder`, usuario B ve estado velho e `saveMemberBlocoStateOptimistic` grava por cima da versao mais nova sem detectar conflito.
- **Especialidades fora do backup** — `backupStorage.ts:39`: so coleta `PAXTU_BLOCO_`/`PAXTU_REC_`; chaves `PAXTU_SPECIALTY_` nao sao exportadas. Restore perde progresso de especialidades. Adicionar `specialtyStates`.
- **Lock em sessionStorage diverge do FS** — `sectionLockStorage.ts:27`: `getActiveSectionEditLock` le so sessionStorage; se outro forcar o lock no FS, a sessao local segue gravando. Revalidar contra `paxtu_edit_lock.json`.

### 3.2. Banco de dados / SQL
- **`especialidade_alias` nao exportada** — 37 aliases no banco; 34 de 176 nomes em `bloco_especialidades` nao batem com `especialidades.nome` (ex.: "Aquarismo"→"Aquariofilia"). Qualquer link bloco→ficha por nome falha. Exportar o alias ou gravar slug canonico.
- **`schema.sql` descreve banco inexistente** — define tabelas que nao existem nos 3 bancos reais; `build_sqlite.py` grava em `conhecimento_db_v19.sqlite` (ausente). Marcar como legado.
- **`pdf:openAtPage` ignora subpastas** — `main.ts:300`: `pdf_path` inclui `manuais_essenciais/`, mas o handler usa `path.basename` e procura flat. Garantir pasta plana ou tentar `path.dirname(pdf_path)`.

### 3.3. Conectores LLM
- **Chave Gemini no bundle** — `geminiService.ts:53,98,173,221,266`: `import.meta.env.VITE_GEMINI_API_KEY` faz inline da chave no JS de producao. Padronizar tudo para `getStoredApiKey()` (`askGemini:30` ja faz so isso — inconsistencia).
- **`isReachable` pode travar 5 min** — `ollamaService.ts:53-92,263`: a checagem passa pelo IPC, cujo timeout no main e fixo de 5 min (`main.ts:355`). Passar `timeoutMs` curto pelo IPC para o GET `/api/tags`.
- **Ciclo Ollama com parse fragil** — `llmProvider.ts:88-94`: regex manual `\{[\s\S]*\}` em vez de `extractJson`; `askOllama` nao envia `format:'json'`. Reusar `extractJson` + retry.
- **`JSON.parse` sem guarda** — `ollamaService.ts:94-101`: parse direto de `/api/tags`; corpo 200 nao-JSON lanca ao popular o dropdown. Try/catch retornando `[]`.
- **Gemini ignora `finishReason`** — `geminiService.ts:324-431`: nao inspeciona `MAX_TOKENS`/`SAFETY`; fallback por indice (`detailsArr[idx]`, :408) atribui detalhes da atividade errada. Ler `finishReason` e casar por codigo.

### 3.4. Componentes UI / relatorios
- **Calendario edita so o 1o evento do dia** — `CalendarView.tsx:96`: handlers usam `events.find(e => e.date === selectedDate)`. Dias com 2+ eventos: demais ineditaveis. Guardar id do evento em estado.
- **IndividualReport pode passar de 100%** — `IndividualReport.tsx:17`: `uniqueHits` nao filtrado pelo catalogo. Filtrar por `catalogCodeSet` + `Math.min(100, ...)`.
- **Cores de ramo Tailwind purgadas** — `MembersManager.tsx:278`, `SectionManager.tsx:177`, `Catalog.tsx:200`: `bg-${...}-500` dinamico removido pelo JIT. Usar `Record<ScoutBranch,string>` literal (como `BRANCH_DOT_CLASS`).
- **PROGRESSION_STAGE le achievements legados** — `awardService.ts:81`: `doneStage` usa `hasItem` (so achievements), mas POR 2025 vive em bloco state. Etapa nunca atinge 90%. Passar `getMemberHomologatedCodes`.

### 3.5. Electron / IPC / seguranca
- **`pdfWindow` sem guards** — `main.ts:265-280`: `plugins:true` mas sem `sandbox:true`, `setWindowOpenHandler` nem `will-navigate`. Adicionar guards e reavaliar `plugins:true`.
- **Preview HTML em iframe sem `sandbox`** — `App.tsx:666`: `<iframe srcDoc>` renderiza HTML que mistura template e texto livre da IA no contexto do renderer. Adicionar `sandbox="allow-same-origin"` (sem `allow-scripts`).

---

## 4. Achados Baixos / Melhorias de UI

**Electron / performance**
- `main.ts:196-213,381-386`: `bibliotecaDb` e `pdfWindow` nunca fechados; sem `before-quit`. Registrar `app.on('before-quit')` para `db.close()` + abort dos controllers.
- `main.ts:350-352`: limite de corpo Ollama em caracteres (`body.length`), nao bytes. Usar `Buffer.byteLength(body,'utf8')`.

**Storage / manutenibilidade**
- `blocoProgressStorage.ts:15`: `migrateBlocoState` so carimba `schemaVersion` sem transformar dados. Implementar migracao real por versao.
- `blocoProgressStorage.ts:111`: numero magico `18` duplicado aqui e em `backupValidation`. Centralizar numa constante.
- `userStorage.ts:9`: `admin-master` injetado em memoria a cada leitura, nunca persistido; `deleteUserAsync('admin-master')` sem efeito. Tratar como seed unico.
- `backupStorage.ts:116`: `importLocalAppBackup` restaura CONFIG sem re-sanitizar `apiKey`. Reaplicar `backupValueWithoutSecrets` no import.
- `catalogStorage.ts:8` (e `legacyProgressStorage`, `sectionLockStorage`): `JSON.parse` sem try/catch derruba o componente. Usar helper tolerante.

**Logica / dados**
- `specialtyFichaImport.ts:28`: `calcularNivel` da Nivel 1 a ficha com 0 requisitos quando `nivel1=0`. Exigir `concluidos > 0 && concluidos >= lim`.
- `reportingService.ts:70`: usa `bloco.id` vs `bloco.ordemGlobal`; funciona so porque `id===ordemGlobal` hoje. Unificar a chave.
- `IndividualReport.tsx:16`, `ReportsDashboard.tsx:77,184`: contagem sem filtro de catalogo. Extrair `completedCatalogCount` para `reportingService`.

**UI / App estado**
- `useGlobalEvents.ts:14-87`: listeners com deps `[]` capturam closures do render 0. Estabilizar via `useCallback`/`handlersRef`.
- `App.tsx:577-582`: mutacao de `generatedPlan.authorId/sectionId` (578-579) e codigo morto. Remover.
- `App.tsx:1199-1207`: inputs numericos viram `0` ao apagar (`Number('')`). Clampar na exibicao.
- `App.tsx:957-972,1047-1053`: `editLockConflict` esconde botoes mas o roteamento por evento ainda leva ao gerador travado. Centralizar a guarda no `setView`.
- `App.tsx:118-125,584-589` + `useGlobalEvents.ts:60-64`: dois mecanismos de reset do banner de IA (4s) concorrentes. Unificar via `e.detail.done`.
- `App.tsx:1252-1297`: `detailItem`/`levelSelectorTarget` nao limpos ao trocar de view. Fechar overlays no `setView`.

**Componentes**
- `PlanDisplay.tsx:71`: `updateActivity`/`updateActivityEvaluation` leem `plan` da closure em vez de `setPlan(prev => ...)`. Usar forma funcional.

**Seguranca (baixo)**
- `geminiService.ts:227,252,261,210,93`: `sanitizeLlmError` so em duas funcoes; `analyzeIndividualProgress`, `generateScoutCycle`, `askGemini` propagam erro cru da SDK (que ecoa `key=...`). Centralizar num wrapper.

**SQL (baixo)**
- `schema_unificado.sql:9`: linha de prosa sem `--` torna o arquivo nao-executavel; duas `CREATE TABLE ramos` homonimas. Comentar e separar em `prog_ramos`/`esp_ramos`.

**Info / boas praticas**
- `StructureManager.tsx:426`: `onKeyPress` (deprecado). Trocar por `onKeyDown`.
- `App.tsx:1056-1069`: prop drilling do `sectionId={isAdmin ? undefined : currentSection?.id}` repetido 5+ vezes. Extrair `scopedSectionId` ou usar Context.
- `App.tsx:1098-1105`: `<select>` de modelo vazio sem placeholder. Adicionar placeholder e toast.
- `electron/main.ts:91` **(validado OK)**: os 16 basenames de `pdf_path` batem com `ALLOWED_PDFS`; `library:search` e parametrizado (MATCH/LIMIT), termos tokenizados/limitados a 8 — sem risco de injecao FTS5.

---

## 5. Recomendacoes Priorizadas (top 10)

1. **Corrigir o cluster de prefixo `ESP-` → `SP-`** com helper unico `isSpecialtyCode()` em `awardService.ts:24`, `App.tsx:479`, `ProgressionMap.tsx:47`, `CyclePlanner.tsx:267/271`. Destrava premiacao e seletor de niveis. (A, B)
2. **Reescrever a inferencia de ramo** em `awardService.ts:34-37` pelo segmento estavel do code (`SV/CT/CU/DE/HA`) ou `ramoId`. (C, D)
3. **Corrigir o `SPECIFIC_ITEM` da Lis de Ouro** (`awardsRules.ts:64`) para `CORD-VB`. (E)
4. **Corrigir a regex de niveis** em `ProgressionMap.tsx:60` com `String.raw` — uma linha, alto impacto.
5. **Serializar escritas de agregados** (`memberStorage.ts:35` e irmaos) com fila/mutex e re-leitura antes de gravar.
6. **Tratar cache stale em `sharedFolder`** (`dualBackend.ts:57`) e revalidar o lock contra o FS (`sectionLockStorage.ts:27`).
7. **Remover `VITE_GEMINI_API_KEY` do build** e padronizar `getStoredApiKey()`; centralizar `sanitizeLlmError`.
8. **Endurecer a `pdfWindow`** (`main.ts:265-280`) e adicionar `sandbox` ao iframe de preview (`App.tsx:666`).
9. **Incluir especialidades no backup** (`backupStorage.ts:39`) e re-sanitizar `apiKey` no import (`:116`).
10. **Unificar a base de contagem dos relatorios** (`completedCatalogCount` no `reportingService`, `Math.min(100,...)`) e corrigir `pdf:openAtPage`/empacotamento (`main.ts:300`).

Apos esses 10: fila de baixos de manutenibilidade (constante de 18 blocos, `migrateBlocoState` real, `useGlobalEvents` com closures estaveis) e limpeza de legado SQL (`schema.sql`, `schema_unificado.sql`).
