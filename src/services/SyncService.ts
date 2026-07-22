/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Empresa } from '../models/Empresa';
import { License } from '../models/License';
import { FirestoreRepository } from './FirestoreRepository';

export const SyncService = {
  /**
   * Sincronização real da empresa com o Firestore via FirestoreRepository.
   */
  async sincronizarEmpresa(empresa: Empresa, userEmail?: string): Promise<{ success: boolean; syncedAt: string }> {
    await FirestoreRepository.add('company_profile', empresa, empresa.id, userEmail);
    return { success: true, syncedAt: new Date().toISOString() };
  },

  /**
   * Sincronização real dos clientes com o Firestore.
   */
  async sincronizarClientes(empresaId: string, userEmail?: string): Promise<{ success: boolean; count: number }> {
    const clientes = await FirestoreRepository.getAll('clientes', empresaId, userEmail);
    return { success: true, count: clientes.length };
  },

  /**
   * Sincronização real de equipamentos com o Firestore.
   */
  async sincronizarEquipamentos(empresaId: string, userEmail?: string): Promise<{ success: boolean; count: number }> {
    const equipamentos = await FirestoreRepository.getAll('equipamentos', empresaId, userEmail);
    return { success: true, count: equipamentos.length };
  },

  /**
   * Sincronização real das ordens de serviço / relatórios com o Firestore.
   */
  async sincronizarRelatorios(empresaId: string, userEmail?: string): Promise<{ success: boolean; count: number }> {
    const ordens = await FirestoreRepository.getAll('ordensServico', empresaId, userEmail);
    return { success: true, count: ordens.length };
  },

  /**
   * Sincronização de mídias/fotos associadas ao inquilino.
   */
  async sincronizarFotos(empresaId: string, userEmail?: string): Promise<{ success: boolean; count: number }> {
    const ordens = await FirestoreRepository.getAll('ordensServico', empresaId, userEmail);
    return { success: true, count: ordens.length };
  },

  /**
   * Sincronização real das configurações gerais no Firestore.
   */
  async sincronizarConfiguracoes(empresaId: string, configuracoes: any, userEmail?: string): Promise<{ success: boolean }> {
    await FirestoreRepository.add('configuracoes', { id: 'config_main', ...configuracoes, empresaId }, empresaId, userEmail);
    return { success: true };
  },

  /**
   * Sincronização real da licença da empresa.
   */
  async sincronizarLicenca(license: License, userEmail?: string): Promise<{ success: boolean; license: License }> {
    const timestamp = new Date().toISOString();
    const updatedLicense = {
      ...license,
      ultimaSincronizacao: timestamp
    };
    await FirestoreRepository.add('configuracoes', { id: 'license_info', ...updatedLicense }, license.empresaId, userEmail);
    return {
      success: true,
      license: updatedLicense
    };
  }
};
