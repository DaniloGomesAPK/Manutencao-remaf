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
   * Exclui um cliente logicamente (Soft Delete) enviando para a Central de Recuperação.
   * Valida integridade referencial antes da exclusão para proteger OS, financeiro e equipamentos vinculados.
   * Se houver vínculos, bloqueia e informa o motivo detalhado.
   * Se não houver vínculos, move o cliente para a lixeira e remove da coleção ativa.
   */
  async deleteCliente(id: string, empresaId: string, userEmail?: string): Promise<void> {
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new Error('ID do cliente é obrigatório para exclusão.');
    }
    if (!empresaId || typeof empresaId !== 'string' || !empresaId.trim()) {
      throw new Error('empresaId é obrigatório para exclusão do cliente.');
    }

    const cleanId = id.trim();
    const cleanEmpresaId = empresaId.trim();

    console.log('[DELETE CLIENTE] Verificando integridade referencial...', { clienteId: cleanId, empresaId: cleanEmpresaId });

    // 1. Validação de integridade centralizada (OS, Financeiro, Equipamentos)
    const integrity = await IntegridadeService.canDeleteCliente(cleanId, cleanEmpresaId, userEmail);
    if (!integrity.allowed) {
      console.warn('[DELETE CLIENTE] Exclusão impedida por integridade referencial:', integrity.reason);
      throw new Error(integrity.reason || 'Este cliente possui registros vinculados e não pode ser excluído.');
    }

    console.log('[DELETE CLIENTE] Integridade confirmada (sem vínculos impeditivos). Movendo cliente para a Central de Recuperação (Lixeira)...', {
      clienteId: cleanId,
      empresaId: cleanEmpresaId
    });

    // 2. Busca dados completos do cliente antes de mover para a lixeira
    const cliente = await FirestoreRepository.get<Cliente>('clientes', cleanId, cleanEmpresaId, userEmail);
    const nome = cliente?.nome || 'Cliente';
    const identificacao = cliente?.documento || cliente?.telefone || cleanId;

    // 3. Move para a lixeira via RecuperacaoService e remove da coleção ativa
    await RecuperacaoService.softDeleteRecord(
      'clientes',
      cleanId,
      'Cliente',
      nome,
      identificacao,
      cleanEmpresaId,
      userEmail,
      cliente
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clientes_updated', { detail: { empresaId: cleanEmpresaId } }));
      window.dispatchEvent(new CustomEvent('lixeira_updated', { detail: { empresaId: cleanEmpresaId } }));
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
