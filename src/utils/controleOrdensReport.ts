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
    nextPage(82);
    doc.setFillColor(239, 244, 249);
    doc.rect(margin, y - 4, width, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 51, 102);
    doc.text(`${index + 1}. ${row.protocolo || 'Sem protocolo'}`, margin + 4, y + 1);
    y += 10;
    line('Data', dataControleOrdem(row.data));
    line('Equipamento', row.equipamento);
    line('Solicitante', row.solicitante);
    line('Serviço', row.servico);
    line('Valor', moedaControleOrdem(valorControleOrdem(row.valor)));
    line('Pedido de compra', row.pedidoCompra);
    line('FRS', row.frs);
    line('Tarefa', row.tarefaExtra);
    line('NF', row.nf);
    line('Pagamento previsto', dataControleOrdem(row.pagamento));
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
