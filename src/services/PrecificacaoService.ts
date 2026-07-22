/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Precificacao } from '../types';
import { FirestoreRepository } from './FirestoreRepository';

export const PrecificacaoService = {
  /**
   * Obtém todas as precificações de um inquilino (empresaId) via FirestoreRepository
   */
  async getPrecificacoes(empresaId: string, userEmail?: string): Promise<Precificacao[]> {
    return FirestoreRepository.getAll<Precificacao>('precificacao', empresaId, userEmail);
  },

  /**
   * Salva uma precificação no Firestore e LocalStorage via FirestoreRepository
   */
  async savePrecificacao(data: Precificacao, userEmail?: string): Promise<Precificacao> {
    const timestamp = new Date().toISOString();
    const id = data.id || 'prc_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    
    const precificacao: Precificacao = {
      ...data,
      id,
      createdAt: data.createdAt || timestamp,
      updatedAt: timestamp,
    };

    const saved = await FirestoreRepository.add<Precificacao>('precificacao', precificacao, precificacao.empresaId, userEmail);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('precificacoes_updated', { detail: { empresaId: precificacao.empresaId } }));
    }

    return saved;
  },

  /**
   * Escuta em tempo real as atualizações de precificação
   */
  listenPrecificacoes(empresaId: string, callback: (precificacoes: Precificacao[]) => void, userEmail?: string) {
    return FirestoreRepository.listen<Precificacao>('precificacao', empresaId, callback, [], userEmail);
  },

  /**
   * Calcula valores totais de insumos, mão de obra, impostos, markup e margem de uma precificação
   */
  calcularValores(precificacao: Partial<Precificacao>) {
    const materiais = precificacao.materiais || [];
    const custoTotalMateriais = materiais.reduce((acc, m) => acc + (m.custoTotal || (m.quantidade * m.custoUnitario) || 0), 0);
    const custoTotalMaoDeObra = (precificacao.tempoMedioExecucao || 0) * (precificacao.valorHora || 0);
    const custoTotalFixos = precificacao.custosFixos || 0;
    
    const custoBase = custoTotalMateriais + custoTotalMaoDeObra + custoTotalFixos;
    const aliquotaImposto = (precificacao.impostos || 0) / 100;
    const margem = (precificacao.margemUtilizada || 0) / 100;

    const divisorMarkup = 1 - (aliquotaImposto + margem);
    const markup = divisorMarkup > 0 ? 1 / divisorMarkup : 1.5;

    const precoRecomendado = custoBase * markup;
    const precoMinimo = precoRecomendado * 0.9;
    const precoPremium = precoRecomendado * 1.2;
    const custoTotalImpostos = precoRecomendado * aliquotaImposto;
    const lucroEsperado = precoRecomendado * margem;

    return {
      custoTotalMateriais,
      custoTotalMaoDeObra,
      custoTotalFixos,
      custoBase,
      custoTotalSemImpostos: custoBase,
      markup,
      markupFinal: markup,
      precoMinimo,
      precoRecomendado,
      precoPremium,
      custoTotalImpostos,
      lucroEsperado,
      lucroEsperadoRecomendado: lucroEsperado,
    };
  },

  /**
   * Exclui uma precificação via FirestoreRepository
   */
  async deletePrecificacao(id: string, empresaId: string, userEmail?: string): Promise<void> {
    await FirestoreRepository.delete('precificacao', id, empresaId, userEmail);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('precificacoes_updated', { detail: { empresaId } }));
    }
  }
};
