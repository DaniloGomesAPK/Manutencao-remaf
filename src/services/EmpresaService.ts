/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Empresa } from '../models/Empresa';
import { Usuario } from '../models/Usuario';
import { FirestoreRepository } from './FirestoreRepository';

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
   * Salva ou atualiza os dados da empresa via FirestoreRepository
   */
  async saveEmpresa(empresaData: Empresa, userEmail?: string): Promise<Empresa> {
    const timestamp = new Date().toISOString();
    const company: Empresa = {
      ...empresaData,
      id: empresaData.id,
      createdAt: empresaData.createdAt || timestamp,
      updatedAt: timestamp,
    };

    const saved = await FirestoreRepository.add<Empresa>('company_profile', company, company.id, userEmail);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('remaf_company_updated'));
    }

    return saved;
  },

  /**
   * Garante que uma empresa exista para o empresaId fornecido.
   */
  async ensureEmpresaExists(empresaId: string, usuario: Usuario): Promise<Empresa> {
    const existing = await this.getEmpresa(empresaId, usuario?.email);
    if (existing) {
      return existing;
    }

    const defaultCompany: Empresa = {
      id: empresaId,
      nomeFantasia: 'dG Gestão Automotiva',
      razaoSocial: 'dG Gestão Automotiva LTDA',
      cnpj: '00.000.000/0001-00',
      inscricaoEstadual: 'Isento',
      endereco: 'Rua Principal',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01000-000',
      telefone: '(11) 99999-9999',
      whatsapp: '(11) 99999-9999',
      email: usuario?.email || 'contato@empresa.com.br',
      usuarioProprietario: usuario,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.saveEmpresa(defaultCompany, usuario?.email);
  }
};
