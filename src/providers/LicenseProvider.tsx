/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { LicenseContext, LicenseContextType } from '../contexts/LicenseContext';
import { License, LicencaAtual } from '../models/License';
import { LicenseService } from '../services/LicenseService';
import { AuthContext } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';

interface LicenseProviderProps {
  children: ReactNode;
}

export const LicenseProvider: React.FC<LicenseProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const empresaId = auth?.currentUser?.empresaId;
  const userId = auth?.currentUser?.id;

  const [license, setLicense] = useState<License | null>(null);
  const [licencaAtual, setLicencaAtual] = useState<LicencaAtual | null>(null);
  const [isLoadingLicense, setIsLoadingLicense] = useState<boolean>(true);
  const [isValid, setIsValid] = useState<boolean>(true);

  const loadLicense = async () => {
    if (!empresaId) {
      setLicense(null);
      setLicencaAtual(null);
      setIsValid(false);
      setIsLoadingLicense(false);
      return;
    }

    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.getLicenca(empresaId, userId);
      setLicencaAtual(lic);

      if (lic) {
        const mapped = LicenseService.mapToLicenseObject(lic);
        setLicense(mapped);

        const validation = LicenseService.validarLicenca(lic);
        setIsValid(validation.isValid);

        // Notificação amigável para trial / expiração próxima
        if (lic.status === 'trial' && lic.trialFim) {
          const tempo = LicenseService.getTempoRestanteTrial(lic.trialFim);
          if (tempo.dias <= 1 && !tempo.expirou) {
            NotificationService.notify(
              'warning',
              'Período de Teste Terminando',
              `Restam apenas ${tempo.horas}h ${tempo.minutos}m para o fim do seu teste gratuito.`
            );
          }
        }
      } else {
        setIsValid(false);
      }
    } catch (err) {
      console.error('[LicenseProvider] Erro ao carregar licença:', err);
    } finally {
      setIsLoadingLicense(false);
    }
  };

  useEffect(() => {
    if (empresaId) {
      setIsLoadingLicense(true);
      loadLicense();
    } else {
      setLicense(null);
      setLicencaAtual(null);
      setIsValid(false);
      setIsLoadingLicense(false);
    }
  }, [empresaId, userId]);

  const refreshLicenca = async (): Promise<void> => {
    await loadLicense();
  };

  const verificarStatus = async (): Promise<boolean> => {
    if (!empresaId) return false;
    const lic = await LicenseService.getLicenca(empresaId, userId);
    const validation = LicenseService.validarLicenca(lic);
    setIsValid(validation.isValid);
    return validation.isValid;
  };

  const ativar = async (plano = 'Plano Mensal'): Promise<License> => {
    if (!empresaId) throw new Error('Nenhuma empresa ativa.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.ativarLicenca(empresaId, plano, 30, 'manual');
      setLicencaAtual(lic);
      const mapped = LicenseService.mapToLicenseObject(lic);
      setLicense(mapped);
      setIsValid(true);
      NotificationService.notify(
        'success',
        'Licença Ativada',
        `Parabéns! Sua licença do ${plano} foi ativada com sucesso.`
      );
      return mapped;
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const renovar = async (dias = 365): Promise<License> => {
    if (!empresaId) throw new Error('Nenhuma empresa ativa.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.renovarLicenca(empresaId, dias);
      setLicense(lic);
      setIsValid(true);
      NotificationService.notify(
        'success',
        'Licença Renovada',
        `Sua licença foi renovada por mais ${dias} dias.`
      );
      return lic;
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const bloquear = async (): Promise<License> => {
    if (!empresaId) throw new Error('Nenhuma empresa ativa.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.bloquearLicenca(empresaId);
      setLicense(lic);
      setIsValid(false);
      NotificationService.notify(
        'error',
        'Licença Bloqueada',
        'Esta licença de uso foi suspensa administrativamente.'
      );
      return lic;
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const liberar = async (): Promise<License> => {
    if (!empresaId) throw new Error('Nenhuma empresa ativa.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.liberarLicenca(empresaId);
      setLicense(lic);
      setIsValid(true);
      NotificationService.notify(
        'success',
        'Licença Reativada',
        'Sua licença de uso foi liberada e está pronta para uso.'
      );
      return lic;
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const iniciarTrial = async (): Promise<License> => {
    if (!empresaId) throw new Error('Nenhuma empresa ativa.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.iniciarTrial(empresaId, userId);
      setLicencaAtual(lic);
      const mapped = LicenseService.mapToLicenseObject(lic);
      setLicense(mapped);
      setIsValid(true);
      NotificationService.notify(
        'success',
        'Teste Gratuito Ativado',
        'Seu período de teste de 3 dias com acesso total foi iniciado!'
      );
      return mapped;
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const encerrarTrial = async (): Promise<License> => {
    if (!empresaId) throw new Error('Nenhuma empresa ativa.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.encerrarPeriodoTeste(empresaId);
      setLicense(lic);
      setIsValid(false);
      NotificationService.notify(
        'warning',
        'Período de Testes Finalizado',
        'Sua avaliação gratuita expirou. Ative sua licença para continuar operando.'
      );
      return lic;
    } finally {
      setIsLoadingLicense(false);
    }
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
