/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEmpresa } from '../contexts/EmpresaContext';
import { toPlural } from '../config/perfis';
import { Plus, Users, Car, Calculator, FileText, Building2, ClipboardList } from 'lucide-react';
import ControleOrdensResumo from './ControleOrdensResumo';
import type { ControleOrdemStore } from './ControleOrdens';

interface DashboardHomeProps {
  onNavigate: (view: 'clientes' | 'equipamentos' | 'banco_servicos' | 'precificacao' | 'list' | 'controle_ordens' | 'company' | 'licensing' | 'configuracoes' | 'relatorios') => void;
  empresaId: string;
  userEmail?: string;
  controleStore: ControleOrdemStore;
  companyName?: string;
}

export default function DashboardHome({ onNavigate, empresaId, userEmail, controleStore, companyName }: DashboardHomeProps) {
  const { perfilConfig, empresa } = useEmpresa();
  const labels = perfilConfig.labels;

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#003366] to-[#002244] text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-[#003366]/20 relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-2">
          <span className="bg-[#FF6600] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
            Painel Geral
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight pt-1">
            Gestão Integrada em Orçamentos
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
              <h4 className="font-extrabold text-xs text-[#003366] group-hover:text-[#FF6600] transition">➕ Nova {labels.ordemServico.includes('/') ? labels.ordemServico.split('/')[0].trim() : labels.ordemServico}</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Abrir e gerenciar atendimentos</p>
            </div>
          </button>

          {/* Controle de ordens */}
          <button
            onClick={() => onNavigate('controle_ordens')}
            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#003366]/40 p-4 rounded-2xl text-left transition duration-200 group shadow-xs cursor-pointer focus:outline-none flex flex-col gap-4 justify-between min-h-[125px]"
          >
            <div className="p-2 bg-[#003366]/5 rounded-xl text-[#003366] w-fit group-hover:scale-105 transition duration-150">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-[#003366] group-hover:text-[#FF6600] transition">Controle de ordens</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Acompanhar orçamentos</p>
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
              <h4 className="font-extrabold text-xs text-slate-800 group-hover:text-[#003366] transition">👥 {toPlural(labels.cliente)}</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Fichas de {toPlural(labels.cliente.toLowerCase())} e contatos</p>
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
              <h4 className="font-extrabold text-xs text-slate-800 group-hover:text-[#003366] transition">🚜 {toPlural(labels.equipamento)}</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Cadastro de {toPlural(labels.equipamento.toLowerCase())}</p>
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
              <p className="text-[9px] text-slate-400 mt-0.5">Prontuário Inteligente do {labels.equipamento}</p>
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

        </div>
      </div>

      <ControleOrdensResumo
        empresaId={empresaId}
        userEmail={userEmail}
        store={controleStore}
        companyName={companyName || empresa?.nomeFantasia?.trim() || empresa?.razaoSocial?.trim()}
        onOpen={() => onNavigate('controle_ordens')}
      />

    </div>
  );
}
