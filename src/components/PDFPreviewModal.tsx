/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext } from 'react';
import { Download, Share2, X, MessageSquare, Mail, Check, AlertCircle, Eye, FileText } from 'lucide-react';
import { OrdemDeServico } from '../types';
import { formatToBrazilianDate } from '../utils/dateFormatter';
import { EmpresaContext } from '../contexts/EmpresaContext';
import { getPerfilConfig, isCampoVisivel, getCampoLabel } from '../config/perfis';

interface PDFPreviewModalProps {
  os: OrdemDeServico;
  pdfDataUri: string; // The generated jsPDF output uri or blob url
  pdfBlob?: Blob | null; // The real Blob
  onClose: () => void;
}

export default function PDFPreviewModal({ os, pdfDataUri, pdfBlob, onClose }: PDFPreviewModalProps) {
  const empresaCtx = useContext(EmpresaContext);
  const company = empresaCtx?.empresa;
  const perfilConfig = empresaCtx?.perfilConfig || getPerfilConfig(company?.perfilEmpresa);
  const companyName = (company?.nomeFantasia || company?.razaoSocial || '').trim();

  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [internalBlob, setInternalBlob] = useState<Blob | null>(pdfBlob || null);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isIOS, setIsIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  });
  const [activeTab, setActiveTab] = useState<'quick' | 'native'>('quick');

  // Detect iOS and iframe environments
  useEffect(() => {
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent || '' : '';
    const iosDevice = /iPad|iPhone|iPod/.test(userAgent) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && /Macintosh/.test(userAgent));
    setIsIOS(iosDevice);

    try {
      const inIframe = window.self !== window.top;
      setIsInIframe(inIframe);
      // On iOS or sandboxed environments, default to structured quick view to avoid blob: iframe leaks
      setActiveTab(iosDevice || inIframe ? 'quick' : 'native');
    } catch (e) {
      setIsInIframe(true);
      setActiveTab('quick');
    }
  }, []);

  // Sync pdfBlob prop when available
  useEffect(() => {
    if (pdfBlob) {
      setInternalBlob(pdfBlob);
    }
  }, [pdfBlob]);

  // Handle direct Blob URL or base64 DataURI on mount (strictly for desktop fallback only)
  useEffect(() => {
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent || '' : '';
    const iosDevice = /iPad|iPhone|iPod/.test(userAgent) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && /Macintosh/.test(userAgent));

    // On iOS: strictly never create ObjectURL or store blobUrl
    if (iosDevice || isIOS) {
      setBlobUrl('');
      return;
    }

    let activeUrl = '';
    // Desktop only:
    if (pdfBlob) {
      activeUrl = URL.createObjectURL(pdfBlob);
      setBlobUrl(activeUrl);
    } else if (pdfDataUri) {
      if (pdfDataUri.startsWith('blob:') || pdfDataUri.startsWith('http')) {
        setBlobUrl(pdfDataUri);
      } else {
        try {
          const parts = pdfDataUri.split(',');
          if (parts.length > 1) {
            const mimeString = parts[0].split(':')[1].split(';')[0];
            const byteString = atob(parts[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });
            setInternalBlob(blob);
            activeUrl = URL.createObjectURL(blob);
            setBlobUrl(activeUrl);
          } else {
            setBlobUrl(pdfDataUri);
          }
        } catch (err) {
          console.error("Failed to generate PDF blob URL:", err);
          setBlobUrl(pdfDataUri);
        }
      }
    }
    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [pdfBlob, pdfDataUri, isIOS]);

  // Helper to generate sanitized PDF filename: Orçamento_NumeroDoOrcamento_NomeDoVeiculo.pdf
  const getPDFFilename = (osData: OrdemDeServico): string => {
    const num = (osData.numeroOS || '0')
      .toString()
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '_');

    const veiculoRaw = osData.equipamento || 'Veiculo';
    const veiculoClean = veiculoRaw
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    return `Orçamento_${num}_${veiculoClean || 'Veiculo'}.pdf`;
  };

  // Helper to share strictly the PDF document (only { files: [file] })
  const handleNativeShare = async () => {
    setSharing(true);
    setShareSuccess(null);
    const pdfFilename = getPDFFilename(os);
    try {
      const activeBlob = pdfBlob || internalBlob;
      if (!activeBlob) {
        throw new Error('Arquivo PDF não disponível para compartilhamento.');
      }

      // Create a native File object strictly from the real Blob
      const file = new File([activeBlob], pdfFilename, { type: 'application/pdf' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        setShareSuccess('Compartilhado com sucesso!');
      } else if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          files: [file],
        });
        setShareSuccess('Compartilhado com sucesso!');
      } else {
        if (isIOS) {
          // On iOS/iPad: strictly prohibited to use blobUrl or <a download>
          setShareSuccess('O seu navegador iOS não suporta compartilhamento direto de arquivos.');
        } else if (blobUrl) {
          // Fallback ONLY for desktop/non-iOS browsers without Web Share API
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = pdfFilename;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
          }, 150);
        }
      }
    } catch (err: any) {
      if (err && (err.name === 'AbortError' || err.code === 20)) {
        // User closed the native share sheet
        return;
      }
      console.warn("Native file sharing not completed:", err);
      if (isIOS) {
        setShareSuccess('Compartilhamento cancelado ou não suportado no dispositivo.');
      }
    } finally {
      setSharing(false);
      setTimeout(() => setShareSuccess(null), 4000);
    }
  };

  const shareViaEmail = () => {
    const formatCurrencyBRL = (val: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    let orcamentoStr = 'Não cadastrado';
    if (os.orcamento && os.orcamento.length > 0) {
      const itemsList = os.orcamento.map(item => `${item.quantidade}x ${item.descricao} (${formatCurrencyBRL(item.valorUnitario)}/un) - Total: ${formatCurrencyBRL(item.valorTotal)}`);
      orcamentoStr = `\n    ` + itemsList.join('\n    ');
      if (os.valorTotalOrcamento) {
        orcamentoStr += `\n  - Valor Total do Orçamento: ${formatCurrencyBRL(os.valorTotalOrcamento)}`;
      }
    }

    const subject = `Ordem de Serviço - Protocolo ${os.numeroOS}`;
    let body = `Olá,\n\nSegue resumo do Protocolo ${os.numeroOS} de manutenção realizada no equipamento ${os.equipamento}:\n\n`;
    body += `- Placa de Identidade: ${os.placa}\n`;
    body += `- Técnico Responsável: ${os.tecnico}\n`;
    if (os.status === 'Concluído' && os.dataConclusao) {
      body += `- Data de Conclusão: ${formatToBrazilianDate(os.dataConclusao)}\n`;
    } else {
      body += `- Data de Abertura: ${formatToBrazilianDate(os.dataAbertura)}\n`;
    }
    body += `- Status Final: ${os.status || 'Concluído'}\n`;
    body += `- Orçamento Itens: ${orcamentoStr}\n\n`;
    body += `Atenciosamente,\nGestão de Manutenção`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const triggerDownload = async () => {
    const activeBlob = pdfBlob || internalBlob;
    if (!activeBlob) {
      setShareSuccess('Arquivo PDF não disponível para download.');
      return;
    }

    const filename = getPDFFilename(os);
    const encodedFilename = encodeURIComponent(filename);
    const downloadPath = `/pdf-download/${encodedFilename}`;
    const downloadUrl = window.location.origin + downloadPath;

    // 1. Save Blob in Cache Storage with domain HTTPS URL and trigger standard download
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open('dg-gestao-pdf-cache');
        const responseToCache = new Response(activeBlob, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${encodedFilename}"`,
            'Content-Length': activeBlob.size.toString(),
          },
        });

        // Cache for both absolute URL and relative path
        await cache.put(downloadUrl, responseToCache.clone());
        await cache.put(downloadPath, responseToCache);

        // Initiate download using HTTPS URL of the domain
        const link = document.createElement('a');
        link.href = downloadPath;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        setShareSuccess('Download do PDF iniciado!');

        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        }, 150);
        return;
      } catch (cacheErr) {
        console.warn('Cache Storage download attempt failed:', cacheErr);
      }
    }

    // Fallback: If Cache Storage is unavailable and navigator supports file sharing
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const file = new File([activeBlob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
          });
          return;
        }
      } catch (err: any) {
        if (err && (err.name === 'AbortError' || err.code === 20)) {
          return;
        }
      }
    }

    if (isIOS) {
      setShareSuccess('Não foi possível iniciar o download direto no dispositivo.');
    }
  };

  return (
    <div id="pdf-preview-modal-layer" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-150 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header bar */}
        <div className="bg-slate-50 text-slate-800 px-5 py-4 flex items-center justify-between border-b border-slate-200">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2 text-[#003366]">
              <span>Visualizar PDF do Protocolo</span>
              <span className="bg-[#FF6600] text-white text-xs font-mono font-bold px-2 py-0.5 rounded-sm">
                {os.numeroOS}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Confira o escopo gerado antes de efetuar o download ou envio</p>
          </div>
          <button
            id="btn-close-pdf-modal"
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-full text-slate-600 cursor-pointer transition duration-150"
            title="Fechar Visualizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body divided */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Col 1 & 2: Previewer iframe or Quick View */}
          <div className="lg:col-span-2 flex flex-col bg-slate-100 border border-slate-200 rounded-xl p-2 min-h-[450px] sm:min-h-[520px]">
            {/* Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2 px-1 gap-2 flex-wrap">
              {!isIOS ? (
                <div className="flex gap-1.5 bg-slate-200 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab('quick')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      activeTab === 'quick'
                        ? 'bg-white text-[#003366] shadow-xs'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 animate-pulse text-[#FF6600]" />
                    Visualização Rápida (SaaS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('native')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      activeTab === 'native'
                        ? 'bg-white text-[#003366] shadow-xs'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Visualizador do Navegador
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-[#003366]">
                  <FileText className="w-4 h-4 text-[#FF6600]" />
                  <span>Resumo do Documento PDF</span>
                </div>
              )}

              {isInIframe && activeTab === 'native' && !isIOS && (
                <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-[#FF6600]" />
                  <span>Chrome pode bloquear embeds no iframe</span>
                </div>
              )}
            </div>

            {/* Inner render area */}
            <div className="flex-1 rounded-lg overflow-hidden flex flex-col relative min-h-[350px]">
              {activeTab === 'quick' || isIOS ? (
                <div className="flex-1 bg-white rounded-lg p-5 sm:p-6 overflow-y-auto border border-slate-200 flex flex-col justify-between max-h-[480px]">
                  {/* Digital Document Header */}
                  <div className="border-b border-dashed border-slate-300 pb-4 mb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-black text-[#003366] uppercase tracking-tight">
                          {companyName || 'Ordem de Serviço'}
                        </h4>
                        {company?.razaoSocial && company?.razaoSocial !== companyName && (
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {company.razaoSocial}
                          </p>
                        )}
                        {company?.cnpj && (
                          <p className="text-[10px] text-slate-400">
                            CNPJ: {company.cnpj}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-[#003366]/5 text-[#003366] text-[10px] font-mono font-bold px-2 py-1 rounded border border-[#003366]/10">
                          PROTOCOLO: {os.numeroOS}
                        </span>
                        <p className="text-[9px] text-[#FF6600] font-bold uppercase tracking-wider mt-1.5">
                          ORDEM DE SERVIÇO {os.status || 'CONCLUÍDO'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document Body Details */}
                  <div className="space-y-4 text-xs text-slate-700 flex-1">
                    {/* Informações Gerais */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {isCampoVisivel(perfilConfig, 'equipamento') && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                            {getCampoLabel(perfilConfig, 'equipamento', 'Equipamento')}
                          </span>
                          <strong className="text-slate-800">{os.equipamento}</strong>
                        </div>
                      )}
                      {isCampoVisivel(perfilConfig, 'placa') && os.placa && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                            {getCampoLabel(perfilConfig, 'placa', 'Placa / Identificador')}
                          </span>
                          <strong className="text-slate-800 font-mono">{os.placa}</strong>
                        </div>
                      )}
                      {isCampoVisivel(perfilConfig, 'chassi') && os.chassi && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                            {getCampoLabel(perfilConfig, 'chassi', 'Chassi')}
                          </span>
                          <strong className="text-slate-800 font-mono">{os.chassi}</strong>
                        </div>
                      )}
                      {isCampoVisivel(perfilConfig, 'numeroSerie') && os.numeroSerie && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                            {getCampoLabel(perfilConfig, 'numeroSerie', 'Número de Série')}
                          </span>
                          <strong className="text-slate-800 font-mono">{os.numeroSerie}</strong>
                        </div>
                      )}
                      {isCampoVisivel(perfilConfig, 'patrimonio') && os.patrimonio && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                            {getCampoLabel(perfilConfig, 'patrimonio', 'Patrimônio')}
                          </span>
                          <strong className="text-slate-800 font-mono">{os.patrimonio}</strong>
                        </div>
                      )}
                      {isCampoVisivel(perfilConfig, 'localObra') && os.localObra && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                            {getCampoLabel(perfilConfig, 'localObra', 'Local da Obra')}
                          </span>
                          <strong className="text-slate-800">{os.localObra}</strong>
                        </div>
                      )}
                      {isCampoVisivel(perfilConfig, 'responsavelObra') && os.responsavelObra && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                            {getCampoLabel(perfilConfig, 'responsavelObra', 'Responsável pela Obra')}
                          </span>
                          <strong className="text-slate-800">{os.responsavelObra}</strong>
                        </div>
                      )}
                      {isCampoVisivel(perfilConfig, 'setor') && os.setor && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                            {getCampoLabel(perfilConfig, 'setor', 'Setor')}
                          </span>
                          <strong className="text-slate-800">{os.setor}</strong>
                        </div>
                      )}
                      {isCampoVisivel(perfilConfig, 'linhaProducao') && os.linhaProducao && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                            {getCampoLabel(perfilConfig, 'linhaProducao', 'Linha de Produção')}
                          </span>
                          <strong className="text-slate-800">{os.linhaProducao}</strong>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                          {perfilConfig.labels.tecnico || 'Técnico Responsável'}
                        </span>
                        <strong className="text-slate-800">{os.tecnico}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                          {os.status === 'Concluído' ? 'Conclusão' : 'Status / Abertura'}
                        </span>
                        <strong className="text-slate-800 font-medium text-slate-700">
                          {os.status === 'Concluído' 
                            ? formatToBrazilianDate(os.dataConclusao || os.dataAbertura)
                            : `${formatToBrazilianDate(os.dataAbertura)} (Pendente)`}
                        </strong>
                      </div>
                    </div>

                    {/* Escopo Técnico */}
                    <div className="space-y-2.5">
                      {os.descricaoAvaria && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Diagnóstico da Avaria / Queixa</span>
                          <p className="text-slate-800 bg-slate-50/50 p-2.5 rounded border border-slate-100/80 italic">{os.descricaoAvaria}</p>
                        </div>
                      )}
                      {os.servicoExecutado && (
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Serviço Técnico Executado</span>
                          <p className="text-slate-800 bg-slate-50/50 p-2.5 rounded border border-slate-100/80 font-semibold">{os.servicoExecutado}</p>
                        </div>
                      )}
                    </div>

                    {/* Orçamento das Peças se houver */}
                    {os.orcamento && os.orcamento.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Peças, Componentes e Insumos</span>
                        <div className="border border-slate-150 rounded-lg overflow-hidden">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                                <th className="py-1.5 px-3 w-12 text-center">Qtd</th>
                                <th className="py-1.5 px-2">Descrição</th>
                                <th className="py-1.5 px-2 text-right">Unitário</th>
                                <th className="py-1.5 px-3 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {os.orcamento.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/40">
                                  <td className="py-1.5 px-3 text-center text-slate-600 font-mono">{item.quantidade}</td>
                                  <td className="py-1.5 px-2 font-medium text-slate-800">{item.descricao}</td>
                                  <td className="py-1.5 px-2 text-right text-slate-600 font-mono">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-semibold text-slate-800 font-mono">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorTotal)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Totais & Aviso de visualização */}
                  <div className="mt-4 pt-3 border-t border-slate-150 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#003366]">VALOR TOTAL DOS SERVIÇOS E PRODUTOS:</span>
                      <strong className="text-base font-black text-[#FF6600] font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.valorTotalOrcamento || 0)}
                      </strong>
                    </div>

                    <div className="bg-amber-50/80 text-amber-950 border border-amber-500/15 rounded-xl p-3 text-[11px] leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#FF6600] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-900 block">Modo de Visualização Segura Ativo</span>
                        <span>
                          Para garantir a segurança do seu dispositivo, utilize o botão <strong className="text-[#003366]">"Baixar Arquivo PDF (A4)"</strong> ou <strong className="text-[#25D366]">"Enviar pelo WhatsApp"</strong> para salvar ou compartilhar o documento PDF original.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center relative">
                  {blobUrl || pdfDataUri ? (
                    <iframe
                      id="pdf-frame-embed"
                      src={blobUrl || pdfDataUri}
                      title="PDF Render"
                      className="w-full h-full border-0 rounded-lg bg-white"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto animate-pulse mb-1" />
                      <p className="text-xs font-medium">Carregando arquivo PDF...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
              📱 Dica para Celular: Toque em <strong className="text-[#25D366]">Enviar pelo WhatsApp</strong> ou <strong className="text-[#003366]">Compartilhar no Celular</strong> para enviar o arquivo PDF diretamente.
            </p>
          </div>

          {/* Col 3: Actions pane */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed space-y-2">
                <span className="font-bold text-[#003366] text-sm block">Relatório Pronto para Envio</span>
                <p>Nº do Protocolo: <strong className="font-mono">{os.numeroOS}</strong></p>
                <p>Equipamento: <strong>{os.equipamento}</strong></p>
                <p>Técnico: <strong>{os.tecnico}</strong></p>
                <p className="border-t border-slate-200 pt-2 mt-2">
                  Você já pode compartilhar o documento diretamente para o cliente orçado ou encarregado de campo.
                </p>
              </div>

              {shareSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 animate-bounce">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{shareSuccess}</span>
                </div>
              )}

              {/* Launcher downloads */}
              <button
                id="btn-download-pdf"
                onClick={triggerDownload}
                className="w-full flex items-center justify-center gap-2.5 bg-[#003366] text-white py-4 px-4 rounded-xl font-bold hover:bg-[#002244] active:scale-98 transition duration-150 cursor-pointer text-sm shadow-sm"
              >
                <Download className="w-5 h-5 text-white/90" />
                Baixar Arquivo PDF (A4)
              </button>

              <button
                id="btn-share-native"
                onClick={handleNativeShare}
                disabled={sharing}
                className="w-full flex items-center justify-center gap-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 px-4 rounded-xl font-bold active:scale-98 transition duration-150 cursor-pointer text-sm border border-slate-200"
              >
                <Share2 className="w-5 h-5 text-slate-600" />
                {sharing ? 'Carregando Compartilhamento...' : 'Compartilhar no Celular'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-150"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">Ou Enviar Manual</div>
              </div>

              {/* WhatsApp direct launch with native file sharing */}
              <button
                id="btn-share-whatsapp"
                onClick={handleNativeShare}
                disabled={sharing}
                className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white py-3.5 px-4 rounded-xl font-bold active:scale-98 transition duration-150 cursor-pointer text-sm shadow-xs"
              >
                <MessageSquare className="w-4.5 h-4.5 text-white" />
                Enviar pelo WhatsApp
              </button>

              {/* Email direct launch */}
              <button
                id="btn-share-email"
                onClick={shareViaEmail}
                className="w-full flex items-center justify-center gap-2.5 bg-slate-700 hover:bg-slate-800 text-white py-3 px-4 rounded-xl font-bold active:scale-98 transition duration-150 cursor-pointer text-sm shadow-xs"
              >
                <Mail className="w-4.5 h-4.5 text-white" />
                Compartilhar por E-mail
              </button>
            </div>

            <button
              id="btn-back-to-menu"
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-xl font-bold active:scale-98 transition duration-150 text-xs border border-slate-200 cursor-pointer text-center"
            >
              {os.status === 'Pendente' ? 'Voltar para o Formulário' : 'Voltar ao Menu Principal'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
