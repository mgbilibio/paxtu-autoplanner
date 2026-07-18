# Status do indice FTS5 da biblioteca Markdown

Gerado em: 2026-05-29T04:11:04

- Artefato: `conhecimento/bd/biblioteca_fts.sqlite`
- Arquivos Markdown indexados: 5025
- Arquivos de pagina indexados: 5025
- Blocos textuais indexados: 12175
- Arquivos com PDF associado: 5025

## Observacoes

- O indice complementa a busca MiniSearch do app; MiniSearch continua responsavel pelos dados operacionais.
- O indexador prefere `pages/page-N/markdown.md` quando disponivel para preservar `pdf_page`.
- `pdf_path` aponta para o PDF local correspondente quando o arquivo existe em `docs/biblioteca`.
- `src/components/GlobalSearch.tsx` consulta a biblioteca local pelo IPC Electron `library:search`.
- `electron/main.ts` procura `biblioteca_fts.sqlite` em desenvolvimento e no app empacotado.
- `package.json` inclui o banco em `extraResources` para release.
- Quando o artefato for `.sqlite`, ele ja esta pronto para consulta FTS5.
- Quando o artefato for `.sql`, ele reconstrói o indice FTS5 quando importado em SQLite.
- O botao de PDF na busca aparece apenas quando `pdf_page` e `pdf_path` estiverem preenchidos.
