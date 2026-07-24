/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ErrorLog {
  id: string;
  data: string;
  hora: string;
  modulo: string;
  componente: string;
  mensagem: string;
  stackTrace?: string;
  acaoUsuario?: string;
  sincronizado: boolean;
}

export interface OperationLog {
  id: string;
  timestamp: string;
  usuario: string;
  colecao: string;
  documentoId: string;
  operacao: 'add' | 'update' | 'delete' | 'get' | 'getAll' | 'query' | 'listen';
  erro: string | null;
  tempoMs: number;
  sincronizado: boolean;
}

const ERROR_LOG_STORAGE_KEY = 'remaf_error_logs_v1';
const OP_LOG_STORAGE_KEY = 'remaf_operation_logs_v1';
const MAX_LOG_ENTRIES = 200;

export const LogService = {
  /**
   * Registra log de auditoria de login e direcionamento por status de licença (ETAPA 8)
   */
  logLogin(usuario: string, empresaId: string, statusLicenca: string, destinoTela: string): OperationLog {
    console.log(`[AuditLog] LOGIN_REALIZADO | Usuario: ${usuario} | Empresa: ${empresaId} | Status: ${statusLicenca} | Destino: ${destinoTela}`);
    return this.logOperation(
      usuario,
      'audit_login',
      empresaId,
      'add',
      0,
      null
    );
  },

  /**
   * Registra um log de operação do FirestoreRepository com medição de tempo e tratamento de erros.
   */
  logOperation(
    usuario: string,
    colecao: string,
    documentoId: string,
    operacao: OperationLog['operacao'],
    tempoMs: number,
    erro: any = null
  ): OperationLog {
    const now = new Date();
    const entry: OperationLog = {
      id: 'op_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
      timestamp: now.toISOString(),
      usuario: usuario || 'usuario_anonimo',
      colecao,
      documentoId: documentoId || 'n/a',
      operacao,
      erro: erro ? (typeof erro === 'string' ? erro : erro.message || JSON.stringify(erro)) : null,
      tempoMs: Math.round(tempoMs),
      sincronizado: false,
    };

    try {
      const stored = localStorage.getItem(OP_LOG_STORAGE_KEY);
      let logs: OperationLog[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(logs)) logs = [];
      logs.unshift(entry);
      if (logs.length > MAX_LOG_ENTRIES) {
        logs = logs.slice(0, MAX_LOG_ENTRIES);
      }
      localStorage.setItem(OP_LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('[LogService] Falha ao salvar log de operação localmente:', e);
    }

    if (erro) {
      console.error(`[FirestoreOpError] ${operacao.toUpperCase()} em ${colecao}/${documentoId} (${Math.round(tempoMs)}ms):`, erro);
    } else {
      console.log(`[FirestoreOpSuccess] ${operacao.toUpperCase()} em ${colecao}/${documentoId} (${Math.round(tempoMs)}ms)`);
    }

    return entry;
  },

  /**
   * Registra um erro de aplicação localmente.
   */
  logError(
    modulo: string,
    componente: string,
    mensagem: string,
    stack?: string,
    acaoUsuario?: string
  ): ErrorLog {
    const now = new Date();
    const data = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];
    
    const entry: ErrorLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
      data,
      hora,
      modulo,
      componente,
      mensagem,
      stackTrace: stack || 'No stack trace provided',
      acaoUsuario: acaoUsuario || 'Sem ação específica registrada',
      sincronizado: false
    };

    try {
      const stored = localStorage.getItem(ERROR_LOG_STORAGE_KEY);
      let logs: ErrorLog[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(logs)) logs = [];
      logs.unshift(entry);
      if (logs.length > MAX_LOG_ENTRIES) {
        logs = logs.slice(0, MAX_LOG_ENTRIES);
      }
      localStorage.setItem(ERROR_LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (err) {
      console.warn('[LogService] Falha ao gravar log de erro no localStorage:', err);
    }

    return entry;
  },

  /**
   * Retorna os logs de operação armazenados.
   */
  getOperationLogs(): OperationLog[] {
    try {
      const stored = localStorage.getItem(OP_LOG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  },

  /**
   * Retorna os logs de erro registrados.
   */
  getLogs(): ErrorLog[] {
    try {
      const stored = localStorage.getItem(ERROR_LOG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.error('[LogService] Falha ao ler logs de erro:', err);
    }
    return [];
  },

  /**
   * Calcula estatísticas dos logs de operações (tempo médio, falhas, etc)
   */
  getOperationStats() {
    const logs = this.getOperationLogs();
    if (logs.length === 0) {
      return { totalCount: 0, tempoMedioMs: 0, errorCount: 0, successCount: 0 };
    }

    const totalTempo = logs.reduce((acc, l) => acc + (l.tempoMs || 0), 0);
    const errorCount = logs.filter(l => l.erro !== null).length;
    const successCount = logs.length - errorCount;

    return {
      totalCount: logs.length,
      tempoMedioMs: Math.round(totalTempo / logs.length),
      errorCount,
      successCount,
    };
  },

  /**
   * Método de compatibilidade para sincronizar logs
   */
  async syncWithFirebase(): Promise<{ success: boolean; count: number }> {
    return { success: true, count: 0 };
  },

  /**
   * Limpa todos os logs de erro e operações.
   */
  clearLogs(): void {
    try {
      localStorage.removeItem(ERROR_LOG_STORAGE_KEY);
      localStorage.removeItem(OP_LOG_STORAGE_KEY);
    } catch (err) {
      console.error('[LogService] Falha ao limpar logs:', err);
    }
  }
};
