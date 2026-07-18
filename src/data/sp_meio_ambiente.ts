
import { Specialty, AxisType } from '../types';

export const SP_MEIO_AMBIENTE: Specialty[] = [
  {
    id: 'agricultura-sustentavel',
    title: 'Agricultura Sustentável',
    axis: AxisType.ENVIRONMENT,
    branch: 'senior_pioneiro',
    description: 'Aprender a produzir alimentos de forma responsável e em harmonia com o ambiente.',
    topics: ['Agroecologia', 'Permacultura', 'Compostagem', 'Hortas urbanas', 'Sementes crioulas'],
    steps: {
      know: [
        'Participar de oficinas, mutirões agroecológicos ou feiras.',
        'Visitar hortas comunitárias ou cooperativas.',
        'Entrevistar agricultores familiares.',
        'Pesquisar modelos de agroflorestas ou práticas ancestrais.',
        'Investigar práticas de regeneração do solo.'
      ],
      do: [
        'Implantar ou revitalizar uma horta comunitária ou escolar.',
        'Criar e gerenciar um sistema de compostagem.',
        'Cultivar uma parcela de PANCs (Plantas Alimentícias Não Convencionais).',
        'Implementar sistema de captação de água da chuva para rega.',
        'Desenvolver um pequeno projeto de agricultura solidária.'
      ],
      share: [
        'Realizar uma feira, exposição ou degustação.',
        'Criar vídeos ou cartilhas ensinando técnicas.',
        'Organizar uma oficina de cultivo ou compostagem.',
        'Apoiar o início de projetos de agricultura sustentável.'
      ]
    }
  },
  {
    id: 'ecoturismo',
    title: 'Ecoturismo',
    axis: AxisType.ENVIRONMENT,
    branch: 'senior_pioneiro',
    description: 'Vivências em trilhas e ambientes naturais com mínimo impacto e conservação.',
    topics: ['Unidades de conservação', 'Turismo de base comunitária', 'Roteiros ecológicos', 'Segurança em áreas naturais'],
    steps: {
      know: [
        'Visitar uma unidade de conservação ou parque natural.',
        'Entrevistar guias de ecoturismo ou condutores.',
        'Participar de uma trilha guiada com interpretação ambiental.',
        'Pesquisar sobre princípios do ecoturismo.',
        'Estudar a fauna e flora típicas do bioma da região.'
      ],
      do: [
        'Planejar e realizar uma trilha ou expedição aplicando mínimo impacto.',
        'Criar um roteiro ecoturístico interpretativo para sua cidade.',
        'Produzir um guia prático de condutas sustentáveis.',
        'Colaborar em ações de manejo ou limpeza de trilhas.',
        'Implementar práticas sustentáveis em atividades escoteiras.'
      ],
      share: [
        'Apresentar seu projeto ou experiência de campo.',
        'Produzir vídeos ou e-books sobre práticas sustentáveis.',
        'Conduzir uma oficina prática sobre mínimo impacto.',
        'Organizar uma rota cultural ou caminhada educativa.'
      ]
    }
  },
  {
    id: 'educacao-ambiental',
    title: 'Educação Ambiental',
    axis: AxisType.ENVIRONMENT,
    branch: 'senior_pioneiro',
    description: 'Compreender desafios socioambientais e mobilizar pessoas para um futuro sustentável.',
    topics: ['Crise climática', 'Ativismo juvenil', 'Resíduos sólidos', 'Água e saneamento', 'Biodiversidade'],
    steps: {
      know: [
        'Participar de palestras ou rodas de conversa sobre meio ambiente.',
        'Visitar unidades de conservação, ecopontos ou centros de triagem.',
        'Entrevistar educadores ambientais ou lideranças.',
        'Pesquisar políticas públicas ambientais e ODS.',
        'Analisar campanhas ambientais já existentes.'
      ],
      do: [
        'Criar uma campanha educativa sobre resíduos ou mudanças climáticas.',
        'Desenvolver um projeto de Educação Ambiental em parceria com escola.',
        'Conduzir trilhas interpretativas ou oficinas.',
        'Planejar e realizar uma atividade de campo com coleta de dados.',
        'Promover uma ação de revitalização ou conservação.'
      ],
      share: [
        'Apresentar resultados e reflexões do projeto.',
        'Facilitar uma oficina ou roda de conversa.',
        'Produzir um mini-documentário ambiental.',
        'Criar um painel com conquistas ambientais.'
      ]
    }
  },
  {
    id: 'esportes-aventura',
    title: 'Esportes de Aventura',
    axis: AxisType.ENVIRONMENT,
    branch: 'senior_pioneiro',
    description: 'Explorar trilhas, rios e montanhas com segurança e adrenalina.',
    topics: ['Trekking e hiking', 'Canoagem e rafting', 'Escalada e rapel', 'Segurança', 'Mínimo impacto'],
    steps: {
      know: [
        'Participar de oficina ou vivência introdutória.',
        'Realizar entrevistas com praticantes ou guias.',
        'Visitar um centro de esportes de aventura.',
        'Participar de formação em segurança e primeiros socorros.',
        'Pesquisar equipamentos de segurança (EPIs).'
      ],
      do: [
        'Planejar e realizar uma atividade com cuidados ambientais e logísticos.',
        'Produzir um guia ou material visual sobre segurança.',
        'Criar ou mapear uma trilha interpretativa.',
        'Implementar melhorias de segurança nas atividades.',
        'Organizar uma mini expedição com pernoite.'
      ],
      share: [
        'Apresentar projeto ou experiência para a seção.',
        'Promover uma oficina ou palestra demonstrativa.',
        'Criar conteúdo audiovisual incentivando práticas seguras.',
        'Ajudar outros jovens a iniciar no esporte.'
      ]
    }
  },
  {
    id: 'habilidades-escoteiras',
    title: 'Habilidades Escoteiras',
    axis: AxisType.ENVIRONMENT,
    branch: 'senior_pioneiro',
    description: 'Domínio técnico para vivenciar atividades ao ar livre com autonomia e segurança.',
    topics: ['Pioneirias', 'Fogo e iluminação', 'Cozinha mateira', 'Campismo', 'Orientação e navegação'],
    steps: {
      know: [
        'Participar de oficinas práticas conduzidas por escotistas.',
        'Observar pioneirias, estruturas e fogos.',
        'Realizar entrevistas com mestres em mateiria.',
        'Estudar referências clássicas do escotismo.',
        'Testar diferentes formas de acendimento de fogo.'
      ],
      do: [
        'Orientar jovens na construção de uma pioneiria segura.',
        'Preparar uma refeição completa utilizando cozinha mateira.',
        'Conduzir atividade de orientação com mapa e bússola.',
        'Planejar e executar projeto de pioneiria de grande porte.',
        'Desenvolver sistema de iluminação natural para acampamento.'
      ],
      share: [
        'Conduzir oficinas ou treinos práticos.',
        'Criar vídeos, cartões de habilidade ou manuais.',
        'Acompanhar jovens iniciantes na aquisição de habilidades.',
        'Deixar como legado uma pioneiria funcional ou kit educativo.'
      ]
    }
  },
  {
    id: 'natureza-ciencias',
    title: 'Natureza e Ciências Naturais',
    axis: AxisType.ENVIRONMENT,
    branch: 'senior_pioneiro',
    description: 'Observar a natureza com curiosidade científica para protegê-la.',
    topics: ['Biodiversidade', 'Geociências', 'Astronomia', 'Ciclos naturais', 'Ciência cidadã'],
    steps: {
      know: [
        'Participar de visita técnica a parques ou museus.',
        'Realizar entrevistas com biólogos ou geógrafos.',
        'Participar de projetos de ciência cidadã.',
        'Desenvolver um diário de campo com registros sistemáticos.',
        'Mapear espécies-chave do seu bioma.'
      ],
      do: [
        'Criar uma trilha interpretativa científica.',
        'Produzir documentário ou série fotográfica sobre fenômeno natural.',
        'Produzir herbário ou coleção botânica/geológica.',
        'Colaborar em projeto de restauração de área degradada.',
        'Realizar expedição investigativa com coleta de dados.'
      ],
      share: [
        'Apresentar resultados da investigação.',
        'Produzir conteúdos educativos para redes sociais.',
        'Conduzir oficina sobre biodiversidade ou astronomia.',
        'Publicar o projeto em plataformas de ciência cidadã.'
      ]
    }
  },
  {
    id: 'sustentabilidade',
    title: 'Sustentabilidade',
    axis: AxisType.ENVIRONMENT,
    branch: 'senior_pioneiro',
    description: 'Equilibrar cuidado ambiental e inovação, analisando impacto das ações humanas.',
    topics: ['Consumo consciente', 'Pegada ecológica', 'Energia limpa', 'ODS', 'Economia circular'],
    steps: {
      know: [
        'Participar de oficinas ou cursos sobre sustentabilidade.',
        'Visitar cooperativas, ecopontos ou ONGs.',
        'Pesquisar sobre os ODS e sua conexão local.',
        'Analisar a pegada ecológica pessoal e comparar resultados.',
        'Investigar tecnologias sustentáveis.'
      ],
      do: [
        'Criar uma campanha educativa sobre consumo ou resíduos.',
        'Implantar uma prática sustentável na comunidade ou UEL.',
        'Produzir conteúdo educativo apresentando conceitos.',
        'Desenvolver projeto envolvendo inovação verde.',
        'Implementar diagnóstico de sustentabilidade da UEL.'
      ],
      share: [
        'Apresentar resultados e impactos para a seção.',
        'Conduzir oficinas sobre sustentabilidade.',
        'Criar materiais didáticos replicáveis.',
        'Produzir exposição ou painel visual.'
      ]
    }
  }
];
