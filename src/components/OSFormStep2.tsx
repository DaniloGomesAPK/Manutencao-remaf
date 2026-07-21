/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, FileText, Camera } from 'lucide-react';
import { OrdemDeServico } from '../types';
import ImageCaptureGallery from './ImageCaptureGallery';

interface OSFormStep2Props {
  initialData: Partial<OrdemDeServico>;
  onNext: (data: Partial<OrdemDeServico>) => void;
  onBack: () => void;
  onCancel?: () => void;
  onSaveDraftAndPDF?: (data: Partial<OrdemDeServico>) => void;
  isSavingDraft?: boolean;
}

export default function OSFormStep2({ initialData, onNext, onBack, onCancel, onSaveDraftAndPDF, isSavingDraft = false }: OSFormStep2Props) {
  const [fotosAntes, setFotosAntes] = useState<string[]>(initialData.fotosAntes || []);
  const [fotosAntesDescricoes, setFotosAntesDescricoes] = useState<string[]>(initialData.fotosAntesDescricoes || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (fotosAntes.length === 0) {
      alert("Aviso: É altamente recomendável tirar pelo menos uma foto de antes da manutenção para fins de auditoria.");
    }
    
    onNext({
      fotosAntes,
      fotosAntesDescricoes,
    });
  };

  const handleGeneratePDFAntes = () => {
    if (onSaveDraftAndPDF) {
      onSaveDraftAndPDF({
        fotosAntes,
        fotosAntesDescricoes,
      });
    }
  };

  return (
    <form id="step-2-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Dynamic Summary Panel */}
      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Equipamento:</span>
          <span className="font-bold text-slate-800 text-sm">{initialData.equipamento}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Placa:</span>
          <span className="font-bold text-slate-800 font-mono text-sm uppercase">{initialData.placa || 'Sem placa'}</span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Protocolo:</span>
          <span className="font-bold text-[#003366] font-mono text-sm">{initialData.numeroOS}</span>
        </div>
      </div>

      {/* Info warning */}
      <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex gap-3">
        <Camera className="w-5 h-5 text-amber-600 shrink-0 self-center" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-amber-800 block uppercase tracking-wider text-[11px] mb-0.5">Registro Fotográfico Inicial</span>
          Registre fotos detalhadas do estado do equipamento antes da realização dos serviços. Você pode usar a câmera do dispositivo ou fazer o upload de arquivos da galeria.
        </div>
      </div>

      {/* Image Captures Standard Before */}
      <div className="bg-slate-50/30 rounded-xl p-5 border border-slate-200 shadow-xs">
        <ImageCaptureGallery
          label="Fotos Antes da Manutenção"
          photos={fotosAntes}
          onChange={setFotosAntes}
          descriptions={fotosAntesDescricoes}
          onChangeDescriptions={setFotosAntesDescricoes}
        />
      </div>

      {/* Actions and navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6">
        {onCancel && (
          <button
            id="btn-cancel-step-2"
            type="button"
            disabled={isSavingDraft}
            onClick={() => onCancel()}
            className="w-full sm:w-1/4 border-2 border-rose-200 text-rose-600 bg-transparent rounded-full py-3.5 font-bold tracking-widest text-[10px] uppercase hover:bg-rose-50 active:scale-98 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>Cancelar</span>
          </button>
        )}

        <button
          id="btn-back-step-2"
          type="button"
          disabled={isSavingDraft}
          onClick={onBack}
          className="w-full sm:w-1/4 border-2 border-slate-200 text-slate-500 bg-transparent rounded-full py-3.5 font-bold tracking-widest text-[10px] uppercase hover:bg-slate-50 active:scale-98 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Voltar</span>
        </button>

        <button
          id="btn-generate-pdf-antes"
          type="button"
          disabled={isSavingDraft}
          onClick={handleGeneratePDFAntes}
          className="w-full sm:w-2/5 border-2 border-[#003366] text-[#003366] bg-white rounded-full py-3.5 px-3 font-bold tracking-widest text-[10px] uppercase hover:bg-[#003366]/5 active:scale-98 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          {isSavingDraft ? (
            <div className="w-4 h-4 border-2 border-[#003366] border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FileText className="w-4 h-4 text-[#003366]" />
          )}
          <span>{isSavingDraft ? 'Salvando...' : 'Gerar PDF (Antes)'}</span>
        </button>

        <button
          id="btn-next-step-2"
          type="submit"
          disabled={isSavingDraft}
          className="w-full sm:w-2/5 bg-[#FF6600] text-white rounded-full py-3.5 px-6 font-bold tracking-[0.12em] text-[10px] uppercase shadow-lg shadow-[#FF6600]/25 hover:bg-[#E05500] active:scale-[0.99] flex items-center justify-center gap-2 transition duration-200 cursor-pointer disabled:opacity-50"
        >
          <span>Salvar e Continuar</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </div>
    </form>
  );
}
