/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useContext, useMemo } from 'react';
import { X, Search, Car, FileText, Calendar, Calculator, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { EquipamentoContext } from '../contexts/EquipamentoContext';
import { ClienteContext } from '../contexts/ClienteContext';
import { EmpresaContext } from '../contexts/EmpresaContext';
import { OrdemDeServico, Equipamento } from '../types';
import { generateProntuarioPDF } from '../utils/prontuarioGenerator';

interface ProntuarioModalProps {
  orders: OrdemDeServico[];
  onClose: () => void;
  onViewCustomPDF: (pseudoOS: OrdemDeServico, pdfUriString: string) => void;
}

export default function ProntuarioModal({ orders, onClose, onViewCustomPDF }: ProntuarioModalProps) {
  const equipCtx = useContext(EquipamentoContext);
  const clienteCtx = useContext(ClienteContext);
  const empresaCtx = useContext(EmpresaContext);

  const { equipamentos } = equipCtx || { equipamentos: [] };
  const { clientes } = clienteCtx || { clientes: [] };
  const company = empresaCtx?.empresa || null;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEqId, setSelectedEqId] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // Unify and build complete list of equipment (from context AND any extra unique equipment found in orders)
  const unifiedEquipments = useMemo(() => {
    const list: Equipamento[] = [...equipamentos];

    // Find plates in orders that don't exist in registered equipment context
    orders.forEach(order => {
      if (!order.placa) return;
      const cleanOrderPlaque = order.placa.toLowerCase().replace(/\s/g, '');
      const exists = list.some(e => (e.placa || '').toLowerCase().replace(/\s/g, '') === cleanOrderPlaque);
      
      if (!exists) {
        // Build pseudo equipment card
        const parts = (order.equipamento || '').split(' ');
        const manufacturer = parts[0] || 'Veículo';
        const model = parts.slice(1).join(' ') || 'Cadastrado via OS';
        
        list.push({
          id: `pseudo_${cleanOrderPlaque}`,
          empresaId: order.empresaId || '',
          clienteId: order.clienteId || '',
          clienteNome: order.clienteNome || 'Cliente OS',
          tipo: 'Automotivo',
          fabricante: manufacturer,
          modelo: model,
          ano: 'N/A',
          placa: order.placa,
          chassi: 'N/A',
          numeroSerie: 'N/A',
          observacoes: 'Importado de ordens de serviço anteriores',
          createdAt: order.dataAbertura
        });
      }
    });

    return list;
  }, [equipamentos, orders]);

  // Filter list based on search term (search by plate, model, brand, or client)
  const filteredEquipments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return unifiedEquipments;

    return unifiedEquipments.filter(e => 
      (e.placa && e.placa.toLowerCase().includes(term)) ||
      (e.fabricante && e.fabricante.toLowerCase().includes(term)) ||
      (e.modelo && e.modelo.toLowerCase().includes(term)) ||
      (e.clienteNome && e.clienteNome.toLowerCase().includes(term))
    );
  }, [unifiedEquipments, searchTerm]);

  // Selected Equipment Entity details
  const selectedEquipment = useMemo(() => {
    return unifiedEquipments.find(e => e.id === selectedEqId) || null;
  }, [unifiedEquipments, selectedEqId]);

  // Find all service orders that match the selected equipment
  const matchingOrders = useMemo(() => {
    if (!selectedEquipment) return [];
    const eqPlaqueClean = (selectedEquipment.placa || '').toLowerCase().replace(/\s/g, '');

    return orders.filter(order => {
      const orderPlaqueClean = (order.placa || '').toLowerCase().replace(/\s/g, '');
      const matchesPlaque = orderPlaqueClean && eqPlaqueClean && orderPlaqueClean === eqPlaqueClean;
      const matchesId = order.equipamentoId === selectedEquipment.id;
      const matchesName = order.equipamento?.toLowerCase().trim() === `${selectedEquipment.fabricante} ${selectedEquipment.modelo}`.toLowerCase().trim();
      return matchesPlaque || matchesId || matchesName;
    });
  }, [orders, selectedEquipment]);

  // Generate Technical Report PDF
  const handleGenerateReport = async () => {
    if (!selectedEquipment) return;
    setGenerating(true);

    try {
      // Find matching client details
      const client = clientes.find(c => c.id === selectedEquipment.clienteId) || null;
      
      // Call modular jsPDF printer
      const dataUri = await generateProntuarioPDF(selectedEquipment, orders, company, client);

      // Assemble pseudo OS details to pass sharing validation
      const pseudoOS: OrdemDeServico = {
        id: 'prontuario_' + selectedEquipment.placa,
        numeroOS: `PRONTUÁRIO-${selectedEquipment.placa.toUpperCase()}`,
        dataAbertura: new Date().toISOString().split('T')[0],
        horaAbertura: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        equipamento: `${selectedEquipment.fabricante} ${selectedEquipment.modelo} (${selectedEquipment.ano})`,
        placa: selectedEquipment.placa,
        tecnico: 'Análise Inteligente',
        status: 'Concluído',
        valorTotalOrcamento: matchingOrders.reduce((sum, o) => sum + (o.valorTotalOrcamento || 0), 0)
      };

      // Output to App state preview
      onViewCustomPDF(pseudoOS, dataUri);
      onClose(); // Close selector dialog
    } catch (err) {
      console.error("Error generating technical history PDF:", err);
      alert("Falha técnica ao tentar compilar os indicadores do prontuário: " + err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div id="prontuario-modal-container" className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full mx-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header bar */}
        <div className="bg-gradient-to-r from-[#001f3f] to-[#001122] text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF6600]/10 text-[#FF6600] rounded-xl border border-[#FF6600]/20 shrink-0">
              <Car className="w-5.5 h-5.5 text-[#FF6600]" />
            </div>
            <div className="text-left">
              <h3 className="font-black text-sm sm:text-base uppercase tracking-tight">Prontuário Inteligente</h3>
              <p className="text-[10px] text-slate-300 font-medium">Relatório de histórico consolidado, custos e diagnósticos de saúde.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer focus:outline-none"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Modal Content split */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-6 overflow-y-auto max-h-[70vh]">
          
          {/* Left panel - Search & Equipment Select */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-left">
              Selecionar Equipamento / Veículo
            </label>

            {/* Search inputs */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Placa, Marca, Modelo ou Cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#001f3f]/10 focus:border-[#001f3f]/40 transition"
              />
            </div>

            {/* List box container */}
            <div className="border border-slate-200 rounded-xl max-h-[220px] overflow-y-auto bg-slate-50 flex flex-col text-left custom-scrollbar">
              {filteredEquipments.length > 0 ? (
                filteredEquipments.map((eq) => {
                  const isSelected = eq.id === selectedEqId;
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => setSelectedEqId(eq.id)}
                      className={`w-full p-3 border-b border-slate-100 last:border-0 text-left transition hover:bg-[#FF6600]/5 flex items-center justify-between gap-3 focus:outline-none ${
                        isSelected ? 'bg-[#FF6600]/10 border-l-4 border-l-[#FF6600]' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-xs tracking-wider uppercase ${isSelected ? 'text-[#FF6600]' : 'text-slate-800'}`}>
                            {eq.placa || 'SEM PLACA'}
                          </span>
                          <span className="text-[9px] bg-slate-200/60 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase">
                            {eq.ano}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                          {eq.fabricante} {eq.modelo}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-slate-400 font-semibold block">Proprietário</span>
                        <span className="text-[9.5px] font-bold text-[#001f3f] truncate block max-w-[100px]">
                          {eq.clienteNome || 'Não informado'}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <AlertCircle className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">Nenhum equipamento encontrado</p>
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Calculated Indicators Preview */}
          <div className="w-full sm:w-64 shrink-0 flex flex-col bg-slate-50 rounded-2xl border border-slate-200/60 p-4 justify-between min-h-[250px]">
            {selectedEquipment ? (
              <div className="space-y-4 text-left">
                <div className="border-b border-slate-200 pb-2.5">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Equipamento Selecionado</span>
                  <h4 className="font-black text-sm text-[#001f3f] uppercase leading-tight mt-0.5">
                    {selectedEquipment.fabricante} {selectedEquipment.modelo}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono text-[10px] font-bold text-[#FF6600] bg-[#FF6600]/10 px-2 py-0.5 rounded">
                      {selectedEquipment.placa}
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-bold">
                      Ano: {selectedEquipment.ano}
                    </span>
                  </div>
                </div>

                {/* Database compilation overview */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-semibold">Ordens de Serviço:</span>
                    <span className="font-bold text-slate-800">{matchingOrders.length} encontradas</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-semibold">Valor Total Investido:</span>
                    <span className="font-bold text-[#001f3f]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        matchingOrders.reduce((sum, o) => sum + (o.valorTotalOrcamento || 0), 0)
                      )}
                    </span>
                  </div>

                  {matchingOrders.length > 0 && (
                    <div className="text-[9.5px] text-slate-400 font-semibold flex items-center gap-1.5 pt-1 border-t border-slate-200/80">
                      <Calendar className="w-3 h-3" />
                      <span>Última OS: {matchingOrders[matchingOrders.length - 1].numeroOS}</span>
                    </div>
                  )}
                </div>

                {/* Health Warning Badge */}
                {matchingOrders.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start text-left shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-800 font-medium leading-relaxed">
                      <strong>Sem histórico cadastrado!</strong> Nenhuma OS encontrada. Não haverá dados estatísticos no PDF.
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-3 flex gap-2 items-start text-left shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-emerald-800 font-medium leading-relaxed">
                      <strong>Pronto para análise!</strong> {matchingOrders.length} OSs servirão de base para o parecer técnico e gráficos do prontuário.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 my-auto">
                <Car className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-wider">Aguardando Seleção</p>
                <p className="text-[9px] text-slate-400 mt-1 max-w-[180px]">Escolha um veículo na lista para gerar o histórico.</p>
              </div>
            )}

            {/* Generate CTA Button */}
            <div className="pt-4 border-t border-slate-200/65">
              <button
                type="button"
                disabled={!selectedEquipment || generating}
                onClick={handleGenerateReport}
                className="w-full h-11 bg-[#FF6600] hover:bg-[#E05500] disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-white" />
                    <span>Gerar Relatório</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
