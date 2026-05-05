import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Save, ChevronRight, Info } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { Plano, ExercicioNoPlano, Registro } from '../../types';

interface ExecutePlannedWorkoutProps {
  onBack: () => void;
}

export default function ExecutePlannedWorkout({ onBack }: ExecutePlannedWorkoutProps) {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection state
  const [selectedSemana, setSelectedSemana] = useState<number | null>(null);
  const [selectedDia, setSelectedDia] = useState<string | null>(null);
  const [selectedTreino, setSelectedTreino] = useState<Plano | null>(null);
  
  // Execution state
  const [executing, setExecuting] = useState(false);
  const [realizedWeights, setRealizedWeights] = useState<Record<number, number>>({});
  const [realizedObs, setRealizedObs] = useState<Record<number, string>>({});
  const [completedExs, setCompletedExs] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await workoutService.getPlanos();
      setPlanos(data);
      setLoading(false);
    }
    load();
  }, []);

  const semanas = Array.from(new Set(planos.map(p => p.semana))).sort((a, b) => Number(a) - Number(b));
  const diasDisponiveis = selectedSemana 
    ? Array.from(new Set(planos.filter(p => p.semana === selectedSemana).map(p => p.diaDaSemana)))
    : [];
  const treinosDisponiveis = (selectedSemana && selectedDia)
    ? planos.filter(p => p.semana === selectedSemana && p.diaDaSemana === selectedDia)
    : [];

  const handleStartWorkout = () => {
    if (!selectedTreino) return;
    setExecuting(true);
    // Pre-fill realized weights with planned weights
    const weights: Record<number, number> = {};
    selectedTreino.exercicios.forEach((ex, idx) => {
      weights[idx] = ex.pesoPlanejado;
    });
    setRealizedWeights(weights);
  };

  const handleCompleteEx = async (idx: number) => {
    setCompletedExs(prev => ({ ...prev, [idx]: true }));
  };

  const handleFinishWorkout = async () => {
    if (!selectedTreino) return;
    setSaving(true);
    try {
      const logs = selectedTreino.exercicios.map((ex, idx) => ({
        data: new Date().toISOString(),
        exercicioId: ex.exercicioId,
        exercicioNome: ex.exercicioNome,
        series: ex.seriesPlanejadas,
        repeticoes: ex.repeticoesPlanejadas,
        pesoKg: realizedWeights[idx] || ex.pesoPlanejado,
        observacoes: realizedObs[idx] || '',
        origem: 'Plano' as const
      }));

      for (const log of logs) {
        await workoutService.addRegistro(log);
      }
      onBack();
    } catch (error) {
      console.error("Failed to finish planned workout:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;

  if (executing && selectedTreino) {
    const allDone = selectedTreino.exercicios.every((_, i) => completedExs[i]);

    return (
      <div className="space-y-6 pt-4 pb-24">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-brand text-[10px] font-black uppercase tracking-widest mb-1">
            <span>Semana {selectedTreino.semana}</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
            <span>{selectedTreino.diaDaSemana}</span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">{selectedTreino.nomeTreino}</h1>
        </header>

        <div className="space-y-4">
          {selectedTreino.exercicios.map((ex, idx) => (
            <div key={idx} className={`card p-5 border-l-4 transition-all duration-300 ${completedExs[idx] ? 'border-brand bg-brand/5 opacity-80' : 'border-outline bg-surface-hover'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-tight">{ex.exercicioNome}</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                    Meta: {ex.seriesPlanejadas}x{ex.repeticoesPlanejadas} — {ex.pesoPlanejado}kg
                  </p>
                </div>
                {completedExs[idx] && <CheckCircle size={20} className="text-brand" />}
              </div>

              {!completedExs[idx] ? (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="input-label !mb-0 !text-[9px]">Peso Realizado (kg)</label>
                      <input 
                        type="number"
                        className="w-full bg-surface border border-outline rounded px-3 py-2 text-xs font-bold text-brand focus:border-brand transition-colors"
                        value={realizedWeights[idx] || ''}
                        onChange={(e) => setRealizedWeights({ ...realizedWeights, [idx]: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={() => handleCompleteEx(idx)}
                        className="w-full bg-brand text-black font-black text-[10px] uppercase tracking-widest py-2.5 rounded hover:bg-brand-hover transition-colors flex items-center justify-center gap-2"
                      >
                        Concluir Exercício
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="input-label !mb-0 !text-[9px]">Notas de Execução</label>
                    <input 
                      type="text"
                      className="w-full bg-surface border border-outline rounded px-3 py-2 text-xs text-gray-300 focus:border-brand transition-colors"
                      placeholder="Ex: sentiu leve, dor no ombro..."
                      value={realizedObs[idx] || ''}
                      onChange={(e) => setRealizedObs({ ...realizedObs, [idx]: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-bold text-brand uppercase tracking-wider">
                  Realizado: {realizedWeights[idx]}kg {realizedObs[idx] && `— ${realizedObs[idx]}`}
                </div>
              )}
            </div>
          ))}
        </div>

        {allDone && (
          <button 
            onClick={handleFinishWorkout}
            disabled={saving}
            className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 rounded-xl flex items-center justify-center gap-3 shadow-2xl animate-in zoom-in-95 duration-500"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={20} />
            )}
            {saving ? 'Salvando...' : 'Finalizar Sessão de Treino'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 pb-24">
      <header className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Rotina Agendada</h2>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Executar Treino</h1>
        </div>
      </header>

      {planos.length === 0 ? (
        <div className="card p-12 text-center space-y-4">
          <div className="bg-surface-hover w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-outline">
            <Info size={32} className="text-gray-600" />
          </div>
          <div>
            <h3 className="font-bold text-white uppercase tracking-tight">Nenhum plano encontrado</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Você ainda não importou um cronograma de treinos. 
              Vá em "Importar Plano" no menu principal para começar.
            </p>
          </div>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="space-y-1.5">
            <label className="input-label">1. Selecionar Semana</label>
            <div className="grid grid-cols-4 gap-2">
              {semanas.map(sem => (
                <button 
                  key={sem}
                  onClick={() => { setSelectedSemana(sem); setSelectedDia(null); setSelectedTreino(null); }}
                  className={`py-3 rounded border font-black text-xs transition-all ${selectedSemana === sem ? 'bg-brand border-brand text-black' : 'bg-surface-hover border-outline text-gray-400 hover:border-gray-600'}`}
                >
                  S{sem}
                </button>
              ))}
            </div>
          </div>

          {selectedSemana && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
              <label className="input-label">2. Dia da Semana</label>
              <div className="flex flex-wrap gap-2">
                {diasDisponiveis.map(dia => (
                  <button 
                    key={dia}
                    onClick={() => { setSelectedDia(dia); setSelectedTreino(null); }}
                    className={`px-4 py-2 rounded border font-bold text-[10px] uppercase tracking-widest transition-all ${selectedDia === dia ? 'bg-white border-white text-black' : 'bg-surface-hover border-outline text-gray-400'}`}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedDia && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
              <label className="input-label">3. Selecionar Treino</label>
              <div className="space-y-2">
                {treinosDisponiveis.map(plano => (
                  <button 
                    key={plano.id}
                    onClick={() => setSelectedTreino(plano)}
                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${selectedTreino?.id === plano.id ? 'bg-brand/10 border-brand' : 'bg-surface-hover border-outline'}`}
                  >
                    <div className="text-left">
                      <p className={`font-black text-sm uppercase tracking-tight ${selectedTreino?.id === plano.id ? 'text-brand' : 'text-white'}`}>
                        {plano.nomeTreino}
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{plano.exercicios.length} Exercícios</p>
                    </div>
                    <ChevronRight size={16} className={selectedTreino?.id === plano.id ? 'text-brand' : 'text-gray-600'} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedTreino && (
            <button 
              onClick={handleStartWorkout}
              className="w-full mt-4 bg-brand text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-brand-hover transition-all flex items-center justify-center gap-3 animate-in zoom-in-95"
            >
              Iniciar Treino Agora
              <ChevronRight size={20} />
            </button>
          )}
        </section>
      )}
    </div>
  );
}
