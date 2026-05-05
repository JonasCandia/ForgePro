import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  CheckCircle, 
  Save, 
  ChevronRight, 
  RotateCcw, 
  Clock, 
  AlertTriangle,
  History,
  Timer,
  Info,
  ArrowLeft
} from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { Workout, SetRecord, Plano, TreinoGoal } from '../../types';

interface ActiveWorkoutProps {
  onBack: () => void;
  planId?: string;
}

export default function ActiveWorkout({ onBack }: ActiveWorkoutProps) {
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Selection
  const [selectedSemana, setSelectedSemana] = useState<number | null>(null);
  const [selectedDia, setSelectedDia] = useState<string | null>(null);
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null);

  // Execution
  const [completedSets, setCompletedSets] = useState<Record<string, SetRecord[]>>({});
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState<number | null>(null);
  
  // Timer State
  const [restTime, setRestTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function load() {
      const active = await workoutService.getActiveWorkout();
      if (active) {
        setActiveWorkout(active);
        // Load existing series for this workout
        // For each exercise in the workout, fetch its series
        // This is a bit simplified here to just load the workout state
      }
      const allPlanos = await workoutService.getPlanos();
      setPlanos(allPlanos);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (restTime !== null && restTime > 0) {
      timerRef.current = setTimeout(() => setRestTime(restTime - 1), 1000);
    } else if (restTime === 0) {
      setRestTime(null);
      // Play a subtle sound or vibrate if possible
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [restTime]);

  const handleStart = async (plano: Plano) => {
    setSaving(true);
    try {
      const wid = await workoutService.startWorkout(
        plano.nomeTreino, 
        plano.semana, 
        plano.diaDaSemana
      );
      const active = await workoutService.getActiveWorkout();
      setActiveWorkout(active);
      setSelectedPlano(plano);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!activeWorkout) return;
    setSaving(true);
    try {
      await workoutService.finishWorkout(activeWorkout.id);
      onBack();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const saveSet = async (exIdx: number, setNum: number, actualReps: number, actualWeight: number, failed: boolean) => {
    if (!activeWorkout || !selectedPlano) return;
    const ex = selectedPlano.exercicios[exIdx];
    
    const setRecord: Omit<SetRecord, 'id' | 'workoutId' | 'userId' | 'endTime'> = {
      exerciseId: ex.exercicioId,
      exerciseNome: ex.exercicioNome,
      setNumber: setNum,
      plannedReps: ex.repeticoesPlanejadas,
      plannedWeight: ex.pesoPlanejado,
      actualReps,
      actualWeight,
      restTimeSeconds: 0, // Simplified for now
      startTime: new Date().toISOString(),
      failed,
      origem: 'Plano',
      goalAtTime: activeWorkout.goalAtTime,
      muscleGroup: 'Outros' // Should be fetched from catalyst
    };

    await workoutService.addSeries(activeWorkout.id, setRecord);
    
    // Update local state
    setCompletedSets(prev => ({
      ...prev,
      [ex.exercicioId]: [...(prev[ex.exercicioId] || []), { ...setRecord, id: Math.random().toString(), workoutId: activeWorkout.id, userId: activeWorkout.userId, endTime: new Date().toISOString() } as SetRecord]
    }));

    // Trigger Rest Timer
    setRestTime(90); 
  };

  if (loading) return <LoadingSpinner />;

  // Workout SELECTION UI
  if (!activeWorkout) {
    const semanas = Array.from(new Set(planos.map(p => p.semana))).sort((a, b) => a - b);
    const dias = selectedSemana ? Array.from(new Set(planos.filter(p => p.semana === selectedSemana).map(p => p.diaDaSemana))) : [];
    const treinos = (selectedSemana && selectedDia) ? planos.filter(p => p.semana === selectedSemana && p.diaDaSemana === selectedDia) : [];

    return (
      <div className="space-y-8 pt-4 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-muted)] hover:text-brand transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-brand text-[10px] font-black uppercase tracking-widest">Rotina</h2>
            <h1 className="font-display text-3xl font-black uppercase tracking-tighter italic">Iniciar Treino</h1>
          </div>
        </header>

        <section className="space-y-6">
          <div className="space-y-2">
            <label className="input-label">1. Escolha a Semana</label>
            <div className="grid grid-cols-4 gap-2">
              {semanas.map(s => (
                <button 
                  key={s} 
                  onClick={() => { setSelectedSemana(s); setSelectedDia(null); }}
                  className={`py-4 border-2 font-black transition-all ${selectedSemana === s ? 'bg-brand border-black text-black' : 'bg-surface border-outline text-gray-500'}`}
                >
                  S{s}
                </button>
              ))}
            </div>
          </div>

          {selectedSemana && (
            <div className="space-y-2 animate-in slide-in-from-left-4">
              <label className="input-label">2. Dia da Semana</label>
              <div className="flex flex-wrap gap-2">
                {dias.map(d => (
                  <button 
                    key={d} 
                    onClick={() => setSelectedDia(d)}
                    className={`px-6 py-3 border-2 text-[10px] font-black uppercase tracking-widest transition-all ${selectedDia === d ? 'bg-[var(--color-text-main)] border-[var(--color-text-main)] text-[var(--color-background)]' : 'bg-surface border-outline text-gray-500'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedDia && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <label className="input-label">3. Selecione o Treino do Dia</label>
              {treinos.map(p => (
                <button 
                  key={p.id}
                  onClick={() => handleStart(p)}
                  className="w-full card bg-surface-hover hover:border-brand transition-all flex items-center justify-between group"
                >
                  <div className="text-left">
                    <h3 className="font-display text-xl font-black uppercase tracking-tighter italic group-hover:text-brand">{p.nomeTreino}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">{p.exercicios.length} Exercícios Programados</p>
                  </div>
                  <Play className="text-brand group-hover:scale-125 transition-transform" size={24} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // Workout EXECUTION UI
  return (
    <div className="space-y-6 pt-4 pb-32">
      {/* Rest Timer Floating Overlay */}
      <AnimatePresence>
        {restTime !== null && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-4"
          >
            <div className="bg-[var(--color-surface)] border border-brand/50 rounded-2xl p-5 shadow-[0_0_30px_rgba(204,255,0,0.15)] flex items-center justify-between backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                  <Timer className="animate-pulse" size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest leading-none mb-1">Descanso</span>
                  <span className="text-3xl font-black font-mono text-brand leading-none">
                    {Math.floor(restTime / 60)}:{(restTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setRestTime(null)} 
                className="p-3 bg-[var(--color-surface-hover)] border border-[var(--color-outline)] rounded-xl hover:border-brand/40 text-[var(--color-text-muted)] transition-all"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-end border-b border-[var(--color-outline)] pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-brand text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <span className="bg-brand/10 px-2 py-0.5 rounded border border-brand/20">S{activeWorkout.semana}</span>
            <span className="opacity-40 select-none">•</span>
            <span className="text-[var(--color-text-muted)]">{activeWorkout.diaDaSemana}</span>
          </div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter italic leading-none">{activeWorkout.nomeTreino}</h1>
        </div>
        <button 
          onClick={handleFinish} 
          className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors border border-red-500/20"
        >
          Encerrar
        </button>
      </header>

      <div className="space-y-4">
        {selectedPlano?.exercicios.map((ex, exIdx) => (
          <ExerciseCard 
            key={ex.exercicioId}
            index={exIdx}
            exercise={ex}
            completedSets={completedSets[ex.exercicioId] || []}
            onSaveSet={(setNum, reps, weight, failed) => saveSet(exIdx, setNum, reps, weight, failed)}
          />
        ))}
      </div>

      <button 
        onClick={handleFinish}
        className="btn-primary w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-lg"
      >
        <CheckCircle size={24} />
        FINALIZAR TREINO
      </button>
    </div>
  );
}

function ExerciseCard({ exercise, index, completedSets, onSaveSet }: { exercise: any, index: number, completedSets: SetRecord[], onSaveSet: (setNum: number, reps: number, weight: number, failed: boolean) => void }) {
  const [isOpen, setIsOpen] = useState(index === 0);
  const nextSet = completedSets.length + 1;
  const isAllDone = completedSets.length >= exercise.seriesPlanejadas;

  return (
    <div className={`card overflow-hidden transition-all border-l-4 ${isAllDone ? 'border-l-brand opacity-60' : 'border-l-[var(--color-outline)]'}`}>
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1">
          <h3 className="font-display font-black text-xl uppercase tracking-tighter italic group-hover:text-brand transition-colors">{exercise.exercicioNome}</h3>
          <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1">
            {exercise.seriesPlanejadas} SÉRIES — {exercise.repeticoesPlanejadas} REPS — {exercise.pesoPlanejado}KG
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-2xl font-black font-mono leading-none text-brand">
              {completedSets.length}<span className="text-[var(--color-text-muted)] text-sm">/{exercise.seriesPlanejadas}</span>
            </p>
          </div>
          <div className={`w-8 h-8 rounded-full border border-[var(--color-outline)] flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-90 bg-[var(--color-surface-hover)]' : ''}`}>
            <ChevronRight size={18} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 border-t border-[var(--color-outline)] pt-6 space-y-4">
              {/* History of current session sets */}
              <div className="grid grid-cols-1 gap-2">
                {completedSets.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-[var(--color-background)] p-4 rounded-xl border border-[var(--color-outline)]">
                    <span className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Série {s.setNumber}</span>
                    <div className="flex items-center gap-4">
                      <span className={`font-black font-mono text-base ${s.failed ? 'text-red-500' : 'text-brand'}`}>
                        {s.actualWeight}kg <span className="text-xs text-[var(--color-text-muted)] mx-1">×</span> {s.actualReps}
                      </span>
                      {s.failed && <AlertTriangle size={16} className="text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input for new set */}
              {!isAllDone && (
                <div className="bg-[var(--color-surface-hover)] rounded-2xl p-6 space-y-6 border border-brand/20">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Registrar Série {nextSet}</h4>
                    <span className="bg-brand/10 text-brand text-[9px] font-black px-3 py-1 rounded-full border border-brand/20 uppercase tracking-widest">Aguardando</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <SetInput label="Repetições" defaultValue={exercise.repeticoesPlanejadas} onSave={() => {}} id={`reps-${index}`} />
                    <SetInput label="Peso (kg)" defaultValue={exercise.pesoPlanejado} onSave={() => {}} id={`weight-${index}`} />
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const reps = Number((document.getElementById(`reps-${index}`) as HTMLInputElement).value);
                        const weight = Number((document.getElementById(`weight-${index}`) as HTMLInputElement).value);
                        onSaveSet(nextSet, reps, weight, false);
                      }}
                      className="flex-1 btn-primary"
                    >
                      CONCLUIR SÉRIE
                    </button>
                    <button 
                      onClick={() => {
                        const reps = Number((document.getElementById(`reps-${index}`) as HTMLInputElement).value);
                        const weight = Number((document.getElementById(`weight-${index}`) as HTMLInputElement).value);
                        onSaveSet(nextSet, reps, weight, true);
                      }}
                      className="w-14 h-[52px] bg-red-500/10 border border-red-500/50 text-red-500 rounded-xl flex items-center justify-center transition-all hover:bg-red-500 hover:text-white"
                    >
                      <AlertTriangle size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SetInput({ label, defaultValue, id }: { label: string, defaultValue: number, onSave: (val: number) => void, id: string }) {
  const [val, setVal] = useState(defaultValue);
  return (
    <div className="space-y-3">
      <label className="input-label !mb-0">{label}</label>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setVal(Math.max(0, val - 1))} 
          className="w-12 h-12 bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-xl flex items-center justify-center font-black transition-colors hover:border-brand/40"
        >
          -
        </button>
        <input 
          id={id}
          type="number" 
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          className="w-full text-center bg-[var(--color-surface)] border border-[var(--color-outline)] font-black font-mono text-xl py-2 rounded-xl h-12 focus:border-brand/50 focus:ring-0 outline-none transition-all"
        />
        <button 
          onClick={() => setVal(val + 1)} 
          className="w-12 h-12 bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-xl flex items-center justify-center font-black transition-colors hover:border-brand/40"
        >
          +
        </button>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-brand border-t-transparent animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 animate-pulse">Forjando ambiente...</p>
    </div>
  );
}
