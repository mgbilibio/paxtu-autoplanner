import React, { useState, useEffect, useRef } from 'react';
import { MeetingPlan, Activity, EducationalArea, GenerationSeed } from '../types';
import { savePlanToCatalog } from '../services/storageService';
import { hasMeaningfulEvaluation, isBoilerplateEvaluation, normalizePlanForUse } from '../services/planNormalizationService';
import { exportMeetingPlanHtml } from '../services/meetingPlanHtmlExport';
import { ConfirmDialog } from './ConfirmDialog';
import { isCeremonialActivity } from '../services/activityBriefs';
import { hasGenerationSeed } from '../services/generationSeed';
import { CronogramaBlock, headerFromPlan } from './CronogramaBlock';
import { formatPaperDuration, resolveMeetingStartTime, stampScheduleTimes } from '../services/meetingScheduleService';

interface Props {
  plan: MeetingPlan;
  onReset: () => void;
  onRegenerate: () => void;
  onRegenerateFromSeed?: (seed: GenerationSeed) => void;
  onUseSeedInPlanner?: (seed: GenerationSeed) => void;
  onRegenerateActivity?: (index: number, activity: Activity, currentPlan: MeetingPlan) => Promise<MeetingPlan>;
  isGenerating?: boolean;
  fallbackSectionId?: string;
  fallbackUnitName?: string;
  initiallySaved?: boolean;
  initialSaveError?: string | null;
}

const saveErrorMessage = (err: unknown): string =>
  (err instanceof Error && err.message) || String(err) || 'Falha ao salvar o roteiro no catálogo.';

export const PlanDisplay: React.FC<Props> = ({
  plan: initialPlan,
  onReset,
  onRegenerate,
  onRegenerateFromSeed,
  onUseSeedInPlanner,
  onRegenerateActivity,
  isGenerating,
  fallbackSectionId,
  fallbackUnitName,
  initiallySaved,
  initialSaveError,
}) => {
  const [plan, setPlan] = useState<MeetingPlan>(normalizePlanForUse(initialPlan));
  const [isSaved, setIsSaved] = useState(!!initiallySaved);
  const [saveError, setSaveError] = useState<string | null>(initialSaveError || null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmActivityIndex, setConfirmActivityIndex] = useState<number | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  // Autosave: rascunho gravado 2s após última edição, sem precisar clicar Salvar
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  // Ref sempre apontando para o plano atual: o save de unmount usa este valor
  // em vez da closure do primeiro render (que descartaria edicoes recentes).
  const planRef = useRef(plan);
  planRef.current = plan;
  const fallbackSectionIdRef = useRef(fallbackSectionId);
  fallbackSectionIdRef.current = fallbackSectionId;

  const applySavedMeta = (saved: MeetingPlan) => {
    setPlan(prev => ({
      ...prev,
      id: saved.id,
      sectionId: saved.sectionId,
      createdAt: saved.createdAt,
      authorId: saved.authorId,
      authorName: saved.authorName,
    }));
  };

  const persistPlan = async (): Promise<MeetingPlan | null> => {
    try {
      const saved = await savePlanToCatalog(planRef.current, fallbackSectionIdRef.current);
      applySavedMeta(saved);
      planRef.current = { ...planRef.current, ...saved, activities: planRef.current.activities };
      setSaveError(null);
      dirtyRef.current = false;
      return saved;
    } catch (err) {
      const msg = saveErrorMessage(err);
      setSaveError(msg);
      setIsSaved(false);
      return null;
    }
  };

  const handleSave = async () => {
    const saved = await persistPlan();
    if (saved) setIsSaved(true);
  };

  const handleExportHtml = async () => {
    exportMeetingPlanHtml(plan);
    if (isSaved) return;
    const saved = await persistPlan();
    if (saved) setIsSaved(true);
  };

  // Persiste automaticamente quando o plano muda — debounce 2s
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const saved = await savePlanToCatalog(plan, fallbackSectionIdRef.current);
        applySavedMeta(saved);
        setAutoSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setSaveError(null);
        dirtyRef.current = false;
      } catch (err) {
        setSaveError(saveErrorMessage(err));
      }
    }, 2000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [plan]);

  // Salva pendência ao desmontar (ex: usuário clica Voltar antes do debounce disparar)
  useEffect(() => {
    return () => {
      if (dirtyRef.current && autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        savePlanToCatalog(planRef.current, fallbackSectionIdRef.current).catch(err => {
          console.error('Falha ao salvar roteiro ao sair:', err);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // V8: qualquer mutação invalida o "Salvo no Catálogo ✓" e marca para autosave
  const markDirty = () => {
    dirtyRef.current = true;
    if (isSaved) setIsSaved(false);
  };

  const mutatePlan = (updater: (p: MeetingPlan) => MeetingPlan) => {
    setPlan(p => updater(p));
    markDirty();
  };

  const restampPlan = (next: MeetingPlan, startTime?: string): MeetingPlan =>
      stampScheduleTimes(next, startTime || resolveMeetingStartTime(next));

  const updateActivity = (index: number, field: keyof Activity, value: any) => {
      // Forma funcional: lê o estado mais recente, não a closure do render.
      setPlan(prev => {
          const newActivities = [...prev.activities];
          newActivities[index] = { ...newActivities[index], [field]: value };
          const next = { ...prev, activities: newActivities };
          return field === 'durationMinutes' ? restampPlan(next) : next;
      });
      markDirty();
  };

  const updateActivityEvaluation = (index: number, field: string, value: any) => {
      // Forma funcional: lê o estado mais recente, não a closure do render.
      setPlan(prev => {
          const newActivities = [...prev.activities];
          const current = newActivities[index].evaluation || {
              acompanhamento: '',
              avaliacaoJovens: '',
              avaliacaoChefia: '',
              requisitosObservaveis: [],
              criteriosDeAceite: [],
              evidenciasSugeridas: [],
          };
          newActivities[index] = {
              ...newActivities[index],
              evaluation: { ...current, [field]: value },
          };
          return { ...prev, activities: newActivities };
      });
      markDirty();
  };

  const lines = (value: string): string[] =>
      value.split('\n').map(v => v.trim()).filter(Boolean);

  const removeActivity = (index: number) => {
      mutatePlan(prev => restampPlan({ ...prev, activities: prev.activities.filter((_, i) => i !== index) }));
  };

  const addActivity = () => {
      const newActivity: Activity = {
          _uid: `act-new-${Date.now()}`,
          title: "Nova Atividade",
          description: "Descrição da atividade...",
          durationMinutes: 15,
          materials: [],
          educationalArea: EducationalArea.CARATER,
          progressionObjective: "",
          responsible: "",
          evaluation: {
              acompanhamento: '',
              avaliacaoJovens: '',
              avaliacaoChefia: '',
              requisitosObservaveis: [],
              criteriosDeAceite: [],
              evidenciasSugeridas: [],
          },
      };
      mutatePlan(prev => restampPlan({ ...prev, activities: [...prev.activities, newActivity] }));
  };

  const meetingStart = resolveMeetingStartTime(plan);
  const formatHHMM = (mins: number) => {
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  };
  const activityRanges = (() => {
    const hasClock = !!(plan.meetingStartTime || plan.activities.some(a => a.scheduledStartTime));
    let clockMins = 0;
    if (hasClock) {
      const [hh, mm] = meetingStart.split(':').map(Number);
      clockMins = ((hh || 0) * 60) + (mm || 0);
    }
    let fallbackMins = 0;
    return plan.activities.map(a => {
      if (a.scheduledStartTime) {
        return formatPaperDuration(a.scheduledStartTime, a.durationMinutes);
      }
      if (hasClock) {
        const start = clockMins;
        clockMins += a.durationMinutes || 0;
        const hh = String(Math.floor(start / 60) % 24).padStart(2, '0');
        const mm = String(start % 60).padStart(2, '0');
        return formatPaperDuration(`${hh}:${mm}`, a.durationMinutes);
      }
      const start = fallbackMins;
      fallbackMins += a.durationMinutes || 0;
      return `${formatHHMM(start)} → ${formatHHMM(fallbackMins)}`;
    });
  })();

  const cardTone = (act: Activity): string => {
    if (act.operationalType === 'opening') return 'bg-blue-50 border-blue-200';
    if (act.operationalType === 'break') return 'bg-cyan-50 border-cyan-200';
    if (act.operationalType === 'closing') return 'bg-indigo-50 border-indigo-200';
    return 'bg-white border-slate-200';
  };

  const bubbleTone = (act: Activity): string => {
    if (act.operationalType === 'opening') return 'border-blue-600 text-blue-700 bg-blue-50';
    if (act.operationalType === 'break') return 'border-cyan-600 text-cyan-700 bg-cyan-50';
    if (act.operationalType === 'closing') return 'border-indigo-600 text-indigo-700 bg-indigo-50';
    return 'border-indigo-600 text-indigo-700 bg-white';
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-in border border-slate-200">
      {confirmRegenerate && (
        <ConfirmDialog
          title="Gerar novamente"
          message="Gerar de novo com o pedido salvo? Se você já carregou o pedido no painel e editou o cronograma, usamos o que está no painel agora. O roteiro atual fica na tela até o novo chegar. Se a geração falhar, o atual permanece."
          confirmText="Gerar"
          danger
          onCancel={() => setConfirmRegenerate(false)}
          onConfirm={() => {
            setConfirmRegenerate(false);
            if (plan.generationSeed && onRegenerateFromSeed) {
              onRegenerateFromSeed(plan.generationSeed);
            } else {
              onRegenerate();
            }
          }}
        />
      )}
      {confirmActivityIndex !== null && (
        <ConfirmDialog
          title="Refazer esta atividade"
          message={
            confirmActivityIndex !== null && plan.activities[confirmActivityIndex]?.redoNote?.trim()
              ? `Refazer só esta atividade com o pedido do quadro? As outras ficam. A nota permanece para ajustar e clicar de novo.`
              : 'Refazer só esta atividade? As outras ficam.'
          }
          confirmText="Refazer"
          onCancel={() => setConfirmActivityIndex(null)}
          onConfirm={() => {
            const index = confirmActivityIndex;
            setConfirmActivityIndex(null);
            if (index === null || !onRegenerateActivity) return;
            const current = plan.activities[index];
            if (!current) return;
            setRegeneratingIndex(index);
            onRegenerateActivity(index, current, plan)
              .then(nextPlan => {
                setPlan(normalizePlanForUse(nextPlan));
                markDirty();
              })
              .catch(() => {})
              .finally(() => setRegeneratingIndex(null));
          }}
        />
      )}
      {/* Header Actions */}
      <div className="bg-slate-900 p-4 flex justify-between items-center sticky top-0 z-20 shadow-md no-print">
        <div className="flex items-center gap-3">
          <button onClick={onReset} className="text-slate-400 hover:text-white text-sm font-bold">← Voltar</button>
          {autoSavedAt && !isSaved && <span className="text-[10px] text-emerald-300 italic" title="Rascunho gravado automaticamente">💾 Autosalvo {autoSavedAt}</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
            <button
                onClick={() => setConfirmRegenerate(true)}
                disabled={isGenerating}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-amber-500 text-amber-900 hover:bg-amber-400 transition-all"
                title="Re-dispara a IA com o pedido salvo neste roteiro"
            >
                {isGenerating ? 'Gerando...' : '🔄 Gerar de novo'}
            </button>
            <button
                onClick={() => window.print()}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-700 text-white hover:bg-slate-600 transition-all"
                title="Abre diálogo de impressão (use 'Salvar como PDF')"
            >
                🖨️ Imprimir / PDF
            </button>
            <button
                onClick={() => { void handleExportHtml(); }}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all"
                title="Baixa HTML para campo e grava o roteiro no catálogo da seção"
            >
                🌐 Exportar HTML
            </button>
            <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isEditing ? 'bg-yellow-500 text-yellow-900' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            >
                {isEditing ? '🔓 Editando...' : '✏️ Editar'}
            </button>
            <button
                onClick={handleSave}
                disabled={isSaved}
                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${isSaved ? 'bg-green-600 text-white cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg'}`}
            >
                {isSaved ? 'Salvo no Catálogo ✓' : '💾 Salvar Roteiro'}
            </button>
        </div>
      </div>
      {saveError && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 text-xs px-4 py-2 whitespace-pre-wrap" role="alert">
          Não foi possível salvar no catálogo: {saveError}
        </div>
      )}
      {hasGenerationSeed(plan) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 no-print">
          <p className="text-xs text-amber-950">
            <strong className="uppercase tracking-wide text-[10px] text-amber-800">Pedido salvo</strong>
            {' · '}
            {plan.generationSeed?.narrativeTheme || plan.theme || 'sem tema'}
            {' · '}
            {plan.generationSeed?.scheduleDraft?.length || 0} item(ns) do cronograma
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => plan.generationSeed && onRegenerateFromSeed
                ? onRegenerateFromSeed(plan.generationSeed)
                : onRegenerate()}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 text-amber-950 hover:bg-amber-400 disabled:opacity-60"
            >
              {isGenerating ? 'Gerando…' : 'Gerar de novo com o mesmo pedido'}
            </button>
            {onUseSeedInPlanner && plan.generationSeed && (
              <button
                type="button"
                onClick={() => onUseSeedInPlanner(plan.generationSeed!)}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 disabled:opacity-60"
              >
                Usar este pedido no painel
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-8 max-w-4xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-10 border-b border-slate-100 pb-8">
            {isEditing ? (
                <input 
                    value={plan.theme} 
                    onChange={e => { setPlan({...plan, theme: e.target.value}); markDirty(); }}
                    className="text-3xl font-black text-slate-800 text-center w-full border-b-2 border-dashed border-slate-300 focus:border-indigo-500 outline-none pb-2"
                />
            ) : (
                <h2 className="text-3xl font-black text-slate-800 mb-2">{plan.theme}</h2>
            )}
            <div className="flex justify-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
                <span>{plan.branch}</span>
                <span>•</span>
                <span>{plan.totalDuration} min</span>
            </div>
            {isEditing ? (
                <textarea 
                    value={plan.generalNotes} 
                    onChange={e => { mutatePlan(p => ({...p, generalNotes: e.target.value})); }}
                    className="w-full mt-4 p-2 border rounded text-sm text-slate-600 text-center"
                    rows={2}
                />
            ) : (
                <div className="space-y-4 max-w-3xl mx-auto mt-6">
                    <p className="text-slate-600 italic text-center text-sm">"{plan.generalNotes}"</p>

                    {plan.fundoDeCena && (
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-left">
                            <h4 className="text-xs font-black text-purple-800 uppercase mb-2 flex items-center gap-2">🎭 Fundo de Cena</h4>
                            <p className="text-sm text-purple-900 leading-relaxed">{plan.fundoDeCena}</p>
                        </div>
                    )}

                    {plan.preparacaoChefia && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-left">
                            <h4 className="text-xs font-black text-amber-800 uppercase mb-2 flex items-center gap-2">📋 Preparação da Chefia</h4>
                            <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">{plan.preparacaoChefia}</p>
                        </div>
                    )}

                    {plan.educationalRationale && (
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-left">
                            <h4 className="text-xs font-black text-indigo-800 uppercase mb-2 flex items-center gap-2">🎯 Intencionalidade Educativa</h4>
                            <p className="text-sm text-indigo-900 leading-relaxed">{plan.educationalRationale}</p>
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="mb-10">
            <CronogramaBlock
                header={{
                    ...headerFromPlan({ ...plan, unitName: plan.unitName || fallbackUnitName }),
                }}
                activities={plan.activities}
                startTime={meetingStart}
                editable={isEditing}
                onHeaderChange={patch => {
                    mutatePlan(prev => ({
                        ...prev,
                        unitName: prev.unitName || fallbackUnitName,
                        meetingDate: patch.meetingDate ?? prev.meetingDate,
                        cycleLabel: patch.cycleLabel ?? prev.cycleLabel,
                        meetingType: patch.meetingType ?? prev.meetingType,
                        theme: patch.theme ?? prev.theme,
                        objectives: patch.objectives ?? prev.objectives,
                        technicalContent: patch.technicalContent ?? prev.technicalContent,
                    }));
                }}
                onStartTimeChange={clock => {
                    mutatePlan(prev => restampPlan({ ...prev, meetingStartTime: clock }, clock));
                }}
                onActivitiesChange={next => {
                    mutatePlan(prev => ({
                        ...prev,
                        activities: next,
                        meetingStartTime: next[0]?.scheduledStartTime || prev.meetingStartTime,
                        totalDuration: next.reduce((sum, row) => sum + (row.durationMinutes || 0), 0),
                    }));
                }}
            />
        </div>

        {/* Activities Timeline */}
        <div className="space-y-8 relative before:absolute before:left-[19px] before:top-0 before:h-full before:w-0.5 before:bg-slate-200">
            {plan.activities.map((act, i) => (
                <div key={act._uid || i} className="relative pl-12 group">
                    {/* Time Bubble */}
                    <div className={`absolute left-0 top-0 w-10 h-10 border-2 rounded-full flex items-center justify-center text-xs font-black shadow-sm z-10 ${bubbleTone(act)}`}>
                        {i + 1}
                    </div>

                    {/* Card */}
                    <div className={`border rounded-xl p-6 hover:shadow-md transition-shadow relative ${cardTone(act)}`}>
                        <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <>
                                    <input 
                                        value={act.title}
                                        onChange={e => updateActivity(i, 'title', e.target.value)}
                                        className="font-bold text-lg text-slate-800 w-full mb-1 border-b border-dashed outline-none"
                                    />
                                    <input
                                        value={act.responsible || ''}
                                        onChange={e => updateActivity(i, 'responsible', e.target.value)}
                                        placeholder="Responsável (patrulha / chefia)"
                                        className="w-full text-xs text-slate-600 border-b border-dashed outline-none mb-1"
                                    />
                                    </>
                                ) : (
                                    <h3 className="font-bold text-lg text-slate-800">{act.title}</h3>
                                )}
                                <div className="flex gap-2 mt-1">
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{act.educationalArea}</span>
                                    {isEditing ? (
                                        <input 
                                            type="number"
                                            value={act.durationMinutes}
                                            onChange={e => updateActivity(i, 'durationMinutes', Number(e.target.value))}
                                            className="w-16 bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border"
                                        />
                                    ) : (
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">⏱️ {activityRanges[i]}</span>
                                    )}
                                    {act.responsible && (
                                        <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">{act.responsible}</span>
                                    )}
                                    {act.isOperational && (
                                        <span className="bg-white/80 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border">Rotina</span>
                                    )}
                                </div>
                            </div>
                            {(onRegenerateActivity && !isCeremonialActivity(act) || isEditing) && (
                                <div className="flex items-start gap-1 no-print shrink-0 w-[min(20rem,46%)]">
                                    {onRegenerateActivity && !isCeremonialActivity(act) && (
                                        <>
                                            <label className="flex-1 min-w-0">
                                                <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">O que mudar neste quadro</span>
                                                <textarea
                                                    value={act.redoNote || ''}
                                                    onChange={e => updateActivity(i, 'redoNote', e.target.value)}
                                                    placeholder="Ex.: trazer a letra da canção X; incluir o roteiro falado da Pagmejera; cortar a avaliação genérica"
                                                    rows={2}
                                                    className="w-full text-[10px] leading-snug p-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-amber-400 resize-y min-h-[2.5rem]"
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmActivityIndex(i)}
                                                disabled={regeneratingIndex !== null}
                                                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-60 disabled:cursor-wait whitespace-nowrap mt-4"
                                                title="Gera de novo só esta atividade, usando a nota ao lado"
                                            >
                                                {regeneratingIndex === i ? 'Gerando…' : '🔄 Refazer esta'}
                                            </button>
                                        </>
                                    )}
                                    {isEditing && (
                                        <button
                                            onClick={() => removeActivity(i)}
                                            className="text-red-300 hover:text-red-500 font-bold px-1 mt-4"
                                            title="Remover atividade"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {isEditing ? (
                            <textarea 
                                value={act.description}
                                onChange={e => updateActivity(i, 'description', e.target.value)}
                                className="w-full text-sm text-slate-600 leading-relaxed p-2 border rounded h-24"
                            />
                        ) : (
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{act.description}</p>
                        )}

                        {(act.conteudoPronto || isEditing) && (
                            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-xs">
                                <strong className="text-orange-950 uppercase text-[10px] block mb-1">📝 Conteúdo pronto</strong>
                                {isEditing ? (
                                    <textarea
                                        value={act.conteudoPronto || ''}
                                        onChange={e => updateActivity(i, 'conteudoPronto', e.target.value)}
                                        placeholder="Letra da canção, cartões de caso ou falas da cerimônia…"
                                        className="w-full p-1 border rounded text-xs"
                                        rows={6}
                                    />
                                ) : (
                                    <p className="text-orange-950 whitespace-pre-line leading-relaxed">{act.conteudoPronto}</p>
                                )}
                            </div>
                        )}

                        {((act.passos && act.passos.length > 0) || isEditing) && (
                            <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded text-xs">
                                <strong className="text-sky-900 uppercase text-[10px] block mb-1">⏱️ Passos cronometrados</strong>
                                {isEditing ? (
                                    <textarea
                                        value={(act.passos || []).map(step => `${step.minuto} | ${step.acao}`).join('\n')}
                                        onChange={e => updateActivity(i, 'passos', e.target.value.split('\n').map(line => {
                                            const [minuto, ...rest] = line.split('|');
                                            return { minuto: (minuto || '').trim(), acao: rest.join('|').trim() };
                                        }).filter(step => step.minuto || step.acao))}
                                        placeholder={"0–3 min | Abrir a formação\n3–8 min | Cantar o refrão"}
                                        className="w-full p-1 border rounded text-xs font-mono"
                                        rows={4}
                                    />
                                ) : (
                                    <ol className="space-y-1 text-sky-950">
                                        {(act.passos || []).map((step, idx) => (
                                            <li key={idx} className="flex gap-2">
                                                <span className="font-black whitespace-nowrap">{step.minuto}</span>
                                                <span className="whitespace-pre-line">{step.acao}</span>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        )}

                        {/* Fundo de cena específico da atividade */}
                        {(act.fundoDeCena || isEditing) && (
                            <div className="mt-3 p-2 bg-purple-50 border-l-2 border-purple-400 rounded text-xs">
                                <strong className="text-purple-900 block mb-1">🎭 Fundo de cena</strong>
                                {isEditing ? (
                                    <textarea
                                        value={act.fundoDeCena || ''}
                                        onChange={e => updateActivity(i, 'fundoDeCena', e.target.value)}
                                        placeholder="Como esta atividade se encaixa na narrativa global..."
                                        className="w-full p-1 border rounded text-xs italic"
                                        rows={2}
                                    />
                                ) : (
                                    <p className="italic text-purple-900">{act.fundoDeCena}</p>
                                )}
                            </div>
                        )}

                        {/* Instrução para chefia */}
                        {(act.instrucaoChefia || isEditing) && (
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs">
                                <strong className="text-amber-900 uppercase text-[10px] block mb-1">📋 Instrução para chefia</strong>
                                {isEditing ? (
                                    <textarea
                                        value={act.instrucaoChefia || ''}
                                        onChange={e => updateActivity(i, 'instrucaoChefia', e.target.value)}
                                        placeholder="Passo-a-passo de execução para o chefe conduzir..."
                                        className="w-full p-1 border rounded text-xs"
                                        rows={3}
                                    />
                                ) : (
                                    <p className="text-amber-900 whitespace-pre-line leading-relaxed">{act.instrucaoChefia}</p>
                                )}
                            </div>
                        )}

                        {/* Objetivo específico */}
                        {(act.objetivoEspecifico || isEditing) && (
                            <div className="mt-3 text-xs">
                                <strong className="text-slate-500 uppercase text-[9px] block mb-1">🎯 Objetivo específico</strong>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={act.objetivoEspecifico || ''}
                                        onChange={e => updateActivity(i, 'objetivoEspecifico', e.target.value)}
                                        placeholder="Ao final, o jovem será capaz de..."
                                        className="w-full p-1 border rounded text-xs italic"
                                    />
                                ) : (
                                    <p className="text-slate-700 italic">{act.objetivoEspecifico}</p>
                                )}
                            </div>
                        )}

                        {((!isCeremonialActivity(act) && hasMeaningfulEvaluation(act.evaluation) && !isBoilerplateEvaluation(act.evaluation)) || (isEditing && !isCeremonialActivity(act))) && (
                            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded text-xs">
                                <strong className="text-emerald-900 uppercase text-[10px] block mb-2">✅ Acompanhamento e avaliação</strong>
                                {isEditing ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <textarea
                                            value={act.evaluation?.acompanhamento || ''}
                                            onChange={e => updateActivityEvaluation(i, 'acompanhamento', e.target.value)}
                                            placeholder="Como acompanhar durante a atividade..."
                                            className="w-full p-2 border rounded text-xs"
                                            rows={3}
                                        />
                                        <textarea
                                            value={act.evaluation?.avaliacaoJovens || ''}
                                            onChange={e => updateActivityEvaluation(i, 'avaliacaoJovens', e.target.value)}
                                            placeholder="Autoavaliação ou avaliação por pares..."
                                            className="w-full p-2 border rounded text-xs"
                                            rows={3}
                                        />
                                        <textarea
                                            value={act.evaluation?.avaliacaoChefia || ''}
                                            onChange={e => updateActivityEvaluation(i, 'avaliacaoChefia', e.target.value)}
                                            placeholder="Como a chefia avalia e registra..."
                                            className="w-full p-2 border rounded text-xs md:col-span-2"
                                            rows={3}
                                        />
                                        <textarea
                                            value={(act.evaluation?.requisitosObservaveis || []).join('\n')}
                                            onChange={e => updateActivityEvaluation(i, 'requisitosObservaveis', lines(e.target.value))}
                                            placeholder="Requisitos observáveis, um por linha"
                                            className="w-full p-2 border rounded text-xs font-mono"
                                            rows={3}
                                        />
                                        <textarea
                                            value={(act.evaluation?.criteriosDeAceite || []).join('\n')}
                                            onChange={e => updateActivityEvaluation(i, 'criteriosDeAceite', lines(e.target.value))}
                                            placeholder="Critérios de aceite, um por linha"
                                            className="w-full p-2 border rounded text-xs font-mono"
                                            rows={3}
                                        />
                                        <textarea
                                            value={(act.evaluation?.evidenciasSugeridas || []).join('\n')}
                                            onChange={e => updateActivityEvaluation(i, 'evidenciasSugeridas', lines(e.target.value))}
                                            placeholder="Evidências sugeridas, uma por linha"
                                            className="w-full p-2 border rounded text-xs font-mono md:col-span-2"
                                            rows={2}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-emerald-950">
                                        <p className="whitespace-pre-line">{act.evaluation?.acompanhamento}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <strong className="block text-[9px] uppercase text-emerald-700 mb-1">Jovens</strong>
                                                <p className="whitespace-pre-line">{act.evaluation?.avaliacaoJovens}</p>
                                            </div>
                                            <div>
                                                <strong className="block text-[9px] uppercase text-emerald-700 mb-1">Chefia</strong>
                                                <p className="whitespace-pre-line">{act.evaluation?.avaliacaoChefia}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <strong className="block text-[9px] uppercase text-emerald-700 mb-1">Requisitos</strong>
                                                <ul className="list-disc list-inside space-y-0.5">
                                                    {(act.evaluation?.requisitosObservaveis || []).map((r, idx) => <li key={idx}>{r}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <strong className="block text-[9px] uppercase text-emerald-700 mb-1">Critérios</strong>
                                                <ul className="list-disc list-inside space-y-0.5">
                                                    {(act.evaluation?.criteriosDeAceite || []).map((c, idx) => <li key={idx}>{c}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <strong className="block text-[9px] uppercase text-emerald-700 mb-1">Evidências</strong>
                                                <ul className="list-disc list-inside space-y-0.5">
                                                    {(act.evaluation?.evidenciasSugeridas || []).map((e, idx) => <li key={idx}>{e}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Preparação prévia */}
                        {((act.preparacaoPrevia && act.preparacaoPrevia.length > 0) || isEditing) && (
                            <div className="mt-3 text-xs">
                                <strong className="text-slate-500 uppercase text-[9px] block mb-1">⚙️ Preparação prévia (uma por linha)</strong>
                                {isEditing ? (
                                    <textarea
                                        value={(act.preparacaoPrevia || []).join('\n')}
                                        onChange={e => updateActivity(i, 'preparacaoPrevia', e.target.value.split('\n').filter(Boolean))}
                                        placeholder="Imprimir mapas em A3&#10;Separar 3 cordas de 5m"
                                        className="w-full p-1 border rounded text-xs font-mono"
                                        rows={3}
                                    />
                                ) : (
                                    <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                                        {(act.preparacaoPrevia || []).map((p, idx) => <li key={idx}>{p}</li>)}
                                    </ul>
                                )}
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div>
                                <strong className="text-slate-400 uppercase text-[9px] block mb-1">Materiais (uma por linha)</strong>
                                {isEditing ? (
                                    <textarea
                                        value={act.materials.join('\n')}
                                        onChange={e => updateActivity(i, 'materials', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                                        placeholder={'Cordas\nApito\nFichas A4'}
                                        className="w-full border rounded p-1 text-xs font-mono"
                                        rows={3}
                                    />
                                ) : (
                                    act.materials.length > 0 ? (
                                        <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                                            {act.materials.map((m, idx) => <li key={idx}>{m}</li>)}
                                        </ul>
                                    ) : <span className="text-slate-500">Nenhum</span>
                                )}
                            </div>
                            <div>
                                <strong className="text-slate-400 uppercase text-[9px] block mb-1">Código de progressão</strong>
                                <span className="text-indigo-600 font-medium">{act.progressionObjective || 'Geral'}</span>
                            </div>
                            {(act.manualReferencia || isEditing) && (
                                <div>
                                    <strong className="text-slate-400 uppercase text-[9px] block mb-1">📖 Manual de referência</strong>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={act.manualReferencia || ''}
                                            onChange={e => updateActivity(i, 'manualReferencia', e.target.value)}
                                            placeholder="Manual do Escotista 2025, Cap.X p.YYY"
                                            className="w-full p-1 border rounded text-xs italic"
                                        />
                                    ) : (
                                        <span className="text-slate-700 font-medium italic">{act.manualReferencia}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            
            {isEditing && (
                <div className="pl-12">
                    <button 
                        onClick={addActivity}
                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                    >
                        + Adicionar Atividade
                    </button>
                </div>
            )}
        </div>

        {/* Footer Info */}
        {!isEditing && (
            <div className="mt-12 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">📚 Guia do Chefe</h4>
                <div className="space-y-4">
                    {plan.studyGuide.map((guide, i) => (
                        <div key={i} className="text-sm">
                            <strong className="text-indigo-700 block mb-1">💡 {guide.activityTitle}</strong>
                            <p className="text-slate-600 mb-2">{guide.conceptExplainer}</p>
                            <div className="bg-yellow-50 p-2 rounded border-l-2 border-yellow-400 text-yellow-800 text-xs italic">
                                "Dica: {guide.teachingTips}"
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
