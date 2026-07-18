# Plano de acao para versao final do Paxtu AutoPlanner

Data: 2026-04-29  
App alvo: `E:\PY\paxtuplanner\INICIAR_APP.bat`  
Publico principal: chefe de secao e assistentes  
Publico secundario: diretoria, coordenacao de ramo e responsaveis por auditoria local  

## 0. Estado atual resumido

- Base Lobinho/Escoteiro 2025+ esta operacional, com 0 erros de integridade e 0 avisos.
- `progressao_2025.sqlite` contem 2 ramos, 8 etapas, 18 blocos, 80 acoes fixas, 230 acoes variaveis, 308 vinculos de especialidades, 27 vinculos de insignias e 2 reconhecimentos de ramo.
- `especialidades_guia.sqlite` contem 274 especialidades e 2741 requisitos, sem especialidade vazia e sem requisito vazio.
- `biblioteca_fts.sqlite` indexa a biblioteca Markdown oficial para busca textual com fonte e, quando disponivel, pagina do PDF.
- O app ja tem ficha de progressao, especialidades por jovem, busca global, gerador de atividades, ciclo, relatorios e perfis.
- O foco da versao final deve sair de "base pronta" para "uso real em reuniao, planejamento, avaliacao, diretoria e manutencao segura".

## 0.1. Execucao inicial em 2026-04-29

- Item 1 iniciado/concluido: corrigidos os 3 avisos da validacao, incluindo texto curto de acao fixa, dois artefatos de OCR e normalizacao de nomes vindos do OCR.
- `validate_progressao.py` passou com 0 erros e 0 avisos em 2026-04-29.
- `export_progressao_to_ts.py` e `export_especialidades_to_ts.py` regeraram `src/data/generated/*`.
- Item 2 iniciado/concluido: criado `archive_bd_artifacts.py`, movidos 19 bancos/artefatos antigos para `conhecimento/archive/bd_legacy_2026-04-29` e criado `manifest_bancos_operacionais_2026-04-29.md`.
- Item 3 iniciado: criado `roleService.ts` com permissoes para chefe de secao, assistente, diretoria, leitura/auditoria e administrador.
- Item 4 iniciado: login operacional abre painel da chefia; diretoria/leitura abre relatorios. Menu passa a respeitar permissoes.
- Item 12 iniciado: configuracoes avancadas agora exportam/importam backup completo do estado local do app e mantem backup especifico de progressao POR 2025+.
- Item 12 ampliado: criado documento `estrategia_compartilhamento_sem_servidor_2026-04-29.md`, incluido `syncMode` no app e geracao de `paxtu_workspace.json` na pasta de dados.
- Item 12 ampliado novamente: criado `dataLayoutService.ts` e iniciada gravacao granular em `sections/<secao>/jovens/<jovem>/...` e `sections/<secao>/adultos/<adulto>/...`, mantendo arquivos globais como indice/compatibilidade.
- Item 12 ampliado com lock leve: em `sharedFolder`, login em secao grava `sections/<secao>/paxtu_edit_lock.json`, logout libera o lock, e outro usuario recebe banner se a secao estiver em edicao. Se houver conflito, a interface entra em modo consulta e so volta a editar com confirmacao de "Assumir edicao".
- Validacao TypeScript `npx tsc --noEmit` passou apos essas alteracoes.

## 0.2. Avanco de fechamento em 2026-04-29

- Item 5 iniciado: `IndividualReport.tsx` passou a abrir em ficha consolidada com dados do jovem, frequencia, avanco, ultimos registros e proximas pendencias.
- Item 6 ampliado: `MemberSpecialtyState` ganhou avaliacoes por requisito; `SpecialtyEncyclopedia.tsx` agora diferencia `em_estudo`, `cumprido`, `validado` e `revisar`.
- Item 9 iniciado: `ReportsDashboard.tsx` ganhou resumo executivo para diretoria com jovens, frequencia media, avanco medio e alertas.
- Item 11 iniciado: `storageService.ts` foi reduzido como fachada e novas regras de configuracao, eventos, layout e lock/workspace foram extraidas para `src/services/storage/*`.
- Item 15 iniciado/concluido: criado `conhecimento/tools/run_release_check.py`, gerando relatorio em `_data/results`.
- Item 16 iniciado/concluido: `package.json` passou a empacotar os tres bancos operacionais; `npm run dist` gerou `release/2.9.0`; smoke test do executavel desempacotado iniciou e foi encerrado com sucesso.
- Release check `release_check_2026-04-29_084337.md` passou com 0 falhas.

## 0.3. Continuidade em 2026-04-29

- Item 11 avancou: `storageService.ts` agora e apenas fachada publica; os dominios foram separados em arquivos sob `src/services/storage`, todos com ate 150 linhas.
- Item 12 avancou: `workspaceStorage.ts` passou a registrar lock ativo em `sessionStorage` e exportar `canWriteSection`/`assertCanWriteSection`.
- Item 12 avancou novamente: gravacoes de jovens, calendario, roteiros, progressao, reconhecimento e especialidades agora exigem lock ativo da propria secao em modo `sharedFolder`.
- `npm run build` passou apos a refatoracao completa.
- `npm run dist` foi reexecutado e atualizou `release/2.9.0`.
- Smoke test do executavel desempacotado retornou `SMOKE_OK_STARTED_AND_STOPPED`.
- Release check `release_check_2026-04-29_140629.md` passou com 0 falhas.

## 0.4. Continuidade do lock em 2026-04-29

- Item 12 avancou: lock de secao foi movido para `sectionLockStorage.ts`, mantendo granularidade de arquivos.
- Item 12 avancou novamente: criado `renewSectionEditLock`, acionado pelo `App.tsx` a cada 10 minutos enquanto ha lock proprio ativo.
- Item 12 corrigiu UX de bloqueio: `assertCanWriteSection` emite `paxtu:storage-blocked`; `App.tsx` captura o evento e rejeicoes assíncronas de modo consulta para exibir toast amigavel.
- Se outro adulto assumir a edicao durante uma sessao, o app remove o lock local, coloca a secao em modo consulta e muda para relatorios.

## 1. Fechar o baseline da base operacional

- **Ordem**: 1.
- **Objetivo**: garantir que a base usada no app e a base documentada sejam exatamente a mesma.
- **Publico atendido**: chefia, assistentes e diretoria.
- **Modulos**: `conhecimento/bd/progressao_2025.sqlite`, `conhecimento/bd/especialidades_guia.sqlite`, `conhecimento/bd/biblioteca_fts.sqlite`, `src/data/generated/*`.
- **Classes/metodos**: scripts `validate_progressao.py`, `audit_dados_operacionais.py`, `export_progressao_to_ts.py`, `export_especialidades_to_ts.py`.
- **O que fazer**: corrigir os 3 avisos restantes, regenerar exports TypeScript e atualizar diagnosticos.
- **Como fazer**: rodar validadores, localizar os requisitos com possivel OCR ruim, revisar contra fonte oficial e reexportar os dados gerados.
- **Motivo**: uma versao final nao deve depender de memoria do desenvolvimento; ela precisa de dado validado e repetivel.
- **Criterio de pronto**: validacao com 0 erros e, idealmente, 0 avisos documentados ou justificados.

## 2. Separar dados finais, legados e artefatos de desenvolvimento

- **Ordem**: 2.
- **Objetivo**: evitar que bancos antigos, vazios ou transitivos confundam manutencao e empacotamento.
- **Publico atendido**: manutencao tecnica e diretoria em auditoria.
- **Modulos**: `conhecimento/bd`, `conhecimento/docs`, futuro `conhecimento/archive`.
- **Classes/metodos**: novo script simples de inventario e arquivamento controlado.
- **O que fazer**: classificar bancos como operacional, legado, backup, vazio ou temporario.
- **Como fazer**: manter ativos apenas os bancos usados pelo app; mover os demais para pasta de arquivo com manifest explicando origem e motivo.
- **Motivo**: hoje existem bancos antigos e alguns arquivos de 0 byte que nao devem entrar como fonte final.
- **Criterio de pronto**: manifest com lista dos bancos ativos e nenhum artefato vazio no caminho operacional.

## 3. Definir papeis e permissoes de uso

- **Ordem**: 3.
- **Objetivo**: ajustar o app para uso por chefe, assistentes e diretoria sem misturar responsabilidades.
- **Publico atendido**: todos.
- **Modulos**: `src/components/profiles/LoginScreen.tsx`, `UserManager.tsx`, `ProfileConfig.tsx`, `SectionManager.tsx`, `StructureManager.tsx`, `src/App.tsx`, `src/services/storageService.ts`.
- **Classes/metodos**: tipos de perfil em `src/types.ts`, funcoes de persistencia de configuracao e usuario.
- **O que fazer**: criar perfis funcionais: chefe de secao, assistente, diretoria e leitura/auditoria.
- **Como fazer**: chefe pode configurar e homologar; assistente pode registrar atividades, evidencias e sugestoes; diretoria pode ver relatorios e exportar; auditoria pode consultar sem alterar.
- **Motivo**: o app sera usado por mais de um tipo de adulto, e a versao final precisa proteger registros importantes.
- **Criterio de pronto**: telas criticas respeitam perfil; operacoes de homologacao e exclusao exigem permissao.

## 4. Consolidar a experiencia principal da chefia

- **Ordem**: 4.
- **Objetivo**: fazer o chefe abrir o app e encontrar rapidamente a situacao da secao.
- **Publico atendido**: chefe de secao.
- **Modulos**: `src/App.tsx`, `MembersManager.tsx`, `MemberDashboard.tsx`, `SectionProgressOverview.tsx`, `StatusBadge.tsx`.
- **Classes/metodos**: selecao de tela ativa, calculos de resumo da secao, filtros de ramo/equipe/status.
- **O que fazer**: criar uma tela inicial operacional com alertas, jovens em risco, proximas acoes e pendencias por equipe.
- **Como fazer**: usar dados ja persistidos de progressao, especialidades, idade, frequencia e agenda.
- **Motivo**: chefe nao deve depender de navegar por muitas abas para decidir a proxima reuniao.
- **Criterio de pronto**: em ate 30 segundos o chefe consegue ver quem precisa de atencao e o que trabalhar.

## 5. Finalizar ficha individual do jovem

- **Ordem**: 5.
- **Objetivo**: tornar a ficha individual o centro confiavel de acompanhamento.
- **Publico atendido**: chefe e assistentes.
- **Modulos**: `MemberDashboard.tsx`, `BlocoTracker.tsx`, `ProgressionMap.tsx`, `AwardTracker.tsx`, `MemberHistoryModal.tsx`.
- **Classes/metodos**: leitura e gravacao de progresso, historico, reconhecimentos e evidencias.
- **O que fazer**: unificar em uma ficha: dados do jovem, progressao 2025+, especialidades, insignias, historico, observacoes e exportacao.
- **Como fazer**: manter abas internas claras e layout em tela cheia com rolagem propria, sem achatar conteudo.
- **Motivo**: a ficha e a tela que mais sera usada em reuniao, conselho de chefia e conversa com responsaveis.
- **Criterio de pronto**: ficha abre sem overflow, persiste estado e exporta relatorio individual legivel.

## 6. Tornar especialidades realmente acompanhaveis

- **Ordem**: 6.
- **Objetivo**: deixar especialidade parecida com ficha manual, mas com controle digital.
- **Publico atendido**: chefe, assistentes e jovens acompanhados.
- **Modulos**: `SpecialtyEncyclopedia.tsx`, `src/data/generated/especialidades_guia.*`, `src/services/catalogService.ts`, `src/services/storageService.ts`.
- **Classes/metodos**: estado por jovem/especialidade/requisito, avaliador, evidencias, nivel e datas.
- **O que fazer**: revisar tela para mostrar descricao, requisitos por nivel, anotacoes, evidencias e avaliacao.
- **Como fazer**: cada requisito deve aceitar status, nota curta, data, avaliador e evidencia textual.
- **Motivo**: especialidade nao e apenas consulta; e um processo de cumprimento, orientacao e avaliacao.
- **Criterio de pronto**: uma especialidade pode ser iniciada, acompanhada, avaliada, impressa e auditada por jovem.

## 7. Amarrar planejamento ao progresso real

- **Ordem**: 7.
- **Objetivo**: gerar atividades e ciclos a partir das necessidades reais da secao.
- **Publico atendido**: chefe e assistentes.
- **Modulos**: `CyclePlanner.tsx`, `PlanDisplay.tsx`, `BlocoTracker.tsx`, `recommendationService.ts`, `geminiService.ts`, `ollamaService.ts`, `llmProvider.ts`, `planNormalizationService.ts`.
- **Classes/metodos**: geracao de contexto, normalizacao de atividades, criterios de avaliacao e objetivos selecionados.
- **O que fazer**: fazer o gerador receber pendencias por jovem, equipe, ramo, etapa, bloco e especialidade.
- **Como fazer**: montar um contexto estruturado com itens pendentes e exigir retorno com atividade, acompanhamento, criterios e evidencia.
- **Motivo**: planejamento final deve economizar trabalho do chefe e nao apenas gerar ideias genericas.
- **Criterio de pronto**: ao selecionar pendencias, o app gera roteiro aplicavel e avaliavel.

## 8. Implementar avaliacao de atividade como dado de primeira classe

- **Ordem**: 8.
- **Objetivo**: registrar como cada atividade ou ciclo comprova progressao.
- **Publico atendido**: chefe, assistentes e diretoria.
- **Modulos**: `CyclePlanner.tsx`, `PlanDisplay.tsx`, `CalendarView.tsx`, `BatchProgressMarker.tsx`, `src/types.ts`, `storageService.ts`.
- **Classes/metodos**: `ActivityEvaluation`, campos de acompanhamento por reuniao, marcacao em lote e historico.
- **O que fazer**: ligar atividade executada, jovens presentes, itens avaliados, criterio de aceite e evidencia.
- **Como fazer**: ao concluir atividade, oferecer marcacao guiada por item e por jovem, com campo de observacao.
- **Motivo**: sem registro avaliativo, a progressao fica solta e dificil de justificar.
- **Criterio de pronto**: uma reuniao gera historico de presenca, itens avaliados e evidencias resumidas.

## 9. Criar visao de diretoria

- **Ordem**: 9.
- **Objetivo**: dar a diretoria uma leitura consolidada sem expor complexidade operacional.
- **Publico atendido**: diretoria.
- **Modulos**: `src/components/reports/ReportsDashboard.tsx`, `TroopStats.tsx`, `TroopMatrix.tsx`, `IndividualReport.tsx`, `IndividualSheet.tsx`, `reportingService.ts`.
- **Classes/metodos**: agregacoes por secao, ramo, equipe, faixa etaria, reconhecimentos e pendencias.
- **O que fazer**: criar painel com numeros de jovens, evolucao, riscos de idade, reconhecimentos, frequencia e lacunas.
- **Como fazer**: usar componentes de relatorio existentes e acrescentar filtros por periodo, secao, ramo e equipe.
- **Motivo**: diretoria precisa acompanhar qualidade do programa, nao operar item a item.
- **Criterio de pronto**: diretoria consegue imprimir/exportar um resumo mensal sem alterar dados.

## 10. Fortalecer relatorios e exportacoes

- **Ordem**: 10.
- **Objetivo**: permitir uso fora da tela, em reuniao, conselho e arquivo local.
- **Publico atendido**: chefia e diretoria.
- **Modulos**: `reportingService.ts`, `BlocoTracker.tsx`, `SectionProgressOverview.tsx`, `ReportsDashboard.tsx`, `IndividualReport.tsx`.
- **Classes/metodos**: exportadores HTML, CSV, JSON e impressao.
- **O que fazer**: padronizar relatorios individual, secao, equipe, especialidades e ciclo.
- **Como fazer**: criar modelos imprimiveis com cabecalho, periodo, fonte dos dados e data de geracao.
- **Motivo**: app final precisa produzir material apresentavel e auditavel.
- **Criterio de pronto**: todos os relatorios essenciais exportam e imprimem sem ajuste manual.

## 11. Refatorar persistencia por dominio

- **Ordem**: 11.
- **Objetivo**: reduzir risco tecnico antes da versao final.
- **Publico atendido**: manutencao.
- **Modulos**: `src/services/storageService.ts` e novos servicos menores.
- **Classes/metodos**: membros, configuracao, progresso, especialidades, calendario, backups e relatorios.
- **O que fazer**: separar o servico grande em modulos pequenos com fachada temporaria.
- **Como fazer**: extrair um dominio por vez e manter compatibilidade dos imports durante a migracao.
- **Motivo**: `storageService.ts` concentra dominios demais e vira ponto unico de quebra.
- **Criterio de pronto**: nenhum arquivo de servico central passa de tamanho excessivo e os fluxos existentes continuam funcionando.

## 12. Garantir backup, restauracao e portabilidade

- **Ordem**: 12.
- **Objetivo**: impedir perda de dados locais e facilitar troca de maquina.
- **Publico atendido**: chefe, diretoria e manutencao.
- **Modulos**: `conhecimento/tools/build_backup_plano_nucleo.py`, `storageService.ts`, `electron/main.ts`, `electron/preload.ts`.
- **Classes/metodos**: export/import de dados, manifest, validacao de restauracao.
- **O que fazer**: criar rotina de backup e restauracao pelo app, alem do backup plano tecnico.
- **Como fazer**: exportar ZIP/JSON local com dados de uso, bancos essenciais e manifest; importar com previa validacao.
- **Motivo**: app local sem backup claro e fragil para uso em grupo escoteiro real.
- **Criterio de pronto**: backup restaurado em pasta limpa abre com os mesmos jovens, progresso e relatorios.

## 13. Finalizar busca oficial e rastreabilidade

- **Ordem**: 13.
- **Objetivo**: deixar consulta normativa confiavel.
- **Publico atendido**: chefia e diretoria.
- **Modulos**: `GlobalSearch.tsx`, `searchService.ts`, `pdfLinkService.ts`, `electron/main.ts`, `electron/preload.ts`, `biblioteca_fts.sqlite`.
- **Classes/metodos**: busca local, abertura de PDF, resultado com trecho e fonte.
- **O que fazer**: padronizar resultados por tipo: progressao, especialidade, requisito, livro e documento.
- **Como fazer**: mostrar origem, pagina, trecho, botao de abrir PDF e indicacao de fonte oficial quando aplicavel.
- **Motivo**: decisoes de progressao precisam ser auditaveis contra livros e guias oficiais.
- **Criterio de pronto**: qualquer termo relevante retorna dados operacionais e fontes oficiais com link rastreavel.

## 14. Revisar UX para uso repetido em reuniao

- **Ordem**: 14.
- **Objetivo**: remover atrito visual e operacional.
- **Publico atendido**: chefe e assistentes.
- **Modulos**: `src/index.css`, `App.tsx`, `MembersManager.tsx`, `MemberDashboard.tsx`, `BlocoTracker.tsx`, `CyclePlanner.tsx`, `CalendarView.tsx`, `StatusBadge.tsx`.
- **Classes/metodos**: componentes de tela, dialogs e status.
- **O que fazer**: revisar responsividade, atalhos, filtros, estados vazios, confirmacoes e mensagens.
- **Como fazer**: testar desktop e notebook, com janelas reduzidas, sem overflow horizontal e com textos legiveis.
- **Motivo**: chefe usara o app sob pressa; a interface precisa ajudar e nao disputar atencao.
- **Criterio de pronto**: fluxos principais cabem na tela, sem textos cortados e sem dialogs nativos.

## 15. Testar fluxos criticos de ponta a ponta

- **Ordem**: 15.
- **Objetivo**: validar o produto como usuario real.
- **Publico atendido**: todos.
- **Modulos**: `checklist_release.md`, `tests` se forem criados, `package.json`, app Electron.
- **Classes/metodos**: build, validadores, fluxos manuais e scripts de verificacao.
- **O que fazer**: criar e executar checklist final com dados de teste.
- **Como fazer**: testar cadastro, ficha, progressao, especialidade, atividade, ciclo, presenca, relatorio, backup, restauracao e busca.
- **Motivo**: build TypeScript aprovado nao garante app pronto para reuniao.
- **Criterio de pronto**: checklist final assinado com bloqueadores zerados e pendencias nao criticas listadas.

## 16. Preparar pacote distribuivel

- **Ordem**: 16.
- **Objetivo**: entregar app instalavel/portatil.
- **Publico atendido**: chefe, assistentes e diretoria.
- **Modulos**: `package.json`, `electron/main.ts`, `electron/preload.ts`, `release/*`, `INICIAR_APP.bat`.
- **Classes/metodos**: build Electron, recursos extras, paths de dados locais e abertura de PDF.
- **O que fazer**: gerar portable e instalador, testando em pasta limpa.
- **Como fazer**: rodar `npm run build`, depois `npm run dist`, abrir o app gerado e testar dados, biblioteca e backup.
- **Motivo**: a versao final precisa funcionar fora do ambiente de desenvolvimento.
- **Criterio de pronto**: portable abre, salva, fecha, reabre e conserva todos os dados.

## 17. Atualizar documentacao final

- **Ordem**: 17.
- **Objetivo**: deixar usuario e manutencao sem depender da conversa de desenvolvimento.
- **Publico atendido**: todos.
- **Modulos**: `appMappa/usersmanual.html`, `appMappa/codeinstructions.html`, `appMappa/versions.html`, `conhecimento/docs/guia_uso_app.md`, `conhecimento/docs/guia_desenvolvedor.md`.
- **Classes/metodos**: nao se aplica.
- **O que fazer**: criar manual final por perfil de usuario e guia tecnico de manutencao.
- **Como fazer**: separar secoes para chefe, assistente, diretoria, backup, restauracao, relatorios e atualizacao de base.
- **Motivo**: o app sera privado e local; a documentacao precisa carregar o conhecimento operacional.
- **Criterio de pronto**: qualquer adulto autorizado consegue entender o fluxo principal sem consultar o desenvolvedor.

## 18. Criar criterio de aceite da versao final

- **Ordem**: 18.
- **Objetivo**: decidir objetivamente quando parar de mexer e declarar versao final.
- **Publico atendido**: direcao do projeto.
- **Modulos**: `conhecimento/docs/checklist_release.md`, este plano e `versions.html`.
- **Classes/metodos**: checklist operacional.
- **O que fazer**: transformar este plano em checklist de aceite.
- **Como fazer**: cada item deve ter status: pendente, em andamento, concluido, adiado ou dispensado.
- **Motivo**: sem criterio de aceite, o projeto continua crescendo indefinidamente.
- **Criterio de pronto**: versao final aprovada com bloqueadores zerados e melhorias futuras separadas.

## Sequencia recomendada de execucao

1. Fechar baseline da base operacional.
2. Limpar separacao entre banco final, legado e artefatos.
3. Definir permissoes e papeis.
4. Finalizar dashboard inicial da chefia.
5. Finalizar ficha individual.
6. Finalizar especialidades por jovem.
7. Integrar planejamento com pendencias reais.
8. Registrar avaliacao de atividades executadas.
9. Criar visao da diretoria.
10. Fortalecer relatorios e exportacoes.
11. Refatorar persistencia.
12. Implementar backup/restauracao pelo app.
13. Finalizar busca oficial auditavel.
14. Revisar UX.
15. Testar fluxos de ponta a ponta.
16. Gerar pacote distribuivel.
17. Atualizar documentacao final.
18. Fechar checklist de aceite.

## Fora do escopo imediato

- Expandir Senior e Pioneiro com o mesmo nivel de completude de Lobinho/Escoteiro.
- Reescrever o legado 2020 alem do necessario para consulta e preservacao historica.
- Automatizar tarefas caras de IA sem acionamento manual.
- Sincronizacao online ou multiusuario em rede.
- Publicacao em loja ou distribuicao publica.
