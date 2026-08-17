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

    // Listener permanente onSnapshot() na coleção emailsAutorizados/{email} (Somente Leitura)
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
          // Documento não existe em emailsAutorizados: FAIL CLOSED (Não inventa tenant nem trial local)
          console.warn(`[LicenseProvider] Documento emailsAutorizados/${userEmail} não encontrado. Fail-Closed.`);
          const licPendente: LicencaAtual = {
            email: userEmail,
            empresaId: auth?.currentUser?.empresaId || '',
            status: 'pending',
            plano: null,
            validade: null,
            accessUntil: null,
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
      (error) => {
        console.warn('[LicenseProvider] Erro no listener onSnapshot (provavelmente offline):', error);
        // Cache local estritamente para visualização de UI - NUNCA concede acesso/autorização (Fail-Closed)
        const cachedLic = LicenseService.getLicencaLocal(userEmail);
        if (cachedLic) {
          setLicencaAtual(cachedLic);
          setLicense(LicenseService.mapToLicenseObject(cachedLic));
        } else {
          setLicencaAtual(null);
          setLicense(null);
        }
        // Em erro de comunicação com a fonte oficial: isValid = false (Fail-Closed)
        setIsValid(false);
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

  const value: LicenseContextType = {
    license,
    licencaAtual,
    isLoadingLicense,
    isValid,
    verificarStatus,
    refreshLicenca
  };

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
};
