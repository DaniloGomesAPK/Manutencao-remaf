/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Plus, 
  Users, 
  Car, 
  Layers, 
  Calculator, 
  ChevronRight, 
  Calendar, 
  PenTool, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  Building2,
  Megaphone
} from 'lucide-react';
import { OrdemDeServico } from '../types';
import { formatToBrazilianDate } from '../utils/dateFormatter';

interface DashboardHomeProps {
  orders: OrdemDeServico[];
  onNewOS: () => void;
  onEditOS: (os: OrdemDeServico) => void;
  onViewPDF: (os: OrdemDeServico) => void;
  onNavigate: (view: 'clientes' | 'equipamentos' | 'banco_servicos' | 'precificacao' | 'list' | 'company' | 'licensing' | 'configuracoes' | 'relatorios' | 'marketing') => void;
}

export default function DashboardHome({ 
  orders, 
  onNewOS, 
  onEditOS, 
  onViewPDF, 
  onNavigate 
}: DashboardHomeProps) {

  // Get last 5 orders
  const latestOrders = [...orders]
    .sort((a, b) => {
      const dateA = a.dataAbertura ? new Date(`${a.dataAbertura}T${a.horaAbertura || '00:00'}`) : new Date(0);
      const dateB = b.dataAbertura ? new Date(`${b.dataAbertura}T${b.horaAbertura || '00:00'}`) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'Concluído':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          text: 'Concluído',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        };
      case 'Pendente':
      default:
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          text: 'Pendente',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#003366] to-[#002244] text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-[#003366]/20 relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-2">
          <span className="bg-[#FF6600] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
            Painel Geral
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight pt-1">
            Gestão Integrada de Manutenção Automotiva
          </h2>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Bem-vindo ao centro de controle. Monitore seus atendimentos em tempo real, gerencie cadastros de clientes e automatize precificações de forma inteligente.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-[#FF6600]/10 to-transparent pointer-events-none hidden md:block"></div>
      </div>

      {/* Prominent Responsive Shortcut Grid (7 columns on large screens) */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-[#003366] tracking-widest uppercase pl-1">Atalhos de Módulos</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          
          {/* Nova OS */}
          <button
            onClick={() => onNavigate('list')}
            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#FF6600]/40 p-4 rounded-2xl text-left transition duration-200 group shadow-xs cursor-pointer focus:outline-none flex flex-col gap-4 justify-between min-h-[125px]"
          >
            <div className="p-2 bg-[#FF6600]/10 rounded-xl text-[#FF6600] w-fit group-hover:scale-105 transition duration-150">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-[#003366] group-hover:text-[#FF6600] transition">➕ Nova OS</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Abrir e gerenciar atendimentos</p>
            </div>
          </button>

          {/* Clientes */}
          <button
            onClick={() => onNavigate('clientes')}
            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#003366]/40 p-4 rounded-2xl text-left transition duration-200 group shadow-xs cursor-pointer focus:outline-none flex flex-col gap-4 justify-between min-h-[125px]"
          >
            <div className="p-2 bg-[#003366]/5 rounded-xl text-[#003366] w-fit group-hover:scale-105 transition duration-150">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-800 group-hover:text-[#003366] transition">👥 Clientes</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Fichas de clientes e contatos</p>
            </div>
          </button>

          {/* Equipamentos */}
          <button
            onClick={() => onNavigate('equipamentos')}
            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#003366]/40 p-4 rounded-2xl text-left transition duration-200 group shadow-xs cursor-pointer focus:outline-none flex flex-col gap-4 justify-between min-h-[125px]"
          >
            <div className="p-2 bg-[#003366]/5 rounded-xl text-[#003366] w-fit group-hover:scale-105 transition duration-150">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-800 group-hover:text-[#003366] transition">🚜 Equipamentos</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Cadastro de frotas e veículos</p>
            </div>
          </button>

          {/* Central de Precificação */}
          <button
            onClick={() => onNavigate('precificacao')}
            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#FF6600]/40 p-4 rounded-2xl text-left transition duration-200 group shadow-xs cursor-pointer focus:outline-none flex flex-col gap-4 justify-between min-h-[125px]"
          >
            <div className="p-2 bg-[#FF6600]/5 rounded-xl text-[#FF6600] w-fit group-hover:scale-105 transition duration-150">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-800 group-hover:text-[#FF6600] transition">💰 Precificação</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Markup, simuladores & margem</p>
            </div>
          </button>

          {/* Relatórios */}
          <button
            onClick={() => onNavigate('relatorios')}
            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#003366]/40 p-4 rounded-2xl text-left transition duration-200 group shadow-xs cursor-pointer focus:outline-none flex flex-col gap-4 justify-between min-h-[125px]"
          >
            <div className="p-2 bg-[#003366]/5 rounded-xl text-[#003366] w-fit group-hover:scale-105 transition duration-150">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-800 group-hover:text-[#003366] transition">📊 Relatórios</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Prontuário Inteligente do Equipamento</p>
            </div>
          </button>

          {/* Minha Empresa */}
          <button
            onClick={() => onNavigate('company')}
            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#003366]/40 p-4 rounded-2xl text-left transition duration-200 group shadow-xs cursor-pointer focus:outline-none flex flex-col gap-4 justify-between min-h-[125px]"
          >
            <div className="p-2 bg-[#003366]/5 rounded-xl text-[#003366] w-fit group-hover:scale-105 transition duration-150">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-800 group-hover:text-[#003366] transition">🏢 Minha Empresa</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Configurações corporativas & slogan</p>
            </div>
          </button>

          {/* Marketing (Temporary Button) */}
          <button
            onClick={() => onNavigate('marketing')}
            className="bg-[#FF6600]/5 hover:bg-[#FF6600]/10 border border-[#FF6600]/20 hover:border-[#FF6600]/40 p-4 rounded-2xl text-left transition duration-200 group shadow-xs cursor-pointer focus:outline-none flex flex-col gap-4 justify-between min-h-[125px]"
          >
            <div className="p-2 bg-[#FF6600]/10 rounded-xl text-[#FF6600] w-fit group-hover:scale-105 transition duration-150">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-800 group-hover:text-[#FF6600] transition">📣 Marketing</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Artes, landing page & catálogo</p>
            </div>
          </button>

        </div>
      </div>

      {/* Latest Orders List - Below the Shortcuts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-[#003366] tracking-widest uppercase pl-1">Últimos Atendimentos</h3>
          <button
            onClick={() => onNavigate('list')}
            className="text-[10px] font-black uppercase text-[#FF6600] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Histórico Completo</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {latestOrders.length > 0 ? (
            latestOrders.map(os => {
              const badge = getStatusStyle(os.status);
              return (
                <div 
                  key={os.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-slate-350 transition duration-200 shadow-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#003366]">
                        {os.numeroOS}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 leading-none ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.text}</span>
                      </span>
                    </div>
                    
                    <div className="truncate">
                      <h4 className="font-bold text-xs text-slate-800 leading-tight truncate">
                        {os.equipamento}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Placa: <span className="font-mono text-slate-700 font-bold tracking-wider">{os.placa}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <PenTool className="w-3 h-3 text-slate-400" />
                        <span>{os.tecnico}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatToBrazilianDate(os.dataAbertura)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onViewPDF(os)}
                      title="Ver Relatório PDF"
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#003366] rounded-full border border-slate-200 transition duration-150 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    {(!os.status || os.status === 'Pendente') && (
                      <button
                        onClick={() => onEditOS(os)}
                        title="Continuar Atendimento"
                        className="p-2.5 bg-[#FF6600]/10 hover:bg-[#FF6600]/20 text-[#FF6600] rounded-full transition duration-150 cursor-pointer"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-400 bg-white/50">
              <AlertCircle className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-500">Nenhuma ordem de serviço cadastrada.</p>
              <button
                onClick={onNewOS}
                className="text-[10px] uppercase font-bold text-[#FF6600] mt-1 hover:underline cursor-pointer"
              >
                Abrir Primeira OS
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
