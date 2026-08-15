/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { EmailAutorizado, LicencaAtual, License, StatusLicenca } from '../models/License';

const LOCAL_STORAGE_PREFIX = 'remaf_licenca_';

export const LicenseService = {
  /**
   * Obtém a licença e status de autorização diretamente da ÚNICA fonte de verdade:
   * a coleção emailsAutorizados/{email} no Firestore (com fallback no cache local para Offline First).
   */
  async getLicencaByEmail(email: string): Promise<LicencaAtual | null> {
    const emailNorm = email?.trim().toLowerCase();
    if (!emailNorm) return null;

    let docData: EmailAutorizado | null = null;

    // 1. Tenta carregar do Firestore emailsAutorizados/{email} (Única fonte de verdade)
    try {
      const emailDocRef = doc(db, 'emailsAutorizados', emailNorm);
      const snap = await getDoc(emailDocRef);
      if (snap.exists()) {
        docData = snap.data() as EmailAutorizado;
        // Atualiza cache local para Offline First
        try {
          localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${emailNorm}`, JSON.stringify(docData));
        } catch (_) {}
      }
    } catch (e) {
      console.warn('[LicenseService] Falha ao ler emailsAutorizados no Firestore, recorrendo ao cache local:', e);
    }

    // 2. Se não encontrou online / erro de rede, tenta recuperar do LocalStorage
    if (!docData) {
      try {
        const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${emailNorm}`);
        if (cached) {
          docData = JSON.parse(cached) as EmailAutorizado;
        }
      } catch (_) {}
    }

    if (!docData) return null;

    return this.mapDocToLicencaAtual(docData, emailNorm);
  },

  /**
   * Mantém assinatura para compatibilidade com partes existentes que chamavam por empresaId ou uid
   */
  async getLicenca(empresaIdOrEmail: string, uidOrEmail?: string): Promise<LicencaAtual | null> {
    const emailToUse = empresaIdOrEmail.includes('@')
      ? empresaIdOrEmail
      : (uidOrEmail && uidOrEmail.includes('@') ? uidOrEmail : null);

    if (emailToUse) {
      return await this.getLicencaByEmail(emailToUse);
    }

    // Se só foi passado empresaId sem email, busca no cache local
    try {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${empresaIdOrEmail}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return this.mapDocToLicencaAtual(parsed, parsed.email || '');
      }
    } catch (_) {}

    return null;
  },

  /**
   * Converte qualquer formato de data do Firestore (Timestamp, string, number, object) para Date
   */
  parseCriadoEmDate(criadoEm: any): Date | null {
    if (!criadoEm) return null;
    if (criadoEm instanceof Date) return isNaN(criadoEm.getTime()) ? null : criadoEm;
    if (typeof criadoEm.toDate === 'function') {
      try {
        const d = criadoEm.toDate();
        return isNaN(d.getTime()) ? null : d;
      } catch (_) {}
    }
    if (typeof criadoEm === 'object' && typeof criadoEm.seconds === 'number') {
      return new Date(criadoEm.seconds * 1000);
    }
    if (typeof criadoEm === 'string' || typeof criadoEm === 'number') {
      const d = new Date(criadoEm);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  },

  /**
   * Mapeia o documento de emailsAutorizados para o objeto de LicencaAtual
   */
  mapDocToLicencaAtual(docData: Partial<EmailAutorizado>, email: string): LicencaAtual {
    const emailNorm = email || docData.email || '';
    const empresaId = docData.empresaId || `emp_${emailNorm.replace(/[^a-zA-Z0-9]/g, '')}`;
    const status: StatusLicenca = docData.status || 'pending';
    const plano = docData.plano || null;
    
    const criadoEmDate = this.parseCriadoEmDate(docData.criadoEm || docData.createdAt);
    const trialInicio = docData.trialInicio || (criadoEmDate ? criadoEmDate.toISOString() : null);
    const trialFim = docData.trialFim || (criadoEmDate ? new Date(criadoEmDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null);
    const validade = docData.validade || null;
    const ativo = docData.ativo ?? true;
    const bloqueado = docData.bloqueado ?? false;

    return {
      email: emailNorm,
      empresaId,
      status,
      plano,
      trialInicio,
      trialFim,
      validade,
      ativo,
      bloqueado,
      criadoEm: docData.criadoEm || docData.createdAt,
      createdAt: docData.createdAt || docData.criadoEm,
      inicio: trialInicio || validade || (criadoEmDate ? criadoEmDate.toISOString() : new Date().toISOString()),
      fim: validade || trialFim || new Date().toISOString(),
      trialUtilizado: !!trialInicio || !!criadoEmDate,
      ultimaAtualizacao: docData.ultimaAtualizacao || new Date().toISOString()
    };
  },

  /**
   * Salva alterações de autorização exclusivamente no documento emailsAutorizados/{email}
   */
  async saveAutorizacao(email: string, updates: Partial<EmailAutorizado>): Promise<LicencaAtual> {
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm) throw new Error('E-mail obrigatório para salvar autorização.');

    const emailDocRef = doc(db, 'emailsAutorizados', emailNorm);
    
    // Consulta existente para preservar trial se já iniciado
    let existing: Partial<EmailAutorizado> | null = null;
    try {
      const snap = await getDoc(emailDocRef);
      if (snap.exists()) existing = snap.data() as EmailAutorizado;
    } catch (_) {}

    const preservedTrialInicio = existing?.trialInicio || updates.trialInicio || null;
    const preservedTrialFim = existing?.trialFim || updates.trialFim || null;

    const finalData: EmailAutorizado = {
      email: emailNorm,
      empresaId: updates.empresaId || existing?.empresaId || `emp_${emailNorm.replace(/[^a-zA-Z0-9]/g, '')}`,
      status: updates.status || existing?.status || 'pending',
      plano: updates.plano !== undefined ? updates.plano : (existing?.plano || null),
      trialInicio: preservedTrialInicio,
      trialFim: preservedTrialFim,
      validade: updates.validade !== undefined ? updates.validade : (existing?.validade || null),
      ativo: updates.ativo !== undefined ? updates.ativo : (existing?.ativo ?? true),
      bloqueado: updates.bloqueado !== undefined ? updates.bloqueado : (existing?.bloqueado ?? false),
      ultimaAtualizacao: new Date().toISOString()
    };

    // Salva no Firestore
    try {
      await setDoc(emailDocRef, finalData, { merge: true });
    } catch (e) {
      console.warn('[LicenseService] Falha ao salvar emailsAutorizados no Firestore:', e);
    }

    // Salva no cache LocalStorage
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${emailNorm}`, JSON.stringify(finalData));
    } catch (_) {}

    return this.mapDocToLicencaAtual(finalData, emailNorm);
  },

  /**
   * Inicia o período de teste de 7 dias no documento emailsAutorizados/{email}.
   * NUNCA reinicia nem recalcula o Trial se já foi iniciado anteriormente.
   */
  async iniciarTrial(email: string): Promise<LicencaAtual> {
    const emailNorm = email.trim().toLowerCase();
    const existing = await this.getLicencaByEmail(emailNorm);

    // Se trial já tiver sido iniciado ou utilizado antes, impede novo início
    if (existing?.trialInicio || existing?.trialFim) {
      console.warn('[LicenseService] Trial já foi iniciado anteriormente para este e-mail.');
      return existing;
    }

    const now = new Date();
    const trialInicio = now.toISOString();
    const trialFim = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    return await this.saveAutorizacao(emailNorm, {
      status: 'trial',
      plano: 'trial_7dias',
      trialInicio,
      trialFim,
      validade: trialFim,
      ativo: true,
      bloqueado: false
    });
  },

  /**
   * Ativa a licença no documento emailsAutorizados/{email}
   */
  async ativarLicenca(email: string, plano: string, dias = 30): Promise<LicencaAtual> {
    const emailNorm = email.trim().toLowerCase();
    const now = new Date();
    const validade = new Date(now.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();

    return await this.saveAutorizacao(emailNorm, {
      status: 'active',
      plano,
      validade,
      ativo: true,
      bloqueado: false
    });
  },

  /**
   * Valida rigorosamente a autorização e vigência do documento
   */
  validarLicenca(licenca: LicencaAtual | EmailAutorizado | null): { isValid: boolean; status: StatusLicenca; reason?: string } {
    if (!licenca) {
      return { isValid: false, status: 'blocked', reason: 'Documento de e-mail autorizado não encontrado.' };
    }

    if (licenca.bloqueado === true || licenca.ativo === false) {
      return { isValid: false, status: 'expired', reason: 'Acesso bloqueado ou inativo.' };
    }

    const validStatuses: StatusLicenca[] = ['pending', 'trial', 'active', 'pago', 'expired', 'blocked', 'cancelled', 'overdue'];
    if (!validStatuses.includes(licenca.status)) {
      return { isValid: false, status: 'blocked', reason: 'Status de licença desconhecido.' };
    }

    // Status "pago": Assinatura ou compra confirmada (acesso pleno e sem expiração de teste)
    if (licenca.status === 'pago') {
      return { isValid: true, status: 'pago' };
    }

    if (licenca.status === 'blocked') {
      return { isValid: false, status: 'blocked', reason: 'Conta bloqueada administrativamente.' };
    }

    if (licenca.status === 'expired') {
      return { isValid: false, status: 'expired', reason: 'Licença de uso expirada.' };
    }

    if (licenca.status === 'cancelled') {
      return { isValid: false, status: 'cancelled', reason: 'Assinatura cancelada.' };
    }

    if (licenca.status === 'overdue') {
      return { isValid: false, status: 'overdue', reason: 'Pagamento pendente / em atraso.' };
    }

    if (licenca.status === 'pending') {
      return { isValid: false, status: 'pending', reason: 'Aguardando ativação ou escolha de plano.' };
    }

    const now = Date.now();

    // Valida data do Trial
    if (licenca.status === 'trial') {
      // 1. Verifica trialFim se presente
      if (licenca.trialFim) {
        const trialFimMs = new Date(licenca.trialFim).getTime();
        if (!isNaN(trialFimMs) && now > trialFimMs) {
          return { isValid: false, status: 'expired', reason: 'O período de teste gratuito de 7 dias expirou.' };
        }
      }

      // 2. Verifica criadoEm diretamente (calcula se passaram mais de 7 dias)
      const criadoEmDate = this.parseCriadoEmDate((licenca as any).criadoEm || (licenca as any).createdAt || (licenca as any).trialInicio);
      if (criadoEmDate) {
        const diffMs = now - criadoEmDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 7) {
          return { isValid: false, status: 'expired', reason: 'O período de teste gratuito de 7 dias expirou.' };
        }
      }

      return { isValid: true, status: 'trial' };
    }

    // Valida data do Plano Ativo
    if (licenca.status === 'active') {
      const dateToCheck = licenca.validade || (licenca as LicencaAtual).fim;
      if (dateToCheck) {
        const valMs = new Date(dateToCheck).getTime();
        if (!isNaN(valMs) && now > valMs) {
          return { isValid: false, status: 'expired', reason: 'Assinatura expirada.' };
        }
      }
      return { isValid: true, status: 'active' };
    }

    return { isValid: false, status: licenca.status, reason: 'Licença inválida.' };
  },

  /**
   * Retorna informações de tempo restante do Trial
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

    if (isNaN(targetTime) || diffMs <= 0) {
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

  mapToLicenseObject(lic: LicencaAtual): License {
    const val = this.validarLicenca(lic);
    return {
      ...lic,
      id: `lic_${lic.empresaId.replace(/[^a-zA-Z0-9]/g, '')}`,
      trialAtivo: lic.status === 'trial' && val.isValid,
      trialDias: lic.status === 'trial' ? this.getTempoRestanteTrial(lic.trialFim).dias : 0,
      dataAtivacao: lic.inicio || lic.trialInicio || new Date().toISOString(),
      dataExpiracao: lic.validade || lic.trialFim || new Date().toISOString(),
      ultimaVerificacao: lic.ultimaAtualizacao,
      ultimaSincronizacao: lic.ultimaAtualizacao,
      isActive: val.isValid
    };
  },

  // Métodos retrocompatíveis
  async saveLicenca(empresaId: string, licenca: LicencaAtual, email?: string): Promise<LicencaAtual> {
    const emailToUse = email || licenca.email;
    if (emailToUse) {
      return await this.saveAutorizacao(emailToUse, {
        empresaId,
        status: licenca.status,
        plano: licenca.plano,
        trialInicio: licenca.trialInicio,
        trialFim: licenca.trialFim,
        validade: licenca.validade || licenca.fim
      });
    }
    return licenca;
  },

  async bloquearLicenca(email: string): Promise<License> {
    const lic = await this.saveAutorizacao(email, { status: 'blocked', bloqueado: true });
    return this.mapToLicenseObject(lic);
  },

  async liberarLicenca(email: string): Promise<License> {
    const lic = await this.saveAutorizacao(email, { status: 'active', ativo: true, bloqueado: false });
    return this.mapToLicenseObject(lic);
  },

  async encerrarPeriodoTeste(email: string): Promise<License> {
    const lic = await this.saveAutorizacao(email, { status: 'expired', trialFim: new Date().toISOString() });
    return this.mapToLicenseObject(lic);
  }
};
