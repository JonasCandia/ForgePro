import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Dumbbell, TrendingUp } from 'lucide-react';
import { WorkoutSession, PersonalRecord } from '../../types';
import { workoutService } from '../../lib/workoutService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function calcularERM(peso: number, reps: number): number {
  if (reps <= 0 || reps > 15 || peso <= 0) return peso;
  return Math.round(peso * (36 / (37 - reps)) * 10) / 10;
}

const OBJETIVO_LABEL: Record<string, string> = {
  cutting: 'Cutting',
  bulking: 'Bulking',
  manutencao: 'Manutenção',
};

export default function Records() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState('');

  useEffect(() => {
    async function load() {
      const data = await workoutService.getWorkouts();
      setWorkouts(data);
      setLoading(false);
    }
    load();
  }, []);

  const personalRecords = useMemo((): PersonalRecord[] => {
    const records = new Map<string, PersonalRecord>();
    workouts.forEach(w => {
      w.exerciciosSummary.forEach(s => {
        const reps = s.repsAtMax;
        const peso = s.pesoMax;
        const estimado1RM = calcularERM(peso, reps);
        const existing = records.get(s.exercicioId);
        if (!existing || estimado1RM > existing.estimado1RM) {
          records.set(s.exercicioId, {
            exercicioId: s.exercicioId,
            exercicioNome: s.exercicioNome,
            grupoMuscular: s.grupoMuscular,
            pesoMax: peso,
            repsAtMax: reps,
            estimado1RM,
            data: w.data,
          });
        }
      });
    });
    return Array.from(records.values()).sort((a, b) => b.estimado1RM - a.estimado1RM);
  }, [workouts]);

  const muscleGroups = useMemo(() => {
    return Array.from(new Set(personalRecords.map(pr => pr.grupoMuscular || '').filter(Boolean))).sort();
  }, [personalRecords]);

  const filtered = filterGroup
    ? personalRecords.filter(pr => pr.grupoMuscular === filterGroup)
    : personalRecords;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 pb-24">
      <header className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Melhores Marcas</h2>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Recordes Pessoais</h1>
        </div>
        <div className="text-[10px] bg-surface px-3 py-1.5 rounded text-gray-400 border border-outline font-bold uppercase tracking-wider">
          {filtered.length} Exercícios
        </div>
      </header>

      {/* Filter */}
      <section className="space-y-1.5">
        <label className="input-label">Filtrar por Grupo Muscular</label>
        <div className="relative">
          <select
            className="w-full bg-surface-hover border border-input-border rounded px-4 py-3 text-xs focus:border-brand focus:ring-0 transition-colors appearance-none font-bold uppercase text-white"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
          >
            <option value="" className="bg-surface">Todos os grupos</option>
            {muscleGroups.map(g => (
              <option key={g} value={g} className="bg-surface">{g}</option>
            ))}
          </select>
          <Dumbbell size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand pointer-events-none" />
        </div>
      </section>

      {/* Legend */}
      <div className="p-4 bg-surface-hover rounded-xl border border-dashed border-outline flex items-start gap-3">
        <TrendingUp size={16} className="text-brand mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold leading-relaxed">
          1RM Estimado calculado pela fórmula de Brzycki: <span className="text-gray-300">Peso × (36 ÷ (37 − Reps))</span>. Válido para séries de 1 a 15 repetições.
        </p>
      </div>

      {/* Records Grid */}
      {filtered.length === 0 ? (
        <div className="card border-dashed border-2 bg-transparent text-center py-20 text-gray-700">
          <Trophy size={48} className="mx-auto mb-4 opacity-10" />
          <p className="text-xs uppercase tracking-widest font-bold">Nenhum recorde registrado</p>
          <p className="text-[10px] text-gray-600 mt-2">Complete treinos para gerar seus recordes pessoais.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pr, idx) => (
            <div key={pr.exercicioId} className="card p-5 border-l-4 border-l-brand hover:border-white transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-brand/10 border border-brand/20 rounded px-2 py-1 text-brand text-[10px] font-black tracking-wider flex-shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-white uppercase tracking-tight truncate">{pr.exercicioNome}</h3>
                    {pr.grupoMuscular && (
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{pr.grupoMuscular}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-2xl font-display font-black text-brand tracking-tighter">{pr.estimado1RM}</span>
                    <span className="text-[10px] text-gray-500 font-black uppercase">kg 1RM</span>
                  </div>
                  <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                    {pr.pesoMax}kg × {pr.repsAtMax} reps
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-outline">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                  {format(new Date(pr.data), "dd MMM yyyy", { locale: ptBR }).toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
