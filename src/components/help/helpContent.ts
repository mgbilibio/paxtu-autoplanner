// Conteúdo da central de ajuda do ScoutsAuto (site).

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

/** Identidade do produto — a IA da ajuda também lê isto. */
export const HELP_PRODUTO =
  'O app se chama ScoutsAuto. Paxtu é só o sistema oficial da UEB de progresso juvenil (oficial / POR antigo), de onde copiamos o histórico. Não chame o app de Paxtu nem de PaxtuAP.';

export const ROTEIRO: HelpStep[] = [
  {
    titulo: '1. Entrar e liberar acesso',
    texto: 'No site, cada pessoa cria a própria conta (Google ou e-mail e senha). O primeiro login vira administrador. Os demais ficam na fila até o admin liberar em Configurações → Acessos, com seção e papel. Pedido pendente não abre tropa nem alcateia.',
  },
  {
    titulo: '2. Montar grupo, seção e efetivo',
    texto: 'Em Estrutura, crie o grupo, a seção e as equipes (unidade: patrulha ou matilha). Em Efetivo, use a caixa “Adicionar novos membros”. A pessoa (registro UEB) é estável; a lotação tem início e fim, então transferência guarda histórico.',
  },
  {
    titulo: '3. Ler a ficha do jovem',
    texto: 'Em Efetivo, abra a ficha (📜). Duas camadas lado a lado: Oficial (Paxtu / POR antigo), com listas por etapa (itens, datas, feito/falta), e Blocos 2025+. O dump oficial é cru; o de-para para POR 2025+ é só sugestão. A chefia confirma. O histórico oficial nunca é rebaixado.',
  },
  {
    titulo: '4. Planejar a reunião',
    texto: 'Em Gerar, use “Tema livre + amarra” (ou “A partir da seleção”). Anexe txt/md/html/imagem/PDF. Há um campo por atividade e, no roteiro, “Refazer esta” com “O que mudar neste quadro”. O cronograma segue o formulário de papel: horário, duração, item e responsável. O roteiro guarda o pedido; dá para regenerar sem redigitar. O roteiro salvo vai a Roteiros e amarra na Agenda.',
  },
  {
    titulo: '5. Pacote da seção e acessos',
    texto: 'Chefe e admin exportam/importam o JSON da seção em Configurações → Acessos (mesclar). Em Acessos também se edita (inclusive e-mail), desativa e exclui. O administrador (e a Diretoria em consulta) abre o Log de acessos: último login e última alteração nos dados. Os dados da seção ficam no Firebase — não no git nem só no navegador.',
  },
  {
    titulo: '6. Início e manual',
    texto: 'Depois do login abre o Início com os passos básicos. Dá para ir ao planejador ou marcar “Não mostrar de novo”. O manual completo (com as telas atuais) está no ? e no botão do Início.',
  },
];

export const TELA_HELP: Record<string, ScreenHelp> = {
  HOME: {
    titulo: 'Início',
    corpo: 'Tela curta depois do login: o que é o ScoutsAuto e os passos básicos (efetivo, gerar, catálogo, agenda, ajuda). Não substitui o manual completo.',
    dicas: [
      '“Ir ao planejador” (ou relatórios, na Diretoria) sai desta tela sem apagá-la do menu.',
      '“Não mostrar de novo” guarda a preferência só neste navegador.',
      'O botão do manual completo abre o guia com as telas atuais.',
    ],
  },
  DASHBOARD: {
    titulo: 'Painel da chefia',
    corpo: 'Entrada da seção: idade, progresso e reconhecimento, com atalhos para Gerar, Ciclo e Relatórios.',
    dicas: [
      'Use para decidir a próxima reunião.',
      'Se outro adulto estiver editando, o aviso de modo consulta aparece no topo.',
    ],
  },
  MEMBERS: {
    titulo: 'Efetivo',
    corpo: 'Jovens e adultos da seção. A caixa “Adicionar novos membros” abre um nome ou lista rápida. A ficha (📜) mostra Oficial (Paxtu / POR antigo) ao lado dos Blocos 2025+.',
    dicas: [
      'Só o primeiro nome basta; registro UEB e nascimento completam depois.',
      'O registro UEB identifica a pessoa; ao transferir, a lotação anterior ganha data de fim.',
      'Chefe e assistente não têm ficha de progressão de jovem.',
      'Quem vê as duas seções (Tropa e Alcateia) filtra por seção, unidade (patrulha/matilha) e nome.',
      'Diretoria consulta o efetivo das seções, sem editar.',
    ],
  },
  REPORTS: {
    titulo: 'Relatórios',
    corpo: 'Visão da seção: frequência, progresso, pendências e leitura para diretoria.',
    dicas: [
      'A ficha lado a lado (oficial + blocos) abre no Efetivo, não aqui.',
      'Diretoria tem visão global em consulta (sem editar). Leitura/Auditoria fica na seção liberada.',
    ],
  },
  GENERATOR: {
    titulo: 'Gerar roteiro',
    corpo: 'Monta a reunião. Padrão: tema livre — a IA amarra progressão e especialidades. O cronograma é o da programação semanal em papel.',
    dicas: [
      '“Tema livre + amarra”: informe o tema e gere, sem marcar o catálogo.',
      '“A partir da seleção”: marque poucos objetivos com +.',
      'No cronograma: início, duração, item e responsável. A IA preenche o miolo; abertura, intervalos e encerramento ficam.',
      'Um campo por atividade (semente). No roteiro gerado, “O que mudar neste quadro” + “Refazer esta” refaz só aquela faixa. O roteiro guarda o pedido; dá para regenerar sem redigitar.',
      'Anexos de contexto: txt, md, html, imagem ou PDF. Ficam só nesta sessão.',
      'A IA padrão é Gemini (chave em Configurações → IA, só neste navegador). xAI é extra.',
    ],
  },
  CYCLE: {
    titulo: 'Ciclo',
    corpo: 'Arco de várias semanas. Também aceita tema livre + amarra ou distribuição a partir da seleção.',
    dicas: [
      'Tema livre: a IA propõe o arco e os códigos do catálogo.',
      'Ajuste o esqueleto antes de amarrar na Agenda.',
      'Horário e responsável ficam no roteiro semanal (Gerar), não neste esqueleto.',
    ],
  },
  CATALOG: {
    titulo: 'Roteiros',
    corpo: 'Catálogo dos roteiros salvos da seção. O que você gera e salva aparece aqui e pode ser escolhido na Agenda.',
    dicas: [
      'Gere em Gerar; o roteiro é gravado no catálogo.',
      'Na Agenda, o campo “Roteiro do Catálogo” amarra o plano ao dia.',
    ],
  },
  ENCYCLOPEDIA: {
    titulo: 'Especialidades',
    corpo: 'Catálogo público UEB 2026, com status por requisito, evidência e avaliador. Também abre a partir da ficha do jovem.',
    dicas: [
      'Marque requisito a requisito; uma atividade não conclui a especialidade sozinha.',
      'O link de fonte abre a página pública da UEB. Homologação formal continua no Paxtu oficial.',
    ],
  },
  BLOCOS_2025: {
    titulo: 'Blocos de Aprendizagem',
    corpo: 'Os 18 blocos por ramo (fixas, variáveis, substituições e reconhecimento). O acompanhamento do jovem está na ficha do Efetivo.',
    dicas: [
      'Lobinho e Escoteiro usam esta estrutura.',
      'Na ficha, a camada oficial (Paxtu / POR antigo) fica visível mesmo com o legado desligado.',
      'Equivalência só sugere; a chefia confirma. Vale até 30/jun/2027.',
    ],
  },
  BIBLIOTECA: {
    titulo: 'Biblioteca',
    corpo: 'Manuais e normas de consulta (Escotista, POR, guia de especialidades e afins).',
    dicas: ['Abra o livro pela capa.', 'Isto é acervo de leitura, não o cadastro da tropa.'],
  },
  PROFILE_CONFIG: {
    titulo: 'Estrutura',
    corpo: 'Grupo, seção e equipes. No site, a mesma tela traz Acessos do grupo (pedidos, papéis e pacote da seção).',
    dicas: [
      'Ordem: Grupo Escoteiro → Seção (Tropa e/ou Alcateia) → Equipe (+ Equipe).',
      'Cadastro rápido: só o nome basta; complete registro depois no Efetivo.',
      'Quem entra pelo site pede acesso; o admin libera em Acessos.',
      'Administrador e Diretoria abrem o Log de acessos nesta tela ou em Configurações.',
    ],
  },
  LOGIN: {
    titulo: 'Login',
    corpo: 'ScoutsAuto: Google ou e-mail e senha. Sem conta, use “Primeiro acesso? Criar conta” e aguarde o administrador. O primeiro login do grupo vira administrador.',
    dicas: [
      'Chefia e assistentes vão ao painel; diretoria e leitura, aos relatórios.',
      '“Esqueci a senha” manda e-mail em português (lang=pt), com volta a este site.',
      'Pedido pendente não abre tropa nem alcateia.',
    ],
  },
  CALENDAR: {
    titulo: 'Agenda',
    corpo: 'Datas da seção, presença e lançamento de progressão a partir do roteiro do catálogo.',
    dicas: [
      'Escolha o “Roteiro do Catálogo” (o que foi salvo em Gerar / Roteiros).',
      'Salve a atividade antes de lançar progressão.',
      '“Lançar progressão” credita os presentes; “Revisar crédito” tira quem não atingiu, sem apagar presença.',
    ],
  },
};

export const FAQ: HelpFaq[] = [
  {
    q: 'ScoutsAuto e Paxtu são a mesma coisa?',
    a: 'Não. ScoutsAuto é este planejador. Paxtu é o sistema oficial da UEB de progresso juvenil (oficial / POR antigo). Copiamos o histórico de lá; homologação formal continua no Paxtu.',
  },
  {
    q: 'Como uma pessoa nova entra no site?',
    a: 'Ela abre o link, entra com Google ou cria conta (e-mail, senha e nome). O administrador vê o pedido em Configurações → Acessos (ou em Estrutura → Acessos do grupo) e libera com seção e papel, ou recusa. Convite prévio é opcional.',
  },
  {
    q: 'Quem vira administrador?',
    a: 'O primeiro login do grupo (ainda sem bootstrap) vira administrador. Depois, só o admin libera as outras contas.',
  },
  {
    q: 'O e-mail de senha deveria dizer ScoutsAuto. Por que às vezes não diz?',
    a: 'O app já pede o e-mail em português (lang=pt) e devolve a este site. O texto do modelo Firebase (nome do produto) está bloqueado no projeto; quando a personalização for liberada, o correio deve dizer ScoutsAuto.',
  },
  {
    q: 'Onde ficam os dados da tropa?',
    a: 'No Firebase (Firestore), ligados ao login. Não estão no git nem só neste navegador. Hierarquia: Grupo → Seção → Equipe (unidade) → Pessoa. A pessoa (registro UEB) não muda; a lotação tem início e fim. Chaves de IA ficam só neste navegador.',
  },
  {
    q: 'Onde vejo a ficha do jovem?',
    a: 'Em Efetivo, no ícone 📜. Lado a lado: Oficial (Paxtu / POR antigo) — listas por etapa, itens, datas, feito/falta — e Blocos 2025+. Dá para ver só oficial, só blocos ou os dois. Relatórios é consolidado da seção, não essa ficha.',
  },
  {
    q: 'O que é a equivalência UEB na ficha?',
    a: 'O dump oficial é cru. O de-para para POR 2025+ (Ferramenta de Equivalência do Ramo Escoteiro, fev/2026) só sugere créditos até 30/jun/2027. A chefia confirma ou ignora. A etapa oficial nunca é rebaixada e o histórico oficial não é apagado.',
  },
  {
    q: 'Como exporto ou trago a seção?',
    a: 'Em Configurações → Acessos, “Pacote da seção”: Exportar pacote JSON ou Importar (mesclar por registro UEB, depois id, depois nome). Não apaga quem falta no arquivo nem a progressão por blocos. O histórico oficial fica no registro de cada jovem (subdocs), não amontoado no doc de 1 MB do efetivo. A importação pode levar um minuto; se o botão ficar em “Aguarde…”, atualize a página e abra uma ficha — a gravação pode ter terminado.',
  },
  {
    q: 'Como planejo a reunião de sábado?',
    a: 'Gerar → “Tema livre + amarra” (ou marque itens e use “A partir da seleção”). Preencha tema, cronograma (horário, duração, item, responsável), um campo por atividade se quiser, e anexos. “✨ Gerar Roteiro”. No resultado, anote “O que mudar neste quadro” e “Refazer esta” refaz aquela faixa. O roteiro guarda o pedido; dá para regenerar sem redigitar. O roteiro salvo aparece em Roteiros e na Agenda.',
  },
  {
    q: 'Como edito ou tiro o acesso de alguém?',
    a: 'Em Acessos, em cada pessoa: Editar (nome e e-mail), Desativar/Reativar e Excluir. Desativar só bloqueia; Excluir apaga o perfil do ScoutsAuto (a conta Google/Firebase pode continuar existindo). Também dá para enviar redefinição de senha.',
  },
  {
    q: 'Qual IA o site usa?',
    a: 'Gemini é o padrão. Cole a chave do AI Studio em Configurações → IA (fica só neste navegador). “Ver cota / uso” abre o AI Studio. xAI é extra, com chave colada. Ollama local não roda neste site.',
  },
  {
    q: 'Posso usar sem internet?',
    a: 'Não neste site: login e dados da seção passam pelo Firebase; a geração usa Gemini (ou xAI) na nuvem.',
  },
  {
    q: 'Como faço backup do grupo?',
    a: 'O administrador baixa e restaura o JSON do grupo em Acessos. Chefe e admin também usam o pacote da seção (efetivo, equipes e histórico oficial). Sem senhas nem chaves de API.',
  },
  {
    q: 'Como volto ao POR 2020?',
    a: 'Em Configurações → Avançado, ative o modo legado só para consulta histórica. A ficha oficial (Paxtu) continua visível sem isso.',
  },
  {
    q: 'Onde vejo quem entrou e quem alterou dados?',
    a: 'Administrador (e Diretoria em consulta) abre Configurações ou Estrutura → Log de acessos. Cada conta mostra nome, e-mail, último acesso e última alteração nos dados, no horário de Cuiabá. Os registros começam neste deploy; não há histórico inventado.',
  },
  {
    q: 'Como filtro o efetivo da Tropa e da Alcateia?',
    a: 'Quem tem visão global (administrador ou Diretoria) usa os filtros de seção, unidade e nome no Efetivo. Chefe e assistente vêem só a seção em que foram liberados.',
  },
];
