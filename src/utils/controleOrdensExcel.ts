import * as XLSX from 'xlsx';
import { categoriaResumoControleOrdem, type ControleOrdem } from '../models/ControleOrdem';
import { valorControleOrdem } from './controleOrdensReport';

export const COLUNAS_CONTROLE_ORDENS_EXCEL = [
  'Data', 'Protocolo', 'Equipamento', 'Solicitante', 'Serviço', 'Valor',
  'Pedido de compra', 'FRS', 'Status', 'Tarefa adicional', 'NF', 'Pagamento previsto',
] as const;

function dataExcel(value: string): Date | string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date : value;
}

function valorExcel(value: string): number | string {
  const original = String(value ?? '').trim();
  if (!original) return '';
  const normalized = original.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  return normalized && Number.isFinite(Number(normalized)) ? valorControleOrdem(original) : original;
}

export function criarWorkbookControleOrdens(rows: ControleOrdem[]): XLSX.WorkBook {
  const records = rows.map(row => [
    dataExcel(row.data), row.protocolo || '', row.equipamento || '', row.solicitante || '',
    row.servico || '', valorExcel(row.valor), row.pedidoCompra || '', row.frs || '',
    categoriaResumoControleOrdem(row), row.tarefaExtra || '', row.nf || '', dataExcel(row.pagamento),
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([[...COLUNAS_CONTROLE_ORDENS_EXCEL], ...records], { cellDates: true });
  sheet['!cols'] = [14, 18, 28, 25, 48, 16, 22, 18, 20, 34, 18, 20].map(wch => ({ wch }));
  sheet['!autofilter'] = { ref: `A1:L${rows.length + 1}` };

  for (let index = 2; index <= rows.length + 1; index += 1) {
    for (const column of ['A', 'L']) {
      const cell = sheet[`${column}${index}`];
      if (cell?.t === 'd') cell.z = 'dd/mm/yyyy';
    }
    const valueCell = sheet[`F${index}`];
    if (valueCell?.t === 'n') valueCell.z = '"R$" #,##0.00';
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Controle de ordens');
  return workbook;
}

export function exportarControleOrdensExcel(rows: ControleOrdem[]): void {
  const date = new Date();
  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  XLSX.writeFile(criarWorkbookControleOrdens(rows), `controle-de-ordens-${localDate}.xlsx`);
}
