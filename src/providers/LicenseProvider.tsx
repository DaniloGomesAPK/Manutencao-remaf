/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LicenseContext, LicenseContextType } from '../contexts/LicenseContext';
import { License, LicencaAtual, EmailAutorizado, StatusLicenca } from '../models/License';
import { LicenseService } from '../services/LicenseService';
import { AuthContext } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import { LogService } from '../services/LogService';

interface LicenseProviderProps {
  children: ReactNode;
}

export const LicenseProvider: React.FC<LicenseProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const userEmail = auth?.currentUser?.email?.trim().toLowerCase();

  const [license, setLicense] = useState<License | null>(null);
  const [licencaAtual, setLicencaAtual] = useState<LicencaAtual | null>(null);
  const [isLoadingLicense, setIsLoadingLicense] = useState<boolean>(true);
  const [isValid, setIsValid] = useState<boolean>(false);

  useEffect(() => {
    if (!userEmail) {
      setLicense(null);
      setLicencaAtual(null);
      setIsValid(false);
      setIsLoadingLicense(false);
      return;
    }

    setIsLoadingLicense(true);

    // Listener permanente onSnapshot() na coleção emailsAutorizados/{email}
    const docRef = doc(db, 'emailsAutorizados', userEmail);

    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.data() as EmailAutorizado;
          const lic = LicenseService.mapDocToLicencaAtual(rawData, userEmail);
          const mappedLicense = LicenseService.mapToLicenseObject(lic);
          const val = LicenseService.validarLicenca(lic);

          setLicencaAtual(lic);
          setLicense(mappedLicense);
          setIsValid(val.isValid);
          setIsLoadingLicense(false);

          // Log do snapshot
          LogService.logOperation(
            userEmail,
            'emailsAutorizados',
            userEmail,
            'listen',
            0,
            val.isValid ? null : `Licença inválida: ${val.status} (${val.reason})`
          );

          // Notificação amigável para trial em andamento
          if (lic.status === 'trial' && lic.trialFim && val.isValid) {
            const tempo = LicenseService.getTempoRestanteTrial(lic.trialFim);
            if (tempo.dias <= 1 && !tempo.expirou) {
              NotificationService.notify(
                'warning',
                'Período de Teste Terminando',
                `Restam apenas ${tempo.horas}h ${tempo.minutos}m para o fim do seu teste gratuito.`
              );
            }
          }

          // Se a licença for inválida (bloqueada, expirada, cancelada, overdue, ou trial > 7 dias)
          if (!val.isValid) {
            console.warn(`[LicenseProvider] Licença inválida detectada em tempo real para ${userEmail}:`, val);
            
            // Log de auditoria
            LogService.logError(
              'License',
              'LicenseProvider',
              `Acesso bloqueado por validação de licença: ${val.status} (${val.reason})`
            );
          }
        } else {
          // Documento não existe em emailsAutorizados: Verificar se é uma Empresa Trial em empresas/{empresaId}
          const empresaId = auth?.currentUser?.empresaId || localStorage.getItem('empresaId') || `emp_${auth?.currentUser?.id}`;
          
          if (empresaId) {
            try {
              const empRef = doc(db, 'empresas', empresaId);
              const empSnap = await getDoc(empRef);

              if (empSnap.exists()) {
                const empData = empSnap.data();
                const empCriadoEm = empData.criadoEm;
                let empCriadoEmDate: Date | null = null;
                if (empCriadoEm) {
                  if (typeof empCriadoEm.toDate === 'function') empCriadoEmDate = empCriadoEm.toDate();
                  else if (typeof empCriadoEm === 'object' && typeof empCriadoEm.seconds === 'number') empCriadoEmDate = new Date(empCriadoEm.seconds * 1000);
                  else if (typeof empCriadoEm === 'string' || typeof empCriadoEm === 'number') empCriadoEmDate = new Date(empCriadoEm);
                }

                const isEmpPago = empData.status === 'pago';
                let isEmpTrialExpired = false;
                if (!isEmpPago && empCriadoEmDate && !isNaN(empCriadoEmDate.getTime())) {
                  const diffDays = (Date.now() - empCriadoEmDate.getTime()) / (1000 * 60 * 60 * 24);
                  if (diffDays > 7) isEmpTrialExpired = true;
                }

                const resolvedStatus: StatusLicenca = isEmpPago ? 'pago' : (isEmpTrialExpired ? 'expired' : ((empData.status as StatusLicenca) || 'trial'));

                const licTrial: LicencaAtual = {
                  email: userEmail,
                  empresaId: empresaId,
                  status: resolvedStatus,
                  plano: isEmpPago ? (empData.plano || 'Plano Pago') : (isEmpTrialExpired ? null : 'Trial 7 Dias'),
                  validade: isEmpPago ? (empData.validade || null) : (isEmpTrialExpired ? new Date().toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
                  ativo: isEmpPago ? (empData.ativo ?? true) : !isEmpTrialExpired,
                  bloqueado: isEmpPago ? (empData.bloqueado ?? false) : isEmpTrialExpired,
                  criadoEm: empData.criadoEm,
                  trialInicio: empCriadoEmDate ? empCriadoEmDate.toISOString() : new Date().toISOString(),
                  trialFim: isEmpPago ? null : (empCriadoEmDate ? new Date(empCriadoEmDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
                };
                const mappedTrial = LicenseService.mapToLicenseObject(licTrial);
                const valTrial = LicenseService.validarLicenca(licTrial);

                setLicencaAtual(licTrial);
                setLicense(mappedTrial);
                setIsValid(valTrial.isValid);
                setIsLoadingLicense(false);
                return;
              }
            } catch (err: any) {
              console.warn('[LicenseProvider] Leitura de empresa trial falhou:', err);
              if (
                err?.code === 'permission-denied' ||
                err?.message?.toLowerCase().includes('permission-denied') ||
                err?.message?.toLowerCase().includes('insufficient permissions') ||
                err?.message?.toLowerCase().includes('permissão')
              ) {
                // Bloqueio de 7 dias acionado pelas Security Rules do Firebase!
                const licExpirada: LicencaAtual = {
                  email: userEmail,
                  empresaId: empresaId,
                  status: 'expired',
                  plano: null,
                  validade: new Date().toISOString(),
                  ativo: false,
                  bloqueado: true,
                  trialInicio: null,
                  trialFim: null,
                };
                setLicencaAtual(licExpirada);
                setLicense(LicenseService.mapToLicenseObject(licExpirada));
                setIsValid(false);
                setIsLoadingLicense(false);
                return;
              }
            }
          }

          console.warn(`[LicenseProvider] Documento emailsAutorizados/${userEmail} não existe.`);
          const licPendente: LicencaAtual = {
            email: userEmail,
            empresaId: empresaId || 'emp_default',
            status: 'pending',
            plano: null,
            validade: null,
            ativo: false,
            bloqueado: false,
            trialInicio: null,
            trialFim: null
          };
          setLicencaAtual(licPendente);
          setLicense(LicenseService.mapToLicenseObject(licPendente));
          setIsValid(false);
          setIsLoadingLicense(false);
        }
      },
      async (error) => {
        console.warn('[LicenseProvider] Erro no listener onSnapshot (provavelmente offline):', error);
        // Fallback para Offline First usando cache local
        const cachedLic = await LicenseService.getLicencaByEmail(userEmail);
        if (cachedLic) {
          const val = LicenseService.validarLicenca(cachedLic);
          setLicencaAtual(cachedLic);
          setLicense(LicenseService.mapToLicenseObject(cachedLic));
          setIsValid(val.isValid);
        } else {
          setIsValid(false);
        }
        setIsLoadingLicense(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userEmail]);

  // Effect para verificação contínua do tempo (cronômetro em segundo plano)
  useEffect(() => {
    if (!userEmail || !licencaAtual) return;

    const checarExpiracaoTemporal = async () => {
      const val = LicenseService.validarLicenca(licencaAtual);

      if (!val.isValid) {
        console.warn(`[LicenseProvider] Cronômetro detectou expiração/bloqueio para ${userEmail}:`, val);
        
        setIsValid(false);
        setLicencaAtual((prev) => (prev ? { ...prev, status: val.status as StatusLicenca } : null));
        setLicense((prev) => (prev ? { ...prev, status: val.status as StatusLicenca, isActive: false } : null));

        NotificationService.notify(
          'error',
          'Acesso Interrompido',
          val.reason || 'Sua licença expirou ou foi interrompida.'
        );

        LogService.logError(
          'License',
          'LicenseProvider',
          `Cronômetro: Bloqueio por expiração temporal (${val.status}): ${val.reason}`
        );
      }
    };

    // Executa a verificação a cada 30 segundos
    const intervalId = setInterval(checarExpiracaoTemporal, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [userEmail, licencaAtual, auth]);

  const refreshLicenca = async (): Promise<void> => {
    if (!userEmail) return;
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.getLicencaByEmail(userEmail);
      if (lic) {
        setLicencaAtual(lic);
        const mapped = LicenseService.mapToLicenseObject(lic);
        setLicense(mapped);
        const val = LicenseService.validarLicenca(lic);
        setIsValid(val.isValid);
      } else {
        setIsValid(false);
      }
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const verificarStatus = async (): Promise<boolean> => {
    if (!userEmail) return false;
    const lic = await LicenseService.getLicencaByEmail(userEmail);
    const val = LicenseService.validarLicenca(lic);
    setIsValid(val.isValid);
    return val.isValid;
  };

  const ativar = async (plano = 'Plano Mensal'): Promise<License> => {
    if (!userEmail) throw new Error('Usuário não autenticado.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.ativarLicenca(userEmail, plano, 30);
      setLicencaAtual(lic);
      const mapped = LicenseService.mapToLicenseObject(lic);
      setLicense(mapped);
      setIsValid(true);
      NotificationService.notify(
        'success',
        'Licença Ativada',
        `Sua licença (${plano}) foi ativada com sucesso.`
      );
      return mapped;
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const renovar = async (dias = 365): Promise<License> => {
    if (!userEmail) throw new Error('Usuário não autenticado.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.ativarLicenca(userEmail, 'Plano Anual', dias);
      setLicencaAtual(lic);
      const mapped = LicenseService.mapToLicenseObject(lic);
      setLicense(mapped);
      setIsValid(true);
      return mapped;
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const bloquear = async (): Promise<License> => {
    if (!userEmail) throw new Error('Usuário não autenticado.');
    const mapped = await LicenseService.bloquearLicenca(userEmail);
    setIsValid(false);
    return mapped;
  };

  const liberar = async (): Promise<License> => {
    if (!userEmail) throw new Error('Usuário não autenticado.');
    const mapped = await LicenseService.liberarLicenca(userEmail);
    setIsValid(true);
    return mapped;
  };

  const iniciarTrial = async (): Promise<License> => {
    if (!userEmail) throw new Error('Usuário não autenticado.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.iniciarTrial(userEmail);
      setLicencaAtual(lic);
      const mapped = LicenseService.mapToLicenseObject(lic);
      setLicense(mapped);
      const val = LicenseService.validarLicenca(lic);
      setIsValid(val.isValid);
      NotificationService.notify(
        'success',
        'Teste Gratuito Ativado',
        'Seu período de teste de 7 dias foi ativado!'
      );
      return mapped;
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const encerrarTrial = async (): Promise<License> => {
    if (!userEmail) throw new Error('Usuário não autenticado.');
    const mapped = await LicenseService.encerrarPeriodoTeste(userEmail);
    setIsValid(false);
    return mapped;
  };

  const value: LicenseContextType = {
    license,
    licencaAtual,
    isLoadingLicense,
    isValid,
    verificarStatus,
    refreshLicenca,
    ativar,
    renovar,
    bloquear,
    liberar,
    iniciarTrial,
    encerrarTrial
  };

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
};
