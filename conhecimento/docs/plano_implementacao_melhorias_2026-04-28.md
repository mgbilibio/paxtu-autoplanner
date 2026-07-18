# Plano de implementacao de melhorias e correcoes

Data: 2026-04-28  
App alvo: `E:\PY\paxtuplanner\INICIAR_APP.bat`

## 0. Status de execucao em 2026-04-28

- Item 1 concluido em baseline: `validate_progressao.py` rodou com 0 erros e 3 avisos; `npx tsc --noEmit` passou; `npm run build` passou.
- Item 2 concluido: documentacao operacional corrigida para 18 blocos cumulativos, 4 etapas por ramo, caminhos `src/components/*` e contagens atuais.
- Item 3 concluido: criado `conhecimento/tools/audit_dados_operacionais.py` e gerado `conhecimento/docs/diagnostico_base_operacional.md`.
- Item 4 iniciado/concluido em primeira versao: fichas operacionais de especialidades por jovem foram adicionadas na enciclopedia, com persistencia em `PAXTU_SPECIALTY_*` e `{dataFolder}/specialty_progress`.
- Item 4 ampliado: ficha agora tem anotacao/evidencia por requisito e impressao da ficha do jovem.
- Item 5 iniciado: evento `paxtu:generate-from-tracker` abre o gerador com pendencias do jovem; `addObjective` foi corrigido para nao perder selecoes em chamadas sequenciais.
- Item 7 concluido na varredura atual de `src/`: criado `src/components/ConfirmDialog.tsx`; `App`, `MembersManager`, `BlocoTracker`, `CyclePlanner`, `CalendarView`, `Catalog`, `PlanDisplay` e componentes de perfis deixaram de usar `alert`/`confirm` nativos.
- Item 10 concluido em segunda integracao: `conhecimento/tools/build_markdown_fts.py` agora prioriza `pages/page-N/markdown.md`, grava `pdf_page` e `pdf_path`, gerou `biblioteca_fts.sqlite` com 3146 paginas Markdown e 7922 blocos, e o `GlobalSearch` exibe botao para abrir PDF quando a fonte possui pagina.
- Item 11 concluido em primeira versao: criado `conhecimento/tools/build_backup_plano_nucleo.py` e gerado backup nucleo enxuto atualizado de 128 arquivos. Ultimo snapshot: `backup_plano_nucleo_2026-04-28_210756.md`.
- Item 14 iniciado: `BlocoTracker` agora exporta CSV e abre ficha HTML imprimivel com a progressao individual POR 2025+ do jovem.
- Item 15 iniciado/corrigido: layout do `Efetivo`, `MemberDashboard`, `BlocoTracker` e `ProgressionMap` ajustado para ocupar viewport real; a ficha agora e renderizada por portal em `document.body`, usa painel fixo preso as quatro bordas, sem `100vw`/`100dvh`, sem padding externo ou `max-width`, e o grid de membros nao ultrapassa a janela.
- Item 16 iniciado: geracao de atividades e ciclos passou a incluir acompanhamento e avaliacao, com requisitos observaveis, criterios de aceite e evidencias por atividade/reuniao.
- Build completo `npm run build` passou em 2026-04-28; ficou apenas aviso externo de `baseline-browser-mapping` desatualizado.

## 1. Estado verificado

### Bases operacionais

- `conhecimento/bd/progressao_2025.sqlite`: 2 ramos, 8 etapas, 4 eixos, 18 blocos, 36 metas bloco/ramo, 80 acoes fixas, 230 acoes variaveis, 308 vinculos de especialidades, 27 vinculos de insignias, 37 aliases, 2 reconhecimentos e 9 requisitos de reconhecimento.
- `conhecimento/bd/especialidades_guia.sqlite`: 5 ramos, 274 especialidades e 2741 requisitos.

### Funcionalidades presentes

- `src/components/BlocoTracker.tsx`: acompanha blocos, acoes fixas, acoes variaveis, substituicoes e reconhecimentos.
- `src/components/SectionProgressOverview.tsx`: consolida progresso da secao e alertas de idade.
- `src/components/BatchProgressMarker.tsx`: marcacao em lote.
- `src/components/ProgressaoBlocos2025.tsx`: consulta da estrutura POR 2025+.
- `src/components/SpecialtyEncyclopedia.tsx`: consulta das especialidades.
- `src/components/GlobalSearch.tsx` e `src/services/searchService.ts`: busca MiniSearch.
- `src/services/storageService.ts`: persistencia de configuracao, membros, planos, progresso e reconhecimentos.
- `electron/main.ts` e `electron/preload.ts`: IPC de arquivos, PDFs e Ollama.
- `src/data/generated/*`: dados exportados dos bancos.

### Pendencias objetivas

- Documentacao principal corrigida em 2026-04-28 para 18 blocos cumulativos, 4 etapas por ramo, caminhos `src/components/*` e contagens atuais.
- `src/services/storageService.ts` esta grande demais e mistura dominios.
- Fichas de especialidades ja possuem versao operacional por jovem, com evidencias por requisito, avaliador, notas e impressao da ficha.
- O backup plano rapido ficou maior que o integral; foi criado backup nucleo por allowlist, mas ainda falta rotina de restauracao automatica.

## 2. Sequencia de implementacao revisada

### 1. Validar baseline tecnico

- **Objetivo**: confirmar que codigo, bancos e dados gerados representam o mesmo estado.
- **Modulos**: `package.json`, `conhecimento/tools/validate_progressao.py`, `conhecimento/tools/export_progressao_to_ts.py`, `conhecimento/tools/export_especialidades_to_ts.py`, `src/data/generated/*`.
- **Classes/metodos**: funcoes Python de validacao/exportacao; scripts `npm run build` e geradores.
- **O que alterar**: nada antes de rodar validacao; corrigir scripts ou dados se houver divergencia.
- **Como**: executar validadores, exportadores e build TypeScript.
- **Motivo**: nao convem melhorar interface sobre dado inconsistente.
- **Tipo**: necessario.

### 2. Corrigir documentacao operacional

- **Objetivo**: remover instrucoes erradas e atualizar indice do app alvo.
- **Modulos**: `conhecimento/docs/guia_uso_app.md`, `AutoPaxtu042026/docs/indice_app_alvo.md`, `conhecimento/index.md`, `conhecimento/docs/guia_desenvolvedor.md`.
- **Classes/metodos**: nao se aplica.
- **O que alterar**: trocar "9 blocos" por "18 blocos cumulativos"; trocar "Etapa 8" por "4 etapas por ramo"; corrigir caminhos `src/screens/*`; atualizar contagens reais dos bancos.
- **Como**: edicao documental direta, com numeros conferidos por consulta SQLite.
- **Motivo**: documentacao errada induz implementacao e uso errados.
- **Tipo**: bug documental.

### 3. Criar painel de diagnostico da base

- **Objetivo**: visualizar completude e inconsistencias da base quase em tempo real.
- **Modulos**: `conhecimento/tools/export_dashboard_2025.py`, novo `conhecimento/tools/audit_dados_operacionais.py`, `conhecimento/dashboard_2025.html`, novo `conhecimento/docs/diagnostico_base_operacional.md`.
- **Classes/metodos**: consultas SQLite e funcoes de exportacao Markdown/HTML.
- **O que alterar**: gerar subtotais por ramo, etapa, eixo, bloco, tipo de acao, modalidade, especialidade, insignia e fonte.
- **Como**: criar auditor que leia os dois bancos e aponte lacunas como alias sem destino, requisito vazio, fonte ausente e especialidade usada sem ficha.
- **Motivo**: o usuario precisa auditar a evolucao da base sem reabrir manualmente cada tabela.
- **Tipo**: necessario.

### 4. Implementar fichas operacionais de especialidades

- **Objetivo**: transformar o catalogo de especialidades em acompanhamento granular por jovem.
- **Modulos**: `conhecimento/bd/schema.sql`, `conhecimento/tools/build_ficha_manual_db.py`, `conhecimento/tools/export_especialidades_to_ts.py`, `src/components/SpecialtyEncyclopedia.tsx`, novo `src/components/SpecialtyFichaTracker.tsx`, `src/services/storageService.ts`, `src/types.ts`.
- **Classes/metodos**: novos tipos de ficha, requisito, evidencia, avaliacao e estado por jovem/especialidade.
- **O que alterar**: incluir descricao, requisitos, subitens, evidencias, anotacoes, avaliador, status e datas.
- **Como**: derivar fichas de `especialidades_guia.sqlite` sempre que possivel; persistir estado do jovem em JSON segregado; evitar banco duplicado se ele nao agregar informacao.
- **Motivo**: especialidade precisa ser cumprida, anotada e avaliada, nao apenas consultada.
- **Tipo**: necessario.

### 5. Integrar progresso real ao planejador

- **Objetivo**: gerar roteiros a partir das pendencias reais dos jovens.
- **Modulos**: `src/components/BlocoTracker.tsx`, `src/components/CyclePlanner.tsx`, `src/services/catalogService.ts`, `src/services/geminiService.ts`, `src/services/ollamaService.ts`, `src/services/llmProvider.ts`, `src/types.ts`.
- **Classes/metodos**: `GeneratorParams`, `ObjectiveItem`, evento `paxtu:generate-from-tracker`, funcoes de catalogo unificado.
- **O que alterar**: passar bloco foco, etapa, modalidade, acoes pendentes e status de progresso ao gerador.
- **Como**: criar DTO de contexto de progresso; montar prompt com codigos e texto completo; manter fallback manual sem IA.
- **Motivo**: conecta progressao 2025+ com planejamento educativo.
- **Tipo**: necessario.

### 6. Refatorar persistencia por dominio

- **Objetivo**: reduzir risco do `storageService.ts`.
- **Modulos**: `src/services/storageService.ts`, novos `memberStorage.ts`, `progressStorage.ts`, `catalogStorage.ts`, `configStorage.ts`, `src/types.ts`.
- **Classes/metodos**: `getMemberBlocoState`, `saveMemberBlocoState`, `saveMemberBlocoStateOptimistic`, `getMemberReconhecimento`, `saveMemberReconhecimento`, `exportProgressBackup`, `importProgressBackup`.
- **O que alterar**: separar configuracao, membros, catalogo, progresso, reconhecimento e backup.
- **Como**: extrair um dominio por vez e manter fachada temporaria para nao quebrar imports.
- **Motivo**: melhora manutencao, testes e futuras migracoes.
- **Tipo**: necessario.

### 7. Trocar dialogs nativos por componentes React

- **Objetivo**: cumprir diretiva local de evitar `messagebox`/bloqueios e melhorar UX.
- **Modulos**: `src/components/BlocoTracker.tsx`, `src/components/MembersManager.tsx`, `src/components/CalendarView.tsx`, `src/components/Catalog.tsx`, `src/components/CyclePlanner.tsx`, `src/components/PlanDisplay.tsx`, `src/components/profiles/*`, `src/services/pdfLinkService.ts`, `src/components/ConfirmDialog.tsx`.
- **Classes/metodos**: `confirmReopen`, `desfazerHomologacao`, validacao de `birthDate`, conflito de `saveMemberBlocoStateOptimistic`.
- **O que alterar**: substituir `alert`, `confirm` e `window.confirm` por dialogos controlados ou mensagens inline/toast.
- **Como**: criar componentes pequenos, com retorno explicito de confirmacao e mensagens padronizadas; usar `paxtu:toast` para avisos globais sem bloqueio.
- **Motivo**: fluxo fica mais claro e menos dependente do Electron/navegador.
- **Tipo**: melhoria necessaria.

### 8. Melhorar catalogo contextual de progressao

- **Objetivo**: consultar progressao por ramo, etapa, eixo, bloco, modalidade e status.
- **Modulos**: `src/components/ProgressaoBlocos2025.tsx`, `src/components/Catalog.tsx`, `src/services/catalogService.ts`, `src/data/generated/progressao_2025.*`.
- **Classes/metodos**: `CatalogItem.progressStatus` e funcoes de catalogo por sistema.
- **O que alterar**: adicionar filtros, destacar itens ja cumpridos e abrir fonte PDF quando houver pagina.
- **Como**: enriquecer itens com `memberId` opcional e status calculado.
- **Motivo**: o chefe encontra rapidamente o que falta trabalhar.
- **Tipo**: melhoria necessaria.

### 9. Fortalecer painel da secao e alertas de idade

- **Objetivo**: priorizar jovens por risco de idade e status de reconhecimento.
- **Modulos**: `src/components/SectionProgressOverview.tsx`, `src/components/MemberDashboard.tsx`, `src/components/StatusBadge.tsx`, `src/services/storageService.ts`.
- **Classes/metodos**: calculos de idade, meses ate limite e estado de reconhecimento.
- **O que alterar**: listar jovem sem data de nascimento, apto, em risco, fora do limite e conquistado.
- **Como**: usar estados ja persistidos e adicionar filtros/exportacao simples.
- **Motivo**: reconhecimentos possuem limite etario e exigem acompanhamento preventivo.
- **Tipo**: necessario.

### 10. Evoluir busca para FTS5 nos livros

- **Objetivo**: buscar em `.md` oficiais com trecho e link para PDF/pagina.
- **Modulos**: `src/services/searchService.ts`, `src/components/GlobalSearch.tsx`, `electron/main.ts`, `electron/preload.ts`, `src/vite-env.d.ts`, `package.json`, `conhecimento/tools/build_markdown_fts.py`, `conhecimento/bd/biblioteca_fts.sqlite`.
- **Classes/metodos**: `SearchDoc`, `search`, `getDocCount` e novo adaptador FTS.
- **O que alterar**: manter MiniSearch para dados operacionais e adicionar FTS5 para biblioteca oficial.
- **Como**: indexar blocos pequenos com fonte, hash, pagina e PDF de origem; consultar via IPC `library:search`; empacotar `biblioteca_fts.sqlite` em `extraResources`; abrir PDF via `pdf:openAtPage` quando `pdf_page` e `pdf_path` existirem.
- **Motivo**: preserva auditagem normativa e acelera revisao.
- **Tipo**: oportunidade util.

### 11. Recriar backup plano enxuto

- **Objetivo**: gerar snapshot textual reconstruivel sem inchar com livros e artefatos redundantes.
- **Modulos**: novo `conhecimento/tools/build_backup_plano_nucleo.py`, novo `conhecimento/docs/backup_plano_nucleo_*.md`, novo `conhecimento/docs/backup_manifest_*.json`.
- **Classes/metodos**: funcoes Python de allowlist, manifest e serializacao de SQLite.
- **O que alterar**: incluir codigo, configs, docs operacionais e bancos essenciais; excluir livros, OCR, backups antigos, cache, `node_modules`, `dist` e release.
- **Como**: usar allowlist e abortar se tamanho passar limite sem explicar a categoria dominante.
- **Motivo**: o backup "rapido" ficou 162 MB, maior que o integral anterior de 81 MB.
- **Tipo**: necessario.

### 12. Testar pacote distribuivel

- **Objetivo**: confirmar funcionamento fora do Vite.
- **Modulos**: `package.json`, `electron/main.ts`, `conhecimento/docs/checklist_release.md`, `conhecimento/docs/testes_pendentes_usuario.md`.
- **Classes/metodos**: IPC `pdf:openAtPage`, IPC `ollama:request`, setup, membros, tracker, busca, PDFs e backup.
- **O que alterar**: corrigir empacotamento ou paths se o pacote falhar.
- **Como**: build Electron, execucao do portable/NSIS e checklist manual.
- **Motivo**: o app precisa funcionar no ambiente real de uso.
- **Tipo**: necessario.

### 13. Ajustar onboarding e navegacao

- **Objetivo**: deixar POR 2025+ como caminho claro e legado como opcional.
- **Modulos**: `src/components/SetupWizard.tsx`, `src/App.tsx`, `src/components/MemberDashboard.tsx`, `src/components/CyclePlanner.tsx`.
- **Classes/metodos**: `AppConfig.showLegacy` e estado de tela ativa em `App.tsx`.
- **O que alterar**: destacar "Acompanhar Progressao", "Planejar Reuniao" e "Especialidades"; esconder legado salvo quando habilitado.
- **Como**: ajustes de labels, menu e fluxo inicial.
- **Motivo**: reduz confusao entre 2020 legado e foco 2025+.
- **Tipo**: melhoria util.

### 14. Exportar e imprimir progresso

- **Objetivo**: permitir uso em reuniao, avaliacao e arquivo local.
- **Modulos**: `src/components/BlocoTracker.tsx`, `src/components/SectionProgressOverview.tsx`, futuro `src/components/SpecialtyFichaTracker.tsx`, novo `src/services/exportService.ts`.
- **Classes/metodos**: exportadores HTML, CSV e JSON.
- **O que alterar**: exportar progresso por jovem, painel da secao e ficha de especialidade.
- **Como**: gerar HTML imprimivel e CSV simples. Primeira entrega feita no `BlocoTracker`; `SectionProgressOverview` ja exportava CSV/impressao da secao; especialidades ja possuem impressao propria na enciclopedia.
- **Motivo**: facilita auditoria e uso fora da tela.
- **Tipo**: melhoria util.

### 15. Higiene visual e acessibilidade

- **Objetivo**: melhorar legibilidade e reduzir dependencia de cor/emoji.
- **Modulos**: `src/App.tsx`, `src/components/MembersManager.tsx`, `src/components/MemberDashboard.tsx`, `src/components/BlocoTracker.tsx`, `src/components/ProgressionMap.tsx`, `src/components/StatusBadge.tsx`, `src/components/ProgressaoBlocos2025.tsx`, `src/components/SectionProgressOverview.tsx`, `src/components/Catalog.tsx`.
- **Classes/metodos**: componentes visuais e props de status.
- **O que alterar**: padronizar status com texto, icone e cor; revisar truncamentos, viewport, responsividade e uso de `min-h-0` nos paineis com rolagem.
- **Como**: ajustes pequenos em Tailwind e componentes reutilizaveis; no recorte atual, `Efetivo` usa largura ampla e grid auto-fit sem overflow, e a ficha de progressao usa portal em `document.body` e painel fixo preso as quatro bordas, sem `100vw`/`100dvh` nem `transform` em ancestrais.
- **Motivo**: reduz erro operacional e melhora uso repetido.
- **Tipo**: melhoria util.

## 3. Criterios de pronto

1. Bancos e dados gerados conferem entre si.
2. Documentacao nao cita contagens antigas, caminhos errados ou modelo de 9 blocos.
3. Jovem Lobinho/Escoteiro pode ter progresso, reconhecimento e especialidades acompanhados granularmente.
4. Planejador consome pendencias reais.
5. Busca encontra progressao, especialidades e trechos dos livros com fonte auditavel; quando a biblioteca possui `pages/page-N/markdown.md`, o resultado tambem abre o PDF na pagina correspondente.
6. Backup plano nucleo e reconstruivel sem livros nem redundancias.
7. App abre por `INICIAR_APP.bat` e pacote Electron salva dados, abre PDFs e executa fluxos criticos.
8. Roteiros e ciclos gerados trazem criterios de acompanhamento/avaliacao por atividade ou semana.
