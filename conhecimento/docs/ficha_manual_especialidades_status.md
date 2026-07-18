# Status da ficha manual de especialidades

## Estado atual

- Schema da ficha manual ja foi adicionado em `conhecimento/bd/schema.sql`.
- Gerador `conhecimento/tools/build_ficha_manual_db.py` foi criado.
- A base de entrada continua sendo `especialidades_guia.sqlite`.

## Tentativa de materializacao

- O gerador conseguiu montar a base em memoria.
- O backup para arquivo final encontrou `disk I/O error`.
- Ficaram artefatos de tentativa em `conhecimento/bd/`:
  - `fichas_especialidades_next.sqlite`
  - `fichas_especialidades_next.sqlite-journal`
  - `fichas_especialidades.sqlite`

## Leitura pratica

- O desenho da camada esta pronto.
- O bloqueio agora e de materializacao do arquivo novo, nao de modelagem.
- O proximo passo e limpar os artefatos travados e rodar novamente o gerador.

## Regra para retomar

1. Validar se o journal travado foi removido.
2. Rodar `build_ficha_manual_db.py` de novo.
3. Confirmar integridade do novo banco.
4. Integrar a camada no dashboard e no app principal.
