
import { Specialty, AxisType } from '../types';

export const INSIGNIAS_DATA: Specialty[] = [
  // --- LOBINHO ---
  {
    id: 'insignia-boa-acao-le',
    title: 'Insígnia da Boa Ação',
    axis: AxisType.LOBINHO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Para quem gosta de cuidar das pessoas, da rua e da escola.',
    requirements: [
      'Conhecer problemas sociais da rua ou bairro e conversar sobre como contribuir.',
      'Conhecer instituições que realizam ações assistenciais.',
      'Participar de Mutirão Nacional Escoteiro de Ação Comunitária.',
      'Perceber perigos em excursões e ajudar na segurança.',
      'Participar de três boas ações coletivas.'
    ]
  },
  {
    id: 'insignia-cone-sul-le',
    title: 'Insígnia do Cone Sul (Lobinho)',
    axis: AxisType.LOBINHO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Descobrindo vizinhos e fazendo amigos.',
    requirements: [
      'GEOGRAFIA: Indicar no mapa mundi onde estão localizados os países do Cone Sul e reconhecer suas bandeiras.',
      'GEOGRAFIA: Pesquisar a história de algo importante que tenha sido inventado em um dos países.',
      'CULTURA: Degustar pelo menos um prato típico de outro país do Cone Sul.',
      'CULTURA: Conhecer uma lenda, conto ou dança típica.',
      'LINGUAGEM: Assistir uma animação ou filme nacional de outro país do Cone Sul.',
      'ESCOTISMO: Descobrir quais distintivos poderia conquistar se fosse de outro país do Cone Sul.',
      'ESCOTISMO: Ensinar a Alcateia a cantar uma canção escoteira de outro país.'
    ]
  },
   {
    id: 'insignia-aprender-le',
    title: 'Insígnia do Aprender (Lobinho)',
    axis: AxisType.LOBINHO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Aprender é uma aventura.',
    requirements: [
      'Organizar o espaço de estudo adequadamente.',
      'Ter o material escolar devidamente organizado.',
      'Destinar o tempo adequado para seu estudo e tarefas.',
      'Participar de pelo menos uma edição do Projeto Educação Escoteira.',
      'Participar de pelo menos duas atividades especiais em sua escola.',
      'Apoiar um colega de classe em alguma tarefa ou conteúdo.',
      'Conversar com seus pais e Akela sobre sua participação na escola.'
    ]
  },
  {
    id: 'insignia-lusofonia-le',
    title: 'Insígnia da Lusofonia (Lobinho)',
    axis: AxisType.LOBINHO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Viajando pelo mundo com a língua portuguesa.',
    requirements: [
      'GEOGRAFIA: Pesquisar temperos, especiarias, fauna e flora típicas dos países lusófonos.',
      'GEOGRAFIA: Indicar no mapa mundi onde estão localizados os países e reconhecer bandeiras.',
      'CULTURA: Visitar exposições ou feiras culturais referentes a outros países lusófonos.',
      'CULTURA: Degustar uma refeição típica.',
      'CULTURA: Assistir um espetáculo (circo, show, teatro) originário de outro país lusófono.',
      'LINGUAGEM: Entrevistar alguém que tenha morado ou esteja morando em um país lusófono.',
      'LINGUAGEM: Enviar e receber correspondência (e-mail/carta) com um lobinho de outro país.',
      'ESCOTISMO: Descobrir quais distintivos poderia conquistar em outro país lusófono.',
      'ESCOTISMO: Conhecer o símbolo da CPLP e das Associações Escoteiras.'
    ]
  },
  // Globais Lobinho
  {
    id: 'insignia-campeoes-natureza-le',
    title: 'Campeões da Natureza (Lobinho)',
    axis: AxisType.LOBINHO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Descobrir mais sobre a natureza e biodiversidade com sua Alcateia.',
    requirements: [
      'CONHECER: Aprenda sobre o ambiente ao seu redor e os principais problemas ambientais ligados aos hábitos de vida.',
      'COOPERAR: Identifique as necessidades e desafios em sua comunidade local e trabalhe com a Alcateia.',
      'ATUAR: Realize boas ações práticas para a resolução de um problema específico relacionado ao consumo ou biodiversidade.',
      'AVALIAÇÃO: Reflita com o Velho Lobo sobre o que aprendeu e como se sentiu.'
    ]
  },
  {
    id: 'insignia-red-rec-reut-le',
    title: 'Reduzir, Reciclar, Reutilizar (Lobinho)',
    axis: AxisType.LOBINHO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Combatendo a poluição e cuidando do planeta.',
    requirements: [
      'CONHECER: Aprenda sobre ecossistemas aquáticos e terrestres e como prevenir a poluição.',
      'COOPERAR: Identifique necessidades locais e trabalhe com seus companheiros para encontrar soluções.',
      'ATUAR: Realize ações práticas para a limpeza do nosso planeta junto com sua Alcateia.',
      'AVALIAÇÃO: Identifique novas habilidades e conhecimentos adquiridos.'
    ]
  },
  {
    id: 'insignia-energia-solar-le',
    title: 'Escoteiros pela Energia Solar (Lobinho)',
    axis: AxisType.LOBINHO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Descobrindo a força do Sol.',
    requirements: [
      'CONHECER: Aprenda um pouco sobre energia solar e outros tipos de energia renovável.',
      'COOPERAR: Identifique necessidades e desafios em sua comunidade local sobre o uso de energia.',
      'ATUAR: Realize ações práticas para a resolução de um problema específico relacionado a energia solar.',
      'AVALIAÇÃO: Converse com o escotista sobre os benefícios da energia limpa.'
    ]
  },

  // --- ESCOTEIRO ---
  {
    id: 'insignia-aviador-esc',
    title: 'Insígnia de Aviador',
    axis: AxisType.ESCOTEIRO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Símbolo da Modalidade do Ar.',
    requirements: [
      'Explicar diferenças entre aeródromo, aeroporto e heliporto.',
      'Preencher plano de voo.',
      'Explicar FOD.',
      'Identificar áreas de risco.',
      'Visitar museu aeronáutico.',
      'Explicar influência do vento.',
      'Construir paraquedas.',
      'Construir modelo de avião.'
    ]
  },
  {
    id: 'insignia-grumete-esc',
    title: 'Insígnia de Grumete',
    axis: AxisType.ESCOTEIRO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Símbolo de quem navega por novos territórios.',
    requirements: [
      '1. Conhecimento Náutico: Visitar Museu Marinho, Feira Náutica ou Navio.',
      '1. Conhecimento Náutico: Demonstrar conhecimento sobre regras e equipamentos de segurança.',
      '1. Conhecimento Náutico: Participar de mutirão de limpeza embarcado.',
      '2. Navegação: Remar sozinho um bote ou caiaque em águas calmas.',
      '2. Navegação: Montar e manejar velas para navegação.',
      '3. Segurança e Salvamento: Nadar 50 metros sem parar.',
      '3. Segurança e Salvamento: Demonstrar posição de HUDDLE e uso de colete.',
      '4. Esportes e Exploração: Praticar ou participar de oficina de esportes náuticos (Canoagem, SUP, etc).',
      '4. Esportes e Exploração: Montar equipamento de pesca com vara e molinete.'
    ]
  },
  {
    id: 'insignia-acao-comunitaria-esc',
    title: 'Insígnia da Ação Comunitária',
    axis: AxisType.ESCOTEIRO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Ser escoteiro é estar sempre alerta para ajudar.',
    requirements: [
      'Participar, como Escoteiro, de um Mutirão Nacional Escoteiro de Ação Comunitária.',
      'Participar de um PROJETO, no Ramo Escoteiro, idealizado e concebido pela Patrulha.',
      'Conteúdo deve ser resultado de uma necessidade apresentada pela comunidade.',
      'Execução mínima de 3 meses de duração.',
      'Apresentar relatório final com todos os dados.'
    ]
  },
  {
    id: 'insignia-aprender-esc',
    title: 'Insígnia do Aprender (Escoteiro)',
    axis: AxisType.ESCOTEIRO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Crescer e aprender sempre.',
    requirements: [
      'Manter seu local e materiais de estudo organizados.',
      'Elaborar um calendário contendo as atividades escolares.',
      'Fazer anotações e resumos das aulas.',
      'Participar, como escoteiro, de pelo menos uma edição do Projeto Educação Escoteira.',
      'Preparar um cartaz ou trabalho em grupo sobre temas relevantes (bullying, etc).',
      'Preparar e aplicar para sua patrulha uma técnica escoteira relacionada a uma matéria escolar.'
    ]
  },
  {
    id: 'insignia-cone-sul-esc',
    title: 'Insígnia do Cone Sul (Escoteiro)',
    axis: AxisType.ESCOTEIRO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Viagem pela cultura vizinha.',
    requirements: [
      'GEOGRAFIA: Realizar TODAS as atividades: Indicar no mapa, pesquisar história, significado das cores das bandeiras.',
      'CULTURA: Realizar pelo menos DUAS: Degustar prato, visitar exposição, conhecer lenda, conhecer dança.',
      'LINGUAGEM: Realizar pelo menos DUAS: Assistir animação/filme, enviar correspondência, entrevistar alguém que more lá.',
      'ESCOTISMO: Realizar pelo menos DUAS: Descobrir distintivos, ensinar canção, conhecer terminologias.'
    ]
  },
  {
    id: 'insignia-lusofonia-esc',
    title: 'Insígnia da Lusofonia (Escoteiro)',
    axis: AxisType.ESCOTEIRO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Conectando culturas.',
    requirements: [
      'LINGUAGEM: Acompanhar notícias, apresentar coletânea, ler livro, entrar em contato via escrita.',
      'ESCOTISMO: Realizar DUAS: Participar de JOTA/Jamboree Lusófono, aprender canção, apresentar distintivos.',
      'CULTURA: Realizar TRÊS: Fazer artesanato, fazer jantar típico, fazer esquete de lenda, editar vídeo.',
      'GEOGRAFIA: Realizar DUAS: Organizar mural, pesquisar locais para atividades, montar quadro comparativo de clima/flora.'
    ]
  },
  // Globais Escoteiro
  {
    id: 'insignia-campeoes-natureza-esc',
    title: 'Campeões da Natureza (Escoteiro)',
    axis: AxisType.ESCOTEIRO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Aprofundando o conhecimento sobre a natureza.',
    requirements: [
      'CONHECER: Aprofunde-se em um tema escolhido (habitat, espécies, etc).',
      'COOPERAR: Trabalhe com sua patrulha para encontrar soluções sustentáveis.',
      'ATUAR: Realize um projeto prático para resolução de um problema ambiental.',
      'AVALIAÇÃO: Avalie os resultados e verifique se alcançou os objetivos.'
    ]
  },
  {
    id: 'insignia-red-rec-reut-esc',
    title: 'Reduzir, Reciclar, Reutilizar (Escoteiro)',
    axis: AxisType.ESCOTEIRO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Liderando pelo exemplo na gestão de resíduos.',
    requirements: [
      'CONHECER: Compreenda o impacto dos resíduos nos ecossistemas.',
      'COOPERAR: Identifique desafios na sua comunidade e escola.',
      'ATUAR: Organize campanhas ou eventos de limpeza e conscientização.',
      'AVALIAÇÃO: Autoavaliação sobre mudanças de hábitos.'
    ]
  },
  {
    id: 'insignia-energia-solar-esc',
    title: 'Escoteiros pela Energia Solar (Escoteiro)',
    axis: AxisType.ESCOTEIRO_INSIGNIA,
    branch: 'lobinho_escoteiro',
    description: 'Aplicando energia limpa.',
    requirements: [
      'CONHECER: Aprenda sobre aplicações da energia solar.',
      'COOPERAR: Identifique onde a energia solar poderia ser usada na sua comunidade.',
      'ATUAR: Desenvolva um projeto (ex: forno solar, carregador) ou campanha.',
      'AVALIAÇÃO: Relate bons exemplos de uso da energia solar.'
    ]
  },

  // --- SÊNIOR ---
  {
    id: 'insignia-aprender-senior',
    title: 'Insígnia do Aprender (Sênior)',
    axis: AxisType.SENIOR_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Desenvolver a capacidade para continuar aprendendo e autonomia intelectual.',
    requirements: [
      'Saber o que é um mapa mental, qual sua utilidade e desenvolver um sobre tema a escolha.',
      'Discutir com o escotista vantagens e desvantagens de diferentes métodos de pesquisa.',
      'Experimentar técnica de aprendizagem ativa (Feynman, Pomodoro, etc).',
      'Participar, como sênior, de pelo menos uma edição do Projeto Educação Escoteira.',
      'Participar de um teste vocacional ou feira de profissões.',
      'Entrevistar dois profissionais com carreiras estabelecidas.',
      'Realizar visita a instituição de ensino.',
      'Acompanhar um profissional por um turno para observar rotina.'
    ]
  },
  {
    id: 'insignia-desafio-senior',
    title: 'Insígnia do Desafio Comunitário',
    axis: AxisType.SENIOR_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Identificar necessidades reais e agir de forma consciente.',
    requirements: [
      'Participar, como Sênior, de um Mutirão Nacional Escoteiro de Ação Comunitária.',
      'Participar de um PROJETO que pode ser realizado sozinho, com patrulha ou equipe de interesse.',
      'Projeto idealizado e concebido pelo próprio jovem/patrulha.',
      'Conteúdo deve ser resultado de uma necessidade apresentada (diagnóstico).',
      'Execução mínima de 4 meses de duração.',
      'Conteúdo relacionado a uma das Prioridades do Milênio (ODS/ONU).',
      'Apresentar relatório final com todos os dados e resultados.'
    ]
  },
  {
    id: 'insignia-conesul-senior',
    title: 'Insígnia do Cone Sul (Sênior)',
    axis: AxisType.SENIOR_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Estreitamento de laços no Cone Sul. Realizar pelo menos duas opções de cada item.',
    requirements: [
      'ESCOTISMO: Participar de um JAMCAM ou atividade com escoteiros de outros países.',
      'ESCOTISMO: Participar de um JOTA-JOTI com contatos do Cone Sul.',
      'ESCOTISMO: Organizar coleção de distintivos (min 30 peças, 3 países).',
      'ESCOTISMO: Entrar em contato com escoteiro do Cone Sul e programar atividade típica.',
      'CULTURA: Participar de um evento cultural em conjunto com cidadãos do Cone Sul.',
      'CULTURA: Organizar uma refeição típica para sua seção.',
      'CULTURA: Escrever uma peça com um escoteiro de outro país e apresentá-la.',
      'CULTURA: Escolher e produzir breve relatório sobre obra cinematográfica.',
      'LINGUAGEM: Participar de um debate (pessoal/virtual) com, pelo menos, mais duas pessoas do Cone Sul.',
      'LINGUAGEM: Criar comunidade/grupo em rede social e mantê-la atualizada (4 meses).',
      'LINGUAGEM: Criar um "Jornal Mural" na sede sobre notícias do Cone Sul.',
      'LINGUAGEM: Participar de um Home-Hospitality (recebendo) e apresentar relato.',
      'GEOGRAFIA: Preparar roteiro de viagem para outro país do Cone Sul.',
      'GEOGRAFIA: Visitar (presencial/virtual) locais e fazer vídeo dos locais visitados.',
      'GEOGRAFIA: Fazer apresentação audiovisual sobre o Mercosul.',
      'GEOGRAFIA: Elaborar projeto de atividade aventureira em outro país.'
    ]
  },
  {
    id: 'insignia-lusofonia-senior',
    title: 'Insígnia da Lusofonia (Sênior)',
    axis: AxisType.SENIOR_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Reforçar laços de amizade na comunidade lusófona. Realizar duas de cada.',
    requirements: [
      'LINGUAGEM: Participar de debate via internet.',
      'LINGUAGEM: Criar comunidade em rede social e mantê-la (4 meses).',
      'LINGUAGEM: Criar Jornal Mural na sede.',
      'LINGUAGEM: Contatar radioamadores da CPLP.',
      'LINGUAGEM: Participar de Home-Hospitality (recebendo).',
      'ESCOTISMO: Participar de Encontro Lusófono em atividade internacional.',
      'ESCOTISMO: Organizar coleção de 50 peças (distintivos lusófonos).',
      'ESCOTISMO: Entrar em contato com escoteiro lusófono e programar atividade.',
      'ESCOTISMO: Produzir vídeo sobre como funciona o Escotismo em um país lusófono.',
      'CULTURA: Participar de evento cultural em conjunto com cidadãos lusófonos.',
      'CULTURA: Organizar jantar típico com cardápio e ambientação.',
      'CULTURA: Escrever e apresentar peça teatral com cenário.',
      'CULTURA: Ler e compartilhar conto ou fábula popular.',
      'GEOGRAFIA: Preparar roteiro de viagem para outro país lusófono.',
      'GEOGRAFIA: Visitar outro país lusófono (virtual/real) e apresentar vídeo.',
      'GEOGRAFIA: Elaborar projeto de atividade aventureira.',
      'GEOGRAFIA: Montar quiz geográfico para a patrulha.'
    ]
  },
  {
    id: 'insignia-aeronauta-senior',
    title: 'Insígnia de Aeronauta',
    axis: AxisType.SENIOR_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Aprofundar a aventura de explorar o céu. Realizar os itens obrigatórios de cada seção.',
    requirements: [
      'NAVEGAÇÃO: Demonstrar exemplos práticos de navegação aérea (visual, estimada, rádio, satélite).',
      'NAVEGAÇÃO: Explicar organização do espaço aéreo brasileiro (CINDACTA).',
      'NAVEGAÇÃO: Planejar uma rota fictícia considerando vento e altitude.',
      'NAVEGAÇÃO: Comparar cartas aeronáuticas.',
      'NAVEGAÇÃO: Participar de simulação de controle de tráfego.',
      'NAVEGAÇÃO: Identificar aeronaves em operação no aeródromo.',
      'SEGURANÇA: Verificar nível de óleo e drenar combustível (supervisão).',
      'SEGURANÇA: Simular procedimentos de emergência em solo.',
      'SEGURANÇA: Explicar riscos em hangares e pistas.',
      'CULTURA: Visitar museu aeronáutico.',
      'CULTURA: Entrevistar profissional da aviação.',
      'CULTURA: Pesquisar sobre Santos Dumont e uma personalidade feminina.',
      'CULTURA: Participar de evento aeronáutico.',
      'METEOROLOGIA: Interpretar boletins METAR e TAF.',
      'METEOROLOGIA: Identificar nuvens e fenômenos perigosos (CB, Wind Shear).',
      'METEOROLOGIA: Construir instrumentos meteorológicos caseiros.',
      'PRÁTICA: Montar e operar aeromodelo planador.',
      'PRÁTICA: Realizar operação de drone com segurança.',
      'PRÁTICA: Construir foguete PET.'
    ]
  },
  {
    id: 'insignia-naval-senior',
    title: 'Insígnia Naval',
    axis: AxisType.SENIOR_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Descobrir o universo das águas. Realizar atividades das seções.',
    requirements: [
      'CONHECIMENTO (min 3): Visitar Diretoria de Hidrografia, Museu Marinho ou Farol; Demonstrar conhecimento de regras e cartas; Conhecer procedimentos de sobrevivência; Realizar projeto ambiental; Colaborar em tarefas de apoio.',
      'NAVEGAÇÃO (min 1): Navegação a remo (patronar e compor guarnição); Navegação à vela (içar, manobras, 10h de vela).',
      'SEGURANÇA (min 4): Nadar 100 metros; Conhecimento de pirotécnicos; Demonstrar posição HUDDLE; Desvirar pequeno barco; Manobra de subida; Curva de Williamson; Resgate aquático; Primeiros socorros (hipotermia, afogamento); Balsa salva-vidas.',
      'ESPORTES (min 2): Praticar esporte aquático (Windsurf, Canoagem, Mergulho, SUP); Participar de atividades embarcadas; Pesca (arremesso e iscas); Travessia náutica.'
    ]
  },

  // --- PIONEIRO ---
  {
    id: 'insignia-aprender-pioneiro',
    title: 'Insígnia do Aprender (Pioneiro)',
    axis: AxisType.PIONEER_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Avançar de forma contínua no próprio desenvolvimento.',
    requirements: [
      'Participar de cursos ou seminários relevantes para vida acadêmica/profissional.',
      'Montar currículo profissional relacionando aptidões.',
      'Redigir trabalho acadêmico com normas ABNT.',
      'Participar de edição do Educação Escoteira.',
      'Organizar e conduzir debate no Clã sobre desafios da educação.',
      'Propor e executar atividade educativa para escola pública (3h).',
      'Realizar reflexão no Plano de Desenvolvimento Pessoal (Projeto de Vida).'
    ]
  },
  {
    id: 'insignia-conesul-pioneiro',
    title: 'Insígnia do Cone Sul (Pioneiro)',
    axis: AxisType.PIONEER_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Promover conhecimento e intercâmbio. Escolher uma das opções.',
    requirements: [
      'OPÇÃO 1: Elaborar e executar um projeto de viagem para outro país do Cone Sul (Roteiro, Transporte, Documentos, Segurança, Hospedagem, Contatos).',
      'OPÇÃO 2: Elaborar e executar um projeto comunitário que atenda um ODS em parceria com um pioneiro de outro país do Cone Sul (Diagnóstico, Planejamento, Execução, Avaliação).'
    ]
  },
  {
    id: 'insignia-lusofonia-pioneiro',
    title: 'Insígnia da Lusofonia (Pioneiro)',
    axis: AxisType.PIONEER_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Reforçar laços de amizade. Escolher uma das opções.',
    requirements: [
      'OPÇÃO 1: Elaborar e executar um projeto de viagem para outro país lusófono (Roteiro, Transporte, Documentos, Segurança, Hospedagem, Contatos).',
      'OPÇÃO 2: Elaborar e executar um projeto comunitário que atenda um ODS em parceria com um pioneiro lusófono (Diagnóstico, Planejamento, Execução, Avaliação).'
    ]
  },

  // --- INSÍGNIAS GLOBAIS (GENÉRICAS E SÊNIOR/PIONEIRO) ---
  {
    id: 'tribo-terra',
    title: 'Tribo da Terra',
    axis: AxisType.GLOBAL_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Comunidade mundial de proteção ao planeta.',
    requirements: [
      '1. Escolher um dos três caminhos (Campeões da Natureza, Energia Solar ou Reduzir/Reciclar).',
      '2. Cadastrar-se na plataforma Earth Tribe.',
      '3. Realizar as atividades seguindo a metodologia: CONHECER, COOPERAR e ATUAR.',
      '4. Tornar-se um membro ativo na proteção do planeta.'
    ]
  },
  {
    id: 'campeoes-natureza',
    title: 'Campeões da Natureza (Sênior/Pioneiro)',
    axis: AxisType.GLOBAL_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Descobrir mais sobre a natureza e biodiversidade.',
    steps: {
      know: ['Aprenda sobre o ambiente ao seu redor e os principais problemas ambientais ligados aos hábitos de consumo.'],
      do: ['Identifique necessidades locais e trabalhe com seus companheiros.', 'Realize ações práticas para a resolução de um problema específico.'],
      share: ['Avalie os resultados e compartilhe na plataforma global.']
    }
  },
  {
    id: 'reciclar',
    title: 'Reduzir, Reciclar, Reutilizar (Sênior/Pioneiro)',
    axis: AxisType.GLOBAL_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Planeta limpo e consumo consciente.',
    steps: {
      know: ['Aprenda sobre ecossistemas e como prevenir a poluição.'],
      do: ['Identifique desafios na comunidade.', 'Realize projetos para reduzir o impacto do lixo.'],
      share: ['Avalie suas novas habilidades e o impacto gerado.']
    }
  },
  {
    id: 'energia-solar',
    title: 'Escoteiros pela Energia Solar (Sênior/Pioneiro)',
    axis: AxisType.GLOBAL_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Energias renováveis e eficiência.',
    steps: {
      know: ['Aprenda sobre energia solar e renovável.'],
      do: ['Identifique necessidades de energia na comunidade.', 'Realize ações práticas usando energia solar (ex: carregadores, luzes).'],
      share: ['Dissemine o conhecimento sobre energia limpa.']
    }
  },
  {
    id: 'mensageiros-paz',
    title: 'Mensageiros da Paz',
    axis: AxisType.GLOBAL_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Inspirar jovens a agir por um mundo melhor.',
    requirements: [
      '1. Identifique um problema na sua comunidade.',
      '2. Escolha onde e como atuar.',
      '3. Planeje bem seu projeto (O que, com quem, materiais).',
      '4. Mãos à obra: execute a ação.',
      '5. Avalie e pense no futuro (O que funcionou?).',
      '6. Compartilhe e inspire: cadastre no sistema mundial.'
    ]
  },
  {
    id: 'inovadores',
    title: 'Inovadores de Impacto',
    axis: AxisType.GLOBAL_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Inovar e transformar usando Design Thinking.',
    requirements: [
      '1. Escolha como vai participar (sozinho ou equipe).',
      '2. Converse com os adultos da seção.',
      '3. Conheça os passos da metodologia (Design Thinking).',
      '4. Defina o local de impacto e o ODS.',
      '5. Coloque a mão na massa seguindo as etapas do guia.',
      '6. Compartilhe seu resultado na plataforma.'
    ]
  },
  {
    id: 'escoteiros-mundo',
    title: 'Escoteiros do Mundo',
    axis: AxisType.GLOBAL_INSIGNIA,
    branch: 'senior_pioneiro',
    description: 'Desafio global para jovens de 15 a 22 anos.',
    requirements: [
      '1. Exploração do Escoteiro do Mundo (21 horas de descoberta de um tema global).',
      '2. Serviço Voluntário do Escoteiro do Mundo (80 horas de projeto prático).',
      '3. Relatório e avaliação do impacto pessoal e comunitário.',
      '4. Cadastro da atividade para solicitar o reconhecimento.'
    ]
  }
];
