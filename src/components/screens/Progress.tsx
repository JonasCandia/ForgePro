import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { workoutService } from '../../lib/workoutService';
import { WorkoutSession } from '../../types';
import type { Exercício } from '../../types';

export default function Progress() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [exercises, setExercises] = useState<Exercício[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExId, setSelectedExId] = useState('');
  const [chartMode, setChartMode] = useState<'weight' | 'volume'>('weight');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [w, ex] = await Promise.all([workoutService.getWorkouts(), workoutService.getExercises()]);
      setWorkouts(w);
      setExercises(ex);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const chartData = useMemo(() => {
    if (!selectedExId) return [];
    return workouts
      .filter(w => w.exerciciosSummary?.some(s => s.exercicioId === selectedExId))
      .sort((a, b) => {
        const da = a.data instanceof Date ? a.data : (a.data as any)?.toDate?.() ?? new Date(a.data as any);
        const db = b.data instanceof Date ? b.data : (b.data as any)?.toDate?.() ?? new Date(b.data as any);
        return da.getTime() - db.getTime();
      })
      .map(w => {
        const date = w.data instanceof Date ? w.data : (w.data as any)?.toDate?.() ?? new Date(w.data as any);
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
    const totalSessions = chartData.length;
    return { maxWeight, growth, totalSessions };
  }, [chartData]);

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
        <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Analytics</h2>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Progresso</h1>
      </div>

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

      {selectedExId && (
        <>
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-black mb-1">Carga Máx.</p>
                <p className="font-display text-xl font-black text-brand">{stats.maxWeight}<span className="text-xs text-gray-500 ml-1">kg</span></p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-black mb-1">Evolução</p>
                <p className={`font-display text-xl font-black ${stats.growth >= 0 ? 'text-brand' : 'text-red-400'}`}>
                  {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
                </p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-black mb-1">Sessões</p>
                <p className="font-display text-xl font-black">{stats.totalSessions}</p>
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
                    className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider border transition-colors ${chartMode === mode ? 'bg-brand text-black border-brand' : 'bg-surface-hover border-outline text-gray-400'}`}
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
                    formatter={(val: number) => [chartMode === 'volume' ? `${val.toLocaleString()}kg` : `${val}kg`, chartMode === 'weight' ? 'Carga' : 'Volume']}
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
      )}

      {!selectedExId && (
        <div className="card p-8 text-center text-gray-500">
          <TrendingUp size={32} className="mx-auto mb-3 text-gray-700" />
          <p className="text-sm">Selecione um exercício para visualizar o progresso.</p>
        </div>
      )}
    </div>
  );
}