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

const LOG_STORAGE_KEY = 'remaf_error_logs_v1';
const MAX_LOG_ENTRIES = 100;

export const LogService = {
  /**
   * Registra um erro localmente de forma resiliente e segura.
   */
  logError(
    modulo: string,
    componente: string,
    mensagem: string,
    stack?: string,
    acaoUsuario?: string
  ): ErrorLog {
    const now = new Date();
    // Use ISO-based formatted date or locale format
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
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      let logs: ErrorLog[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            logs = parsed;
          }
        } catch (_) {
          console.warn('Logs corrompidos detectados no localStorage, redefinindo.');
        }
      }
      
      logs.unshift(entry); // Insere o erro mais recente no topo
      
      // Limita a quantidade máxima para evitar estouro da cota do localStorage
      if (logs.length > MAX_LOG_ENTRIES) {
        logs = logs.slice(0, MAX_LOG_ENTRIES);
      }
      
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (err) {
      console.warn('Falha ao gravar registro de log de erro no localStorage:', err);
    }

    return entry;
  },

  /**
   * Retorna a lista de logs registrados.
   */
  getLogs(): ErrorLog[] {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Falha ao ler os logs do localStorage:', err);
    }
    return [];
  },

  /**
   * Limpa todos os logs de erro armazenados.
   */
  clearLogs(): void {
    try {
      localStorage.removeItem(LOG_STORAGE_KEY);
    } catch (err) {
      console.error('Falha ao limpar logs:', err);
    }
  },

  /**
   * Sincroniza logs pendentes com o Firebase (estrutura preparada).
   */
  async syncWithFirebase(): Promise<{ success: boolean; count: number }> {
    try {
      const logs = this.getLogs();
      const unsynced = logs.filter(l => !l.sincronizado);
      if (unsynced.length === 0) {
        return { success: true, count: 0 };
      }
      
      // Simulação de sincronização bem-sucedida para o SaaS preparado
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updated = logs.map(l => {
        if (!l.sincronizado) {
          return { ...l, sincronizado: true };
        }
        return l;
      });
      
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updated));
      return { success: true, count: unsynced.length };
    } catch (err) {
      console.error('Falha ao sincronizar logs com o Firebase:', err);
      return { success: false, count: 0 };
    }
  }
};
