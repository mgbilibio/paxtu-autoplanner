# Mapa: Fonte Oficial vs Base Derivada

## Fonte oficial

- PDFs originais em `docs/biblioteca/libpaxtubasico/*.pdf`
- Markdown OCR em `docs/biblioteca/libpaxtubasico/*/markdown.md`

## Base derivada

- `conhecimento/por/2020/`
- `conhecimento/por/2025/`
- `conhecimento/especialidades/2020/`
- `conhecimento/especialidades/2025/`
- SQLite em `conhecimento/bd/`

## Divergencia estrutural principal

- Os livros oficiais organizam o conhecimento por capitulos e seções editoriais.
- A base derivada organiza por ramo, versão, etapa, item e requisito.
- Portanto, a base derivada e uma modelagem operacional, nao uma copia literal da estrutura editorial.

## Regra de compatibilidade

- Se o livro oficial disser nome, descricao ou requisito diferente, o livro prevalece.
- Se a base derivada tiver etiqueta operacional que nao existe no livro, ela precisa ser marcada como alias interno.
- Quantidade de subitens deve ser validada por fonte oficial antes de consolidar como definitiva.

## Aplicacao imediata

- Lobinho 2025: revisar nomes de blocos e itens.
- Escoteiro 2025: revisar nomes de blocos, itens e sequencia do sistema de progressao.
- Especialidades 2024-1/transição: validar nome, ramo de conhecimento e descricoes; importar separadamente os Guias de Especialidades e Insígnias 2025 antes de tratar como Programa Educativo Atualizado.
