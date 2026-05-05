import React, { useState, useEffect, useMemo } from 'react';
import { Registro, Exercício } from '../../types';
import { workoutService } from '../../lib/workoutService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Dumbbell, Calendar } from 'lucide-react';

export default function Progress() {
  const [logs, setLogs] = useState<Registro[]>([]);
  const [exercises, setExercises] = useState<Exercício[]>([]);
  const [selectedExId, setSelectedExId] = useState('1'); // Default to Supino

  useEffect(() => {
    async function load() {
      const [logsData, exsData] = await Promise.all([
        workoutService.getRegistros(),
        workoutService.getExercises()
      ]);
      setLogs(logsData);
      setExercises(exsData);
    }
    load();
  }, []);

  const chartData = useMemo(() => {
    return logs
      .filter(log => log.exercicioId === selectedExId)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .map(log => ({
        date: format(new Date(log.data), 'dd/MM'),
        dateObj: new Date(log.data),
        weight: log.pesoKg,
        volume: log.pesoKg * log.repeticoes * log.series
      }));
  }, [logs, selectedExId]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { max: 0, growth: 0 };
    const maxWeight = Math.max(...chartData.map(d => d.weight));
    const first = chartData[0].weight;
    const last = chartData[chartData.length - 1].weight;
    const growth = first === 0 ? 0 : ((last - first) / first) * 100;
    return { max: maxWeight, growth: growth.toFixed(1) };
  }, [chartData]);

  return (
    <div className="space-y-6 pt-4 pb-24">
      <header className="mb-6">
        <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Métricas de Performance</h2>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Análise de Progresso</h1>
      </header>

      {/* Exercise Picker */}
      <section className="space-y-1.5">
        <label className="input-label">Selecionar Unidade de Medida</label>
        <div className="relative">
          <select 
            className="w-full bg-surface-hover border border-input-border rounded px-4 py-3 text-xs focus:border-brand focus:ring-0 transition-colors appearance-none font-bold uppercase text-white"
            value={selectedExId}
            onChange={(e) => setSelectedExId(e.target.value)}
          >
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id} className="bg-surface">{ex.nome}</option>
            ))}
          </select>
          <Dumbbell size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand" />
        </div>
      </section>

      {/* Summary Stats */}
      <section className="grid grid-cols-2 gap-4">
        <div className="card flex flex-col justify-center border-l-4 border-l-brand">
          <span className="input-label !mb-0 !text-[9px]">Recorde Pessoal</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-display font-black text-brand tracking-tighter">{stats.max}</span>
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">KG</span>
          </div>
        </div>
        <div className="card flex flex-col justify-center border-l-4 border-l-white">
          <span className="input-label !mb-0 !text-[9px]">Ganhos Brutos</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-3xl font-display font-black tracking-tighter ${Number(stats.growth) >= 0 ? 'text-white' : 'text-red-500'}`}>
              {Number(stats.growth) >= 0 ? '+' : ''}{stats.growth}%
            </span>
            <TrendingUp size={14} className={Number(stats.growth) >= 0 ? 'text-brand' : 'text-red-500'} />
          </div>
        </div>
      </section>

      {/* Chart */}
      <section className="card p-6 min-h-[380px] bg-surface-hover border-outline">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-brand text-[10px] font-black tracking-[0.2em] uppercase">Evolução de Carga / Tempo</h3>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
          </div>
        </div>
        
        <div className="h-[250px] w-full">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#CCFF00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#444" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                  fontFamily="JetBrains Mono"
                />
                <YAxis 
                  stroke="#444" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${val}kg`}
                  fontFamily="JetBrains Mono"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '4px', fontSize: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#CCFF00', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#CCFF00" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorWeight)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-700 text-[11px] uppercase tracking-widest font-black text-center px-12">
              <Dumbbell size={32} className="mb-4 opacity-5" />
              <p>Dados insuficientes para geração de telemetria.</p>
            </div>
          )}
        </div>
      </section>

      <div className="p-4 bg-brand/5 border border-brand/10 rounded flex items-center gap-4">
        <div className="bg-brand p-2 rounded">
           <TrendingUp size={16} className="text-black" />
        </div>
        <p className="text-[10px] text-gray-400 leading-normal uppercase tracking-wider font-bold">
          A otimização de carga foi detectada. <span className="text-white">Mantenha o protocolo atual</span> para maximizar a hipertrofia.
        </p>
      </div>
    </div>
  );
}
