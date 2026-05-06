import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Search, Calendar, ChevronDown } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { workoutService } from '../../lib/workoutService';
import { WorkoutSession, WorkoutExerciseSummary } from '../../types';

interface HistoryProps {
  onBack?: () => void;
}

export default function History({ onBack }: HistoryProps) {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterObjetivo, setFilterObjetivo] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await workoutService.getWorkouts();
      setWorkouts(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const gruposMusculares = useMemo(() => {
    const groups = new Set<string>();
    workouts.forEach(w => w.exerciciosSummary?.forEach(s => { if (s.grupoMuscular) groups.add(s.grupoMuscular); }));
    return [...groups].sort();
  }, [workouts]);

  const filtered = useMemo(() => {
    return workouts.filter(w => {
      const date = w.data instanceof Date ? w.data : (w.data as any)?.toDate?.() ?? new Date(w.data as any);
      if (startDate) {
        try { if (!isWithinInterval(date, { start: startOfDay(parseISO(startDate)), end: endDate ? endOfDay(parseISO(endDate)) : endOfDay(new Date()) })) return false; }
        catch { return false; }
      }
      if (filterGroup && !w.exerciciosSummary?.some(s => s.grupoMuscular === filterGroup)) return false;
      if (filterObjetivo && w.objetivo !== filterObjetivo) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = (w.nomeTreino ?? '').toLowerCase().includes(q);
        const matchEx = w.exerciciosSummary?.some(s => s.exercicioNome.toLowerCase().includes(q));
        if (!matchName && !matchEx) return false;
      }
      return true;
    });
  }, [workouts, search, startDate, endDate, filterGroup, filterObjetivo]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    filtered.forEach(w => {
      const date = w.data instanceof Date ? w.data : (w.data as any)?.toDate?.() ?? new Date(w.data as any);
      const key = format(date, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    });
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  async function handleDelete(workoutId: string) {
    if (!window.confirm('Remover este treino do histórico?')) return;
    setDeleting(workoutId);
    try {
      await workoutService.deleteWorkout(workoutId);
      setWorkouts(prev => prev.filter(w => w.id !== workoutId));
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 pb-24">
      <div>
        <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Registro</h2>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Histórico</h1>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar exercício ou treino..."
            className="form-input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">De</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="date" className="form-input pl-9" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="input-label">Até</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="date" className="form-input pl-9" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Grupo Muscular</label>
            <div className="relative">
              <select className="form-input appearance-none pr-8" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                <option value="">Todos</option>
                {gruposMusculares.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="input-label">Objetivo</label>
            <div className="relative">
              <select className="form-input appearance-none pr-8" value={filterObjetivo} onChange={e => setFilterObjetivo(e.target.value)}>
                <option value="">Todos</option>
                <option value="cutting">Cutting</option>
                <option value="bulking">Bulking</option>
                <option value="manutencao">Manutenção</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p className="text-sm">Nenhum treino encontrado.</p>
        </div>
      ) : (
        grouped.map(([dateKey, dayWorkouts]) => {
          const date = parseISO(dateKey);
          return (
            <div key={dateKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-brand text-xs font-black uppercase tracking-widest">
                  {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
                <div className="flex-1 h-px bg-outline" />
              </div>
              {dayWorkouts.map(workout => (
                <div key={workout.id} className="card overflow-hidden">
                  <div className="p-4 flex items-center justify-between border-b border-outline">
                    <div>
                      <p className="font-bold text-sm">{workout.nomeTreino ?? 'Treino'}</p>
                      <div className="flex gap-2 mt-0.5">
                        {workout.objetivo && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 bg-surface-hover px-2 py-0.5 rounded">
                            {workout.objetivo}
                          </span>
                        )}
                        {workout.semana && (
                          <span className="text-[10px] text-gray-600">Sem. {workout.semana}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(workout.id!)}
                      disabled={deleting === workout.id}
                      className="p-2 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      {deleting === workout.id
                        ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 size={16} />
                      }
                    </button>
                  </div>
                  {(workout.exerciciosSummary?.length ?? 0) > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-600 border-b border-outline">
                            <th className="text-left p-3 font-black uppercase tracking-wider">Exercício</th>
                            <th className="text-center p-3 font-black uppercase tracking-wider">Séries</th>
                            <th className="text-center p-3 font-black uppercase tracking-wider">Reps</th>
                            <th className="text-center p-3 font-black uppercase tracking-wider">Carga</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workout.exerciciosSummary!.map((s: WorkoutExerciseSummary, i: number) => (
                            <tr key={i} className="border-b border-outline/50 last:border-0">
                              <td className="p-3">
                                <p className="font-medium">{s.exercicioNome}</p>
                                {s.grupoMuscular && <p className="text-gray-600">{s.grupoMuscular}</p>}
                              </td>
                              <td className="p-3 text-center text-gray-300">{s.seriesRealizadas}</td>
                              <td className="p-3 text-center text-gray-300">{s.repeticoesReais}</td>
                              <td className="p-3 text-center font-bold text-brand">{s.pesoMax}kg</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}