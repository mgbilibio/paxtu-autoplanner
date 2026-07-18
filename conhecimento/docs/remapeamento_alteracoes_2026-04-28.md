# Remapeamento de alteracoes - 2026-04-28

## Resumo executivo

O projeto foi reorganizado em tres frentes:

1. **Progressao 2025+** passou a ter banco operacional proprio.
2. **Especialidades** passaram a ter catalogo mestre proprio.
3. **App principal** recebeu uma rodada grande de UI, busca, tracker, onboarding e suporte a PDF.

## Bancos de dados

### Progressao

- `conhecimento/bd/progressao_2025.sqlite`
- Modelo operacional de Lobinho e Escoteiro 2025+.
- 2 ramos, 8 etapas, 18 blocos, 80 acoes fixas, 230 acoes variaveis.

### Especialidades

- `conhecimento/bd/especialidades_guia.sqlite`
- Catalogo mestre plano do Guia de Especialidades 18a Edicao 2024-1.
- 5 ramos, 274 especialidades, 2741 requisitos.

### Legado / transicao

- `conhecimento/bd/conhecimento_db_v19.sqlite`
- Mantido como transicao/historico.

## Schema e camada de ficha manual

- `conhecimento/bd/schema.sql` recebeu tabelas de ficha manual.
- `conhecimento/tools/build_ficha_manual_db.py` foi criado.
- A materializacao da ficha manual ficou pendente por problema de arquivo/journal travado.

## Documentacao nova

- `guia_desenvolvedor.md`
- `guia_uso_app.md`
- `plano_ux_melhorias.md`
- `plano_riscos_mitigacao.md`
- `checklist_release.md`
- `testes_pendentes_usuario.md`
- `revisao_aliases.md`
- `validacao_progressao_2025.md`
- `achados_validacao_p6.md`
- `progressao_2025_bd.md`
- `especialidades_guia_bd.md`
- `ficha_manual_especialidades.md`
- `schema_ficha_manual_especialidades.md`
- `ficha_manual_especialidades_status.md`
- `remapeamento_alteracoes_2026-04-28.md`

## Alteracoes de UI / app

Arquivos recentes em `src/` indicam:

- `App.tsx`
- `CyclePlanner.tsx`
- `PlanDisplay.tsx`
- `BlocoTracker.tsx`
- `CalendarView.tsx`
- `Catalog.tsx`
- `MembersManager.tsx`
- `GlobalSearch.tsx`
- `BatchProgressMarker.tsx`
- `SectionProgressOverview.tsx`
- `SetupWizard.tsx`
- `MemberDashboard.tsx`
- `ProgressionMap.tsx`
- `StatusBadge.tsx`
- `HelpPanel.tsx`
- componentes de perfil em `src/components/profiles/*`

Interpretação pratica:

- o app ganhou fluxo de onboarding
- ganhou tracker direto por membro
- ganhou busca global
- ganhou marcacao em lote
- ganhou ajuste de planos e calendarios
- ganhou melhor navegacao entre progressao 2025+ e legado

## Servicos / IA / busca / PDF

Arquivos recentes indicam mudancas em:

- `src/services/searchService.ts`
- `src/services/catalogService.ts`
- `src/services/storageService.ts`
- `src/services/geminiService.ts`
- `src/services/ollamaService.ts`
- `src/services/llmProvider.ts`
- `src/services/pdfLinkService.ts`
- `electron/main.ts`
- `electron/preload.ts`

Leitura pratica:

- busca textual foi preparada
- linkagem de PDF por pagina foi preparada
- provider de IA ficou abstratado entre Gemini e Ollama
- persistencia local ganhou reforcos

## Dados gerados

- `src/data/generated/progressao_2025.ts`
- `src/data/generated/especialidades_guia.ts`
- `src/data/generated/especialidades_guia.json`
- `src/data/generated/progressao_2025_catalog.ts`

Esses arquivos indicam que a fonte externa ja foi exportada para consumo direto do app.

## Snapshot e dados locais

- `meusarquivospaxtu/paxtu_catalog.json`
- `meusarquivospaxtu/paxtu_members.json`
- `meusarquivospaxtu/paxtu_calendar.json`
- `meusarquivospaxtu/paxtu_users.json`
- `meusarquivospaxtu/progression/1777313124245.json`

Leitura pratica:

- os dados locais do app foram atualizados e/ou regenerados.
- isso sugere trabalho de uso real, nao apenas documentacao.

## Pontos que ainda precisam confirmacao

- A ficha manual de especialidades ainda nao foi materializada em banco final.
- Existem artefatos de tentativa em `conhecimento/bd/` com journal travado.
- O validador de progressao ainda reporta avisos de OCR e texto curto.
- O app precisa ser testado de ponta a ponta com as bases novas.

## Ordem de impacto das alteracoes

1. Bases operacionais novas.
2. UI de progressao / tracker.
3. Busca e PDF.
4. Documentacao de uso e desenvolvimento.
5. Ficha manual sobre especialidades.
6. Validacao e mitigacao de riscos.
