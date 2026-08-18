import React, { useState, useEffect } from 'react';
import { CalendarEvent, MeetingPlan, ScoutMember, ScoutBranch, ScoutSection, ProgressLaunch } from '../types';
import {
  getCalendarEventsAsync,
  saveCalendarEventAsync,
  deleteCalendarEventAsync,
  getCatalogAsync,
  getMembersAsync,
  getSectionsAsync,
  getProgressLaunchByEventId,
  DATA_EVENTS,
} from '../services/storageService';
import { exportCalendarEventHtml } from '../services/calendarHtmlExport';
import { formatDateBR, formatPaperDuration } from '../services/meetingScheduleService';
import { emitProcessDone, emitProcessProgress } from '../services/processFeedbackService';
import { ConfirmDialog } from './ConfirmDialog';
import {
  createAndApplyProgressLaunch,
  deleteProgressLaunchAndReverse,
  extractProgressionCodes,
  syncProgressLaunchCredits,
} from '../services/batchProgressionService';
import { isYouthMember } from '../utils/memberQuickAdd';
import { efemerideForDay } from '../utils/scoutEfemerides';
import { resolveSectionBranch } from '../services/firebase/sectionKind';
import { NationalActivitiesPanel } from './NationalActivitiesPanel';

interface Props {
  sectionId?: string;
  branch: ScoutBranch;
  /** Escrita + visão global (ADMINISTRADOR). */
  isAdmin?: boolean;
  /** Vê todas as seções (admin ou Diretoria). */
  isGlobal?: boolean;
  /** Consulta: esconde criar/editar/excluir e o painel nacional. */
  isReadOnly?: boolean;
}

type ConfirmAction = {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
};

export const CalendarView: React.FC<Props> = ({ sectionId, branch, isAdmin, isGlobal, isReadOnly }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [plans, setPlans] = useState<MeetingPlan[]>([]);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Id do evento aberto no modal. null = novo evento neste dia. Operamos sempre
  // por este id (e nao por events.find(date===) que pegava o primeiro do dia).
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [attendance, setAttendance] = useState<string[]>([]); // List of member IDs present
  const [targetSectionId, setTargetSectionId] = useState('');
  const [batchApplied, setBatchApplied] = useState(false);
  const [eventLaunch, setEventLaunch] = useState<ProgressLaunch | null>(null);
  const [reviewCreditOpen, setReviewCreditOpen] = useState(false);
  const [reviewCreditedIds, setReviewCreditedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const globalView = isGlobal ?? !!isAdmin;
  const canWrite = !isReadOnly;
  const showSectionChips = globalView || !sectionId;

  useEffect(() => {
    loadData();
    const onUpdate = () => loadData();
    window.addEventListener(DATA_EVENTS.CALENDAR_UPDATED, onUpdate);
    window.addEventListener(DATA_EVENTS.CATALOG_UPDATED, onUpdate);
    window.addEventListener(DATA_EVENTS.MEMBERS_UPDATED, onUpdate);
    return () => {
      window.removeEventListener(DATA_EVENTS.CALENDAR_UPDATED, onUpdate);
      window.removeEventListener(DATA_EVENTS.CATALOG_UPDATED, onUpdate);
      window.removeEventListener(DATA_EVENTS.MEMBERS_UPDATED, onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const loadData = async () => {
    const [evtData, planResult, memData, secData] = await Promise.all([
        getCalendarEventsAsync(sectionId),
        getCatalogAsync(sectionId).catch(err => {
          console.error('Falha ao carregar roteiros do catálogo:', err);
          return [] as MeetingPlan[];
        }),
        getMembersAsync(sectionId, { hydrateOfficial: false }), 
        getSectionsAsync()
    ]);
    setEvents(evtData);
    setPlans(planResult);
    setMembers(memData);
    setSections(secData);
    if (secData.length > 0) setTargetSectionId(prev => prev || sectionId || secData[0].id);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); 

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  // Preenche o formulario do modal com os dados de um evento existente (por id).
  // Operamos sempre pelo id do evento (e nao por events.find(date===) que pegava
  // o primeiro do dia quando havia 2+ atividades na mesma data).
  const loadEventIntoForm = (existing: CalendarEvent) => {
    setSelectedEventId(existing.id);
    setSelectedPlanId(existing.planId || '');
    setEventNotes(existing.notes || '');
    setAttendance(existing.attendance.filter(a => a.present).map(a => a.memberId));
    setTargetSectionId(existing.sectionId || '');
    setBatchApplied(false);
    setEventLaunch(null);
    setReviewCreditOpen(false);
    setError(null);
    setFeedback(null);
    getProgressLaunchByEventId(existing.id).then(launch => {
      setEventLaunch(launch);
      if (launch) {
        setBatchApplied(true);
        setReviewCreditedIds([...launch.creditedMemberIds]);
      }
    });
  };

  // Limpa o formulario para criar uma NOVA atividade no dia ja selecionado, sem
  // sobrescrever nenhum evento existente (selectedEventId volta a ser null).
  const startNewEvent = () => {
    setSelectedEventId(null);
    setSelectedPlanId('');
    setEventNotes('');
    setAttendance([]);
    if (sectionId) setTargetSectionId(sectionId);
    setBatchApplied(false);
    setEventLaunch(null);
    setReviewCreditOpen(false);
    setError(null);
    setFeedback(null);
  };

  // Abre o modal. Com eventId carrega aquele evento especifico para edicao; sem
  // eventId, dias sem atividades abrem direto em modo de criacao e dias com
  // atividades exibem a lista (ver renderDayEvents no corpo do modal).
  const handleDateClick = (day: number, eventId?: string) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);

    const existing = eventId ? events.find(e => e.id === eventId) : undefined;
    if (existing) {
        loadEventIntoForm(existing);
    } else {
        startNewEvent();
    }
    setShowModal(true);
  };

  // Eventos do dia atualmente aberto no modal (usado para listar/escolher).
  const dayEventsForModal = selectedDate ? events.filter(e => e.date === selectedDate) : [];
  const catalogSectionId = isAdmin ? targetSectionId : sectionId;
  const attendanceSectionId = isAdmin
    ? targetSectionId
    : (events.find(e => e.id === selectedEventId)?.sectionId || sectionId);
  const catalogPlans = plans.filter(p => {
    if (!catalogSectionId) return true;
    return !p.sectionId || p.sectionId === catalogSectionId;
  });

  const handleSaveEvent = async () => {
    if (!canWrite || !selectedDate) return;
    
    const finalSectionId = isAdmin ? targetSectionId : sectionId;
    if (!finalSectionId) {
        setError('Selecione uma seção.');
        return;
    }

    const targetSection = sections.find(s => s.id === finalSectionId);
    const plan = plans.find(p => p.id === selectedPlanId);
    
    const newEvent: CalendarEvent = {
        id: selectedEventId || Date.now().toString(),
        sectionId: finalSectionId,
        date: selectedDate,
        planId: selectedPlanId,
        title: plan ? plan.theme : 'Atividade Personalizada',
        branch: targetSection ? targetSection.branch : branch,
        notes: eventNotes,
        attendance: members.filter(m => m.sectionId === finalSectionId).map(m => ({
            memberId: m.id,
            present: attendance.includes(m.id)
        }))
    };

    try {
      emitProcessProgress('Salvando atividade na agenda...');
      await saveCalendarEventAsync(newEvent);
      emitProcessDone('Atividade salva na agenda.');
      setShowModal(false);
      loadData();
    } catch {
      emitProcessDone('Não foi possível salvar. A seção pode estar em modo consulta.');
    }
  };

  const handleExportHtml = () => {
    if (!selectedDate) return;
    const finalSectionId = isAdmin ? targetSectionId : sectionId;
    const targetSection = sections.find(s => s.id === finalSectionId);
    const plan = plans.find(p => p.id === selectedPlanId);
    const event: CalendarEvent = {
        id: selectedEventId || Date.now().toString(),
        sectionId: finalSectionId,
        date: selectedDate,
        planId: selectedPlanId,
        title: plan ? plan.theme : 'Atividade Personalizada',
        branch: targetSection ? targetSection.branch : branch,
        notes: eventNotes,
        attendance: members.filter(m => m.sectionId === finalSectionId).map(m => ({
            memberId: m.id,
            present: attendance.includes(m.id)
        }))
    };
    emitProcessDone('Prévia HTML da agenda pronta.');
    exportCalendarEventHtml(event, plan, members.filter(m => m.sectionId === finalSectionId));
  };

  const handleDeleteEvent = async () => {
    if (!canWrite) return;
    // Remove exatamente o evento aberto no modal (por id), nao o primeiro do dia.
    const existing = selectedEventId ? events.find(e => e.id === selectedEventId) : undefined;
    if (!existing) return;
    setConfirmAction({
        title: 'Remover atividade',
        message: 'Remover atividade deste dia?',
        confirmText: 'Remover',
        danger: true,
        onConfirm: async () => {
            try {
              emitProcessProgress('Removendo atividade da agenda...');
              const launch = eventLaunch || await getProgressLaunchByEventId(existing.id);
              if (launch) await deleteProgressLaunchAndReverse(launch);
              await deleteCalendarEventAsync(existing.id);
              emitProcessDone('Atividade removida da agenda.');
              setConfirmAction(null);
              setShowModal(false);
              loadData();
            } catch {
              setConfirmAction(null);
              emitProcessDone('Não foi possível remover. A seção pode estar em modo consulta.');
            }
        },
    });
  };

  const handleBatchProgression = async () => {
      if (!canWrite) return;
      const plan = plans.find(p => p.id === selectedPlanId);
      if (!plan || !selectedDate) return;
      if (attendance.length === 0) {
          setError('Marque a presença primeiro.');
          return;
      }
      // Precisa de evento salvo para amarrar o lançamento
      let eventId = selectedEventId;
      if (!eventId) {
          setError('Salve a atividade na agenda antes de lançar a progressão (para poder revisar o crédito depois).');
          return;
      }
      if (eventLaunch) {
          setError('Já existe lançamento para esta atividade. Use “Revisar crédito”.');
          setReviewCreditOpen(true);
          setReviewCreditedIds([...eventLaunch.creditedMemberIds]);
          return;
      }

      const codesToApply = new Set<string>();
      plan.activities.forEach(act => {
          if (act.progressionObjective) {
              extractProgressionCodes(act.progressionObjective).forEach(code => codesToApply.add(code));
          }
      });

      if (codesToApply.size === 0) {
          setError("Não encontrei códigos de progressão no roteiro. Revise os objetivos vinculados às atividades.");
          return;
      }

      const finalSectionId = isAdmin ? targetSectionId : sectionId;
      if (!finalSectionId) {
          setError('Seção não definida.');
          return;
      }

      const youthPresentIds = attendance.filter(id => {
        const member = members.find(m => m.id === id);
        return !!member && isYouthMember(member);
      });
      if (youthPresentIds.length === 0) {
          setError('Nenhum jovem presente. Chefe e Assistente não recebem progressão de blocos/POR.');
          return;
      }

      setConfirmAction({
          title: 'Lançar progressão',
          message: `Aplicar ${codesToApply.size} item(s) para ${youthPresentIds.length} jovem(ns) presentes?\n\nItens: ${Array.from(codesToApply).join(', ')}\n\nDepois você pode REVISAR e excluir quem não atingiu a avaliação — a presença não muda.`,
          confirmText: 'Aplicar a todos os presentes',
          onConfirm: async () => {
              try {
                emitProcessProgress(`Lançando progressão para ${youthPresentIds.length} jovem(ns)...`);
                const launch = await createAndApplyProgressLaunch({
                  eventId: eventId!,
                  sectionId: finalSectionId,
                  date: selectedDate,
                  planId: plan.id,
                  planTheme: plan.theme,
                  codes: Array.from(codesToApply),
                  memberIds: youthPresentIds,
                  members,
                });
                const blocks = launch.applies.reduce((s, a) => s + a.codesApplied.filter(c => /^B\d+\./.test(c)).length, 0);
                const specialties = launch.applies.reduce((s, a) => s + (a.specialtyIdsStarted?.length || 0), 0);
                setEventLaunch(launch);
                setReviewCreditedIds([...launch.creditedMemberIds]);
                setBatchApplied(true);
                setFeedback(`Progressão lançada: ${blocks} ação(ões) de bloco e ${specialties} especialidade(s) iniciada(s). Use “Revisar crédito” para excluir quem não atingiu.`);
                setError(null);
                setConfirmAction(null);
                emitProcessDone('Progressão lançada. Revise o crédito se necessário.');
                window.dispatchEvent(new Event(DATA_EVENTS.MEMBERS_UPDATED));
              } catch {
                setConfirmAction(null);
                setError('Não foi possível lançar a progressão. A seção pode estar em modo consulta.');
                emitProcessDone('Falha ao lançar progressão.');
              }
          },
      });
  };

  const handleSaveCreditReview = async () => {
    if (!canWrite || !eventLaunch) return;
    try {
      emitProcessProgress('Atualizando créditos da atividade...');
      const updated = await syncProgressLaunchCredits(eventLaunch, reviewCreditedIds, members);
      setEventLaunch(updated);
      setReviewCreditOpen(false);
      setFeedback(`Crédito atualizado: ${updated.creditedMemberIds.length} creditado(s), ${updated.excludedMemberIds.length} excluído(s). Presença inalterada.`);
      emitProcessDone('Créditos da atividade atualizados.');
      window.dispatchEvent(new Event(DATA_EVENTS.MEMBERS_UPDATED));
    } catch {
      setError('Não foi possível atualizar créditos. A seção pode estar em modo consulta.');
      emitProcessDone('Falha ao atualizar créditos.');
    }
  };

  const getSectionName = (id?: string) => sections.find(s => s.id === id)?.name || '';
  const scopedSection = sectionId ? sections.find(s => s.id === sectionId) : undefined;
  const viewingBranch = sectionId ? resolveSectionBranch(scopedSection, branch) : undefined;
  const writeSectionId = isAdmin ? targetSectionId : (sectionId || '');

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalSlots = [...blanks, ...days];

    return (
        <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase py-2">{d}</div>
            ))}
            {totalSlots.map((day, index) => {
                if (!day) return <div key={`blank-${index}`} className="bg-transparent h-24"></div>;
                
                const monthDay = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const efemeride = efemerideForDay(monthDay, viewingBranch);
                
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = events.filter(e => e.date === dateStr);
                const isToday = new Date().toISOString().slice(0, 10) === dateStr;

                return (
                    <div
                        key={dateStr}
                        role="button"
                        tabIndex={0}
                        aria-label={`Dia ${day}${dayEvents.length ? `, ${dayEvents.length} atividade(s)` : ''}`}
                        onClick={() => handleDateClick(day)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDateClick(day); } }}
                        className={`h-24 border rounded-lg p-1 cursor-pointer transition-all hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 flex flex-col relative overflow-hidden
                            ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}
                        `}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm font-bold px-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</span>
                            {efemeride && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded font-black uppercase" title={efemeride}>Efeméride</span>}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
                            {efemeride && <div className="text-[8px] text-indigo-400 font-bold italic truncate pl-1">{efemeride}</div>}
                            {dayEvents.map(ev => (
                                // Clicar num chip abre AQUELE evento (por id); stopPropagation
                                // impede que o clique no dia abra um novo evento por baixo.
                                <div
                                    key={ev.id}
                                    role="button"
                                    tabIndex={0}
                                    title={`Editar: ${ev.title}`}
                                    onClick={(e) => { e.stopPropagation(); handleDateClick(day, ev.id); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleDateClick(day, ev.id); } }}
                                    className={`p-1 rounded text-[9px] font-bold truncate border-l-2 cursor-pointer hover:brightness-95 ${isAdmin ? 'bg-yellow-50 text-yellow-900 border-yellow-500' : 'bg-green-100 text-green-800 border-green-600'}`}
                                >
                                    {showSectionChips && <span className="block text-[8px] opacity-70">{getSectionName(ev.sectionId)}</span>}
                                    {ev.title}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirmText}
          danger={confirmAction.danger}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
        />
      )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📅 Calendário {globalView ? 'Global' : ''}</h2>
        <div className="flex items-center gap-4 bg-white p-1 rounded-lg border shadow-sm">
            <button onClick={() => changeMonth(-1)} className="px-3 py-1 hover:bg-gray-100 rounded">◀</button>
            <span className="font-bold text-lg w-40 text-center">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeMonth(1)} className="px-3 py-1 hover:bg-gray-100 rounded">▶</button>
        </div>
      </div>

      {renderCalendar()}

      {canWrite && (
        <NationalActivitiesPanel
          events={events}
          sections={sections}
          writeSectionId={writeSectionId}
          fallbackBranch={branch}
          isAdmin={isAdmin}
          onWriteSectionChange={setTargetSectionId}
          onChanged={loadData}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-gray-800">
                        {canWrite
                          ? (selectedEventId ? 'Editar Atividade' : 'Agendar Atividade')
                          : (selectedEventId ? 'Atividade' : 'Dia')}: <span className="text-slate-500">{selectedDate?.split('-').reverse().join('/')}</span>
                    </h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 text-2xl">×</button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <p role="alert" className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                            {error}
                        </p>
                    )}
                    {feedback && (
                        <p role="status" className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            {feedback}
                        </p>
                    )}

                    {/* Dias com 2+ atividades: lista os eventos do dia para escolher
                        qual editar/excluir (por id) e oferece acao explicita de
                        "Nova atividade" sem sobrescrever os existentes. */}
                    {dayEventsForModal.length > 0 && (
                        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                Atividades deste dia ({dayEventsForModal.length})
                            </label>
                            <div className="space-y-1 mb-2">
                                {dayEventsForModal.map(ev => (
                                    <button
                                        key={ev.id}
                                        onClick={() => loadEventIntoForm(ev)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-between gap-2
                                            ${selectedEventId === ev.id
                                                ? 'bg-slate-800 text-white border-slate-800'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        <span className="truncate">
                                            {ev.title}
                                            {showSectionChips && (
                                                <span className={`block text-[10px] ${selectedEventId === ev.id ? 'text-slate-300' : 'text-slate-400'}`}>
                                                    {getSectionName(ev.sectionId)}
                                                </span>
                                            )}
                                        </span>
                                        {selectedEventId === ev.id && (
                                          <span className="text-[10px] uppercase font-bold shrink-0">
                                            {canWrite ? 'Editando' : 'Vendo'}
                                          </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {canWrite && (
                            <button
                                onClick={startNewEvent}
                                className={`w-full px-3 py-2 rounded-lg text-sm font-bold border-2 border-dashed transition-colors
                                    ${selectedEventId === null
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}
                            >
                                + Nova atividade {selectedEventId === null ? '(em edição)' : ''}
                            </button>
                            )}
                        </div>
                    )}

                    {showSectionChips && !canWrite && selectedEventId && (
                        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Seção</p>
                            <p className="text-sm font-semibold text-slate-800">
                                {getSectionName(events.find(e => e.id === selectedEventId)?.sectionId) || '—'}
                            </p>
                        </div>
                    )}

                    {isAdmin && canWrite && (
                        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <label className="block text-xs font-bold text-yellow-800 uppercase mb-2">Seção Responsável (Admin)</label>
                            <select 
                                value={targetSectionId} 
                                onChange={e => setTargetSectionId(e.target.value)}
                                className="w-full p-2 border border-yellow-300 rounded bg-white outline-none"
                            >
                                {sections.map(s => <option key={s.id} value={s.id}>{s.name} ({s.branch})</option>)}
                            </select>
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Roteiro do Catálogo</label>
                        <select 
                            value={selectedPlanId} 
                            onChange={e => setSelectedPlanId(e.target.value)}
                            disabled={!canWrite}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-slate-200 outline-none disabled:bg-slate-50"
                        >
                            <option value="">-- Selecione um roteiro salvo --</option>
                            {catalogPlans.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.branch ? `[${p.branch}] ` : ''}{p.theme || 'Roteiro sem tema'}{p.totalDuration ? ` (${p.totalDuration} min)` : ''}{p.meetingDate ? ` · ${formatDateBR(p.meetingDate)}` : ''}{p.cycleLabel ? ` · ${p.cycleLabel}` : ''}
                                </option>
                            ))}
                        </select>
                        {catalogPlans.length === 0 && (
                            <p className="text-xs text-slate-500 mt-2">Nenhum roteiro salvo nesta seção. Gere e use Salvar roteiro.</p>
                        )}
                        {selectedPlanId && (() => {
                          const selectedPlan = catalogPlans.find(p => p.id === selectedPlanId);
                          if (!selectedPlan?.activities?.length) return null;
                          return (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                              <p className="font-black uppercase text-slate-500 mb-1">Cronograma</p>
                              {selectedPlan.activities.slice(0, 6).map((activity, index) => (
                                <p key={activity._uid || index}>
                                  {formatPaperDuration(activity.scheduledStartTime, activity.durationMinutes)} · {activity.title}
                                  {activity.responsible ? ` — ${activity.responsible}` : ''}
                                </p>
                              ))}
                              {selectedPlan.activities.length > 6 && (
                                <p>+{selectedPlan.activities.length - 6} item(ns)</p>
                              )}
                            </div>
                          );
                        })()}
                        {canWrite && selectedPlanId && !eventLaunch && (
                            <div className="mt-2">
                                <button 
                                    onClick={handleBatchProgression}
                                    className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-800 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-indigo-200"
                                >
                                    🚀 Lançar progressão para os presentes
                                </button>
                                <p className="text-[10px] text-slate-400 mt-1 text-center">Salve a atividade antes. Depois dá para excluir quem não atingiu a avaliação.</p>
                            </div>
                        )}
                        {eventLaunch && (
                            <div className="mt-2 space-y-2">
                                <div className="p-2 bg-green-100 text-green-800 rounded text-xs font-bold text-center border border-green-200">
                                    ✓ Lançamento: {eventLaunch.creditedMemberIds.length} creditado(s)
                                    {eventLaunch.excludedMemberIds.length > 0
                                      ? ` · ${eventLaunch.excludedMemberIds.length} excluído(s) da avaliação`
                                      : ''}
                                </div>
                                {canWrite && (
                                <button
                                    type="button"
                                    onClick={() => {
                                      setReviewCreditedIds([...eventLaunch.creditedMemberIds]);
                                      setReviewCreditOpen(true);
                                    }}
                                    className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 py-2 rounded-lg text-xs font-bold border border-amber-200"
                                >
                                    ✏️ Revisar crédito (excluir quem não atingiu)
                                </button>
                                )}
                                <p className="text-[10px] text-slate-500 text-center">Presença e frequência não mudam ao excluir do crédito.</p>
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Anotações / Detalhes</label>
                        <textarea 
                            value={eventNotes}
                            onChange={e => setEventNotes(e.target.value)}
                            readOnly={!canWrite}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white h-24 focus:ring-2 focus:ring-slate-200 outline-none read-only:bg-slate-50"
                            placeholder="Detalhes logísticos, local de encontro, etc."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Lista de Presença</label>
                        {members.filter(m => m.sectionId === attendanceSectionId).length === 0 ? (
                            <div className="text-sm text-gray-400 italic p-4 bg-gray-50 rounded border">
                                {(isAdmin || globalView) && !attendanceSectionId ? "Selecione uma seção acima." : "Nenhum membro nesta seção."}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {members
                                    .filter(m => m.sectionId === attendanceSectionId)
                                    .map(m => (
                                    <label key={m.id} className={`flex items-center gap-2 p-2 rounded border ${canWrite ? 'cursor-pointer' : ''} transition-colors ${attendance.includes(m.id) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={attendance.includes(m.id)}
                                            disabled={!canWrite}
                                            onChange={e => {
                                                if (e.target.checked) setAttendance([...attendance, m.id]);
                                                else setAttendance(attendance.filter(id => id !== m.id));
                                            }}
                                            className="w-4 h-4 text-green-600 rounded"
                                        />
                                        <span className="text-sm truncate font-medium">{m.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between">
                    {canWrite && selectedEventId ? (
                        <button
                            onClick={handleDeleteEvent}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold"
                        >
                            Excluir Evento
                        </button>
                    ) : <span></span>}
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-bold"
                        >
                            {canWrite ? 'Cancelar' : 'Fechar'}
                        </button>
                        <button
                            onClick={handleExportHtml}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow"
                        >
                            Exportar HTML
                        </button>
                        {canWrite && (
                        <button 
                            onClick={handleSaveEvent}
                            className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 shadow-lg"
                        >
                            Salvar na Agenda
                        </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {reviewCreditOpen && eventLaunch && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setReviewCreditOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b bg-amber-50">
              <h3 className="font-bold text-slate-800">Revisar crédito da atividade</h3>
              <p className="text-xs text-slate-600 mt-1">
                Desmarque quem <strong>não atingiu</strong> os objetivos de avaliação. A presença no evento permanece.
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Itens: {eventLaunch.codes.join(', ')}</p>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {members
                .filter(m =>
                  eventLaunch.creditedMemberIds.includes(m.id) ||
                  eventLaunch.excludedMemberIds.includes(m.id) ||
                  eventLaunch.applies.some(a => a.memberId === m.id)
                )
                .map(m => (
                  <label key={m.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${reviewCreditedIds.includes(m.id) ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
                    <input
                      type="checkbox"
                      checked={reviewCreditedIds.includes(m.id)}
                      onChange={e => {
                        if (e.target.checked) setReviewCreditedIds(ids => [...ids, m.id]);
                        else setReviewCreditedIds(ids => ids.filter(id => id !== m.id));
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">{m.name}</span>
                    {!reviewCreditedIds.includes(m.id) && (
                      <span className="text-[10px] text-amber-700 font-bold ml-auto">sem crédito</span>
                    )}
                  </label>
                ))}
            </div>
            <div className="p-3 border-t flex justify-end gap-2 bg-gray-50">
              <button type="button" onClick={() => setReviewCreditOpen(false)} className="px-3 py-2 text-sm text-slate-600 font-bold">Cancelar</button>
              <button type="button" onClick={handleSaveCreditReview} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700">Salvar créditos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
