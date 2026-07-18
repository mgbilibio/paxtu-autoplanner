
import { Specialty, AxisType } from '../types';

export const SP_HABILIDADES: Specialty[] = [
  {
    id: 'comunicacoes',
    title: 'Comunicações',
    axis: AxisType.LIFE_SKILLS,
    branch: 'senior_pioneiro',
    description: 'Explorar diferentes formas de expressão, tais como a verbal, visual, digital e artística, e compreender como a comunicação influencia relações.',
    topics: ['Comunicação interpessoal', 'Oratória', 'Comunicação digital', 'Mídia', 'Comunicação visual', 'Expressão criativa'],
    steps: {
      know: [
        'Participar de oficinas, cursos ou mentorias sobre comunicação, oratória ou mídias digitais.',
        'Pesquisar técnicas e ferramentas utilizadas em processos comunicacionais.',
        'Analisar campanhas, peças publicitárias ou discursos identificando estratégias.',
        'Entrevistar profissionais da área (jornalistas, designers, criadores).'
      ],
      do: [
        'Conduzir uma apresentação pública, roda de conversa ou debate.',
        'Criar e publicar um podcast, vídeo, blog, zine ou canal temático.',
        'Desenvolver uma campanha de combate à desinformação.',
        'Criar uma exposição visual (fotografia, design, audiovisual).',
        'Planejar estratégia de comunicação para a UEL.'
      ],
      share: [
        'Apresentar seu projeto para a seção, escola ou comunidade.',
        'Produzir e divulgar conteúdos em diferentes formatos.',
        'Conduzir uma oficina sobre expressão e comunicação.',
        'Apoiar outros jovens a desenvolverem suas próprias iniciativas.'
      ]
    }
  },
  {
    id: 'educacao',
    title: 'Educação',
    axis: AxisType.LIFE_SKILLS,
    branch: 'senior_pioneiro',
    description: 'Compreender a educação como força capaz de transformar realidades e explorar maneiras de aprender e ensinar.',
    topics: ['Educação entre pares', 'Metodologias', 'Educação inclusiva', 'Facilitação', 'Aprendizagem ao longo da vida'],
    steps: {
      know: [
        'Participar de oficinas ou seminários sobre educação e metodologias.',
        'Observar educadores em diferentes contextos (escola, projetos sociais).',
        'Pesquisar sobre fundamentos de educação libertadora e inclusiva.',
        'Entrevistar professores, pedagogos ou educadores populares.',
        'Analisar o próprio processo de aprendizagem.'
      ],
      do: [
        'Conduzir uma oficina, minicurso ou vivência para jovens.',
        'Criar um recurso educativo (jogo, guia visual, vídeo).',
        'Planejar um projeto de tutoria ou troca de saberes.',
        'Desenvolver uma atividade educativa em escola ou projeto social.',
        'Facilitar um processo de escuta ativa e diálogo.'
      ],
      share: [
        'Apresentar sua experiência para a seção ou comunidade.',
        'Produzir materiais explicativos sobre o papel do educador.',
        'Conduzir uma reflexão sobre formas de aprender e ensinar.',
        'Acompanhar colegas em suas próprias ações educativas.'
      ]
    }
  },
  {
    id: 'empreendedorismo',
    title: 'Empreendedorismo e Negócios',
    axis: AxisType.LIFE_SKILLS,
    branch: 'senior_pioneiro',
    description: 'Explorar potencial criativo, experimentar, testar e buscar um impacto positivo mobilizando recursos.',
    topics: ['Empreendedorismo criativo', 'Modelagem (Canvas)', 'Empreendedorismo social', 'Prototipagem', 'Educação financeira'],
    steps: {
      know: [
        'Participar de oficinas, hackathons ou feiras de empreendedores.',
        'Pesquisar modelos de negócios reais e startups.',
        'Entrevistar empreendedores e entender suas trajetórias.',
        'Estudar ferramentas como Canvas, SWOT e Design Thinking.',
        'Observar o contexto local para identificar oportunidades.'
      ],
      do: [
        'Criar e executar um projeto, produto ou serviço.',
        'Desenvolver um modelo de negócio completo (viabilidade, marketing).',
        'Realizar uma feira ou simulação de vendas.',
        'Desenvolver um protótipo simples (MVP) e testar.',
        'Criar uma solução para um desafio real da comunidade.'
      ],
      share: [
        'Apresentar seu projeto ou protótipo para a seção.',
        'Produzir conteúdo sobre o processo empreendedor.',
        'Conduzir oficina de prototipagem ou planejamento.',
        'Apoiar colegas na validação de ideias.'
      ]
    }
  },
  {
    id: 'financas',
    title: 'Finanças e Economia',
    axis: AxisType.LIFE_SKILLS,
    branch: 'senior_pioneiro',
    description: 'Aprender a usar o dinheiro de maneira consciente, planejar metas e tomar decisões responsáveis.',
    topics: ['Finanças pessoais', 'Consumo consciente', 'Economia solidária', 'Investimentos', 'Economia circular'],
    steps: {
      know: [
        'Participar de cursos ou palestras sobre finanças.',
        'Pesquisar ferramentas de organização financeira (apps, planilhas).',
        'Observar hábitos de consumo pessoal e familiar.',
        'Estudar modelos alternativos de economia (solidária, circular).',
        'Entrevistar profissionais das áreas financeira ou bancária.'
      ],
      do: [
        'Criar um orçamento pessoal ou coletivo com monitoramento.',
        'Conduzir uma campanha educativa sobre consumo consciente.',
        'Organizar uma feira de trocas ou economia solidária.',
        'Criar um plano financeiro para um projeto escoteiro.',
        'Elaborar um plano de redução de gastos.'
      ],
      share: [
        'Apresentar seu plano ou análise financeira para a seção.',
        'Produzir conteúdos didáticos sobre finanças pessoais.',
        'Conduzir uma prática de organização financeira.',
        'Estimular diálogos sobre desigualdade e justiça econômica.'
      ]
    }
  },
  {
    id: 'gastronomia',
    title: 'Gastronomia',
    axis: AxisType.LIFE_SKILLS,
    branch: 'senior_pioneiro',
    description: 'Cozinhar vai além de preparar alimentos: é expressar cultura e aproximar pessoas.',
    topics: ['Cultura alimentar', 'Nutrição', 'Higiene', 'Técnicas culinárias', 'Gastronomia sustentável'],
    steps: {
      know: [
        'Participar de oficinas, cursos livres ou aulas-show.',
        'Pesquisar tradição culinária e analisar seu papel na cultura.',
        'Estudar nutrição básica e grupos alimentares.',
        'Conversar com profissionais da área (chefs, nutricionistas).',
        'Investigar práticas de gastronomia sustentável.'
      ],
      do: [
        'Desenvolver uma receita autoral ou reinterpretar um prato.',
        'Criar uma ação educativa sobre alimentação saudável.',
        'Montar um cardápio equilibrado para um acampamento.',
        'Organizar uma vivência culinária temática.',
        'Projetar uma horta doméstica vinculada a um plano culinário.'
      ],
      share: [
        'Apresentar seus saberes e reflexões para a seção.',
        'Produzir conteúdos educativos (vídeos, receitas).',
        'Realizar uma oficina prática de culinária.',
        'Organizar um "Festival Gastronômico".'
      ]
    }
  },
  {
    id: 'idiomas',
    title: 'Idiomas',
    axis: AxisType.LIFE_SKILLS,
    branch: 'senior_pioneiro',
    description: 'Aprender um novo idioma é abrir portas para o mundo e ampliar horizontes.',
    topics: ['Vocabulário e conversação', 'Comunicação intercultural', 'Línguas originárias', 'Tradução', 'Libras'],
    steps: {
      know: [
        'Participar de cursos, oficinas ou grupos de conversação.',
        'Pesquisar sobre a cultura dos povos falantes da língua.',
        'Entrevistar falantes nativos ou intercambistas.',
        'Observar o idioma em músicas, filmes e redes sociais.',
        'Investigar como o idioma se relaciona com temas globais.'
      ],
      do: [
        'Apresentar-se ou gravar vídeo em outro idioma.',
        'Criar um glossário ilustrado ou guia prático.',
        'Traduzir e adaptar uma música ou texto escoteiro.',
        'Participar de intercâmbio cultural virtual.',
        'Ministrar oficinas comunitárias de iniciação ao idioma.'
      ],
      share: [
        'Conduzir uma dinâmica ou roda de conversa em outro idioma.',
        'Criar um mural cultural ou espaço temático.',
        'Produzir conteúdo bilíngue para redes sociais.',
        'Estimular outros jovens a aprender idiomas.'
      ]
    }
  },
  {
    id: 'lideranca',
    title: 'Liderança e Gestão',
    axis: AxisType.LIFE_SKILLS,
    branch: 'senior_pioneiro',
    description: 'Desenvolver potencial como líder, facilitar processos e mediar conflitos.',
    topics: ['Estilos de liderança', 'Trabalho em equipe', 'Gestão de projetos', 'Tomada de decisão', 'Liderança inclusiva'],
    steps: {
      know: [
        'Participar de oficinas e rodas de conversa sobre liderança.',
        'Realizar entrevistas com líderes de diferentes áreas.',
        'Estudar experiências de liderança juvenil em movimentos sociais.',
        'Pesquisar diferentes estilos de liderança.',
        'Mapear suas próprias competências (autodonhecimento).'
      ],
      do: [
        'Liderar um projeto, equipe ou atividade escoteira.',
        'Criar uma normativa ou plano de ação para um grupo.',
        'Planejar e conduzir uma reunião ou assembleia.',
        'Elaborar um plano pessoal de desenvolvimento em liderança.',
        'Aplicar ferramentas de gestão e avaliação.'
      ],
      share: [
        'Apresentar aprendizados e resultados para a seção.',
        'Facilitar um espaço de partilha sobre desafios da liderança.',
        'Produzir conteúdos (guia, vídeo) sobre liderança juvenil.',
        'Organizar uma roda de mentoria entre jovens.'
      ]
    }
  },
  {
    id: 'tecnologia',
    title: 'Tecnologia',
    axis: AxisType.LIFE_SKILLS,
    branch: 'senior_pioneiro',
    description: 'Criar soluções e compreender o mundo interconectado, explorando ferramentas digitais e eletrônicas.',
    topics: ['Programação', 'Robótica', 'Cidadania digital', 'Segurança cibernética', 'Inteligência Artificial'],
    steps: {
      know: [
        'Participar de oficinas, hackathons ou cursos de tecnologia.',
        'Entrevistar profissionais da área (programadores, analistas).',
        'Pesquisar a história e os impactos sociais da tecnologia.',
        'Testar softwares, apps ou plataformas analisando sua usabilidade.',
        'Observar e analisar hábitos de uso da tecnologia.'
      ],
      do: [
        'Criar um aplicativo, site, jogo ou bot simples.',
        'Desenvolver um projeto de automação ou robótica.',
        'Organizar uma campanha educativa sobre segurança digital.',
        'Criar um tutorial ou guia de uso responsável.',
        'Conduzir um mapeamento de inclusão digital na comunidade.'
      ],
      share: [
        'Apresentar seu projeto ou protótipo para a seção.',
        'Produzir conteúdo acessível sobre segurança e cidadania digital.',
        'Facilitar uma roda de conversa ou minicurso.',
        'Ajudar outros jovens a criar projetos tecnológicos.'
      ]
    }
  },
  {
    id: 'viagens',
    title: 'Viagens',
    axis: AxisType.LIFE_SKILLS,
    branch: 'senior_pioneiro',
    description: 'Viajar é aprender com o mundo. Planejar viagens e viver cada experiência com entusiasmo.',
    topics: ['Planejamento de roteiros', 'Turismo responsável', 'Viagens em grupo', 'Grandes eventos', 'Intercâmbios'],
    steps: {
      know: [
        'Pesquisar destinos, culturas e práticas responsáveis.',
        'Assistir documentários ou ler relatos de viajantes.',
        'Participar de rodas de conversa com quem já viajou.',
        'Planejar uma viagem com roteiro, orçamento e cronograma.',
        'Estudar noções básicas de geografia cultural e localização.'
      ],
      do: [
        'Realizar uma viagem ou expedição local.',
        'Organizar ou participar de uma atividade de preparação para eventos.',
        'Elaborar um roteiro de viagem acessível e responsável.',
        'Criar um diário de bordo ou blog narrando a experiência.',
        'Desenvolver uma proposta de intercâmbio cultural.'
      ],
      share: [
        'Apresentar viagem e aprendizados para a seção.',
        'Conduzir uma oficina sobre como planejar viagens.',
        'Criar um mapa interativo ou guia de viagem escoteira.',
        'Disponibilizar um kit ou checklist de viagem.'
      ]
    }
  }
];
