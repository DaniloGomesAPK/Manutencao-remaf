/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { EmailAutorizado, LicencaAtual, License, StatusLicenca } from '../models/License';

const LOCAL_STORAGE_PREFIX = 'dg_license_';

export const LicenseService = {
  /**
   * Obtém a autorização e licença do usuário diretamente pelo e-mail
   * na coleção emailsAutorizados/{email} no Firestore.
   * Em caso de falha de conexão ou ausência, retorna null (Fail-Closed).
   * O cache local é mantido exclusivamente para exibição de UI através de getLicencaLocal().
   */
  async getLicencaByEmail(email: string): Promise<LicencaAtual | null> {
    const emailNorm = email?.trim().toLowerCase();
    if (!emailNorm) return null;

    // 1. Consulta o Firestore emailsAutorizados/{email} (Única fonte de verdade)
    try {
      const emailDocRef = doc(db, 'emailsAutorizados', emailNorm);
      const docSnap = await getDoc(emailDocRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as EmailAutorizado;
        const lic = this.mapDocToLicencaAtual(data, emailNorm);
        this.saveLicencaLocal(emailNorm, data);
        return lic;
      }
    } catch (e) {
      console.warn('[LicenseService] Falha ao consultar emailsAutorizados no Firestore (Fail-Closed):', e);
      return null;
    }

    return null;
  },

  /**
   * Salva o cache de licença no LocalStorage
   */
  saveLicencaLocal(email: string, data: EmailAutorizado): void {
    try {
      const emailNorm = email.trim().toLowerCase();
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${emailNorm}`, JSON.stringify(data));
    } catch (_) {}
  },

  /**
   * Recupera o cache de licença do LocalStorage
   */
  getLicencaLocal(email: string): LicencaAtual | null {
    try {
      const emailNorm = email.trim().toLowerCase();
      const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${emailNorm}`);
      if (cached) {
        const parsed = JSON.parse(cached) as EmailAutorizado;
        return this.mapDocToLicencaAtual(parsed, emailNorm);
      }
    } catch (_) {}
    return null;
  },

  /**
   * Busca por empresaId (retrocompatibilidade com fallback)
   */
  async getLicenca(empresaId: string): Promise<LicencaAtual | null> {
    if (!empresaId) return null;

    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_STORAGE_PREFIX));
      for (const k of keys) {
        const item = localStorage.getItem(k);
        if (item) {
          const parsed = JSON.parse(item) as EmailAutorizado;
          if (parsed.empresaId === empresaId) {
            return this.mapDocToLicencaAtual(parsed, parsed.email);
          }
        }
      }
    } catch (_) {}

    return null;
  },

  /**
   * Converte data ISO, Timestamp ou número para Date
   */
  parseCriadoEmDate(criadoEm: any): Date | null {
    if (!criadoEm) return null;
    if (typeof criadoEm.toDate === 'function') return criadoEm.toDate();
    if (typeof criadoEm === 'object' && typeof criadoEm.seconds === 'number') return new Date(criadoEm.seconds * 1000);
    if (typeof criadoEm === 'string' || typeof criadoEm === 'number') {
      const d = new Date(criadoEm);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  },

  /**
   * Mapeia o documento de emailsAutorizados para o objeto de LicencaAtual
   */
  mapDocToLicencaAtual(data: EmailAutorizado, emailFallback: string): LicencaAtual {
    const rawStatus = (data.status || 'pending') as StatusLicenca;
    const isAtivo = data.ativo === true;
    const isBloqueado = data.bloqueado === true;

    let finalStatus: StatusLicenca = rawStatus;
    if (isBloqueado) {
      finalStatus = 'blocked';
    } else if (!isAtivo) {
      finalStatus = 'expired';
    }

    const rawAny = data as any;
    const effectiveValidade = data.validade || data.trialFim || rawAny.dataExpiracaoTrial || null;

    return {
      id: `lic_${data.email ? data.email.replace(/[^a-zA-Z0-9]/g, '') : emailFallback.replace(/[^a-zA-Z0-9]/g, '')}`,
      email: data.email || emailFallback,
      empresaId: data.empresaId || '',
      status: finalStatus,
      plano: data.plano || (data.status === 'trial' ? 'Trial 7 Dias' : null),
      inicio: data.trialInicio || rawAny.dataCriacao || null,
      fim: effectiveValidade,
      trialInicio: data.trialInicio || rawAny.dataCriacao || null,
      trialFim: data.trialFim || rawAny.dataExpiracaoTrial || null,
      validade: effectiveValidade,
      accessUntil: data.accessUntil || effectiveValidade,
      ativo: isAtivo,
      bloqueado: isBloqueado,
      criadoEm: rawAny.dataCriacao || rawAny.createdAt || data.trialInicio || null,
      ultimaAtualizacao: data.ultimaAtualizacao || rawAny.updatedAt || new Date().toISOString()
    };
  },

  /**
   * Valida rigorosamente a autorização e vigência do documento.
   * Exige:
   * 1. ativo === true e bloqueado !== true.
   * 2. Licenças pagas ('pago'/'active'): accessUntil existente, conversível e no futuro.
   * 3. Trial ('trial'): data de expiração confiável (accessUntil, trialFim ou criadoEm válido) e vigência não expirada.
   */
  validarLicenca(licenca: LicencaAtual | EmailAutorizado | null): { isValid: boolean; status: StatusLicenca; reason?: string } {
    if (!licenca) {
      return { isValid: false, status: 'blocked', reason: 'Documento de e-mail autorizado não encontrado.' };
    }

    if (licenca.bloqueado === true || licenca.ativo !== true) {
      return { isValid: false, status: licenca.bloqueado === true ? 'blocked' : 'expired', reason: 'Acesso bloqueado ou inativo (ativo !== true).' };
    }

    const validStatuses: StatusLicenca[] = ['pending', 'trial', 'active', 'pago', 'expired', 'blocked', 'cancelled', 'overdue'];
    if (!validStatuses.includes(licenca.status)) {
      return { isValid: false, status: 'blocked', reason: 'Status de licença desconhecido.' };
    }

    if (licenca.status === 'blocked') {
      return { isValid: false, status: 'blocked', reason: 'Conta bloqueada administrativamente.' };
    }

    if (licenca.status === 'cancelled') {
      return { isValid: false, status: 'cancelled', reason: 'Assinatura cancelada.' };
    }

    if (licenca.status === 'expired') {
      return { isValid: false, status: 'expired', reason: 'Licença de uso expirada.' };
    }

    if (licenca.status === 'overdue') {
      return { isValid: false, status: 'overdue', reason: 'Pagamento pendente / em atraso.' };
    }

    if (licenca.status === 'pending') {
      return { isValid: false, status: 'pending', reason: 'Aguardando ativação ou escolha de plano.' };
    }

    const now = Date.now();

    // Helper para extrair ms de data de expiração / accessUntil
    const getAccessUntilMs = (): number | null => {
      const field = (licenca as any).accessUntil || licenca.validade || (licenca as LicencaAtual).fim;
      if (!field) return null;
      if (typeof field.toMillis === 'function') return field.toMillis();
      if (typeof field.toDate === 'function') return field.toDate().getTime();
      if (typeof field.seconds === 'number') return field.seconds * 1000;
      if (typeof field === 'string' || typeof field === 'number') {
        const d = new Date(field);
        return isNaN(d.getTime()) ? null : d.getTime();
      }
      return null;
    };

    // Validação estrita para licenças pagas ('pago' ou 'active'):
    // Exige estritamente accessUntil existente, conversível e no futuro (Fail-Closed)
    if (licenca.status === 'pago' || licenca.status === 'active') {
      const expMs = getAccessUntilMs();
      if (expMs === null || isNaN(expMs) || now >= expMs) {
        return { 
          isValid: false, 
          status: 'expired', 
          reason: expMs === null 
            ? 'Licença paga sem vigência confiável (accessUntil ausente ou inválido).' 
            : 'Licença paga ou assinatura expirada.' 
        };
      }
      return { isValid: true, status: licenca.status };
    }

    // Validação estrita para período de Trial (7 dias):
    // Exige uma data de expiração confiável (accessUntil, trialFim ou data de criação com cálculo de 7 dias).
    // Trial sem informação suficiente é bloqueado (Fail-Closed).
    if (licenca.status === 'trial') {
      let hasReliableDate = false;

      // 1. Verifica accessUntil / validade
      const expMs = getAccessUntilMs();
      if (expMs !== null && !isNaN(expMs)) {
        hasReliableDate = true;
        if (now >= expMs) {
          return { isValid: false, status: 'expired', reason: 'O período de teste gratuito de 7 dias expirou.' };
        }
      }

      // 2. Verifica trialFim
      if (licenca.trialFim) {
        const trialFimMs = new Date(licenca.trialFim).getTime();
        if (!isNaN(trialFimMs)) {
          hasReliableDate = true;
          if (now > trialFimMs) {
            return { isValid: false, status: 'expired', reason: 'O período de teste gratuito de 7 dias expirou.' };
          }
        }
      }

      // 3. Verifica criadoEm / trialInicio (limite estrito de 7 dias)
      const criadoEmDate = this.parseCriadoEmDate((licenca as any).criadoEm || (licenca as any).createdAt || (licenca as any).trialInicio);
      if (criadoEmDate && !isNaN(criadoEmDate.getTime())) {
        hasReliableDate = true;
        const diffMs = now - criadoEmDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 7) {
          return { isValid: false, status: 'expired', reason: 'O período de teste gratuito de 7 dias expirou.' };
        }
      }

      // Se não existir nenhuma data válida para determinar o vencimento: FAIL CLOSED
      if (!hasReliableDate) {
        return { 
          isValid: false, 
          status: 'expired', 
          reason: 'Período de teste sem data de expiração confiável. Acesso bloqueado.' 
        };
      }

      return { isValid: true, status: 'trial' };
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
  }
};
