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

  const companyName = (company?.nomeFantasia || company?.razaoSocial || '').trim();
  const isCompanyRegistered = Boolean(companyName && companyName !== 'Sua Empresa');

  return (
    <div id="company-smart-header" className="flex items-center gap-2.5 sm:gap-3.5 py-1 min-w-0">
      {/* Dynamic logo frame */}
      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
        {company?.logomarca ? (
          <img 
            id="company-header-logo-preview"
            src={company.logomarca} 
            alt="Logo" 
            className="w-full h-full object-contain p-1"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#FF6600] rounded-lg flex items-center justify-center font-bold text-base sm:text-xl text-white">
            {isCompanyRegistered ? companyName.charAt(0).toUpperCase() : 'O'}
          </div>
        )}
      </div>

      {/* Corporate Metadata details */}
      <div className="text-left min-w-0 flex-1">
        <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-[#003366] uppercase leading-tight truncate">
          ORDEM DE SERVIÇO
          {isCompanyRegistered && (
            <span className="hidden md:inline font-bold text-slate-600"> - {companyName}</span>
          )}
        </h1>
        
        {isCompanyRegistered ? (
          <p className="text-[9px] text-[#FF6600] font-black uppercase tracking-wider truncate flex items-center gap-1.5">
            <span className="truncate">{companyName}</span>
            {company.whatsapp && (
              <>
                <span className="opacity-40 hidden sm:inline">•</span>
                <span className="hidden sm:flex items-center gap-0.5">
                  <Phone className="w-2.5 h-2.5" /> {company.whatsapp}
                </span>
              </>
            )}
          </p>
        ) : (
          <p className="text-[9px] text-[#FF6600] font-bold uppercase tracking-wider truncate">
            Gestão Integrada
          </p>
        )}
      </div>
    </div>
  );
}
