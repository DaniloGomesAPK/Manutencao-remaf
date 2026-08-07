/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Equipamento } from '../types';
import { FirestoreRepository } from './FirestoreRepository';
import { IntegridadeService } from './IntegridadeService';
import { RecuperacaoService } from './RecuperacaoService';

export const EquipamentoService = {
  /**
   * Obtém todos os equipamentos de um determinado inquilino (empresaId) via FirestoreRepository
   */
  async getEquipamentos(empresaId: string, userEmail?: string): Promise<Equipamento[]> {
    return FirestoreRepository.getAll<Equipamento>('equipamentos', empresaId, userEmail);
  },

  /**
   * Salva ou atualiza um equipamento via FirestoreRepository após validação de duplicidade (Patrimônio / Série)
   */
  async saveEquipamento(equipamentoData: Equipamento, userEmail?: string): Promise<Equipamento> {
    const timestamp = new Date().toISOString();
    const id = equipamentoData.id || 'eq_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    
    // Normalização automática dos identificadores antes de validar e salvar
    const normalizedData = IntegridadeService.normalizarEquipamentoIdentificadores(equipamentoData);

    const equipamento: Equipamento = {
      ...normalizedData,
      id,
      createdAt: equipamentoData.createdAt || timestamp,
      updatedAt: timestamp,
    };

    // Validação de duplicidade centralizada
    const dupValidation = await IntegridadeService.validateEquipamentoDuplicates(equipamento, equipamento.empresaId, userEmail);
    if (!dupValidation.valid) {
      throw new Error(dupValidation.message || 'Patrimônio ou Número de Série já cadastrado nesta empresa.');
    }

    const saved = await FirestoreRepository.add('equipamentos', equipamento, equipamento.empresaId, userEmail);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('equipamentos_updated', { detail: { empresaId: equipamento.empresaId } }));
    }

    return saved;
  },

  /**
   * Exclui um equipamento via RecuperacaoService (Soft Delete) após validação de integridade e OS vinculadas
   */
  async deleteEquipamento(id: string, empresaId: string, userEmail?: string): Promise<void> {
    // Validação de exclusão centralizada
    const integrity = await IntegridadeService.canDeleteEquipamento(id, empresaId, userEmail);
    if (!integrity.allowed) {
      throw new Error(integrity.reason || 'Este equipamento possui registros vinculados e não pode ser excluído.');
    }

    const eq = await FirestoreRepository.get<Equipamento>('equipamentos', id, empresaId, userEmail);
    const nome = (eq as any)?.nome || `${eq?.fabricante || ''} ${eq?.modelo || ''}`.trim() || 'Equipamento Sem Nome';
    const ident = eq?.numeroSerie || eq?.placa || eq?.id || id;

    await RecuperacaoService.softDeleteRecord('equipamentos', id, 'Equipamento', nome, ident, empresaId, userEmail, eq);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('equipamentos_updated', { detail: { empresaId } }));
    }
  },

  /**
   * Escuta em tempo real atualizações de equipamentos
   */
  listenEquipamentos(empresaId: string, callback: (equipamentos: Equipamento[]) => void, userEmail?: string) {
    return FirestoreRepository.listen<Equipamento>('equipamentos', empresaId, callback, [], userEmail);
  },

  /**
   * Busca equipamentos de um cliente específico
   */
  async getEquipamentosPorCliente(empresaId: string, clienteId: string, userEmail?: string): Promise<Equipamento[]> {
    const all = await this.getEquipamentos(empresaId, userEmail);
    return all.filter(e => e.clienteId === clienteId);
  },

  /**
   * Pesquisa equipamentos por termo
   */
  async searchEquipamentos(empresaId: string, term: string, userEmail?: string): Promise<Equipamento[]> {
    const all = await this.getEquipamentos(empresaId, userEmail);
    if (!term || !term.trim()) return all;

    const norm = term.toLowerCase().trim();
    return all.filter(e =>
      (e.nome && e.nome.toLowerCase().includes(norm)) ||
      (e.modelo && e.modelo.toLowerCase().includes(norm)) ||
      (e.numeroSerie && e.numeroSerie.toLowerCase().includes(norm)) ||
      (e.placa && e.placa.toLowerCase().includes(norm)) ||
      (e.fabricante && e.fabricante.toLowerCase().includes(norm))
    );
  }
};
