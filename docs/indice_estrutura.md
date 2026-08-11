# Índice da Estrutura Ativa

Atualizado em 2026-08-11. Este índice descreve somente `PaxtuAP`, o app alvo. Diretórios vizinhos e backups da raiz do workspace são históricos e não fazem parte do build.

## Entrada e distribuição

- `package.json`: scripts, versão técnica e configuração do electron-builder.
- `INICIAR_APP.bat`: atalho de desenvolvimento, usa Node.js.
- `release/<data-hora>/`: instalador, portátil, ZIP e `win-unpacked` gerados.
- `docs/usersmanual.html`: manual que acompanha a distribuição.

## Interface e domínio

- `src/App.tsx`: navegação, sessão, permissões e composição das telas.
- `src/components/CalendarView.tsx`: agenda, presença, exportação e lançamento de progressão.
- `src/components/ProgressionMap.tsx`: ficha individual, mapa, impressão e acesso ao tracker de blocos.
- `src/components/BlocoTracker.tsx`: execução individual dos 18 blocos e reconhecimento oficial.
- `src/components/SpecialtyEncyclopedia.tsx`: fichas de especialidade, evidências, avaliação, importação e exportação offline.
- `src/components/CyclePlanner.tsx`, `Catalog.tsx`, `PlanDisplay.tsx`: planejamento e roteiros.
- `src/components/reports/`: ficha individual, matriz e relatórios da seção.
- `src/components/help/helpContent.ts`: ajuda contextual exibida no app.

## Dados e regras

- `src/data/generated/progressao_2025.ts`: derivado do banco de progressão. Não editar manualmente.
- `src/data/generated/especialidades_ueb_2026.ts`: derivado da página pública UEB de especialidades. Não editar manualmente.
- `src/data/generated/especialidades_guia.ts` e `.json`: derivados do Guia 18ª Ed. 2024-1 para histórico/transição. Não editar manualmente.
- `src/data/generated/progressao_2025_catalog.ts`: converte os blocos em itens de catálogo `B#.F#` e `B#.V#`.
- `src/data/updatedSpecialtyCatalog.ts`: converte a base pública UEB 2026 em fichas `ESP-UEB26-<id>`.
- `src/data/officialSpecialtyCatalog.ts`: mantém compatibilidade com `ESP-GUIA-<id>` 2024-1 e funções antigas chamadas por telas existentes.
- `src/data/catalog/index.ts`: seleciona o catálogo correto por sistema. `specs_*.json` atendem o legado 2020; `ESP-UEB26-*` atende o Programa Educativo Atualizado.
- `src/data/awardsRules.ts` e `src/services/awardService.ts`: regras históricas isoladas; não são usadas para reconhecimento POR 2025+.

## Persistência e integração

- `src/services/storageService.ts`: fachada de armazenamento.
- `src/services/storage/blocoProgressStorage.ts`: estados de ações e blocos.
- `src/services/storage/specialtyStateStorage.ts`: estados de requisitos, evidências e avaliações de especialidade.
- `src/services/batchProgressionService.ts`: lançamento idempotente de códigos do roteiro pelo calendário.
- `src/services/reportingService.ts`: consolidação de frequência, blocos, legado e especialidades para relatórios.
- `electron/main.ts` e `electron/preload.ts`: IPC de arquivos, PDFs, busca FTS e recursos locais.

## Base de conhecimento

- `conhecimento/bd/progressao_2025.sqlite`: progressão oficial atual.
- `conhecimento/bd/especialidades_guia.sqlite`: Guia de Especialidades 18ª Ed. 2024-1 estruturado para consulta/transição.
- `conhecimento/especialidades/2026_ueb_atualizado/especialidades_ueb_2026.json`: especialidades públicas UEB 2026 estruturadas.
- `docs/biblioteca/fontes_web/ueb_especialidades_2026_08_11/`: originais HTML consultados, manifesto e hashes; cache bruto local não versionado.
- `conhecimento/bd/biblioteca_fts.sqlite`: busca nos documentos de referência.
- `conhecimento/tools/`: geração, auditoria e release check.
- `docs/biblioteca/`: PDFs e extrações para auditoria de fonte.

## Documentação vigente

- `README.md`: visão técnica curta e comandos.
- `docs/usersmanual.html`: uso e distribuição.
- `docs/codeinstructions.html`: regras para manutenção.
- `docs/versions.html`: histórico por data e hora.
- `docs/data_pipeline.md`: relação entre fontes, derivados e runtime.
- `docs/mapa_funcionalidades.html`: mapa de módulos, funções, papéis, dados e grafo de correlação (estilo inventário de produto).
