import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, History as HistoryIcon, TrendingUp, Dumbbell, ArrowRight, Save, FileDown } from 'lucide-react';
import { Registro } from '../../types';
import { workoutService } from '../../lib/workoutService';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [logs, setLogs] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await workoutService.getRegistros();
      setLogs(data);
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

  return (
    <div className="space-y-8 pb-24">
      {/* Welcome Section */}
      <section className="pt-4">
        <h2 className="text-brand text-xs font-bold uppercase tracking-[0.3em] mb-4">Painel de Controle</h2>
        <h1 className="font-display text-4xl md:text-6xl font-black leading-none tracking-tighter uppercase mb-2">
          Treine como um <br />
          <span className="text-brand">Profissional.</span>
        </h1>
        <div className="w-16 h-1 bg-brand mt-4"></div>
      </section>

      {/* Hero Visual Card */}
      <div className="relative aspect-[21/9] rounded-xl overflow-hidden border border-outline bg-surface">
        <img 
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop" 
          alt="Gym" 
          className="w-full h-full object-cover grayscale opacity-40 hover:grayscale-0 transition-all duration-1000 transform scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-brand/10 backdrop-blur-md px-6 py-3 border border-brand/20 rounded-full flex items-center gap-3">
             <div className="w-2 h-2 bg-brand rounded-full animate-ping"></div>
             <span className="text-brand text-[11px] font-black uppercase tracking-widest">Sessão Ativa</span>
          </div>
        </div>
      </div>

      {/* Action Grid */}
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <MenuButton 
            icon={<PlusCircle className="text-brand" />} 
            label="Novo Treino"
            sublabel="Registro Manual"
            onClick={() => onNavigate('log')}
          />
          <MenuButton 
            icon={<Save className="text-white" />} 
            label="Executar Plano"
            sublabel="Treino Agendado"
            onClick={() => onNavigate('execute')}
          />
          <MenuButton 
            icon={<HistoryIcon className="text-gray-400" />} 
            label="Histórico"
            sublabel="Logs Anteriores"
            onClick={() => onNavigate('history')}
          />
          <MenuButton 
            icon={<TrendingUp className="text-brand" />} 
            label="Progresso"
            sublabel="Gráficos & Apps"
            onClick={() => onNavigate('progress')}
          />
        </div>

        <div className="card p-5 bg-surface-hover hover:border-brand transition-colors cursor-pointer group" onClick={() => onNavigate('import')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-brand/10 p-2 rounded border border-brand/20">
                <FileDown size={20} className="text-brand" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white uppercase tracking-tight">Importar Plano JSON</h4>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Carregar Programação Semanal</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-gray-600 group-hover:text-brand transition-colors" />
          </div>
        </div>
      </section>

      {/* Stats Bento */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex flex-col justify-center">
          <span className="input-label !text-[9px]">Sessões no Mês</span>
          <span className="text-3xl font-display font-black text-brand tracking-tighter">{workoutsThisMonth}</span>
        </div>
        <div className="card flex flex-col justify-center">
          <span className="input-label !text-[9px]">Carga Máxima</span>
          <span className="text-3xl font-display font-black text-brand tracking-tighter">{maxWeight}kg</span>
        </div>
        <div className="card flex flex-col justify-center">
          <span className="input-label !text-[9px]">Volume Total</span>
          <span className="text-xl font-display font-black text-brand tracking-tighter uppercase">Extraordinário</span>
        </div>
        <div className="card flex flex-col justify-center">
          <span className="input-label !text-[9px]">Status</span>
          <span className="text-xl font-display font-black text-brand tracking-tighter uppercase">Elite</span>
        </div>
      </section>

      {/* Motivation Tip */}
      <div className="bg-surface-hover p-6 rounded-2xl border border-dashed border-outline flex items-start gap-4">
        <div className="bg-brand/20 p-2 rounded-lg text-brand">
          <Dumbbell size={20} />
        </div>
        <div>
          <h4 className="font-bold text-sm mb-1 uppercase tracking-tight">Dica de hoje</h4>
          <p className="text-sm text-gray-400 leading-relaxed">
            Mantenha a cadência controlada na fase excêntrica para recrutar mais fibras musculares.
          </p>
        </div>
      </div>
    </div>
  );
}

function MenuButton({ icon, label, sublabel, onClick }: { icon: React.ReactNode, label: string, sublabel: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="card p-5 flex flex-col items-start gap-3 bg-surface-hover hover:border-brand transition-all text-left"
    >
      <div className="bg-surface p-2.5 rounded-lg border border-outline">
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <div>
        <h4 className="font-bold text-sm text-white uppercase tracking-tight">{label}</h4>
        <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-wider">{sublabel}</p>
      </div>
    </button>
  );
}
