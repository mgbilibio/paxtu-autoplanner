# Estrutura Sugerida

Data de leitura: 2026-04-25

Objetivo: separar o que e fonte ativa, o que e dado local, o que e utilitario e o que e backup/legado.

## Proposta de raiz

```text
paxtuplanner/
  app/
    web/
    electron/
  data/
    local/
    catalog/
    exports/
  tools/
    extraction/
    migration/
    generators/
  docs/
    active/
    legacy/
    index/
  archive/
    backups/
    installers/
    old-releases/
```

## Mapeamento atual para a nova estrutura

### `app/web`
- `src/`
- `public/`
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `postcss.config.cjs`
- `tailwind.config.cjs`

### `app/electron`
- `electron/main.ts`
- `electron/preload.ts`

### `data/local`
- `meusarquivospaxtu/`
- arquivos JSON locais do app atual
- saídas pequenas de apoio do fluxo corrente

### `data/catalog`
- `src/data/catalog/`
- `src/data/details/`
- `src/data/*.ts` de regras e insignes

### `tools/extraction`
- `scripts/extract_progresso*.py`
- `scripts/progression_*.py`
- `scripts/simple*.py`
- `scripts/robust_extract.py`
- `scripts/final*.py`
- `scripts/v_final_extract.py`

### `tools/migration`
- `scripts/migrate_sempre_alerta.js`
- `create_react_structure.py`
- `generate_html_app.py`
- `processador_pdf_v0219.py`
- `conversamd/parse_markdown.py`
- `conversamd/split_md.py`

### `docs/index`
- `docs/indice_estrutura.md`

### `docs/active`
- `usersmanual.html`
- `codeinstructions.html`
- `versions.html`
- `docs/GUIA_DE_USO_v2.3.html`
- `docs/GUIA_DE_USO_v2.4.html`
- `docs/GUIA_DE_USO_v2.7.html`
- `docs/manual_lobinho_2025.html`

### `archive/backups`
- `_ARCHIVE/`
- `BKP-appmappa-260304-14h42/`

### `archive/installers`
- zips
- exes
- pacotes de distribuicao

### `archive/old-releases`
- `dist/`
- `dist-electron/`
- `release/`
- `node_modules/` de backup, quando existirem em copias antigas

## Regras praticas

1. Um projeto ativo por pasta de entrada.
2. Backup nunca mistura com fonte ativa.
3. Script de prova de conceito nao fica na raiz.
4. Documento final do indice fica em `docs/index`.
5. Arquivos gerados por build ficam em `archive/old-releases` ou sao removidos.

## Ordem de limpeza sugerida

1. Congelar o que hoje e ativo.
2. Mover scripts repetidos para `tools/extraction`.
3. Mover backups inteiros para `archive/backups`.
4. Separar dados de app em `data/local`.
5. Reduzir a raiz para o minimo executavel.
