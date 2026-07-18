
import { Specialty, AxisType } from '../types';

export const SP_SAUDE: Specialty[] = [
  {
    id: 'educacao-alimentar',
    title: 'Educação Alimentar e Nutricional',
    axis: AxisType.HEALTH,
    branch: 'senior_pioneiro',
    description: 'Observar como escolhas alimentares impactam o corpo e o planeta, aprendendo a tomar decisões conscientes.',
    topics: ['Princípios da alimentação saudável', 'Leitura de rótulos', 'Cultura alimentar', 'Sazonalidade', 'Segurança alimentar'],
    steps: {
      know: [
        'Participar de oficinas, cursos ou palestras sobre nutrição.',
        'Visitar feiras livres e mercados locais.',
        'Pesquisar sobre o Guia Alimentar para a População Brasileira.',
        'Observar seus próprios hábitos alimentares.',
        'Conversar com pessoas de diferentes culturas ou restrições.'
      ],
      do: [
        'Elaborar e executar um projeto gastronômico.',
        'Organizar uma oficina culinária saudável.',
        'Criar um guia ou conteúdo ilustrado sobre alimentação.',
        'Desenvolver uma campanha de conscientização.',
        'Planejar um cardápio pessoal de melhoria.'
      ],
      share: [
        'Divulgar aprendizados e incentivar hábitos saudáveis.',
        'Apresentar receitas e dicas para a seção.',
        'Conduzir uma conversa sobre alimentação saudável.',
        'Inspirar amigos e familiares.'
      ]
    }
  },
  {
    id: 'esportes',
    title: 'Esportes',
    axis: AxisType.HEALTH,
    branch: 'senior_pioneiro',
    description: 'Usar o esporte como ferramenta de desenvolvimento, praticando modalidades e compreendendo seus benefícios.',
    topics: ['Modalidades individuais/coletivas', 'Esportes inclusivos', 'Prevenção de lesões', 'Valores do esporte'],
    steps: {
      know: [
        'Participar de clínica, treino ou aula experimental.',
        'Realizar entrevistas com atletas ou treinadores.',
        'Observar a prática esportiva em diferentes contextos.',
        'Validar experiências anteriores.',
        'Pesquisar regras e curiosidades.'
      ],
      do: [
        'Estabelecer e registrar uma rotina esportiva pessoal.',
        'Organizar ou participar ativamente de um campeonato.',
        'Promover oficinas ou treinos abertos.',
        'Criar um guia ou vídeo sobre uma modalidade.',
        'Planejar uma atividade que integre esporte e lazer.'
      ],
      share: [
        'Transformar experiência em inspiração para outros.',
        'Apresentar trajetória esportiva.',
        'Produzir conteúdo digital com dicas.',
        'Conduzir aula ou treino técnico.'
      ]
    }
  },
  {
    id: 'hobbies',
    title: 'Hobbies e Lazer',
    axis: AxisType.HEALTH,
    branch: 'senior_pioneiro',
    description: 'Reconhecer o lazer como direito e forma de autocuidado, explorando atividades que geram prazer e criatividade.',
    topics: ['Hobbies criativos', 'Atividades culturais', 'Colecionismo', 'Passatempos investigativos', 'Lazer ativo'],
    steps: {
      know: [
        'Investigar como hobbies impactam positivamente a saúde.',
        'Conversar com pessoas que têm hobbies marcantes.',
        'Participar de oficinas, feiras ou convenções.',
        'Pesquisar sobre o papel do lazer como direito humano.',
        'Investigar comunidades ou grupos ligados ao hobby.'
      ],
      do: [
        'Desenvolver ou aprofundar-se em um hobby com objetivo.',
        'Organizar um encontro de talentos ou clube temático.',
        'Criar um grupo de estudo ou prática.',
        'Desenvolver conteúdo (vídeo, blog) sobre o hobby.',
        'Incentivar outros jovens a descobrirem interesses.'
      ],
      share: [
        'Apresentar o hobby e seus aprendizados.',
        'Produzir material que ajude outros a começarem.',
        'Conduzir uma atividade prática.',
        'Criar uma exposição ou roda de conversa.'
      ]
    }
  },
  {
    id: 'saude',
    title: 'Saúde',
    axis: AxisType.HEALTH,
    branch: 'senior_pioneiro',
    description: 'Compreender como o corpo funciona e o que fazer para manter a saúde em equilíbrio e prevenir doenças.',
    topics: ['Funcionamento do corpo', 'Hábitos saudáveis', 'Doenças comuns', 'Primeiros socorros', 'Promoção da saúde'],
    steps: {
      know: [
        'Participar de palestra ou roda de conversa sobre saúde.',
        'Pesquisar sobre os principais indicadores de saúde.',
        'Realizar entrevistas com agentes de saúde.',
        'Visitar uma Unidade Básica de Saúde (UBS).',
        'Observar medidas de prevenção e higiene.'
      ],
      do: [
        'Promover uma campanha educativa sobre higiene ou vacinação.',
        'Organizar uma ação prática com foco em saúde (mutirão).',
        'Desenvolver materiais de conscientização.',
        'Organizar um workshop de primeiros socorros.',
        'Criar um plano pessoal de autocuidado.'
      ],
      share: [
        'Ajudar outras pessoas a cuidarem da própria saúde.',
        'Apresentar resultados da ação.',
        'Conduzir roda de conversa sobre cuidados básicos.',
        'Produzir e divulgar conteúdo informativo.'
      ]
    }
  },
  {
    id: 'saude-mental',
    title: 'Saúde Mental e Bem-estar Emocional',
    axis: AxisType.HEALTH,
    branch: 'senior_pioneiro',
    description: 'Conhecer melhor suas emoções, praticar autocuidado e compreender a importância da empatia.',
    topics: ['Autoconhecimento', 'Autocuidado emocional', 'Regulação emocional', 'Redes de apoio', 'Desmistificação'],
    steps: {
      know: [
        'Participar de rodas de conversa ou oficinas sobre saúde mental.',
        'Realizar entrevistas com psicólogos ou terapeutas.',
        'Pesquisar sobre os principais transtornos que afetam jovens.',
        'Observar como as emoções influenciam seu cotidiano.',
        'Conhecer iniciativas de promoção de bem-estar.'
      ],
      do: [
        'Criar uma campanha de valorização da saúde mental.',
        'Organizar uma roda de conversa ou espaço de escuta.',
        'Produzir conteúdos (vídeo, guia, podcast) sobre autocuidado.',
        'Criar uma playlist ou kit de descompressão.',
        'Planejar uma rotina mais equilibrada.'
      ],
      share: [
        'Ajudar a construir uma cultura de cuidado e acolhimento.',
        'Apresentar aprendizados à seção.',
        'Conduzir, com apoio de especialista, uma atividade leve.',
        'Produzir material replicável (zine, infográfico).'
      ]
    }
  },
  {
    id: 'saude-sexual',
    title: 'Saúde Sexual e Reprodutiva',
    axis: AxisType.HEALTH,
    branch: 'senior_pioneiro',
    description: 'Abordar a sexualidade com respeito e cuidado, compreendendo emoções, consentimento e prevenção.',
    topics: ['Autoconhecimento corporal', 'Sexualidade e afeto', 'Consentimento', 'Prevenção', 'Acesso a serviços'],
    steps: {
      know: [
        'Participar de uma roda de conversa ou oficina.',
        'Pesquisar materiais educativos confiáveis.',
        'Visitar uma unidade básica de saúde.',
        'Pesquisar sobre direitos sexuais e reprodutivos.',
        'Validar conhecimentos com examinador.'
      ],
      do: [
        'Produzir conteúdo educativo com linguagem clara.',
        'Conduzir, com apoio, uma roda de conversa.',
        'Criar um mural ou guia simples.',
        'Organizar uma campanha contra o preconceito.',
        'Participar ou apoiar campanhas comunitárias.'
      ],
      share: [
        'Incentivar o diálogo aberto e seguro.',
        'Apresentar resultados da ação.',
        'Produzir conteúdos educativos.',
        'Conduzir, com apoio, uma atividade educativa.'
      ]
    }
  }
];
