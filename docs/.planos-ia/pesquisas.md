# Pesquisa: especialidades escoteiras e transição de programa

**Corte da pesquisa:** 16 de novembro de 2026. **Público:** escotistas, responsáveis pela unidade e equipe do Paxtu AutoPlanner. **Estado:** roteiro informativo para consulta; não é decisão da UEB nem autorização para registrar conquistas.

## 1. O que mudou?

O Programa Educativo Atualizado organiza especialidades em quatro eixos e separa as propostas para Lobinho/Escoteiro e Sênior/Pioneiro. O FAQ da União dos Escoteiros do Brasil (UEB) descreve dois níveis para Lobinho/Escoteiro e um nível com estrutura diferente para Sênior/Pioneiro. A UEB informa que algumas especialidades anteriores foram descontinuadas; outras têm temas semelhantes em fichas atualizadas. Isso não demonstra equivalência automática entre fichas ou requisitos. [FAQ UEB](https://www.escoteiros.org.br/faq-atualizacao-do-programa-educativo/) · [Ferramenta de equivalência para Lobinho](https://www.escoteiros.org.br/wp-content/uploads/2026/02/Equivalencia_ramo_lobinho.pdf)

## 2. Quantas fichas foram encontradas?

| Base examinada | Fichas | Método e limite |
| --- | ---: | --- |
| Guia anterior, 18ª edição de 2024 | 274 | Contagem na base estruturada do projeto; o PDF não foi auditado página por página para confirmar a extração. |
| Catálogo atualizado, Lobinho/Escoteiro | 176 | Endereços públicos obtidos nas quatro categorias da UEB, conferidos com a captura do projeto. |
| Catálogo atualizado, Sênior/Pioneiro | 32 | Mesmo método, nas quatro categorias desse público. |
| Total das listas atualizadas | 208 | Fichas por público; três títulos aparecem nas duas listas, resultando em 205 títulos distintos. |

Na comparação entre as 274 fichas estruturadas do guia anterior e as 176 de Lobinho/Escoteiro há 98 fichas a menos, cerca de 35,8%. As listas têm organização e público diferentes: essa diferença não é uma contagem de fichas extintas. A soma de 208 também não equivale às opções disponíveis para um único jovem.

O catálogo atualizado utilizado pelo app foi capturado em 11/08/2026 e contém 1.385 requisitos. Na pesquisa desta conversa, os endereços nas oito categorias públicas da UEB coincidiram com os 208 endereços da captura. Essa verificação de cobertura não comparou novamente o texto integral dos requisitos. [Catálogo público UEB](https://www.escoteiros.org.br/especialidades/) · [Guia de 2024, 18ª edição](https://www.grupoescoteiro106mg.com.br/assets/docs/Guia_de_especialidades.pdf)

## 3. Os temas antigos sumiram ou foram integrados?

Há situações diferentes. No cruzamento por nome, ignorando acentos, pontuação e caixa, 140 dos 274 títulos antigos coincidiram com ao menos um título atualizado; 134 não tiveram correspondência textual exata. Este número **não** é um total de extinções: nomes podem ter mudado e assuntos podem ter sido agrupados. A correspondência de título tampouco comprova equivalência de conteúdo.

| Fichas anteriores | Ficha atual encontrada | Leitura informativa |
| --- | --- | --- |
| Costura; Estilismo | [Costura e Estilismo](https://www.escoteiros.org.br/especialidades/costura-e-estilismo-atualizado/) | Reúne atividades relacionadas aos dois temas; não se demonstrou equivalência de todos os requisitos. |
| Jardinagem; Paisagismo | [Jardinagem e Paisagismo](https://www.escoteiros.org.br/especialidades/jardinagem-e-paisagismo-atualizado/) | Reúne assuntos anteriormente apresentados em fichas separadas. |
| Basquetebol; Voleibol | [Esportes de Quadra](https://www.escoteiros.org.br/especialidades/esportes-de-quadra/) | Oferece uma ficha ampla para esporte escolhido; não foi confirmada a concessão repetida por modalidade. |

As 134 divergências de nome ainda exigem revisão individual dos requisitos e das fontes. Não classificá-las todas como extintas ou automaticamente integradas.

## 4. Isso facilita a conquista?

Uma ficha mais ampla pode facilitar a escolha e agrupar assuntos; também pode deixar de oferecer reconhecimentos separados para interesses antes distintos. Quantidade menor de itens não prova menor dificuldade: cada item pode exigir materiais, acompanhamento, tempo ou uma atividade coletiva. Não se deve igualar o antigo nível III ao novo nível II apenas pela quantidade de itens.

Na ficha pública de Jardinagem e Paisagismo consultada, há seis itens descritos, mas a tabela apresenta 4,5 itens para o nível I e nove para o nível II. A captura do projeto registrou quatro e nove. Trata-se de divergência a esclarecer junto à UEB antes de determinar automaticamente a conquista dessa ficha. [Ficha oficial](https://www.escoteiros.org.br/especialidades/jardinagem-e-paisagismo-atualizado/)

## 5. Transição e preservação das conquistas

Segundo as [orientações da UEB para as unidades](https://www.escoteiros.org.br/wp-content/uploads/2026/02/Orientacoes_para_a_transicao_do_programa_educativo_nas_UELs.pdf), entre setembro de 2025 e 30 de junho de 2027 a unidade pode organizar a adoção do programa atualizado; durante a transição, jovens de uma mesma seção podem estar em programas diferentes. Após a migração do Paxtu oficial, sua versão anterior permanece para consulta, sem novos registros. A UEB informa que as conquistas anteriores permanecem válidas e que os dados históricos são preservados nos seus sistemas.

Para o Ramo Lobinho, a [ferramenta de equivalência](https://www.escoteiros.org.br/wp-content/uploads/2026/02/Equivalencia_ramo_lobinho.pdf) prevê, na migração, nível antigo 1 para nível atualizado 1 e níveis antigos 2 ou 3 para nível atualizado 2. Também prevê que a criança continue usando o distintivo de uma especialidade descontinuada até sua saída do ramo. A relação com ações educativas exige análise; não é substituição automática. Não generalizar regras específicas de Lobinho aos demais ramos sem fonte correspondente.

O tratamento de uma ficha antiga ainda não concluída após a migração não foi resolvido nesta pesquisa. Consultar a diretoria da unidade e a UEB para o caso concreto, inclusive sobre registro e equivalência.

## 6. Situação no Paxtu AutoPlanner

- A base local `src/data/generated/especialidades_guia.json` contém 274 especialidades e 2.741 requisitos atribuídos ao guia de 2024. Sua existência preserva dados de catálogo, não comprova preservação dos registros pessoais em outros sistemas.
- A enciclopédia no código-fonte importa `UPDATED_ESPECIALIDADES_GUIA`, baseado em `src/data/generated/especialidades_ueb_2026.ts`. A interface publicada e todas as rotas de acesso ao catálogo antigo não foram testadas nesta pesquisa.
- O Paxtu oficial da UEB e o Paxtu AutoPlanner são sistemas distintos. Não presumir sincronização, migração ou reconhecimento oficial a partir da presença de uma ficha no AutoPlanner.

## 7. Próximas verificações

1. Conferir os 274 títulos da base estruturada com o índice e as páginas do guia de 2024.
2. Comparar individualmente os 134 títulos sem correspondência exata e registrar evidência para eventual manutenção, renomeação, integração ou ausência; deixar dúvidas explícitas.
3. Conferir requisitos e níveis atuais contra as fichas oficiais, começando pela divergência de Jardinagem e Paisagismo.
4. Verificar na interface efetivamente publicada se e como o catálogo anterior pode ser consultado, distinguindo-o do programa atualizado e preservando dados pessoais.
5. Confirmar com a UEB a situação de especialidades antigas em andamento após a migração e a eventual concessão repetida de uma ficha ampla.

Revisar este roteiro quando a UEB alterar suas fichas, orientar a transição ou corrigir a divergência de níveis. Os resultados são uma fotografia da pesquisa, não uma homologação do aplicativo.
