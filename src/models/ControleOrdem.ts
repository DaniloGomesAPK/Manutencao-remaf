export const STATUS_CONTROLE_ORDEM = [
  'Aguardando PC',
  'Falta de acordo',
  'Falta orçamento',
  'Aguardando FRS',
  'Emitir NF',
  'Concluído',
  'Cancelado',
] as const;

export type StatusControleOrdem = '' | typeof STATUS_CONTROLE_ORDEM[number] | 'Outra tarefa';

export interface ControleOrdem {
  id: string;
  empresaId: string;
  data: string;
  protocolo: string;
  equipamento: string;
  solicitante: string;
  servico: string;
  valor: string;
  pedidoCompra: string;
  frs: string;
  status: StatusControleOrdem;
  tarefaExtra: string;
  nf: string;
  pagamento: string;
  createdAt?: string;
  updatedAt?: string;
  sincronizado?: boolean;
}

export function emptyControleOrdem(empresaId: string): ControleOrdem {
  return {
    id: '', empresaId, data: '', protocolo: '', equipamento: '', solicitante: '',
    servico: '', valor: '', pedidoCompra: '', frs: '', status: '', tarefaExtra: '', nf: '', pagamento: '',
  };
}

export function statusEfetivoControleOrdem(row: ControleOrdem): StatusControleOrdem {
  return row.nf?.trim() ? 'Concluído' : row.status || '';
}

export function categoriaResumoControleOrdem(row: ControleOrdem): string {
  const status = String(statusEfetivoControleOrdem(row)).trim();
  if (!status || status === 'Sem status') return 'Sem status';
  return (STATUS_CONTROLE_ORDEM as readonly string[]).includes(status) ? status : 'Outra tarefa';
}

export function atualizarNFControleOrdem(row: ControleOrdem, nf: string): ControleOrdem {
  return {
    ...row,
    nf,
    status: nf.trim() ? 'Concluído' : row.status === 'Concluído' ? '' : row.status,
  };
}

export function resumoStatusControleOrdens(rows: ControleOrdem[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const status = statusEfetivoControleOrdem(row) || 'Sem status';
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

export function validateControleOrdem(row: ControleOrdem): string | null {
  if (!row.empresaId?.trim()) return 'Não foi possível identificar a empresa.';
  const fields = [row.data, row.protocolo, row.equipamento, row.solicitante, row.servico,
    row.valor, row.pedidoCompra, row.frs, row.status, row.tarefaExtra, row.nf, row.pagamento];
  if (!fields.some(value => value?.trim())) return 'Preencha ao menos uma informação antes de salvar.';
  if (row.pagamento && !/^\d{4}-\d{2}-\d{2}$/.test(row.pagamento)) {
    return 'Informe uma data válida para o pagamento.';
  }
  if (row.status === 'Outra tarefa' && !row.tarefaExtra.trim()) {
    return 'Descreva a tarefa adicional no campo de status.';
  }
  return null;
}
