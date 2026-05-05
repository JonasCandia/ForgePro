import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, CheckCircle, ArrowLeft, Dumbbell } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { Registro, Exercício } from '../../types';

interface LogWorkoutProps {
  onBack: () => void;
}

type SessionLog = Omit<Registro, 'userId' | 'createdAt'>;

export default function LogWorkout({ onBack }: LogWorkoutProps) {
  const [exercises, setExercises] = useState<Exercício[]>([]);
  const [selectedEx, setSelectedEx] = useState<Exercício | null>(null);
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState(1);
  const [reps, setReps] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [obs, setObs] = useState('');
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]); // Temp logs before final save
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await workoutService.getExercises();
      setExercises(data);
    }
    load();
  }, []);

  const filteredExs = exercises.filter(ex => 
    ex.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddSerie = () => {
    if (!selectedEx || reps === '' || weight === '') return;

    const newLog: SessionLog = {
      id: Math.random().toString(36).substr(2, 9),
      data: new Date().toISOString(),
      exercicioId: selectedEx.id,
      exercicioNome: selectedEx.nome,
      series,
      repeticoes: Number(reps),
      pesoKg: Number(weight),
      observacoes: obs,
      origem: 'Manual'
    };

    setSessionLogs([newLog, ...sessionLogs]);
    // Clear inputs but keep exercise
    setReps('');
    setWeight('');
    setObs('');
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save each log to Firestore
      for (const log of sessionLogs) {
        const { id, ...data } = log;
        await workoutService.addRegistro(data);
      }
      onBack();
    } catch (error) {
      console.error("Failed to save workout session:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (id: string) => {
    setSessionLogs(sessionLogs.filter(l => l.id !== id));
  };

  return (
    <div className="space-y-6 pb-32 pt-4">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-brand">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-brand text-xs font-bold uppercase tracking-widest">Painel de Registro</h2>
            <h1 className="font-display text-xl font-black uppercase tracking-tight">Nova Atividade</h1>
          </div>
        </div>
        <div className="text-[10px] font-mono text-gray-500 bg-surface px-3 py-1 border border-outline rounded">
          {new Date().toLocaleDateString('pt-BR')}
        </div>
      </header>

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Form Side */}
        <section className="card space-y-6">
          <h3 className="text-brand text-xs font-bold uppercase tracking-widest border-b border-outline pb-4">Detalhes do Exercício</h3>
          
          {/* Exercise Selection */}
          <div className="space-y-1.5">
            <label className="input-label">Identificação do Exercício</label>
            <div className="relative">
              <div 
                onClick={() => setShowSearch(true)}
                className="w-full bg-surface-hover border border-input-border p-3 rounded flex justify-between items-center text-sm cursor-pointer hover:border-brand/40 transition-colors"
              >
                <span className={selectedEx ? 'text-white' : 'text-gray-500 font-medium'}>
                  {selectedEx ? selectedEx.nome : 'Selecionar da base de dados...'}
                </span>
                <Search size={16} className="text-brand" />
              </div>

              {showSearch && (
                <div className="absolute top-0 left-0 w-full z-[100] bg-surface border border-outline rounded shadow-2xl p-2 animate-in fade-in zoom-in duration-200">
                  <input 
                    autoFocus
                    className="w-full bg-background border border-input-border rounded px-4 py-2 mb-2 focus:ring-brand focus:border-brand text-sm"
                    placeholder="Pesquisar catálogo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredExs.map(ex => (
                      <div 
                        key={ex.id}
                        onClick={() => {
                          setSelectedEx(ex);
                          setShowSearch(false);
                          setSearch('');
                        }}
                        className="p-3 hover:bg-brand hover:text-black rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                      >
                        {ex.nome}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="input-label">Séries</label>
              <input 
                type="number" 
                className="form-input text-center" 
                value={series}
                onChange={(e) => setSeries(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="input-label">Reps</label>
              <input 
                type="number" 
                placeholder="10"
                className="form-input text-center" 
                value={reps}
                onChange={(e) => setReps(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="input-label">Carga (kg)</label>
              <input 
                type="number" 
                placeholder="0"
                className="form-input text-center" 
                value={weight}
                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="input-label">Notas Adicionais</label>
            <textarea 
              className="form-input min-h-[90px] resize-none" 
              placeholder="Ex: Última série com falha concêntrica..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={handleAddSerie}
              disabled={!selectedEx || reps === '' || weight === ''}
              className="btn-primary"
            >
              <Plus size={18} />
              Confirmar Série
            </button>
            <button 
              onClick={handleFinish}
              disabled={sessionLogs.length === 0}
              className="btn-secondary"
            >
              Encerrar Sessão
            </button>
          </div>
        </section>

        {/* List Side */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-brand text-xs font-bold uppercase tracking-widest">Registros da Sessão</h3>
            <span className="text-[10px] text-gray-500 font-mono italic">{sessionLogs.length} ITENS</span>
          </div>

          <div className="space-y-3">
            {sessionLogs.length === 0 ? (
              <div className="border-2 border-dashed border-outline rounded-xl py-12 flex flex-col items-center justify-center text-gray-600">
                <Dumbbell size={32} className="mb-2 opacity-20" />
                <p className="text-xs uppercase tracking-widest">Nenhum dado pendente</p>
              </div>
            ) : (
              sessionLogs.map((log) => (
                <div key={log.id} className="bg-surface border border-outline p-4 rounded-lg flex items-center justify-between group animate-in slide-in-from-right-4 duration-300">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                       <h4 className="font-bold text-[11px] uppercase tracking-tight">{log.exercicioNome}</h4>
                    </div>
                    <div className="flex gap-4 text-[10px] font-mono text-gray-500">
                      <span>SERIES: {log.series}</span>
                      <span>REPS: {log.repeticoes}</span>
                      <span className="text-brand">PESO: {log.pesoKg}KG</span>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(log.id)} className="p-2 text-red-500/50 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
