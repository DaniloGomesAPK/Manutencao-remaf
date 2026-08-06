/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FirestoreRepository } from './FirestoreRepository';
import { LogService } from './LogService';
import { Cliente, Equipamento, OrdemDeServico, LancamentoFinanceiro } from '../types';

export type TipoRegistroLixeira = 
  | 'Cliente'
  | 'Equipamento'
  | 'Orçamento'
  | 'Ordem de Serviço'
  | 'Financeiro'
  | 'Serviço'
  | 'Técnico'
  | 'Categoria';

export interface RegistroLixeira {
  id: string; // ID do registro na lixeira
  originalId: string; // ID original do documento
  colecaoOrigem: string; // Coleção de origem ('clientes', 'equipamentos', 'ordensServico', etc.)
  tipo: TipoRegistroLixeira;
  nome: string; // Nome ou título representativo
  identificacao: string; // CPF/CNPJ, Série/Patrimônio, número da OS, etc.
  deletedAt: string; // Data e hora da exclusão lógica (ISO)
  deletedBy: string; // Usuário que solicitou a exclusão
  empresaId: string; // Tenant Multiempresa
  expiresAt: string; // Data prevista para remoção definitiva (ISO - 30 dias por padrão)
  dadosOriginais: any; // Cópia fiel do objeto original
  status: 'Ativo' | 'Restaurado' | 'Excluído Definitivamente';
}

export interface DependencyCheckResult {
  hasDependencies: boolean;
  dependentItemsInTrash: RegistroLixeira[];
  activeDependenciesCount: number;
  activeDependenciesBreakdown: {
    ordensServico: number;
    financeiro: number;
    orcamentos: number;
    equipamentos: number;
  };
  summaryText: string;
}

export const RETENTION_DAYS = 30;

export const RecuperacaoService = {
  /**
   * Realiza a Exclusão Lógica (Soft Delete) do registro.
   * Salva o registro na coleção 'lixeira' com metadados de retenção e auditoria,
   * e remove da coleção ativa.
   */
  async softDeleteRecord(
    colecaoOrigem: string,
    docId: string,
    tipo: TipoRegistroLixeira,
    nome: string,
    identificacao: string,
    empresaId: string,
    userEmail?: string,
    dadosOriginaisPayload?: any
  ): Promise<RegistroLixeira> {
    if (!empresaId || !docId) {
      throw new Error('EmpresaId e docId são obrigatórios para exclusão lógica.');
    }

    const timestamp = new Date().toISOString();
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + RETENTION_DAYS);
    const expiresAt = expiresDate.toISOString();

    let dadosOriginais = dadosOriginaisPayload;
    if (!dadosOriginais) {
      dadosOriginais = await FirestoreRepository.get(colecaoOrigem, docId, empresaId, userEmail);
    }

    if (!dadosOriginais) {
      dadosOriginais = { id: docId, empresaId, nome, identificacao };
    }

    const lixeiraId = `trash_${colecaoOrigem}_${docId}`;

    const registroLixeira: RegistroLixeira = {
      id: lixeiraId,
      originalId: docId,
      colecaoOrigem,
      tipo,
      nome: nome || 'Sem nome',
      identificacao: identificacao || docId,
      deletedAt: timestamp,
      deletedBy: userEmail || 'usuario_sistema',
      empresaId,
      expiresAt,
      dadosOriginais,
      status: 'Ativo',
    };

    // 1. Grava na lixeira
    await FirestoreRepository.add('lixeira', registroLixeira, empresaId, userEmail);

    // 2. Remove da coleção original ativa
    await FirestoreRepository.delete(colecaoOrigem, docId, empresaId, userEmail);

    // 3. Auditoria via LogService
    LogService.logOperation(
      userEmail || 'usuario_sistema',
      colecaoOrigem,
      docId,
      'soft_delete' as any,
      0,
      `Exclusão lógica de ${tipo} (${nome}) enviada para a Central de Recuperação.`
    );

    return registroLixeira;
  },

  /**
   * Busca todos os registros na Lixeira do tenant
   */
  async getRegistrosLixeira(empresaId: string, userEmail?: string): Promise<RegistroLixeira[]> {
    if (!empresaId) return [];
    try {
      const items = await FirestoreRepository.getAll<RegistroLixeira>('lixeira', empresaId, userEmail);
      // Retorna apenas registros ativos na lixeira
      return items.filter(item => item.status !== 'Restaurado' && item.status !== 'Excluído Definitivamente');
    } catch (err) {
      console.error('[RecuperacaoService] Erro ao buscar registros da lixeira:', err);
      return [];
    }
  },

  /**
   * Calcula os dias restantes para retenção (30 dias padrão)
   */
  calculateDaysRemaining(deletedAt: string, expiresAt?: string): number {
    try {
      const targetDate = expiresAt 
        ? new Date(expiresAt).getTime() 
        : new Date(deletedAt).getTime() + (RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const now = Date.now();
      const diffMs = targetDate - now;
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    } catch (_) {
      return RETENTION_DAYS;
    }
  },

  /**
   * Restauração Inteligente: verifica dependências que também estão na lixeira
   * e métricas de dependências ativas no sistema.
   */
  async checkRestoreDependencies(
    registro: RegistroLixeira,
    empresaId: string,
    userEmail?: string
  ): Promise<DependencyCheckResult> {
    const trashItems = await this.getRegistrosLixeira(empresaId, userEmail);
    const dependentItemsInTrash: RegistroLixeira[] = [];

    const breakdown = {
      ordensServico: 0,
      financeiro: 0,
      orcamentos: 0,
      equipamentos: 0,
    };

    const payload = registro.dadosOriginais || {};

    // Se o registro sendo restaurado é uma OS ou Orçamento, verifica se Cliente/Equipamento/Técnico também estão na lixeira
    if (registro.tipo === 'Orçamento' || registro.tipo === 'Ordem de Serviço') {
      const clienteId = payload.clienteId;
      const equipamentoId = payload.equipamentoId;

      if (clienteId) {
        const deletedCliente = trashItems.find(t => t.colecaoOrigem === 'clientes' && t.originalId === clienteId);
        if (deletedCliente) dependentItemsInTrash.push(deletedCliente);
      }

      if (equipamentoId) {
        const deletedEq = trashItems.find(t => t.colecaoOrigem === 'equipamentos' && t.originalId === equipamentoId);
        if (deletedEq) dependentItemsInTrash.push(deletedEq);
      }
    }

    // Se é um Lançamento Financeiro, verifica se Cliente ou OS estão na lixeira
    if (registro.tipo === 'Financeiro') {
      if (payload.clienteId) {
        const deletedCliente = trashItems.find(t => t.colecaoOrigem === 'clientes' && t.originalId === payload.clienteId);
        if (deletedCliente) dependentItemsInTrash.push(deletedCliente);
      }
      if (payload.osId) {
        const deletedOS = trashItems.find(t => t.colecaoOrigem === 'ordensServico' && t.originalId === payload.osId);
        if (deletedOS) dependentItemsInTrash.push(deletedOS);
      }
    }

    // Se é um Equipamento, verifica se o Cliente dono está na lixeira
    if (registro.tipo === 'Equipamento') {
      if (payload.clienteId) {
        const deletedCliente = trashItems.find(t => t.colecaoOrigem === 'clientes' && t.originalId === payload.clienteId);
        if (deletedCliente) dependentItemsInTrash.push(deletedCliente);
      }
    }

    // Busca também contagem de dependências ativas no sistema para informar o usuário (Contador de Dependências)
    const [ordens, financeiroList] = await Promise.all([
      FirestoreRepository.getAll<OrdemDeServico>('ordensServico', empresaId, userEmail),
      FirestoreRepository.getAll<LancamentoFinanceiro>('financeiro', empresaId, userEmail),
    ]);

    let activeCount = 0;
    if (registro.tipo === 'Cliente') {
      const activeOS = ordens.filter(os => os.clienteId === registro.originalId || os.clienteNome?.trim().toLowerCase() === registro.nome.trim().toLowerCase());
      breakdown.ordensServico = activeOS.filter(os => (os as any).status !== 'Orçamento' && (os as any).tipo !== 'Orçamento').length;
      breakdown.orcamentos = activeOS.filter(os => (os as any).status === 'Orçamento' || (os as any).tipo === 'Orçamento').length;

      const activeFin = financeiroList.filter(f => f.clienteId === registro.originalId || f.clienteNome?.trim().toLowerCase() === registro.nome.trim().toLowerCase());
      breakdown.financeiro = activeFin.length;

      activeCount = breakdown.ordensServico + breakdown.orcamentos + breakdown.financeiro;
    } else if (registro.tipo === 'Equipamento') {
      const activeOS = ordens.filter(os => os.equipamentoId === registro.originalId || os.numeroSerie === registro.identificacao || os.patrimonio === registro.identificacao);
      breakdown.ordensServico = activeOS.filter(os => (os as any).status !== 'Orçamento' && (os as any).tipo !== 'Orçamento').length;
      breakdown.orcamentos = activeOS.filter(os => (os as any).status === 'Orçamento' || (os as any).tipo === 'Orçamento').length;
      activeCount = breakdown.ordensServico + breakdown.orcamentos;
    }

    const summaryParts: string[] = [];
    if (breakdown.ordensServico > 0) summaryParts.push(`${breakdown.ordensServico} Ordem(ns) de Serviço`);
    if (breakdown.financeiro > 0) summaryParts.push(`${breakdown.financeiro} Lançamento(s) Financeiro(s)`);
    if (breakdown.orcamentos > 0) summaryParts.push(`${breakdown.orcamentos} Orçamento(s)`);
    if (breakdown.equipamentos > 0) summaryParts.push(`${breakdown.equipamentos} Equipamento(s)`);

    return {
      hasDependencies: dependentItemsInTrash.length > 0,
      dependentItemsInTrash,
      activeDependenciesCount: activeCount,
      activeDependenciesBreakdown: breakdown,
      summaryText: summaryParts.length > 0 ? summaryParts.join(', ') : 'Nenhuma dependência ativa vinculada',
    };
  },

  /**
   * Restaura o registro da lixeira.
   * Se restoreCascade = true, restaura também em lote as dependências que estavam na lixeira.
   */
  async restoreRecord(
    registro: RegistroLixeira,
    empresaId: string,
    restoreCascade: boolean = false,
    userEmail?: string
  ): Promise<void> {
    if (!registro || !empresaId) return;

    if (restoreCascade) {
      const depCheck = await this.checkRestoreDependencies(registro, empresaId, userEmail);
      if (depCheck.hasDependencies) {
        for (const dep of depCheck.dependentItemsInTrash) {
          await this.restoreRecord(dep, empresaId, false, userEmail);
        }
        LogService.logOperation(
          userEmail || 'usuario',
          registro.colecaoOrigem,
          registro.originalId,
          'restore_cascade' as any,
          0,
          `Restauração em lote acionada para dependências de ${registro.tipo} (${registro.nome}).`
        );
      }
    }

    // 1. Devolve o objeto original para a coleção de origem
    const payload = registro.dadosOriginais || { id: registro.originalId, empresaId };
    await FirestoreRepository.add(registro.colecaoOrigem, payload, empresaId, userEmail);

    // 2. Remove o registro da lixeira
    await FirestoreRepository.delete('lixeira', registro.id, empresaId, userEmail);

    // 3. Registrar auditoria no LogService
    LogService.logOperation(
      userEmail || 'usuario',
      registro.colecaoOrigem,
      registro.originalId,
      'restore' as any,
      0,
      `Registro de ${registro.tipo} (${registro.nome}) restaurado com sucesso.`
    );
  },

  /**
   * Exclusão Definitiva (Hard Delete)
   * Remove permanentemente o registro da Central de Recuperação.
   */
  async hardDeleteRecord(registro: RegistroLixeira, empresaId: string, userEmail?: string): Promise<void> {
    if (!registro || !empresaId) return;

    // Remove definitivamente da lixeira
    await FirestoreRepository.delete('lixeira', registro.id, empresaId, userEmail);

    // Registra no LogService auditoria de Exclusão Definitiva
    LogService.logOperation(
      userEmail || 'usuario',
      'lixeira',
      registro.id,
      'hard_delete' as any,
      0,
      `EXCLUSÃO DEFINITIVA efetuada para ${registro.tipo} ID:${registro.originalId} ("${registro.nome}").`
    );

    LogService.logError(
      'CentralRecuperacao',
      'RecuperacaoService',
      `Exclusão definitiva efetuada por ${userEmail || 'usuário'} no registro ${registro.tipo} "${registro.nome}" (ID: ${registro.originalId})`,
      undefined,
      'exclusao_definitiva_efetuada'
    );
  }
};
