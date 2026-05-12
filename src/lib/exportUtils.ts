import { WorkoutSession } from '../types';

function escapeCsvField(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(sessions: WorkoutSession[]): void {
  const header = [
    'data',
    'semana',
    'diaDaSemana',
    'nomeTreino',
    'exercicio',
    'grupoMuscular',
    'seriesRealizadas',
    'repsMedias',
    'pesoMax',
    'repsAtMax',
    'volumeTotal',
  ].join(',');

  const rows = sessions
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data))
    .flatMap(session =>
      session.exerciciosSummary.map(s =>
        [
          escapeCsvField(session.data),
          escapeCsvField(session.semana),
          escapeCsvField(session.diaDaSemana),
          escapeCsvField(session.nomeTreino),
          escapeCsvField(s.exercicioNome),
          escapeCsvField(s.grupoMuscular),
          escapeCsvField(s.seriesRealizadas),
          escapeCsvField(s.repeticoesReais),
          escapeCsvField(s.pesoMax),
          escapeCsvField(s.repsAtMax),
          escapeCsvField(s.volumeTotal),
        ].join(',')
      )
    );

  const csv = [header, ...rows].join('\n');
  const bom = '\uFEFF'; // UTF-8 BOM para Excel reconhecer acentos
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forgepro-historico-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(sessions: WorkoutSession[]): void {
  const payload = sessions
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(session => {
      const base: Record<string, unknown> = {
        data: session.data,
        nomeTreino: session.nomeTreino,
        tipoSessao: session.tipoSessao,
        semana: session.semana,
        diaDaSemana: session.diaDaSemana,
        bloco: session.bloco,
        status: session.status,
        objetivo: session.objetivo,
        resumo: session.exerciciosSummary.map(s => ({
          exercicio: s.exercicioNome,
          grupo: s.grupoMuscular,
          series: s.seriesRealizadas,
          repsMedias: s.repeticoesReais,
          pesoMax: s.pesoMax,
          volume: s.volumeTotal,
          ...(s.tempoTotalSegundos != null && { tempoTotalS: s.tempoTotalSegundos }),
          ...(s.distanciaTotalMetros != null && { distanciaM: s.distanciaTotalMetros }),
        })),
      };

      if (session.series?.length) {
        base.series = session.series.map(s => {
          const row: Record<string, unknown> = {
            exercicio: s.exercicioNome,
            serie: s.serieNum,
            repsReais: s.repeticoesReais,
            pesoReal: s.pesoReal,
            falhou: s.falhou,
          };
          if (s.repsPlanejadas != null) row.repsPlanejadas = s.repsPlanejadas;
          if ((s as any).repeticoesPlanejadas != null) row.repsPlanejadas = (s as any).repeticoesPlanejadas;
          if (s.pesoPlanejado != null) row.pesoPlanejado = s.pesoPlanejado;
          if (s.tempoSegundos != null) row.tempoS = s.tempoSegundos;
          if (s.distanciaMetros != null) row.distanciaM = s.distanciaMetros;
          if (s.paceMinKm != null) row.paceMinKm = s.paceMinKm;
          if (s.observacoes) row.obs = s.observacoes;
          return row;
        });
      }

      // remover campos undefined/null para reduzir tamanho
      return JSON.parse(JSON.stringify(base));
    });

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forgepro-historico-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
