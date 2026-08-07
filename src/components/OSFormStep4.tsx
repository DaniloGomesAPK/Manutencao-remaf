/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, FileText, Camera, Save } from 'lucide-react';
import { OrdemDeServico } from '../types';
import ImageCaptureGallery from './ImageCaptureGallery';
import { UIButton } from './ui/UIComponents';

interface OSFormStep4Props {
  initialData: Partial<OrdemDeServico>;
  onNext: (data: Partial<OrdemDeServico>) => void;
  onBack: () => void;
  onCancel?: () => void;
  onSaveDraftAndPDF?: (data: Partial<OrdemDeServico>) => void;
  isSavingDraft?: boolean;
  onSaveProgress?: (data: Partial<OrdemDeServico>) => void;
}

export default function OSFormStep4({ initialData, onNext, onBack, onCancel, onSaveDraftAndPDF, isSavingDraft = false, onSaveProgress }: OSFormStep4Props) {
  const [fotosDepois, setFotosDepois] = useState<string[]>(initialData.fotosDepois || []);
  const [fotosDepoisDescricoes, setFotosDepoisDescricoes] = useState<string[]>(initialData.fotosDepoisDescricoes || []);

  const getCurrentStep4Data = (): Partial<OrdemDeServico> => {
    return {
      fotosDepois,
      fotosDepoisDescricoes,
      faseAtual: 4,
    };
  };

  const handleSaveClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onSaveProgress) {
      onSaveProgress(getCurrentStep4Data());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (fotosDepois.length === 0) {
      alert("Aviso: É altamente recomendável tirar pelo menos uma foto de depois da manutenção para fins de comprovação da qualidade do serviço.");
    }
    
    onNext({
      fotosDepois,
      fotosDepoisDescricoes,
    });
  };

  const handleGeneratePDFDepois = () => {
    if (onSaveDraftAndPDF) {
      onSaveDraftAndPDF({
        fotosDepois,
        fotosDepoisDescricoes,
      });
    }
  };

  return (
    <form id="step-4-form" onSubmit={handleSubmit} className="space-y-6">
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
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex gap-3">
        <Camera className="w-5 h-5 text-emerald-600 shrink-0 self-center" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-emerald-800 block uppercase tracking-wider text-[11px] mb-0.5">Registro Fotográfico Final</span>
          Registre fotos detalhadas do estado do equipamento após a realização de todos os reparos e serviços. Isso comprova a execução de excelência para seu cliente.
        </div>
      </div>

      {/* Image Captures Standard After */}
      <div className="bg-slate-50/30 rounded-xl p-5 border border-slate-200 shadow-xs">
        <ImageCaptureGallery
          label="Fotos Depois"
          photos={fotosDepois}
          onChange={setFotosDepois}
          descriptions={fotosDepoisDescricoes}
          onChangeDescriptions={setFotosDepoisDescricoes}
        />
      </div>

      {/* Actions and navigation buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 pt-6 border-t border-slate-200">
        {onCancel && (
          <button
            id="btn-cancel-step-4"
            type="button"
            disabled={isSavingDraft}
            onClick={() => onCancel()}
            className="w-full sm:w-auto px-4 border border-rose-200 text-rose-600 bg-transparent rounded-xl py-2.5 font-bold tracking-wider text-xs uppercase hover:bg-rose-50 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>Cancelar</span>
          </button>
        )}

        <button
          id="btn-back-step-4"
          type="button"
          disabled={isSavingDraft}
          onClick={onBack}
          className="w-full sm:w-auto px-4 border border-slate-200 text-slate-600 bg-transparent rounded-xl py-2.5 font-bold tracking-wider text-xs uppercase hover:bg-slate-50 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Voltar</span>
        </button>

        <div className="flex-1 hidden sm:block"></div>

        {onSaveProgress && (
          <UIButton
            type="button"
            variant="secondary"
            size="md"
            icon={Save}
            loading={isSavingDraft}
            onClick={handleSaveClick}
            id="btn-save-progress-step4"
            className="w-full sm:w-auto font-bold uppercase tracking-wider text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {isSavingDraft ? 'Salvando...' : 'Salvar'}
          </UIButton>
        )}

        <button
          id="btn-generate-pdf-depois"
          type="button"
          disabled={isSavingDraft}
          onClick={handleGeneratePDFDepois}
          className="w-full sm:w-auto border border-[#003366] text-[#003366] bg-white rounded-xl py-2.5 px-4 font-bold tracking-wider text-xs uppercase hover:bg-[#003366]/5 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
        >
          {isSavingDraft ? (
            <div className="w-4 h-4 border-2 border-[#003366] border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FileText className="w-4 h-4 text-[#003366]" />
          )}
          <span>{isSavingDraft ? 'Salvando...' : 'Gerar PDF (Depois)'}</span>
        </button>

        <button
          id="btn-next-step-4"
          type="submit"
          disabled={isSavingDraft}
          className="w-full sm:w-auto bg-[#FF6600] text-white rounded-xl py-2.5 px-5 font-bold tracking-wider text-xs uppercase shadow-md hover:bg-[#E05500] flex items-center justify-center gap-2 transition duration-200 cursor-pointer disabled:opacity-50"
        >
          <span>Salvar e Continuar</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </div>
    </form>
  );
}
