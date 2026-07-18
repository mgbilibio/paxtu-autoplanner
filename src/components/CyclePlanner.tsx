import React, { useState } from 'react';
import { ScoutBranch, ScoutSection, ObjectiveItem, CalendarEvent, CatalogItem } from '../types';
import { MeetingCycle } from '../services/geminiService';
import { generateScoutCycleRouted } from '../services/llmProvider';
import { getUnifiedCatalog } from '../services/catalogService';
import { saveCalendarEventAsync } from '../services/storageService';
import { exportCycleHtml } from '../services/cycleHtmlExport';
import { emitProcessDone, emitProcessProgress } from '../services/processFeedbackService';
import { ConfirmDialog } from './ConfirmDialog';
import { isSpecialtyCode } from '../utils/specialtyCodes';

const newId = (): string =>
  (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

interface Props {
  branch: ScoutBranch;
  section: ScoutSection | null;
}

export const CyclePlanner: React.FC<Props> = ({ branch, section }) => {
  const [theme, setTheme] = useState('');
  const [meetingCount, setMeetingCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [cycle, setCycle] = useState<MeetingCycle | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduling, setScheduling] = useState(false);
  
  const [selectedObjectives, setSelectedObjectives] = useState<ObjectiveItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PROG' | 'SPEC'>('ALL');
  const [customInstruction, setCustomInstruction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  // Edição do esqueleto: usuário ajusta antes de agendar
  const updateMeeting = (i: number, field: keyof MeetingCycle['meetings'][number], value: any) => {
    if (!cycle) return;
    const newMeetings = cycle.meetings.map((m, idx) => idx === i ? { ...m, [field]: value } : m);
    setCycle({ ...cycle, meetings: newMeetings });
  };

  const lines = (value: string): string[] =>
    value.split('\n').map(v => v.trim()).filter(Boolean);

  const moveMeeting = (i: number, direction: -1 | 1) => {
    if (!cycle) return;
    const j = i + direction;
    if (j < 0 || j >= cycle.meetings.length) return;
    const newMeetings = [...cycle.meetings];
    [newMeetings[i], newMeetings[j]] = [newMeetings[j], newMeetings[i]];
    setCycle({ ...cycle, meetings: newMeetings });
  };

  const removeMeeting = (i: number) => {
    if (!cycle) return;
    if (cycle.meetings.length <= 1) {
      setError('Um ciclo precisa ter pelo menos uma reunião.');
      return;
    }
    setRemoveIndex(i);
  };

  const confirmRemoveMeeting = () => {
    if (!cycle || removeIndex === null) return;
    setCycle({ ...cycle, meetings: cycle.meetings.filter((_, idx) => idx !== removeIndex) });
    setRemoveIndex(null);
  };

  const addMeeting = () => {
    if (!cycle) return;
    setCycle({
      ...cycle,
      meetings: [...cycle.meetings, {
        theme: 'Nova reunião',
        generalNotes: 'Edite a descrição…',
        progressionObjective: '',
        acompanhamento: '',
        avaliacaoJovens: '',
        avaliacaoChefia: '',
        requisitosObservaveis: [],
        criteriosDeAceite: [],
      }],
    });
  };

  const regenerateMeeting = async (i: number) => {
    if (!cycle) return;
    setRegeneratingIdx(i);
    setError(null);
    emitProcessProgress(`Regerando semana ${i + 1} do ciclo...`);
    try {
      // Pede à IA UMA reunião nova mantendo o tema do ciclo e excluindo as já existentes
      const outras = cycle.meetings.filter((_, idx) => idx !== i).map(m => `- ${m.theme} (${m.progressionObjective})`).join('\n');
      const result = await generateScoutCycleRouted({
        branch,
        cycleTheme: cycle.theme,
        meetingCount: 1,
        objectives: selectedObjectives.map(o => `${o.code}: ${o.description}`),
        customInstruction: `${customInstruction || ''}\n\nGere apenas 1 reunião alternativa para a posição ${i + 1} do ciclo. NÃO repita estes temas/focos das outras semanas:\n${outras}`,
      });
      if (result.meetings && result.meetings.length > 0) {
        const novo = result.meetings[0];
        setCycle({ ...cycle, meetings: cycle.meetings.map((m, idx) => idx === i ? novo : m) });
        emitProcessDone(`Semana ${i + 1} regerada.`);
      }
    } catch (e: any) {
      setError(e?.message || 'Falha ao regerar a reunião.');
      emitProcessDone('Falha ao regerar semana do ciclo.');
    } finally {
      setRegeneratingIdx(null);
    }
  };

  // Load FULL catalog
  const system = section?.progressionSystem || 'POR_2025';
  const catalog = getUnifiedCatalog(branch, system);

  const handleGenerate = async () => {
    if (!theme || selectedObjectives.length === 0) return;
    setLoading(true);
    setError(null);
    emitProcessProgress(`Gerando ciclo com ${meetingCount} reunião(ões)...`);
    try {
        const result = await generateScoutCycleRouted({
            branch,
            cycleTheme: theme,
            meetingCount,
            objectives: selectedObjectives.map(o => `${o.code}: ${o.description}`),
            customInstruction: customInstruction || undefined,
        });
        setCycle(result);
        emitProcessDone('Ciclo gerado.');
    } catch (e: any) {
        setError(e?.message || 'Erro ao gerar ciclo. Verifique provedor de IA e conexão.');
        emitProcessDone('Falha ao gerar ciclo.');
    } finally {
        setLoading(false);
    }
  };

  const handleConfirmSchedule = async () => {
      if (!cycle || !section) return;
      setScheduling(true);
      setError(null);
      emitProcessProgress(`Agendando ${cycle.meetings.length} reunião(ões) do ciclo...`);

      const currentStart = new Date(startDate + "T14:00:00");

      try {
          for (let i = 0; i < cycle.meetings.length; i++) {
              const meeting = cycle.meetings[i];
              const eventDate = new Date(currentStart);
              eventDate.setDate(currentStart.getDate() + (i * 7));

              const newEvent: CalendarEvent = {
                  id: newId(),
                  sectionId: section.id,
                  title: meeting.theme,
                  date: eventDate.toISOString().slice(0, 10),
                  branch: branch,
                  attendance: [],
                  notes:
                    `Planejado via IA: ${meeting.generalNotes}\n\n` +
                    `Acompanhamento: ${meeting.acompanhamento || ''}\n` +
                    `Avaliação dos jovens: ${meeting.avaliacaoJovens || ''}\n` +
                    `Avaliação da chefia: ${meeting.avaliacaoChefia || ''}\n` +
                    `Requisitos: ${(meeting.requisitosObservaveis || []).join('; ')}\n` +
                    `Critérios: ${(meeting.criteriosDeAceite || []).join('; ')}`
              };
              await saveCalendarEventAsync(newEvent);
          }
          setFeedback(`✓ ${cycle.meetings.length} reuniões agendadas. Veja em "Agenda".`);
          emitProcessDone(`${cycle.meetings.length} reunião(ões) agendadas.`);
          setTimeout(() => { setCycle(null); setFeedback(null); }, 3500);
      } catch (e: any) {
          setError(e?.message || 'Erro ao salvar agenda.');
          emitProcessDone('Falha ao agendar ciclo.');
      } finally {
          setScheduling(false);
      }
  };

  const addObjective = (item: CatalogItem, catName: string) => {
      if (!selectedObjectives.some(o => o.code === item.code)) {
          setSelectedObjectives([...selectedObjectives, {
              id: newId(),
              code: item.code,
              category: catName,
              description: item.description,
              source: 'Cycle Planner'
          }]);
      }
  };

  return (
    <div className="animate-fade-in pb-20">
        {removeIndex !== null && cycle && (
          <ConfirmDialog
            title="Remover semana"
            message={`Remover a semana "${cycle.meetings[removeIndex]?.theme || ''}"?`}
            confirmText="Remover"
            danger
            onCancel={() => setRemoveIndex(null)}
            onConfirm={confirmRemoveMeeting}
          />
        )}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">🗓️ Planejador de Ciclo de Programa</h2>
            <p className="text-slate-500 mb-6">Defina o tema e os objetivos que deseja cobrir em um período de várias semanas.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tema do Ciclo</label>
                    <input 
                        type="text" 
                        value={theme}
                        onChange={e => setTheme(e.target.value)}
                        className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                        placeholder="Ex: Exploradores do Espaço, Jogos Olímpicos..."
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qtd. de Reuniões</label>
                    <select 
                        value={meetingCount}
                        onChange={e => setMeetingCount(Number(e.target.value))}
                        className="w-full p-3 border rounded-xl bg-white outline-none"
                    >
                        <option value={4}>4 Semanas (1 mês)</option>
                        <option value={8}>8 Semanas (2 meses)</option>
                        <option value={12}>12 Semanas (Trimestre)</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Selector */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">🎯 Selecione os Objetivos</h3>
                        {/* Filters */}
                        <div className="flex bg-slate-100 rounded p-0.5">
                            <button onClick={() => setFilterType('ALL')} className={`px-2 py-1 text-[10px] font-bold rounded ${filterType === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>TUDO</button>
                            <button onClick={() => setFilterType('PROG')} className={`px-2 py-1 text-[10px] font-bold rounded ${filterType === 'PROG' ? 'bg-white shadow text-green-600' : 'text-slate-400'}`}>PROG</button>
                            <button onClick={() => setFilterType('SPEC')} className={`px-2 py-1 text-[10px] font-bold rounded ${filterType === 'SPEC' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>ESPEC</button>
                        </div>
                    </div>
                    
                    <input 
                        type="text" 
                        placeholder="Pesquisar catálogo..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    
                    <div className="h-96 overflow-y-auto border rounded-lg bg-slate-50 custom-scrollbar">
                        {catalog.map((cat, idx) => {
                            let filtered = cat.items;
                            
                            // Smart Filtering
                            if (filterType === 'PROG') {
                                filtered = cat.items.filter(i => !isSpecialtyCode(i.code));
                            }
                            if (filterType === 'SPEC') {
                                filtered = cat.items.filter(i => isSpecialtyCode(i.code) || i.code.startsWith('INS-'));
                            }

                            filtered = filtered.filter(i => 
                                i.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                i.code.toLowerCase().includes(searchTerm.toLowerCase())
                            );

                            if (filtered.length === 0) return null;

                            const isSpecialtyCat = filtered.some(item => isSpecialtyCode(item.code));

                            return (
                                <div key={idx} className={`mb-2 bg-white ${isSpecialtyCat ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-green-400'}`}>
                                    <div className="bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600 sticky top-0 uppercase border-b flex justify-between">
                                        <span>{cat.name}</span>
                                        <span className="bg-slate-200 px-1.5 rounded-full">{filtered.length}</span>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {filtered.map(item => (
                                            <button 
                                                key={item.code} 
                                                onClick={() => addObjective(item, cat.name)}
                                                className="w-full text-left p-2 hover:bg-indigo-50 text-xs flex justify-between items-center group transition-colors"
                                            >
                                                <span className="font-medium text-slate-700">{item.description}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded">{item.code}</span>
                                                    {selectedObjectives.some(o => o.code === item.code) && <span className="text-green-600 font-bold">✓</span>}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700">📋 Itens para o Ciclo ({selectedObjectives.length})</h3>
                    <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto content-start p-2 border border-dashed rounded-lg">
                        {selectedObjectives.map(o => (
                            <div key={o.id} className="bg-indigo-100 border border-indigo-200 text-indigo-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
                                <span className="truncate max-w-[150px]">{o.description}</span>
                                <button onClick={() => setSelectedObjectives(selectedObjectives.filter(x => x.id !== o.id))} className="text-indigo-400 hover:text-red-600 font-black px-1">×</button>
                            </div>
                        ))}
                        {selectedObjectives.length === 0 && (
                            <div className="w-full text-center py-10 text-slate-400 italic">
                                <span className="text-2xl block mb-2">👇</span>
                                Nenhum objetivo selecionado.<br/>Escolha itens ao lado.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-6">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instrução para a IA (opcional)</label>
              <textarea
                value={customInstruction}
                onChange={e => setCustomInstruction(e.target.value)}
                placeholder="Ex: ênfase em atividades ao ar livre, evitar repetir jogos cooperativos..."
                className="w-full p-2 border rounded-lg text-sm"
                rows={2}
              />
            </div>

            {error && <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</p>}

            <button
                onClick={handleGenerate}
                disabled={loading || !theme || selectedObjectives.length === 0}
                className="w-full mt-6 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2"
            >
                {loading ? '🔮 Tecendo o Ciclo...' : '🚀 Gerar Estratégia de Ciclo'}
            </button>
        </div>

        {/* Results */}
        {cycle && (
            <div className="animate-fade-in space-y-6">
                <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1">
                        <h3 className="text-3xl font-black mb-2">{cycle.theme}</h3>
                        <p className="opacity-80 italic">{cycle.rational}</p>
                    </div>
                    
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/20 w-full md:w-auto">
                        <label className="block text-[10px] font-black uppercase mb-2">Data da 1ª Reunião</label>
                        <div className="flex gap-2">
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-white text-slate-900 p-2 rounded-lg text-sm font-bold"
                            />
                            <button
                                onClick={() => {
                                  emitProcessDone('Prévia HTML do ciclo pronta.');
                                  exportCycleHtml(cycle, branch, startDate);
                                }}
                                className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest shadow-lg transition-all"
                                title="Salvar o ciclo completo como HTML responsivo"
                            >
                                HTML
                            </button>
                            <button
                                onClick={handleConfirmSchedule}
                                disabled={scheduling || !section}
                                title={!section ? 'Selecione uma seção para agendar' : ''}
                                className="bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest shadow-lg transition-all disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {scheduling ? '...' : '🗓️ Agendar'}
                            </button>
                        </div>
                        {feedback && <p role="status" className="mt-2 text-xs text-green-200 font-bold">{feedback}</p>}
                    </div>
                </div>

                <p className="text-xs text-slate-500 italic">
                    💡 Você pode editar título, descrição e foco; reordenar com ↑/↓; ou regenerar uma semana antes de agendar.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {cycle.meetings.map((m, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-indigo-200 transition-all relative overflow-hidden group flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-xs font-black text-indigo-600 uppercase tracking-widest">Semana {i+1}</div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => moveMeeting(i, -1)}
                                        disabled={i === 0}
                                        aria-label="Mover para cima"
                                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs px-1"
                                        title="Mover para cima"
                                    >▲</button>
                                    <button
                                        onClick={() => moveMeeting(i, 1)}
                                        disabled={i === cycle.meetings.length - 1}
                                        aria-label="Mover para baixo"
                                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs px-1"
                                        title="Mover para baixo"
                                    >▼</button>
                                    <button
                                        onClick={() => removeMeeting(i)}
                                        aria-label="Remover semana"
                                        className="text-slate-400 hover:text-red-600 text-xs px-1"
                                        title="Remover esta semana"
                                    >✕</button>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={m.theme}
                                onChange={e => updateMeeting(i, 'theme', e.target.value)}
                                className="font-bold text-slate-800 mb-2 w-full border-b border-dashed border-slate-200 focus:border-indigo-500 outline-none text-sm"
                                aria-label="Título da reunião"
                            />
                            <textarea
                                value={m.generalNotes}
                                onChange={e => updateMeeting(i, 'generalNotes', e.target.value)}
                                className="text-xs text-slate-500 leading-relaxed mb-3 w-full border border-slate-100 rounded p-1 resize-none focus:border-indigo-300 outline-none"
                                rows={3}
                                aria-label="Descrição da reunião"
                            />
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Foco de Progressão</span>
                                <input
                                    type="text"
                                    value={m.progressionObjective}
                                    onChange={e => updateMeeting(i, 'progressionObjective', e.target.value)}
                                    className="text-[10px] font-black text-slate-700 w-full bg-transparent outline-none"
                                    aria-label="Código do objetivo de progressão"
                                />
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 mb-3 space-y-2">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Acompanhamento e avaliação</span>
                                <textarea
                                    value={m.acompanhamento || ''}
                                    onChange={e => updateMeeting(i, 'acompanhamento', e.target.value)}
                                    className="text-[10px] text-emerald-900 w-full border border-emerald-100 rounded p-1 resize-none focus:border-emerald-300 outline-none"
                                    rows={2}
                                    placeholder="Como acompanhar a reunião"
                                    aria-label="Acompanhamento da reunião"
                                />
                                <textarea
                                    value={m.avaliacaoJovens || ''}
                                    onChange={e => updateMeeting(i, 'avaliacaoJovens', e.target.value)}
                                    className="text-[10px] text-emerald-900 w-full border border-emerald-100 rounded p-1 resize-none focus:border-emerald-300 outline-none"
                                    rows={2}
                                    placeholder="Autoavaliação/avaliação por pares"
                                    aria-label="Avaliação dos jovens"
                                />
                                <textarea
                                    value={m.avaliacaoChefia || ''}
                                    onChange={e => updateMeeting(i, 'avaliacaoChefia', e.target.value)}
                                    className="text-[10px] text-emerald-900 w-full border border-emerald-100 rounded p-1 resize-none focus:border-emerald-300 outline-none"
                                    rows={2}
                                    placeholder="Como a chefia avalia"
                                    aria-label="Avaliação da chefia"
                                />
                                <textarea
                                    value={(m.requisitosObservaveis || []).join('\n')}
                                    onChange={e => updateMeeting(i, 'requisitosObservaveis', lines(e.target.value))}
                                    className="text-[10px] text-emerald-900 w-full border border-emerald-100 rounded p-1 resize-none focus:border-emerald-300 outline-none font-mono"
                                    rows={2}
                                    placeholder="Requisitos observáveis"
                                    aria-label="Requisitos observáveis"
                                />
                                <textarea
                                    value={(m.criteriosDeAceite || []).join('\n')}
                                    onChange={e => updateMeeting(i, 'criteriosDeAceite', lines(e.target.value))}
                                    className="text-[10px] text-emerald-900 w-full border border-emerald-100 rounded p-1 resize-none focus:border-emerald-300 outline-none font-mono"
                                    rows={2}
                                    placeholder="Critérios de aceite"
                                    aria-label="Critérios de aceite"
                                />
                            </div>
                            <div className="mt-auto flex gap-1">
                                <button
                                    onClick={() => regenerateMeeting(i)}
                                    disabled={regeneratingIdx === i}
                                    className="flex-1 py-2 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase hover:bg-amber-100 transition-colors disabled:opacity-50"
                                    title="Regerar esta semana com IA, mantendo as outras"
                                >
                                    {regeneratingIdx === i ? '...' : '🔄 Regerar'}
                                </button>
                                <button
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('paxtu:generate_from_cycle', {
                                            detail: { theme: m.theme, objective: m.progressionObjective }
                                        }));
                                    }}
                                    className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors"
                                    title="Abre o gerador de roteiros com este foco"
                                >
                                    ✨ Roteiro
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={addMeeting}
                        className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-2 min-h-[200px]"
                    >
                        <span className="text-3xl">+</span>
                        <span className="text-xs font-bold">Adicionar semana</span>
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
