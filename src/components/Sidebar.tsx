/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Plus, 
  Clipboard, 
  Users, 
  Car, 
  Layers, 
  Calculator, 
  Building2, 
  ShieldCheck, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X,
  Sparkles,
  LogOut,
  BarChart2
} from 'lucide-react';

interface SidebarProps {
  activeSubView: 'dashboard' | 'list' | 'clientes' | 'equipamentos' | 'banco_servicos' | 'precificacao' | 'company' | 'licensing' | 'configuracoes' | 'relatorios' | 'marketing';
  setActiveSubView: (view: any) => void;
  onNewOS: () => void;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
  onLogout: () => void;
  activeUser: any;
}

export default function Sidebar({
  activeSubView,
  setActiveSubView,
  onNewOS,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  onLogout,
  activeUser
}: SidebarProps) {
  
  // Local state to keep track of expanded menu sections on sidebar
  const [expandedSections, setExpandedSections] = useState({
    atendimentos: true,
    cadastros: true,
    empresa: true
  });

  const toggleSection = (section: 'atendimentos' | 'cadastros' | 'empresa') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSubMenuClick = (view: any) => {
    setActiveSubView(view);
    setMobileOpen(false); // close drawer on mobile after clicking
  };

  const handleNewOSClick = () => {
    onNewOS();
    setMobileOpen(false);
  };

  const menuContent = (
    <div className="flex flex-col h-full bg-[#001f3f] text-slate-200 select-none">
      
      {/* Brand logo header */}
      <div className={`p-5 flex items-center justify-between border-b border-slate-800/40 shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF6600] rounded-lg flex items-center justify-center font-black text-lg text-white shadow-sm shrink-0">
              DG
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-white font-black text-sm tracking-tight">DG GESTÃO</span>
              <span className="text-[9px] text-[#FF6600] font-black uppercase tracking-wider mt-0.5">SaaS Automotivo</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-[#FF6600] rounded-lg flex items-center justify-center font-black text-lg text-white shadow-sm shrink-0">
            DG
          </div>
        )}

        {/* Desktop collapse button */}
        {!collapsed && (
          <button 
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800/40 transition cursor-pointer hidden md:block"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation scrollable items list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
        
        {/* 1. Dashboard Block Link */}
        <button
          type="button"
          onClick={() => handleSubMenuClick('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
            activeSubView === 'dashboard'
              ? 'bg-[#FF6600] text-white shadow-md shadow-[#FF6600]/15'
              : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
          } ${collapsed ? 'justify-center' : 'text-left'}`}
          title="Dashboard"
        >
          <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </button>

        {/* 2. ATENDIMENTOS SECTION */}
        <div className="space-y-1">
          {!collapsed ? (
            <div className="px-3 py-1 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Atendimentos</span>
            </div>
          ) : (
            <div className="h-px bg-slate-800/40 my-3 mx-2" />
          )}

          <div className="space-y-0.5">
            {/* Submenu: Nova Ordem de Serviço */}
            <button
              type="button"
              onClick={handleNewOSClick}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-slate-400 hover:bg-slate-800/30 hover:text-white ${collapsed ? 'justify-center' : 'text-left'}`}
              title="Nova Ordem de Serviço"
            >
              <Plus className="w-4.5 h-4.5 text-[#FF6600] shrink-0" />
              {!collapsed && <span className="font-bold">Nova OS</span>}
            </button>

            {/* Submenu: Histórico das Ordens de Serviço */}
            <button
              type="button"
              onClick={() => handleSubMenuClick('list')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeSubView === 'list'
                  ? 'bg-slate-800/65 text-white font-bold border-l-2 border-[#FF6600]'
                  : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
              } ${collapsed ? 'justify-center' : 'text-left'}`}
              title="Histórico de OS"
            >
              <ClipboardCheck className="w-4.5 h-4.5 text-[#00E5FF] shrink-0" />
              {!collapsed && <span>Histórico de OS</span>}
            </button>
          </div>
        </div>

        {/* 3. CADASTROS SECTION */}
        <div className="space-y-1">
          {!collapsed ? (
            <div className="px-3 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Cadastros</span>
            </div>
          ) : (
            <div className="h-px bg-slate-800/40 my-3 mx-2" />
          )}

          <div className="space-y-0.5">
            {/* Submenu: Clientes */}
            <button
              type="button"
              onClick={() => handleSubMenuClick('clientes')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeSubView === 'clientes'
                  ? 'bg-slate-800/65 text-white font-bold border-l-2 border-[#FF6600]'
                  : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
              } ${collapsed ? 'justify-center' : 'text-left'}`}
              title="Clientes"
            >
              <Users className="w-4.5 h-4.5 text-blue-400 shrink-0" />
              {!collapsed && <span>Clientes</span>}
            </button>

            {/* Submenu: Equipamentos */}
            <button
              type="button"
              onClick={() => handleSubMenuClick('equipamentos')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeSubView === 'equipamentos'
                  ? 'bg-slate-800/65 text-white font-bold border-l-2 border-[#FF6600]'
                  : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
              } ${collapsed ? 'justify-center' : 'text-left'}`}
              title="Equipamentos"
            >
              <Car className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
              {!collapsed && <span>Equipamentos</span>}
            </button>


            {/* Submenu: Central de Precificação */}
            <button
              type="button"
              onClick={() => handleSubMenuClick('precificacao')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeSubView === 'precificacao'
                  ? 'bg-slate-800/65 text-white font-bold border-l-2 border-[#FF6600]'
                  : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
              } ${collapsed ? 'justify-center' : 'text-left'}`}
              title="Central de Precificação"
            >
              <Calculator className="w-4.5 h-4.5 text-amber-400 shrink-0" />
              {!collapsed && <span>Central de Precificação</span>}
            </button>
          </div>
        </div>

        {/* 4. EMPRESA SECTION */}
        <div className="space-y-1">
          {!collapsed ? (
            <div className="px-3 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Empresa</span>
            </div>
          ) : (
            <div className="h-px bg-slate-800/40 my-3 mx-2" />
          )}

          <div className="space-y-0.5">
            {/* Submenu: Prontuário Inteligente */}
            <button
              type="button"
              onClick={() => handleSubMenuClick('relatorios')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeSubView === 'relatorios'
                  ? 'bg-slate-800/65 text-white font-bold border-l-2 border-[#FF6600]'
                  : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
              } ${collapsed ? 'justify-center' : 'text-left'}`}
              title="Relatórios"
            >
              <BarChart2 className="w-4.5 h-4.5 text-[#FF6600] shrink-0" />
              {!collapsed && <span>Relatórios</span>}
            </button>

            {/* Submenu: Divulgação / Marketing */}
            <button
              type="button"
              onClick={() => handleSubMenuClick('marketing')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeSubView === 'marketing'
                  ? 'bg-slate-800/65 text-white font-bold border-l-2 border-[#FF6600]'
                  : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
              } ${collapsed ? 'justify-center' : 'text-left'}`}
              title="Marketing & Divulgação"
            >
              <Sparkles className="w-4.5 h-4.5 text-amber-400 shrink-0" />
              {!collapsed && <span>Divulgação</span>}
            </button>

            {/* Submenu: Licenciamento */}
            <button
              type="button"
              onClick={() => handleSubMenuClick('licensing')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeSubView === 'licensing'
                  ? 'bg-slate-800/65 text-white font-bold border-l-2 border-[#FF6600]'
                  : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
              } ${collapsed ? 'justify-center' : 'text-left'}`}
              title="Licenciamento"
            >
              <ShieldCheck className="w-4.5 h-4.5 text-purple-400 shrink-0" />
              {!collapsed && <span>Licenciamento</span>}
            </button>

            {/* Submenu: Minha Empresa */}
            <button
              type="button"
              onClick={() => handleSubMenuClick('company')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeSubView === 'company'
                  ? 'bg-slate-800/65 text-white font-bold border-l-2 border-[#FF6600]'
                  : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
              } ${collapsed ? 'justify-center' : 'text-left'}`}
              title="Minha Empresa"
            >
              <Building2 className="w-4.5 h-4.5 text-slate-300 shrink-0" />
              {!collapsed && <span>Minha Empresa</span>}
            </button>
          </div>
        </div>

        {/* 5. CONFIGURAÇÕES SECTION */}
        <div className="space-y-1">
          {!collapsed ? (
            <div className="px-3 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Opções</span>
            </div>
          ) : (
            <div className="h-px bg-slate-800/40 my-3 mx-2" />
          )}

          <button
            type="button"
            onClick={() => handleSubMenuClick('configuracoes')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeSubView === 'configuracoes'
                ? 'bg-slate-800/65 text-white font-bold border-l-2 border-[#FF6600]'
                : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
            } ${collapsed ? 'justify-center' : 'text-left'}`}
            title="Configurações"
          >
            <Settings className="w-4.5 h-4.5 shrink-0 text-slate-400" />
            {!collapsed && <span>Configurações</span>}
          </button>
        </div>

      </div>

      {/* Sidebar Footer details / user block */}
      <div className="p-4 border-t border-slate-800/40 bg-slate-950/20 shrink-0">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FF6600] rounded-full flex items-center justify-center text-white text-[10px] uppercase font-bold tracking-widest shrink-0">
                {activeUser?.nome ? activeUser.nome.substring(0, 2) : 'OP'}
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-black text-white truncate">{activeUser?.nome || 'Operador'}</p>
                <p className="text-[9px] text-slate-400 truncate">{activeUser?.email || 'saas@oficina.com'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-850 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-slate-800/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair do Sistema</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition cursor-pointer"
              title="Expandir Menu"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </div>

    </div>
  );

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside 
        className={`hidden md:block h-screen sticky top-0 shrink-0 border-r border-slate-800/20 transition-all duration-300 z-30 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {menuContent}
      </aside>

      {/* Drawer Overlay for Mobile (Active only when mobileOpen is true) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden animate-fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#001f3f] border-r border-slate-800/30 h-full animate-slide-in-left duration-250 z-50">
            {/* Mobile close button in drawer */}
            <div className="absolute top-4 right-4 z-55">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 bg-slate-900/40 hover:bg-slate-950/50 text-slate-300 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {menuContent}
          </div>
        </div>
      )}
    </>
  );
}
