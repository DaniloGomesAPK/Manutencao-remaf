/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Memória de fallback em caso de bloqueio completo de Storage ou cota esgotada.
 */
const inMemoryFallback = new Map<string, string>();

/**
 * Utilitário seguro para leitura e gravação no Web Storage (localStorage / sessionStorage),
 * com auto-recuperação e tolerância a falhas quando a cota de 5MB for excedida.
 */
export const safeStorage = {
  /**
   * Grava um valor com proteção contra QuotaExceededError.
   * O localStorage do navegador possui um limite de ~5MB por domínio. Quando grandes coleções
   * (como ordensServico) excedem essa cota, o erro é interceptado para não quebrar a aplicação,
   * mantendo os dados acessíveis na memória RAM e no IndexedDB.
   */
  setItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') {
      inMemoryFallback.set(key, value);
      return true;
    }

    try {
      // Tentativa direta de gravação no localStorage
      localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      // Limitação do localStorage: ~5MB por domínio. Interceptamos QuotaExceededError / DOMException
      const isQuotaError =
        e?.name === 'QuotaExceededError' ||
        e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e?.code === 22 ||
        e?.code === 1014 ||
        (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota'));

      if (isQuotaError) {
        console.warn(`[safeStorage] Limite de cota (~5MB) do localStorage excedido ao salvar chave "${key}". A aplicação continuará normalmente com os dados em memória/IndexedDB.`);
      } else {
        console.warn(`[safeStorage] Erro ao gravar chave "${key}" no localStorage:`, e);
      }

      // 1. Tenta limpar itens dispensáveis (logs, históricos) para tentar abrir espaço
      this.clearExpendableCache();

      // 2. Segunda tentativa no localStorage após a limpeza
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e2: any) {
        // Se ainda assim exceder a cota, tenta sessionStorage ou salva no fallback em memória
        try {
          sessionStorage.setItem(key, value);
          return true;
        } catch (e3) {
          // Mantém em memória RAM sem lançar erro para não interromper a aplicação
          inMemoryFallback.set(key, value);
          return true;
        }
      }
    }
  },

  /**
   * Lê um valor com suporte a múltiplos níveis de fallback.
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') {
      return inMemoryFallback.get(key) || null;
    }

    try {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    } catch (_) {}

    try {
      const val = sessionStorage.getItem(key);
      if (val !== null) return val;
    } catch (_) {}

    return inMemoryFallback.get(key) || null;
  },

  /**
   * Remove uma chave de todos os storages.
   */
  removeItem(key: string): void {
    inMemoryFallback.delete(key);

    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(key);
    } catch (_) {}

    try {
      sessionStorage.removeItem(key);
    } catch (_) {}
  },

  /**
   * Limpa chaves descartáveis para liberar espaço imediato em disco / localStorage.
   */
  clearExpendableCache(): void {
    if (typeof window === 'undefined') return;

    const expendableExactKeys = [
      'remaf_error_logs_v1',
      'remaf_operation_logs_v1',
      'remaf_sync_queue_v1',
      'remaf_offline_logs',
      'remaf_perf_logs'
    ];

    for (const k of expendableExactKeys) {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    }

    // Limpa chaves de cache grandes ou transitórias
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('remaf_cache_') || k.startsWith('remaf_temp_') || k.startsWith('remaf_deleted_'))) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch (_) {}
  }
};
