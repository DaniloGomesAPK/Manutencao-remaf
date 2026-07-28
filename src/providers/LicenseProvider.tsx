/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LicenseContext, LicenseContextType } from '../contexts/LicenseContext';
import { License, LicencaAtual, EmailAutorizado } from '../models/License';
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

          // Se a licença for inválida (bloqueada, expirada, cancelada, overdue) ou se validade < now
          if (!val.isValid) {
            console.warn(`[LicenseProvider] Licença inválida detectada em tempo real para ${userEmail}:`, val);
            NotificationService.notify(
              'error',
              'Acesso Interrompido',
              val.reason || 'Sua licença não permite o acesso.'
            );

            // Desconexão automática do usuário e limpeza da sessão
            if (val.status === 'blocked' || val.status === 'expired' || val.status === 'cancelled' || val.status === 'overdue') {
              LogService.logError(
                'License',
                'LicenseProvider',
                `Desconexão automática por licença inválida: ${val.status} (${val.reason})`
              );
              await auth?.logout();
            }
          }
        } else {
          // Documento não existe em emailsAutorizados
          console.warn(`[LicenseProvider] Documento emailsAutorizados/${userEmail} não existe.`);
          setLicense(null);
          setLicencaAtual(null);
          setIsValid(false);
          setIsLoadingLicense(false);

          LogService.logError(
            'License',
            'LicenseProvider',
            `Acesso negado: Documento não encontrado em emailsAutorizados/${userEmail}`
          );
          NotificationService.notify(
            'error',
            'Acesso Não Autorizado',
            'Seu e-mail não foi encontrado na lista de e-mails autorizados.'
          );
          await auth?.logout();
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
        'Seu período de teste de 3 dias foi ativado!'
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
