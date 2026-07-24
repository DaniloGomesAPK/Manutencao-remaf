/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '../config/firebase';
import { LicencaAtual, License, StatusLicenca } from '../models/License';

const LOCAL_STORAGE_PREFIX = 'remaf_licenca_';
const db = getFirestore(app);

export const LicenseService = {
  /**
   * Obtém o documento de licença atual da empresa: empresas/{empresaId}/licenca/licencaAtual (com fallback em users/{uid})
   */
  async getLicenca(empresaId: string, uid?: string): Promise<LicencaAtual | null> {
    if (!empresaId) return null;

    let licenca: LicencaAtual | null = null;

    // 1. Tenta carregar do Firestore empresas/{empresaId}/licenca/licencaAtual (Única fonte de verdade)
    try {
      const licDocRef = doc(db, 'empresas', empresaId, 'licenca', 'licencaAtual');
      const snap = await getDoc(licDocRef);
      if (snap.exists()) {
        licenca = snap.data() as LicencaAtual;
      }
    } catch (e) {
      console.warn('[LicenseService] Falha ao ler licencaAtual no Firestore, recorrendo ao cache local:', e);
    }

    // 2. Se não encontrou no Firestore da empresa, busca no LocalStorage
    if (!licenca) {
      try {
        const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${empresaId}`);
        if (cached) {
          licenca = JSON.parse(cached) as LicencaAtual;
        }
      } catch (_) {}
    }

    // 3. Se não encontrou ou se a licença está como 'pending', tenta recuperar do documento do usuário users/{uid}
    if ((!licenca || licenca.status === 'pending') && uid) {
      try {
        const userDocRef = doc(db, 'users', uid);
        const uSnap = await getDoc(userDocRef);
        if (uSnap.exists()) {
          const uData = uSnap.data();
          const userStatus = uData.statusConta || uData.statusLicenca;
          if (userStatus === 'trial' || userStatus === 'active' || uData.trialUtilizado === true || uData.trialInicio) {
            const nowObj = new Date();
            const now = nowObj.toISOString();
            const trialInicioVal = uData.trialInicio || now;
            const trialFimVal = uData.trialFim || new Date(new Date(trialInicioVal).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

            licenca = {
              empresaId,
              status: (userStatus === 'trial' || userStatus === 'active' || userStatus === 'expired') ? userStatus : 'trial',
              plano: uData.plano || (userStatus === 'trial' ? 'trial_3dias' : 'Plano Profissional'),
              inicio: trialInicioVal,
              fim: trialFimVal,
              trialInicio: trialInicioVal,
              trialFim: trialFimVal,
              trialUtilizado: uData.trialUtilizado ?? true,
              ultimaAtualizacao: now,
              origem: 'manual'
            };
            await this.saveLicenca(empresaId, licenca, uid);
          }
        }
      } catch (e) {
        console.warn('[LicenseService] Falha ao verificar licença secundária em users/{uid}:', e);
      }
    }

    // 4. Se não existe nenhuma licença registrada em lugar nenhum para a empresa, cria a licença pendente inicial
    if (!licenca) {
      const now = new Date().toISOString();
      licenca = {
        empresaId,
        status: 'pending',
        plano: null,
        inicio: now,
        fim: now,
        trialInicio: null,
        trialFim: null,
        trialUtilizado: false,
        ultimaAtualizacao: now,
        origem: 'manual'
      };
      await this.saveLicenca(empresaId, licenca, uid);
    } else {
      // Verificar se trial ou plano ativo expirou
      if (licenca.status === 'trial' && licenca.trialFim) {
        const tempo = this.getTempoRestanteTrial(licenca.trialFim);
        if (tempo.expirou) {
          licenca.status = 'expired';
          licenca = await this.saveLicenca(empresaId, licenca, uid);
        }
      } else if (licenca.status === 'active' && licenca.fim) {
        if (this.verificarVencimento(licenca)) {
          licenca.status = 'expired';
          licenca = await this.saveLicenca(empresaId, licenca, uid);
        }
      }

      // Atualiza o cache local
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${empresaId}`, JSON.stringify(licenca));
      } catch (_) {}
    }

    return licenca;
  },

  /**
   * Salva e sincroniza o documento de licença em empresas/{empresaId}/licenca/licencaAtual e em users/{uid}
   * Preserva rigorosamente trialInicio, trialFim e trialUtilizado.
   */
  async saveLicenca(empresaId: string, licenca: LicencaAtual, uid?: string): Promise<LicencaAtual> {
    if (!empresaId) throw new Error('empresaId ausente para salvar licença.');

    // Consulta estado anterior no Firestore/cache para garantir integridade e preservar o trial
    let existing: LicencaAtual | null = null;
    try {
      const licDocRef = doc(db, 'empresas', empresaId, 'licenca', 'licencaAtual');
      const snap = await getDoc(licDocRef);
      if (snap.exists()) {
        existing = snap.data() as LicencaAtual;
      }
    } catch (_) {}

    if (!existing) {
      try {
        const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${empresaId}`);
        if (cached) existing = JSON.parse(cached);
      } catch (_) {}
    }

    let userExistingStatus: string | null = null;
    let userExistingTrialUtilizado = false;
    let userExistingTrialInicio: string | null = null;
    let userExistingTrialFim: string | null = null;

    if (uid) {
      try {
        const uSnap = await getDoc(doc(db, 'users', uid));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          if (uData.statusConta === 'trial' || uData.statusLicenca === 'trial') {
            userExistingStatus = 'trial';
          } else if (uData.statusConta && uData.statusConta !== 'pending') {
            userExistingStatus = uData.statusConta;
          }
          userExistingTrialUtilizado = uData.trialUtilizado === true;
          userExistingTrialInicio = uData.trialInicio || null;
          userExistingTrialFim = uData.trialFim || null;
        }
      } catch (_) {}
    }

    // Proteção para impedir que trialInicio/trialFim sejam sobrescritos ou trialUtilizado volte para false
    const preservedTrialInicio = existing?.trialInicio || userExistingTrialInicio || licenca.trialInicio || null;
    const preservedTrialFim = existing?.trialFim || userExistingTrialFim || licenca.trialFim || null;
    const preservedTrialUtilizado = (existing?.trialUtilizado === true) || (licenca.trialUtilizado === true) || userExistingTrialUtilizado;

    // Proteção rigorosa: Se o estado fornecido é 'pending', mas já existe licença não-pending, PRESERVA o estado existente
    let finalStatus = licenca.status;
    if (finalStatus === 'pending') {
      if (existing?.status && existing.status !== 'pending') {
        finalStatus = existing.status;
      } else if (userExistingStatus && userExistingStatus !== 'pending') {
        finalStatus = userExistingStatus as any;
      }
    }

    const updatedLic: LicencaAtual = {
      ...licenca,
      empresaId,
      status: finalStatus,
      trialInicio: preservedTrialInicio,
      trialFim: preservedTrialFim,
      trialUtilizado: preservedTrialUtilizado,
      ultimaAtualizacao: new Date().toISOString()
    };

    // Salva localmente para Offline-First
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${empresaId}`, JSON.stringify(updatedLic));
    } catch (_) {}

    // Salva no Firestore sob empresas/{empresaId}/licenca/licencaAtual
    try {
      const licDocRef = doc(db, 'empresas', empresaId, 'licenca', 'licencaAtual');
      await setDoc(licDocRef, updatedLic, { merge: true });
    } catch (e) {
      console.warn('[LicenseService] Erro ao sincronizar empresas/{empresaId}/licenca/licencaAtual no Firestore:', e);
    }

    // Sincroniza também no documento do usuário em users/{uid}
    if (uid) {
      try {
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, {
          empresaId,
          statusConta: updatedLic.status,
          statusLicenca: updatedLic.status,
          trialUtilizado: preservedTrialUtilizado,
          trialInicio: preservedTrialInicio,
          trialFim: preservedTrialFim,
          plano: updatedLic.plano
        }, { merge: true });
      } catch (e) {
        console.warn('[LicenseService] Falha ao sincronizar status do usuário em users/{uid}:', e);
      }
    }

    // Atualiza a sessão ativa no localStorage para refletir a licença atualizada
    try {
      const sessionUserStr = localStorage.getItem('remaf_saas_user');
      if (sessionUserStr) {
        const sessionUser = JSON.parse(sessionUserStr);
        if (sessionUser && (sessionUser.id === uid || sessionUser.empresaId === empresaId)) {
          sessionUser.statusConta = updatedLic.status;
          sessionUser.empresaId = empresaId;
          localStorage.setItem('remaf_saas_user', JSON.stringify(sessionUser));
        }
      }
    } catch (_) {}

    return updatedLic;
  },

  /**
   * Inicia o teste gratuito de 3 dias (Proíbe reinício se já utilizado)
   */
  async iniciarTrial(empresaId: string, uid?: string): Promise<LicencaAtual> {
    if (!empresaId) throw new Error('Empresa inválida para iniciar trial.');

    // Período de teste só pode ser ativado UMA VEZ por empresa
    const existing = await this.getLicenca(empresaId, uid);
    if (existing?.trialUtilizado || existing?.trialInicio) {
      console.warn('[LicenseService] Período de teste já foi utilizado anteriormente. Não é possível reiniciar.');
      return existing;
    }

    const now = new Date();
    const trialInicio = now.toISOString();
    const trialFimDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const trialFim = trialFimDate.toISOString();

    const licencaTrial: LicencaAtual = {
      empresaId,
      status: 'trial',
      plano: 'trial_3dias',
      inicio: trialInicio,
      fim: trialFim,
      trialInicio,
      trialFim,
      trialUtilizado: true,
      ultimaAtualizacao: trialInicio,
      origem: 'manual'
    };

    // Atualiza o documento licencaAtual
    const saved = await this.saveLicenca(empresaId, licencaTrial, uid);
    return saved;
  },

  /**
   * Ativa ou renova a licença da empresa (Plano Mensal / Anual / Manual / Cakto)
   */
  async ativarLicenca(
    empresaId: string, 
    plano: string, 
    dias = 30, 
    origem: 'manual' | 'cakto' = 'manual'
  ): Promise<LicencaAtual> {
    const existing = await this.getLicenca(empresaId);
    const now = new Date();
    const inicio = now.toISOString();
    const fimDate = new Date(now.getTime() + dias * 24 * 60 * 60 * 1000);
    const fim = fimDate.toISOString();

    const licencaAtiva: LicencaAtual = {
      empresaId,
      status: 'active',
      plano,
      inicio,
      fim,
      trialInicio: existing?.trialInicio || null,
      trialFim: existing?.trialFim || null,
      trialUtilizado: existing?.trialUtilizado ?? true,
      ultimaAtualizacao: inicio,
      origem
    };

    return await this.saveLicenca(empresaId, licencaAtiva);
  },

  /**
   * Valida a licença com base no estado e nas datas de expiração (ETAPA 12)
   */
  validarLicenca(licenca: LicencaAtual | null): { isValid: boolean; status: StatusLicenca; reason?: string } {
    if (!licenca) {
      return { isValid: false, status: 'pending', reason: 'Nenhuma licença encontrada.' };
    }

    // Se estiver ativa, verifica se a data fim foi ultrapassada
    if (licenca.status === 'active') {
      const expirou = this.verificarVencimento(licenca);
      if (expirou) {
        return { isValid: false, status: 'expired', reason: 'Sua assinatura expirou.' };
      }
      return { isValid: true, status: 'active' };
    }

    // Se estiver em trial, verifica o tempo restante
    if (licenca.status === 'trial') {
      const tempo = this.getTempoRestanteTrial(licenca.trialFim);
      if (tempo.expirou) {
        return { isValid: false, status: 'expired', reason: 'Seu período de teste de 3 dias expirou.' };
      }
      return { isValid: true, status: 'trial' };
    }

    if (licenca.status === 'pending') {
      return { isValid: false, status: 'pending', reason: 'A conta aguarda seleção do plano ou início de teste.' };
    }

    return { isValid: false, status: licenca.status, reason: 'Licença inativa ou expirada.' };
  },

  /**
   * Calcula o tempo restante do trial (Dias, Horas, Minutos) para exibição no Dashboard (ETAPA 8)
   */
  getTempoRestanteTrial(trialFim: string | null): { 
    dias: number; 
    horas: number; 
    minutos: number; 
    expirou: boolean; 
    totalSegundos: number 
  } {
    if (!trialFim) {
      return { dias: 0, horas: 0, minutos: 0, expirou: true, totalSegundos: 0 };
    }

    const targetTime = new Date(trialFim).getTime();
    const now = Date.now();
    const diffMs = targetTime - now;

    if (diffMs <= 0) {
      return { dias: 0, horas: 0, minutos: 0, expirou: true, totalSegundos: 0 };
    }

    const totalSegundos = Math.floor(diffMs / 1000);
    const dias = Math.floor(totalSegundos / (24 * 3600));
    const horas = Math.floor((totalSegundos % (24 * 3600)) / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);

    return {
      dias,
      horas,
      minutos,
      expirou: false,
      totalSegundos
    };
  },

  /**
   * Verifica se a licença venceu
   */
  verificarVencimento(licenca: LicencaAtual): boolean {
    if (!licenca.fim) return true;
    return Date.now() > new Date(licenca.fim).getTime();
  },

  // --------------------------------------------------------------------------
  // Métodos de Retrocompatibilidade para componentes que usam o modelo antigo
  // --------------------------------------------------------------------------

  async getLicense(empresaId: string): Promise<License | null> {
    const lic = await this.getLicenca(empresaId);
    if (!lic) return null;
    return this.mapToLicenseObject(lic);
  },

  async verificarLicenca(empresaId: string): Promise<boolean> {
    const lic = await this.getLicenca(empresaId);
    const result = this.validarLicenca(lic);
    return result.isValid;
  },

  async iniciarPeriodoTeste(empresaId: string, dias = 3): Promise<License> {
    const lic = await this.iniciarTrial(empresaId);
    return this.mapToLicenseObject(lic);
  },

  async renovarLicenca(empresaId: string, dias = 30): Promise<License> {
    const lic = await this.ativarLicenca(empresaId, 'Plano Renovado', dias, 'manual');
    return this.mapToLicenseObject(lic);
  },

  async bloquearLicenca(empresaId: string): Promise<License> {
    const lic = await this.getLicenca(empresaId);
    if (lic) {
      lic.status = 'blocked';
      const saved = await this.saveLicenca(empresaId, lic);
      return this.mapToLicenseObject(saved);
    }
    throw new Error('Licença não encontrada.');
  },

  async liberarLicenca(empresaId: string): Promise<License> {
    const lic = await this.getLicenca(empresaId);
    if (lic) {
      lic.status = 'active';
      const saved = await this.saveLicenca(empresaId, lic);
      return this.mapToLicenseObject(saved);
    }
    throw new Error('Licença não encontrada.');
  },

  async encerrarPeriodoTeste(empresaId: string): Promise<License> {
    const lic = await this.getLicenca(empresaId);
    if (lic) {
      lic.status = 'expired';
      lic.trialFim = new Date().toISOString();
      const saved = await this.saveLicenca(empresaId, lic);
      return this.mapToLicenseObject(saved);
    }
    throw new Error('Licença não encontrada.');
  },

  mapToLicenseObject(lic: LicencaAtual): License {
    const isValid = lic.status === 'active' || (lic.status === 'trial' && !this.getTempoRestanteTrial(lic.trialFim).expirou);
    return {
      ...lic,
      id: `lic_${lic.empresaId.replace(/[^a-zA-Z0-9]/g, '')}`,
      trialAtivo: lic.status === 'trial',
      trialDias: lic.status === 'trial' ? this.getTempoRestanteTrial(lic.trialFim).dias : 0,
      dataAtivacao: lic.inicio,
      dataExpiracao: lic.fim,
      ultimaVerificacao: lic.ultimaAtualizacao,
      ultimaSincronizacao: lic.ultimaAtualizacao,
      isActive: isValid
    };
  }
};
