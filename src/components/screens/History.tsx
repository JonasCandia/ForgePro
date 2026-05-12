import React, { useState, useMemo } from 'react';
import { Trash2, Search, Calendar, ChevronDown, Flame, Download, CheckSquare, Square, ChevronUp, Settings2, SlidersHorizontal, Dumbbell } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, getYear, eachDayOfInterval, startOfYear, endOfYear, getDay, getWeek, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { workoutService } from '../../lib/workoutService';
import { WorkoutExerciseSummary, WorkoutSession } from '../../types';
import type { TipoSessaoTAF } from '../../types';
import { useWorkouts, useInvalidateWorkouts } from '../../hooks/useWorkouts';
import { exportToCSV, exportToJSON } from '../../lib/exportUtils';
import { formatarResumoExercicio } from '../../lib/exercicioUtils';
import { useToast } from '../../store/appStore';

function toDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  if (raw && typeof (raw as any).toDate === 'function') return (raw as any).toDate();
  return new Date(raw as string);
}

const TIPO_SESSAO_OPCOES: { value: TipoSessaoTAF; label: string; color: string }[] = [
  { value: 'forca',          label: 'Força',         color: '#F59E0B' },
  { value: 'intervalado',    label: 'Intervalado',    color: '#60A5FA' },
  { value: 'circuito_taf',   label: 'Circuito TAF',  color: '#A78BFA' },
  { value: 'corrida_longa',  label: 'Corrida Longa', color: '#34D399' },
  { value: 'simulado',       label: 'Simulado',       color: '#CCFF00' },
  { value: 'prevencao_lesao',label: 'Prevenção',      color: '#F87171' },
  { value: 'descanso',       label: 'Descanso',       color: '#6B7280' },
];

interface HistoryProps {
  onNavigate?: (screen: string) => void;
  onBack?: () => void;
}

const HEAT_COLORS = ['#1a1a1a', '#2d4a00', '#5a9200', '#99d000', '#CCFF00'];

function dayColor(count: number): string {
  if (count === 0) return HEAT_COLORS[0];
  if (count === 1) return HEAT_COLORS[1];
  if (count === 2) return HEAT_COLORS[2];
  if (count === 3) return HEAT_COLORS[3];
  return HEAT_COLORS[4];
}

function CalendarHeatmap({ data, year }: { data: { day: string; value: number }[]; year: number }) {
  const countMap = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach(({ day, value }) => m.set(day, value));
    return m;
  }, [data]);

  const days = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));
    return eachDayOfInterval({ start, end });
  }, [year]);

  // Build a 7-row (Sun–Sat) × N-col (weeks) grid
  const weeks = useMemo(() => {
    const result: (Date | null)[][] = [];
    // first week: pad with nulls until Jan 1
    const firstDow = getDay(days[0]); // 0=Sun
    let week: (Date | null)[] = Array(firstDow).fill(null);
    days.forEach(d => {
      week.push(d);
      if (week.length === 7) { result.push(week); week = []; }
    });
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      result.push(week);
    }
    return result;
  }, [days]);

  const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // Compute which column each month starts at
  const monthStarts = useMemo(() => {
    const seen = new Set<number>();
    return weeks.map((week, col) => {
      const firstReal = week.find(d => d !== null);
      if (!firstReal) return null;
      const m = firstReal.getMonth();
      if (!seen.has(m)) { seen.add(m); return m; }
      return null;
    });
  }, [weeks]);

  const CELL = 10; // px
  const GAP = 2;   // px
  const STEP = CELL + GAP;

  return (
    <div className="overflow-x-auto">
      <div style={{ position: 'relative', height: 7 * STEP + 14, minWidth: weeks.length * STEP + 28 }}>
        {/* Month labels */}
        {monthStarts.map((m, col) =>
          m !== null ? (
            <span
              key={col}
              style={{
                position: 'absolute',
                left: 28 + col * STEP,
                top: 0,
                fontSize: 9,
                color: '#6b7280',
                fontWeight: 700,
                fontFamily: 'inherit',
                lineHeight: '12px',
              }}
            >
              {MONTH_LABELS[m]}
            </span>
          ) : null
        )}
        {/* Day-of-week labels */}
        {['D','S','T','Q','Q','S','S'].map((label, row) => (
          row % 2 === 1 ? (
            <span
              key={row}
              style={{
                position: 'absolute',
                left: 0,
                top: 14 + row * STEP,
                width: 24,
                fontSize: 8,
                color: '#4b5563',
                fontWeight: 700,
                fontFamily: 'inherit',
                textAlign: 'right',
              }}
            >
              {label}
            </span>
          ) : null
        ))}
        {/* Cells */}
        {weeks.map((week, col) =>
          week.map((d, row) => {
            if (!d) return null;
            const key = format(d, 'yyyy-MM-dd');
            const count = countMap.get(key) ?? 0;
            return (
              <div
                key={key}
                title={`${format(d, "dd 'de' MMM", { locale: ptBR })}: ${count} treino${count !== 1 ? 's' : ''}`}
                style={{
                  position: 'absolute',
                  left: 28 + col * STEP,
                  top: 14 + row * STEP,
                  width: CELL,
                  height: CELL,
                  borderRadius: 2,
                  backgroundColor: dayColor(count),
                  border: '1px solid #111',
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default function History({ onNavigate }: HistoryProps) {
  const { data: workouts = [], isLoading: loading } = useWorkouts();
  const invalidateWorkouts = useInvalidateWorkouts();
  const addToast = useToast();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterObjetivo, setFilterObjetivo] = useState('');
  const [filterTipoSessao, setFilterTipoSessao] = useState<TipoSessaoTAF | ''>('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [calendarYear, setCalendarYear] = useState(getYear(new Date()));
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [startDate, endDate, filterGroup, filterObjetivo, filterTipoSessao].filter(Boolean).length;

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
      if (filterTipoSessao && w.tipoSessao !== filterTipoSessao) return false;
      if (filterTipoSessao && w.tipoSessao !== filterTipoSessao) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = (w.nomeTreino ?? '').toLowerCase().includes(q);
        const matchEx = w.exerciciosSummary?.some(s => s.exercicioNome.toLowerCase().includes(q));
        if (!matchName && !matchEx) return false;
      }
      return true;
    });
  }, [workouts, search, startDate, endDate, filterGroup, filterObjetivo, filterTipoSessao]);

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
    } catch (e) {
      console.error(e);
      addToast('error', 'Falha ao excluir treino. Tente novamente.');
    }
    finally { setDeleting(null); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Remover ${selected.size} treino${selected.size > 1 ? 's' : ''} do histórico?`)) return;
    setBulkDeleting(true);
    try {
      await workoutService.deleteManyWorkouts([...selected]);
      invalidateWorkouts();
      exitSelectMode();
    } catch (e) {
      console.error(e);
      addToast('error', 'Falha ao excluir treinos. Tente novamente.');
    }
    finally { setBulkDeleting(false); }
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
        <div className="flex items-center gap-2 flex-wrap">
          {selectMode ? (
            <>
              <button
                onClick={exitSelectMode}
                className="btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selected.size === 0 || bulkDeleting}
                className="btn-primary text-xs disabled:opacity-40 flex items-center gap-1.5"
              >
                {bulkDeleting
                  ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                  : <Trash2 size={13} />}
                {selected.size > 0 ? `Apagar (${selected.size})` : 'Apagar'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectMode(true)}
                disabled={workouts.length === 0}
                className="btn-secondary disabled:opacity-40 flex items-center gap-2 text-xs"
                title="Selecionar treinos"
              >
                <CheckSquare size={14} />
                Selecionar
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('manage-workouts')}
                  disabled={workouts.length === 0}
                  className="btn-secondary disabled:opacity-40 flex items-center gap-2 text-xs"
                  title="Gerenciar treinos"
                >
                  <Settings2 size={14} />
                  Gerenciar
                </button>
              )}
              <button
                onClick={() => exportToCSV(workouts)}
                disabled={workouts.length === 0}
                className="btn-secondary disabled:opacity-40 flex items-center gap-2 text-xs"
                title="Exportar histórico como CSV"
              >
                <Download size={14} />
                CSV
              </button>
              <button
                onClick={() => exportToJSON(workouts)}
                disabled={workouts.length === 0}
                className="btn-secondary disabled:opacity-40 flex items-center gap-2 text-xs"
                title="Exportar histórico como JSON"
              >
                <Download size={14} />
                JSON
              </button>
            </>
          )}
        </div>
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

        {/* Custom Calendar Heatmap */}
        <CalendarHeatmap data={heatmapData} year={calendarYear} />

        {/* Legend */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">Menos</span>
          {['#1a1a1a', '#2d4a00', '#5a9200', '#99d000', '#CCFF00'].map(c => (
            <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
          ))}
          <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">Mais</span>
        </div>
      </section>

      <div className="space-y-3">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar exercício ou treino..."
              className="form-input pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] rounded border text-xs font-bold uppercase tracking-wider transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-brand text-brand bg-brand/10'
                : 'border-outline text-gray-500 bg-surface-hover'
            }`}
            aria-expanded={showFilters}
            aria-label="Filtros avançados"
          >
            <SlidersHorizontal size={14} />
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-black bg-brand text-black rounded-full w-4 h-4 flex items-center justify-center leading-none">{activeFilterCount}</span>
            )}
          </button>
        </div>
        {showFilters && (
          <div className="space-y-3">
            {/* ── Tipo de Sessão — chip strip ─────────────────────────── */}
            <div>
              <label className="input-label">Tipo de Sessão</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TIPO_SESSAO_OPCOES.map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => setFilterTipoSessao(prev => prev === value ? '' : value as TipoSessaoTAF)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border transition-all ${
                      filterTipoSessao === value
                        ? 'text-black'
                        : 'border-outline text-gray-500 bg-surface-hover'
                    }`}
                    style={filterTipoSessao === value ? { background: color, borderColor: color } : undefined}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="card p-10 text-center space-y-4">
          {!search && !startDate && !filterGroup && !filterObjetivo && !filterTipoSessao ? (
            <>
              <Dumbbell size={40} className="mx-auto text-gray-700" />
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-gray-300">Sem treinos ainda</p>
                <p className="text-xs text-gray-600 mt-1">Cada sessão registrada aqui fica permanente e alimenta seus gráficos de progresso.</p>
              </div>
              <button
                onClick={() => onNavigate?.('log')}
                className="btn-primary mx-auto"
              >
                Registrar Primeiro Treino
              </button>
            </>
          ) : (
            <p className="text-sm font-bold text-gray-400">Nenhum treino corresponde aos filtros.</p>
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
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {selectMode && (
                        <button
                          onClick={() => toggleSelect(workout.id!)}
                          className="shrink-0 text-brand"
                          aria-label={selected.has(workout.id!) ? 'Desselecionar' : 'Selecionar'}
                        >
                          {selected.has(workout.id!)
                            ? <CheckSquare size={18} />
                            : <Square size={18} className="text-gray-500" />}
                        </button>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{workout.nomeTreino ?? 'Treino'}</p>
                        <div className="flex gap-2 mt-0.5 flex-wrap">
                          {workout.tipoSessao && (() => {
                            const opt = TIPO_SESSAO_OPCOES.find(o => o.value === workout.tipoSessao);
                            return opt ? (
                              <span
                                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-black"
                                style={{ background: opt.color }}
                              >
                                {opt.label}
                              </span>
                            ) : null;
                          })()}
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
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(workout.exerciciosSummary?.length ?? 0) > 0 && (
                        <button
                          onClick={() => toggleExpanded(workout.id!)}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"
                          aria-label={expanded.has(workout.id!) ? 'Recolher séries' : 'Expandir séries'}
                        >
                          {expanded.has(workout.id!)
                            ? <ChevronUp size={16} />
                            : <ChevronDown size={16} />}
                        </button>
                      )}
                      {!selectMode && (
                        <button
                          onClick={() => handleDelete(workout.id!)}
                          disabled={deleting === workout.id}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                          aria-label="Remover treino"
                        >
                          {deleting === workout.id
                            ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                            : <Trash2 size={16} />
                          }
                        </button>
                      )}
                    </div>
                  </div>
                  {(workout.exerciciosSummary?.length ?? 0) > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-600 border-b border-outline">
                            <th className="text-left p-3 font-black uppercase tracking-wider">Exercício</th>
                            <th className="text-center p-3 font-black uppercase tracking-wider">Séries</th>
                            <th className="text-center p-3 font-black uppercase tracking-wider">Resultado</th>
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
                              <td className="p-3 text-center font-mono font-bold text-brand">{formatarResumoExercicio(s)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Séries detalhadas expandidas */}
                  {expanded.has(workout.id!) && (workout.series?.length ?? 0) > 0 && (
                    <div className="border-t border-outline bg-surface/50">
                      <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Séries Detalhadas</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-600 border-b border-outline">
                              <th className="text-left px-2 py-2 font-black uppercase tracking-wider">Exercício</th>
                              <th className="text-center px-2 py-2 font-black uppercase tracking-wider">#</th>
                              <th className="text-center px-2 py-2 font-black uppercase tracking-wider">Peso</th>
                              <th className="text-center px-2 py-2 font-black uppercase tracking-wider">Reps</th>
                              <th className="text-center px-2 py-2 font-black uppercase tracking-wider">OK</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workout.series!.map((s, i) => (
                              <tr key={s.id ?? i} className="border-b border-outline/30 last:border-0">
                                <td className="px-2 py-2 font-medium max-w-[100px] truncate">{s.exercicioNome}</td>
                                <td className="px-2 py-2 text-center font-mono text-gray-500">{s.serieNum}</td>
                                <td className="px-2 py-2 text-center font-mono text-gray-300">
                                  {s.pesoReal > 0 ? `${s.pesoReal}kg` : s.tempoSegundos ? `${s.tempoSegundos}s` : '—'}
                                </td>
                                <td className="px-2 py-2 text-center font-mono text-gray-300">
                                  {s.distanciaMetros ? `${s.distanciaMetros}m` : s.repeticoesReais}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {s.falhou
                                    ? <span className="text-red-400 font-bold text-[10px] uppercase">Falhou</span>
                                    : <span className="text-brand font-bold text-[10px] uppercase">OK</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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