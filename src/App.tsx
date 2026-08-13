import React, { useState, useEffect, useRef } from 'react';
import { ScoutBranch, MeetingPlan, ObjectiveItem, CatalogAnnotation, AppConfig, UserProfile, ScoutSection, CatalogItem, PlanningMode, LlmProviderId } from './types';
import { BRANCHES } from './constants';
import { getPlanningCatalog, buildCatalogDigest } from './services/catalogService';
import { generateScoutPlanRouted as generateScoutPlan, listAvailableModels as getAvailableModels, getActiveProvider, getProviderById, normalizeProviderId, GEMINI_STUDIO_URL, GEMINI_KEY_HELP } from './services/llmProvider';
import { getDefaultGeminiModel, pickPreferredGeminiModel, hasGeminiCredentials } from './services/geminiService';
import { pickXaiFastModel } from './services/xaiService';
import { getAnnotations, saveAnnotation, getAppConfig, saveAppConfig, normalizePath, downloadProgressBackup, importProgressBackup, saveSectionAsync, getAllMemberBlocoStates, downloadLocalAppBackup, importLocalAppBackup, ensureWorkspaceMetadata, acquireSectionEditLock, releaseSectionEditLock, renewSectionEditLock, EditLock, getSectionsAsync, saveUserAsync } from './services/storageService';
import { getProgressionDetail } from './services/progressionDetailService';
import { PlanDisplay } from './components/PlanDisplay';
import { Catalog } from './components/Catalog';
import { SetupWizard } from './components/SetupWizard';
import { MembersManager } from './components/MembersManager';
import { CalendarView } from './components/CalendarView';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { LoginScreen } from './components/profiles/LoginScreen';
import { ProfileConfig } from './components/profiles/ProfileConfig';
import { WebAuthGate } from './components/profiles/WebAuthGate';
import { WebAccountsPanel } from './components/profiles/WebAccountsPanel';
import { CyclePlanner } from './components/CyclePlanner';
import { SpecialtyEncyclopedia } from './components/SpecialtyEncyclopedia';
import { ProgressaoBlocos2025 } from './components/ProgressaoBlocos2025';
import { BibliotecaView } from './components/BibliotecaView';
import { GlobalSearch } from './components/GlobalSearch';
import { HelpPanel } from './components/HelpPanel';
import { ConfirmDialog } from './components/ConfirmDialog';
import { getPermissions, getRoleLabel, isOperationalProfile } from './services/roleService';
import { SectionProgressOverview } from './components/SectionProgressOverview';
import { normalizeOllamaBaseUrl } from './services/ollamaUrlSecurity';
import { buildCustomObjective } from './services/customObjectiveMatcher';
import { applyOperationalSchedule, defaultScheduleOptions, estimateOperationalMinutes } from './services/meetingScheduleService';
import { forceDownloadHtml } from './services/htmlExportCommon';
import { useGlobalEvents } from './hooks/useGlobalEvents';
import { clampSettingNumber } from './utils/clamp';
import { isSpecialtyCode } from './utils/specialtyCodes';
import { isWebApp } from './services/platform';
import { clearWebSession, restoreWebSessionAccount, webAccountToProfile } from './services/webAuthService';
import { clearGeminiOAuthAccessToken, tryRequestGeminiAccessToken } from './services/googleAuth';

function App() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [detailItem, setDetailItem] = useState<{code: string, desc: string} | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentSection, setCurrentSection] = useState<ScoutSection | null>(null);
  const [view, setView] = useState<'LOGIN' | 'PROFILE_CONFIG' | 'DASHBOARD' | 'GENERATOR' | 'CATALOG' | 'MEMBERS' | 'CALENDAR' | 'REPORTS' | 'CYCLE' | 'ENCYCLOPEDIA' | 'BLOCOS_2025' | 'BIBLIOTECA'>('LOGIN');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBranch, setSelectedBranch] = useState<ScoutBranch | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [folderInput, setFolderInput] = useState('');
  const [activeGeneratorSystem, setActiveGeneratorSystem] = useState<'POR_2025' | 'LEGACY_2020'>('POR_2025');
  const [totalDuration, setTotalDuration] = useState<number>(120); 
  const [activityCount, setActivityCount] = useState<number>(3);
  const [participantsCount, setParticipantsCount] = useState<number>(20);
  const [scheduleStartTime, setScheduleStartTime] = useState(defaultScheduleOptions.startTime);
  const [includeOpening, setIncludeOpening] = useState(defaultScheduleOptions.includeOpening);
  const [includeBreaks, setIncludeBreaks] = useState(defaultScheduleOptions.includeBreaks);
  const [includeClosing, setIncludeClosing] = useState(defaultScheduleOptions.includeClosing);
  const [narrativeTheme, setNarrativeTheme] = useState<string>('');
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [referenceUrls] = useState<string[]>([]);
  /** from_selection = partir dos itens; auto_link = tema livre e amarra códigos. */
  const [planningMode, setPlanningMode] = useState<PlanningMode>('auto_link');
  const [selectedObjectives, setSelectedObjectives] = useState<ObjectiveItem[]>([]);
  const [customObjective, setCustomObjective] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'PROG' | 'SPEC'>('ALL');
  // U2: categorias expandidas no catálogo (default: tudo colapsado)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const toggleCategory = (name: string) => setExpandedCategories(prev => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(getDefaultGeminiModel());
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [plan, setPlan] = useState<MeetingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [levelSelectorTarget, setLevelSelectorTarget] = useState<{ item: CatalogItem, catName: string } | null>(null);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [llmProgress, setLlmProgress] = useState<string | null>(null);
  const [llmStartedAt, setLlmStartedAt] = useState<number | null>(null);
  const [llmElapsed, setLlmElapsed] = useState<number>(0);
  const generationRef = useRef({ id: 0, cancelled: false });
  const [htmlPreview, setHtmlPreview] = useState<{ fileName: string; html: string } | null>(null);
  // Providers: Gemini (1º) → Ollama local → Ollama Cloud → xAI (stub)
  const [providerInput, setProviderInput] = useState<LlmProviderId>('gemini');
  const [ollamaUrlInput, setOllamaUrlInput] = useState<string>('http://localhost:11434');
  const [ollamaCloudKeyInput, setOllamaCloudKeyInput] = useState<string>('');
  const [xaiKeyInput, setXaiKeyInput] = useState<string>('');
  const [ollamaContextInput, setOllamaContextInput] = useState<number>(262144);
  const [ollamaOutputInput, setOllamaOutputInput] = useState<number>(12288);
  const [syncModeInput, setSyncModeInput] = useState<'local' | 'sharedFolder'>('local');
  const [ollamaStatus, setOllamaStatus] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testingOllama, setTestingOllama] = useState<boolean>(false);
  // V1: dropdown POR 2025+ controlado (acessível por teclado/touch)
  const [por2025MenuOpen, setPor2025MenuOpen] = useState(false);
  // V3: nav mobile colapsável
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // V7: abas de configurações
  const [settingsTab, setSettingsTab] = useState<'ia' | 'dados' | 'avancado' | 'contas'>('ia');
  // Painel de Ajuda
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: 'info' | 'error' } | null>(null);
  const [editLockConflict, setEditLockConflict] = useState<EditLock | null>(null);
  const [webAuthReady, setWebAuthReady] = useState(!isWebApp());
  const [ownEditLock, setOwnEditLock] = useState<EditLock | null>(null);
  const [confirmacao, setConfirmacao] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const isLockedForCurrentUser = !!editLockConflict;

  const showToast = (message: string, kind: 'info' | 'error' = 'info') => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 4000);
  };

  const startProcessFeedback = (message: string) => {
    setLlmStartedAt(Date.now());
    setLlmProgress(message);
  };

  const finishProcessFeedback = (message: string) => {
    setLlmProgress(message);
    window.setTimeout(() => {
      setLlmProgress(null);
      setLlmStartedAt(null);
      setLlmElapsed(0);
    }, 4000);
  };

  useGlobalEvents({
    onSearchOpen: () => setShowSearch(true),
    onMenuClose: () => setPor2025MenuOpen(false),
    onMobileNavClose: () => setMobileNavOpen(false),
    onToast: (message, kind) => showToast(message, kind),
    onLlmProgress: (message) => setLlmProgress(message),
    onLlmStartedAtSet: (updater) => setLlmStartedAt(updater),
    onLlmReset: () => {
      setLlmProgress(null);
      setLlmStartedAt(null);
      setLlmElapsed(0);
    },
    onHtmlPreview: (preview) => setHtmlPreview(preview),
  });

  useEffect(() => {
    const config = getAppConfig();
    setAppConfig(config);
    // Annotations
    getAnnotations();
    if (config) {
        setApiKeyInput(config.apiKey);
        setFolderInput(config.dataFolder);
        setProviderInput(normalizeProviderId(config.llmProvider));
        setOllamaUrlInput(config.ollamaBaseUrl || 'http://localhost:11434');
        setOllamaCloudKeyInput(config.ollamaCloudApiKey || '');
        setXaiKeyInput(config.xaiApiKey || '');
        setOllamaContextInput(config.ollamaGenerationContext || 262144);
        setOllamaOutputInput(config.ollamaGenerationOutput || 12288);
        setSyncModeInput(config.syncMode || 'local');
    }
  }, []);

  useEffect(() => {
    if (!isWebApp()) return;
    const account = restoreWebSessionAccount();
    if (account) {
      const profile = webAccountToProfile(account);
      void saveUserAsync(profile);
      setCurrentUser(profile);
    }
    setWebAuthReady(true);
  }, []);

  useEffect(() => {
    if (!llmStartedAt) return;
    const updateElapsed = () => setLlmElapsed(Math.floor((Date.now() - llmStartedAt) / 1000));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [llmStartedAt]);

  const testOllamaConnection = async () => {
    setTestingOllama(true);
    setOllamaStatus(null);
    const safeUrl = normalizeOllamaBaseUrl(ollamaUrlInput);
    if (!safeUrl) {
      setOllamaStatus({ ok: false, error: 'Use apenas http://localhost, 127.0.0.1 ou ::1.' });
      setTestingOllama(false);
      return;
    }
    // Persiste URL antes de testar (ollamaService lê de getAppConfig).
    if (appConfig) {
      const tmp = { ...appConfig, ollamaBaseUrl: safeUrl };
      saveAppConfig(tmp);
      setAppConfig(tmp);
      setOllamaUrlInput(safeUrl);
    }
    const provider = getProviderById('ollama');
    const status = await provider.isReachable();
    setOllamaStatus(status);
    if (status.ok) {
      const models = await provider.listModels();
      setAvailableModels(models);
      if (models.length > 0) setSelectedModel(models[0]);
    }
    setTestingOllama(false);
  };

  const showLegacy = !!appConfig?.showLegacy;

  // R16: ao desligar o modo legado, se a seção atual está em LEGACY_2020, o useEffect
  // abaixo a ressetaria para LEGACY. Para evitar o loop, também migramos a seção
  // localmente para POR_2025 (com confirmação).
  const applyLegacyToggle = async (enabled: boolean) => {
    if (!appConfig) return;
    if (!enabled && currentSection?.progressionSystem === 'LEGACY_2020') {
      const migratedSection = { ...currentSection, progressionSystem: 'POR_2025' as const, migrationDate: new Date().toISOString() };
      await saveSectionAsync(migratedSection);
      setCurrentSection(migratedSection);
    }
    const updated = { ...appConfig, showLegacy: enabled };
    saveAppConfig(updated);
    setAppConfig(updated);
    if (!enabled) setActiveGeneratorSystem('POR_2025');
  };

  const toggleLegacy = async (enabled: boolean) => {
    if (!appConfig) return;
    if (!enabled && currentSection?.progressionSystem === 'LEGACY_2020') {
      setConfirmacao({
        title: 'Migrar seção para POR 2025+',
        message:
          `A seção atual "${currentSection.name}" está em POR 2020 (legado).\n\n` +
          'Desligar o modo legado migra esta seção para POR 2025+. Os dados de progressão legados ficam preservados, mas a UI passa a usar a estrutura nova de 18 blocos.',
        confirmText: 'Migrar',
        danger: true,
        onConfirm: async () => {
          await applyLegacyToggle(enabled);
          setConfirmacao(null);
        },
      });
      return;
    }
    await applyLegacyToggle(enabled);
  };

  const fetchModels = async () => {
      const providerId = normalizeProviderId(appConfig?.llmProvider || 'gemini');
      if (providerId === 'gemini' && !hasGeminiCredentials()) return;
      if (providerId === 'xai-oauth' && !appConfig?.xaiApiKey && !xaiKeyInput.trim()) return;
      setIsRefreshingModels(true);
      try {
          const models = await getAvailableModels();
          setAvailableModels(models);
          if (models.length > 0) {
              if (providerId === 'gemini') {
                  setSelectedModel(pickPreferredGeminiModel(models, selectedModel));
              } else if (providerId === 'xai-oauth') {
                  setSelectedModel(pickXaiFastModel(models, appConfig?.xaiOAuthModel || selectedModel));
              } else {
                  const preferred = providerId === 'ollama-cloud' ? appConfig?.ollamaCloudModel : appConfig?.ollamaModel;
                  setSelectedModel(preferred && models.includes(preferred) ? preferred : models[0]);
              }
          }
      } catch (e) { console.error(e); } finally { setIsRefreshingModels(false); }
  };

  useEffect(() => { fetchModels(); }, [appConfig?.apiKey, appConfig?.llmProvider, appConfig?.ollamaBaseUrl, appConfig?.ollamaCloudApiKey, appConfig?.xaiApiKey]);

  useEffect(() => {
    if (!ownEditLock || !currentUser || appConfig?.syncMode !== 'sharedFolder') return;
    const renew = async () => {
      const result = await renewSectionEditLock(
        ownEditLock.sectionId,
        currentUser.id,
        currentUser.name,
      );
      if (result.conflict) {
        setOwnEditLock(null);
        setEditLockConflict(result.conflict);
        setView('REPORTS');
        showToast('Outro adulto assumiu a edição. Esta seção entrou em modo consulta.', 'error');
      } else if (result.lock) {
        setOwnEditLock(result.lock);
      }
    };
    const interval = window.setInterval(renew, 10 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [ownEditLock?.sectionId, currentUser?.id, appConfig?.syncMode]);
  useEffect(() => {
    // R16: nunca force LEGACY_2020 quando a flag showLegacy está desligada.
    // Se a seção está em LEGACY_2020 e o usuário não tem o modo legado ativo, mostra POR_2025.
    if (currentSection?.progressionSystem) {
      if (currentSection.progressionSystem === 'LEGACY_2020' && !appConfig?.showLegacy) {
        setActiveGeneratorSystem('POR_2025');
      } else {
        setActiveGeneratorSystem(currentSection.progressionSystem);
      }
    }
  }, [currentSection, appConfig?.showLegacy]);

  useEffect(() => {
    const handleCycleGen = (e: any) => {
        const { theme, objective } = e.detail;
        setNarrativeTheme(theme);
        setView('GENERATOR');
        setStep(2);
        if (objective) {
            const catalog = getPlanningCatalog(selectedBranch || ScoutBranch.LOBINHO, activeGeneratorSystem);
            for (const cat of catalog) {
                const item = cat.items.find(i => i.code === objective);
                if (item) {
                    addObjective(item.description, cat.name, item.code, undefined, item);
                    break;
                }
            }
        }
    };
    window.addEventListener('paxtu:generate_from_cycle', handleCycleGen);

    // R7: handler para gerar plano focado nas pendências de um jovem específico
    const handleTrackerGen = async (e: any) => {
      const { memberId, branch, blocoFoco } = e.detail || {};
      if (!memberId || !branch) return;
      const states = await getAllMemberBlocoStates(memberId);
      setSelectedBranch(branch);
      setActiveGeneratorSystem('POR_2025');
      setSelectedObjectives([]);
      setError(null);
      setView('GENERATOR');
      setStep(2);
      // Tema sugerido: bloco em foco ou primeiro pendente
      const blocoAlvo = blocoFoco || states.find(s => !s.dataConclusao)?.blocoId || 1;
      setNarrativeTheme(`Reunião focada no Bloco ${blocoAlvo}`);
      // Prepopula objetivos com até 3 ações pendentes do bloco em foco
      const catalog = getPlanningCatalog(branch, 'POR_2025');
      // Robustez: aceitar tanto "B7:" quanto "B7 " ou "Bloco 7" — varia entre catálogos
      const blocoCat = catalog.find(c =>
        c.name.startsWith(`B${blocoAlvo}:`) ||
        c.name.startsWith(`B${blocoAlvo} `) ||
        c.name.toLowerCase().includes(`bloco ${blocoAlvo}`)
      );
      if (blocoCat) {
        const state = states.find(s => s.blocoId === blocoAlvo);
        const fixasFeitas = state?.fixasConcluidas || [];
        const variaveisFeitas = state?.variaveisConcluidas || [];
        const pendentes = blocoCat.items.filter(item => {
          const m = item.code.match(/^B\d+\.(F|V)(\d+)$/);
          if (!m) return false;
          const idx = parseInt(m[2], 10);
          return m[1] === 'F' ? !fixasFeitas.includes(idx) : !variaveisFeitas.includes(idx);
        }).slice(0, 3);
        for (const it of pendentes) {
          addObjective(it.description, blocoCat.name, it.code, undefined, it);
        }
      }
      // Adiciona contexto no customInstruction
      const concluidosCount = states.filter(s => s.dataConclusao).length;
      setCustomInstruction(
        `Plano contextualizado para um jovem que já concluiu ${concluidosCount} de 18 blocos. ` +
        `Foque nas pendências do Bloco ${blocoAlvo}. Não proponha repetir o que já foi concluído.`
      );
    };
    window.addEventListener('paxtu:generate-from-tracker', handleTrackerGen);

    return () => {
      window.removeEventListener('paxtu:generate_from_cycle', handleCycleGen);
      window.removeEventListener('paxtu:generate-from-tracker', handleTrackerGen);
    };
  }, [selectedBranch, activeGeneratorSystem]);

  const handleSetupComplete = async (config: AppConfig) => {
    saveAppConfig(config);
    await ensureWorkspaceMetadata(config);
    setAppConfig(config);
    setApiKeyInput(config.apiKey);
    setFolderInput(config.dataFolder);
    setProviderInput(normalizeProviderId(config.llmProvider));
    setOllamaUrlInput(config.ollamaBaseUrl || 'http://localhost:11434');
    setOllamaCloudKeyInput(config.ollamaCloudApiKey || '');
    setXaiKeyInput(config.xaiApiKey || '');
    setOllamaContextInput(config.ollamaGenerationContext || 262144);
    setOllamaOutputInput(config.ollamaGenerationOutput || 12288);
    setSyncModeInput(config.syncMode || 'local');
    setView('PROFILE_CONFIG');
  };

  const handleLogin = async (user: UserProfile, section: ScoutSection) => {
      setCurrentUser(user);
      setCurrentSection(section);
      setSelectedBranch(section.branch);
      if (appConfig) ensureWorkspaceMetadata(appConfig, user.name);
      if (section.id !== 'GLOBAL' && appConfig?.syncMode === 'sharedFolder') {
        const result = await acquireSectionEditLock(section.id, user.id, user.name);
        setEditLockConflict(result.conflict || null);
        setOwnEditLock(result.lock || null);
        if (result.conflict) {
          setView('REPORTS');
          return;
        }
      }
      setView(isOperationalProfile(user) ? 'DASHBOARD' : 'REPORTS');
  };

  const handleWebAuthenticated = (profile: UserProfile) => {
    setCurrentUser(profile);
    setWebAuthReady(true);
    void tryRequestGeminiAccessToken();
  };

  const enterAppAsWebUser = async (user: UserProfile) => {
    const permissions = getPermissions(user);
    if (permissions.isGlobal) {
      await handleLogin(user, { id: 'GLOBAL', name: 'Visão Global', branch: ScoutBranch.ESCOTEIRO });
      return;
    }
    const sections = await getSectionsAsync();
    const section = sections.find(item => item.id === user.sectionId) || sections[0];
    if (!section) {
      setView('PROFILE_CONFIG');
      return;
    }
    await handleLogin(user, section);
  };

  useEffect(() => {
    if (!isWebApp() || !webAuthReady || !currentUser || currentSection) return;
    if (!appConfig?.isConfigured) return;
    if (view === 'PROFILE_CONFIG') return;
    void enterAppAsWebUser(currentUser);
  }, [webAuthReady, currentUser?.id, currentSection?.id, appConfig?.isConfigured, view]);

  const assumeSectionEditLock = () => {
    if (!currentSection || !currentUser) return;
    setConfirmacao({
      title: 'Assumir edição da seção',
      message:
        `A seção está marcada como em edição por ${editLockConflict?.userName}.\n\n` +
        'Assuma apenas se você combinou a troca ou sabe que o outro acesso ficou aberto por engano.',
      confirmText: 'Assumir edição',
      danger: true,
      onConfirm: async () => {
        const result = await acquireSectionEditLock(
          currentSection.id,
          currentUser.id,
          currentUser.name,
          true,
        );
        setOwnEditLock(result.lock || null);
        setEditLockConflict(null);
        setConfirmacao(null);
        setView('DASHBOARD');
      },
    });
  };

  const doLogout = async () => {
    if (ownEditLock && currentUser) {
      await releaseSectionEditLock(ownEditLock.sectionId, currentUser.id);
    }
    // Cancela qualquer geracao em voo e fecha modais/overlays para nao deixar
    // nada flutuando sobre a tela de login.
    generationRef.current.cancelled = true;
    setOwnEditLock(null);
    setEditLockConflict(null);
    setCurrentUser(null);
    setCurrentSection(null);
    setDetailItem(null);
    setHtmlPreview(null);
    setLevelSelectorTarget(null);
    setShowSettings(false);
    setShowSearch(false);
    setShowHelp(false);
    setLoading(false);
    setLlmProgress(null);
    setLlmStartedAt(null);
    setLlmElapsed(0);
    setView('LOGIN');
    if (isWebApp()) {
      clearWebSession();
      clearGeminiOAuthAccessToken();
    }
    reset();
  };

  const handleLogout = () => {
    const dirty = selectedObjectives.length > 0 || (plan && step === 3);
    if (dirty) {
      setConfirmacao({
        title: 'Sair do perfil',
        message: 'Há trabalho em andamento: objetivos selecionados ou plano não salvo.\n\nSair mesmo assim?',
        confirmText: 'Sair',
        danger: true,
        onConfirm: () => {
          doLogout();
          setConfirmacao(null);
        },
      });
      return;
    }
    doLogout();
  };

  const handleUpdateSettings = async () => {
    if (!appConfig) return;
    const prov = normalizeProviderId(providerInput);
    const newConfig: AppConfig = {
      ...appConfig,
      apiKey: apiKeyInput,
      dataFolder: normalizePath(folderInput),
      llmProvider: prov === 'ollama-local' ? 'ollama-local' : prov,
      ollamaBaseUrl: normalizeOllamaBaseUrl(ollamaUrlInput) || 'http://localhost:11434',
      ollamaModel: prov === 'ollama-local' ? selectedModel : appConfig.ollamaModel,
      ollamaCloudApiKey: ollamaCloudKeyInput.trim(),
      ollamaCloudModel: prov === 'ollama-cloud' ? selectedModel : appConfig.ollamaCloudModel,
      xaiApiKey: xaiKeyInput.trim(),
      xaiOAuthModel: prov === 'xai-oauth' ? selectedModel : appConfig.xaiOAuthModel,
      ollamaGenerationContext: clampSettingNumber(ollamaContextInput, 262144, 32768, 1048576),
      ollamaGenerationOutput: clampSettingNumber(ollamaOutputInput, 12288, 2048, 65536),
      syncMode: syncModeInput,
    };
    saveAppConfig(newConfig);
    await ensureWorkspaceMetadata(newConfig, currentUser?.name);
    setAppConfig(newConfig);
    setFolderInput(newConfig.dataFolder);
    setOllamaContextInput(newConfig.ollamaGenerationContext || 262144);
    setOllamaOutputInput(newConfig.ollamaGenerationOutput || 12288);
    setShowSettings(false);
  };

  const initiateAddObjective = (item: CatalogItem, catName: string) => {
      if (isSpecialtyCode(item.code)) {
          setLevelSelectorTarget({ item, catName });
      } else {
          addObjective(item.description, catName, item.code, undefined, item);
      }
  };

  const addObjective = (description: string, category: string, code?: string, duration?: number, extraData?: any) => {
    const newObj: ObjectiveItem = { id: Date.now().toString() + Math.random(), description, category, code, source: 'Catalog', userDuration: duration, ...extraData };
    setSelectedObjectives(prev => {
      if (code && prev.some(o => o.code === code)) return prev;
      return [...prev, newObj];
    });
  };

  const addCustomObjective = () => {
    const description = customObjective.trim();
    if (!description) return;
    const custom = buildCustomObjective(description, displayCatalog);
    setSelectedObjectives(prev => [...prev, custom]);
    setCustomObjective('');
  };
  
  const removeObjective = (id: string) => setSelectedObjectives(prev => prev.filter(o => o.id !== id));

  const clearSelectedObjectives = () => {
    if (selectedObjectives.length < 3) {
      setSelectedObjectives([]);
      return;
    }
    setConfirmacao({
      title: 'Limpar objetivos',
      message: `Remover ${selectedObjectives.length} objetivos da seleção?`,
      confirmText: 'Limpar',
      danger: true,
      onConfirm: () => {
        setSelectedObjectives([]);
        setConfirmacao(null);
      },
    });
  };

  // handleSaveAnnotation removed as unused

  const isActiveGeneration = (runId: number): boolean =>
    generationRef.current.id === runId && !generationRef.current.cancelled;

  const cancelGeneration = () => {
    generationRef.current.cancelled = true;
    window.fileSystem?.cancelOllamaRequests?.();
    setLoading(false);
    setLlmStartedAt(null);
    setLlmElapsed(0);
    setLlmProgress('Geração cancelada. Se o modelo local já estava respondendo, o resultado atrasado será ignorado.');
    window.setTimeout(() => setLlmProgress(null), 5000);
  };

  const handleGenerate = async () => {
    if (!selectedBranch) {
      showToast('Escolha o ramo antes de gerar.', 'error');
      setError('Escolha o ramo antes de gerar.');
      return;
    }
    const runId = Date.now();
    generationRef.current = { id: runId, cancelled: false };
    const activeProvider = normalizeProviderId(appConfig?.llmProvider);
    if (activeProvider === 'gemini' && !hasGeminiCredentials()) {
      setError(`Configure a chave do Gemini em Configurações. ${GEMINI_KEY_HELP}`);
      showToast('Configure a chave do Gemini.', 'error');
      setShowSettings(true);
      return;
    }
    if (activeProvider === 'ollama-local' && isWebApp()) {
      setError('Ollama local só funciona no aplicativo desktop. Neste site use Gemini (padrão) ou cole uma chave xAI.');
      showToast('Ollama local só no desktop.', 'error');
      setShowSettings(true);
      return;
    }
    if (activeProvider === 'ollama-local' && !(selectedModel || appConfig?.ollamaModel)) {
      setError('Nenhum modelo Ollama local selecionado.');
      showToast('Selecione um modelo Ollama.', 'error');
      setShowSettings(true);
      return;
    }
    if (activeProvider === 'ollama-cloud' && !appConfig?.ollamaCloudApiKey) {
      setError('Informe a chave Ollama Cloud em Configurações.');
      showToast('Chave Ollama Cloud necessária.', 'error');
      setShowSettings(true);
      return;
    }
    if (activeProvider === 'xai-oauth' && !(appConfig?.xaiApiKey || xaiKeyInput.trim())) {
      setError('Cole sua chave da API xAI em Configurações (fica só neste navegador). Não há login OAuth xAI neste site.');
      showToast('Informe a chave xAI.', 'error');
      setShowSettings(true);
      return;
    }
    const effectiveMode: PlanningMode =
      planningMode === 'from_selection' || planningMode === 'auto_link'
        ? planningMode
        : (selectedObjectives.length > 0 ? 'from_selection' : 'auto_link');

    if (effectiveMode === 'from_selection' && selectedObjectives.length === 0) {
      setError('No modo "A partir da seleção", marque ao menos um item do catálogo — ou mude para "Tema livre + amarra".');
      showToast('Selecione itens ou mude o modo de geração.', 'error');
      return;
    }
    if (effectiveMode === 'auto_link' && !narrativeTheme.trim() && !customInstruction.trim() && selectedObjectives.length === 0) {
      // Ainda permite gerar (tema livre), mas avisa que tema ajuda
      showToast('Dica: informe um tema ou instrução para guiar a IA.', 'info');
    }
    // Guarda final: nunca enviar valores vazios/0/negativos/NaN ao prompt da IA.
    const safeTotalDuration = clampSettingNumber(totalDuration, 120, 30, 600);
    const safeActivityCount = clampSettingNumber(activityCount, 3, 1, 10);
    const safeParticipantsCount = clampSettingNumber(participantsCount, 20, 1, 500);
    const scheduleOptions = {
      ...defaultScheduleOptions,
      startTime: scheduleStartTime,
      includeOpening,
      includeBreaks,
      includeClosing,
    };
    const reservedMinutes = estimateOperationalMinutes(safeActivityCount, scheduleOptions);
    const coreDuration = Math.max(30, safeTotalDuration - reservedMinutes);
    const catalogDigest =
      effectiveMode === 'auto_link'
        ? buildCatalogDigest(getPlanningCatalog(selectedBranch, activeGeneratorSystem))
        : undefined;
    setLoading(true);
    setError(null);
    setLlmStartedAt(Date.now());
    const isOllama = activeProvider === 'ollama-local' || activeProvider === 'ollama-cloud';
    setLlmProgress(
      effectiveMode === 'auto_link'
        ? (isOllama
            ? `Ollama (${activeProvider === 'ollama-cloud' ? 'cloud' : 'local'}): tema livre + amarração…`
            : 'Gemini: tema livre + amarração ao catálogo…')
        : (isOllama
            ? `Ollama (${activeProvider === 'ollama-cloud' ? 'cloud' : 'local'}): a partir da seleção…`
            : 'Gemini: a partir da seleção…')
    );
    try {
      const context = currentSection ? { sectionName: currentSection.name, groupName: appConfig?.profile?.groupName || "Grupo Escoteiro" } : undefined;
      const generatedPlan = await generateScoutPlan({ 
          branch: selectedBranch, 
          totalDuration: coreDuration, 
          narrativeTheme, 
          objectives: selectedObjectives, 
          modelId: selectedModel,
          customInstruction,
          referenceUrls,
          activityCount: safeActivityCount,
          participantsCount: safeParticipantsCount,
          planningMode: effectiveMode,
          catalogDigest,
          context
      });
      if (!isActiveGeneration(runId)) return;
      const scheduledPlan = applyOperationalSchedule(generatedPlan, scheduleOptions);
      if (currentUser) { scheduledPlan.authorId = currentUser.id; scheduledPlan.authorName = currentUser.name; }
      if (currentSection) scheduledPlan.sectionId = currentSection.id;
      setPlan(scheduledPlan);
      setStep(3);
      // Reset unico do banner: reutiliza finishProcessFeedback (mostra a mensagem e
      // limpa progresso/cronometro apos 4s). Evita o timer duplicado anterior.
      finishProcessFeedback('Roteiro gerado e normalizado.');
    } catch (err: any) {
      if (!isActiveGeneration(runId)) return;
      const msg = err?.message || String(err) || 'Falha desconhecida na geração.';
      setError(msg);
      setLlmProgress(`Falha na geração: ${msg}`);
      showToast('Falha ao gerar roteiro. Veja o aviso na tela.', 'error');
    } finally {
      if (generationRef.current.id === runId) setLoading(false);
    }
  };

  const extractLevelRequirements = (text: string | undefined, level: number): string => {
      if (!text) return "Requisitos padrão.";
      // Bug fix: dentro de template-string `\s` e `\d` perdem o escape — precisa duplo backslash
      const regex = new RegExp(`N${level}:\\s*([^N]+)(?=N\\d:|$)`, 'i');
      const match = text.match(regex);
      return (match && match[1]) ? match[1].trim().replace(/[.;]+$/, '') : "Consultar manual.";
  };

  const confirmLevelSelection = (level: number) => {
      if (!levelSelectorTarget) return;
      const { item, catName } = levelSelectorTarget;
      const levelDesc = ` (Nível ${level})`;
      const levelCode = `${item.code}-N${level}`;
      const requirements = extractLevelRequirements(item.guidance, level);
      const extraData = { ...item, requirementsContext: requirements };
      addObjective(`${item.description}${levelDesc}`, catName, levelCode, undefined, extraData);
      setLevelSelectorTarget(null);
  };

  const reset = () => { setStep(1); setPlan(null); setError(null); setSelectedObjectives([]); setNarrativeTheme(''); setSearchTerm(''); setCustomInstruction(''); };

  // Guarda central de navegacao: (1) bloqueia o GERADOR quando a secao esta travada
  // por outro adulto (editLockConflict) e redireciona para consulta; (2) fecha overlays
  // que so fazem sentido dentro do gerador ao trocar de view.
  const navigateTo = (target: typeof view) => {
    const blocked = target === 'GENERATOR' && isLockedForCurrentUser;
    const next = blocked ? 'REPORTS' : target;
    if (next !== 'GENERATOR') {
      setDetailItem(null);
      setLevelSelectorTarget(null);
    }
    setView(next);
  };

  const loadFromCatalog = (savedPlan: MeetingPlan) => { setPlan(savedPlan); navigateTo('GENERATOR'); setStep(3); };

  if (isWebApp() && !webAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Carregando…</div>;
  }
  if (isWebApp() && !currentUser) {
    return <WebAuthGate onAuthenticated={handleWebAuthenticated} />;
  }
  if (!appConfig || !appConfig.isConfigured) return <SetupWizard onComplete={handleSetupComplete} />;
  if (view === 'PROFILE_CONFIG') {
    const backFromStructure = () => {
      if (isWebApp() && currentUser) {
        void enterAppAsWebUser(currentUser);
        return;
      }
      if (currentUser && currentSection) {
        setView(isOperationalProfile(currentUser) ? 'DASHBOARD' : 'REPORTS');
        return;
      }
      setView('LOGIN');
    };
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={backFromStructure} className="mb-6 text-slate-500 hover:text-slate-800">
            {isWebApp() && currentUser ? '→ Entrar no aplicativo' : currentUser ? '← Voltar ao painel' : '← Voltar'}
          </button>
          <ProfileConfig currentAccountId={currentUser?.id} isAdmin={getPermissions(currentUser).isGlobal} />
        </div>
      </div>
    );
  }
  if (!currentUser) return <LoginScreen onLogin={handleLogin} onConfigure={() => setView('PROFILE_CONFIG')} />;

  const permissions = getPermissions(currentUser);
  const isAdmin = permissions.isGlobal;
  // Escopo de secao passado aos componentes: admin ve tudo (undefined), demais ficam
  // restritos a propria secao. Extraido para evitar repeticao e o optional chaining
  // inconsistente espalhado pelas props.
  const scopedSectionId = isAdmin ? undefined : currentSection?.id;
  const roleLabel = getRoleLabel(currentUser?.role);
  const displayCatalog = getPlanningCatalog(selectedBranch || ScoutBranch.ESCOTEIRO, activeGeneratorSystem);
  const currentScheduleOptions = {
    ...defaultScheduleOptions,
    startTime: scheduleStartTime,
    includeOpening,
    includeBreaks,
    includeClosing,
  };
  // Valores clampados apenas para EXIBIR (a reserva e o miolo). O estado bruto dos
  // inputs continua livre para edicao; o clamp definitivo ocorre no onBlur e no handleGenerate.
  const displayTotalDuration = clampSettingNumber(totalDuration, 120, 30, 600);
  const displayActivityCount = clampSettingNumber(activityCount, 3, 1, 10);
  const reservedOperationalMinutes = estimateOperationalMinutes(displayActivityCount, currentScheduleOptions);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans flex flex-col relative">
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} currentView={view} />}
      {htmlPreview && (
        <div className="fixed inset-0 bg-black/70 z-50 p-3 md:p-6 flex flex-col" role="dialog" aria-modal="true">
          <div className="bg-white rounded-t-xl shadow-xl p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-800">Prévia HTML mobile</p>
              <p className="text-[11px] text-slate-500">{htmlPreview.fileName}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => forceDownloadHtml(htmlPreview.fileName, htmlPreview.html)}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold"
              >
                Baixar HTML
              </button>
              <button
                onClick={() => setHtmlPreview(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
          <iframe
            title="Prévia HTML exportado"
            srcDoc={htmlPreview.html}
            sandbox="allow-same-origin"
            className="bg-white rounded-b-xl shadow-xl flex-1 w-full border-0"
          />
        </div>
      )}
      {confirmacao && (
        <ConfirmDialog
          title={confirmacao.title}
          message={confirmacao.message}
          confirmText={confirmacao.confirmText}
          danger={confirmacao.danger}
          onCancel={() => setConfirmacao(null)}
          onConfirm={confirmacao.onConfirm}
        />
      )}
      {toast && (
        <div
          role="status"
          aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
          className={`fixed top-20 right-5 z-[90] px-4 py-2 rounded-lg shadow-lg text-sm font-bold ${
            toast.kind === 'error' ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Banner de progresso de IA (Ollama é lento) */}
      {llmProgress && (
        <div role="status" aria-live="polite" className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-fade-in max-w-[90vw]">
          <span className="animate-spin">⚙️</span>
          <span>{llmProgress}{llmStartedAt ? ` (${llmElapsed}s)` : ''}</span>
          {loading && (
            <button
              onClick={cancelGeneration}
              className="ml-2 bg-white/15 hover:bg-white/25 text-white px-2 py-1 rounded font-bold"
            >
              Cancelar
            </button>
          )}
          <button onClick={() => setLlmProgress(null)} className="ml-2 text-white/70 hover:text-white">×</button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <h3 id="settings-title" className="text-xl font-bold text-gray-800 mb-4">⚙️ Configurações</h3>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-xs" role="alert">{error}</div>}
                <div className="flex border-b mb-4" role="tablist">
                    {([['ia','IA'],['dados','Dados'],['avancado','Avançado'], ...(isWebApp() ? [['contas','Contas'] as const] : [])] as const).map(([id,label]) => (
                        <button key={id} role="tab" aria-selected={settingsTab === id}
                            onClick={() => setSettingsTab(id)}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${settingsTab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                {settingsTab === 'ia' && (
                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs font-bold text-slate-700 mb-2">Provedor de IA <span className="font-normal text-slate-500">(preferência: Gemini → Ollama local → Cloud → xAI)</span></p>
                    {isWebApp() && (
                      <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                        Neste site o padrão é <strong>Gemini Flash-Lite</strong> (barato e rápido). Cole a chave do{' '}
                        <a href={GEMINI_STUDIO_URL} target="_blank" rel="noreferrer" className="text-blue-700 underline">AI Studio</a>
                        {' '}(fica só neste navegador). xAI é extra opcional com chave colada — não há “entrar com xAI”.
                      </p>
                    )}
                    <div className="flex flex-col gap-2 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="provider" checked={normalizeProviderId(providerInput) === 'gemini'} onChange={() => setProviderInput('gemini')} />
                            <span className="text-sm"><strong>1. Gemini</strong> <span className="text-[10px] text-emerald-700 font-bold">recomendado</span> <span className="text-[10px] text-gray-500">— AI Studio, grátis/simples</span></span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="provider" checked={normalizeProviderId(providerInput) === 'ollama-local'} onChange={() => setProviderInput('ollama-local')} />
                            <span className="text-sm"><strong>2. Ollama local</strong> <span className="text-[10px] text-gray-500">— app + porta 11434{isWebApp() ? ' (só desktop)' : ''}</span></span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="provider" checked={normalizeProviderId(providerInput) === 'ollama-cloud'} onChange={() => setProviderInput('ollama-cloud')} />
                            <span className="text-sm"><strong>3. Ollama Cloud</strong> <span className="text-[10px] text-gray-500">— API web + chave ollama.com</span></span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="provider" checked={normalizeProviderId(providerInput) === 'xai-oauth'} onChange={() => setProviderInput('xai-oauth')} />
                            <span className="text-sm"><strong>4. xAI Grok</strong> <span className="text-[10px] text-gray-500">— chave api.x.ai, modelo rápido do catálogo</span></span>
                        </label>
                    </div>

                    {normalizeProviderId(providerInput) === 'gemini' && (
                        <div className="space-y-2">
                            <a href={GEMINI_STUDIO_URL} target="_blank" rel="noreferrer" className="inline-block bg-blue-600 text-white px-3 py-1 rounded font-bold text-[11px]">Obter chave grátis</a>
                            <input type="password" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="API Key Gemini (AI Studio)" />
                            {isWebApp() && (
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                {GEMINI_KEY_HELP} Se o login Google conseguir um token da API Gemini, ele é tentado automaticamente; se CORS ou o app OAuth não permitir, cole a chave aqui.
                              </p>
                            )}
                        </div>
                    )}

                    {normalizeProviderId(providerInput) === 'ollama-local' && (
                        <div className="space-y-2">
                            {isWebApp() && (
                              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                                Ollama local (localhost:11434) só funciona no aplicativo desktop. Neste site escolha Gemini ou cole uma chave xAI / Ollama Cloud.
                              </p>
                            )}
                            <a href="https://ollama.com/download" target="_blank" rel="noreferrer" className="inline-block bg-emerald-700 text-white px-3 py-1 rounded font-bold text-[11px]">Baixar Ollama</a>
                            <p className="text-[11px] text-gray-600">
                                Modelos locais ou <code className="bg-gray-100 px-1">:cloud</code> via app (<code className="bg-gray-100 px-1">ollama signin</code>).
                            </p>
                            <div className="flex gap-2">
                                <input type="text" value={ollamaUrlInput} onChange={(e) => setOllamaUrlInput(e.target.value)} className="flex-1 p-2 border rounded text-sm" placeholder="http://localhost:11434" />
                                <button onClick={testOllamaConnection} disabled={testingOllama} className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-400 text-white px-3 py-1 rounded font-bold text-xs">
                                    {testingOllama ? '...' : 'Testar'}
                                </button>
                            </div>
                            {ollamaStatus && (
                                <p className={`text-[11px] ${ollamaStatus.ok ? 'text-green-700' : 'text-red-700'}`}>
                                    {ollamaStatus.ok ? `✓ Conectado · ${availableModels.length} modelo(s)` : `✗ ${ollamaStatus.error}`}
                                </p>
                            )}
                            {availableModels.length > 0 && (
                                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full p-2 border rounded text-sm">
                                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            )}
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <label className="text-[11px] font-bold text-slate-700">
                                    Contexto
                                    <input type="number" min={32768} max={1048576} step={32768} value={ollamaContextInput} onChange={(e) => setOllamaContextInput(Number(e.target.value))} className="mt-1 w-full p-2 border rounded text-sm" />
                                </label>
                                <label className="text-[11px] font-bold text-slate-700">
                                    Saída/parte
                                    <input type="number" min={2048} max={65536} step={1024} value={ollamaOutputInput} onChange={(e) => setOllamaOutputInput(Number(e.target.value))} className="mt-1 w-full p-2 border rounded text-sm" />
                                </label>
                            </div>
                        </div>
                    )}

                    {normalizeProviderId(providerInput) === 'ollama-cloud' && (
                        <div className="space-y-2">
                            <a href="https://ollama.com/settings/keys" target="_blank" rel="noreferrer" className="inline-block bg-teal-700 text-white px-3 py-1 rounded font-bold text-[11px]">Criar chave ollama.com</a>
                            <p className="text-[11px] text-gray-600">Chamada direta à API web (não precisa do app Ollama rodando).</p>
                            <input type="password" value={ollamaCloudKeyInput} onChange={(e) => setOllamaCloudKeyInput(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="API Key Ollama Cloud" />
                            <button onClick={async () => {
                              // salva key temporariamente para o teste
                              if (appConfig) {
                                const tmp = { ...appConfig, llmProvider: 'ollama-cloud' as const, ollamaCloudApiKey: ollamaCloudKeyInput.trim() };
                                saveAppConfig(tmp);
                                setAppConfig(tmp);
                              }
                              setTestingOllama(true);
                              const status = await getProviderById('ollama-cloud').isReachable();
                              setOllamaStatus(status);
                              if (status.ok) {
                                const models = await getProviderById('ollama-cloud').listModels();
                                setAvailableModels(models);
                                if (models[0]) setSelectedModel(models[0]);
                              }
                              setTestingOllama(false);
                            }} disabled={testingOllama} className="bg-teal-700 hover:bg-teal-600 disabled:bg-slate-400 text-white px-3 py-1 rounded font-bold text-xs">
                              {testingOllama ? '...' : 'Testar Cloud'}
                            </button>
                            {ollamaStatus && (
                                <p className={`text-[11px] ${ollamaStatus.ok ? 'text-green-700' : 'text-red-700'}`}>
                                    {ollamaStatus.ok ? `✓ Cloud · ${availableModels.length} modelo(s)` : `✗ ${ollamaStatus.error}`}
                                </p>
                            )}
                            {availableModels.length > 0 && (
                                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full p-2 border rounded text-sm">
                                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            )}
                        </div>
                    )}

                    {normalizeProviderId(providerInput) === 'xai-oauth' && (
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Extra opcional. Cole a chave da API xAI (console.x.ai). Fica só neste navegador — nunca no repositório.
                            Não implementamos “entrar com X”: OAuth xAI exige SuperGrok/X Premium+ e um Client ID oficial nosso.
                          </p>
                          <input type="password" value={xaiKeyInput} onChange={(e) => setXaiKeyInput(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="API Key xAI" />
                          {availableModels.length > 0 && (
                            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full p-2 border rounded text-sm">
                              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          )}
                        </div>
                    )}
                </div>
                )}

                {settingsTab === 'dados' && (
                <>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Pasta de dados</label>
                    <input type="text" value={folderInput} onChange={(e) => setFolderInput(e.target.value)} className="w-full p-3 border rounded-lg text-sm bg-gray-50" placeholder="Pasta de dados" />
                </div>
                <div className="mt-4 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Modo de compartilhamento</label>
                    <select
                        value={syncModeInput}
                        onChange={e => setSyncModeInput(e.target.value as 'local' | 'sharedFolder')}
                        className="w-full p-3 border rounded-lg text-sm bg-white"
                    >
                        <option value="local">Uso local</option>
                        <option value="sharedFolder">Pasta compartilhada em nuvem</option>
                    </select>
                    {syncModeInput === 'sharedFolder' && (
                        <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded p-2 leading-relaxed">
                            Indicado para Google Drive/OneDrive/Dropbox sem servidor. Evite duas chefias editando ao mesmo tempo; aguarde a sincronização concluir antes de trocar o operador.
                        </p>
                    )}
                </div>
                </>
                )}

                {settingsTab === 'avancado' && (
                <>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={showLegacy} onChange={(e) => toggleLegacy(e.target.checked)} className="mt-1 w-4 h-4" />
                        <div>
                            <p className="text-sm font-bold text-amber-900">Ativar modo legado (POR 2020)</p>
                            <p className="text-[11px] text-amber-700 mt-1">
                                Padrão: desligado. O app opera no POR 2025+. Quando ligado, expõe o sistema antigo apenas para consulta histórica (Trilha, Rumo, Pata-Tenra etc.).
                            </p>
                        </div>
                    </label>
                </div>

                {/* Backup/Restore de progressão por jovem */}
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm font-bold text-slate-700 mb-2">📦 Backup do app local</p>
                    <p className="text-[11px] text-slate-600 mb-3">
                        Exporta dados locais do app para transporte entre máquinas. Use o backup completo para troca de máquina e o backup de progressão para auditoria POR 2025+.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                              startProcessFeedback('Exportando backup completo...');
                              downloadLocalAppBackup();
                              finishProcessFeedback('Backup completo exportado.');
                              showToast('Backup completo exportado.');
                            }}
                            className="flex-1 px-3 py-2 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-700"
                        >
                            ⬇️ Backup completo
                        </button>
                        <button
                            onClick={async () => {
                              startProcessFeedback('Exportando backup de progressão...');
                              await downloadProgressBackup();
                              finishProcessFeedback('Backup de progressão exportado.');
                              showToast('Backup de progressão exportado.');
                            }}
                            className="flex-1 px-3 py-2 bg-emerald-700 text-white rounded text-xs font-bold hover:bg-emerald-600"
                        >
                            ⬇️ Progressão
                        </button>
                        <input
                            id="import-backup"
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 10 * 1024 * 1024) {
                                    showToast('Backup recusado: arquivo muito grande.');
                                    e.target.value = '';
                                    return;
                                }
                                try {
                                    startProcessFeedback('Importando backup...');
                                    const text = await file.text();
                                    const backup = JSON.parse(text);
                                    if (backup.kind === 'paxtu-local-app-backup') {
                                        const imported = importLocalAppBackup(backup);
                                        finishProcessFeedback(`Backup completo importado: ${imported} chaves.`);
                                        showToast(`Backup completo importado: ${imported} chaves.`);
                                    } else {
                                        const result = await importProgressBackup(backup);
                                        finishProcessFeedback(`Backup de progressão importado: ${result.blocosImportados} blocos.`);
                                        showToast(`Importado: ${result.blocosImportados} blocos · ${result.reconhecimentosImportados} reconhecimentos.`);
                                    }
                                } catch {
                                    finishProcessFeedback('Falha ao importar backup.');
                                    showToast('Backup recusado: JSON inválido ou formato não reconhecido.');
                                }
                                e.target.value = '';
                            }}
                        />
                        <label
                            htmlFor="import-backup"
                            className="flex-1 px-3 py-2 bg-blue-700 text-white rounded text-xs font-bold hover:bg-blue-600 text-center cursor-pointer"
                        >
                            ⬆️ Importar
                        </label>
                    </div>
                </div>
                </>
                )}

                {settingsTab === 'contas' && isWebApp() && (
                  <WebAccountsPanel currentAccountId={currentUser?.id} isAdmin={getPermissions(currentUser).isGlobal} />
                )}
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-gray-600">Cancelar</button>
                    <button onClick={handleUpdateSettings} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold">Salvar</button>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 shadow-inner">⚜️</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{currentUser?.name}</h1>
              <p className="text-[10px] font-medium uppercase text-green-400">
                {roleLabel} • {isAdmin ? 'Visão global' : currentSection?.name}
              </p>
            </div>
            <span
              className={`ml-3 px-2.5 py-1 text-[10px] font-black uppercase rounded-md tracking-wider border ${
                activeGeneratorSystem === 'POR_2025'
                  ? 'bg-green-900/40 text-green-300 border-green-700'
                  : 'bg-amber-900/40 text-amber-300 border-amber-700'
              }`}
              title={activeGeneratorSystem === 'POR_2025' ? 'Sistema novo (padrão)' : 'Sistema legado — apenas para consulta'}
            >
              {activeGeneratorSystem === 'POR_2025' ? 'POR 2025+' : 'POR 2020 (legado)'}
            </span>
          </div>
          <button
            className="md:hidden text-gray-300 hover:text-white p-2 text-xl"
            onClick={() => setMobileNavOpen(o => !o)}
            aria-label="Abrir menu"
            aria-expanded={mobileNavOpen}
          >☰</button>
          <nav className={`${mobileNavOpen ? 'absolute top-16 left-0 right-0 bg-slate-900 flex-col p-4 gap-2 flex z-30 border-t border-slate-700' : 'hidden'} md:static md:flex md:flex-row md:items-center md:gap-2 md:p-0 md:border-0`}>
            <button onClick={() => { navigateTo((permissions.canPlan && !isLockedForCurrentUser) ? 'DASHBOARD' : 'REPORTS'); setMobileNavOpen(false); }} className="text-sm font-medium transition-all px-3 py-1 rounded-md text-gray-400 hover:text-white text-left">Painel</button>
            {permissions.canPlan && !isLockedForCurrentUser && (
              <button onClick={() => { navigateTo('GENERATOR'); if(step===3) reset(); setMobileNavOpen(false); }} className="text-sm font-medium transition-all px-3 py-1 rounded-md text-gray-400 hover:text-white text-left">Gerar</button>
            )}
            {permissions.canPlan && !isLockedForCurrentUser && (
              <button onClick={() => { navigateTo('CYCLE'); setMobileNavOpen(false); }} className="text-sm text-gray-400 hover:text-white px-3 text-left">Ciclo</button>
            )}
            {permissions.canPlan && !isLockedForCurrentUser && (
              <button onClick={() => { navigateTo('CATALOG'); setMobileNavOpen(false); }} className="text-sm text-gray-400 hover:text-white px-3 text-left">Roteiros</button>
            )}
            {permissions.canRecordEvaluation && !isLockedForCurrentUser && (
              <button onClick={() => { navigateTo('CALENDAR'); setMobileNavOpen(false); }} className="text-sm text-gray-400 hover:text-white px-3 text-left">Agenda</button>
            )}
            {permissions.canEditYouth && !isLockedForCurrentUser && (
              <button onClick={() => { navigateTo('MEMBERS'); setMobileNavOpen(false); }} className="text-sm text-gray-400 hover:text-white px-3 text-left">Efetivo</button>
            )}
            {/* Menu agrupado POR 2025+ — controlado (V1) */}
            <div className="relative" data-por2025-menu>
              <button
                onClick={(e) => { e.stopPropagation(); setPor2025MenuOpen(o => !o); }}
                aria-expanded={por2025MenuOpen}
                aria-haspopup="menu"
                className="text-sm font-medium text-gray-300 hover:text-white px-3 py-1 rounded-md hover:bg-slate-800 flex items-center gap-1"
              >
                POR 2025+ <span className="text-xs" aria-hidden="true">▾</span>
              </button>
              {por2025MenuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1 bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200 min-w-[220px] z-50">
                <button role="menuitem" onClick={() => { setShowSearch(true); setPor2025MenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between border-b">
                  <span className="flex items-center gap-2"><span className="text-base">🔎</span> Buscar</span>
                  <kbd className="text-[10px] bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 font-mono">Ctrl+K</kbd>
                </button>
                <button role="menuitem" onClick={() => { navigateTo('BLOCOS_2025'); setPor2025MenuOpen(false); setMobileNavOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2 border-b">
                  <span className="text-base">🧭</span> Blocos de Aprendizagem
                </button>
                <button role="menuitem" onClick={() => { navigateTo('ENCYCLOPEDIA'); setPor2025MenuOpen(false); setMobileNavOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2 border-b">
                  <span className="text-base">📘</span> Enciclopédia de Especialidades
                </button>
                <button role="menuitem" onClick={() => { navigateTo('BIBLIOTECA'); setPor2025MenuOpen(false); setMobileNavOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
                  <span className="text-base">📚</span> Biblioteca (10 livros)
                </button>
              </div>
              )}
            </div>
            {permissions.canConfigure && (
              <button onClick={() => { setView('PROFILE_CONFIG'); setMobileNavOpen(false); }} className="text-sm text-gray-400 hover:text-white px-3 text-left">Estrutura</button>
            )}
            <button onClick={() => { navigateTo('REPORTS'); setMobileNavOpen(false); }} className="text-sm text-gray-400 hover:text-white px-3 text-left">Relatórios</button>
            <button onClick={() => setShowHelp(true)} aria-label="Ajuda" title="Ajuda (roteiro, FAQ, IA)" className="text-gray-400 hover:text-white p-2 text-xl">❓</button>
            {permissions.canConfigure && (
              <button onClick={() => setShowSettings(true)} aria-label="Configurações" className="text-gray-400 hover:text-white p-2 text-xl">⚙️</button>
            )}
            <button onClick={handleLogout} aria-label="Sair" title="Sair" className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center ml-2 hover:bg-red-800"><span aria-hidden="true">🚪</span></button>
          </nav>
        </div>
      </header>

      {editLockConflict && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-3 text-sm">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <strong>Seção em edição por {editLockConflict.userName}.</strong>{' '}
              Lock ativo até {new Date(editLockConflict.expiresAt).toLocaleTimeString()}.
              Use consulta/relatórios ou combine a troca antes de alterar dados.
            </div>
            <button
              onClick={() => setView('REPORTS')}
              className="text-xs font-bold text-amber-800 border border-amber-300 rounded px-2 py-1 self-start md:self-auto"
            >
              Modo consulta
            </button>
            <button
              onClick={assumeSectionEditLock}
              className="text-xs font-bold text-white bg-amber-700 rounded px-2 py-1 self-start md:self-auto"
            >
              Assumir edição
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-4 md:p-8 flex-1">
        <div className={view === 'MEMBERS' ? 'w-full max-w-[1800px] mx-auto' : 'max-w-6xl mx-auto'}>
          {view === 'DASHBOARD' && currentSection && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-400">Painel da chefia</p>
                <h2 className="text-2xl font-black text-slate-800">{currentSection.name}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Visão rápida para decidir próxima reunião, acompanhar idade, progresso e reconhecimento.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {permissions.canPlan && !isLockedForCurrentUser && (
                    <button onClick={() => navigateTo('GENERATOR')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-bold">Gerar atividade</button>
                  )}
                  {permissions.canPlan && !isLockedForCurrentUser && (
                    <button onClick={() => navigateTo('CYCLE')} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Planejar ciclo</button>
                  )}
                  <button onClick={() => navigateTo('REPORTS')} className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">Relatórios</button>
                </div>
              </div>
              <SectionProgressOverview
                sectionId={scopedSectionId}
                branch={currentSection.branch}
              />
            </div>
          )}
          {view === 'CATALOG' && <Catalog onLoadPlan={loadFromCatalog} onBack={() => navigateTo('GENERATOR')} />}
          {view === 'MEMBERS' && <MembersManager sectionId={scopedSectionId} isAdmin={isAdmin} />}
          {view === 'CALENDAR' && (currentSection ? <CalendarView sectionId={scopedSectionId} branch={currentSection.branch} isAdmin={isAdmin} /> : <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center text-amber-800">Sem seção selecionada. Faça login com um perfil de chefia vinculado a uma seção.</div>)}
          {view === 'REPORTS' && (currentSection ? <ReportsDashboard sectionId={scopedSectionId} branch={currentSection.branch} isAdmin={isAdmin} /> : <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center text-amber-800">Sem seção selecionada para gerar relatórios.</div>)}
          {view === 'CYCLE' && (currentSection ? <CyclePlanner branch={currentSection.branch} section={currentSection} /> : <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center text-amber-800">Sem seção selecionada. O planejador de ciclo precisa de uma seção ativa.</div>)}
          {view === 'ENCYCLOPEDIA' && <SpecialtyEncyclopedia onClose={() => navigateTo('GENERATOR')} />}
          {view === 'BLOCOS_2025' && <ProgressaoBlocos2025 onClose={() => navigateTo('GENERATOR')} />}
          {view === 'BIBLIOTECA' && <BibliotecaView onClose={() => navigateTo('DASHBOARD')} />}
          
          {/* Guarda central: o gerador nunca renderiza quando a secao esta travada por
              outro adulto, mesmo que algum roteamento por evento/menu tente abri-lo. */}
          {view === 'GENERATOR' && isLockedForCurrentUser && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center text-amber-800">
              Seção em modo consulta. O gerador fica bloqueado enquanto outro adulto edita esta seção.
            </div>
          )}
          {view === 'GENERATOR' && !isLockedForCurrentUser && (
            <>
              {step === 1 && (
                <div className="animate-fade-in py-6">
                  <h2 className="text-center text-3xl font-bold mb-12">Ramo de Atividade</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {BRANCHES.map((b) => (
                      <button key={b.id} onClick={() => { setSelectedBranch(b.id); setStep(2); }} className={`bg-white p-6 rounded-2xl shadow-sm border-b-4 ${b.color.replace('bg-', 'border-')} text-left hover:-translate-y-1 transition-all`}>
                        <div className="text-4xl mb-2">{b.id === 'Lobinho' ? '🐺' : b.id === 'Escoteiro' ? '⚜️' : b.id === 'Sênior' ? '🏔️' : '🔱'}</div>
                        <h3 className="font-bold">{b.label}</h3><p className="text-xs text-gray-400">{b.age}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {step === 2 && selectedBranch && (
                <div className="space-y-6">
                  <div className="flex justify-between bg-white p-4 rounded-xl border items-center">
                    <button onClick={() => setStep(1)} className="text-sm font-bold text-gray-500">← Voltar</button>
                    {showLegacy ? (
                      <div className="flex bg-slate-100 rounded-lg p-1">
                          <button onClick={() => setActiveGeneratorSystem('POR_2025')} className={`px-3 py-1 text-[10px] rounded-md transition-all ${activeGeneratorSystem === 'POR_2025' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-slate-400'}`}>POR 2025+</button>
                          <button onClick={() => setActiveGeneratorSystem('LEGACY_2020')} className={`px-3 py-1 text-[10px] rounded-md transition-all ${activeGeneratorSystem === 'LEGACY_2020' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-400'}`}>LEGADO 2020</button>
                      </div>
                    ) : (
                      <span className="px-3 py-1 text-[10px] rounded-md bg-green-50 text-green-700 font-bold border border-green-200">POR 2025+</span>
                    )}
                    <div className="flex gap-2 bg-slate-900 p-1.5 rounded-lg items-center">
                        <label htmlFor="model-select" className="text-white text-xs font-bold">Modelo:</label>
                        <select id="model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="bg-transparent text-white text-xs outline-none border-none">
                            {availableModels.length === 0 && <option value="" className="text-black">Nenhum modelo — configure a IA</option>}
                            {availableModels.map(m => <option key={m} value={m} className="text-black">{m}</option>)}
                        </select>
                        {isRefreshingModels && <span className="text-white text-xs animate-spin" aria-hidden="true">⟳</span>}
                        <button onClick={fetchModels} aria-label="Recarregar modelos" className="text-white text-xs">🔄</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-8 bg-white rounded-2xl border flex flex-col min-h-[600px] overflow-hidden shadow-sm">
                        <div className="p-4 bg-gray-50 border-b space-y-3">
                            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                              <input type="text" placeholder="Pesquisar catálogo..." className="flex-1 p-2 border rounded-lg text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                              <div className="flex flex-1 gap-2">
                                <input type="text" placeholder="Atividade personalizada..." className="flex-1 p-2 border rounded-lg text-sm" value={customObjective} onChange={(e) => setCustomObjective(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCustomObjective(); }} />
                                <button type="button" onClick={addCustomObjective} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700" title="Adiciona e envia sugestões de vínculo para a IA">Amarrar</button>
                              </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setFilterType('ALL')} className={`px-3 py-1 text-[10px] font-bold rounded border ${filterType==='ALL' ? 'bg-slate-800 text-white' : 'text-gray-400'}`}>TODOS</button>
                                <button onClick={() => setFilterType('PROG')} className={`px-3 py-1 text-[10px] font-bold rounded border ${filterType==='PROG' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>PROGRESSÃO</button>
                                <button onClick={() => setFilterType('SPEC')} className={`px-3 py-1 text-[10px] font-bold rounded border ${filterType==='SPEC' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>ESPECIALIDADES</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/20">
                            {displayCatalog.map((cat, idx) => {
                                let filtered = cat.items;
                                if (filterType === 'PROG') {
                                    filtered = cat.items.filter(i => !isSpecialtyCode(i.code));
                                }
                                if (filterType === 'SPEC') {
                                    filtered = cat.items.filter(i => isSpecialtyCode(i.code) || i.code.startsWith('INS-'));
                                }

                                filtered = filtered.filter(i => i.description.toLowerCase().includes(searchTerm.toLowerCase()) || i.code.toLowerCase().includes(searchTerm.toLowerCase()));
                                if (filtered.length === 0) return null;

                                const isSpecialtyCategory = filtered.some(item => isSpecialtyCode(item.code));

                                // U2: auto-expandir se busca está ativa OU se há item já selecionado neste grupo
                                const hasSearch = searchTerm.trim().length > 0;
                                const hasSelectedHere = filtered.some(it => selectedObjectives.some(o => o.code && it.code && o.code.startsWith(it.code)));
                                const isExpanded = expandedCategories.has(cat.name) || hasSearch || hasSelectedHere;
                                const selectedInCat = filtered.filter(it => selectedObjectives.some(o => o.code && it.code && o.code.startsWith(it.code))).length;

                                return (
                                    <div key={idx} className={`bg-white border rounded-xl overflow-hidden mb-3 ${isSpecialtyCategory ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-green-400'}`}>
                                        <button
                                            onClick={() => toggleCategory(cat.name)}
                                            className="w-full bg-slate-50 px-4 py-2 flex justify-between items-center border-b hover:bg-slate-100 transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                                <span className="text-[11px] font-black uppercase text-slate-700">{cat.name}</span>
                                            </span>
                                            <span className="flex gap-1 items-center">
                                                {selectedInCat > 0 && (
                                                    <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
                                                        {selectedInCat} selec.
                                                    </span>
                                                )}
                                                <span className="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600 font-bold">{filtered.length}</span>
                                            </span>
                                        </button>
                                        {isExpanded && (
                                            <div className="divide-y divide-gray-50">
                                                {filtered.map((item) => (
                                                    <div key={item.code} className="p-3 flex items-center justify-between hover:bg-slate-50 group">
                                                        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => initiateAddObjective(item, cat.name)}>
                                                            <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">{item.code}</span>
                                                            <span className="text-sm font-medium text-slate-700">{item.description}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => setDetailItem({ code: item.code, desc: item.description })} className="text-gray-300 hover:text-indigo-600" title="Detalhes">ⓘ</button>
                                                            <button onClick={() => initiateAddObjective(item, cat.name)} className={`w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${selectedObjectives.some(o => o.code && item.code && o.code.startsWith(item.code)) ? 'bg-blue-600 text-white rotate-45' : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600'}`}>+</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="lg:col-span-4 sticky top-24 bg-white rounded-2xl shadow-xl border flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 shrink-0 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-slate-800 uppercase text-xs">📋 Planejamento</span>
                            {selectedObjectives.length > 0 && (
                              <button onClick={clearSelectedObjectives} className="text-red-400 hover:text-red-600 text-[10px] font-bold">Limpar seleção</button>
                            )}
                          </div>
                          <div className="flex gap-1 p-0.5 bg-slate-200/80 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setPlanningMode('auto_link')}
                              className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${planningMode === 'auto_link' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                              title="Cria atividades pelo tema e amarra códigos do catálogo"
                            >
                              Tema livre + amarra
                            </button>
                            <button
                              type="button"
                              onClick={() => setPlanningMode('from_selection')}
                              className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${planningMode === 'from_selection' ? 'bg-white shadow text-green-700' : 'text-slate-500'}`}
                              title="Parte dos itens que você marcou no catálogo"
                            >
                              A partir da seleção
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug">
                            {planningMode === 'auto_link'
                              ? 'Não precisa marcar itens. Informe tema/instrução; a IA cria atividades e vincula progressão/especialidades do catálogo.'
                              : `Marque itens no catálogo (+). Selecionados: ${selectedObjectives.length}.`}
                          </p>
                        </div>
                        <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-slate-50/50 custom-scrollbar">
                            {planningMode === 'auto_link' && selectedObjectives.length === 0 ? (
                              <p className="text-center text-slate-400 text-xs mt-6 px-2">
                                Seleção opcional. Você pode só preencher o tema abaixo e gerar — ou marcar preferências no catálogo.
                              </p>
                            ) : selectedObjectives.length === 0 ? (
                              <p className="text-center text-slate-400 text-xs mt-10">Vazio — clique + no catálogo para incluir objetivos.</p>
                            ) : (
                                selectedObjectives.map(obj => (
                                    <div key={obj.id} className="bg-white p-3 rounded-lg border mb-2 flex justify-between items-start shadow-sm"><div className="flex-1"><p className="text-[9px] font-black text-gray-400 uppercase">{obj.category}</p><p className="text-xs font-bold text-slate-700">{obj.description}</p></div><button onClick={() => removeObjective(obj.id)} className="text-gray-300 hover:text-red-500 ml-2">✕</button></div>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t space-y-3 shrink-0 overflow-y-auto max-h-[55vh] bg-white">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Tema da reunião</label>
                              <input
                                type="text"
                                value={narrativeTheme}
                                onChange={(e) => setNarrativeTheme(e.target.value)}
                                placeholder={planningMode === 'auto_link' ? 'Ex: Noite de nós e orientação' : 'Opcional'}
                                className="mt-1 w-full p-2 border rounded-lg text-xs bg-slate-50 outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Duração (min)</label>
                                    <input type="number" min="30" step="15" value={totalDuration} onChange={(e) => setTotalDuration(Number(e.target.value))} onBlur={() => setTotalDuration(v => clampSettingNumber(v, 120, 30, 600))} className="w-full p-2 border rounded-lg text-xs bg-slate-50 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Atividades</label>
                                    <input type="number" min="1" max="10" value={activityCount} onChange={(e) => setActivityCount(Number(e.target.value))} onBlur={() => setActivityCount(v => clampSettingNumber(v, 3, 1, 10))} className="w-full p-2 border rounded-lg text-xs bg-slate-50 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Jovens</label>
                                    <input type="number" min="1" value={participantsCount} onChange={(e) => setParticipantsCount(Number(e.target.value))} onBlur={() => setParticipantsCount(v => clampSettingNumber(v, 20, 1, 500))} className="w-full p-2 border rounded-lg text-xs bg-slate-50 outline-none" />
                                </div>
                            </div>
                            <details className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                              <summary className="text-[10px] font-black text-indigo-800 uppercase cursor-pointer">Horário e cerimonial</summary>
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-[10px] font-bold text-indigo-800 uppercase">Início/bandeira</label>
                                  <input type="time" value={scheduleStartTime} onChange={(e) => setScheduleStartTime(e.target.value || '15:30')} className="p-1 border border-indigo-200 rounded text-xs bg-white font-bold" />
                                </div>
                                <label className="flex items-center gap-2 text-[11px] text-slate-700 font-bold">
                                  <input type="checkbox" checked={includeOpening} onChange={(e) => setIncludeOpening(e.target.checked)} />
                                  IBOA e abertura da bandeira
                                </label>
                                <label className="flex items-center gap-2 text-[11px] text-slate-700 font-bold">
                                  <input type="checkbox" checked={includeBreaks} onChange={(e) => setIncludeBreaks(e.target.checked)} />
                                  Banheiro/hidratação entre atividades
                                </label>
                                <label className="flex items-center gap-2 text-[11px] text-slate-700 font-bold">
                                  <input type="checkbox" checked={includeClosing} onChange={(e) => setIncludeClosing(e.target.checked)} />
                                  Encerramento da bandeira
                                </label>
                                <p className="text-[10px] text-indigo-700">
                                  Reserva: {reservedOperationalMinutes} min · miolo IA: {Math.max(30, displayTotalDuration - reservedOperationalMinutes)} min
                                </p>
                              </div>
                            </details>
                            <textarea value={customInstruction} onChange={(e) => setCustomInstruction(e.target.value)} placeholder="Instruções para a IA..." className="w-full p-2 border rounded-lg text-xs bg-slate-50 outline-none" rows={2}></textarea>
                            {error && (
                              <div className="bg-red-50 border border-red-200 text-red-800 text-[11px] rounded-lg p-2 whitespace-pre-wrap" role="alert">
                                {error}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={handleGenerate}
                              disabled={loading}
                              className={`w-full py-3 rounded-xl font-bold text-white uppercase text-xs shadow-md ${loading ? 'bg-slate-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                              {loading ? 'Criando...' : '✨ Gerar Roteiro'}
                            </button>
                            {loading && (
                              <button type="button" onClick={cancelGeneration} className="w-full py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-100">
                                Cancelar geração
                              </button>
                            )}
                        </div>
                    </div>
                  </div>
                </div>
              )}
              {step === 3 && plan && (
                <PlanDisplay
                  key={plan.id}
                  plan={plan}
                  onReset={reset}
                  onRegenerate={handleGenerate}
                  isGenerating={loading}
                />
              )}
            </>
          )}
        </div>
      </main>
      
      {/* Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 border max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6"><span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-mono text-sm">{detailItem.code}</span><button onClick={() => setDetailItem(null)} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">✕</button></div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">{detailItem.desc}</h3>
                <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 mb-6 italic text-slate-600 text-sm leading-relaxed whitespace-pre-line">{getProgressionDetail(detailItem.code) || "Orientação detalhada em processamento."}</div>
                <button onClick={() => setDetailItem(null)} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">Entendi</button>
            </div>
        </div>
      )}

      {/* Level Selector Modal for Generator */}
      {levelSelectorTarget && (
        <div className="fixed inset-0 bg-black/20 z-[60] flex items-center justify-center backdrop-blur-sm animate-fade-in" onClick={() => setLevelSelectorTarget(null)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-96 transform scale-100 transition-all border border-slate-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-center font-bold text-gray-800 mb-1">Selecionar Nível de Foco</h3>
                <p className="text-center text-xs text-gray-400 mb-4 font-mono">{levelSelectorTarget.item.description}</p>
                
                <div className="space-y-3">
                    {[1, 2, 3].map(lvl => {
                        const reqText = extractLevelRequirements(levelSelectorTarget.item.guidance, lvl);
                        let btnColor = 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50';
                        let icon = '⚪';
                        if (lvl === 3) { icon = '🥇'; }
                        if (lvl === 2) { icon = '🥈'; }
                        if (lvl === 1) { icon = '🥉'; }

                        return (
                            <button 
                                key={lvl}
                                onClick={() => confirmLevelSelection(lvl)}
                                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${btnColor} group`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold flex items-center gap-2">{icon} Nível {lvl}</span>
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">Selecionar</span>
                                </div>
                                <div className="text-xs italic text-slate-500 line-clamp-2">{reqText}</div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
export default App;
