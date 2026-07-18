# Guia Tecnico para Mantenedor

> Versao: 20260429-1923 | Data: 29/04/2026 19:23 | Publico-alvo: mantenedor do app

## 1. Objetivo

Este guia descreve bancos, exports, persistencia local, ajuda em tela e release.
Use antes de alterar codigo, dados ou empacotamento.

## 2. Pipeline de Dados

```text
PDF/Markdown/planilhas oficiais
        -> conhecimento/tools/*.py
        -> conhecimento/bd/*.sqlite
        -> src/data/generated/*
        -> React/Electron
        -> storage modular local ou pasta compartilhada
```

## 3. Bancos Operacionais

- `conhecimento/bd/progressao_2025.sqlite`: progressao 2025+ para Lobinho e
  Escoteiro, com ramos, etapas, blocos, acoes, especialidades, insignias e
  reconhecimentos.
- `conhecimento/bd/especialidades_guia.sqlite`: catalogo canonico do Guia de
  Especialidades 18a Edicao, com descricoes, requisitos, niveis e ramos.
- `conhecimento/bd/biblioteca_fts.sqlite`: indice FTS5 dos Markdown oficiais,
  usado pela busca global para trecho textual e referencia de PDF.

## 4. Regeneracao de Dados

Rode a partir da raiz `E:\PY\paxtuplanner`:

```powershell
python conhecimento\tools\build_progressao_db.py
python conhecimento\tools\build_especialidades_db.py
python conhecimento\tools\validate_progressao.py
python conhecimento\tools\export_progressao_to_ts.py
python conhecimento\tools\export_especialidades_to_ts.py
python conhecimento\tools\export_dashboard_2025.py
```

Regenere o FTS5 quando novos Markdown forem adicionados:

```powershell
python conhecimento\tools\build_markdown_fts.py
```

## 5. Exports TypeScript

Arquivos gerados ficam em `src/data/generated/`: `progressao_2025.ts`,
`progressao_2025_catalog.ts`, `especialidades_guia.ts` e
`especialidades_guia.json`. Nao edite manualmente; corrija SQLite/builder e gere.

## 6. Persistencia do App

`src/services/storageService.ts` e fachada publica. Regras novas entram em
`src/services/storage/`: catalogo, grupos, secoes, usuarios, membros,
calendario, roteiros, progressao, reconhecimentos, especialidades, backup,
configuracao, layout, workspace, eventos, nomes e lock.

Em `sharedFolder`, gravacoes de jovens, calendario, roteiros, progressao,
reconhecimentos e especialidades exigem lock ativo da secao. O lock fica em
`sections/<secao>/paxtu_edit_lock.json` e e renovado enquanto o perfil opera.

## 7. Especialidades por Jovem

O catalogo vem de `especialidades_guia.sqlite`. O estado individual usa
`MemberSpecialtyState` em `src/types.ts`.

Campos importantes: `requisitosConcluidos`, `evidencias`, `avaliacoes`,
`nivelAtual`, `dataConclusao`, `avaliador` e `notas`. Somente requisitos
`cumprido` ou `validado` contam para nivel.

## 8. Ajuda e Documentacao

Documentos obrigatorios: `appMappa/versions.html`, `appMappa/usersmanual.html`,
`appMappa/codeinstructions.html`, `conhecimento/docs/guia_uso_app.md`,
`conhecimento/docs/guia_rapido_chefia_operacao_2026-04-29.md` e
`conhecimento/docs/checklist_release.md`.

Ajuda em tela:

- `src/components/HelpPanel.tsx`: modal e estado.
- `src/components/help/helpContent.ts`: roteiro, ajuda por tela e FAQ.
- `src/components/help/HelpSections.tsx`: blocos visuais.

Quando mudar fluxo operacional, atualize o manual HTML, o guia Markdown, o
histórico de versoes e a ajuda em tela.

## 9. Build, Release e Validacao

Build local:

```powershell
npm run build
```

Checklist de release:

```powershell
python conhecimento\tools\run_release_check.py --skip-build
```

Release com pacote:

```powershell
python conhecimento\tools\run_release_check.py --dist
```

O pacote deve conter instalador, portable e `win-unpacked/Paxtu AutoPlanner.exe`.

## 10. Pontos de Atencao

- Nao usar git como criterio operacional neste projeto.
- Nao tratar Google Drive como banco multiusuario; e apenas pasta sincronizada.
- Nao permitir escrita silenciosa sem lock em modo compartilhado.
- Nao editar exports gerados manualmente.
- Nao crescer `storageService.ts`; adicione modulos pequenos.
- Nao distribuir release sem `run_release_check.py` com 0 falhas.

## Historico de Revisoes

| Versao | Data | Mudanca |
|---|---|---|
| 20260429-1923 | 29/04/2026 19:23 | Guia reescrito para storage modular, bancos atuais, ajuda e release. |
