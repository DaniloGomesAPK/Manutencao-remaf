/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Empresa } from '../models/Empresa';
import { License } from '../models/License';

export const SyncService = {
  /**
   * Simula a sincronização da empresa com o Firestore.
   */
  async sincronizarEmpresa(empresa: Empresa): Promise<{ success: boolean; syncedAt: string }> {
    console.log('[SyncService] Sincronizando empresa com o Firestore:', empresa.id);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, syncedAt: new Date().toISOString() });
      }, 600);
    });
  },

  /**
   * Simula a sincronização dos clientes.
   */
  async sincronizarClientes(empresaId: string): Promise<{ success: boolean; count: number }> {
    console.log('[SyncService] Sincronizando clientes do inquilino:', empresaId);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, count: 42 });
      }, 500);
    });
  },

  /**
   * Simula a sincronização de equipamentos.
   */
  async sincronizarEquipamentos(empresaId: string): Promise<{ success: boolean; count: number }> {
    console.log('[SyncService] Sincronizando equipamentos do inquilino:', empresaId);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, count: 18 });
      }, 500);
    });
  },

  /**
   * Simula a sincronização de relatórios / ordens de serviço.
   */
  async sincronizarRelatorios(empresaId: string): Promise<{ success: boolean; count: number }> {
    console.log('[SyncService] Sincronizando relatórios/OS do inquilino:', empresaId);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, count: 5 });
      }, 700);
    });
  },

  /**
   * Simula a sincronização de fotos / uploads de mídia.
   */
  async sincronizarFotos(empresaId: string): Promise<{ success: boolean; count: number }> {
    console.log('[SyncService] Sincronizando arquivos de mídia no Storage do inquilino:', empresaId);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, count: 12 });
      }, 800);
    });
  },

  /**
   * Simula a sincronização das configurações gerais.
   */
  async sincronizarConfiguracoes(empresaId: string, configuracoes: any): Promise<{ success: boolean }> {
    console.log('[SyncService] Sincronizando configurações do inquilino:', empresaId, configuracoes);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 400);
    });
  },

  /**
   * Simula a sincronização da licença da empresa.
   */
  async sincronizarLicenca(license: License): Promise<{ success: boolean; license: License }> {
    console.log('[SyncService] Sincronizando licença com o servidor central:', license.id);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          license: {
            ...license,
            ultimaSincronizacao: new Date().toISOString()
          }
        });
      }, 500);
    });
  }
};
