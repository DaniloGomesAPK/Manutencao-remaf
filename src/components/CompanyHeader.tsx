/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useContext } from 'react';
import { Phone } from 'lucide-react';
import { EmpresaContext } from '../contexts/EmpresaContext';

export default function CompanyHeader() {
  const empresaCtx = useContext(EmpresaContext);
  const company = empresaCtx?.empresa;

  const isCompanyRegistered = company && company.nomeFantasia && company.nomeFantasia !== 'Sua Empresa';
  const headerTitle = isCompanyRegistered ? `Ordem de Serviço - ${company.nomeFantasia}` : 'Ordem de Serviço';

  return (
    <div id="company-smart-header" className="flex items-center gap-4 py-2">
      {/* Dynamic logo frame */}
      <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
        {company?.logomarca ? (
          <img 
            id="company-header-logo-preview"
            src={company.logomarca} 
            alt="Logo" 
            className="w-full h-full object-contain p-1"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 bg-[#FF6600] rounded-xs flex items-center justify-center font-bold text-xl text-white">
            {isCompanyRegistered ? company.nomeFantasia.charAt(0).toUpperCase() : 'O'}
          </div>
        )}
      </div>

      {/* Corporate Metadata details */}
      <div className="text-left">
        <h1 className="text-sm md:text-base font-black tracking-tight text-[#003366] uppercase leading-tight">
          {headerTitle}
        </h1>
        
        {isCompanyRegistered ? (
          <p className="text-[9px] text-[#FF6600] font-black uppercase tracking-wider hidden sm:flex items-center gap-2">
            <span>{company.razaoSocial}</span>
            <span className="opacity-40">•</span>
            <span>CNPJ: {company.cnpj}</span>
            <span className="opacity-40">•</span>
            <span className="flex items-center gap-0.5">
              <Phone className="w-2.5 h-2.5" /> {company.whatsapp || company.telefone}
            </span>
          </p>
        ) : (
          <p className="text-[9px] text-[#FF6600] font-bold uppercase tracking-wider hidden sm:block">
            Controle de Ordens de Serviço
          </p>
        )}
      </div>
    </div>
  );
}
