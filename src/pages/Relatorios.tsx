/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useContext, useMemo } from 'react';
import { Search, Car, FileText, Calendar, Calculator, CheckCircle2, AlertTriangle, AlertCircle, ArrowLeft, BarChart2 } from 'lucide-react';
import { EquipamentoContext } from '../contexts/EquipamentoContext';
import { ClienteContext } from '../contexts/ClienteContext';
import { EmpresaContext } from '../contexts/EmpresaContext';
import { OrdemDeServico, Equipamento } from '../types';
import { generateProntuarioPDF } from '../utils/prontuarioGenerator';

interface RelatoriosProps {
  orders: OrdemDeServico[];
  onBack: () => void;
  onViewCustomPDF: (pseudoOS: OrdemDeServico, pdfUriString: string) => void;
}

export default function Relatorios({ orders, onBack, onViewCustomPDF }: RelatoriosProps) {
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

  // Filter list based on search term (search by plate, model, brand, client, or equipment name)
  const filteredEquipments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return unifiedEquipments;

    return unifiedEquipments.filter(e => {
      const fullEquip = `${e.tipo || ''} ${e.fabricante || ''} ${e.modelo || ''}`.toLowerCase();
      return (
        (e.placa && e.placa.toLowerCase().includes(term)) ||
        (e.fabricante && e.fabricante.toLowerCase().includes(term)) ||
        (e.modelo && e.modelo.toLowerCase().includes(term)) ||
        (e.tipo && e.tipo.toLowerCase().includes(term)) ||
        fullEquip.includes(term) ||
        (e.clienteNome && e.clienteNome.toLowerCase().includes(term))
      );
    });
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
    } catch (err) {
      console.error("Error generating technical history PDF:", err);
      alert("Falha técnica ao tentar compilar os indicadores do prontuário: " + err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div id="relatorios-page-container" className="space-y-6">
      
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="btn-back-from-reports-page"
              type="button"
              onClick={onBack}
              className="p-2 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-slate-500"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="text-left">
            <h2 className="text-lg font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#FF6600]" />
              Prontuário Inteligente do Equipamento
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Consolidação de histórico de atendimentos, análise de custos acumulados e diagnóstico preditivo de manutenção.
            </p>
          </div>
        </div>
      </div>

      {/* Main interactive grid area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left panels (2/3 width on md+) - Search & Equipment selection list */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs md:col-span-2 flex flex-col gap-4">
          <div className="text-left border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-[#003366] uppercase tracking-tight">Buscar Equipamento / Veículo</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Selecione um item abaixo para compilar o prontuário técnico completo.</p>
          </div>

          {/* Search Input bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Nome do Equipamento, Placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#001f3f]/10 focus:border-[#001f3f]/40 transition"
            />
          </div>

          {/* Equipment list block */}
          <div className="border border-slate-200 rounded-xl max-h-[400px] overflow-y-auto bg-slate-50 flex flex-col text-left custom-scrollbar">
            {filteredEquipments.length > 0 ? (
              filteredEquipments.map((eq) => {
                const isSelected = eq.id === selectedEqId;
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => setSelectedEqId(eq.id)}
                    className={`w-full p-4 border-b border-slate-150 last:border-0 text-left transition hover:bg-[#FF6600]/5 flex items-center justify-between gap-4 focus:outline-none ${
                      isSelected ? 'bg-[#FF6600]/10 border-l-4 border-l-[#FF6600]' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-sm tracking-wider uppercase ${isSelected ? 'text-[#FF6600]' : 'text-slate-800'}`}>
                          {eq.placa || 'SEM PLACA'}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 font-extrabold px-2 py-0.5 rounded-sm uppercase">
                          {eq.ano}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 truncate mt-1">
                        {eq.fabricante} {eq.modelo}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Proprietário</span>
                      <span className="text-xs font-extrabold text-[#001f3f] truncate block max-w-[150px]">
                        {eq.clienteNome || 'Não informado'}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">Nenhum veículo ou equipamento localizado</p>
                <p className="text-[11px] text-slate-400 mt-1">Tente pesquisar por outros termos.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel (1/3 width on md+) - Statistics & Document Generation Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[400px]">
          {selectedEquipment ? (
            <div className="space-y-5 text-left flex-1 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-200 pb-3">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Equipamento Selecionado</span>
                  <h4 className="font-black text-base text-[#003366] uppercase leading-tight mt-1">
                    {selectedEquipment.fabricante} {selectedEquipment.modelo}
                  </h4>
                  <div className="flex items-center gap-2.5 mt-2">
                    <span className="font-mono text-xs font-extrabold text-[#FF6600] bg-[#FF6600]/10 px-2.5 py-1 rounded">
                      {selectedEquipment.placa}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">
                      Ano: {selectedEquipment.ano}
                    </span>
                  </div>
                </div>

                {/* Aggregated details preview */}
                <div className="space-y-3.5 pt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Histórico de Atendimentos:</span>
                    <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {matchingOrders.length} {matchingOrders.length === 1 ? 'registro' : 'registros'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Valor Acumulado de Investimento:</span>
                    <span className="font-black text-sm text-[#001f3f]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        matchingOrders.reduce((sum, o) => sum + (o.valorTotalOrcamento || 0), 0)
                      )}
                    </span>
                  </div>

                  {matchingOrders.length > 0 && (
                    <div className="text-[11px] text-slate-500 font-bold flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Último atendimento: {matchingOrders[matchingOrders.length - 1].numeroOS}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Health state card */}
              <div className="pt-4">
                {matchingOrders.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5 items-start text-left shrink-0">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-amber-800 text-xs uppercase tracking-tight">Sem Ordens de Serviço</h5>
                      <p className="text-[10px] text-amber-700 font-medium leading-relaxed mt-0.5">
                        Este veículo não possui atendimentos anteriores registrados. O relatório técnico conterá apenas a ficha cadastral do item.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-3.5 flex gap-2.5 items-start text-left shrink-0">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-emerald-800 text-xs uppercase tracking-tight">Dados Compilados</h5>
                      <p className="text-[10px] text-emerald-700 font-medium leading-relaxed mt-0.5">
                        Análise de {matchingOrders.length} OSs pronta. O prontuário gerará gráficos de gastos por categoria, evolução temporal e análise preditiva.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 my-auto">
              <Car className="w-12 h-12 text-slate-300 mb-3 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Aguardando Seleção</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed mx-auto">
                Selecione um veículo ou equipamento na lista para carregar seu histórico de manutenção e custos.
              </p>
            </div>
          )}

          {/* Action trigger button */}
          <div className="pt-4 border-t border-slate-150">
            <button
              type="button"
              disabled={!selectedEquipment || generating}
              onClick={handleGenerateReport}
              className="w-full h-12 bg-[#FF6600] hover:bg-[#E05500] disabled:bg-slate-150 text-white disabled:text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Compilando Indicadores...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4.5 h-4.5 text-white" />
                  <span>Gerar Prontuário PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
