import React, { useState, useMemo } from 'react';
import { TrendingUp, ChevronDown, BarChart2, Activity, GitCompare, Dumbbell } from 'lucide-react';
import { format, subDays } from 'date-fns';
import type { Screen } from '../../App';
import {
  LineChart, Line,
  BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useExercises } from '../../hooks/useExercises';

type Tab = 'evolution' | 'volume' | 'radar' | 'blocos';
type RadarPeriod = 7 | 30 | 90;

function toDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  if (raw && typeof (raw as any).toDate === 'function') return (raw as any).toDate();
  return new Date(raw as string);
}

// Truncate long group names for chart labels
function shortLabel(s: string, max = 10) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export default function Progress({ onNavigate }: { onNavigate?: (screen: Screen) => void }) {
  const { data: workouts = [], isLoading: loadingWorkouts } = useWorkouts();
  const { data: exercises = [], isLoading: loadingExercises } = useExercises();
  const loading = loadingWorkouts || loadingExercises;

  const [tab, setTab] = useState<Tab>('evolution');
  const [selectedExId, setSelectedExId] = useState('');
  const [chartMode, setChartMode] = useState<'weight' | 'volume'>('weight');
  const [radarPeriod, setRadarPeriod] = useState<RadarPeriod>(30);

  // -- Evolution data ----------------------------------------------------------
  const chartData = useMemo(() => {
    if (!selectedExId) return [];
    return workouts
      .filter(w => w.exerciciosSummary?.some(s => s.exercicioId === selectedExId))
      .sort((a, b) => {
        const da = toDate(a.data);
        const db = toDate(b.data);
        return da.getTime() - db.getTime();
      })
      .map(w => {
        const date = toDate(w.data);
        const s = w.exerciciosSummary!.find(s => s.exercicioId === selectedExId)!;
        return { date: format(date, 'dd/MM'), weight: s.pesoMax, volume: s.volumeTotal ?? 0 };
      });
  }, [workouts, selectedExId]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const maxWeight = Math.max(...chartData.map(d => d.weight));
    const first = chartData[0].weight;
    const last = chartData[chartData.length - 1].weight;
    const growth = first > 0 ? ((last - first) / first) * 100 : 0;
    return { maxWeight, growth, totalSessions: chartData.length };
  }, [chartData]);

  // -- Volume by muscle group --------------------------------------------------
  const volumeByGroup = useMemo(() => {
    const map = new Map<string, number>();
    workouts.forEach(w => {
      w.exerciciosSummary?.forEach(s => {
        const g = s.grupoMuscular ?? 'Outros';
        map.set(g, (map.get(g) ?? 0) + (s.volumeTotal ?? 0));
      });
    });
    return Array.from(map.entries())
      .map(([group, volume]) => ({ group, volume }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);
  }, [workouts]);

  const maxVolume = Math.max(1, ...volumeByGroup.map(d => d.volume));

  // -- Radar: muscle group frequency ------------------------------------------
  const radarData = useMemo(() => {
    const cutoff = subDays(new Date(), radarPeriod);
    const map = new Map<string, number>();
    workouts
      .filter(w => {
        const d = toDate(w.data);
        return d >= cutoff;
      })
      .forEach(w => {
        const groups = new Set((w.exerciciosSummary ?? []).map(s => s.grupoMuscular ?? 'Outros'));
        groups.forEach(g => map.set(g, (map.get(g) ?? 0) + 1));
      });
    return Array.from(map.entries())
      .map(([group, count]) => ({ group: shortLabel(group, 11), count }))
      .sort((a, b) => b.count - a.count);
  }, [workouts, radarPeriod]);

  // -- Bloco 1 vs Bloco 2 -------------------------------------------------------
  const blocoComparacao = useMemo(() => {
    // Classify each finished workout into a bloco.
    // Priority: explicit bloco field > semana-based heuristic (1-4 = B1, 5+ = B2)
    function getBloco(w: (typeof workouts)[0]): 1 | 2 | null {
      if (w.bloco === 1 || w.bloco === 2) return w.bloco as 1 | 2;
      if (w.semana != null) return w.semana <= 4 ? 1 : 2;
      return null;
    }

    const b1 = workouts.filter(w => w.status === 'finalizado' && getBloco(w) === 1);
    const b2 = workouts.filter(w => w.status === 'finalizado' && getBloco(w) === 2);

    if (b1.length === 0 && b2.length === 0) return null;

    // Volume by muscle group per bloco
    function groupVolume(sessions: typeof workouts) {
      const map = new Map<string, number>();
      sessions.forEach(w => {
        w.exerciciosSummary?.forEach(s => {
          const g = s.grupoMuscular ?? 'Outros';
          map.set(g, (map.get(g) ?? 0) + (s.volumeTotal ?? 0));
        });
      });
      return map;
    }

    const vol1 = groupVolume(b1);
    const vol2 = groupVolume(b2);
    const allGroups = Array.from(new Set([...vol1.keys(), ...vol2.keys()]));
    const volumeChart = allGroups
      .map(g => ({ group: shortLabel(g, 12), b1: vol1.get(g) ?? 0, b2: vol2.get(g) ?? 0 }))
      .sort((a, b) => (b.b1 + b.b2) - (a.b1 + a.b2))
      .slice(0, 8);

    // Total volume per bloco
    function totalVol(sessions: typeof workouts) {
      return sessions.reduce((acc, w) => acc + (w.exerciciosSummary?.reduce((s, ex) => s + (ex.volumeTotal ?? 0), 0) ?? 0), 0);
    }

    // Avg load per exercise (top 8 by combined presence)
    function avgLoadMap(sessions: typeof workouts) {
      const map = new Map<string, { nome: string; totalPeso: number; count: number }>();
      sessions.forEach(w => {
        w.exerciciosSummary?.forEach(s => {
          if (s.pesoMax > 0) {
            const entry = map.get(s.exercicioId) ?? { nome: s.exercicioNome, totalPeso: 0, count: 0 };
            entry.totalPeso += s.pesoMax;
            entry.count += 1;
            map.set(s.exercicioId, entry);
          }
        });
      });
      return map;
    }

    const load1 = avgLoadMap(b1);
    const load2 = avgLoadMap(b2);
    const allExIds = Array.from(new Set([...load1.keys(), ...load2.keys()]));
    const loadChart = allExIds
      .map(id => {
        const e1 = load1.get(id);
        const e2 = load2.get(id);
        const nome = (e1 ?? e2)!.nome;
        return {
          nome: nome.length > 14 ? nome.slice(0, 13) + '…' : nome,
          b1: e1 ? Math.round(e1.totalPeso / e1.count) : 0,
          b2: e2 ? Math.round(e2.totalPeso / e2.count) : 0,
        };
      })
      .filter(d => d.b1 > 0 || d.b2 > 0)
      .sort((a, b) => Math.max(b.b1, b.b2) - Math.max(a.b1, a.b2))
      .slice(0, 8);

    return {
      sessoes: { b1: b1.length, b2: b2.length },
      volume:  { b1: totalVol(b1), b2: totalVol(b2) },
      volumeChart,
      loadChart,
      hasData: volumeChart.length > 0 || loadChart.length > 0,
    };
  }, [workouts]);

  if (loading) {
    return (
      <div className="space-y-6 pt-4 pb-24">
        <div className="space-y-1">
          <div className="h-7 w-36 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="h-11 rounded-xl bg-surface-hover animate-pulse motion-reduce:animate-none" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="card p-4 h-20 animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
        <div className="card p-4 h-64 animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 pb-24">
      {workouts.length === 0 && (
        <div className="card p-10 text-center space-y-4">
          <TrendingUp size={40} className="mx-auto text-gray-700" />
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-gray-300">Sem dados de progressão</p>
            <p className="text-xs text-gray-600 mt-1">Registre treinos com carga e os gráficos de evolução, volume e mapa muscular serão gerados automaticamente.</p>
          </div>
          <button onClick={() => onNavigate?.('log')} className="btn-primary mx-auto">
            Registrar Primeiro Treino
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface-hover rounded-xl border border-outline">
        {([
          { key: 'evolution', label: 'Evolução',      icon: <TrendingUp size={12} /> },
          { key: 'volume',    label: 'Volume',         icon: <BarChart2  size={12} /> },
          { key: 'radar',     label: 'Mapa Muscular',  icon: <Activity   size={12} /> },
          { key: 'blocos',    label: 'Blocos',         icon: <GitCompare size={12} /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
              tab === t.key ? 'bg-brand text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* -- TAB: EVOLUTION --------------------------------------------------- */}
      {tab === 'evolution' && (
        <>
          <div>
            <label className="input-label">Exercício</label>
            <div className="relative">
              <select
                className="form-input appearance-none pr-8"
                value={selectedExId}
                onChange={e => setSelectedExId(e.target.value)}
              >
                <option value="">Selecione um exercício</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.nome}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {selectedExId ? (
            <>
              {stats && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="card p-4 text-center">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-black mb-1">Carga Máx.</p>
                    <p className="font-mono text-xl font-black text-brand">
                      {stats.maxWeight}<span className="text-xs text-gray-500 ml-1">kg</span>
                    </p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-black mb-1">Evolução</p>
                    <p className={`font-mono text-xl font-black ${stats.growth >= 0 ? 'text-brand' : 'text-red-400'}`}>
                      {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
                    </p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-black mb-1">Sessões</p>
                    <p className="font-mono text-xl font-black">{stats.totalSessions}</p>
                  </div>
                </div>
              )}

              <div className="card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp size={16} className="text-brand" />
                    Evolução
                  </h3>
                  <div className="flex gap-1">
                    {(['weight', 'volume'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setChartMode(mode)}
                        className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider border transition-colors ${
                          chartMode === mode ? 'bg-brand text-black border-brand' : 'bg-surface-hover border-outline text-gray-400'
                        }`}
                      >
                        {mode === 'weight' ? 'Carga' : 'Volume'}
                      </button>
                    ))}
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#666' }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#666' }}
                        tickFormatter={val => chartMode === 'volume' && val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                        labelStyle={{ color: '#CCFF00' }}
                        formatter={(val) => [
                          chartMode === 'volume' ? `${Number(val).toLocaleString()}kg` : `${val}kg`,
                          chartMode === 'weight' ? 'Carga' : 'Volume',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey={chartMode === 'weight' ? 'weight' : 'volume'}
                        stroke="#CCFF00"
                        strokeWidth={2}
                        dot={{ fill: '#CCFF00', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
                    Sem dados para exibir
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card p-8 text-center text-gray-500">
              <TrendingUp size={32} className="mx-auto mb-3 text-gray-700" />
              <p className="text-sm">Selecione um exercício. O gráfico mostra cada evolução de carga.</p>
            </div>
          )}
        </>
      )}

      {/* -- TAB: VOLUME BY GROUP ---------------------------------------------- */}
      {tab === 'volume' && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-brand" />
            <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
              Volume Total por Grupo Muscular
            </h3>
          </div>

          {volumeByGroup.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={volumeByGroup}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#666' }}
                    tickFormatter={val => val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="group"
                    width={90}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickFormatter={s => shortLabel(s, 12)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(val) => [`${Number(val).toLocaleString()} kg`, 'Volume']}
                  />
                  <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                    {volumeByGroup.map((entry, index) => (
                      <Cell
                        key={entry.group}
                        fill={`rgba(204,255,0,${0.35 + 0.65 * (entry.volume / maxVolume)})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-gray-600 text-center">
                Volume acumulado (kg) em todos os treinos registrados
              </p>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              Nenhum dado disponível ainda.
            </div>
          )}
        </div>
      )}

      {/* -- TAB: RADAR MUSCULAR ----------------------------------------------- */}
      {tab === 'radar' && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-brand" />
              <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                Mapa Muscular
              </h3>
            </div>
            <div className="flex gap-1">
              {([7, 30, 90] as RadarPeriod[]).map(p => (
                <button
                  key={p}
                  onClick={() => setRadarPeriod(p)}
                  className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border transition-colors ${
                    radarPeriod === p ? 'bg-brand text-black border-brand' : 'bg-surface-hover border-outline text-gray-400'
                  }`}
                >
                  {p}d
                </button>
              ))}
            </div>
          </div>

          {radarData.length >= 3 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                  <PolarGrid stroke="#2a2a2a" />
                  <PolarAngleAxis
                    dataKey="group"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    tick={{ fontSize: 9, fill: '#555' }}
                    tickCount={4}
                  />
                  <Radar
                    dataKey="count"
                    stroke="#CCFF00"
                    fill="#CCFF00"
                    fillOpacity={0.25}
                    strokeWidth={2}
                    dot={{ fill: '#CCFF00', r: 3 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val) => { const n = Number(val); return [`${n} sessão${n !== 1 ? 'ões' : ''}`, 'Treinos']; }}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-gray-600 text-center">
                Sessões por grupo muscular nos últimos {radarPeriod} dias
              </p>
            </>
          ) : radarData.length > 0 ? (
            // Fallback to BarChart when fewer than 3 groups (RadarChart needs = 3)
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={radarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="group" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#666' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val) => { const n = Number(val); return [`${n} sessão${n !== 1 ? 'ões' : ''}`, 'Treinos']; }}
                  />
                  <Bar dataKey="count" fill="#CCFF00" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-gray-600 text-center">
                Sessões nos últimos {radarPeriod} dias. O radar está disponível com = 3 grupos.
              </p>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              Nenhum treino nos últimos {radarPeriod} dias.
            </div>
          )}
        </div>
      )}
      {/* -- TAB: BLOCOS -------------------------------------------------------- */}
      {tab === 'blocos' && (
        <div className="space-y-5">
          {!blocoComparacao || !blocoComparacao.hasData ? (
            <div className="card p-8 text-center text-gray-500 space-y-3">
              <GitCompare size={32} className="mx-auto text-gray-700" />
              <p className="text-sm">Nenhum dado de bloco disponível ainda.</p>
              <p className="text-[11px] leading-relaxed">
                Execute treinos de um plano importado com campo <span className="text-brand font-mono">bloco</span> ou <span className="text-brand font-mono">semana</span>.<br/>
                Semanas 1–4 = Bloco 1 · Semanas 5+ = Bloco 2
              </p>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 border-l-4 border-blue-500">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Bloco 1</p>
                  <p className="font-mono text-2xl font-black">{blocoComparacao.sessoes.b1}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">sessões</p>
                  <p className="font-mono text-sm font-black text-blue-400 mt-2">
                    {(blocoComparacao.volume.b1 / 1000).toFixed(1)}k <span className="text-[10px] text-gray-500 font-normal">kg vol.</span>
                  </p>
                </div>
                <div className="card p-4 border-l-4 border-brand">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand mb-2">Bloco 2</p>
                  <p className="font-mono text-2xl font-black">{blocoComparacao.sessoes.b2}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">sessões</p>
                  <p className="font-mono text-sm font-black text-brand mt-2">
                    {(blocoComparacao.volume.b2 / 1000).toFixed(1)}k <span className="text-[10px] text-gray-500 font-normal">kg vol.</span>
                  </p>
                </div>
              </div>

              {/* Volume delta badge */}
              {blocoComparacao.volume.b1 > 0 && blocoComparacao.volume.b2 > 0 && (() => {
                const pct = ((blocoComparacao.volume.b2 - blocoComparacao.volume.b1) / blocoComparacao.volume.b1) * 100;
                return (
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${pct >= 0 ? 'bg-brand/5 border-brand/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <TrendingUp size={14} className={pct >= 0 ? 'text-brand' : 'text-red-400'} />
                    <p className="text-sm font-black">
                      <span className={pct >= 0 ? 'text-brand' : 'text-red-400'}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</span>
                      <span className="text-gray-400 font-normal ml-1.5 text-xs">de volume total do Bloco 1 → Bloco 2</span>
                    </p>
                  </div>
                );
              })()}

              {/* Volume by muscle group chart */}
              {blocoComparacao.volumeChart.length > 0 && (
                <div className="card p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-outline">
                    <BarChart2 size={13} className="text-brand" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Volume por Grupo Muscular</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(200, blocoComparacao.volumeChart.length * 42)}>
                    <BarChart
                      data={blocoComparacao.volumeChart}
                      layout="vertical"
                      margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: '#666' }}
                        tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="group"
                        width={88}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(val, name) => [`${Number(val).toLocaleString()} kg`, name === 'b1' ? 'Bloco 1' : 'Bloco 2']}
                      />
                      <Legend formatter={v => v === 'b1' ? 'Bloco 1' : 'Bloco 2'} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="b1" fill="#60A5FA" fillOpacity={0.8} radius={[0, 3, 3, 0]} barSize={10} />
                      <Bar dataKey="b2" fill="#CCFF00" fillOpacity={0.85} radius={[0, 3, 3, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Avg load per exercise chart */}
              {blocoComparacao.loadChart.length > 0 && (
                <div className="card p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-outline">
                    <TrendingUp size={13} className="text-brand" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Carga Média por Exercício (kg)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(200, blocoComparacao.loadChart.length * 42)}>
                    <BarChart
                      data={blocoComparacao.loadChart}
                      layout="vertical"
                      margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#666' }} />
                      <YAxis
                        type="category"
                        dataKey="nome"
                        width={100}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(val, name) => [`${val} kg`, name === 'b1' ? 'Bloco 1' : 'Bloco 2']}
                      />
                      <Legend formatter={v => v === 'b1' ? 'Bloco 1' : 'Bloco 2'} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="b1" fill="#60A5FA" fillOpacity={0.8} radius={[0, 3, 3, 0]} barSize={10} />
                      <Bar dataKey="b2" fill="#CCFF00" fillOpacity={0.85} radius={[0, 3, 3, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-gray-600 text-center">Média da carga máxima por sessão em cada exercício</p>
                </div>
              )}

              <p className="text-[10px] text-gray-600 text-center pb-2">
                Bloco 1 = semanas 1–4 · Bloco 2 = semanas 5–8
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
