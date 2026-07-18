# Status de Lobinho e Escoteiro

## Recorte atual

- Lobinho 2020: 1 indice, 4 etapas, 40 itens
- Escoteiro 2020: 1 indice, 4 etapas, 37 itens
- Lobinho 2025: 1 indice, 18 etapas, 46 itens
- Escoteiro 2025: 1 indice, 7 etapas, 27 itens
- Escoteiro 2025 planilha: 1 indice, 25 etapas, 515 itens
- Especialidades 2025: 104 fichas canônicas, 1083 passos, 1083 observações, 104 revisões

## Banco

- Banco valido: `conhecimento/bd/conhecimento_db_v19.sqlite`
- Versoes: 2
- Ramos: 2
- Etapas: 33
- Itens: 150
- Requisitos: 150
- Fontes: 1014
- Fichas de especialidades: 104
- Passos de fichas: 1083
- Observacoes de fichas: 1083
- Revisoes de fichas: 104

## Separacao de fontes

- Fonte anterior: `src/data/catalog/*2020*`, `conhecimento/por/2020/*`, extracoes legadas e consolidados historicos
- Fonte nova: `docs/biblioteca/libpaxtubasico/`, `src/data/catalog/*2025*`, `conhecimento/por/2025/*`, `conhecimento/especialidades/2025/*`
- Regra: nao mesclar nomes, etapas ou requisitos de uma fonte com a outra sem marcar a origem

## Proximos passos

1. Consolidar a árvore canônica por ramo e versao.
2. Cruzar a planilha com os arquivos gerados para separar duplicatas de complementos.
3. Preencher a base de Lobinho com o mesmo nivel de detalhe do Escoteiro.
4. Refinar `especialidades/2025`, principalmente `servicos`.
5. Atualizar o SQLite espelho e os indices finais.
