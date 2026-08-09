# Delta de Servicos - guia 2024-1

## Comparacao entre bases

- Base historica: `conhecimento_db_v19.sqlite`
- Base preferencial nova: `especialidades_guia.sqlite`
- Fonte principal: `docs/biblioteca/libpaxtubasico2/Guia de Especialidades 18a Edição - 2024-1/`

## Resultado da comparacao

- Base historica de `Servicos`: 104 fichas
- Base nova de `Servicos`: 105 fichas

## Diferenças encontradas

- `Vitrines` existe no guia novo e nao existia na base historica.
- `Maquiagem` existe nas duas bases, mas no OCR novo apareceu com formatacao de cabecalho diferente em um trecho, o que pede revisao de parse.

## Leitura pratica

- O delta real do catalogo e pequeno, mas relevante.
- O guia 2024-1 amplia o conjunto de `Servicos`.
- A validacao agora e por conteudo e rotulagem, nao por existencia de especialidade.

## Regra operacional

1. O guia 2024-1 vence a base historica apenas dentro do escopo de consulta/transição.
2. `Vitrines` deve entrar como especialidade valida.
3. `Maquiagem` deve ser normalizada na leitura, sem criar duplicidade.
