export enum ScoutBranch {
  LOBINHO = 'Lobinho',
  ESCOTEIRO = 'Escoteiro',
  SENIOR = 'Sênior',
  PIONEIRO = 'Pioneiro'
}

export enum EducationalArea {
  FISICO = 'Físico',
  INTELECTUAL = 'Intelectual',
  CARATER = 'Caráter',
  AFETIVO = 'Afetivo',
  SOCIAL = 'Social',
  ESPIRITUAL = 'Espiritual'
}

export enum TroopRole {
  CHEFE = 'Chefe',
  ASSISTENTE = 'Assistente',
  JUVENIL = 'Juvenil'
}

export interface Activity {
  title: string;
  durationMinutes: number;
  educationalArea: EducationalArea;
  description: string;
  materials: string[];
  progressionObjective: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  isOperational?: boolean;
  operationalType?: 'opening' | 'break' | 'closing';
  // Campos enriquecidos (opcionais — preenchidos pela IA quando suportado pelo modelo)
  fundoDeCena?: string;          // Narrativa específica que conecta a atividade ao tema
  instrucaoChefia?: string;      // Passo-a-passo de execução para a chefia, dicas, alertas de segurança
  objetivoEspecifico?: string;   // Comportamento esperado ao final ("Ao final, o jovem será capaz de...")
  manualReferencia?: string;     // Ex: "Manual do Escotista 2025, p.275 (Vida ao Ar Livre)"
  preparacaoPrevia?: string[];   // Lista de itens que a chefia precisa preparar ANTES (imprimir, montar etc.)
  evaluation?: ActivityEvaluation;
  _uid?: string;                 // Chave estavel de UI (nao vem da IA; atribuido na normalizacao)
}

export interface ActivityEvaluation {
  acompanhamento: string;         // Como observar o jovem durante a atividade.
  avaliacaoJovens: string;        // Autoavaliacao/avaliacao por pares.
  avaliacaoChefia: string;        // Criterio de observacao da chefia.
  requisitosObservaveis: string[];
  criteriosDeAceite: string[];
  evidenciasSugeridas?: string[];
}

export interface StudyItem {
  activityTitle: string;
  conceptExplainer: string;
  teachingTips: string;
  searchQueriesUsed: string[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface MeetingPlan {
  id?: string;
  sectionId?: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
  theme: string;
  fundoDeCena?: string;        // Narrativa global que conecta TODAS as atividades em uma história
  preparacaoChefia?: string;   // Resumo do que a chefia precisa fazer antes da reunião
  branch?: ScoutBranch;
  totalDuration: number;
  generalNotes: string;
  educationalRationale?: string; // Justificativa pedagógica da escolha das atividades
  activities: Activity[];
  studyGuide: StudyItem[];
  sources?: GroundingSource[];
}

export interface ObjectiveItem {
  id: string;
  code?: string;
  category: string;
  description: string;
  source: string;
  userDuration?: number;
  isSpecialty?: boolean;
  specialtyLevel?: 1 | 2 | 3;
  isProject?: boolean;
  specialtyData?: any;
  requirementsContext?: string; // New: For sub-tasks context
}

/** from_selection: atividades partem dos itens marcados.
 *  auto_link: inventa atividades (tema/instrução) e amarra códigos do catálogo depois. */
export type PlanningMode = 'from_selection' | 'auto_link';

export interface GeneratorParams {
  branch: ScoutBranch;
  totalDuration: number;
  narrativeTheme: string;
  objectives: ObjectiveItem[];
  modelId?: string;
  customInstruction?: string;
  referenceUrls?: string[];
  activityCount?: number;
  participantsCount?: number;
  /** Padrão: from_selection se houver objetivos; senão auto_link. */
  planningMode?: PlanningMode;
  /** Resumo compacto do catálogo (progressão + especialidades) para amarração no modo auto_link. */
  catalogDigest?: string;
}

export interface GroupProfile {
  groupName: string;
  sectionName: string;
  city: string;
  defaultLocation: string;
  patrols: string[];
}

export type LlmProviderId = 'gemini' | 'ollama';
export type DataSyncMode = 'local' | 'sharedFolder';

export interface AppConfig {
  apiKey: string;
  dataFolder: string;
  isConfigured: boolean;
  profile?: GroupProfile;
  showLegacy?: boolean; // Quando true, expõe controles do POR 2020. Padrão: false (apenas POR 2025+).
  // Configuração do provider de IA. Padrão: gemini.
  llmProvider?: LlmProviderId;
  ollamaBaseUrl?: string; // Default: http://localhost:11434
  ollamaModel?: string;   // Selecionado pelo usuário a partir da lista dinâmica do Ollama.
  ollamaGenerationContext?: number;
  ollamaGenerationOutput?: number;
  syncMode?: DataSyncMode; // local: máquina individual; sharedFolder: Google Drive/OneDrive/Dropbox.
}

export interface CatalogAnnotation {
  code: string;
  note: string;
  isApplied: boolean;
  appliedDate?: string;
}

// --- MULTI-USER & MULTI-SECTION ---

export interface ScoutGroup {
  id: string;
  name: string;
  city: string;
  sections: string[];
}

export interface ScoutSection {
  id: string;
  groupId?: string;
  name: string;
  branch: ScoutBranch;
  progressionSystem?: 'LEGACY_2020' | 'POR_2025';
  migrationDate?: string; 
  teams?: ScoutTeam[]; 
}

export interface ScoutTeam {
  id: string;
  name: string;
}

export interface UserProfile {
  id: string;
  name: string;
  sectionId: string;
  role: string;
  avatar?: string;
}

export interface SectionEnrollment {
  sectionId: string;
  role: TroopRole;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export interface ScoutMember {
  id: string;
  sectionId?: string; 
  name: string;
  registerNumber?: string;
  branch: ScoutBranch;
  role: TroopRole;
  patrol?: string; 
  
  // Extended Profile
  birthDate?: string; // YYYY-MM-DD
  admissionDate?: string; // Date joined the group
  medicalInfo?: string; // Allergies, conditions
  emergencyContact?: string; // "Mom: 9999-9999"
  
  isArchived?: boolean; 
  enrollments?: SectionEnrollment[];
}

export interface AttendanceRecord {
  memberId: string;
  present: boolean;
}

export interface ProgressionRecord {
  code: string;
  date: string;
  notes?: string;
  checkedTasks?: number[]; // NEW: Indices of sub-tasks completed (0, 1, 5...)
}

export interface MemberProgress {
  memberId: string;
  achievements: ProgressionRecord[];
  lastUpdate?: string;
}

// Estado do Reconhecimento de Ramo (Cruzeiro do Sul / Lis de Ouro).
export interface MemberReconhecimentoState {
  memberId: string;
  reconhecimentoId: number;
  ramoId: number;
  requisitosConcluidos: number[]; // ordens (1-based) dos requisitos check
  dataConquista?: string;          // ISO date quando todos requisitos foram cumpridos
  homologadoPor?: string;
  idadeNaConquista?: number;       // R9: registrar idade no momento da homologação para auditoria
  notas?: string;
  // R1: histórico de homologações para evitar perda de dado quando usuário desmarca requisito
  historicoConquistas?: { data: string; revertidoEm?: string; idade?: number }[];
  lastUpdate: string;
}

// Estado de progressão por bloco POR 2025+ (acompanhamento individual).
// R8: schemaVersion permite migração quando estrutura de blocos muda em build_progressao_db.py.
export interface MemberBlocoState {
  schemaVersion?: number;          // Atual: 1. Ausente = legado pré-versionamento.
  memberId: string;
  blocoId: number;
  ramoId: number;
  fixasConcluidas: number[];      // índices (1-based) das ações fixas concluídas
  variaveisConcluidas: number[];  // índices (1-based) das ações variáveis concluídas
  substituidoPor?: { tipo: 'especialidade' | 'insignia'; nome: string };
  dataConclusao?: string;         // ISO date quando bloco fechou
  avaliador?: string;
  notas?: string;
  lastUpdate: string;             // ISO timestamp
}

export const MEMBER_BLOCO_STATE_SCHEMA_VERSION = 1;

export interface SpecialtyEvidence {
  requisitoPosicao: number;
  texto: string;
  data: string;
}

export type SpecialtyRequirementStatus =
  'em_estudo' |
  'cumprido' |
  'validado' |
  'revisar';

export interface SpecialtyRequirementEvaluation {
  requisitoPosicao: number;
  status: SpecialtyRequirementStatus;
  avaliador?: string;
  data: string;
  notas?: string;
}

export interface MemberSpecialtyState {
  memberId: string;
  especialidadeId: number;
  requisitosConcluidos: number[];
  nivelAtual?: 1 | 2 | 3;
  dataConclusao?: string;
  avaliador?: string;
  notas?: string;
  evidencias?: SpecialtyEvidence[];
  avaliacoes?: SpecialtyRequirementEvaluation[];
  lastUpdate: string;
}

export interface CalendarEvent {
  id: string;
  sectionId?: string;
  date: string;
  planId?: string; 
  title: string; 
  branch: ScoutBranch;
  attendance: AttendanceRecord[];
  notes?: string;
}

// --- SPECIALTIES & CATALOG ---

export enum AxisType {
  LIFE_SKILLS = 'Habilidades para a Vida',
  ENVIRONMENT = 'Meio Ambiente',
  PEACE = 'Paz e Desenvolvimento',
  HEALTH = 'Saúde e Bem-Estar',
  PROGRESSION = 'Progressão Pessoal',
  LOBINHO_INSIGNIA = 'Insígnia de Interesse Especial (Lobinho)',
  ESCOTEIRO_INSIGNIA = 'Insígnia de Interesse Especial (Escoteiro)',
  SENIOR_INSIGNIA = 'Insígnia de Interesse Especial (Sênior)',
  PIONEER_INSIGNIA = 'Insígnia de Interesse Especial (Pioneiro)',
  GLOBAL_INSIGNIA = 'Insígnia Global',
  GENERAL = 'Geral'
}

export interface Specialty {
  id: string;
  title: string;
  axis: AxisType;
  branch: 'lobinho_escoteiro' | 'senior_pioneiro';
  description: string;
  requirements?: string[];
  topics?: string[];
  steps?: {
    know: string[];
    do: string[];
    share: string[];
  };
  prerequisites?: string[];
}

export interface CatalogItem {
  code: string;
  description: string;
  guidance?: string; // New: Full text with requirements
  isSpecialty?: boolean;
  officialSpecialtyId?: number;
  specialtyBranch?: string;
  specialtyLevel?: 1 | 2 | 3;
  isProject?: boolean;
  specialtyData?: Specialty;
  // R7: marcação de progresso quando o catálogo é carregado para um membro específico
  progressStatus?: 'concluido' | 'em_andamento' | 'pendente';
  progressDate?: string; // ISO yyyy-mm-dd quando foi concluído
}

export interface CatalogCategory {
  name: string;
  items: CatalogItem[];
}

export const getBranchColor = (branch: ScoutBranch): string => {
  switch (branch) {
    case ScoutBranch.LOBINHO: return 'blue-500';
    case ScoutBranch.ESCOTEIRO: return 'green-600';
    case ScoutBranch.SENIOR: return 'red-800';
    case ScoutBranch.PIONEIRO: return 'red-600';
    default: return 'gray-500';
  }
};

export const getBranchIcon = (branch: ScoutBranch): string => {
   switch (branch) {
    case ScoutBranch.LOBINHO: return '🐺';
    case ScoutBranch.ESCOTEIRO: return '⚜️';
    case ScoutBranch.SENIOR: return '🏔️';
    case ScoutBranch.PIONEIRO: return '🔱';
    default: return '⛺';
  }
};
