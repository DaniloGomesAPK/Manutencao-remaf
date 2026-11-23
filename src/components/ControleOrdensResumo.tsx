import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ClipboardList, Download } from 'lucide-react';
import {
  STATUS_CONTROLE_ORDEM,
  categoriaResumoControleOrdem,
  type ControleOrdem,
} from '../models/ControleOrdem';
import type { ControleOrdemStore } from './ControleOrdens';
import { agruparPagamentosPorData, hojePagamentos, pagamentosFuturosConcluidos, type PagamentosDoDia } from '../utils/controleOrdensPagamentos';
import { dataControleOrdem, gerarPDFDetalhesControleOrdens, moedaControleOrdem, ordenarControleOrdensPorData, valorControleOrdem } from '../utils/controleOrdensReport';

interface Props {
  empresaId: string;
  userEmail?: string;
  store: ControleOrdemStore;
  onOpen: () => void;
  companyName?: string;
}

const STATUS_RESUMO = [...STATUS_CONTROLE_ORDEM, 'Outra tarefa', 'Sem status'] as const;
type StatusResumo = (typeof STATUS_RESUMO)[number];
type SelectedFilter = 'ALL' | StatusResumo;

function formatPercentBR(val: number): string {
  return `${val.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function LinhaPagamentoDia({ dia }: { dia: PagamentosDoDia }) {
  const [aberto, setAberto] = useState(false);
  const dataFormatada = dataControleOrdem(dia.data);
  const detalhesId = `pagamentos-do-dia-${dia.data}`;
  const quantidade = dia.ordens.length;

  return (
    <>
      <tr className="border-t border-slate-100 text-slate-700">
        <th scope="row" className="whitespace-nowrap px-2 py-2.5 font-bold sm:px-3">
          <time dateTime={dia.data}>{dataFormatada}</time>
        </th>
        <td className="whitespace-nowrap px-2 py-2.5 text-right font-black tabular-nums text-[#003366] sm:px-3">
          {moedaControleOrdem(dia.totalCentavos / 100)}
        </td>
        <td className="px-2 py-2.5 text-right sm:px-3">
          <button
            type="button"
            onClick={() => setAberto(atual => !atual)}
            aria-expanded={aberto}
            aria-controls={detalhesId}
            aria-label={`${aberto ? 'Ocultar' : 'Exibir'} detalhes de ${dataFormatada}`}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-bold text-[#003366] hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#003366]"
          >
            {aberto ? 'Ocultar detalhes' : 'Exibir detalhes'}
            <ChevronDown aria-hidden="true" className={`hidden h-4 w-4 shrink-0 sm:block ${aberto ? 'rotate-180' : ''}`} />
          </button>
        </td>
      </tr>
      <tr id={detalhesId} hidden={!aberto}>
        <td colSpan={3} className="border-t border-slate-100 bg-slate-50 px-2 py-3 sm:px-3">
          {aberto && (
            <table className="w-full rounded-lg text-left text-xs">
              <caption className="pb-2 text-left font-semibold text-slate-600">
                {quantidade} {quantidade === 1 ? 'ordem' : 'ordens'} com pagamento previsto em {dataFormatada}
              </caption>
              <thead className="border-b border-slate-200 text-[#003366]">
                <tr>
                  <th scope="col" className="py-1.5">Solicitante</th>
                  <th scope="col" className="py-1.5 pl-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {dia.ordens.map(ordem => (
                  <tr key={ordem.id} className="border-b border-slate-200/70 text-slate-700 last:border-0">
                    <td className="py-1.5 [overflow-wrap:anywhere]">{ordem.solicitante?.trim() || '—'}</td>
                    <td className="whitespace-nowrap py-1.5 pl-2 text-right tabular-nums">
                      {moedaControleOrdem(valorControleOrdem(ordem.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </td>
      </tr>
    </>
  );
}

export default function ControleOrdensResumo({
  empresaId,
  userEmail,
  store,
  onOpen,
  companyName,
}: Props) {
  const [rows, setRows] = useState<ControleOrdem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<SelectedFilter>('ALL');
  const [detailStatus, setDetailStatus] = useState<StatusResumo | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [hoje, setHoje] = useState(() => hojePagamentos());

  useEffect(() => {
    const atualizarData = () => setHoje(hojePagamentos());
    const timer = window.setInterval(atualizarData, 60_000);
    window.addEventListener('focus', atualizarData);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', atualizarData);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let receivedSnapshot = false;
    setRows([]);
    setLoading(true);
    setLoadError(false);
    setDetailStatus(null);
    setSelected('ALL');

    if (!empresaId) {
      setLoading(false);
      return;
    }

    store
      .getAll(empresaId, userEmail)
      .then(list => {
        if (active && !receivedSnapshot) setRows(list.filter(row => row.empresaId === empresaId));
      })
      .catch(() => {
        if (active && !receivedSnapshot) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = store.listen(
      empresaId,
      list => {
        if (!active) return;
        receivedSnapshot = true;
        setLoadError(false);
        setRows(list.filter(row => row.empresaId === empresaId));
        setLoading(false);
      },
      userEmail
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [empresaId, userEmail, store]);

  const pagamentosFuturos = useMemo(() => pagamentosFuturosConcluidos(rows, hoje), [rows, hoje]);
  const pagamentosPorDia = useMemo(() => agruparPagamentosPorData(pagamentosFuturos), [pagamentosFuturos]);
  const totalPagamentosFuturos = pagamentosPorDia.reduce((soma, dia) => soma + dia.totalCentavos, 0) / 100;
  const stats = useMemo(() => {
    const map: Record<StatusResumo, { count: number; totalValor: number }> =
      {} as Record<StatusResumo, { count: number; totalValor: number }>;

    for (const st of STATUS_RESUMO) {
      map[st] = { count: 0, totalValor: 0 };
    }

    map['Concluído'] = {
      count: pagamentosFuturos.length,
      totalValor: totalPagamentosFuturos,
    };
    let grandCount = pagamentosFuturos.length;

    for (const r of rows) {
      const cat = categoriaResumoControleOrdem(r) as StatusResumo;
      if (cat === 'Concluído') continue;
      const val = valorControleOrdem(r.valor);
      map[cat].count += 1;
      map[cat].totalValor += val;
      grandCount += 1;
    }

    const items = STATUS_RESUMO.map(status => {
      const { count, totalValor } = map[status];
      const percent = grandCount > 0 ? (count / grandCount) * 100 : 0;
      return {
        status,
        count,
        percent,
        totalValor,
      };
    }).filter(item => item.count > 0 || (item.status === 'Concluído' && rows.length > 0));

    return { items, grandCount };
  }, [rows, pagamentosFuturos.length, totalPagamentosFuturos]);

  const detalhePagamentos = detailStatus === 'Concluído';
  const detailRows = useMemo(() => {
    if (detalhePagamentos) return pagamentosFuturos;
    return detailStatus
      ? ordenarControleOrdensPorData(rows.filter(row => categoriaResumoControleOrdem(row) === detailStatus))
      : [];
  }, [rows, detailStatus, detalhePagamentos, pagamentosFuturos]);
  const detailTotal = detalhePagamentos ? totalPagamentosFuturos : detailRows.reduce((sum, row) => sum + valorControleOrdem(row.valor), 0);

  const exportDetails = async () => {
    if (!detailStatus || !detailRows.length || exporting) return;
    setExporting(true);
    setExportError(false);
    try {
      const blob = await gerarPDFDetalhesControleOrdens({
        empresa: companyName || `Empresa ${empresaId}`,
        status: detalhePagamentos ? 'Concluído · Próximos pagamentos' : detailStatus,
        rows: detailRows,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `controle-ordens-${detailStatus.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section
      aria-label="Resumo do controle de ordens"
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-[#003366]/5 p-2 text-[#003366]">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-black text-[#003366]">
              Resumo do controle de ordens
            </h3>
            <p className="text-xs text-slate-500">
              {loadError
                ? 'Não foi possível carregar o resumo'
                : loading
                ? 'Carregando…'
                : `${stats.grandCount} ${stats.grandCount === 1 ? 'registro exibido' : 'registros exibidos'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={selected === 'ALL'}
            onClick={() => { setSelected('ALL'); setDetailStatus(null); }}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#003366] focus:ring-offset-1 ${
              selected === 'ALL'
                ? 'bg-[#003366] text-white'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Todos
          </button>

          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-[#003366] hover:text-[#FF6600] focus:outline-none focus:ring-2 focus:ring-[#003366] focus:ring-offset-1"
          >
            Abrir controle <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Gráfico de barras horizontais interativo */}
      <div
        role="group"
        aria-label="Barras de status do controle de ordens"
        className="space-y-1.5"
      >
        {!loading && !loadError && stats.items.length === 0 && (
          <p className="rounded-xl border border-slate-100 p-4 text-sm text-slate-500">Nenhuma ordem cadastrada no controle.</p>
        )}
        {stats.items.map(({ status, count, percent, totalValor }) => {
          const isSelected = selected === status;
          const barWidth = count > 0 ? Math.max(percent, 2) : 0;
          const isConcluido = status === 'Concluído';
          const toggleDetails = () => {
            setSelected(status);
            setDetailStatus(current => current === status ? null : status);
            setExportError(false);
          };

          return (
            <div key={status}>
            <div className="flex items-stretch gap-2">
            <button
              type="button"
              aria-pressed={isConcluido ? detailStatus === status : isSelected}
              onClick={isConcluido ? toggleDetails : () => { setSelected(prev => (prev === status ? 'ALL' : status)); setDetailStatus(null); }}
              className={`group w-full rounded-xl border p-2.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#003366] focus:ring-offset-1 ${
                isSelected
                  ? 'border-[#003366] bg-[#003366]/[0.04] shadow-xs'
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/70'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span
                  className={`font-bold transition-colors ${
                    isSelected
                      ? 'text-[#003366]'
                      : 'text-slate-700 group-hover:text-[#003366]'
                  }`}
                >
                  {isConcluido ? 'Concluído · Próximos pagamentos' : status}
                </span>

                <div className="flex items-center gap-2 tabular-nums">
                  <span className="font-extrabold text-slate-800">{count}</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    ({formatPercentBR(percent)})
                  </span>
                  <span className="hidden text-[11px] font-semibold text-slate-600 sm:inline">
                    • {moedaControleOrdem(totalValor)}
                  </span>
                </div>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isSelected
                      ? 'bg-[#FF6600]'
                      : 'bg-[#003366] group-hover:bg-[#003366]/80'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </button>
            <button type="button" disabled={loading || loadError}
              onClick={toggleDetails}
              aria-expanded={detailStatus === status}
              aria-controls={`detalhes-${status.replace(/\s+/g, '-')}`}
              aria-label={`${detailStatus === status ? 'Ocultar' : 'Exibir'} detalhes de ${status}`}
              className="shrink-0 rounded-xl border border-slate-200 px-2 text-xs font-bold text-[#003366] hover:border-[#003366] hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#003366] disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
            >{detailStatus === status ? 'Ocultar detalhes' : 'Exibir detalhes'}</button>
            </div>
            {detailStatus === status && (
              <div id={`detalhes-${status.replace(/\s+/g, '-')}`} role="region" aria-label={`Detalhes de ${status}`} className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-[#003366]">{detalhePagamentos ? 'Próximos pagamentos' : status}</h4>
                    <p className="text-xs text-slate-600">{detailRows.length} {detailRows.length === 1 ? 'ordem' : 'ordens'} · {detalhePagamentos ? 'Total previsto' : 'Total'}: {moedaControleOrdem(detailTotal)}</p>
                  </div>
                  <button type="button" onClick={exportDetails} disabled={exporting || !detailRows.length}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#003366] px-3 py-2 text-xs font-bold text-white hover:bg-[#002244] focus:outline-none focus:ring-2 focus:ring-[#FF6600] disabled:opacity-50">
                    <Download className="h-4 w-4" />{exporting ? 'Gerando PDF…' : 'Baixar PDF'}
                  </button>
                </div>
                {exportError && <p role="alert" className="mb-2 text-xs text-red-700">Não foi possível gerar o PDF. Tente novamente.</p>}
                {detalhePagamentos ? (
                  pagamentosPorDia.length === 0 ? (
                    <p className="text-sm text-slate-600">Nenhum pagamento futuro previsto.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-[#003366]">
                          <tr>
                            <th scope="col" className="px-2 py-2 sm:px-3">Data prevista</th>
                            <th scope="col" className="px-2 py-2 text-right sm:px-3">Total do dia</th>
                            <th scope="col" className="px-2 py-2 text-right sm:px-3"><span className="sr-only">Detalhes</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagamentosPorDia.map(dia => <LinhaPagamentoDia key={dia.data} dia={dia} />)}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="min-w-[1100px] w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[#003366]"><tr>{['Data', 'Protocolo', 'Equipamento', 'Solicitante', 'Serviço', 'Valor', 'Pedido de compra', 'FRS', 'Tarefa', 'NF', 'Pagamento previsto'].map(label => <th key={label} scope="col" className="px-2 py-2 font-bold">{label}</th>)}</tr></thead>
                    <tbody>{detailRows.map(row => <tr key={row.id} className="border-t border-slate-100 align-top text-slate-700">
                      {[dataControleOrdem(row.data), row.protocolo, row.equipamento, row.solicitante, row.servico, moedaControleOrdem(valorControleOrdem(row.valor)), row.pedidoCompra, row.frs, row.tarefaExtra, row.nf, dataControleOrdem(row.pagamento)].map((value, index) => <td key={index} className="px-2 py-2">{value || '—'}</td>)}
                    </tr>)}</tbody>
                  </table>
                </div>}
              </div>
            )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
