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

/**
 * Normaliza um identificador (Número de Série, Patrimônio, Placa, Chassi, Tag, Código Interno, etc.)
 * - Remove espaços no início e no final;
 * - Substitui múltiplos espaços internos por um único espaço;
 * - Converte para letras maiúsculas;
 * - Mantém hífens e números;
 * - Converte variações genéricas para padrões únicos ("S/N", "N/A", "SEM NÚMERO", "NÃO POSSUI").
 */
export function normalizarIdentificador(valor?: string | null): string {
  if (valor === null || valor === undefined) return '';
  let str = String(valor).trim();
  if (!str) return '';

  // Substituir múltiplos espaços internos por um único
  str = str.replace(/\s+/g, ' ');

  // Converter para letras maiúsculas
  str = str.toUpperCase();

  // Mapeamento e padronização para valores genéricos conhecidos
  const unaccented = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const noSpaces = unaccented.replace(/[\s\/-]+/g, '');

  if (noSpaces === 'SN' || str === 'S/N' || str === 'S-N' || str === 'SN') {
    return 'S/N';
  }
  if (noSpaces === 'NA' || noSpaces === 'NAOAPLICAVEL' || str === 'N/A' || str === 'NA') {
    return 'N/A';
  }
  if (noSpaces === 'SEMNUMERO') {
    return 'SEM NÚMERO';
  }
  if (noSpaces === 'NAOPOSSUI') {
    return 'NÃO POSSUI';
  }

  return str;
}

/**
 * Normaliza todos os identificadores conhecidos de um equipamento.
 */
export function normalizarEquipamentoIdentificadores<T extends Partial<Equipamento>>(equipamentoData: T): T {
  if (!equipamentoData) return equipamentoData;
  const result = { ...equipamentoData };
  const anyResult = result as any;

  if (result.numeroSerie !== undefined && result.numeroSerie !== null) {
    result.numeroSerie = normalizarIdentificador(result.numeroSerie);
  }
  if (result.patrimonio !== undefined && result.patrimonio !== null) {
    result.patrimonio = normalizarIdentificador(result.patrimonio);
  }
  if (result.placa !== undefined && result.placa !== null) {
    result.placa = normalizarIdentificador(result.placa);
  }
  if (result.chassi !== undefined && result.chassi !== null) {
    result.chassi = normalizarIdentificador(result.chassi);
  }
  if (anyResult.tag !== undefined && anyResult.tag !== null) {
    anyResult.tag = normalizarIdentificador(anyResult.tag);
  }
  if (anyResult.codigoInterno !== undefined && anyResult.codigoInterno !== null) {
    anyResult.codigoInterno = normalizarIdentificador(anyResult.codigoInterno);
  }
  if (anyResult.identificadorAtivo !== undefined && anyResult.identificadorAtivo !== null) {
    anyResult.identificadorAtivo = normalizarIdentificador(anyResult.identificadorAtivo);
  }
  if (anyResult.identificador !== undefined && anyResult.identificador !== null) {
    anyResult.identificador = normalizarIdentificador(anyResult.identificador);
  }

  return result;
}

/**
 * Verifica se um valor de identificador (Número de Série, Patrimônio, Placa, Chassi, Tag, Código Interno, etc.)
 * é genérico ou indica ausência de um identificador único real (ex: S/N, SN, SEM NÚMERO, N/A, -, etc.).
 */
export function isIdentificadorGenerico(valor?: string | null): boolean {
  if (valor === null || valor === undefined) return true;
  const norm = normalizarIdentificador(valor);
  if (!norm) return true;

  const upper = norm.toUpperCase();
  const unaccented = upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const noSpaces = unaccented.replace(/\s+/g, '');

  const genericValues = new Set([
    'S/N',
    'SN',
    'S/P',
    'SP',
    'S/C',
    'SC',
    'S/T',
    'ST',
    'SEM NUMERO',
    'SEM NÚMERO',
    'SEM PATRIMONIO',
    'SEM PLACA',
    'SEM CHASSI',
    'SEM TAG',
    'SEM CODIGO',
    'SEM IDENTIFICADOR',
    'NAO POSSUI',
    'NÃO POSSUI',
    'NAO APLICAVEL',
    'NA',
    'N/A',
    '-',
    '--',
    '---',
    'ZERO'
  ]);

  const genericNoSpaces = new Set([
    'SN',
    'SP',
    'SC',
    'ST',
    'SEMNUMERO',
    'SEMPATRIMONIO',
    'SEMPLACA',
    'SEMCHASSI',
    'SEMTAG',
    'SEMCODIGO',
    'SEMIDENTIFICADOR',
    'NAOPOSSUI',
    'NAOAPLICAVEL',
    'NA',
    'N/A',
    '-',
    '--',
    '---'
  ]);

  return (
    genericValues.has(upper) ||
    genericValues.has(unaccented) ||
    genericNoSpaces.has(noSpaces)
  );
}

// Alias para manter retrocompatibilidade com chamadas existentes
export const isGenericNumeroSerie = isIdentificadorGenerico;

export const IntegridadeService = {
  normalizarIdentificador,
  normalizarEquipamentoIdentificadores,
  isIdentificadorGenerico,
  isGenericNumeroSerie: isIdentificadorGenerico,
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

      // Verifica OS / Orçamentos vinculados pelo clienteId ou nome exato normalizado
      const countOS = ordens.filter(os => {
        if (os.clienteId && os.clienteId === clienteId) return true;
        if (clienteNome && clienteNome.length >= 3 && os.clienteNome && os.clienteNome.trim().toLowerCase() === clienteNome) return true;
        return false;
      }).length;

      // Verifica Lançamentos Financeiros vinculados pelo clienteId ou nome exato normalizado
      const countFin = financeiro.filter(f => {
        if (f.clienteId && f.clienteId === clienteId) return true;
        if (clienteNome && clienteNome.length >= 3 && f.clienteNome && f.clienteNome.trim().toLowerCase() === clienteNome) return true;
        return false;
      }).length;

      // Verifica Equipamentos vinculados
      const countEq = equipamentos.filter(eq => eq.clienteId === clienteId).length;

      if (countOS > 0 || countFin > 0 || countEq > 0) {
        const motivos: string[] = [];
        if (countOS > 0) motivos.push(`• ${countOS} Orçamento(s) / Ordem(ns) de Serviço`);
        if (countFin > 0) motivos.push(`• ${countFin} Lançamento(s) Financeiro(s)`);
        if (countEq > 0) motivos.push(`• ${countEq} Equipamento(s) cadastrado(s)`);

        const reason = `Este cliente não pode ser excluído porque possui registros vinculados:\n\n${motivos.join('\n')}\n\nPara excluir este cliente, remova ou desvincule esses registros primeiro.`;

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
        if (eqSerie && !isGenericNumeroSerie(eqSerie) && os.numeroSerie?.trim().toLowerCase() === eqSerie) return true;
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
   * Impede identificadores reais duplicados (Número de Série, Patrimônio, Placa, Chassi, Tag, Código Interno, etc.)
   * dentro da mesma empresa.
   * Valores vazios ou genéricos (ex: S/N, N/A, SEM NÚMERO, -) são isentos de validação.
   */
  async validateEquipamentoDuplicates(equipamentoData: Partial<Equipamento>, empresaId: string, userEmail?: string): Promise<IntegrityValidationResult> {
    if (!empresaId) return { valid: true };

    const normalizedTarget = normalizarEquipamentoIdentificadores(equipamentoData);
    const eqDataAny = normalizedTarget as any;

    // Normalização e verificação de identificadores genéricos/ausentes
    const rawNumSerie = normalizedTarget.numeroSerie;
    const numSerieNorm = isIdentificadorGenerico(rawNumSerie) ? '' : rawNumSerie!;

    const rawPatrimonio = normalizedTarget.patrimonio;
    const patrimonioNorm = isIdentificadorGenerico(rawPatrimonio) ? '' : rawPatrimonio!;

    const rawPlaca = normalizedTarget.placa;
    const placaNorm = isIdentificadorGenerico(rawPlaca) ? '' : rawPlaca!;

    const rawChassi = normalizedTarget.chassi;
    const chassiNorm = isIdentificadorGenerico(rawChassi) ? '' : rawChassi!;

    const rawTag = eqDataAny.tag;
    const tagNorm = isIdentificadorGenerico(rawTag) ? '' : String(rawTag);

    const rawCodigoInterno = eqDataAny.codigoInterno;
    const codigoInternoNorm = isIdentificadorGenerico(rawCodigoInterno) ? '' : String(rawCodigoInterno);

    const rawIdentificadorAtivo = eqDataAny.identificadorAtivo || eqDataAny.identificador;
    const identificadorAtivoNorm = isIdentificadorGenerico(rawIdentificadorAtivo) ? '' : String(rawIdentificadorAtivo);

    // Se nenhum identificador único real foi informado, permite cadastro direto
    if (!numSerieNorm && !patrimonioNorm && !placaNorm && !chassiNorm && !tagNorm && !codigoInternoNorm && !identificadorAtivoNorm) {
      return { valid: true };
    }

    try {
      const equipamentos = await FirestoreRepository.getAll<Equipamento>('equipamentos', empresaId, userEmail);

      for (const eqRaw of equipamentos) {
        if (normalizedTarget.id && eqRaw.id === normalizedTarget.id) continue;
        const eq = normalizarEquipamentoIdentificadores(eqRaw);
        const eqAny = eq as any;

        // Validação de Número de Série
        if (numSerieNorm && !isIdentificadorGenerico(eq.numeroSerie) && eq.numeroSerie === numSerieNorm) {
          const message = `Não é possível cadastrar: O Número de Série "${rawNumSerie}" já está em uso nesta empresa (${eq.tipo || 'Equipamento'} - ${eq.modelo || eq.placa || eq.id}).`;

          LogService.logError(
            'Equipamentos',
            'IntegridadeService',
            `Tentativa de número de série duplicado (${rawNumSerie}) na empresa ${empresaId}`,
            undefined,
            'tentativa_cadastro_duplicado'
          );

          return { valid: false, message };
        }

        // Validação de Patrimônio
        if (patrimonioNorm && !isIdentificadorGenerico(eq.patrimonio) && eq.patrimonio === patrimonioNorm) {
          const message = `Não é possível cadastrar: O Patrimônio "${rawPatrimonio}" já está em uso nesta empresa (${eq.tipo || 'Equipamento'} - ${eq.modelo || eq.placa || eq.id}).`;

          LogService.logError(
            'Equipamentos',
            'IntegridadeService',
            `Tentativa de patrimônio duplicado (${rawPatrimonio}) na empresa ${empresaId}`,
            undefined,
            'tentativa_cadastro_duplicado'
          );

          return { valid: false, message };
        }

        // Validação de Placa
        if (placaNorm && !isIdentificadorGenerico(eq.placa) && eq.placa === placaNorm) {
          const message = `Não é possível cadastrar: A Placa "${rawPlaca}" já está em uso nesta empresa (${eq.tipo || 'Equipamento'} - ${eq.modelo || eq.id}).`;

          LogService.logError(
            'Equipamentos',
            'IntegridadeService',
            `Tentativa de placa duplicada (${rawPlaca}) na empresa ${empresaId}`,
            undefined,
            'tentativa_cadastro_duplicado'
          );

          return { valid: false, message };
        }

        // Validação de Chassi
        if (chassiNorm && !isIdentificadorGenerico(eq.chassi) && eq.chassi === chassiNorm) {
          const message = `Não é possível cadastrar: O Chassi "${rawChassi}" já está em uso nesta empresa (${eq.tipo || 'Equipamento'} - ${eq.modelo || eq.id}).`;

          LogService.logError(
            'Equipamentos',
            'IntegridadeService',
            `Tentativa de chassi duplicado (${rawChassi}) na empresa ${empresaId}`,
            undefined,
            'tentativa_cadastro_duplicado'
          );

          return { valid: false, message };
        }

        // Validação de Tag
        if (tagNorm && !isIdentificadorGenerico(eqAny.tag) && String(eqAny.tag) === tagNorm) {
          const message = `Não é possível cadastrar: A Tag "${rawTag}" já está em uso nesta empresa (${eq.tipo || 'Equipamento'} - ${eq.modelo || eq.id}).`;

          LogService.logError(
            'Equipamentos',
            'IntegridadeService',
            `Tentativa de tag duplicada (${rawTag}) na empresa ${empresaId}`,
            undefined,
            'tentativa_cadastro_duplicado'
          );

          return { valid: false, message };
        }

        // Validação de Código Interno
        if (codigoInternoNorm && !isIdentificadorGenerico(eqAny.codigoInterno) && String(eqAny.codigoInterno) === codigoInternoNorm) {
          const message = `Não é possível cadastrar: O Código Interno "${rawCodigoInterno}" já está em uso nesta empresa (${eq.tipo || 'Equipamento'} - ${eq.modelo || eq.id}).`;

          LogService.logError(
            'Equipamentos',
            'IntegridadeService',
            `Tentativa de código interno duplicado (${rawCodigoInterno}) na empresa ${empresaId}`,
            undefined,
            'tentativa_cadastro_duplicado'
          );

          return { valid: false, message };
        }

        // Validação de Identificador do Ativo
        const eqIdentificador = eqAny.identificadorAtivo || eqAny.identificador;
        if (identificadorAtivoNorm && !isIdentificadorGenerico(eqIdentificador) && String(eqIdentificador) === identificadorAtivoNorm) {
          const message = `Não é possível cadastrar: O Identificador do Ativo "${rawIdentificadorAtivo}" já está em uso nesta empresa (${eq.tipo || 'Equipamento'} - ${eq.modelo || eq.id}).`;

          LogService.logError(
            'Equipamentos',
            'IntegridadeService',
            `Tentativa de identificador de ativo duplicado (${rawIdentificadorAtivo}) na empresa ${empresaId}`,
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
          LogService.logWarning(
            'OrdensServico',
            'IntegridadeService',
            `Aviso de referência: Cliente ${osData.clienteId} não localizado na tabela de clientes para OS #${osData.numeroOS || 'Nova'}. Permitindo gravação com clienteNome: ${osData.clienteNome || 'N/A'}`
          );
        }
      }

      if (osData.equipamentoId) {
        const equipamentos = await FirestoreRepository.getAll<Equipamento>('equipamentos', empresaId, userEmail);
        const eqExiste = equipamentos.some(e => e.id === osData.equipamentoId);
        if (!eqExiste) {
          LogService.logWarning(
            'OrdensServico',
            'IntegridadeService',
            `Aviso de referência: Equipamento ${osData.equipamentoId} não localizado na tabela para OS #${osData.numeroOS || 'Nova'}. Permitindo gravação com equipamento: ${osData.equipamento || 'N/A'}`
          );
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
