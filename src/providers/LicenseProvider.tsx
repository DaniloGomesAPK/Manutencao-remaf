/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { LicenseContext, LicenseContextType } from '../contexts/LicenseContext';
import { License } from '../models/License';
import { LicenseService } from '../services/LicenseService';
import { AuthContext } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';

interface LicenseProviderProps {
  children: ReactNode;
}

export const LicenseProvider: React.FC<LicenseProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const empresaId = auth?.currentUser?.empresaId;

  const [license, setLicense] = useState<License | null>(null);
  const [isLoadingLicense, setIsLoadingLicense] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(true);

  const loadLicense = async () => {
    if (!empresaId) {
      setLicense(null);
      setIsValid(false);
      return;
    }

    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.getLicense(empresaId);
      setLicense(lic);
      if (lic) {
        const isExp = LicenseService.verificarExpiracao(lic);
        const active = lic.isActive && lic.status === 'ativo' && !isExp;
        setIsValid(active);

        // Notificar se a licença estiver próxima de expirar (ex: menos de 5 dias)
        const expiryTime = new Date(lic.dataExpiracao).getTime();
        const daysLeft = Math.ceil((expiryTime - Date.now()) / (24 * 60 * 60 * 1000));
        if (active && daysLeft > 0 && daysLeft <= 5) {
          NotificationService.notify(
            'warning',
            'Sua licença expira em breve',
            `Restam apenas ${daysLeft} dias para renovação de seu plano ${lic.plano}.`
          );
        } else if (isExp && lic.status === 'ativo') {
          NotificationService.notify(
            'error',
            'Licença Expirada',
            `Sua licença expirou em ${new Date(lic.dataExpiracao).toLocaleDateString()}. Renove para continuar utilizando todos os recursos.`
          );
        }
      }
    } catch (err) {
      console.error('Erro ao carregar licença:', err);
    } finally {
      setIsLoadingLicense(false);
    }
  };

  useEffect(() => {
    loadLicense();
  }, [empresaId]);

  const verificarStatus = async (): Promise<boolean> => {
    if (!empresaId) return false;
    const status = await LicenseService.verificarLicenca(empresaId);
    setIsValid(status);
    return status;
  };

  const ativar = async (plano = 'SaaS Versão Profissional'): Promise<License> => {
    if (!empresaId) throw new Error('Nenhuma empresa ativa.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.ativarLicenca(empresaId, plano);
      setLicense(lic);
      setIsValid(true);
      NotificationService.notify(
        'success',
        'Licença Ativada',
        `Parabéns! Sua licença do plano ${plano} foi ativada com sucesso.`
      );
      return lic;
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

  const iniciarTrial = async (dias = 15): Promise<License> => {
    if (!empresaId) throw new Error('Nenhuma empresa ativa.');
    setIsLoadingLicense(true);
    try {
      const lic = await LicenseService.iniciarPeriodoTeste(empresaId, dias);
      setLicense(lic);
      setIsValid(true);
      NotificationService.notify(
        'info',
        'Período de Testes Iniciado',
        `Seu período de avaliação gratuita de ${dias} dias foi ativado.`
      );
      return lic;
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const registrarAlteracaoManual = async () => {
    await loadLicense();
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
    isLoadingLicense,
    isValid,
    verificarStatus,
    ativar,
    renovar,
    bloquear,
    liberar,
    iniciarTrial,
    encerrarTrial
  };

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
};
