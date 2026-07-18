# Progressao 2025+ - BD operacional

## Arquivo

- `conhecimento/bd/progressao_2025.sqlite`

## Estado tecnico

- Integridade: ok
- Esquema: completo para progressao 2025+
- Tabelas:
  - `ramos`
  - `etapas`
  - `eixos`
  - `blocos`
  - `acoes_fixas`
  - `acoes_variaveis`
  - `bloco_especialidades`
  - `bloco_insignias`
  - `bloco_ramo_meta`
  - `reconhecimentos_ramo`
  - `reconhecimento_requisitos`

## Contagens

- Ramos: 2
- Etapas: 8
- Eixos: 4
- Blocos: 18
- Acoes fixas: 80
- Acoes variaveis: 230
- Entradas de especialidades por bloco: 316
- Insignias por bloco: 22
- Reconhecimentos de ramo: 2

## Ramos cobertos

- Lobinho
- Escoteiro

## Leitura pratica

- Este banco e a base operacional da progressao 2025+.
- Ele substitui o modelo antigo plano para consulta da progressao.
- A especialidade agora fica em base separada (`especialidades_guia.sqlite`).

## Regra de uso

- Usar este banco para consulta de etapas, blocos, acoes e reconhecimentos.
- Usar `especialidades_guia.sqlite` para fichas de especialidade.
- Usar `conhecimento_db_v19.sqlite` apenas como transicao/historico.
