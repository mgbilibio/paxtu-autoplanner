# Data Pipeline do PaxtuAP

Mapa do que é fonte, derivado e runtime no projeto. Use antes de qualquer mudança
que toque progressão, especialidades ou catálogo.

## Fontes (manualmente curadas — alterar AQUI primeiro)

| Caminho | O que contém |
|---------|--------------|
| `conhecimento/por/**/*.md` | POR 2025 (Lobinho + Escoteiro) — texto canônico |
| `conhecimento/especialidades/**/*.md` | Guia 18ª Edição (274 especialidades) |
| `conhecimento/docs/**/*.md` | Material de apoio e backups históricos |
| `src/data/catalog/branch_senior.json`, `branch_pioneiro.json` | POR 2025 dos ramos ainda sem MD |
| `conhecimento/bd/especialidades_guia.sqlite` | Fonte operacional do Guia 18ª edição: 274 especialidades e 2.741 requisitos |
| `src/data/officialSpecialtyCatalog.ts` | Adaptador do Guia para o catálogo POR 2025+ (`ESP-GUIA-<id>`) |
| `src/data/catalog/specs_*.json` | Catálogo histórico do POR 2020 (`SP-*`); não usar no POR 2025+ |
| `src/data/catalog/{lobinho,escoteiro}_2020.json` | POR 2020 (modo legado) |
| `src/data/catalog/adultos.json`, `modalidades.json`, `specialties.json` | Conteúdo adulto + insígnias |
| `src/data/*.ts` (le_*, sp_*, awardsRules, por_progression, insignias, manuaisReferencia) | Datasets embutidos diretamente em TS |

## Derivados (regeneráveis — NÃO editar manualmente)

| Arquivo gerado | Build command |
|----------------|---------------|
| `conhecimento/bd/progressao_2025.sqlite` | `python conhecimento/tools/build_progressao_db.py` |
| `conhecimento/bd/especialidades_guia.sqlite` | `python conhecimento/tools/build_especialidades_db.py` |
| `conhecimento/bd/biblioteca_fts.sqlite` | `python conhecimento/tools/build_markdown_fts.py` |
| `conhecimento/bd/dashboard_progressao.json` | `python conhecimento/tools/export_dashboard_2025.py` ou `export_dashboard_data.py` |
| `src/data/generated/progressao_2025.ts` | `python conhecimento/tools/export_progressao_to_ts.py` |
| `src/data/generated/especialidades_guia.{ts,json}` | `python conhecimento/tools/export_especialidades_to_ts.py` |

## Runtime (estado do usuário — preservar sempre)

| Caminho | Quando é usado |
|---------|---------------|
| `meusarquivospaxtu/*.json` | Modo standalone (sem `dataFolder` configurada) |
| `<dataFolder configurado>/*.json` | Modo file-system (configurado em Settings) |
| `localStorage` (chaves `PAXTU_*`) | Cache + fallback quando sem `dataFolder` |

## Diagrama do fluxo

```
MD fonte (conhecimento/por, /especialidades)
       │
       ▼
build_*.py
       │
       ▼
SQLite (conhecimento/bd/*.sqlite)
       │
       ▼
export_*.py
       │
       ▼
TS/JSON gerado (src/data/generated/)
       │
       ▼
src/data/officialSpecialtyCatalog.ts + catalog/index.ts (catalogService consome)
       │
       ▼
App em runtime
       │
       ▼ (escrita)
storage layer (src/services/storage/*) ──┐
       │                                  │
       ▼ se dataFolder configurada        ▼ caso contrário
filesystem (<dataFolder>/*.json)        localStorage
       │
       ▼ (snapshot manual antes de refactor)
_data/results/snapshots/<ts>_<label>/
```

## Storage layer (after refactor 2026-05-27)

Toda gravação passa por `src/services/storage/dualBackend.ts`:

- `readJsonDoc(filename, localStorageKey, defaultValue)` — coleções
- `writeJsonDoc(filename, localStorageKey, value)` — coleções
- `readCachedEntity(cacheKey, resolvePaths, migrate?)` — entidades por arquivo (bloco, especialidade, reconhecimento)
- `writeCachedEntity(cacheKey, value, resolvePaths)` — entidades por arquivo
- `isFileBacked()` — para hooks pós-write (ex.: gravar layout file)

Cada módulo é wrapper fino:
- `memberStorage`, `sectionStorage`, `userStorage`, `groupStorage`, `calendarStorage`, `catalogStorage` (coleção)
- `blocoProgressStorage`, `specialtyStateStorage`, `reconhecimentoStorage` (entity)
- `legacyProgressStorage` (entity — não usa helper devido a pattern legado de cache agregado)
- `workspaceStorage`, `backupStorage` — não usam dualBackend (logia única)
- `configStorage`, `sectionLockStorage`, `layoutStorage` — primitivos

## Snapshot e backup

Antes de qualquer refactor que toque storage ou data layer:

```bash
python conhecimento/tools/snapshot_runtime_data.py --label <descricao-do-refactor>
```

Copia `meusarquivospaxtu/`, `conhecimento/bd/`, `src/data/generated/`, `src/data/catalog/`
para `_data/results/snapshots/<ts>_<label>/`. Para rollback:

```powershell
Copy-Item -Recurse -Force `
  "_data\results\snapshots\<ts>_<label>\meusarquivospaxtu" `
  "."
```
