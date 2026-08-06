/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cliente } from '../types';
import { FirestoreRepository } from './FirestoreRepository';
import { IntegridadeService } from './IntegridadeService';
import { RecuperacaoService } from './RecuperacaoService';

export const ClienteService = {
  /**
   * Obtém todos os clientes de um determinado inquilino (empresaId) via FirestoreRepository
   */
  async getClientes(empresaId: string, userEmail?: string): Promise<Cliente[]> {
    return FirestoreRepository.getAll<Cliente>('clientes', empresaId, userEmail);
  },

  /**
   * Salva ou atualiza um cliente via FirestoreRepository após validação de duplicidade
   */
  async saveCliente(clienteData: Cliente, userEmail?: string): Promise<Cliente> {
    const timestamp = new Date().toISOString();
    const id = clienteData.id || 'cli_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    
    const cliente: Cliente = {
      ...clienteData,
      id,
      createdAt: clienteData.createdAt || timestamp,
      updatedAt: timestamp,
    };

    // Validação de duplicidade centralizada
    const dupValidation = await IntegridadeService.validateClienteDuplicates(cliente, cliente.empresaId, userEmail);
    if (!dupValidation.valid) {
      throw new Error(dupValidation.message || 'CPF/CNPJ já cadastrado para outro cliente nesta empresa.');
    }

    const saved = await FirestoreRepository.add('clientes', cliente, cliente.empresaId, userEmail);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clientes_updated', { detail: { empresaId: cliente.empresaId } }));
    }

    return saved;
  },

  /**
   * Exclui um cliente via RecuperacaoService (Soft Delete) após validação de integridade e vínculos ativos
   */
  async deleteCliente(id: string, empresaId: string, userEmail?: string): Promise<void> {
    // Validação de exclusão centralizada
    const integrity = await IntegridadeService.canDeleteCliente(id, empresaId, userEmail);
    if (!integrity.allowed) {
      throw new Error(integrity.reason || 'Este cliente possui registros vinculados e não pode ser excluído.');
    }

    const cliente = await FirestoreRepository.get<Cliente>('clientes', id, empresaId, userEmail);
    const nome = cliente?.nome || 'Cliente Sem Nome';
    const docIdent = cliente?.documento || cliente?.id || id;

    await RecuperacaoService.softDeleteRecord('clientes', id, 'Cliente', nome, docIdent, empresaId, userEmail, cliente);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clientes_updated', { detail: { empresaId } }));
    }
  },

  /**
   * Escuta em tempo real as atualizações de clientes do inquilino
   */
  listenClientes(empresaId: string, callback: (clientes: Cliente[]) => void, userEmail?: string) {
    return FirestoreRepository.listen<Cliente>('clientes', empresaId, callback, [], userEmail);
  },

  /**
   * Pesquisa clientes por termo (Nome, CPF/CNPJ, Telefone)
   */
  async searchClientes(empresaId: string, term: string, userEmail?: string): Promise<Cliente[]> {
    const all = await this.getClientes(empresaId, userEmail);
    if (!term || !term.trim()) return all;

    const normalizedTerm = term.toLowerCase().trim();
    return all.filter(c => 
      (c.nome && c.nome.toLowerCase().includes(normalizedTerm)) ||
      (c.documento && c.documento.toLowerCase().includes(normalizedTerm)) ||
      (c.telefone && c.telefone.toLowerCase().includes(normalizedTerm)) ||
      (c.whatsapp && c.whatsapp.toLowerCase().includes(normalizedTerm))
    );
  }
};
