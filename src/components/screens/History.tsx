import React, { useState, useMemo } from 'react';
import { Trash2, Search, Calendar, ChevronDown, Flame, Download } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, getYear, subYears, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveCalendar } from '@nivo/calendar';
import { workoutService } from '../../lib/workoutService';
import { WorkoutExerciseSummary, WorkoutSession } from '../../types';
import { useWorkouts, useInvalidateWorkouts } from '../../hooks/useWorkouts';
import { exportToCSV } from '../../lib/exportUtils';

function toDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  if (raw && typeof (raw as any).toDate === 'function') return (raw as any).toDate();
  return new Date(raw as string);
}

interface HistoryProps {
  onBack?: () => void;
}

export default function History({ onBack }: HistoryProps) {
  const { data: workouts = [], isLoading: loading } = useWorkouts();
  const invalidateWorkouts = useInvalidateWorkouts();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterObjetivo, setFilterObjetivo] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [calendarYear, setCalendarYear] = useState(getYear(new Date()));

  // -- Heatmap data ------------------------------------------------------------
  const heatmapData = useMemo(() => {
    const map = new Map<string, number>();
    workouts.forEach(w => {
      const d = toDate(w.data);
      if (getYear(d) !== calendarYear) return;
      const key = format(d, 'yyyy-MM-dd');
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([day, value]) => ({ day, value }));
  }, [workouts, calendarYear]);

  const calendarFrom = `${calendarYear}-01-01`;
  const calendarTo   = `${calendarYear}-12-31`;
  const totalWorkoutsYear = heatmapData.reduce((s, d) => s + d.value, 0);
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    workouts.forEach(w => {
      const d = toDate(w.data);
      years.add(getYear(d));
    });
    years.add(getYear(new Date()));
    return [...years].sort((a, b) => b - a);
  }, [workouts]);

  const gruposMusculares = useMemo(() => {
    const groups = new Set<string>();
    workouts.forEach(w => w.exerciciosSummary?.forEach(s => { if (s.grupoMuscular) groups.add(s.grupoMuscular); }));
    return [...groups].sort();
  }, [workouts]);

  const filtered = useMemo(() => {
    return workouts.filter(w => {
      const date = toDate(w.data);
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
      const date = toDate(w.data);
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
      invalidateWorkouts();
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  }

  if (loading) {
    return (
      <div className="space-y-6 pt-4 pb-24">
        <div className="space-y-1">
          <div className="h-3 w-16 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          <div className="h-7 w-32 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="card p-4 h-52 animate-pulse motion-reduce:animate-none" />
        <div className="space-y-2">
          <div className="h-11 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
            <div className="h-16 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} className="card p-4 h-28 animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 pb-24">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Registro</h2>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Histórico</h1>
        </div>
        <button
          onClick={() => exportToCSV(workouts)}
          disabled={workouts.length === 0}
          className="btn-secondary disabled:opacity-40 flex items-center gap-2 text-xs"
          title="Exportar histórico como CSV"
        >
          <Download size={14} />
          CSV
        </button>
      </div>

      {/* -- Heatmap anual --------------------------------------------------- */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-brand" />
            <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-black">
              Consistência Anual
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
              {totalWorkoutsYear} treino{totalWorkoutsYear !== 1 ? 's' : ''}
            </span>
            <select
              className="bg-surface-hover border border-outline rounded px-2 py-1 text-[10px] font-bold text-white"
              value={calendarYear}
              onChange={e => setCalendarYear(Number(e.target.value))}
            >
              {availableYears.map(y => (
                <option key={y} value={y} className="bg-surface">{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Nivo Calendar – needs a fixed height container */}
        <div style={{ height: 160 }} className="w-full overflow-hidden">
          <ResponsiveCalendar
            data={heatmapData}
            from={calendarFrom}
            to={calendarTo}
            emptyColor="#1a1a1a"
            colors={['#2d4a00', '#5a9200', '#99d000', '#CCFF00']}
            margin={{ top: 20, right: 4, bottom: 0, left: 28 }}
            yearSpacing={0}
            monthBorderColor="#111"
            dayBorderWidth={2}
            dayBorderColor="#111"
            monthLegendOffset={10}
            legends={[]}
            tooltip={({ day, value }) => (
              <div
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 11,
                  color: '#CCFF00',
                  fontWeight: 700,
                }}
              >
                {format(parseISO(day), "dd 'de' MMM", { locale: ptBR })}
                {': '}
                {value} treino{(value as unknown as number) !== 1 ? 's' : ''}
              </div>
            )}
            theme={{
              text: { fontSize: 10, fill: '#6b7280', fontFamily: 'inherit' },
              tooltip: { container: { background: 'transparent', boxShadow: 'none', padding: 0 } },
            }}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">Menos</span>
          {['#1a1a1a', '#2d4a00', '#5a9200', '#99d000', '#CCFF00'].map(c => (
            <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
          ))}
          <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">Mais</span>
        </div>
      </section>

      <div className="space-y-4">
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
        <div className="card p-8 text-center space-y-2">
          <p className="text-sm font-bold text-gray-400">
            {search || startDate || filterGroup || filterObjetivo
              ? 'Nenhum treino corresponde aos filtros.'
              : 'Sem treinos ainda.'}
          </p>
          {!search && !startDate && !filterGroup && !filterObjetivo && (
            <p className="text-xs text-gray-600">
              Cada sessão aqui é permanente. Registre a primeira agora.
            </p>
          )}
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
                          <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 bg-surface-hover px-2 py-0.5 rounded">
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
                        ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
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
                              <td className="p-3 text-center font-mono text-gray-300">{s.seriesRealizadas}</td>
                              <td className="p-3 text-center font-mono text-gray-300">{s.repeticoesReais}</td>
                              <td className="p-3 text-center font-mono font-bold text-brand">{s.pesoMax}kg</td>
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