import { categoriaResumoControleOrdem, type ControleOrdem } from '../models/ControleOrdem';
import { valorControleOrdem } from './controleOrdensReport';

export type OrdenacaoControleOrdens = 'data-recente' | 'data-antiga' | 'valor-maior' | 'valor-menor' | 'protocolo';

export interface FiltrosControleOrdens {
  busca: string;
  status: string;
  dataInicio: string;
  dataFim: string;
  ordenacao: OrdenacaoControleOrdens;
}

export const FILTROS_INICIAIS_CONTROLE_ORDENS: FiltrosControleOrdens = {
  busca: '', status: '', dataInicio: '', dataFim: '', ordenacao: 'data-recente',
};

function normalizar(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function filtrarOrdenarControleOrdens(
  rows: ControleOrdem[], filtros: FiltrosControleOrdens,
): ControleOrdem[] {
  const busca = normalizar(filtros.busca.trim());
  const filtered = rows.filter(row => {
    const data = row.data || '';
    if (filtros.status && categoriaResumoControleOrdem(row) !== filtros.status) return false;
    if (filtros.dataInicio && (!data || data < filtros.dataInicio)) return false;
    if (filtros.dataFim && (!data || data > filtros.dataFim)) return false;
    if (!busca) return true;
    const searchable = [row.data, row.protocolo, row.equipamento, row.solicitante, row.servico,
      row.pedidoCompra, row.frs, row.nf, row.pagamento, row.tarefaExtra, row.valor, categoriaResumoControleOrdem(row)]
      .map(value => normalizar(String(value ?? ''))).join(' ');
    return searchable.includes(busca);
  });

  return filtered.sort((a, b) => {
    const dateA = a.data || '';
    const dateB = b.data || '';
    const compareDate = (dateA ? 0 : 1) - (dateB ? 0 : 1);
    const tieBreak = (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
      || a.id.localeCompare(b.id);
    switch (filtros.ordenacao) {
      case 'data-antiga': return compareDate || dateA.localeCompare(dateB) || tieBreak;
      case 'valor-maior': return valorControleOrdem(b.valor) - valorControleOrdem(a.valor) || tieBreak;
      case 'valor-menor': return valorControleOrdem(a.valor) - valorControleOrdem(b.valor) || tieBreak;
      case 'protocolo': return (a.protocolo || '').localeCompare(b.protocolo || '', 'pt-BR', { numeric: true }) || tieBreak;
      default: return compareDate || dateB.localeCompare(dateA) || tieBreak;
    }
  });
}
