import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, History as HistoryIcon, TrendingUp, Dumbbell, ArrowRight, Save, FileDown, Play, User as UserIcon } from 'lucide-react';
import { Registro, Workout } from '../../types';
import { workoutService } from '../../lib/workoutService';

interface DashboardProps {
  onNavigate: (screen: any) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [logs, setLogs] = useState<Registro[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [registros, active] = await Promise.all([
        workoutService.getRegistros(),
        workoutService.getActiveWorkout()
      ]);
      setLogs(registros);
      setActiveWorkout(active);
      setLoading(false);
    }
    loadData();
  }, []);

  const workoutsThisMonth = logs.filter(log => {
    const date = new Date(log.data);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const maxWeight = logs.reduce((max, log) => Math.max(max, log.pesoKg), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-12 h-12 border-4 border-brand border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 pb-24">
      {/* Header */}
      <section className="space-y-2">
        <h2 className="text-brand text-xs font-black uppercase tracking-[0.3em]">Painel de Comando</h2>
        <h1 className="font-display text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase italic">
          Forge seu <br />
          <span className="text-brand">Destino.</span>
        </h1>
      </section>

      {/* Active Workout Card (Priority) */}
      {activeWorkout ? (
        <section className="animate-in zoom-in-95 duration-500">
          <div className="card bg-brand border-none p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_40px_rgba(204,255,0,0.2)] overflow-hidden relative group">
            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center text-brand shadow-2xl relative overflow-hidden">
                <Play size={40} className="relative z-10" />
                <div className="absolute inset-0 bg-brand/20 animate-ping opacity-20" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-black/60 tracking-widest leading-none">Treino em Andamento</span>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-black mt-2 leading-none">{activeWorkout.nomeTreino}</h3>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('execute')}
              className="bg-black text-brand font-black uppercase tracking-widest px-8 py-5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-2xl relative z-10"
            >
              RETOMAR AGORA
            </button>
          </div>
        </section>
      ) : (
        /* Empty State / Quick Entry Card */
        <div className="card bg-[var(--color-surface-hover)] border-dashed border-2 border-brand/30 p-10 text-center space-y-6">
          <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto border border-brand/20">
            <Dumbbell size={32} className="text-brand" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Pronto para a Forja?</h3>
            <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-[0.2em] mt-2">Nenhum treino ativo no momento</p>
          </div>
          <button 
            onClick={() => onNavigate('execute')}
            className="btn-primary mx-auto"
          >
            INICIAR TREINO PROGRAMADO
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Sessões/Mês" value={workoutsThisMonth} />
        <StatCard label="Carga Máx" value={`${maxWeight}kg`} />
        <StatCard label="Volume" value="242T" /> {/* Placeholder/Calculated later */}
        <StatCard label="Nível" value="PRO" />
      </section>

      {/* Main Grid Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MenuAction 
          icon={<HistoryIcon size={24} />} 
          title="Histórico Completo" 
          desc="Veja todos os seus registros passados" 
          onClick={() => onNavigate('history')}
        />
        <MenuAction 
          icon={<TrendingUp size={24} />} 
          title="Gráficos de Evolução" 
          desc="Analise volume, PRs e frequência" 
          onClick={() => onNavigate('progress')}
        />
        <MenuAction 
          icon={<PlusCircle size={24} />} 
          title="Registro Avulso" 
          desc="Treinou fora do plano? Registre aqui" 
          onClick={() => onNavigate('log')}
        />
        <MenuAction 
          icon={<FileDown size={24} />} 
          title="Importar Plano" 
          desc="Carregue seu cronograma via JSON" 
          onClick={() => onNavigate('import')}
        />
      </section>

      {/* Motivation Banner */}
      <div className="card bg-surface-hover border-transparent p-6 flex items-start gap-4 rotate-[-1deg] hover:rotate-0 transition-transform">
        <div className="p-3 bg-brand text-black">
          <TrendingUp size={24} />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-widest">Dica de Performance</h4>
          <p className="text-sm text-[var(--color-text-muted)] leading-tight italic">
            "A consistência supera a intensidade no longo prazo. Não falte hoje."
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="card flex flex-col justify-center items-center py-6">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2">{label}</span>
      <span className="text-4xl font-black font-mono tracking-tighter text-brand leading-none">{value}</span>
    </div>
  );
}

function MenuAction({ icon, title, desc, onClick }: { icon: React.ReactNode, title: string, desc: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="card hover:border-brand/50 group transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-center gap-5">
        <div className="p-4 bg-[var(--color-surface-hover)] rounded-xl border border-[var(--color-outline)] group-hover:bg-brand group-hover:text-black group-hover:border-transparent transition-all duration-300">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-tight group-hover:text-brand transition-colors">{title}</h4>
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest leading-tight mt-1">{desc}</p>
        </div>
      </div>
    </button>
  );
}
