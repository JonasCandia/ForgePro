import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Ruler, ChevronDown, Download } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { useProfile, useInvalidateProfile } from '../../hooks/useProfile';
import { useWorkouts } from '../../hooks/useWorkouts';
import { exportToCSV } from '../../lib/exportUtils';
import type { Screen } from '../../App';
import type { FaixaEtariaTAF, SexoBio } from '../../types';

interface UserProfileProps {
  onBack: () => void;
  onSaved?: () => void;
  onNavigate?: (screen: Screen) => void;
  isFirstTime?: boolean;
}

export default function UserProfile({ onBack, onSaved, onNavigate, isFirstTime }: UserProfileProps) {
  const { data: profileData, isLoading: loading } = useProfile();
  const { data: workouts = [] } = useWorkouts();
  const invalidateProfile = useInvalidateProfile();
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [pesoCorporal, setPesoCorporal] = useState<number | ''>('');
  const [altura, setAltura] = useState<number | ''>('');
  const [objetivo, setObjetivo] = useState<'cutting' | 'bulking' | 'manutencao' | 'taf' | ''>('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [sexo, setSexo] = useState<SexoBio | ''>('');
  const [faixaEtaria, setFaixaEtaria] = useState<FaixaEtariaTAF | ''>('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Populate form when profile data arrives
  useEffect(() => {
    if (profileData) {
      setNome(profileData.nome || '');
      setPesoCorporal(profileData.pesoCorporal ?? '');
      setAltura(profileData.altura ?? '');
      setObjetivo(profileData.objetivo || '');
      setFotoUrl(profileData.fotoUrl || '');
      setSexo(profileData.sexo || '');
      setFaixaEtaria(profileData.faixaEtaria || '');
    }
  }, [profileData]);

  const handleSave = async () => {
    if (!nome.trim()) { setError('O campo Nome é obrigatório.'); return; }
    setError('');
    setSaving(true);
    try {
      await workoutService.saveUserProfile({
        nome: nome.trim(),
        pesoCorporal: pesoCorporal !== '' ? Number(pesoCorporal) : undefined,
        altura: altura !== '' ? Number(altura) : undefined,
        objetivo: objetivo || undefined,
        fotoUrl: fotoUrl.trim() || undefined,
        sexo: sexo || undefined,
        faixaEtaria: faixaEtaria || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      invalidateProfile();
    } catch (err) {
      setError('Falha ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pt-4 pb-24">
        <div className="space-y-1">
          <div className="h-3 w-32 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          <div className="h-7 w-28 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-hover animate-pulse motion-reduce:animate-none" />
            <div className="flex-1 h-11 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="h-11 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-11 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
            <div className="h-11 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="h-11 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          <div className="h-12 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 pb-24">
      {isFirstTime && (
        <div className="p-4 bg-brand/10 border border-brand/20 rounded-lg">
          <p className="text-xs text-brand font-bold uppercase tracking-wider">
            Primeiro acesso é configure seu perfil para personalizar sua experiência.
          </p>
        </div>
      )}

      <section className="card space-y-5">
        <h3 className="text-brand text-xs font-bold uppercase tracking-widest border-b border-outline pb-4">Dados Pessoais</h3>

        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-hover border border-outline overflow-hidden flex items-center justify-center flex-shrink-0">
            {fotoUrl ? (
              <img src={fotoUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => setFotoUrl('')} />
            ) : (
              <User size={32} className="text-gray-600" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <label className="input-label">URL da Foto (opcional)</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://..."
              value={fotoUrl}
              onChange={(e) => setFotoUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="input-label">Nome *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="input-label">Peso Corporal (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              className="form-input text-center"
              placeholder="75"
              value={pesoCorporal}
              onChange={(e) => setPesoCorporal(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="input-label">Altura (cm)</label>
            <input
              type="number"
              inputMode="numeric"
              className="form-input text-center"
              placeholder="175"
              value={altura}
              onChange={(e) => setAltura(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="input-label">Objetivo Atual</label>
          <div className="relative">
            <select
              className="w-full bg-surface-hover border border-input-border rounded px-4 py-3 text-xs focus:border-brand focus:ring-0 transition-colors appearance-none font-bold uppercase text-white"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value as any)}
            >
              <option value="" className="bg-surface">Selecionar objetivo...</option>
              <option value="bulking" className="bg-surface">Bulking – Ganho de Massa</option>
              <option value="cutting" className="bg-surface">Cutting – Definição Muscular</option>
              <option value="manutencao" className="bg-surface">Manutenção</option>
              <option value="taf" className="bg-surface">TAF – Teste de Aptidão Física</option>
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand pointer-events-none" />
          </div>
        </div>

        {objetivo === 'taf' && (
          <div className="space-y-4 p-4 bg-brand/5 border border-brand/20 rounded-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand">Configuração TAF</p>
            <p className="text-[10px] text-gray-500 leading-relaxed -mt-2">
              Usado para selecionar as tabelas de pontuação corretas no TAFScore.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="input-label">Sexo</label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-hover border border-input-border rounded px-4 py-3 text-xs focus:border-brand focus:ring-0 transition-colors appearance-none font-bold uppercase text-white"
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value as SexoBio | '')}
                  >
                    <option value="" className="bg-surface">Selecionar...</option>
                    <option value="M" className="bg-surface">Masculino</option>
                    <option value="F" className="bg-surface">Feminino</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="input-label">Faixa Etária</label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-hover border border-input-border rounded px-4 py-3 text-xs focus:border-brand focus:ring-0 transition-colors appearance-none font-bold uppercase text-white"
                    value={faixaEtaria}
                    onChange={(e) => setFaixaEtaria(e.target.value as FaixaEtariaTAF | '')}
                  >
                    <option value="" className="bg-surface">Selecionar...</option>
                    <option value="18_24" className="bg-surface">18 – 24 anos</option>
                    <option value="25_29" className="bg-surface">25 – 29 anos</option>
                    <option value="30_34" className="bg-surface">30 – 34 anos</option>
                    <option value="35_39" className="bg-surface">35 – 39 anos</option>
                    <option value="40_44" className="bg-surface">40 – 44 anos</option>
                    <option value="45_mais" className="bg-surface">45 anos ou mais</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 font-bold uppercase tracking-wide">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !nome.trim()}
          className={`btn-primary w-full disabled:opacity-50 min-h-[48px] transition-colors ${saved ? 'bg-brand/80' : ''}`}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin motion-reduce:animate-none"></div>
          ) : saved ? (
            <span className="forge-pop inline-flex items-center gap-2"><Save size={18} /> Salvo!</span>
          ) : (
            <><Save size={18} /> Salvar Perfil</>
          )}
        </button>
      </section>

      <div className="p-4 bg-surface-hover rounded-xl border border-outline">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Tags de Objetivo</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          O objetivo selecionado será automaticamente associado a todas as séries registradas, permitindo filtrar e analisar seu desempenho por fase de treino (cutting, bulking ou manutenção).
        </p>
      </div>

      {onNavigate && (
        <button
          onClick={() => onNavigate('measurements')}
          className="btn-secondary w-full justify-center"
        >
          <Ruler size={16} />
          Medidas Corporais
        </button>
      )}

      <section className="card space-y-3">
        <h3 className="text-brand text-xs font-bold uppercase tracking-widest border-b border-outline pb-4">Dados</h3>
        <button
          onClick={() => exportToCSV(workouts)}
          disabled={workouts.length === 0}
          className="btn-secondary w-full justify-center disabled:opacity-40"
        >
          <Download size={16} />
          Exportar Histórico (CSV)
        </button>
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">
          Exporta todas as sessões finalizadas. Use o arquivo para análise externa ou IA.
        </p>
      </section>
    </div>
  );
}
