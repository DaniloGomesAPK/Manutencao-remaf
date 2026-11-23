import { statusEfetivoControleOrdem, type ControleOrdem } from '../models/ControleOrdem';
import { valorControleOrdem } from './controleOrdensReport';

export interface PagamentosDoDia {
  data: string;
  totalCentavos: number;
  ordens: ControleOrdem[];
}

const dataBahia = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Bahia',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function hojePagamentos(data = new Date()): string {
  return dataBahia.format(data);
}

export function pagamentosFuturosConcluidos(rows: ControleOrdem[], hoje: string): ControleOrdem[] {
  return rows.filter(row => {
    const { pagamento } = row;
    if (statusEfetivoControleOrdem(row) !== 'Concluído' || !/^\d{4}-\d{2}-\d{2}$/.test(pagamento) || pagamento <= hoje) {
      return false;
    }

    const data = new Date(`${pagamento}T00:00:00Z`);
    return Number.isFinite(data.getTime()) && data.toISOString().startsWith(pagamento);
  }).sort((a, b) => a.pagamento.localeCompare(b.pagamento) || a.id.localeCompare(b.id));
}

export function agruparPagamentosPorData(pagamentos: ControleOrdem[]): PagamentosDoDia[] {
  const porData = new Map<string, PagamentosDoDia>();
  for (const ordem of pagamentos) {
    const data = ordem.pagamento;
    let dia = porData.get(data);
    if (!dia) {
      dia = { data, totalCentavos: 0, ordens: [] };
      porData.set(data, dia);
    }
    dia.totalCentavos += Math.round(valorControleOrdem(ordem.valor) * 100);
    dia.ordens.push(ordem);
  }
  return [...porData.values()].sort((a, b) => a.data.localeCompare(b.data));
}
