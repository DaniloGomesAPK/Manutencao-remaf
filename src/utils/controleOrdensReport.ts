import type { ControleOrdem } from '../models/ControleOrdem';

export function valorControleOrdem(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const clean = String(value ?? '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
}

export function moedaControleOrdem(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dataControleOrdem(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function ordenarControleOrdensPorData(rows: ControleOrdem[]): ControleOrdem[] {
  return [...rows].sort((a, b) => {
    // The date entered in the table is the date the user sees and expects to sort by.
    const dateA = /^\d{4}-\d{2}-\d{2}$/.test(a.data) ? a.data : '';
    const dateB = /^\d{4}-\d{2}-\d{2}$/.test(b.data) ? b.data : '';
    return dateB.localeCompare(dateA)
      || (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
      || a.id.localeCompare(b.id);
  });
}

export function camposPreenchidosPDF(row: ControleOrdem): Array<[string, string]> {
  const fields: Array<[string, string]> = [];
  const add = (label: string, value: string | undefined, format?: (value: string) => string) => {
    const filled = String(value ?? '').trim();
    if (filled) fields.push([label, format ? format(filled) : filled]);
  };

  add('Data', row.data, dataControleOrdem);
  add('Equipamento', row.equipamento);
  add('Solicitante', row.solicitante);
  add('Serviço', row.servico);
  add('Valor', row.valor, value => moedaControleOrdem(valorControleOrdem(value)));
  add('Pedido de compra', row.pedidoCompra);
  add('FRS', row.frs);
  add('Tarefa', row.tarefaExtra);
  add('NF', row.nf);
  add('Pagamento previsto', row.pagamento, dataControleOrdem);
  return fields;
}

export async function gerarPDFDetalhesControleOrdens({
  empresa, status, rows, generatedAt = new Date(),
}: { empresa: string; status: string; rows: ControleOrdem[]; generatedAt?: Date }): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const total = rows.reduce((sum, row) => sum + valorControleOrdem(row.valor), 0);
  const margin = 16;
  const width = 178;
  let y = 28;

  const header = () => {
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 210, 10, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const companyLines = doc.splitTextToSize(empresa, width) as string[];
    doc.text(companyLines, margin, 20);
    y = 20 + companyLines.length * 6 + 3;
  };
  const nextPage = (height: number) => {
    if (y + height <= 277) return;
    doc.addPage();
    header();
  };
  const line = (label: string, value: string) => {
    const content = `${label}: ${value || '—'}`;
    const wrapped = doc.splitTextToSize(content, width - 8) as string[];
    const height = Math.max(6, wrapped.length * 4.5);
    nextPage(height + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 50, 65);
    doc.text(wrapped, margin + 4, y);
    y += height;
  };

  header();
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Detalhamento — ${status}`, margin, y);
  y += 7;
  line('Emitido em', generatedAt.toLocaleString('pt-BR'));
  line('Ordens', String(rows.length));
  line('Total', moedaControleOrdem(total));
  y += 4;

  rows.forEach((row, index) => {
    const fields = camposPreenchidosPDF(row);
    nextPage(14);
    doc.setFillColor(239, 244, 249);
    doc.rect(margin, y - 4, width, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 51, 102);
    doc.text(`${index + 1}. ${row.protocolo?.trim() || 'Ordem'}`, margin + 4, y + 1);
    y += 10;
    fields.forEach(([label, value]) => line(label, value));
    y += 4;
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(220, 225, 230);
    doc.line(margin, 284, 194, 284);
    doc.setTextColor(110, 120, 135);
    doc.setFontSize(8);
    doc.text(`Página ${page} de ${pages}`, 194, 290, { align: 'right' });
  }
  return doc.output('blob');
}
