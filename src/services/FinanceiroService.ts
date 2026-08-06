/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LancamentoFinanceiro } from '../types';
import { FirestoreRepository } from './FirestoreRepository';
import { IntegridadeService } from './IntegridadeService';
import { RecuperacaoService } from './RecuperacaoService';

export const FinanceiroService = {
  /**
   * Obtém todos os lançamentos financeiros do inquilino (Contas a Receber e Contas a Pagar) via FirestoreRepository
   */
  async getLancamentos(empresaId: string, userEmail?: string): Promise<LancamentoFinanceiro[]> {
    return FirestoreRepository.getAll<LancamentoFinanceiro>('financeiro', empresaId, userEmail);
  },

  /**
   * Salva ou atualiza um lançamento financeiro via FirestoreRepository após validação de referências
   */
  async saveLancamento(data: LancamentoFinanceiro, userEmail?: string): Promise<LancamentoFinanceiro> {
    const timestamp = new Date().toISOString();
    const id = data.id || 'fin_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

    const lancamento: LancamentoFinanceiro = {
      ...data,
      id,
      createdAt: data.createdAt || timestamp,
      updatedAt: timestamp,
    };

    // Validação de referências (clienteId, osId)
    const refValidation = await IntegridadeService.validateFinanceiroReferences(lancamento, lancamento.empresaId, userEmail);
    if (!refValidation.valid) {
      throw new Error(refValidation.message || 'Lançamento possui referências inválidas.');
    }

    const saved = await FirestoreRepository.add<LancamentoFinanceiro>('financeiro', lancamento, data.empresaId, userEmail);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('financeiro_updated', { detail: { empresaId: data.empresaId } }));
    }

    return saved;
  },

  /**
   * Exclui um lançamento financeiro via RecuperacaoService (Soft Delete)
   */
  async deleteLancamento(id: string, empresaId: string, userEmail?: string): Promise<void> {
    const lanc = await FirestoreRepository.get<LancamentoFinanceiro>('financeiro', id, empresaId, userEmail);
    const desc = lanc?.descricao || 'Lançamento Financeiro';
    const ident = `R$ ${(lanc?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${lanc?.tipo || 'financeiro'})`;

    await RecuperacaoService.softDeleteRecord('financeiro', id, 'Financeiro', desc, ident, empresaId, userEmail, lanc);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('financeiro_updated', { detail: { empresaId } }));
    }
  },

  /**
   * Escuta em tempo real atualizações lançamentos financeiros
   */
  listenLancamentos(empresaId: string, callback: (lancamentos: LancamentoFinanceiro[]) => void, userEmail?: string) {
    return FirestoreRepository.listen<LancamentoFinanceiro>('financeiro', empresaId, callback, [], userEmail);
  },

  /**
   * Calcula resumo consolidado de receitas, despesas, valores pendentes e saldo
   */
  async getResumoFinanceiro(empresaId: string, userEmail?: string) {
    const lancamentos = await this.getLancamentos(empresaId, userEmail);

    let totalReceberPendente = 0;
    let totalRecebido = 0;
    let totalPagarPendente = 0;
    let totalPago = 0;

    lancamentos.forEach((item) => {
      if (item.tipo === 'receita') {
        if (item.status === 'Pago') {
          totalRecebido += item.valor;
        } else if (item.status === 'Pendente' || item.status === 'Atrasado') {
          totalReceberPendente += item.valor;
        }
      } else if (item.tipo === 'despesa') {
        if (item.status === 'Pago') {
          totalPago += item.valor;
        } else if (item.status === 'Pendente' || item.status === 'Atrasado') {
          totalPagarPendente += item.valor;
        }
      }
    });

    const saldoAtual = totalRecebido - totalPago;
    const saldoPrevisto = (totalRecebido + totalReceberPendente) - (totalPago + totalPagarPendente);

    return {
      totalReceberPendente,
      totalRecebido,
      totalPagarPendente,
      totalPago,
      saldoAtual,
      saldoPrevisto,
      totalLancamentos: lancamentos.length,
    };
  },
};
