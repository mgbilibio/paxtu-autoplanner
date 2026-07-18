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
    texto: 'No primeiro acesso, escolha o provedor de IA, a pasta de dados e o modo local ou compartilhado.',
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
    corpo: 'Monta reunião a partir de objetivos de progressão e especialidades, com avaliação e materiais.',
    dicas: ['Selecione poucos objetivos.', 'Use tema narrativo para conectar a reunião.'],
  },
  CYCLE: {
    titulo: 'Ciclo',
    corpo: 'Planejamento sequencial de reuniões com avaliação e pendências distribuídas no tempo.',
    dicas: ['Use para evitar improviso semanal.', 'Cada semana pode registrar acompanhamento.'],
  },
  ENCYCLOPEDIA: {
    titulo: 'Especialidades',
    corpo: 'Catálogo das especialidades com requisitos, avaliação, evidências e nível.',
    dicas: ['Use status por requisito.', 'Registre avaliador e evidência.'],
  },
  BLOCOS_2025: {
    titulo: 'Progressão 2025+',
    corpo: 'Acompanha os 18 blocos por ramo, com fixas, variáveis, substituições e reconhecimentos.',
    dicas: ['Lobinho e Escoteiro usam esta estrutura.', 'A ficha foi feita para leitura ampla.'],
  },
  PROFILE_CONFIG: {
    titulo: 'Estrutura',
    corpo: 'Cria grupo, seção, equipes e usuários da chefia.',
    dicas: ['A ordem é grupo, seção, equipe e usuário.', 'Sem usuário não há login operacional.'],
  },
  LOGIN: {
    titulo: 'Login',
    corpo: 'Seleciona o perfil que vai usar o app agora.',
    dicas: ['Chefia e assistentes vão ao painel.', 'Diretoria e leitura vão aos relatórios.'],
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
    a: 'Em Configurações > Avançado, use Backup completo ou Backup de progressão.',
  },
  {
    q: 'Como volto ao modo legado?',
    a: 'Ative a compatibilidade POR 2020 nas configurações avançadas apenas para consulta histórica.',
  },
];
