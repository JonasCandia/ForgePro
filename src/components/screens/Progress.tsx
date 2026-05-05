import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Dumbbell, Calendar, Info, ChevronDown } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { Registro, Exercício } from '../../types';

export default function Progress() {
  const [logs, setLogs] = useState<Registro[]>([]);
  const [exercises, setExercises] = useState<Exercício[]>([]);
  const [selectedExId, setSelectedExId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [logsData, exsData] = await Promise.all([
        workoutService.getRegistros(),
        workoutService.getExercises()
      ]);
      setLogs(logsData);
      setExercises(exsData);
      if (exsData.length > 0) setSelectedExId(exsData[0].id);
      setLoading(false);
    }
    load();
  }, []);

  const chartData = useMemo(() => {
    if (!selectedExId) return [];
    return logs
      .filter(log => log.exercicioId === selectedExId)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .map(log => ({
        date: format(new Date(log.data), 'dd/MM'),
        weight: log.pesoKg,
        volume: log.pesoKg * log.repeticoes * log.series,
        reps: log.repeticoes
      }));
  }, [logs, selectedExId]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { max: 0, growth: 0 };
    const weights = chartData.map(d => d.weight);
    const maxWeight = Math.max(...weights);
    const first = weights[0];
    const last = weights[weights.length - 1];
    const growth = first === 0 ? 0 : ((last - first) / first) * 100;
    return { max: maxWeight, growth: growth.toFixed(1) };
  }, [chartData]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-12 h-12 border-4 border-brand border-t-transparent animate-spin"></div></div>;

  return (
    <div className="space-y-8 pt-4 pb-24">
      <header className="space-y-2">
        <h2 className="text-brand text-xs font-black uppercase tracking-[0.3em]">Análise de PERFORMANCE</h2>
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter italic">Telemetria de Carga</h1>
      </header>

      {/* Selector */}
      <section className="space-y-2">
        <label className="input-label">Selecionar Exercício</label>
        <div className="relative">
          <select 
            className="form-input appearance-none !pr-12 font-black uppercase tracking-tight"
            value={selectedExId}
            onChange={(e) => setSelectedExId(e.target.value)}
          >
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id} className="bg-[var(--color-surface)] text-[var(--color-text-main)]">{ex.nome}</option>
            ))}
          </select>
          <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand pointer-events-none" />
        </div>
      </section>

      {/* Bento Stats */}
      <section className="grid grid-cols-2 gap-4">
        <div className="card bg-brand border-none shadow-[0_0_30px_rgba(204,255,0,0.25)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase text-black/60 leading-none mb-3 block tracking-widest">Recorde Máximo</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black font-mono text-black leading-none drop-shadow-sm">{stats.max}</span>
              <span className="text-xs font-black text-black/80">KG</span>
            </div>
          </div>
        </div>
        <div className="card border-brand/20 bg-[var(--color-surface-hover)]">
          <span className="text-[10px] font-black uppercase text-[var(--color-text-muted)] leading-none mb-3 block tracking-widest">Crescimento Total</span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className={`text-4xl font-black ${Number(stats.growth) >= 0 ? 'text-brand' : 'text-red-500'}`}>
              {Number(stats.growth) >= 0 ? '+' : ''}{stats.growth}%
            </span>
          </div>
        </div>
      </section>

      {/* Chart Card */}
      <section className="card p-8 min-h-[450px]">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-[var(--color-text-main)]">
            <div className="p-2 bg-brand/10 rounded-lg">
              <TrendingUp size={16} className="text-brand" />
            </div>
            Curva de Tensão Mecânica
          </h3>
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_rgba(204,255,0,0.8)]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-outline)]" />
          </div>
        </div>

        <div className="h-[280px] w-full">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#CCFF00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={15}
                  fontFamily="JetBrains Mono"
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${val}kg`}
                  fontFamily="JetBrains Mono"
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 15, 15, 0.95)', 
                    border: '1px solid rgba(204, 255, 0, 0.3)', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                  itemStyle={{ color: '#CCFF00' }}
                  cursor={{ stroke: 'rgba(204, 255, 0, 0.2)', strokeWidth: 20 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#CCFF00" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorWeight)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <div className="p-6 bg-[var(--color-surface-hover)] rounded-3xl mb-4">
                <Dumbbell size={48} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Dados insuficientes para análise.</p>
            </div>
          )}
        </div>
      </section>

      <div className="p-6 border border-brand/20 bg-brand/5 rounded-2xl flex items-start gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -z-10" />
        <div className="p-3 bg-brand/10 rounded-xl text-brand shrink-0">
          <Info size={24} />
        </div>
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] leading-none text-brand">Insights FORGE AI</h4>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Sua progressão é <span className="text-[var(--color-text-main)] font-bold">altamente estável</span>. O sistema detectou potencial para aumento de <span className="text-brand font-black italic">3-6% de carga</span> na próxima sessão para otimizar o recrutamento de fibras.
          </p>
        </div>
      </div>
    </div>
  );
}
