/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext } from 'react';
import { Download, Share2, X, MessageSquare, Mail, Check, AlertCircle, ExternalLink, Eye, FileText, Lock } from 'lucide-react';
import { OrdemDeServico } from '../types';
import { EmpresaContext } from '../contexts/EmpresaContext';

interface PDFPreviewModalProps {
  os: OrdemDeServico;
  pdfDataUri: string; // The generated jsPDF output uri
  onClose: () => void;
}

export default function PDFPreviewModal({ os, pdfDataUri, onClose }: PDFPreviewModalProps) {
  const empresaCtx = useContext(EmpresaContext);
  const company = empresaCtx?.empresa;
  const isCompanyRegistered = company && company.nomeFantasia && company.nomeFantasia !== 'Sua Empresa';

  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'native'>('quick');

  // Detect sandboxed iframe environments
  useEffect(() => {
    try {
      const inIframe = window.self !== window.top;
      setIsInIframe(inIframe);
      // If we are in an iframe (like Google AI Studio live preview), default to 'quick' view
      // because Chrome/Safari strictly block iframe blob/dataURIs embeds.
      setActiveTab(inIframe ? 'quick' : 'native');
    } catch (e) {
      setIsInIframe(true);
      setActiveTab('quick');
    }
  }, []);

  // Convert the massive base64 DataURI into a lightweight browser Blob URL on mount
  useEffect(() => {
    let activeUrl = '';
    if (pdfDataUri) {
      try {
        const parts = pdfDataUri.split(',');
        const mimeString = parts[0].split(':')[1].split(';')[0];
        const byteString = atob(parts[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        setPdfBlob(blob);
        activeUrl = URL.createObjectURL(blob);
        setBlobUrl(activeUrl);
      } catch (err) {
        console.error("Failed to generate PDF blob URL:", err);
      }
    }
    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [pdfDataUri]);

  // Helper to extract base64 binary and trigger native sharing
  const handleNativeShare = async () => {
    setSharing(true);
    setShareSuccess(null);
    try {
      let file: File;
      if (pdfBlob) {
        file = new File([pdfBlob], `Relatorio_Protocolo_${os.numeroOS}.pdf`, { type: 'application/pdf' });
      } else {
        // Convert dataURI to a File object
        const res = await fetch(pdfDataUri);
        const blob = await res.blob();
        file = new File([blob], `Relatorio_Protocolo_${os.numeroOS}.pdf`, { type: 'application/pdf' });
      }
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ordem de Serviço - Protocolo ${os.numeroOS}`,
          text: `Segue em anexo a Ordem de Serviço do Protocolo ${os.numeroOS}.\nEquipamento: ${os.equipamento}\nStatus: ${os.status || 'Concluído'}`,
        });
        setShareSuccess('Compartilhado com sucesso!');
      } else {
        throw new Error('Navegador não suporta compartilhamento de arquivos nativo. Tente WhatsApp/E-mail abaixo.');
      }
    } catch (err) {
      console.warn("Native file sharing not supported or cancelled:", err);
      // Fallback: Copy link/simulate share
      try {
        if (navigator.share) {
          // If text sharing is supported even if file sharing is not
          await navigator.share({
            title: `Relatório Protocolo ${os.numeroOS}`,
            text: `Ordem de Serviço - Protocolo ${os.numeroOS}.\nEquipamento: ${os.equipamento}\nConsulte o relatório online.`,
            url: os.pdfGerado?.startsWith('http') ? os.pdfGerado : undefined
          });
        } else {
          // Fallback to clipboard copy
          const shareText = `Ordem de Serviço - Protocolo ${os.numeroOS}\nEquipamento: ${os.equipamento}\nPlaca: ${os.placa}\nTécnico: ${os.tecnico}\nStatus: ${os.status}`;
          await navigator.clipboard.writeText(shareText);
          setShareSuccess('Resumo copiado para a Área de Transferência!');
        }
      } catch (clipErr) {
        setShareSuccess('Use os atalhos do WhatsApp ou E-mail abaixo.');
      }
    } finally {
      setSharing(false);
      setTimeout(() => setShareSuccess(null), 4000);
    }
  };

  const shareViaWhatsApp = () => {
    // Generate text message
    let message = `*Ordem de Serviço*\n`;
    message += `*Protocolo Nº:* ${os.numeroOS}\n`;
    message += `*Equipamento:* ${os.equipamento}\n`;
    message += `*Placa:* ${os.placa}\n`;
    message += `*Técnico:* ${os.tecnico}\n`;
    message += `*Status:* ${os.status || 'Concluído'}\n`;
    
    if (os.pdfGerado && os.pdfGerado.startsWith('http')) {
      message += `*Link para o PDF:* ${os.pdfGerado}\n`;
    } else {
      message += `_(Visualização do PDF completo gerada no celular do técnico)_\n`;
    }
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
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
    body += `- Data/Hora de Fechamento: ${os.dataConclusao} às ${os.horaConclusao}\n`;
    body += `- Status Final: ${os.status || 'Concluído'}\n`;
    body += `- Orçamento Itens: ${orcamentoStr}\n\n`;
    
    if (os.pdfGerado && os.pdfGerado.startsWith('http')) {
      body += `Você pode baixar o PDF completo em anexo ou neste link:\n${os.pdfGerado}\n\n`;
    } else {
      body += `O PDF já foi gerado na memória do dispositivo.\n\n`;
    }
    body += `Atenciosamente,\nGestão de Manutenção`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const triggerDownload = () => {
    try {
      const targetUrl = blobUrl || pdfDataUri;
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = `Relatorio_Protocolo_${os.numeroOS}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 150);
    } catch (err) {
      console.error("Blob download failed, opening in new tab:", err);
      window.open(blobUrl || pdfDataUri, '_blank');
    }
  };

  const handleOpenInNewTab = () => {
    try {
      const url = blobUrl || pdfDataUri;
      window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to open tab:", err);
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

              {isInIframe && activeTab === 'native' && (
                <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-[#FF6600]" />
                  <span>Chrome pode bloquear embeds no iframe</span>
                </div>
              )}
            </div>

            {/* Inner render area */}
            <div className="flex-1 rounded-lg overflow-hidden flex flex-col relative min-h-[350px]">
              {activeTab === 'quick' ? (
                <div className="flex-1 bg-white rounded-lg p-5 sm:p-6 overflow-y-auto border border-slate-200 flex flex-col justify-between max-h-[480px]">
                  {/* Digital Document Header */}
                  <div className="border-b border-dashed border-slate-300 pb-4 mb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-black text-[#003366] uppercase tracking-tight">
                          {isCompanyRegistered ? company.nomeFantasia : 'Ordem de Serviço'}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {isCompanyRegistered ? company.razaoSocial : 'Sua Empresa'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {company?.cnpj ? `CNPJ: ${company.cnpj}` : 'CNPJ: 12.345.678/0001-90'}
                        </p>
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
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Equipamento</span>
                        <strong className="text-slate-800">{os.equipamento}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Identidade / Placa</span>
                        <strong className="text-slate-800 font-mono">{os.placa || '-'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Técnico Responsável</span>
                        <strong className="text-slate-800">{os.tecnico}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Conclusão</span>
                        <strong className="text-slate-800 font-medium text-slate-700">
                          {os.dataConclusao ? `${os.dataConclusao} às ${os.horaConclusao}` : `${os.dataAbertura} ${os.horaAbertura}`}
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
                          Para garantir a segurança do seu navegador, o Google Chrome bloqueia PDFs incorporados em áreas de testes e ambientes de desenvolvimento. Clique em <strong className="text-[#FF6600]">"Abrir PDF em Nova Guia"</strong> para visualizar, salvar ou imprimir o documento original formatado em A4 oficial.
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
              📱 Dica para Celular: Se o botão Baixar falhar devido ao seu modelo de navegador, clique em <strong className="text-[#FF6600]">Abrir PDF em Nova Guia</strong> para salvá-lo nativamente.
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

              {/* Open in PDF viewers */}
              <button
                id="btn-open-pdf-fullscreen"
                onClick={handleOpenInNewTab}
                className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 py-3.5 px-4 rounded-xl font-bold active:scale-98 transition duration-150 cursor-pointer text-sm shadow-xs"
              >
                <ExternalLink className="w-4.5 h-4.5 text-amber-700" />
                Abrir PDF em Nova Guia
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

              {/* WhatsApp direct launch */}
              <button
                id="btn-share-whatsapp"
                onClick={shareViaWhatsApp}
                className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white py-3 px-4 rounded-xl font-bold active:scale-98 transition duration-150 cursor-pointer text-sm shadow-xs"
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
