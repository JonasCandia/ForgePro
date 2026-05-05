import React, { useState } from 'react';
import { Save, User as UserIcon, Height, Weight, Target } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { auth } from '../../lib/firebase';
import { TreinoGoal } from '../../types';

interface ProfileSetupProps {
  onComplete: () => void;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [nome, setNome] = useState(auth.currentUser?.displayName || '');
  const [peso, setPeso] = useState<number | ''>('');
  const [altura, setAltura] = useState<number | ''>('');
  const [objetivo, setObjetivo] = useState<TreinoGoal>('manutenção');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!auth.currentUser || !nome || !peso || !altura) return;
    setSaving(true);
    try {
      await workoutService.saveProfile(auth.currentUser.uid, {
        nome,
        pesoAtualKg: Number(peso),
        alturaCm: Number(altura),
        objetivo,
        photoURL: auth.currentUser.photoURL || undefined
      });
      onComplete();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pt-4 pb-24 max-w-md mx-auto">
      <header className="text-center space-y-2">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter italic text-brand">FORGE YOURSELF</h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Configure seu perfil de atleta</p>
      </header>

      <section className="card space-y-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="input-label">Como devemos te chamar?</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                className="form-input !pl-12"
                placeholder="Nome do atleta"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="input-label">Peso (kg)</label>
              <input 
                type="number" 
                className="form-input"
                placeholder="75.5"
                value={peso}
                onChange={(e) => setPeso(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="input-label">Altura (cm)</label>
              <input 
                type="number" 
                className="form-input"
                placeholder="180"
                value={altura}
                onChange={(e) => setAltura(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="input-label">Qual seu foco atual?</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cutting', 'bulking', 'manutenção'] as TreinoGoal[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setObjetivo(g)}
                  className={`py-3 text-[10px] font-black uppercase tracking-widest border-2 transition-all ${objetivo === g ? 'bg-brand border-black text-black' : 'bg-surface-hover border-transparent text-gray-500'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || !nome || !peso || !altura}
          className="btn-primary w-full"
        >
          {saving ? 'SALVANDO...' : 'COMEÇAR JORNADA'}
          {!saving && <Save size={18} />}
        </button>
      </section>

      <p className="text-[9px] text-gray-500 text-center leading-relaxed px-6">
        Seus dados são usados para calcular recordes e volume relativo. 
        Você pode alterar isso a qualquer momento nas configurações.
      </p>
    </div>
  );
}
