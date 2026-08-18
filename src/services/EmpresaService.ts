/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Empresa } from '../models/Empresa';
import { Usuario } from '../models/Usuario';
import { FirestoreRepository } from './FirestoreRepository';
import { IntegridadeService } from './IntegridadeService';

export const EmpresaService = {
  /**
   * Obtém os dados da empresa pelo empresaId via FirestoreRepository
   */
  async getEmpresa(empresaId: string, userEmail?: string): Promise<Empresa | null> {
    const list = await FirestoreRepository.getAll<Empresa>('company_profile', empresaId, userEmail);
    if (list.length > 0) {
      return list[0];
    }
    return null;
  },

  /**
   * Salva ou atualiza os dados da empresa via FirestoreRepository após validação de duplicidade de CNPJ
   */
  async saveEmpresa(empresaData: Empresa, userEmail?: string): Promise<Empresa> {
    const timestamp = new Date().toISOString();
    const company: Empresa = {
      ...empresaData,
      id: empresaData.id,
      createdAt: empresaData.createdAt || timestamp,
      updatedAt: timestamp,
    };

    if (company.cnpj) {
      const dupValidation = await IntegridadeService.validateEmpresaDuplicates(company.cnpj, company.id, userEmail);
      if (!dupValidation.valid) {
        throw new Error(dupValidation.message || 'CNPJ já cadastrado em outra empresa.');
      }
    }

    const saved = await FirestoreRepository.add<Empresa>('company_profile', company, company.id, userEmail);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('remaf_company_updated'));
    }

    return saved;
  },

  /**
   * Garante que uma empresa exista para o empresaId fornecido.
   */
  async ensureEmpresaExists(empresaId: string, usuario: Usuario): Promise<Empresa | null> {
    if (!empresaId || !empresaId.trim()) {
      return null;
    }
    const existing = await this.getEmpresa(empresaId, usuario?.email);
    if (existing) {
      return existing;
    }

    let perfilEmpresa = 'Oficina Mecânica';
    let nomeEmpresa = 'DG Gestão em Orçamentos';
    let whatsapp = '(11) 99999-9999';

    try {
      const empresaDocRef = doc(db, 'empresas', empresaId);
      const snap = await getDoc(empresaDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.perfilEmpresa) perfilEmpresa = data.perfilEmpresa;
        if (data.nomeEmpresa) nomeEmpresa = data.nomeEmpresa;
        if (data.whatsapp) whatsapp = data.whatsapp;
      }
    } catch (_) {
      // Ignora erro de acesso direto se for offline
    }

    const defaultCompany: Empresa = {
      id: empresaId,
      nomeFantasia: nomeEmpresa,
      razaoSocial: nomeEmpresa,
      cnpj: '',
      inscricaoEstadual: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      telefone: whatsapp,
      whatsapp: whatsapp,
      email: usuario?.email || 'contato@empresa.com.br',
      perfilEmpresa: perfilEmpresa,
      configuracaoInicialConcluida: false,
      usuarioProprietario: usuario,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.saveEmpresa(defaultCompany, usuario?.email);
  }
};
