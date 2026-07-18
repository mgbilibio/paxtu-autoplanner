# Plano de Acao para Continuacao

Este plano registra o ponto atual do levantamento e a sequencia recomendada para continuar a base de conhecimento, a progressao, as especialidades e a futura integracao no app principal.

**Referencia cruzada**: [Plano de Mitigacao de Riscos](./plano_riscos_mitigacao.md) — 19 riscos catalogados com prioridade de execucao e esforço estimado.

## Estado de referencia

- App alvo: aplicacao da raiz iniciada por `INICIAR_APP.bat`.
- Snapshot organizado: `AutoPaxtu042026/`.
- Base de conhecimento: `conhecimento/`.
- Fonte normativa principal: `docs/biblioteca/libpaxtubasico/` e PDFs oficiais em `docs/biblioteca/`.
- Foco ativo: POR 2025+.
- Legado: POR 2020, apenas comparativo e historico.
- Banco de progressao legado/transicao: `conhecimento/bd/conhecimento_db_v19.sqlite` (v12 mantido como backup).
- Banco operacional de progressao 2025+: `conhecimento/bd/progressao_2025.sqlite`.
- Dashboard local: `AutoPaxtu042026/docs/evolucao_progressao.html`.

## Estado confirmado dos bancos validos

### conhecimento_db_v19.sqlite (progressao legado/transicao + fichas manuais Servicos)

- Versoes: 2.
- Ramos: 2.
- Etapas: 33.
- Itens de progressao: 150.
- Requisitos de progressao: 150.
- Fontes: 1014.
- Fichas de especialidades: 104.
- Passos de fichas: 1083.
- Observacoes de fichas: 1083.
- Revisoes de fichas: 104.

### especialidades_guia.sqlite (Guia 18a Edicao 2024-1 — NOVO, gerado 2026-04-27)

- Ramos: 5.
- Especialidades: 274 (46 C&T + 55 Cultura + 54 Desportos + 105 Servicos + 14 Habilidades Escoteiras).
- Requisitos: 2741.
- Fonte: `docs/biblioteca/libpaxtubasico2/Guia de Especialidades 18a Edição - 2024-1/markdown.md`.
- Gerador: `conhecimento/tools/build_especialidades_db.py`.

### progressao_2025.sqlite (Progressao 2025+ — OPERACIONAL, gerado 2026-04-27)

- Ramos: 2.
- Etapas: 8.
- Eixos: 4.
- Blocos: 18.
- Acoes fixas: 80.
- Acoes variaveis: 230.
- Entradas de especialidades por bloco: 316.
- Insignias por bloco: 22.
- Reconhecimentos de ramo: 2.
- Fonte: modelo 2025+ reconstruido para Lobinho e Escoteiro.

## Decisoes firmadas

- O POR 2025+ mudou bastante e nao deve ser modelado como simples copia do 2020.
- O app tera legado 2020, mas o foco funcional e 2025+.
- PDFs oficiais mandam sobre OCR, planilha, JSONs, projetos paralelos e arquivos derivados.
- A planilha e os projetos paralelos ajudam a preencher e conferir, mas nao substituem fonte oficial.
- Especialidades devem ser exibidas como fichas manuais: descricao, passos, observacoes, evidencias e revisao.
- A fonte principal para especialidades passa a ser `docs/biblioteca/libpaxtubasico2/Guia de Especialidades 18a Edição - 2024-1/`.
- A base antiga de especialidades em `conhecimento_db_v19.sqlite` fica como referencia de transicao.
- O BD plano `especialidades_guia.sqlite` e a base preferencial da nova camada de especialidades.
- O BD operacional `progressao_2025.sqlite` e a base preferencial da progressao 2025+.
- O SQLite e espelho consultavel; a arvore `conhecimento/` continua sendo a base textual auditavel.
- A camada seguinte das especialidades e a ficha manual sobre o catalogo plano.
- O schema local ja recebeu as tabelas da ficha manual.

## Sequencia numerada

### 1. Congelar o ponto estavel

- Objetivo: evitar continuar em cima de arquivo travado ou estado parcial.
- O que: tratar `conhecimento_db_v12.sqlite` como banco valido ate nova materializacao limpa.
- Como: manter os indices apontando para `v12`, ignorar `v13` a `v16` enquanto estiverem vazios ou bloqueados.
- Motivo: as tentativas posteriores falharam por lock do Windows e nao devem virar referencia.

### 2. Limpar a regra de geracao do SQLite

- Objetivo: impedir que a reconstrucao volte a travar ao substituir arquivo existente.
- O que: ajustar `build_sqlite.py` para escrever sempre em um nome novo ou em arquivo temporario dentro de `bd/`.
- Como: evitar `unlink()` do banco final quando ele existir; gravar `conhecimento_db_next.sqlite` ou versao nova calculada.
- Motivo: o erro recorrente foi `PermissionError` ao apagar/substituir SQLite.

### 3. Atualizar o exportador para o banco valido

- Objetivo: manter painel e banco sincronizados.
- O que: confirmar que `export_dashboard_data.py` aponta para o banco valido.
- Como: usar `conhecimento_db_v12.sqlite` ate existir nova versao validada.
- Motivo: o dashboard deve mostrar dado confirmado, nao banco vazio.

### 4. Consolidar o modelo canônico 2025+

- Objetivo: fechar o contrato de dados da progressao nova.
- O que: documentar e aplicar o modelo `ramo -> simbolo -> etapa -> tema -> item -> requisitos -> reconhecimento`.
- Como: usar `progressao_2025.sqlite`, `estruturas_2025.md`, `lobinho_2025_estrutura_operacional.md` e `escoteiro_2025_estrutura_operacional.md`.
- Motivo: 2025+ usa estrutura propria; copiar a logica do 2020 gera erro.
- Estado: banco operacional ja gerado.

### 5. Revisar Lobinho 2025+ contra os manuais

- Objetivo: elevar Lobinho ao mesmo nivel de confianca do Escoteiro.
- O que: conferir caminho, acolhida, etapas, blocos, temas, itens, requisitos e reconhecimentos.
- Como: comparar `conhecimento/por/2025/lobinho/` com o manual oficial e o POR.
- Motivo: Lobinho 2025 ainda esta mais resumido que Escoteiro.

### 6. Revisar Escoteiro 2025+ contra os manuais

- Objetivo: validar a camada que ja ficou mais granular pela planilha.
- O que: separar o que e progressao oficial, apoio de planilha, metodo de patrulha e atividades.
- Como: cruzar `conhecimento/por/2025/escoteiro/`, planilha, manual oficial e caderno de jornada.
- Motivo: Escoteiro tem volume maior e maior risco de misturar fonte operacional com fonte normativa.

### 7. Marcar alias internos e nomes oficiais

- Objetivo: impedir que rotulos de organizacao virem nomes normativos.
- O que: para cada etapa, tema e item, guardar nome oficial e alias interno quando houver.
- Como: adicionar campos nos markdowns e depois no SQLite.
- Motivo: a base precisa ser auditavel e nao pode esconder adaptacoes operacionais.

### 8. Completar links de origem por pagina

- Objetivo: permitir auditoria direta.
- O que: cada item e requisito deve apontar para PDF, OCR e pagina provavel ou exata.
- Como: usar OCR em `libpaxtubasico`, PDFs originais e campos `source_page`.
- Motivo: o app futuro precisa abrir o bloco textual e a pagina do PDF.

### 9. Consolidar especialidades como fichas

- Objetivo: transformar especialidades de catalogo em ficha de acompanhamento.
- O que: carregar as especialidades de `docs/biblioteca/libpaxtubasico2/Guia de Especialidades 18a Edição - 2024-1/` e reconstruir a base canonica.
- Como: usar `especialidades_guia.sqlite` como catalogo mestre e gerar a camada de ficha manual a partir dele.
- Motivo: o jovem cumpre requisitos, anota evidencias e depois passa por avaliacao.
- Estado: catalogo mestre gerado; falta a camada de ficha manual no app.
- Referencia atual: `conhecimento/bd/especialidades_guia.sqlite`.
- Proximo artefato: schema e gerador da ficha manual.

### 10. Separar especialidade, progressao e insignia

- Objetivo: evitar sobreposicao conceitual.
- O que: marcar claramente quando um conteudo e item de progressao, especialidade ou insignia.
- Como: revisar casos como `Socorrismo`, `Primeiros Socorros`, insignias especiais e reconhecimentos.
- Motivo: alguns temas aparecem em mais de uma camada e nao devem ser duplicados sem relacao explicita.

### 11. Consolidar especialidades dos demais ramos de conhecimento

- Objetivo: aplicar o mesmo modelo de ficha fora de `Servicos`.
- O que: processar Ciencia e Tecnologia, Cultura, Desportos e Habilidades Escoteiras.
- Como: repetir a estrutura de ficha manual ja validada em `Servicos`.
- Motivo: o app precisa ter experiencia uniforme para todas as especialidades.

### 12. Revisar insignias e reconhecimentos 2025+

- Objetivo: organizar a camada de conquistas.
- O que: mapear insignias, Lis de Ouro, Cruzeiro do Sul e distintivos relacionados.
- Como: usar Guia de Insignias, Distintivos e Marcas, POR e manuais.
- Motivo: reconhecimentos devem ser resultado da evolucao, nao uma lista solta.

### 13. Atualizar o schema SQLite

- Objetivo: refletir a estrutura final da base.
- O que: adicionar ou revisar tabelas para temas, alias, fontes, paginas, reconhecimentos e estado de acompanhamento.
- Como: evoluir `schema.sql` sem remover as tabelas ja confirmadas.
- Motivo: o banco precisa servir ao app, ao dashboard e a busca.
- Observacao: a camada de ficha manual vai exigir tabelas novas para especialidades.
- Estado: tabelas da ficha manual adicionadas ao schema local.

### 14. Criar consultas de validacao

- Objetivo: identificar lacunas automaticamente.
- O que: consultas para itens sem fonte, sem pagina, sem requisitos, duplicados e divergentes.
- Como: criar script de diagnostico em `conhecimento/tools/`.
- Motivo: reduz revisao manual e mostra progresso real.

### 15. Melhorar o dashboard de evolucao

- Objetivo: acompanhar a base quase em tempo real.
- O que: mostrar progresso por ramo, etapa, tema, item, ficha, status de origem e pendencias.
- Como: evoluir `evolucao_progressao.html` e `dashboard_progressao_data.js`.
- Motivo: o painel ajuda a ver o que esta pronto e o que ainda falta.

### 16. Preparar busca FTS5

- Objetivo: permitir pesquisa textual nos `.md` e no banco.
- O que: indexar arquivos oficiais, derivados, fichas e requisitos.
- Como: criar tabela FTS5 com trecho, fonte, pagina e link local.
- Motivo: o app precisa buscar termo, mostrar trecho e abrir bloco/PDF.
- Estado: ver pendencia detalhada **P4**.

### 17. Atualizar o snapshot `AutoPaxtu042026`

- Objetivo: manter um estado organizado para retomada.
- O que: atualizar README, dashboard, docs e ponte para `conhecimento/`.
- Como: sincronizar apenas arquivos relevantes, sem node_modules, dist e backups.
- Motivo: evita voltar a misturar app principal, legados e experimentos.

### 18. Integrar ao app principal

- Objetivo: levar a base consolidada para a interface real.
- O que: tela de consulta de progressao, tela de ficha de especialidade, busca e links de auditoria.
- Como: implementar no app da raiz iniciado por `INICIAR_APP.bat`.
- Motivo: `appMappa` e paralelos sao apoio; a interface alvo e a da raiz.
- Estado: parcialmente FEITO 2026-04-27. Tela de blocos (`ProgressaoBlocos2025.tsx`) e enciclopedia de especialidades (`SpecialtyEncyclopedia.tsx`) estao consumindo `progressao_2025.ts` e `especialidades_guia.ts`. Falta o Generator/Catalog/CyclePlanner consumirem (ver pendencia **P1**) e o rastreio de origem por pagina do PDF (ver **P5**).

### 19. Definir fluxo de controle do jovem

- Objetivo: transformar dados em acompanhamento real.
- O que: modelar jovem, ramo atual, etapa, item, requisito, evidencia, avaliador e resultado.
- Como: criar tabelas ou camada de estado separada da base normativa.
- Motivo: norma e progresso individual nao podem ficar misturados.
- Estado: ver pendencia detalhada **P2** + reconhecimento de ramo **P3**.

### 20. Criar rotina de backup local

- Objetivo: evitar perda e confusao sem Git.
- O que: gerar snapshots datados pequenos da base e do SQLite valido.
- Como: copiar apenas `conhecimento/`, `bd` valido e docs operacionais.
- Motivo: o projeto e privado e local; versionamento precisa ser explicito em disco.
- Estado: ver pendencia detalhada **P8**.

## Ordem pratica para a proxima sessao

1. [FEITO 2026-04-27] Banco valido e `conhecimento_db_v19.sqlite` (104 fichas, 1083 passos).
2. [FEITO 2026-04-27] `build_sqlite.py` usa `:memory:` + `backup()` no fluxo de geracao.
3. [FEITO 2026-04-27] `export_dashboard_data.py` aponta para `v19`.
4. [FEITO 2026-04-27] `Servicos` foi consolidado como fichas manuais e `Socorrismo` foi separado de `Primeiros Socorros`.
5. [FEITO 2026-04-27] Dashboard foi marcado para destacar fichas de fronteira.
6. [FEITO 2026-04-27] Diagnostico de progressao 2025+ registrado.
7. [FEITO 2026-04-27] Diagnostico de Lobinho 2025+ registrado.
8. [FEITO 2026-04-27] Diagnostico de Escoteiro 2025+ registrado.
9. [FEITO 2026-04-27] Cruzamento Lobinho x Escoteiro 2025+ registrado.
10. [FEITO 2026-04-27] Mapa item-a-item 2025+ registrado.
11. [FEITO 2026-04-27] Validacao fina por item iniciada com mapa item-a-item.
12. [FEITO 2026-04-27] Diagnostico de lacunas e duplicidades registrado.
13. [FEITO 2026-04-27] Banco `especialidades_guia.sqlite` gerado com 274 especialidades / 2741 requisitos via parser OCR (`build_especialidades_db.py`). Todos os ramos conferem com o indice do Guia 18a Edicao 2024. Bugs resolvidos: Mergulho (bi-linha no TOC), Acampamento (peek extendido), Vendas (nome queued com current ativo), slug_match falso positivo (corrigido com SequenceMatcher).
14. [FEITO 2026-04-27] Banco `progressao_2025.sqlite` gerado com 18 blocos / 2 ramos / 8 etapas / 80 acoes_fixas / 230 acoes_variaveis / 316 bloco_especialidades / 22 bloco_insignias / 2 reconhecimentos (Cruzeiro do Sul + Lis de Ouro). Script: `conhecimento/tools/build_progressao_db.py`.
15. [FEITO 2026-04-27] Pipeline SQLite -> TS criado. Scripts `conhecimento/tools/export_progressao_to_ts.py` e `conhecimento/tools/export_especialidades_to_ts.py` geram, respectivamente, `src/data/generated/progressao_2025.ts` (774 linhas) e `src/data/generated/especialidades_guia.ts` (3040 linhas, 274 especialidades / 2741 requisitos). Reproduzivel: rodar a cada regeracao do .sqlite.
16. [FEITO 2026-04-27] Componente `src/components/ProgressaoBlocos2025.tsx` criado. Navegacao por ramo + etapa + eixo, expansao de blocos com fixas/variaveis/especialidades/insignias, card final com Cruzeiro do Sul / Lis de Ouro. Botao 🧭 plugado no header de `App.tsx`.
17. [FEITO 2026-04-27] `SpecialtyEncyclopedia.tsx` reescrito para consumir o catalogo completo (274 fichas) em vez dos arquivos `le_*/sp_*` parciais. Filtro por ramo, busca, modal com requisitos numerados.
18. [FEITO 2026-04-27] Inicializacao default em POR 2025+. Adicionado `AppConfig.showLegacy` (padrao `false`). Header com badge fixo POR 2025+ / POR 2020. Toggle nas Configuracoes. Quando flag desligada: criacao de secoes fixa em POR 2025+; controles legados escondidos em `App.tsx` (Generator step 2), `ProgressionMap.tsx`, `SectionManager.tsx`, `StructureManager.tsx`. Build OK (~1.3 MB JS).
19. [FEITO 2026-04-27] **P6 Validador**: `tools/validate_progressao.py` + `docs/validacao_progressao_2025.md` + `docs/achados_validacao_p6.md`. Validador refinado (validacao 10 falsa removida; validacao 6 com normalize accent-insensitive; novas validacoes 6b e 11). Estado final: 15 erros / 71 avisos. Erros restantes precisam de fix manual (14 nivel3_itens divergentes, 1 insignia mal-tabelada, 69 nomes orfaos com divergencia Manual×Guia).
20. [FEITO 2026-04-27] **P8 Backup local**: `tools/backup_local.py` com `make_backup()`, `prune_old_backups(--keep)`, `--zip`. Primeira execucao: 32 arquivos / 7 MB em `backups/20260427-1115/`.
21. [FEITO 2026-04-27] **P10 Schema unificado**: `tools/export_schema_unificado.py` + `bd/schema_unificado.sql` (157 linhas, 14 tabelas combinadas com prefixos logicos prog_ e esp_ documentados).
22. [FEITO 2026-04-27] **P1 Adapter de catalogo POR 2025+**: `src/data/generated/progressao_2025_catalog.ts` mapeia 18 blocos × 2 ramos para `CatalogCategory[]` consumido por Generator/Catalog/CyclePlanner via `data/catalog/index.ts`. Codigos `B{N}.F{n}` (fixa), `B{N}.V{n}` (variavel), `B{N}.SUB` (substituto). Modalidades Ar/Mar nos descricoes. Fallback automatico para JSON antigo se adapter retornar vazio.
23. [FEITO 2026-04-27] **P2 Acompanhamento individual**: novo tipo `MemberBlocoState` em `types.ts`; funcoes `getMemberBlocoState`/`saveMemberBlocoState`/`getAllMemberBlocoStates`/`countConcludedBlocos` em `storageService.ts` com persistencia dual (localStorage + arquivo `bloco_progress_2025/`); componente `BlocoTracker.tsx` com checkboxes para fixas/variaveis, contador X/18, barra de progresso por etapa, dropdown de substituto, notas, auto-deteccao de bloco concluido. Plugado no `ProgressionMap` via botao 🧩 Blocos (so para POR 2025+ Lobinho/Escoteiro), abre como modal.
24. [FEITO 2026-04-27] **P3 Reconhecimento de Ramo integrado**: novo tipo `MemberReconhecimentoState`; funcoes `getMemberReconhecimento`/`saveMemberReconhecimento`; card no `BlocoTracker` que so libera os checkboxes quando 18/18 blocos estao concluidos; valida idade contra `member.birthDate` (alerta se acima do limite — Cruzeiro do Sul antes de 11, Lis de Ouro antes de 15); campo `homologadoPor`.
25. [FEITO 2026-04-27] **P4 Busca global (MiniSearch)**: dependencia `minisearch ^7.2.0` adicionada; `searchService.ts` indexa ~3.000 documentos (blocos × 2 ramos + 80 fixas + 230 variaveis + 274 especialidades + 2.741 requisitos); `GlobalSearch.tsx` modal com filtros por tipo (Bloco/Fixa/Variavel/Especialidade/Requisito); plugado no header com botao 🔎 e atalho **Ctrl+K** global.
26. [FEITO 2026-04-27] **P5 Links para PDF na pagina**: novo IPC handler `pdf:openAtPage` em `electron/main.ts` (usa `shell.openExternal` com `file:///...#page=N`); exposto via `window.fileSystem.openPdfAtPage` em `preload.ts`; `pdfLinkService.ts` centraliza o mapeamento ramo->PDF (Manual Lobinho/Escoteiro 2025.10, Guia Especialidades 18ª Ed.); botoes 📄 plugados em `ProgressaoBlocos2025` (cabecalho de cada bloco e card de reconhecimento) e em `SpecialtyEncyclopedia` (modal da ficha). Fallback para alert quando rodando fora do Electron.
27. [FEITO 2026-04-27] **Fix de inconsistencias de dados** (haiku): `tools/fix_data_inconsistencies.py` aplica 3 fixes idempotentes — (a) migra `Insígnia do Aprender` de `bloco_especialidades` para `bloco_insignias`; (b) remove prefixos `## ` indevidos em 2 nomes de especialidades no guia; (c) cria tabela `especialidade_alias` em `progressao_2025.sqlite` populada com 23 mapeamentos (4 manuais + 20 fuzzy match >=0.7). Reduz erros do validador de 15 -> 14 e clarifica origem das orfas restantes.
28. [FEITO 2026-04-27] **P9 Dashboard 2025+ exporter**: `tools/export_dashboard_2025.py` gera `AutoPaxtu042026/docs/dashboard_progressao_2025.json` (2.3 KB) com contagens por eixo/ramo/etapa, totais de fixas/variaveis, lista de reconhecimentos e quebra de especialidades por ramo. Integracao com o HTML do dashboard fica para depois (item original 15).
29. [PARCIAL 2026-04-27] **P7 Dynamic legacy load**: avaliado e adiado. Ganho marginal estimado em ~20 KB no bundle (legacy JSONs ja sao tree-shakable; refactor de catalog API para async cascateia em todos os callers). Decisao: manter imports estaticos; configurar `manualChunks` futuramente quando bundle ultrapassar 2 MB.
30. [FEITO 2026-04-27] **Vite manualChunks**: `vite.config.ts` configurado com 5 chunks separados — `vendor-react` (142 KB), `vendor-search` (18 KB), `data-progressao-2025` (591 KB, gzip 140 KB), `data-catalog-legacy` (184 KB), `data-details` (5 KB). Main bundle reduzido de 1.34 MB -> 396 KB (gzip 84 KB).
31. [FEITO 2026-04-27] **Fix de niveis cumulativos**: `tools/fix_niveis_especialidades.py` corrigiu as 14 especialidades com `nivel3_itens != total_itens` (Aeromodelismo, Eletronica, Genero Musical, Mergulho, Slackline, Biblioteconomia, Entrega de Mensagens, Garcom, Jardinagem, Lides Campeiras, Radioescuta, Reparos Domesticos, Sinalizacao, Pioneiria). Validador apos: 0 erros / 66 avisos (so de orfas pendentes — em curso).
32. [FEITO 2026-04-27] **Dashboard 2025+ no HTML**: `evolucao_progressao.html` recebeu novo card "Sistema POR 2025+ — Snapshot" que faz `fetch('./dashboard_progressao_2025.json')` e renderiza eixos (com cores oficiais), ramos × etapas, fixas/variaveis, reconhecimentos com idade-limite e quebra de especialidades por ramo.
33. [FEITO 2026-04-27] **Resolucao das orfas restantes**: `tools/resolve_orphan_aliases.py` adicionou 15 mapeamentos manuais (Brasilidades→Cultura Brasileira, Civilizacoes da Antiguidade→Historia Mundial, Origami→Arte em Origami, etc.). As 5 orfas restantes (Paz e Justica × 4, Dialogo inter-religioso × 1) eram insignias mal-tabeladas em `bloco_especialidades` — migradas via Python inline para `bloco_insignias`. Estado final: **bloco_especialidades 310, bloco_insignias 27**.
34. [FEITO 2026-04-27] **Validador 100% limpo**: re-execucao apos todos os fixes resulta em **0 erros / 0 avisos**. Marca o estado canonico do projeto.

## Estado final (2026-04-27)

- **Bancos**: `progressao_2025.sqlite` (18 blocos × 2 ramos, 80 fixas, 230 variaveis, 310 bloco_especialidades, 27 bloco_insignias, 2 reconhecimentos com 9 requisitos, tabela `especialidade_alias` com 38 mapeamentos), `especialidades_guia.sqlite` (274 especialidades, 2741 requisitos com niveis cumulativos consistentes).
- **App**: build em 1.34 MB total (gzip ~340 KB) dividido em 6 chunks; main.js apenas 396 KB / 84 KB gzip.
- **Telas POR 2025+**: ProgressaoBlocos2025 (consulta), BlocoTracker (tracker individual + reconhecimento), SpecialtyEncyclopedia (274 fichas), GlobalSearch (Ctrl+K, ~3000 docs indexados via MiniSearch).
- **Default em POR 2025+** com flag `showLegacy` que esconde controles do POR 2020.
- **PDF links** funcionais via IPC `pdf:openAtPage` para Manual Lobinho, Manual Escoteiro, Guia 18a Ed.
- **Dashboard HTML**: card POR 2025+ live com fetch do JSON, ao lado do dashboard antigo.
- **Backup local**: `tools/backup_local.py` snapshot datado em `backups/`.
- **Validador**: 0 erros / 0 avisos.

## Pendencias detalhadas (para proximas sessoes)

### P1. Integrar `progressao_2025.ts` ao Generator e ao Catalog
- **Modulos**: `src/data/catalog/index.ts`, `src/services/catalogService.ts`, `src/components/Catalog.tsx`, `src/components/CyclePlanner.tsx`.
- **Metodos**: `getPlanningCatalog()`, `getUnifiedCatalog()`, `getCatalogBySystem()`.
- **O que**: substituir/complementar os arquivos `src/data/le_*.ts` e `sp_*.ts` (que so contemplam recortes parciais) por consultas a `BLOCOS_2025` + `ACOES_FIXAS_2025` + `ACOES_VARIAVEIS_2025` + `BLOCO_ESPECIALIDADES_2025`.
- **Como**: criar adapter `progressao2025Adapter.ts` que monte `CatalogCategory[]` a partir do dataset gerado, agrupando por eixo e expondo cada bloco como um item de progressao com sub-tarefas (fixas + variaveis). Manter retrocompatibilidade: quando `system === 'LEGACY_2020'`, retornar os arrays legados; quando `'POR_2025'`, usar o adapter novo.
- **Motivo**: o gerador de planos hoje opera sobre `le_*/sp_*`, que nao tem todos os blocos nem a estrutura fixas/variaveis com modalidade Ar/Mar. Sem isso a IA nao consegue propor atividades aderentes ao manual 2025.

### P2. Fluxo de controle do jovem (acompanhamento individual)
- **Modulos**: `src/types.ts`, `src/services/storageService.ts`, `src/components/ProgressionMap.tsx`, `src/components/MembersManager.tsx`, novo componente `src/components/BlocoTracker.tsx`.
- **Metodos novos**: `getMemberBlocoProgress(memberId)`, `setMemberBlocoAction(memberId, blocoId, acaoId, status)`, `evaluateMemberEtapa(memberId)`.
- **O que**: estado por jovem por bloco — para cada acao fixa/variavel, registrar `nao iniciado | em progresso | concluido | dispensado` com data, evidencia e avaliador. Calcular automaticamente quando o bloco esta concluido (todas as fixas + N variaveis ou substituto).
- **Como**: novo tipo `MemberBlocoState { memberId, blocoId, ramoId, fixasConcluidas: number[], variaveisConcluidas: number[], substituidoPor?: { tipo: 'especialidade'|'insignia', nome: string }, dataConclusao?: string, avaliador?: string }`. Persistir em localStorage (chave `paxtu_bloco_progress_{memberId}`) com mirror em `dataFolder` quando configurado. Componente `BlocoTracker` reaproveita o layout de `ProgressaoBlocos2025` mas com checkboxes e contagem cumulativa.
- **Motivo**: hoje o app sabe gerar planos e mostrar a base normativa; nao sabe quem fez o que. Sem esta camada, o app continua sendo somente consulta — e o cliente pediu acompanhamento real.

### P3. Reconhecimento de Ramo no fluxo individual
- **Modulos**: `src/components/AwardTracker.tsx`, `src/data/awardsRules.ts`, integrar com P2.
- **O que**: quando o jovem completa os 18 blocos, oferecer o desafio de reconhecimento (Caminho do Cacador / Jornada de Travessia) e os requisitos finais (autoavaliacao, avaliacao dos pares, idade limite).
- **Como**: usar `RECONHECIMENTOS_2025` e `RECONHECIMENTO_REQUISITOS_2025` do dataset gerado. Tracker monta checklist sobre `MemberBlocoState`, valida idade contra `member.birthDate` e bloqueia/avisa se passar do limite.
- **Motivo**: Cruzeiro do Sul antes dos 11 anos e Lis de Ouro antes dos 15 anos — estes prazos so fazem sentido com acompanhamento por jovem.

### P4. FTS5 sobre as duas bases
- **Modulos**: novo `conhecimento/tools/build_fts5_index.py`, novo serviço `src/services/searchService.ts`, novo componente `src/components/GlobalSearch.tsx`.
- **O que**: tabela `fts_progressao(bloco_id, ramo_id, eixo, bloco, intencionalidade, fixas, variaveis)` e `fts_especialidades(esp_id, ramo, nome, requisitos)`. Indexar tambem markdowns relevantes em `docs/biblioteca/` se viavel.
- **Como**: em Python, criar tabelas FTS5 dentro dos `.sqlite` existentes e popular via INSERT INTO ... SELECT. Para o app web, usar `sql.js` no renderer carregando os `.sqlite` via fetch, OU exportar o indice como JSON pre-construido (`src/data/generated/search_index.json`) e usar Lunr/MiniSearch no cliente. **Recomendacao**: comecar com MiniSearch sobre os datasets ja em TS — evita carregar SQLite no browser.
- **Motivo**: o usuario precisa achar rapido "onde aparece nó volta do fiel" / "qual bloco menciona compostagem". Hoje so tem filtros de categoria.

### P5. Rastreio de origem (link para pagina do PDF)
- **Modulos**: `src/components/ProgressaoBlocos2025.tsx`, `src/components/SpecialtyEncyclopedia.tsx`, novo `src/services/sourceLinkService.ts`.
- **O que**: cada bloco / especialidade / requisito ja tem `fonte_pagina` em `bloco_ramo_meta`. Falta tornar isso clicavel no app — botao "Abrir PDF na pagina X".
- **Como**: em Electron, usar IPC para chamar `shell.openExternal(file://.../manual.pdf#page=N)`. No browser, abrir em nova aba com `#page=N`. Mapear arquivo da fonte (Manual Lobinho, Manual Escoteiro, Guia Especialidades) por padrao em `progressao_2025.sqlite` (campo extra `fonte_arquivo` faltando — adicionar).
- **Motivo**: auditoria. Quando o chefe duvida de uma acao, abre o PDF original na pagina certa em um clique.

### P6. Validador automatico da base
- **Modulos**: novo `conhecimento/tools/validate_progressao.py`.
- **O que**: detectar (a) bloco sem ao menos 1 acao fixa OU variavel para cada ramo, (b) bloco com `variaveis_minimo` > qtd de variaveis cadastradas, (c) reconhecimento sem requisitos, (d) especialidade citada em `bloco_especialidades` que nao existe em `especialidades_guia.sqlite`.
- **Como**: script Python com SELECTs cruzados; saida em `conhecimento/docs/validacao_progressao_2025.md` com timestamp.
- **Motivo**: 230 variaveis e 316 entradas de especialidades por bloco vieram a mao a partir do OCR — chance de erro nao zero. Validador automatico evita perda de credibilidade.

### P7. Esconder/arquivar dados legados POR 2020
- **Modulos**: `src/data/le_habilidades.ts`, `le_meio_ambiente.ts`, `le_paz.ts`, `le_saude.ts`, `sp_*.ts`, `por_progression.ts`, `details/legacy_2020_details.ts`.
- **O que**: mover para `src/data/legacy/` e fazer carregamento condicional via `import()` dinamico apenas quando `AppConfig.showLegacy === true`.
- **Como**: `catalogService.ts` faz `if (system === 'LEGACY_2020') { const m = await import('../data/legacy/index.ts'); return m.getLegacyCatalog(branch); }`. Isso retira ~3000 linhas do bundle padrao.
- **Motivo**: usuario novo nao precisa carregar 50KB+ de dados que nao vai usar. Bundle atual sera ~30% menor.

### P8. Backup local automatico
- **Modulos**: novo `conhecimento/tools/backup_local.py`, integrar com `INICIAR_APP.bat` (chamada opcional pre-app).
- **O que**: copiar `conhecimento/bd/*.sqlite`, `conhecimento/docs/*.md` e `src/data/generated/*.ts` para `backups/AAAAMMDD-HHMM/`.
- **Como**: script Python com `shutil.copytree` + `zipfile.ZipFile` opcional. Manter so os ultimos N backups (configuravel).
- **Motivo**: projeto privado sem Git remoto. Snapshot datado evita perda em caso de corrupcao do .sqlite.

### P9. Integrar dashboard de evolucao com nova base
- **Modulos**: `AutoPaxtu042026/docs/evolucao_progressao.html`, `dashboard_progressao_data.js`, novo `conhecimento/tools/export_dashboard_2025.py`.
- **O que**: novo card no dashboard com contagem 2025+ (blocos por etapa, especialidades por ramo, reconhecimentos).
- **Como**: exporter Python le `progressao_2025.sqlite` + `especialidades_guia.sqlite` e gera `dashboard_progressao_2025.json`. HTML carrega via fetch.
- **Motivo**: dashboard atual so reflete `v19` (legado).

### P10. Schema unificado e documentacao final
- **Modulos**: `conhecimento/bd/schema.sql`.
- **O que**: consolidar o schema de `progressao_2025.sqlite` + `especialidades_guia.sqlite` em um arquivo `.sql` versionado. Adicionar `fonte_arquivo` a `bloco_ramo_meta` (para P5).
- **Como**: extrair `schema.sql` de cada `.sqlite` via `sqlite3 .schema`, mesclar manualmente com namespacing por prefixo (`prog_`, `esp_`).
- **Motivo**: hoje o schema vive embedado nos scripts Python. Externalizar permite revisao normativa e diff entre versoes.

## Riscos conhecidos

- Bancos `v13` a `v18` foram criados vazios ou ficaram travados; nao usar como fonte valida. `v19` e o banco valido atual.
- OCR pode conter erro; PDF original vence.
- 2020 nao deve definir a estrutura de 2025+.
- Planilha pode conter conteudo util, mas precisa de validacao normativa.
- Web publica ajuda a localizar fichas, mas a fonte local auditavel precisa ser registrada.

## Resultado esperado

Ao final desta sequencia, o projeto deve ter:

- Base 2025+ auditavel. **[ATINGIDO 2026-04-27]**
- Legado 2020 separado. **[ATINGIDO 2026-04-27]** (modo opcional com flag `showLegacy`)
- Progressao por ramo, etapa, tema, item e requisito. **[ATINGIDO 2026-04-27]** (18 blocos, 8 etapas, 2 ramos)
- Especialidades em formato de ficha manual, reconstruidas a partir de `libpaxtubasico2`. **[ATINGIDO 2026-04-27]** (274 fichas com requisitos, niveis cumulativos, integradas em `SpecialtyEncyclopedia`)
- Insignias e reconhecimentos vinculados. **[ATINGIDO 2026-04-27]** (27 bloco_insignias, 2 reconhecimentos com 9 requisitos, validacao de idade)
- SQLite consultavel e validado. **[ATINGIDO 2026-04-27]** (validador: 0 erros / 0 avisos)
- Documentacao de usuario e desenvolvedor. **[CRIADO 2026-04-27]** (`guia_uso_app.md`, `guia_desenvolvedor.md`)
- Dashboard de acompanhamento.
- App principal pronto para consumir a base.
