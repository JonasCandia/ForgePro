import React, { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Calendar, Filter } from 'lucide-react';
import { Registro } from '../../types';
import { workoutService } from '../../lib/workoutService';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function History() {
  const [logs, setLogs] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    async function load() {
      const data = await workoutService.getRegistros();
      setLogs(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await workoutService.deleteRegistro(id);
      setLogs(logs.filter(l => l.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const filteredLogs = logs
    .filter(log => log.exercicioNome.toLowerCase().includes(search.toLowerCase()))
    .filter(log => !filterDate || log.data.startsWith(filterDate))
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const formatLogDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje, ' + format(date, 'HH:mm');
    if (isYesterday(date)) return 'Ontem, ' + format(date, 'HH:mm');
    return format(date, "dd MMM", { locale: ptBR }).toUpperCase();
  };

  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: Registro[] } = {};
    filteredLogs.forEach(log => {
      const dateKey = format(new Date(log.data), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });
    return groups;
  }, [filteredLogs]);

  return (
    <div className="space-y-6 pt-4 pb-24">
      <header className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Arquivo de Dados</h2>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Histórico de Treino</h1>
        </div>
        <div className="flex gap-2">
          <div className="text-[10px] bg-surface px-3 py-1.5 rounded text-gray-400 border border-outline font-bold uppercase tracking-wider">
            {filteredLogs.length} Registros
          </div>
        </div>
      </header>

      {/* Filters Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        <div className="relative">
          <input 
            className="w-full bg-surface-hover border border-input-border rounded px-10 py-3 text-xs focus:border-brand focus:ring-0 transition-colors placeholder:text-gray-600 font-medium"
            placeholder="Pesquisar por exercício..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        </div>
        <div className="relative">
          <input 
            type="date"
            className="w-full bg-surface-hover border border-input-border rounded px-10 py-3 text-xs focus:border-brand focus:ring-0 transition-colors appearance-none font-medium"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        </div>
      </section>

      {/* History List */}
      <div className="space-y-10">
        {Object.keys(groupedLogs).length === 0 ? (
          <div className="card border-dashed border-2 bg-transparent text-center py-20 text-gray-700">
            <Filter size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-xs uppercase tracking-widest font-bold">Base de dados vazia</p>
          </div>
        ) : (
          (Object.entries(groupedLogs) as [string, Registro[]][]).map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand whitespace-nowrap">
                  {formatLogDate(items[0].data)}
                </span>
                <div className="h-px w-full bg-outline" />
              </div>

              <div className="card p-0 overflow-hidden border-outline">
                <table className="w-full text-left">
                  <thead className="text-[9px] uppercase tracking-widest text-gray-600 bg-surface-hover border-b border-outline">
                    <tr>
                      <th className="px-6 py-3 font-black">Exercício</th>
                      <th className="px-6 py-3 font-black text-center">Séries</th>
                      <th className="px-6 py-3 font-black text-center">Reps</th>
                      <th className="px-6 py-3 font-black text-center">Carga</th>
                      <th className="px-6 py-3 font-black text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-gray-400 divide-y divide-[#1A1A1A]">
                    {items.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 font-bold text-gray-200 uppercase tracking-tight">{log.exercicioNome}</td>
                        <td className="px-6 py-4 text-center font-mono">{log.series}</td>
                        <td className="px-6 py-4 text-center font-mono">{log.repeticoes}</td>
                        <td className="px-6 py-4 text-center font-mono text-brand font-bold">{log.pesoKg}KG</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDelete(log.id)}
                            className="p-2 text-gray-700 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

