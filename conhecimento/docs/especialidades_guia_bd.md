# Especialidades guia - BD plano

## Arquivo

- `conhecimento/bd/especialidades_guia.sqlite`

## Estado tecnico

- Integridade: ok
- Esquema: plano
- Tabelas:
  - `ramos`
  - `especialidades`
  - `requisitos`

## Contagens

- Ramos: 5
- Especialidades: 274
- Requisitos: 2741
- `Serviços`: 105 especialidades

## Ramos

- Ciencia e Tecnologia
- Cultura
- Desportos
- Servicos
- Habilidades Escoteiras

## Leitura pratica

- Este banco e o melhor candidato para virar a base canonica de especialidades.
- Ele ja separa ramo, especialidade e requisito em camadas simples.
- O `v19` continua util como transicao e referencia de acompanhamento, mas este arquivo tem a estrutura certa para especialidades.
- O ramo `Serviços` tem 105 registros, o que indica cobertura mais completa que a base derivada anterior.
- Ha sinais de OCR a revisar em alguns nomes, por exemplo `Maquiagem` vindo com marcador de nivel no texto fonte.
- A validacao agora e conteudo/semantica, nao integridade estrutural.

## Uso recomendado

1. Validar os nomes e requisitos contra `libpaxtubasico2`.
2. Marcar quais registros sao revisados e quais sao novos.
3. Migrar a exibicao de especialidades para este formato plano.
4. Manter o banco antigo como apoio historico.
