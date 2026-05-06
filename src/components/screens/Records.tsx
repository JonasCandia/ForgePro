import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Dumbbell, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { PersonalRecord } from '../../types';
import { useWorkouts } from '../../hooks/useWorkouts';
import { calcular1RM, calcular1RMDetalhado } from '../../lib/performanceUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OBJETIVO_LABEL: Record<string, string> = {
  cutting: 'Cutting',
  bulking: 'Bulking',
  manutencao: 'Manutenção',
};

export default function Records() {
  const { data: workouts = [], isLoading: loading } = useWorkouts();
  const [filterGroup, setFilterGroup] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const personalRecords = useMemo((): PersonalRecord[] => {
    const records = new Map<string, PersonalRecord>();
    workouts.forEach(w => {
      w.exerciciosSummary.forEach(s => {
        const reps = s.repsAtMax;
        const peso = s.pesoMax;
        const estimado1RM = calcular1RM(peso, reps);
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
      <div className="space-y-6 pt-4 pb-24">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="h-3 w-28 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
            <div className="h-7 w-44 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="w-24 h-7 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="h-11 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
        <div className="h-16 rounded-xl bg-surface-hover animate-pulse motion-reduce:animate-none" />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card p-5 h-24 animate-pulse motion-reduce:animate-none" />
        ))}
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
          1RM Estimado é a <span className="text-gray-300">média de 4 fórmulas</span>: Epley, Brzycki, Lander e O'Conner. Válido para séries de 1 a 15 repetições. Toque em um recorde para ver o detalhamento.
        </p>
      </div>

      {/* Records Grid */}
      {filtered.length === 0 ? (
        <div className="card border-dashed border-2 bg-transparent text-center py-20 text-gray-700">
          <Trophy size={48} className="mx-auto mb-4 opacity-10" />
          <p className="text-xs uppercase tracking-widest font-bold">Sem recordes ainda.</p>
          <p className="text-[10px] text-gray-600 mt-2">Complete séries com carga. O algoritmo calcula seu 1RM estimado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pr, idx) => {
            const detalhes = calcular1RMDetalhado(pr.pesoMax, pr.repsAtMax);
            const isExpanded = expandedId === pr.exercicioId;
            return (
              <div key={pr.exercicioId} className="card p-5 border-brand/20 hover:border-brand/40 transition-colors">
                <div
                  className="flex items-start justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : pr.exercicioId)}
                >
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
                  <div className="text-right flex-shrink-0 flex items-start gap-2">
                    <div>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-2xl font-mono font-black text-brand tracking-tighter">{pr.estimado1RM}</span>
                        <span className="text-[10px] text-gray-500 font-black uppercase">kg 1RM</span>
                      </div>
                      <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                        {pr.pesoMax}kg × {pr.repsAtMax} reps
                      </p>
                    </div>
                    {isExpanded
                      ? <ChevronUp size={14} className="text-gray-500 mt-1 flex-shrink-0" />
                      : <ChevronDown size={14} className="text-gray-500 mt-1 flex-shrink-0" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-outline grid grid-cols-2 gap-3">
                    <div className="bg-surface-hover rounded px-3 py-2">
                      <p className="text-[11px] text-gray-600 uppercase tracking-wider font-black">Epley</p>
                      <p className="text-xs font-bold text-white">{detalhes.epley} <span className="text-gray-500">kg</span></p>
                    </div>
                    <div className="bg-surface-hover rounded px-3 py-2">
                      <p className="text-[11px] text-gray-600 uppercase tracking-wider font-black">Brzycki</p>
                      <p className="text-xs font-bold text-white">{detalhes.brzycki} <span className="text-gray-500">kg</span></p>
                    </div>
                    <div className="bg-surface-hover rounded px-3 py-2">
                      <p className="text-[11px] text-gray-600 uppercase tracking-wider font-black">Lander</p>
                      <p className="text-xs font-bold text-white">{detalhes.lander} <span className="text-gray-500">kg</span></p>
                    </div>
                    <div className="bg-surface-hover rounded px-3 py-2">
                      <p className="text-[11px] text-gray-600 uppercase tracking-wider font-black">O'Conner</p>
                      <p className="text-xs font-bold text-white">{detalhes.oconner} <span className="text-gray-500">kg</span></p>
                    </div>
                    <div className="col-span-2 mt-1">
                      <span className="text-[11px] font-black uppercase tracking-widest text-gray-600">
                        {format(new Date(pr.data), "dd MMM yyyy", { locale: ptBR }).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {!isExpanded && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-outline">
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-600">
                      {format(new Date(pr.data), "dd MMM yyyy", { locale: ptBR }).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
