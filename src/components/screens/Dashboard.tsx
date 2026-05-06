import React, { useState, useEffect } from 'react';
import { Dumbbell, TrendingUp, Calendar, Trophy, Play } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { workoutService } from '../../lib/workoutService';
import { WorkoutSession } from '../../types';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await workoutService.getWorkouts();
      setWorkouts(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const workoutsThisMonth = workouts.filter(w => {
    const date = w.data instanceof Date ? w.data : (w.data as any)?.toDate?.() ?? new Date(w.data as any);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  }).length;

  const maxWeight = Math.max(
    0,
    ...workouts.flatMap(w => (w.exerciciosSummary ?? []).map(s => s.pesoMax ?? 0))
  );

  const recentWorkouts = [...workouts]
    .sort((a, b) => {
      const da = a.data instanceof Date ? a.data : (a.data as any)?.toDate?.() ?? new Date(a.data as any);
      const db = b.data instanceof Date ? b.data : (b.data as any)?.toDate?.() ?? new Date(b.data as any);
      return db.getTime() - da.getTime();
    })
    .slice(0, 3);

  return (
    <div className="space-y-6 pt-4 pb-24">
      <div>
        <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">
          {format(now, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Dashboard</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-brand" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-black">Treinos no Mês</span>
              </div>
              <p className="font-display text-3xl font-black text-brand">{workoutsThisMonth}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={14} className="text-brand" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-black">Carga Máxima</span>
              </div>
              <p className="font-display text-3xl font-black text-brand">
                {maxWeight > 0 ? maxWeight : '—'}
                {maxWeight > 0 && <span className="text-sm text-gray-500 ml-1">kg</span>}
              </p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell size={14} className="text-brand" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-black">Total de Treinos</span>
              </div>
              <p className="font-display text-3xl font-black">{workouts.length}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-brand" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-black">Exercícios</span>
              </div>
              <p className="font-display text-3xl font-black">
                {new Set(workouts.flatMap(w => (w.exerciciosSummary ?? []).map(s => s.exercicioId))).size}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onNavigate('log')} className="btn-primary justify-center">
              <Dumbbell size={16} />
              Registrar Treino
            </button>
            <button onClick={() => onNavigate('execute')} className="btn-secondary justify-center">
              <Play size={16} />
              Executar Plano
            </button>
          </div>

          {recentWorkouts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Treinos Recentes</h3>
              {recentWorkouts.map(w => {
                const date = w.data instanceof Date ? w.data : (w.data as any)?.toDate?.() ?? new Date(w.data as any);
                return (
                  <div key={w.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{w.nomeTreino ?? 'Treino'}</p>
                      <p className="text-xs text-gray-500">
                        {format(date, "dd 'de' MMM", { locale: ptBR })}
                        {w.exerciciosSummary && ` · ${w.exerciciosSummary.length} exercícios`}
                      </p>
                    </div>
                    {w.objetivo && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 bg-surface-hover px-2 py-1 rounded">
                        {w.objetivo}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {workouts.length === 0 && (
            <div className="card p-8 text-center text-gray-500 space-y-3">
              <Dumbbell size={32} className="mx-auto text-gray-700" />
              <p className="text-sm">Nenhum treino registrado ainda.</p>
              <button onClick={() => onNavigate('log')} className="btn-primary mx-auto">
                Registrar Primeiro Treino
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}