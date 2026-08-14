// Conteudo da central de ajuda, separado para manter o painel enxuto.

export type HelpTab = 'roteiro' | 'tela' | 'faq' | 'ia';

export interface HelpStep {
  titulo: string;
  texto: string;
}

export interface ScreenHelp {
  titulo: string;
  corpo: string;
  dicas: string[];
}

export interface HelpFaq {
  q: string;
  a: string;
}

export const ROTEIRO: HelpStep[] = [
  {
    titulo: '1. Configurar o app',
    texto: 'No ScoutsAuto web, entre com Google ou crie conta com e-mail e senha; o administrador libera o acesso. No desktop, escolha o provedor de IA e a pasta de dados.',
  },
  {
    titulo: '2. Montar a estrutura',
    texto: 'Em Gerenciar Perfis, crie o grupo, a seção, as equipes e os usuários da chefia.',
  },
  {
    titulo: '3. Entrar com o perfil certo',
    texto: 'Chefia e assistentes entram no painel operacional. Diretoria e leitura entram em relatórios.',
  },
  {
    titulo: '4. Trabalhar o efetivo',
    texto: 'Em Efetivo, abra o jovem para ver ficha consolidada, progressão e especialidades.',
  },
  {
    titulo: '5. Gerar e registrar',
    texto: 'Use Gerar para reuniões, Ciclo para distribuir o plano e Relatórios para acompanhar a seção.',
  },
  {
    titulo: '6. Operar em conjunto',
    texto: 'Em pasta compartilhada, edite uma seção por vez e respeite o aviso de modo consulta.',
  },
];

export const TELA_HELP: Record<string, ScreenHelp> = {
  DASHBOARD: {
    titulo: 'Painel da chefia',
    corpo: 'Entrada operacional com resumos, pendências, próximas ações e atalhos para atividade, ciclo e relatórios.',
    dicas: ['Use para decidir a próxima reunião.', 'Em modo consulta, continua útil para leitura.'],
  },
  MEMBERS: {
    titulo: 'Efetivo',
    corpo: 'Lista jovens e adultos da seção e abre ficha consolidada, progressão e especialidades.',
    dicas: ['Abra o jovem pela linha dele.', 'Registre evidências por requisito.'],
  },
  REPORTS: {
    titulo: 'Relatórios',
    corpo: 'Visão consolidada para chefia e diretoria, com frequência, progresso, pendências e leitura executiva.',
    dicas: ['Diretoria usa esta tela para consulta.', 'A ficha consolidada sai desta área.'],
  },
  GENERATOR: {
    titulo: 'Gerar roteiro',
    corpo: 'Monta reunião com dois modos: tema livre (a IA amarra progressão/especialidades) ou a partir da seleção de itens.',
    dicas: [
      'Modo "Tema livre + amarra": informe o tema e gere — sem marcar catálogo.',
      'Modo "A partir da seleção": marque poucos objetivos e a IA parte deles.',
      'No cronograma, defina data, ciclo, início (ex.: 15:30), itens e responsáveis. A IA preenche só o miolo; IBEAGU/intervalos/IBOAGUCL permanecem.',
      'O padrão da IA é Gemini Flash-Lite (mais barato/rápido). 3.7 Flash é o mais capaz. “Ver cota / uso” abre o AI Studio.',
      'Com Ollama cloud use contexto ≥256k; a geração roda em partes.',
    ],
  },
  CYCLE: {
    titulo: 'Ciclo',
    corpo: 'Planejamento de várias semanas. Também aceita tema livre + amarração ou distribuição a partir da seleção.',
    dicas: [
      'Tema livre: a IA propõe o arco e códigos do catálogo.',
      'Ajuste o esqueleto antes de agendar na Agenda.',
      'O cronograma detalhado (horários e responsáveis) fica no roteiro semanal, não neste esqueleto de ciclo.',
    ],
  },
  ENCYCLOPEDIA: {
    titulo: 'Especialidades',
    corpo: 'Catálogo estruturado das especialidades públicas UEB 2026, com avaliação por requisito, evidência e preservação histórica.',
    dicas: [
      'Use status por requisito.',
      'Registre avaliador e evidência.',
      'Use o link de fonte da ficha para conferir a página pública da UEB antes de homologar no Paxtu oficial.',
    ],
  },
  BLOCOS_2025: {
    titulo: 'Progressão 2025+',
    corpo: 'Acompanha os 18 blocos por ramo, com fixas, variáveis, substituições e reconhecimentos.',
    dicas: [
      'Lobinho e Escoteiro usam esta estrutura.',
      'A ficha foi feita para leitura ampla.',
      'No jovem, a camada oficial UEB (se existir) fica visível mesmo com o modo legado desligado. Equivalência só sugere; a chefia confirma.',
    ],
  },
  PROFILE_CONFIG: {
    titulo: 'Estrutura',
    corpo: 'Cria grupo, seção, equipes e usuários. Cadastro rápido: só o nome basta; lista de patrulha/chefia em um lance.',
    dicas: [
      'Use ⚡ Lista rápida para colar nomes da patrulha ou da chefia. Função Chefe grava como Chefe.',
      'Na Chefia / sem equipe, selecione pessoas e defina Chefe ou Assistente em lote.',
      'Complete nascimento e registro depois na edição.',
    ],
  },
  LOGIN: {
    titulo: 'Login',
    corpo: 'No site ScoutsAuto, entre com Google ou e-mail e senha. Se ainda não tem conta, crie uma e aguarde o administrador liberar. No desktop, selecione o perfil local.',
    dicas: ['Chefia e assistentes vão ao painel.', 'Diretoria e leitura vão aos relatórios.', 'Pedido pendente não abre tropa nem alcateia.'],
  },
  CALENDAR: {
    titulo: 'Agenda',
    corpo: 'Datas, presença, lançamento de progressão do roteiro e revisão de crédito (excluir quem não atingiu a avaliação).',
    dicas: [
      'Salve a atividade antes de lançar progressão.',
      'Lançar credita os presentes; use “Revisar crédito” para desmarcar quem não cumpriu.',
      'Excluir do crédito não remove a presença nem a frequência.',
    ],
  },
};

export const FAQ: HelpFaq[] = [
  {
    q: 'Como evito conflito no Google Drive?',
    a: 'Use uma pasta compartilhada, mantenha uma pessoa por vez editando a mesma seção e respeite o modo consulta.',
  },
  {
    q: 'Posso usar sem internet?',
    a: 'Sim. O modo local com Ollama funciona sem internet depois que o modelo estiver baixado.',
  },
  {
    q: 'Onde vejo a ficha do jovem?',
    a: 'Em Relatórios, abra o jovem para acessar ficha consolidada, progresso, especialidades e pendências.',
  },
  {
    q: 'Como marco especialidades direito?',
    a: 'Abra a especialidade no jovem, marque o status de cada requisito e registre evidência, avaliador e notas.',
  },
  {
    q: 'Como faço backup?',
    a: 'No desktop, Configurações > Avançado tem backup local. No site ScoutsAuto, o administrador baixa e restaura o JSON do grupo em Acessos. Chefe e administrador também exportam o pacote da seção (efetivo, equipes e histórico oficial), sem apagar progressão ao importar. Sem senhas nem chaves de API.',
  },
  {
    q: 'O que é a equivalência UEB no acompanhamento?',
    a: 'Se o jovem tem histórico oficial (etapas e especialidades antigas), o ScoutsAuto mostra essa camada junto dos blocos POR 2025+. A Ferramenta de Equivalência do Ramo Escoteiro (fev/2026) só sugere créditos. A chefia confirma ou ignora. A etapa oficial nunca é rebaixada e o histórico oficial não é apagado.',
  },
  {
    q: 'Como volto ao modo legado?',
    a: 'Ative a compatibilidade POR 2020 nas configurações avançadas apenas para consulta histórica.',
  },
  {
    q: 'Como uma pessoa nova entra no site?',
    a: 'Ela abre o link, entra com Google ou cria conta com e-mail, senha e nome. O administrador vê o pedido em Acessos e libera com seção (tropa/alcateia) e papel, ou recusa.',
  },
];
