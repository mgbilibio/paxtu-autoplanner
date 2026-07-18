# Estruturas 2025+

## Fonte principal

- `docs/biblioteca/libpaxtubasico/POR 2026.02/markdown.md`

## Leitura estrutural

### POR 2025

- Define os capitulos normativos gerais.
- Traz Ramos como Filhotes, Lobinho, Escoteiro, Sênior e Pioneiro.
- Formaliza a base de progressão pessoal por ramo.
- Regula a estrutura geral do programa e os sistemas de progressão dos ramos.

### Manual do Escotista - Lobinho

- Usa o simbolo do lobo uivando como referencia central.
- Organiza a progressao em Pata-Tenra, Saltador, Rastreador e Caçador.
- A progressão pessoal aparece ligada a eixos, blocos e ações educativas.
- O material destaca especialidades, insignias de interesse especial e Cruzeiro do Sul.
- O acesso pode ser linear ou direto.
- A entrada na progressão ocorre depois da Promessa do Lobinho.
- O Período de Acolhida e o Caminho para o Ramo Lobinho são fases próprias.
- Os quatro eixos são: Meio Ambiente, Paz e Desenvolvimento, Saúde e Bem-Estar e Habilidades para a Vida.
- Os blocos de aprendizagem precisam ser tratados como tema + intencionalidade + ações educativas.

### Manual do Escotista - Escoteiro

- Usa a flor de lis estilizada como símbolo central.
- Organiza a progressao em Pistas, Trilha, Rumo e Travessia.
- A progressão pessoal aparece ligada a eixos, blocos de aprendizagem e ações educativas.
- O material destaca especialidades, insignias, Lis de Ouro e caminhada ao proximo ramo.
- O acesso também deve distinguir percurso linear e entrada direta.
- A progressão do Escoteiro depende de blocos de aprendizagem e de ações educativas fixas e variáveis.
- O reconhecimento de ramo e a passagem ao Ramo Sênior fazem parte da modelagem.
- Os mínimos de atividades ao ar livre precisam entrar como metadado normativo.

### Guia de Insígnias e Especialidades

- Organiza o catálogo por ramos de conhecimento.
- Divide o conjunto em Habilidades para a Vida, Meio Ambiente, Paz e Desenvolvimento e Saúde e Bem-estar.
- Apresenta a especialidade como sequência de requisitos numerados.
- Serve como modelo para a granularidade de requisitos.
- Cada especialidade deve ser modelada como item com requisitos numerados em ordem.
- A granularidade correta é especialidade -> requisito -> evidência.

### Distintivos e Marcas

- Define símbolos oficiais por ramo.
- Explicita os níveis e reconhecimentos.
- Mostra o conjunto visual que amarra a progressão aos distintivos.
- É a referência para símbolos, distintivos, níveis e reconhecimentos por ramo.

## Estrutura canônica recomendada

- `branch`
- `version`
- `symbol`
- `entry_path`
- `stage`
- `theme`
- `block`
- `item_code`
- `item_title`
- `requirements`
- `recognitions`

## Subestruturas obrigatorias

### Lobinho

- Caminho para o Ramo Lobinho
- Período de Acolhida
- Progressão por acesso linear
- Progressão por acesso direto
- Quatro eixos
- Blocos de aprendizagem
- Ações educativas fixas e variáveis
- Especialidades e insignias de interesse especial
- Cruzeiro do Sul

### Escoteiro

- Caminho para o Ramo Escoteiro
- Progressão por acesso linear
- Progressão por acesso direto
- Quatro eixos
- Blocos de aprendizagem
- Ações educativas fixas e variáveis
- Especialidades
- Insígnias
- Lis de Ouro

## Regra de modelagem

- Ramo e etapa definem o percurso.
- Tema e bloco definem a leitura pedagógica.
- Item e requisitos definem a unidade de coleta.
- Símbolo e reconhecimento definem o vínculo visual e institucional.
- Entrada e caminho definem a transição entre ramos e o ingresso na progressão.

## Regra de foco

- O foco do app e da base e 2025+.
- O recorte 2020 fica como legado historico e comparativo.
- Não usar 2020 como molde principal para contagem ou evolução da progressão nova.
