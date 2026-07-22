/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Equipamento } from '../types';
import { FirestoreRepository } from './FirestoreRepository';

export const EquipamentoService = {
  /**
   * Obtém todos os equipamentos de um determinado inquilino (empresaId) via FirestoreRepository
   */
  async getEquipamentos(empresaId: string, userEmail?: string): Promise<Equipamento[]> {
    return FirestoreRepository.getAll<Equipamento>('equipamentos', empresaId, userEmail);
  },

  /**
   * Salva ou atualiza um equipamento via FirestoreRepository
   */
  async saveEquipamento(equipamentoData: Equipamento, userEmail?: string): Promise<Equipamento> {
    const timestamp = new Date().toISOString();
    const id = equipamentoData.id || 'eq_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    
    const equipamento: Equipamento = {
      ...equipamentoData,
      id,
      createdAt: equipamentoData.createdAt || timestamp,
      updatedAt: timestamp,
    };

    const saved = await FirestoreRepository.add('equipamentos', equipamento, equipamento.empresaId, userEmail);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('equipamentos_updated', { detail: { empresaId: equipamento.empresaId } }));
    }

    return saved;
  },

  /**
   * Exclui um equipamento via FirestoreRepository
   */
  async deleteEquipamento(id: string, empresaId: string, userEmail?: string): Promise<void> {
    await FirestoreRepository.delete('equipamentos', id, empresaId, userEmail);

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
