/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Empresa } from '../models/Empresa';
import { Usuario } from '../models/Usuario';
import { openDB, COMPANY_STORE_NAME } from '../db';

const LOCAL_STORAGE_PREFIX = 'remaf_company_profile_';

export const EmpresaService = {
  /**
   * Obtém os dados da empresa pelo EmpresaID.
   */
  async getEmpresa(empresaId: string): Promise<Empresa | null> {
    try {
      // 1. Tentar ler do IndexedDB
      const db = await openDB();
      const empresa = await new Promise<Empresa | null>((resolve, reject) => {
        const transaction = db.transaction(COMPANY_STORE_NAME, 'readonly');
        const store = transaction.objectStore(COMPANY_STORE_NAME);
        const request = store.get(empresaId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });

      if (empresa) {
        // Atualizar cache local do localStorage
        try {
          localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${empresaId}`, JSON.stringify(empresa));
        } catch (_) {}
        return empresa;
      }
    } catch (err) {
      console.warn('Erro ao ler empresa do IndexedDB, tentando localStorage:', err);
    }

    // 2. Fallback para localStorage
    try {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${empresaId}`);
      if (cached) {
        return JSON.parse(cached) as Empresa;
      }
    } catch (_) {}

    return null;
  },

  /**
   * Salva ou atualiza os dados da empresa.
   */
  async saveEmpresa(empresaData: Empresa): Promise<Empresa> {
    const timestamp = new Date().toISOString();
    const company: Empresa = {
      ...empresaData,
      createdAt: empresaData.createdAt || timestamp,
      updatedAt: timestamp,
    };

    try {
      // 1. Salvar no IndexedDB
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(COMPANY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(COMPANY_STORE_NAME);
        const request = store.put(company);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Erro ao salvar no IndexedDB:', err);
    }

    // 2. Salvar no localStorage cache para acesso rápido e redundância
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${company.id}`, JSON.stringify(company));
    } catch (err) {
      console.warn('Erro ao salvar no localStorage:', err);
    }

    // Despacha evento personalizado para notificar outras partes da aplicação
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('remaf_company_updated'));
    }

    return company;
  },

  /**
   * Garante que uma empresa exista para o EmpresaID fornecido.
   * Se não existir, inicializa uma empresa padrão vinculando o Usuário Proprietário.
   */
  async ensureEmpresaExists(empresaId: string, usuario: Usuario): Promise<Empresa> {
    const existing = await this.getEmpresa(empresaId);
    if (existing) {
      return existing;
    }

    // Se houver algum perfil de empresa "main_company" antigo ou cache, tentamos herdar
    let oldConfig: any = {};
    try {
      const oldCached = localStorage.getItem('remaf_company_profile');
      if (oldCached) {
        oldConfig = JSON.parse(oldCached);
      }
    } catch (_) {}

    const timestamp = new Date().toISOString();
    const defaultEmpresa: Empresa = {
      id: empresaId,
      nomeFantasia: oldConfig.nomeFantasia || '',
      razaoSocial: oldConfig.razaoSocial || '',
      cnpj: oldConfig.cnpj || '',
      inscricaoEstadual: oldConfig.inscricaoEstadual || '',
      endereco: oldConfig.endereco || '',
      numero: oldConfig.numero || '',
      bairro: oldConfig.bairro || '',
      cidade: oldConfig.cidade || '',
      estado: oldConfig.estado || '',
      cep: oldConfig.cep || '',
      telefone: oldConfig.telefone || '',
      whatsapp: oldConfig.whatsapp || '',
      email: usuario.email,
      site: oldConfig.site || '',
      logomarca: oldConfig.logomarca || undefined,
      regimeTributario: oldConfig.regimeTributario || 'Simples Nacional',
      aliquotaImposto: oldConfig.aliquotaImposto !== undefined ? oldConfig.aliquotaImposto : 6.00,
      configuracoes: {
        customTheme: 'default',
        allowAutoFill: true
      },
      usuarioProprietario: usuario,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    return await this.saveEmpresa(defaultEmpresa);
  },

  /**
   * Remove a empresa do IndexedDB e LocalStorage.
   */
  async deleteEmpresa(empresaId: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(COMPANY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(COMPANY_STORE_NAME);
        const request = store.delete(empresaId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Erro ao excluir no IndexedDB:', err);
    }

    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${empresaId}`);
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('remaf_company_updated'));
    }
  }
};
