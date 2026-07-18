
import { Specialty, AxisType } from '../types';

export const POR_PROGRESSION: Specialty[] = [
  // --- GERAL ---
  {
    id: 'regras-especialidades',
    title: 'Regras de Especialidades (POR)',
    axis: AxisType.PROGRESSION,
    branch: 'lobinho_escoteiro',
    description: 'Regra 174: Como funcionam os níveis e conquistas.',
    requirements: [
      'DISTRIBUIÇÃO: As especialidades estão distribuídas nos eixos: Saúde e Bem-Estar, Meio Ambiente, Paz e Desenvolvimento e Habilidades para a Vida.',
      'RAMOS LOBINHO E ESCOTEIRO (Níveis): Podem ser conquistadas em Nível 1 e Nível 2. Nível 1 conquista-se realizando 1/3 (ou metade, conforme guia específico) dos itens. Nível 2 conquista-se realizando todos os itens (ou 2/3). Utilize apenas o distintivo de nível mais elevado.',
      'RAMOS SÊNIOR E PIONEIRO (Projetos): Não possuem níveis. São conquistadas por meio de projetos ou certificação externa. Devem usar os distintivos específicos destes ramos.',
      'PRÉ-REQUISITO: As especialidades só podem ser conquistadas após a realização da Promessa Escoteira.',
      'CERTIFICAÇÃO EXTERNA: É possível conquistar especialidades apresentando certificados de cursos, oficinas ou experiência comprovada fora do movimento.'
    ]
  },

  // --- LOBINHO ---
  {
    id: 'prog-lobinho',
    title: 'Progressão Pessoal: Lobinho',
    axis: AxisType.PROGRESSION,
    branch: 'lobinho_escoteiro',
    description: 'Regra 176-II: O caminho do Lobinho na Alcateia.',
    requirements: [
      'PATA-TENRA: Recebido por todas as crianças que estão nesta etapa inicial de integração.',
      'SALTADOR: Segunda etapa de progressão, marcada pelo aprofundamento na vida da Alcateia.',
      'RASTREADOR: Terceira etapa, onde o Lobinho já demonstra maior autonomia.',
      'CAÇADOR: Etapa final, preparando-se para a transição para o Ramo Escoteiro.',
      'USO: Os distintivos são usados na manga esquerda da camisa, altura do terço médio.'
    ]
  },
  {
    id: 'cruzeiro-sul',
    title: 'Reconhecimento Cruzeiro do Sul',
    axis: AxisType.PROGRESSION,
    branch: 'lobinho_escoteiro',
    description: 'Regra 178-I: O grau máximo do Ramo Lobinho.',
    requirements: [
      'Ter concluído todos os blocos de atividades propostos no Sistema de Progressão Pessoal do Ramo (até a etapa Caçador).',
      'Tenha vivenciado o desafio ou aventura pessoal.',
      'Tenha realizado seu processo de avaliação pessoal.',
      'Tenha sido avaliado pelos demais membros de sua Alcateia.',
      'Recomendação pela Roca de Conselho e aprovação pelos escotistas.'
    ]
  },

  // --- ESCOTEIRO ---
  {
    id: 'prog-escoteiro',
    title: 'Progressão Pessoal: Escoteiro',
    axis: AxisType.PROGRESSION,
    branch: 'lobinho_escoteiro',
    description: 'Regra 176-III: A trilha de descoberta e aventura.',
    requirements: [
      'PISTAS: Etapa inicial de conhecimento e adaptação à Patrulha.',
      'TRILHA: Desenvolvimento de habilidades técnicas e vivência em equipe.',
      'RUMO: Consolidação dos conhecimentos e liderança.',
      'TRAVESSIA: Etapa final, foco na comunidade e preparação para o Ramo Sênior.',
      'USO: Os distintivos são usados na manga esquerda da camisa.'
    ]
  },
  {
    id: 'lis-ouro',
    title: 'Reconhecimento de Lis de Ouro',
    axis: AxisType.PROGRESSION,
    branch: 'lobinho_escoteiro',
    description: 'Regra 178-II: O grau máximo do Ramo Escoteiro.',
    requirements: [
      'Tenha concluído todos os blocos de atividades propostos no Sistema de Progressão (até a etapa Travessia).',
      'Tenha vivenciado o desafio ou aventura pessoal.',
      'Tenha realizado seu processo de avaliação pessoal.',
      'Tenha sido avaliado pelos demais membros de sua Tropa (Corte de Honra).',
      'Possuir o cordão de eficiência vermelho e branco (implícito nas normas de progressão, verificar guia específico).',
      'Possuir uma das Insígnias de Interesse Especial (Mundial, Lusofonia, Cone Sul, etc.).'
    ]
  },

  // --- SÊNIOR ---
  {
    id: 'prog-senior',
    title: 'Progressão Pessoal: Sênior',
    axis: AxisType.PROGRESSION,
    branch: 'senior_pioneiro',
    description: 'Regra 176-IV: Superar desafios e viver aventuras.',
    requirements: [
      'ESCALADA: Início da jornada no ramo, foco em integração e autoconhecimento.',
      'CONQUISTA: Desenvolvimento de competências, liderança e superação.',
      'AZIMUTE: Etapa final, definição de rumos para a vida adulta e Ramo Pioneiro.',
      'USO: Os distintivos são usados na manga esquerda da camisa.'
    ]
  },
  {
    id: 'escoteiro-patria',
    title: 'Escoteiro da Pátria',
    axis: AxisType.PROGRESSION,
    branch: 'senior_pioneiro',
    description: 'Regra 178-III: O reconhecimento máximo do Ramo Sênior.',
    requirements: [
      'Conclusão de todas as etapas da Progressão Pessoal (até Azimute).',
      'Realização do Desafio Pessoal.',
      'Avaliação pessoal e pelos membros da Tropa (Corte de Honra).',
      'Possuir o Cordão Dourado (conforme manuais específicos).',
      'Possuir uma das Insígnias de Interesse Especial (Aeronauta, Naval, Cone Sul, Lusofonia, etc).'
    ]
  },

  // --- PIONEIRO ---
  {
    id: 'prog-pioneiro',
    title: 'Progressão Pessoal: Pioneiro',
    axis: AxisType.PROGRESSION,
    branch: 'senior_pioneiro',
    description: 'Regra 176-V: Um projeto de vida.',
    requirements: [
      'DESCOBERTA: A primeira etapa, focada no comprometimento e adaptação ao Clã.',
      'DESTINO: O aprofundamento na cidadania e atuação ativa na comunidade.',
      'HORIZONTE: A etapa final, olhando para o futuro e a vida adulta.',
      'USO: Os distintivos são usados na manga esquerda da camisa.'
    ]
  },
  {
    id: 'insignia-bp',
    title: 'Insígnia de B-P',
    axis: AxisType.PROGRESSION,
    branch: 'senior_pioneiro',
    description: 'Regra 178-IV: O reconhecimento máximo do Ramo Pioneiro.',
    requirements: [
      'Conclusão de todas as etapas da Progressão Pessoal.',
      'Vivência do Desafio ou Aventura Pessoal (Projeto de vida).',
      'Avaliação pessoal e pelos membros do Clã.',
      'Recomendação pela Assembleia de Clã.',
      'Realização de um projeto de relevância e impacto.'
    ]
  }
];