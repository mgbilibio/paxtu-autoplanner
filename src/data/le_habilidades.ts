
import { Specialty, AxisType } from '../types';

export const LE_HABILIDADES: Specialty[] = [
  {
    id: 'aeronautica-le',
    title: 'Aeronáutica',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Mergulhe no universo das aeronaves. Nível 1: Realizar 4 itens. Nível 2: Realizar todos os 8 itens.',
    requirements: [
      '1. Explicar o princípio de sustentação do voo, demonstrando o efeito do ar sobre as asas com um experimento simples.',
      '2. Identificar as principais partes de uma aeronave (fuselagem, asas, trem de pouso, leme, ailerons e flaps) em um modelo.',
      '3. Em um aeródromo identificar os principais tipos de aeronaves e helicópteros em operação.',
      '4. Explicar como funciona o motor a pistão e o motor a jato, mostrando suas diferenças.',
      '5. Demonstrar como o vento interfere no voo e na navegação aérea.',
      '6. Explicar o que significam os números nas pistas de pouso e decolagem.',
      '7. Organizar um registro de observação aérea, anotando por pelo menos uma semana informações sobre aeronaves vistas em voo.',
      '8. Apresentar, com ilustrações ou maquete, os três eixos de movimento de um avião.'
    ]
  },
  {
    id: 'administracao-le',
    title: 'Administração',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra como empresas e entidades funcionam, planejam e alcançam seus objetivos.',
    requirements: [
      '1. Identificar os tipos de organizações e citar exemplos.',
      '2. Identificar quatro áreas em que pessoas administradoras podem trabalhar.',
      '3. Conversar com uma pessoa que trabalha com administração.',
      '4. Usar uma ferramenta simples de administração (tabela de tarefas, cronograma).',
      '5. Montar, sozinho ou em equipe, um pequeno plano de ação para uma atividade.',
      '6. Relacionar um dos ODS com o tema da boa administração.'
    ]
  },
  {
    id: 'arquitetura-le',
    title: 'Arquitetura e Urbanismo',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Conheça como são criados os espaços onde vivemos e como as cidades são planejadas.',
    requirements: [
      '1. Descobrir o que é arquitetura e urbanismo, observando construções.',
      '2. Conversar com uma pessoa que trabalha com arquitetura ou urbanismo.',
      '3. Desenhar dois estilos diferentes de construções.',
      '4. Montar uma maquete simples de um cômodo com materiais recicláveis.',
      '5. Apresentar para sua seção uma construção importante da sua cidade.',
      '6. Comparar dois locais da sua cidade observando o que é bem planejado.'
    ]
  },
  {
    id: 'arte-digital-le',
    title: 'Arte Digital',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra como criar arte usando ferramentas digitais.',
    requirements: [
      '1. Explorar o que é arte digital e diferentes formas de produzi-la.',
      '2. Criar um desenho digital simples, escolhendo tema e cores.',
      '3. Criar um desenho digital usando diferentes camadas (layers).',
      '4. Fazer um desenho digital com efeitos de luz e sombra.',
      '5. Produzir um desenho digital utilizando uma paleta específica de cores.',
      '6. Criar uma arte digital para divulgar uma atividade.',
      '7. Organizar uma pequena exposição ou mostra virtual.',
      '8. Produzir uma animação simples ou vídeo curto.'
    ]
  },
  {
    id: 'artes-visuais-le',
    title: 'Artes Visuais',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Explore cores, formas e estilos para expressar sua criatividade.',
    prerequisites: ['Escolher uma expressão artística para realizar os itens.'],
    requirements: [
      '1. Descobrir a história da expressão artística que escolheu.',
      '2. Apresentar os materiais e ferramentas usados na sua arte.',
      '3. Conversar com um artista visual e contar o que aprendeu.',
      '4. Criar ao menos cinco obras usando a técnica escolhida.',
      '5. Comparar obras de três artistas que usam a mesma técnica.',
      '6. Relacionar uma de suas obras com a de outro artista.',
      '7. Participar ou organizar uma exposição.',
      '8. Ensinar outra pessoa a criar uma obra.'
    ]
  },
  {
    id: 'artesanato-le',
    title: 'Artesanato',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Crie com as próprias mãos, valorizando tradições e materiais.',
    prerequisites: ['Escolher um tipo de artesanato ou material específico.'],
    requirements: [
      '1. Escolher um tipo de artesanato e apresentar materiais e ferramentas.',
      '2. Pesquisar artesanatos típicos de cinco regiões do Brasil.',
      '3. Visitar uma feira ou exposição de artesanato.',
      '4. Confeccionar ao menos dois trabalhos artesanais.',
      '5. Criar novas peças com o mesmo tipo de artesanato.',
      '6. Calcular o preço de uma das peças que produziu.',
      '7. Explicar a importância do artesanato na preservação da cultura.',
      '8. Ensinar outra pessoa a fazer um trabalho artesanal.'
    ]
  },
  {
    id: 'astronomia-le',
    title: 'Astronomia',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Olhe para o céu com outros olhos. Aprenda sobre estrelas, planetas, constelações e fenômenos.',
    requirements: [
      '1. Compreender os fenômenos celestes básicos (dia/noite, estações, fases da Lua).',
      '2. Apontar no céu noturno três constelações, o polo celeste, os pontos cardeais.',
      '3. Explicar onde está o Sistema Solar na Via Láctea.',
      '4. Construir e apresentar um relógio de Sol.',
      '5. Construir uma luneta simples ou outro instrumento de observação.',
      '6. Visitar um planetário ou observatório.',
      '7. Elaborar um painel ilustrado sobre cinco missões espaciais importantes.',
      '8. Apresentar a biografia de um astrônomo ou astrônoma.'
    ]
  },
  {
    id: 'biblioteconomia-le',
    title: 'Biblioteconomia',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra como funciona uma biblioteca e cuide bem dos livros.',
    requirements: [
      '1. Explicar como funciona uma biblioteca.',
      '2. Descrever as partes de um livro.',
      '3. Descobrir onde adquirir livros novos e usados.',
      '4. Organizar os livros que possui em casa ou no grupo.',
      '5. Demonstrar como cuidar e conservar livros.',
      '6. Pesquisar quais insetos podem danificar o papel.',
      '7. Entrevistar um(a) bibliotecário(a).',
      '8. Montar uma lista com oito livros recomendados.'
    ]
  },
  {
    id: 'cartografia-le',
    title: 'Cartografia',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a ler e criar mapas para encontrar o caminho.',
    requirements: [
      '1. Explicar o que é um mapa e para que ele serve.',
      '2. Mostrar como as escalas funcionam.',
      '3. Demonstrar como encontrar os pontos cardeais e orientar um mapa.',
      '4. Fazer um pequeno percurso de até 4 km e criar um mapa.',
      '5. Explicar o uso de um instrumento de medição de mapas.',
      '6. Conversar com alguém que trabalha com mapas.',
      '7. Usar um aplicativo ou GPS para localizar um ponto.',
      '8. Ensinar para a seção como usar uma bússola.'
    ]
  },
  {
    id: 'comedia-le',
    title: 'Comédia',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra o poder do riso e divirta as pessoas.',
    requirements: [
      '1. Pesquisar sobre os diferentes tipos de comédia.',
      '2. Contar cinco piadas.',
      '3. Contar ou dramatizar uma situação engraçada.',
      '4. Escrever e apresentar um esquete de comédia.',
      '5. Fazer uma pequena apresentação de improviso.',
      '6. Criar uma paródia de uma música conhecida.',
      '7. Criar uma piada ou esquete sobre Baden-Powell.',
      '8. Gravar um vídeo curto de comédia sobre o Escotismo.'
    ]
  },
  {
    id: 'comunicacoes-le',
    title: 'Comunicações',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Explore diferentes meios de comunicação, do rádio ao celular.',
    requirements: [
      '1. Explicar como a comunicação mudou com o tempo.',
      '2. Observar e comparar cinco capas de jornais ou sites.',
      '3. Mostrar como usar com responsabilidade o telefone e e-mails.',
      '4. Explicar de forma simples como funcionam o celular e o rádio.',
      '5. Escrever uma pequena reportagem ou artigo.',
      '6. Produzir uma propaganda em vídeo ou spot de rádio.',
      '7. Conversar ou entrevistar alguém que trabalha com comunicação.',
      '8. Planejar e aplicar um sistema de comunicação simples.'
    ]
  },
  {
    id: 'confeitaria-le',
    title: 'Confeitaria',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Prepare doces deliciosos e aprenda a cuidar da higiene.',
    requirements: [
      '1. Escolher e preparar uma receita de bolo, torta ou doce.',
      '2. Explicar e demonstrar o passo a passo de uma receita.',
      '3. Criar uma sobremesa leve e saborosa com frutas.',
      '4. Preparar uma receita tradicional da sua região.',
      '5. Inventar uma sobremesa nova com ingredientes regionais.',
      '6. Fazer um mousse, pudim ou flan.'
    ]
  },
  {
    id: 'construcao-civil-le',
    title: 'Construção Civil',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Entenda como as construções são feitas e aprenda pequenos reparos.',
    requirements: [
      '1. Identificar e explicar o uso de cinco ferramentas de pedreiro.',
      '2. Diferenciar alvenaria de vedação e estrutural.',
      '3. Fazer um conserto simples em piso ou parede.',
      '4. Reconhecer os principais elementos de uma obra.',
      '5. Explicar o que são juntas e rejuntes.',
      '6. Apontar os principais cuidados de segurança em um canteiro.'
    ]
  },
  {
    id: 'costura-le',
    title: 'Costura e Estilismo',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Solte a criatividade com tecidos, linhas e agulhas.',
    requirements: [
      '1. Criar uma linha do tempo da evolução da moda.',
      '2. Identificar tipos de linhas e agulhas.',
      '3. Montar dois looks completos (casual e festa).',
      '4. Customizar uma peça de roupa ou acessório.',
      '5. Costurar ou remendar um tecido rasgado e pregar botões.',
      '6. Preparar e usar uma máquina de costura doméstica.'
    ]
  },
  {
    id: 'criptografia-le',
    title: 'Criptografia',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Entre no mundo dos códigos secretos e mensagens misteriosas.',
    requirements: [
      '1. Explicar o que é criptografia e para que serve.',
      '2. Contar quem foi Alan Turing.',
      '3. Mostrar o que significam encriptação e decriptação.',
      '4. Explicar como funciona a cifra de César.',
      '5. Demonstrar a frequência das letras.',
      '6. Explicar três tipos diferentes de cifras.',
      '7. Criar uma cifra própria e preparar uma atividade.',
      '8. Explicar o que é sigilo perfeito.'
    ]
  },
  {
    id: 'culinaria-le',
    title: 'Culinária',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a preparar receitas, cuidar dos alimentos e montar cardápios equilibrados.',
    requirements: [
      '1. Explicar diferentes formas de conservar alimentos sem usar geladeira.',
      '2. Identificar os principais utensílios de cozinha e mostrar para que servem.',
      '3. Demonstrar como higienizar corretamente frutas, legumes e verduras.',
      '4. Planejar um cardápio saudável e equilibrado para um acampamento.',
      '5. Ser o cozinheiro da patrulha durante um acampamento.',
      '6. Montar uma cozinha de acampamento com segurança.',
      '7. Explicar o que é alimentação sustentável.',
      '8. Conversar com um profissional da culinária sobre sua rotina.'
    ]
  },
  {
    id: 'design-interiores-le',
    title: 'Design de Interiores',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Transforme espaços com beleza e funcionalidade.',
    requirements: [
      '1. Decorar uma estante, mesa ou aparador.',
      '2. Criar e apresentar uma pequena exposição de objetos.',
      '3. Modificar um móvel pequeno.',
      '4. Fazer uma maquete de um cômodo decorado.',
      '5. Visitar uma loja de decoração.',
      '6. Conversar com um arquiteto ou designer de interiores.'
    ]
  },
  {
    id: 'esports-le',
    title: 'E-sports',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Conheça o universo dos jogos eletrônicos competitivos.',
    requirements: [
      '1. Escolher dois jogos eletrônicos e apresentar um deles.',
      '2. Criar um mapa mental com os principais jogos de e-sports.',
      '3. Apresentar as regras de segurança para jogar.',
      '4. Promover um debate sobre a importância dos e-sports.',
      '5. Escolher um jogo e montar uma dinâmica ao ar livre.',
      '6. Organizar ou participar de um pequeno campeonato.'
    ]
  },
  {
    id: 'educacao-financeira-le',
    title: 'Educação Financeira',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a lidar com o dinheiro, planejar gastos e poupar.',
    requirements: [
      '1. Fazer uma apresentação sobre necessidades e desejos.',
      '2. Planejar os custos para comprar um objeto de interesse.',
      '3. Economizar durante 90 dias para uma compra.',
      '4. Produzir um material explicando o que é consumismo.',
      '5. Identificar causas e consequências do endividamento.',
      '6. Explicar a diferença entre poupar para comprar e comprar a prazo.',
      '7. Criar um material simples sobre contas bancárias.',
      '8. Pesquisar três tipos de produtos financeiros.'
    ]
  },
  {
    id: 'empreendedorismo-le',
    title: 'Empreendedorismo',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Transforme ideias em soluções criativas e projetos.',
    requirements: [
      '1. Explicar o que é ser empreendedor.',
      '2. Identificar um problema real na sua comunidade.',
      '3. Trabalhar em equipe para criar uma solução.',
      '4. Fazer um protótipo da ideia.',
      '5. Conversar com pessoas para validar a ideia.',
      '6. Criar um plano simples que explique a ideia.',
      '7. Apresentar sua ideia para um pequeno público.',
      '8. Colocar sua ideia em prática de forma experimental.'
    ]
  },
  {
    id: 'encadernacao-le',
    title: 'Encadernação',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a montar e consertar livros e cadernos.',
    requirements: [
      '1. Definir as partes de um livro e identificar ferramentas.',
      '2. Confeccionar e colocar uma capa em um livro ou caderno.',
      '3. Reparar páginas soltas ou rasgadas.',
      '4. Encadernar um livro ou caderno completo.',
      '5. Improvisar uma prensa artesanal.',
      '6. Trocar ou restaurar a lombada de um livro danificado.',
      '7. Demonstrar três tipos diferentes de encadernação.',
      '8. Visitar uma oficina ou gráfica de encadernação.'
    ]
  },
  {
    id: 'etiqueta-le',
    title: 'Etiqueta',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra como o comportamento educado ajuda a criar ambientes agradáveis.',
    requirements: [
      '1. Demonstrar boas maneiras à mesa.',
      '2. Produzir um material sobre etiqueta digital.',
      '3. Visitar um espaço cultural e observar comportamentos.',
      '4. Criar e apresentar uma esquete sobre comportamento em eventos.',
      '5. Pesquisar como regras de etiqueta variam em diferentes culturas.',
      '6. Simular uma conversa com uma autoridade.'
    ]
  },
  {
    id: 'fiscalizacao-patio-le',
    title: 'Fiscalização de Pátio',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Entenda como funciona a segurança e organização em aeroportos.',
    requirements: [
      '1. Explicar o que faz um fiscal de pátio.',
      '2. Demonstrar oito sinais de balizamento.',
      '3. Explicar o que é F.O.D.',
      '4. Citar cinco equipamentos usados na área de estacionamento de aeronaves.',
      '5. Explicar o que é atividade ilícita em aeródromo.',
      '6. Identificar as áreas de risco ao redor das aeronaves.',
      '7. Fazer um desenho ou maquete do aeródromo.',
      '8. Demonstrar que sabe utilizar o alfabeto fonético internacional.'
    ]
  },
  {
    id: 'fotografia-le',
    title: 'Fotografia',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a capturar o mundo ao seu redor, explorando luzes e ângulos.',
    requirements: [
      '1. Criar uma linha do tempo mostrando a história da fotografia.',
      '2. Fazer cinco fotos usando diferentes tipos de composição.',
      '3. Tirar seis fotos comparando luz natural e artificial.',
      '4. Fotografar cenas com diferentes velocidades de obturador.',
      '5. Fazer três fotos no mesmo lugar mudando a configuração.',
      '6. Escolher três fotos e editá-las em um aplicativo.',
      '7. Fazer a cobertura fotográfica de um evento.',
      '8. Apresentar as obras de três fotógrafos importantes.'
    ]
  },
  {
    id: 'gps-le',
    title: 'GPS',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a usar sistemas de navegação e localização.',
    requirements: [
      '1. Explicar o que são coordenadas geográficas.',
      '2. Explicar como funciona o GPS.',
      '3. Mostrar o que é um datum no GPS.',
      '4. Apresentar fatores que afetam a precisão do GPS.',
      '5. Citar outros sistemas de navegação.',
      '6. Realizar um percurso marcando pontos de interesse.'
    ]
  },
  {
    id: 'grafite-le',
    title: 'Grafite',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Expresse-se por meio das cores e formas da arte urbana.',
    requirements: [
      '1. Explicar o que é grafite e seus estilos.',
      '2. Diferenciar grafite de pichação.',
      '3. Apresentar materiais usados no grafite.',
      '4. Reconhecer modalidades de grafite.',
      '5. Criar e apresentar um grafite de tema livre.',
      '6. Desenvolver uma arte com o tema Movimento Escoteiro.'
    ]
  },
  {
    id: 'hq-le',
    title: 'HQ',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Mergulhe no mundo dos quadrinhos e crie suas histórias.',
    requirements: [
      '1. Apresentar um personagem de HQ.',
      '2. Citar cinco editoras e um personagem famoso de cada.',
      '3. Organizar uma exposição com HQs.',
      '4. Apresentar três autores importantes.',
      '5. Ler três HQs e gravar um resumo.',
      '6. Produzir um material sobre festivais de quadrinhos.',
      '7. Organizar uma sessão de vídeo baseada em HQ.',
      '8. Criar um personagem próprio.'
    ]
  },
  {
    id: 'informatica-le',
    title: 'Informática',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra como os computadores funcionam e a segurança digital.',
    requirements: [
      '1. Criar uma linha do tempo sobre a evolução dos computadores.',
      '2. Identificar funções dos principais componentes.',
      '3. Explicar tipos de armazenamento de dados.',
      '4. Explicar o que são vírus e malwares.',
      '5. Usar um programa digital para criar material útil.',
      '6. Explicar inteligência artificial e nuvem.',
      '7. Citar dez profissões que utilizam informática.',
      '8. Utilizar um programa dentre as opções (planilha, editor, apresentação).'
    ]
  },
  {
    id: 'jornalismo-le',
    title: 'Jornalismo',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra como é o trabalho de quem transforma fatos em notícias.',
    requirements: [
      '1. Criar uma linha do tempo da imprensa.',
      '2. Produzir uma reportagem em vídeo sobre um evento.',
      '3. Montar um jornal mural.',
      '4. Fazer uma cobertura fotográfica.',
      '5. Explicar o que são fake news.',
      '6. Criar uma reportagem diagramada.',
      '7. Entrevistar uma pessoa ligada ao Escotismo.',
      '8. Reunir e apresentar matérias sobre o Escotismo.'
    ]
  },
  {
    id: 'manicure-le',
    title: 'Manicure',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a cuidar das unhas com saúde e estética.',
    requirements: [
      '1. Produzir material sobre unhas saudáveis.',
      '2. Cortar e lixar as próprias unhas corretamente.',
      '3. Montar um pequeno kit de manicure.',
      '4. Fazer um vídeo sobre higiene na manicure.',
      '5. Entrevistar um profissional da área.',
      '6. Criar um design original de unhas.'
    ]
  },
  {
    id: 'manutencao-eletrica-le',
    title: 'Manutenção Elétrica',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda conceitos básicos de eletricidade e pequenos reparos.',
    requirements: [
      '1. Montar um eletroímã simples.',
      '2. Explicar diferença entre corrente contínua e alternada.',
      '3. Explicar principais termos elétricos (volt, watt, ampere).',
      '4. Realizar um pequeno reparo (trocar lâmpada, etc).',
      '5. Analisar a iluminação de um ambiente.',
      '6. Montar uma lista com itens básicos de ferramentas.',
      '7. Demonstrar como usar instrumentos de medição.',
      '8. Apresentar medidas de segurança.'
    ]
  },
  {
    id: 'maquete-le',
    title: 'Maquete',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Construa modelos em miniatura de casas, prédios e monumentos.',
    requirements: [
      '1. Realizar atividade sobre importância das maquetes.',
      '2. Construir uma maquete simples.',
      '3. Fazer uma maquete de uma praça ou monumento.',
      '4. Ler e interpretar um desenho técnico simples.',
      '5. Construir uma maquete de uma edificação com dois pavimentos.',
      '6. Calcular o custo aproximado dos materiais.'
    ]
  },
  {
    id: 'marcenaria-le',
    title: 'Marcenaria',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Transforme madeira em objetos úteis e criativos.',
    requirements: [
      '1. Diferenciar madeira maciça, compensado e MDF.',
      '2. Demonstrar uso correto dos EPIs.',
      '3. Nomear e identificar cinco ferramentas manuais.',
      '4. Fazer duas uniões simples entre peças de madeira.',
      '5. Criar e executar um pequeno projeto.',
      '6. Nomear e identificar três ferramentas elétricas.',
      '7. Confeccionar uma caixa com tampa.',
      '8. Criar e montar um projeto que utilize três tipos de união.'
    ]
  },
  {
    id: 'marinharia-le',
    title: 'Marinharia',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda como funcionam as embarcações e a vida no mar.',
    requirements: [
      '1. Reconhecer oito tipos de embarcações.',
      '2. Identificar partes e nomenclaturas da embarcação.',
      '3. Demonstrar como arrumar material e tripulação a bordo.',
      '4. Praticar o apoio às embarcações em terra e água.',
      '5. Explicar correntes e marés.',
      '6. Montar e desmontar uma embarcação.',
      '7. Manobrar uma pequena embarcação a remo.',
      '8. Utilizar instrumentos náuticos básicos.'
    ]
  },
  {
    id: 'matematica-le',
    title: 'Matemática',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra como os números estão presentes em tudo ao seu redor.',
    requirements: [
      '1. Criar três gráficos simples com dados do cotidiano.',
      '2. Construir uma estrutura realizando medições.',
      '3. Resolver problemas matemáticos do dia-a-dia.',
      '4. Comparar medição de objetos com estimativas.',
      '5. Elaborar um planejamento de economia pessoal.',
      '6. Criar uma sequência de desafios matemáticos.',
      '7. Construir uma Torre de Hanói.',
      '8. Criar desenhos ou mosaicos com geometria.'
    ]
  },
  {
    id: 'mecanica-auto-le',
    title: 'Mecânica de Automóveis',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda como funcionam as partes de um carro.',
    requirements: [
      '1. Criar um cartaz sobre o motor de combustão interna.',
      '2. Explicar a importância do óleo e sistema de arrefecimento.',
      '3. Realizar uma verificação simples em um veículo.',
      '4. Listar principais ferramentas e EPIs.',
      '5. Analisar imagens de pneus desgastados.',
      '6. Fazer um desenho do sistema de freios.',
      '7. Localizar fusíveis e bateria.',
      '8. Pesquisar novas tecnologias e combustíveis.'
    ]
  },
  {
    id: 'oratoria-le',
    title: 'Oratória',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a falar em público com clareza e confiança.',
    requirements: [
      '1. Apresentar técnicas de expressão em público.',
      '2. Criar e apresentar um pequeno discurso.',
      '3. Ler em voz alta um texto.',
      '4. Criar um roteiro para apresentação.',
      '5. Participar de um debate.',
      '6. Avaliar a própria apresentação.'
    ]
  },
  {
    id: 'pintura-le',
    title: 'Pintura',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a preparar e transformar superfícies com tintas.',
    requirements: [
      '1. Identificar materiais usados em pintura.',
      '2. Demonstrar como preparar uma superfície.',
      '3. Conhecer diferentes tipos de tinta.',
      '4. Pintar uma porta ou peça de madeira.',
      '5. Executar a pintura de uma parede.',
      '6. Realizar a pintura de uma estrutura metálica.',
      '7. Demonstrar três técnicas de pintura decorativa.',
      '8. Explicar cuidados de segurança.'
    ]
  },
  {
    id: 'planador-le',
    title: 'Planador',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra como é possível voar sem motor.',
    requirements: [
      '1. Realizar uma inspeção pré-voo em um planador.',
      '2. Posicionar corretamente um planador.',
      '3. Demonstrar sinais usados durante lançamento.',
      '4. Explicar o que são correntes termais.',
      '5. Pesquisar um modelo de planador.',
      '6. Participar de um lançamento real.'
    ]
  },
  {
    id: 'plastimodelismo-le',
    title: 'Plastimodelismo',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a montar e personalizar miniaturas.',
    requirements: [
      '1. Montar um plastimodelo à escolha.',
      '2. Realizar uma pequena exposição.',
      '3. Pesquisar e listar cinco modelos disponíveis.',
      '4. Ensinar outros jovens sobre montagem.',
      '5. Explicar como conservar modelos.',
      '6. Explicar o que é um diorama.'
    ]
  },
  {
    id: 'prevencao-incendio-le',
    title: 'Prevenção de Incêndio',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a evitar e apagar fogos com segurança.',
    requirements: [
      '1. Explicar o que é o fogo e os três elementos.',
      '2. Explicar os principais métodos de extinção.',
      '3. Ensinar procedimentos de segurança e evacuação.',
      '4. Identificar corpo de bombeiros mais próximo.',
      '5. Fazer uma lista de produtos inflamáveis.',
      '6. Explicar os diferentes tipos de extintores.'
    ]
  },
  {
    id: 'producao-grafica-le',
    title: 'Produção Gráfica',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Transforme ideias em materiais impressos.',
    requirements: [
      '1. Apresentar cinco tipos de papéis.',
      '2. Visitar uma gráfica.',
      '3. Criar um arquivo digital e converter formatos.',
      '4. Produzir um cartaz explicando tipos de impressão.',
      '5. Produzir um pequeno livreto apresentando fontes.',
      '6. Criar um folder de divulgação.'
    ]
  },
  {
    id: 'programacao-le',
    title: 'Programação',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Dê os primeiros passos para pensar como um programador.',
    requirements: [
      '1. Criar um algoritmo para uma tarefa simples.',
      '2. Desenvolver um programa curto.',
      '3. Apresentar três linguagens de programação.',
      '4. Explicar controle de versão.',
      '5. Encontrar e corrigir um bug.',
      '6. Criar uma API bem simples.',
      '7. Usar a programação para ajudar sua seção.',
      '8. Escrever um passo a passo (README).'
    ]
  },
  {
    id: 'propaganda-marketing-le',
    title: 'Propaganda e Marketing',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a criar campanhas e divulgar ideias.',
    requirements: [
      '1. Criar uma propaganda para o Grupo Escoteiro.',
      '2. Inventar um produto fictício e elaborar propaganda.',
      '3. Criar uma empresa fictícia e desenvolver marca.',
      '4. Escolher um produto da Loja Escoteira e divulgar.',
      '5. Criar uma campanha publicitária social ou ambiental.',
      '6. Produzir uma foto publicitária.',
      '7. Explicar etapas do planejamento de campanha.',
      '8. Criar um vídeo ou peça sobre o Movimento Escoteiro.'
    ]
  },
  {
    id: 'quimica-le',
    title: 'Química',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra a ciência das transformações e reações.',
    requirements: [
      '1. Listar cinco situações do cotidiano com fenômenos químicos.',
      '2. Classificar cinco fenômenos como físicos ou químicos.',
      '3. Criar um cartaz com regras de segurança.',
      '4. Elaborar linha do tempo dos modelos atômicos.',
      '5. Montar modelos simples de moléculas.',
      '6. Realizar experimento com comprimidos efervescentes.',
      '7. Misturar água, óleo e detergente.',
      '8. Produzir um cartaz sobre Química Verde.'
    ]
  },
  {
    id: 'radioamadorismo-le',
    title: 'Radioamadorismo',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Conecte-se com o mundo através das ondas de rádio.',
    requirements: [
      '1. Conhecer regras básicas do radioamadorismo.',
      '2. Explicar como funcionam transmissores e receptores.',
      '3. Identificar três tipos de antenas.',
      '4. Demonstrar como fazer aterramento.',
      '5. Comparar dois modelos de transceptores.',
      '6. Produzir um vídeo curto sobre repetidoras.',
      '7. Apresentar trabalho sobre radioamadorismo em emergências.',
      '8. Criar seu próprio cartão QSL.'
    ]
  },
  {
    id: 'radioescuta-le',
    title: 'Radioescuta',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a ouvir o mundo pelas ondas de rádio.',
    requirements: [
      '1. Visitar duas estações de radioamador ou comercial.',
      '2. Pesquisar e listar cinco estações de ondas curtas.',
      '3. Demonstrar uso básico de um rádio receptor.',
      '4. Montar uma exposição com cartões QSL.',
      '5. Reconhecer cinco expressões do Código Q.',
      '6. Identificar seis indicativos de chamada de países.'
    ]
  },
  {
    id: 'redes-computadores-le',
    title: 'Redes de Computadores',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Descubra como a internet conecta o mundo.',
    requirements: [
      '1. Apresentar a história da internet.',
      '2. Configurar uma rede local simples.',
      '3. Criar tabela comparando tipos de conexão.',
      '4. Simular como funcionam protocolos de comunicação.',
      '5. Configurar um roteador wi-fi.',
      '6. Apresentar principais ameaças às redes.',
      '7. Utilizar ferramentas de diagnóstico.',
      '8. Explicar IoT e nuvem.'
    ]
  },
  {
    id: 'reparos-domesticos-le',
    title: 'Reparos Domésticos',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a consertar coisas em casa.',
    requirements: [
      '1. Apresentar regras de segurança para reparos elétricos.',
      '2. Fazer um pequeno reparo elétrico.',
      '3. Trocar uma torneira ou reparo.',
      '4. Ajustar uma descarga.',
      '5. Reparar uma parede com pequenos danos.',
      '6. Preparar uma parede para pintura.',
      '7. Montar uma caixa de ferramentas básicas.',
      '8. Demonstrar que sabe usar ferramentas manuais.',
      '9. Consertar um brinquedo simples.',
      '10. Trocar um botijão de gás com segurança.'
    ]
  },
  {
    id: 'robotica-le',
    title: 'Robótica',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a montar e programar robôs.',
    requirements: [
      '1. Realizar uma dinâmica explicando o que pode ser considerado um robô.',
      '2. Montar e programar um modelo simples com peças móveis.',
      '3. Montar um modelo com três ou mais partes móveis controlado por rádio.',
      '4. Criar e programar um protótipo de robô que resolva um problema prático.',
      '5. Programar um robô que use sensores e estrutura condicional.',
      '6. Montar e programar um robô capaz de se comunicar via wi-fi ou bluetooth.',
      '7. Explicar o funcionamento de duas funções em um programa para Arduino.',
      '8. Programar uma mudança de cor no botão de um HUB.'
    ]
  },
  {
    id: 'seguranca-transito-le',
    title: 'Segurança no Trânsito',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a circular com segurança nas ruas.',
    requirements: [
      '1. Promover um debate sobre segurança no trânsito.',
      '2. Identificar significado das cores do semáforo e placas.',
      '3. Realizar uma caminhada registrando locais seguros/inseguros.',
      '4. Participar de atividade sobre causas de acidentes.',
      '5. Descobrir quais órgãos cuidam da segurança.',
      '6. Criar uma atividade educativa.',
      '7. Produzir material criativo com dicas.',
      '8. Pesquisar dados sobre acidentes na sua cidade.'
    ]
  },
  {
    id: 'simulacao-aerea-le',
    title: 'Simulação Aérea',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Viva a experiência de pilotar um avião no computador.',
    requirements: [
      '1. Fazer uma apresentação sobre simuladores de voo.',
      '2. Realizar manobras básicas em um simulador.',
      '3. Ensinar outro jovem a utilizar um simulador.',
      '4. Decolar, executar circuito e pousar.',
      '5. Construir uma estrutura que simule os movimentos.',
      '6. Executar manobras de ultrapassagem.',
      '7. Realizar circuito de espera e arremetida.',
      '8. Realizar acrobacias aéreas.'
    ]
  },
  {
    id: 'sinalizacao-le',
    title: 'Sinalização',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Comunique-se usando bandeiras, luzes e sons.',
    requirements: [
      '1. Confeccionar um par de bandeiras de semáfora.',
      '2. Construir aparelho para transmitir Código Morse.',
      '3. Apresentar o alfabeto de Bandeiras.',
      '4. Demonstrar o sinal SOS.',
      '5. Receber e decodificar mensagem.',
      '6. Pesquisar sinais luminosos e sonoros na navegação.',
      '7. Confeccionar conjunto de galhardetes.',
      '8. Enviar mensagem com galhardetes.'
    ]
  },
  {
    id: 'vendas-le',
    title: 'Vendas',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a planejar e realizar vendas.',
    requirements: [
      '1. Explicar características de um bom vendedor.',
      '2. Ensinar outros jovens o significado de termos de vendas.',
      '3. Escolher um produto e criar estratégia.',
      '4. Participar de uma campanha de arrecadação.',
      '5. Apresentar uma nota fiscal de venda.',
      '6. Calcular juros simples e compostos.',
      '7. Explicar legislação tributária.',
      '8. Apresentar três ferramentas digitais.'
    ]
  },
  {
    id: 'videomaker-le',
    title: 'Videomaker',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Aprenda a contar histórias com vídeos.',
    requirements: [
      '1. Demonstrar como operar câmera ou celular.',
      '2. Escrever dois roteiros curtos.',
      '3. Gravar um pequeno portfólio com planos diferentes.',
      '4. Montar esquema básico de iluminação.',
      '5. Editar um vídeo curto.',
      '6. Produzir uma edição mais elaborada.',
      '7. Captar e editar um vídeo de evento.',
      '8. Produzir um mini documentário.'
    ]
  },
  {
    id: 'web-design-le',
    title: 'Web Design',
    axis: AxisType.LIFE_SKILLS,
    branch: 'lobinho_escoteiro',
    description: 'Crie sites e entenda como funcionam.',
    requirements: [
      '1. Planejar navegação por um site.',
      '2. Criar protótipo de baixa fidelidade.',
      '3. Criar wireframes de uma página.',
      '4. Desenvolver protótipo de alta fidelidade.',
      '5. Testar acessibilidade de um site.',
      '6. Produzir um cartaz explicativo.'
    ]
  }
];