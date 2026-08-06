/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cliente, Equipamento, Servico, OrdemDeServico, LancamentoFinanceiro, Precificacao } from '../types';
import { Empresa } from '../models/Empresa';
import { FirestoreRepository } from './FirestoreRepository';
import { LogService } from './LogService';

export interface IntegrityCheckResult {
  allowed: boolean;
  reason?: string;
  details?: Record<string, number>;
}

export interface IntegrityValidationResult {
  valid: boolean;
  message?: string;
}

export const IntegridadeService = {
  /**
   * 1. VALIDAÇÃO DE EXCLUSÃO DE CLIENTE
   * Verifica se o cliente possui Orçamentos/OS, Lançamentos Financeiros ou Equipamentos vinculados.
   */
  async canDeleteCliente(clienteId: string, empresaId: string, userEmail?: string): Promise<IntegrityCheckResult> {
    if (!clienteId || !empresaId) {
      return { allowed: true };
    }

    try {
      const [ordens, financeiro, equipamentos, clientes] = await Promise.all([
        FirestoreRepository.getAll<OrdemDeServico>('ordensServico', empresaId, userEmail),
        FirestoreRepository.getAll<LancamentoFinanceiro>('financeiro', empresaId, userEmail),
        FirestoreRepository.getAll<Equipamento>('equipamentos', empresaId, userEmail),
        FirestoreRepository.getAll<Cliente>('clientes', empresaId, userEmail),
      ]);

      const clienteTarget = clientes.find(c => c.id === clienteId);
      const clienteNome = clienteTarget?.nome?.trim().toLowerCase();
      const clienteDocDigits = clienteTarget?.documento?.replace(/\D/g, '');

      // Verifica OS / Orçamentos
      const countOS = ordens.filter(os => {
        if (os.clienteId === clienteId) return true;
        if (clienteNome && os.clienteNome?.trim().toLowerCase() === clienteNome) return true;
        return false;
      }).length;

      // Verifica Lançamentos Financeiros
      const countFin = financeiro.filter(f => {
        if (f.clienteId === clienteId) return true;
        if (clienteNome && f.clienteNome?.trim().toLowerCase() === clienteNome) return true;
        return false;
      }).length;

      // Verifica Equipamentos
      const countEq = equipamentos.filter(eq => eq.clienteId === clienteId).length;

      if (countOS > 0 || countFin > 0 || countEq > 0) {
        const motivos: string[] = [];
        if (countOS > 0) motivos.push(`• ${countOS} Orçamento(s) / Ordem(ns) de Serviço`);
        if (countFin > 0) motivos.push(`• ${countFin} Lançamento(s) Financeiro(s)`);
        if (countEq > 0) motivos.push(`• ${countEq} Equipamento(s) cadastrado(s)`);

        const reason = `Este cliente não pode ser excluído porque possui:\n${motivos.join('\n')}`;

        LogService.logError(
          'Integridade',
          'IntegridadeService',
          `Exclusão de cliente bloqueada (ID: ${clienteId}): ${reason.replace(/\n/g, ' ')}`,
          undefined,
          'tentativa_exclusao_cliente_bloqueada'
        );

        return {
          allowed: false,
          reason,
          details: {
            ordensServico: countOS,
            financeiro: countFin,
            equipamentos: countEq,
          },
        };
      }

      return { allowed: true };
    } catch (err: any) {
      console.error('[IntegridadeService] Erro ao validar exclusão de cliente:', err);
      return { allowed: true }; // Fallback para não travar em falhas de leitura inesperadas
    }
  },

  /**
   * 2. VALIDAÇÃO DE EXCLUSÃO DE EQUIPAMENTO
   * Verifica se o equipamento possui Ordens de Serviço ou Histórico / Prontuário.
   */
  async canDeleteEquipamento(equipamentoId: string, empresaId: string, userEmail?: string): Promise<IntegrityCheckResult> {
    if (!equipamentoId || !empresaId) {
      return { allowed: true };
    }

    try {
      const [ordens, equipamentos] = await Promise.all([
        FirestoreRepository.getAll<OrdemDeServico>('ordensServico', empresaId, userEmail),
        FirestoreRepository.getAll<Equipamento>('equipamentos', empresaId, userEmail),
      ]);

      const eqTarget = equipamentos.find(e => e.id === equipamentoId);
      const eqSerie = eqTarget?.numeroSerie?.trim().toLowerCase();
      const eqPatrimonio = eqTarget?.patrimonio?.trim().toLowerCase();

      // Ordens de Serviço vinculadas
      const osVinculadas = ordens.filter(os => {
        if (os.equipamentoId === equipamentoId) return true;
        if (eqSerie && os.numeroSerie?.trim().toLowerCase() === eqSerie) return true;
        if (eqPatrimonio && os.patrimonio?.trim().toLowerCase() === eqPatrimonio) return true;
        return false;
      });

      const countOS = osVinculadas.length;
      const countProntuarios = osVinculadas.filter(os => os.status === 'Concluído').length;

      if (countOS > 0) {
        const motivos: string[] = [];
        motivos.push(`• ${countOS} Ordem(ns) de Serviço`);
        if (countProntuarios > 0) {
          motivos.push(`• ${countProntuarios} Prontuário(s) Inteligente(s) / Histórico(s)`);
        }

        const reason = `Este equipamento não pode ser excluído porque possui:\n${motivos.join('\n')}`;

        LogService.logError(
          'Integridade',
          'IntegridadeService',
          `Exclusão de equipamento bloqueada (ID: ${equipamentoId}): ${reason.replace(/\n/g, ' ')}`,
          undefined,
          'tentativa_exclusao_equipamento_bloqueada'
        );

        return {
          allowed: false,
          reason,
          details: {
            ordensServico: countOS,
            prontuarios: countProntuarios,
          },
        };
      }

      return { allowed: true };
    } catch (err: any) {
      console.error('[IntegridadeService] Erro ao validar exclusão de equipamento:', err);
      return { allowed: true };
    }
  },

  /**
   * 3. VALIDAÇÃO DE EXCLUSÃO DE SERVIÇO
   * Verifica se o serviço é utilizado em Orçamentos / Ordens de Serviço ou Precificações.
   */
  async canDeleteServico(servicoId: string, empresaId: string, userEmail?: string): Promise<IntegrityCheckResult> {
    if (!servicoId || !empresaId) {
      return { allowed: true };
    }

    try {
      const [ordens, servicos, precificacoes] = await Promise.all([
        FirestoreRepository.getAll<OrdemDeServico>('ordensServico', empresaId, userEmail),
        FirestoreRepository.getAll<Servico>('servicos_inteligentes', empresaId, userEmail),
        FirestoreRepository.getAll<Precificacao>('precificacao', empresaId, userEmail),
      ]);

      const servTarget = servicos.find(s => s.id === servicoId);
      const servNome = servTarget?.nome?.trim().toLowerCase();

      // Ordens de Serviço que contêm o serviço no orçamento ou serviçoExecutado
      const countOS = ordens.filter(os => {
        if (os.orcamento && Array.isArray(os.orcamento)) {
          const hasInOrcamento = os.orcamento.some(item => 
            item.id === servicoId || (servNome && item.descricao?.trim().toLowerCase() === servNome)
          );
          if (hasInOrcamento) return true;
        }
        if (servNome && os.servicoExecutado?.trim().toLowerCase().includes(servNome)) {
          return true;
        }
        return false;
      }).length;

      // Precificações vinculadas
      const countPrec = precificacoes.filter(p => p.servicoId === servicoId).length;

      if (countOS > 0 || countPrec > 0) {
        const motivos: string[] = [];
        if (countOS > 0) motivos.push(`• ${countOS} Orçamento(s) / Ordem(ns) de Serviço`);
        if (countPrec > 0) motivos.push(`• ${countPrec} Precificação(ões) vinculada(s)`);

        const reason = `Este serviço não pode ser excluído porque possui:\n${motivos.join('\n')}`;

        LogService.logError(
          'Integridade',
          'IntegridadeService',
          `Exclusão de serviço bloqueada (ID: ${servicoId}): ${reason.replace(/\n/g, ' ')}`,
          undefined,
          'tentativa_exclusao_servico_bloqueada'
        );

        return {
          allowed: false,
          reason,
          details: {
            ordensServico: countOS,
            precificacoes: countPrec,
          },
        };
      }

      return { allowed: true };
    } catch (err: any) {
      console.error('[IntegridadeService] Erro ao validar exclusão de serviço:', err);
      return { allowed: true };
    }
  },

  /**
   * 4. VALIDAÇÃO DE EXCLUSÃO DE TÉCNICO
   * Verifica se o técnico está vinculado a alguma Ordem de Serviço.
   */
  async canDeleteTecnico(tecnicoIdentifier: string, empresaId: string, userEmail?: string): Promise<IntegrityCheckResult> {
    if (!tecnicoIdentifier || !empresaId) {
      return { allowed: true };
    }

    try {
      const ordens = await FirestoreRepository.getAll<OrdemDeServico>('ordensServico', empresaId, userEmail);
      const targetNorm = tecnicoIdentifier.trim().toLowerCase();

      const countOS = ordens.filter(os => {
        if (!os.tecnico) return false;
        return os.tecnico.trim().toLowerCase() === targetNorm;
      }).length;

      if (countOS > 0) {
        const reason = `Este técnico não pode ser excluído porque possui:\n• ${countOS} Ordem(ns) de Serviço vinculada(s)`;

        LogService.logError(
          'Integridade',
          'IntegridadeService',
          `Exclusão de técnico bloqueada ("${tecnicoIdentifier}"): ${reason.replace(/\n/g, ' ')}`,
          undefined,
          'tentativa_exclusao_tecnico_bloqueada'
        );

        return {
          allowed: false,
          reason,
          details: { ordensServico: countOS },
        };
      }

      return { allowed: true };
    } catch (err: any) {
      console.error('[IntegridadeService] Erro ao validar exclusão de técnico:', err);
      return { allowed: true };
    }
  },

  /**
   * 5. VALIDAÇÃO DE EXCLUSÃO DE CATEGORIA
   * Verifica se a categoria é utilizada em lançamentos financeiros ou serviços.
   */
  async canDeleteCategoria(categoriaNome: string, empresaId: string, userEmail?: string): Promise<IntegrityCheckResult> {
    if (!categoriaNome || !empresaId) {
      return { allowed: true };
    }

    try {
      const [financeiro, servicos] = await Promise.all([
        FirestoreRepository.getAll<LancamentoFinanceiro>('financeiro', empresaId, userEmail),
        FirestoreRepository.getAll<Servico>('servicos_inteligentes', empresaId, userEmail),
      ]);

      const catNorm = categoriaNome.trim().toLowerCase();

      const countFin = financeiro.filter(f => f.categoria?.trim().toLowerCase() === catNorm).length;
      const countServ = servicos.filter(s => s.categoria?.trim().toLowerCase() === catNorm).length;

      if (countFin > 0 || countServ > 0) {
        const motivos: string[] = [];
        if (countFin > 0) motivos.push(`• ${countFin} Lançamento(s) Financeiro(s)`);
        if (countServ > 0) motivos.push(`• ${countServ} Serviço(s) Inteligente(s)`);

        const reason = `Esta categoria não pode ser excluída porque possui:\n${motivos.join('\n')}`;

        LogService.logError(
          'Integridade',
          'IntegridadeService',
          `Exclusão de categoria bloqueada ("${categoriaNome}"): ${reason.replace(/\n/g, ' ')}`,
          undefined,
          'tentativa_exclusao_categoria_bloqueada'
        );

        return {
          allowed: false,
          reason,
          details: { financeiro: countFin, servicos: countServ },
        };
      }

      return { allowed: true };
    } catch (err: any) {
      console.error('[IntegridadeService] Erro ao validar exclusão de categoria:', err);
      return { allowed: true };
    }
  },

  /**
   * 6. VALIDAÇÃO DE DUPLICIDADE DE CLIENTE
   * Impede cadastro de CPF/CNPJ duplicado na mesma empresa (Multi-Tenant isolation).
   */
  async validateClienteDuplicates(clienteData: Partial<Cliente>, empresaId: string, userEmail?: string): Promise<IntegrityValidationResult> {
    if (!empresaId) return { valid: true };

    const docDigits = clienteData.documento?.replace(/\D/g, '') || '';
    if (!docDigits || docDigits.length < 11) {
      return { valid: true }; // Se não informado ou incompleto, permite gravar
    }

    try {
      const clientes = await FirestoreRepository.getAll<Cliente>('clientes', empresaId, userEmail);

      const duplicado = clientes.find(c => {
        if (clienteData.id && c.id === clienteData.id) return false;
        const cDocDigits = c.documento?.replace(/\D/g, '') || '';
        return cDocDigits === docDigits;
      });

      if (duplicado) {
        const message = `Não é possível cadastrar: Já existe um cliente com o CPF/CNPJ "${clienteData.documento}" nesta empresa (${duplicado.nome}).`;

        LogService.logError(
          'Clientes',
          'IntegridadeService',
          `Tentativa de cadastro duplicado de cliente: ${message}`,
          undefined,
          'tentativa_cadastro_duplicado'
        );

        return { valid: false, message };
      }

      return { valid: true };
    } catch (err: any) {
      console.error('[IntegridadeService] Erro ao validar duplicidade de cliente:', err);
      return { valid: true };
    }
  },

  /**
   * 7. VALIDAÇÃO DE DUPLICIDADE DE EMPRESA
   * Impede cadastro/atualização de CNPJ de empresa duplicado.
   */
  async validateEmpresaDuplicates(cnpj: string, currentEmpresaId?: string, userEmail?: string): Promise<IntegrityValidationResult> {
    const cnpjDigits = cnpj?.replace(/\D/g, '') || '';
    if (!cnpjDigits || cnpjDigits.length < 14) {
      return { valid: true };
    }

    try {
      // Como company_profile é por empresa, pesquisamos os perfis
      const empresas = await FirestoreRepository.getAll<Empresa>('company_profile', currentEmpresaId || 'global', userEmail);

      const duplicada = empresas.find(e => {
        if (currentEmpresaId && e.id === currentEmpresaId) return false;
        const eCnpjDigits = e.cnpj?.replace(/\D/g, '') || '';
        return eCnpjDigits === cnpjDigits;
      });

      if (duplicada) {
        const message = `Não é possível registrar: Já existe uma empresa cadastrada com o CNPJ "${cnpj}" (${duplicada.nomeFantasia || duplicada.razaoSocial}).`;

        LogService.logError(
          'Empresas',
          'IntegridadeService',
          `Tentativa de cadastro duplicado de empresa CNPJ ${cnpj}`,
          undefined,
          'tentativa_cadastro_duplicado'
        );

        return { valid: false, message };
      }

      return { valid: true };
    } catch (err: any) {
      console.error('[IntegridadeService] Erro ao validar duplicidade de empresa:', err);
      return { valid: true };
    }
  },

  /**
   * 8. VALIDAÇÃO DE DUPLICIDADE DE EQUIPAMENTO
   * Impede Patrimônio e Número de Série duplicados dentro da mesma empresa.
   */
  async validateEquipamentoDuplicates(equipamentoData: Partial<Equipamento>, empresaId: string, userEmail?: string): Promise<IntegrityValidationResult> {
    if (!empresaId) return { valid: true };

    const patrimonioNorm = equipamentoData.patrimonio?.trim().toLowerCase() || '';
    const numSerieNorm = equipamentoData.numeroSerie?.trim().toLowerCase() || '';

    if (!patrimonioNorm && !numSerieNorm) {
      return { valid: true };
    }

    try {
      const equipamentos = await FirestoreRepository.getAll<Equipamento>('equipamentos', empresaId, userEmail);

      for (const eq of equipamentos) {
        if (equipamentoData.id && eq.id === equipamentoData.id) continue;

        // Validação de Patrimônio
        if (patrimonioNorm && eq.patrimonio?.trim().toLowerCase() === patrimonioNorm) {
          const message = `Não é possível cadastrar: O Patrimônio "${equipamentoData.patrimonio}" já está em uso nesta empresa (${eq.tipo || 'Equipamento'} - ${eq.modelo || eq.placa || eq.id}).`;

          LogService.logError(
            'Equipamentos',
            'IntegridadeService',
            `Tentativa de patrimônio duplicado (${equipamentoData.patrimonio}) na empresa ${empresaId}`,
            undefined,
            'tentativa_cadastro_duplicado'
          );

          return { valid: false, message };
        }

        // Validação de Número de Série
        if (numSerieNorm && eq.numeroSerie?.trim().toLowerCase() === numSerieNorm) {
          const message = `Não é possível cadastrar: O Número de Série "${equipamentoData.numeroSerie}" já está em uso nesta empresa (${eq.tipo || 'Equipamento'} - ${eq.modelo || eq.placa || eq.id}).`;

          LogService.logError(
            'Equipamentos',
            'IntegridadeService',
            `Tentativa de número de série duplicado (${equipamentoData.numeroSerie}) na empresa ${empresaId}`,
            undefined,
            'tentativa_cadastro_duplicado'
          );

          return { valid: false, message };
        }
      }

      return { valid: true };
    } catch (err: any) {
      console.error('[IntegridadeService] Erro ao validar duplicidade de equipamento:', err);
      return { valid: true };
    }
  },

  /**
   * 9. VALIDAÇÃO DE REFERÊNCIAS NA ORDEM DE SERVIÇO / ORÇAMENTO
   * Garante que clienteId e equipamentoId referenciem registros que realmente existem no sistema.
   */
  async validateOSReferences(osData: Partial<OrdemDeServico>, empresaId: string, userEmail?: string): Promise<IntegrityValidationResult> {
    if (!empresaId) return { valid: true };

    try {
      if (osData.clienteId) {
        const clientes = await FirestoreRepository.getAll<Cliente>('clientes', empresaId, userEmail);
        const clienteExiste = clientes.some(c => c.id === osData.clienteId);
        if (!clienteExiste) {
          const message = `Gravação bloqueada: O cliente selecionado (ID: ${osData.clienteId}) não existe mais no sistema. Por favor, selecione um cliente válido.`;

          LogService.logError(
            'OrdensServico',
            'IntegridadeService',
            `Inconsistência de referência: Cliente ${osData.clienteId} inexistente ao salvar OS #${osData.numeroOS || 'Nova'}`,
            undefined,
            'tentativa_gravação_inconsistente'
          );

          return { valid: false, message };
        }
      }

      if (osData.equipamentoId) {
        const equipamentos = await FirestoreRepository.getAll<Equipamento>('equipamentos', empresaId, userEmail);
        const eqExiste = equipamentos.some(e => e.id === osData.equipamentoId);
        if (!eqExiste) {
          const message = `Gravação bloqueada: O equipamento selecionado (ID: ${osData.equipamentoId}) não existe mais no sistema. Por favor, selecione um equipamento válido.`;

          LogService.logError(
            'OrdensServico',
            'IntegridadeService',
            `Inconsistência de referência: Equipamento ${osData.equipamentoId} inexistente ao salvar OS #${osData.numeroOS || 'Nova'}`,
            undefined,
            'tentativa_gravação_inconsistente'
          );

          return { valid: false, message };
        }
      }

      return { valid: true };
    } catch (err: any) {
      console.error('[IntegridadeService] Erro ao validar referências de OS:', err);
      return { valid: true };
    }
  },

  /**
   * 10. VALIDAÇÃO DE REFERÊNCIAS NO FINANCEIRO
   * Garante que clienteId e osId referenciem registros existentes ao criar/editar lançamento financeiro.
   */
  async validateFinanceiroReferences(lancamentoData: Partial<LancamentoFinanceiro>, empresaId: string, userEmail?: string): Promise<IntegrityValidationResult> {
    if (!empresaId) return { valid: true };

    try {
      if (lancamentoData.clienteId) {
        const clientes = await FirestoreRepository.getAll<Cliente>('clientes', empresaId, userEmail);
        const clienteExiste = clientes.some(c => c.id === lancamentoData.clienteId);
        if (!clienteExiste) {
          const message = `Gravação bloqueada: O cliente vinculado a este lançamento (ID: ${lancamentoData.clienteId}) não foi encontrado no cadastro.`;

          LogService.logError(
            'Financeiro',
            'IntegridadeService',
            `Inconsistência de referência: Cliente ${lancamentoData.clienteId} inexistente no lançamento financeiro`,
            undefined,
            'tentativa_gravação_inconsistente'
          );

          return { valid: false, message };
        }
      }

      if (lancamentoData.osId) {
        const ordens = await FirestoreRepository.getAll<OrdemDeServico>('ordensServico', empresaId, userEmail);
        const osExiste = ordens.some(o => o.id === lancamentoData.osId);
        if (!osExiste) {
          const message = `Gravação bloqueada: A Ordem de Serviço vinculada a este lançamento (OS #${lancamentoData.osNumero || lancamentoData.osId}) não existe mais.`;

          LogService.logError(
            'Financeiro',
            'IntegridadeService',
            `Inconsistência de referência: OS ${lancamentoData.osId} inexistente no lançamento financeiro`,
            undefined,
            'tentativa_gravação_inconsistente'
          );

          return { valid: false, message };
        }
      }

      return { valid: true };
    } catch (err: any) {
      console.error('[IntegridadeService] Erro ao validar referências do financeiro:', err);
      return { valid: true };
    }
  }
};
