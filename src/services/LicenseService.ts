/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { License } from '../models/License';
import { AppConfig } from '../config/AppConfig';

const LOCAL_STORAGE_PREFIX = 'remaf_license_';

export const LicenseService = {
  /**
   * Obtém a licença de uma empresa específica.
   */
  async getLicense(empresaId: string): Promise<License | null> {
    try {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${empresaId}`);
      if (cached) {
        return JSON.parse(cached) as License;
      }
    } catch (_) {}

    // Inicializa licença padrão caso não exista
    const timestamp = new Date().toISOString();
    const trialDays = AppConfig.diasTrial;
    const expirationDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const defaultLicense: License = {
      id: `lic_${empresaId.replace(/[^a-zA-Z0-9]/g, '')}`,
      empresaId: empresaId,
      plano: 'SaaS Versão Profissional',
      status: 'ativo',
      trialAtivo: AppConfig.trialHabilitado,
      trialDias: trialDays,
      dataAtivacao: timestamp,
      dataExpiracao: expirationDate,
      ultimaVerificacao: timestamp,
      ultimaSincronizacao: timestamp,
      isActive: true
    };

    await this.saveLicense(defaultLicense);
    return defaultLicense;
  },

  /**
   * Salva ou atualiza a licença localmente.
   */
  async saveLicense(license: License): Promise<License> {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${license.empresaId}`, JSON.stringify(license));
    } catch (_) {}
    return license;
  },

  /**
   * Verifica se a licença está válida e ativa.
   */
  async verificarLicenca(empresaId: string): Promise<boolean> {
    const license = await this.getLicense(empresaId);
    if (!license) return false;
    return license.isActive && license.status === 'ativo' && !this.verificarExpiracao(license);
  },

  /**
   * Ativa a licença da empresa.
   */
  async ativarLicenca(empresaId: string, plano = 'SaaS Versão Profissional'): Promise<License> {
    const license = await this.getLicense(empresaId);
    if (license) {
      license.status = 'ativo';
      license.isActive = true;
      license.plano = plano;
      license.trialAtivo = false;
      license.dataAtivacao = new Date().toISOString();
      // Renova por mais 1 ano por padrão
      license.dataExpiracao = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      license.ultimaVerificacao = new Date().toISOString();
      return await this.saveLicense(license);
    }
    throw new Error('Licença não encontrada.');
  },

  /**
   * Renova a licença por mais tempo.
   */
  async renovarLicenca(empresaId: string, diasAdicionais = 365): Promise<License> {
    const license = await this.getLicense(empresaId);
    if (license) {
      const currentExpiry = new Date(license.dataExpiracao).getTime();
      const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
      license.dataExpiracao = new Date(baseTime + diasAdicionais * 24 * 60 * 60 * 1000).toISOString();
      license.status = 'ativo';
      license.isActive = true;
      license.ultimaVerificacao = new Date().toISOString();
      return await this.saveLicense(license);
    }
    throw new Error('Licença não encontrada.');
  },

  /**
   * Bloqueia a licença (status suspenso).
   */
  async bloquearLicenca(empresaId: string): Promise<License> {
    const license = await this.getLicense(empresaId);
    if (license) {
      license.status = 'suspenso';
      license.isActive = false;
      license.ultimaVerificacao = new Date().toISOString();
      return await this.saveLicense(license);
    }
    throw new Error('Licença não encontrada.');
  },

  /**
   * Libera a licença bloqueada.
   */
  async liberarLicenca(empresaId: string): Promise<License> {
    const license = await this.getLicense(empresaId);
    if (license) {
      license.status = 'ativo';
      license.isActive = true;
      license.ultimaVerificacao = new Date().toISOString();
      return await this.saveLicense(license);
    }
    throw new Error('Licença não encontrada.');
  },

  /**
   * Inicia o período de testes (Trial).
   */
  async iniciarPeriodoTeste(empresaId: string, dias = 15): Promise<License> {
    const license = await this.getLicense(empresaId);
    if (license) {
      license.trialAtivo = true;
      license.trialDias = dias;
      license.status = 'ativo';
      license.isActive = true;
      license.dataAtivacao = new Date().toISOString();
      license.dataExpiracao = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
      license.ultimaVerificacao = new Date().toISOString();
      return await this.saveLicense(license);
    }
    throw new Error('Licença não encontrada.');
  },

  /**
   * Encerra precocemente o período de testes (Trial).
   */
  async encerrarPeriodoTeste(empresaId: string): Promise<License> {
    const license = await this.getLicense(empresaId);
    if (license) {
      license.trialAtivo = false;
      license.trialDias = 0;
      license.status = 'expirado';
      license.isActive = false;
      license.dataExpiracao = new Date().toISOString();
      license.ultimaVerificacao = new Date().toISOString();
      return await this.saveLicense(license);
    }
    throw new Error('Licença não encontrada.');
  },

  /**
   * Verifica se a licença expirou com base na data atual.
   */
  verificarExpiracao(license: License): boolean {
    const expirationTime = new Date(license.dataExpiracao).getTime();
    return Date.now() > expirationTime;
  },

  /**
   * Sincroniza a licença local com a nuvem (simulado para Firestore).
   */
  async sincronizarLicenca(empresaId: string): Promise<License> {
    const license = await this.getLicense(empresaId);
    if (license) {
      license.ultimaSincronizacao = new Date().toISOString();
      license.ultimaVerificacao = new Date().toISOString();
      return await this.saveLicense(license);
    }
    throw new Error('Licença não encontrada para sincronização.');
  }
};
