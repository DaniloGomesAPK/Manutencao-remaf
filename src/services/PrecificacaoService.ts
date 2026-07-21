/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Precificacao, Insumo } from '../types';
import { openDB, PRECIFICACOES_STORE_NAME } from '../db';

const LOCAL_STORAGE_PREFIX = 'remaf_precificacao_';

export const PrecificacaoService = {
  /**
   * Obtém todas as precificações de um inquilino (empresaId)
   */
  async getPrecificacoes(empresaId: string): Promise<Precificacao[]> {
    try {
      const db = await openDB();
      const list = await new Promise<Precificacao[]>((resolve, reject) => {
        const transaction = db.transaction(PRECIFICACOES_STORE_NAME, 'readonly');
        const store = transaction.objectStore(PRECIFICACOES_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Filtra por empresaId
      const tenantList = list.filter(p => p.empresaId === empresaId);

      // Cache em localStorage
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}list_${empresaId}`, JSON.stringify(tenantList));
      } catch (_) {}

      return tenantList;
    } catch (err) {
      console.warn('Erro ao ler precificações do IndexedDB, tentando localStorage:', err);
      try {
        const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}list_${empresaId}`);
        if (cached) {
          return JSON.parse(cached) as Precificacao[];
        }
      } catch (_) {}
      return [];
    }
  },

  /**
   * Salva uma precificação (memória de cálculo)
   */
  async savePrecificacao(data: Precificacao): Promise<Precificacao> {
    const timestamp = new Date().toISOString();
    const id = data.id || 'prc_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    
    const precificacao: Precificacao = {
      ...data,
      id,
      createdAt: data.createdAt || timestamp
    };

    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(PRECIFICACOES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(PRECIFICACOES_STORE_NAME);
        const request = store.put(precificacao);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Recarrega e atualiza o cache do LocalStorage em background
      await this.getPrecificacoes(precificacao.empresaId);

      // Despacha evento de atualização
      window.dispatchEvent(new CustomEvent('precificacoes_updated', { detail: { empresaId: precificacao.empresaId } }));
    } catch (error) {
      console.error('Erro ao salvar precificação no IndexedDB:', error);
      throw error;
    }

    return precificacao;
  },

  /**
   * Exclui uma precificação
   */
  async deletePrecificacao(id: string, empresaId: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(PRECIFICACOES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(PRECIFICACOES_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      await this.getPrecificacoes(empresaId);

      window.dispatchEvent(new CustomEvent('precificacoes_updated', { detail: { empresaId } }));
    } catch (error) {
      console.error('Erro ao excluir precificação no IndexedDB:', error);
      throw error;
    }
  },

  /**
   * Realiza o cálculo de precificação de forma pura e profissional
   */
  calcularValores(params: {
    materiais: Insumo[];
    tempoMedioExecucao: number; // horas
    valorHora: number;
    custosFixos: number; // valor absoluto
    impostos: number; // % de 0 a 100
    margemUtilizada: number; // % de 0 a 100
  }) {
    const { materiais, tempoMedioExecucao, valorHora, custosFixos, impostos, margemUtilizada } = params;

    // 1. Custo total dos materiais
    const custoTotalMateriais = materiais.reduce((sum, item) => sum + (item.custoTotal || 0), 0);

    // 2. Custo total de mão de obra
    const custoTotalMaoDeObra = tempoMedioExecucao * valorHora;

    // 3. Custos Fixos totais para este serviço
    const custoTotalFixos = custosFixos;

    // Custo Base Direto + Indireto Fixo
    const custoTotalSemImpostos = custoTotalMateriais + custoTotalMaoDeObra + custoTotalFixos;

    // 4. Markup Pricing Formula
    // Preço = Custo / (1 - (Impostos% + Margem%) / 100)
    // Markup = 1 / (1 - (Impostos% + Margem%) / 100)
    const obterMarkup = (imp: number, marg: number): number => {
      const somaDeducoes = (imp + marg) / 100;
      if (somaDeducoes >= 1) {
        // Evita divisão por zero ou negativa (segurança matemática)
        return 1 / (1 - 0.95); // 20.0x
      }
      return 1 / (1 - somaDeducoes);
    };

    // Preço Mínimo (Apenas cobre os custos e impostos, Margem = 0%)
    const markupMinimo = obterMarkup(impostos, 0);
    const precoMinimo = custoTotalSemImpostos * markupMinimo;
    const custoTotalImpostosMinimo = precoMinimo * (impostos / 100);

    // Preço Recomendado (Margem Padrão ou Margem Selecionada)
    const markupRecomendado = obterMarkup(impostos, margemUtilizada);
    const precoRecomendado = custoTotalSemImpostos * markupRecomendado;
    const custoTotalImpostosRecomendado = precoRecomendado * (impostos / 100);
    const lucroEsperadoRecomendado = precoRecomendado * (margemUtilizada / 100);

    // Preço Premium (Margem Padrão de 40% ou Margem Padrão Premium)
    const margemPremium = 40;
    const markupPremium = obterMarkup(impostos, margemPremium);
    const precoPremium = custoTotalSemImpostos * markupPremium;
    const custoTotalImpostosPremium = precoPremium * (impostos / 100);
    const lucroEsperadoPremium = precoPremium * (margemPremium / 100);

    // Valores específicos para a margem selecionada
    const markupFinal = obterMarkup(impostos, margemUtilizada);
    const precoCalculado = custoTotalSemImpostos * markupFinal;
    const lucroEsperado = precoCalculado * (margemUtilizada / 100);
    const custoTotalImpostos = precoCalculado * (impostos / 100);

    return {
      custoTotalMateriais,
      custoTotalMaoDeObra,
      custoTotalFixos,
      custoTotalSemImpostos,
      
      precoMinimo,
      custoTotalImpostosMinimo,
      markupMinimo,

      precoRecomendado,
      custoTotalImpostosRecomendado,
      lucroEsperadoRecomendado,
      markupRecomendado,

      precoPremium,
      custoTotalImpostosPremium,
      lucroEsperadoPremium,
      markupPremium,

      precoCalculado,
      lucroEsperado,
      custoTotalImpostos,
      markupFinal
    };
  }
};
