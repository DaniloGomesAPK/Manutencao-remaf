/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrdemDeServico } from './types';
import { FirestoreRepository } from './services/FirestoreRepository';

// Define DB config for IndexedDB
const DB_NAME = 'RemafOfflineDB';
const DB_VERSION = 5;
const STORE_NAME = 'service_orders';
export const COMPANY_STORE_NAME = 'company_profile';
export const CLIENTES_STORE_NAME = 'clientes';
export const EQUIPAMENTOS_STORE_NAME = 'equipamentos';
export const SERVICOS_INTELIGENTES_STORE_NAME = 'servicos_inteligentes';
export const PRECIFICACOES_STORE_NAME = 'precificacoes';
export const FINANCEIRO_STORE_NAME = 'financeiro';
export const CONFIGURACOES_STORE_NAME = 'configuracoes';

// Always 100% offline-first and local db active
export const isLocalSandbox = true;

/**
 * Sorts service orders by creation date descending
 */
export const sortServiceOrdersByCreationDate = (orders: OrdemDeServico[]): OrdemDeServico[] => {
  return orders.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;

    // Fallback to dataAbertura + horaAbertura
    const fullDateA = `${a.dataAbertura || ''}T${a.horaAbertura || '00:00'}`;
    const fullDateB = `${b.dataAbertura || ''}T${b.horaAbertura || '00:00'}`;
    const parseA = Date.parse(fullDateA);
    const parseB = Date.parse(fullDateB);
    if (!isNaN(parseA) && !isNaN(parseB) && parseA !== parseB) {
      return parseB - parseA;
    }
    return (b.numeroOS || '').localeCompare(a.numeroOS || '');
  });
};

/**
 * Promise-based IndexedDB Open Helper
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open local database (IndexedDB):', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(COMPANY_STORE_NAME)) {
        db.createObjectStore(COMPANY_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CLIENTES_STORE_NAME)) {
        db.createObjectStore(CLIENTES_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(EQUIPAMENTOS_STORE_NAME)) {
        db.createObjectStore(EQUIPAMENTOS_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SERVICOS_INTELIGENTES_STORE_NAME)) {
        db.createObjectStore(SERVICOS_INTELIGENTES_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PRECIFICACOES_STORE_NAME)) {
        db.createObjectStore(PRECIFICACOES_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FINANCEIRO_STORE_NAME)) {
        db.createObjectStore(FINANCEIRO_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CONFIGURACOES_STORE_NAME)) {
        db.createObjectStore(CONFIGURACOES_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// --- OPTIONAL FUTURE SUPABASE CONFIGURATION & SYNC EXTRACTION ---
export interface SupabaseSyncState {
  enabled: boolean;
  connected: boolean;
  lastSynced: string | null;
}

export const getSupabaseConfig = (): SupabaseSyncState => {
  try {
    const customUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const customKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    const enabled = !!(customUrl && customKey);
    return {
      enabled,
      connected: enabled,
      lastSynced: localStorage.getItem('remaf_last_supabase_sync')
    };
  } catch (_) {
    return { enabled: false, connected: false, lastSynced: null };
  }
};

export const syncWithSupabase = async (): Promise<{ success: boolean; count: number; error: string | null }> => {
  const config = getSupabaseConfig();
  if (!config.enabled) {
    return { success: true, count: 0, error: 'Supabase não configurada. Operando no modo Offline exclusivo.' };
  }

  try {
    const orders = await fetchAllServiceOrders();
    const now = new Date().toISOString();
    localStorage.setItem('remaf_last_supabase_sync', now);
    return { success: true, count: orders.length, error: null };
  } catch (err: any) {
    console.error('[Supabase Sync Error]', err);
    return { success: false, count: 0, error: err.message || 'Falha na conexão de rede com o servidor' };
  }
};

// --- AUTHENTICATION API ---
const LOCAL_AUTH_USER_KEY = 'remaf_active_user';

const getLocalUser = () => {
  try {
    const stored = localStorage.getItem(LOCAL_AUTH_USER_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Error fetching offline user:', err);
  }
  return null;
};

export const signInWithGoogle = async (): Promise<any> => {
  const simulatedUser = {
    uid: 'mb_99_tecnico',
    displayName: 'Técnico de Manutenção',
    email: 'daniloempreendimentos@gmail.com',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    emailVerified: true,
  };
  try {
    localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(simulatedUser));
  } catch (err) {
    console.error('localStorage unavailable:', err);
  }
  return simulatedUser;
};

export const logoutUser = async (): Promise<void> => {
  try {
    localStorage.removeItem(LOCAL_AUTH_USER_KEY);
  } catch (err) {
    console.error('Error on logout:', err);
  }
};

export const runOnAuthStateChanged = (callback: (user: any | null) => void) => {
  const checkAuth = () => {
    const user = getLocalUser();
    callback(user);
  };
  
  checkAuth();
  window.addEventListener('storage', checkAuth);
  
  return () => {
    window.removeEventListener('storage', checkAuth);
  };
};

// --- DATABASE OPERATIONS VIA FIRESTORE REPOSITORY ---

export const generateNewDocumentId = (): string => {
  return 'os_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
};

/**
 * Saves or updates a service order in Firestore and IndexedDB/LocalStorage via FirestoreRepository
 */
export const saveOrdemDeServico = async (osData: OrdemDeServico): Promise<string> => {
  const timestamp = new Date().toISOString();
  const docId = osData.id || generateNewDocumentId();
  const empresaId = osData.empresaId || 'default_tenant';

  const documentWithTimestamps: OrdemDeServico = {
    ...osData,
    id: docId,
    empresaId,
    createdAt: osData.createdAt || timestamp,
    updatedAt: timestamp,
  };

  try {
    await FirestoreRepository.add('ordensServico', documentWithTimestamps, empresaId);
  } catch (error) {
    console.error('Error saving service order with FirestoreRepository:', error);
    throw error;
  }

  return docId;
};

/**
 * Fetches all service orders for a specific empresaId via FirestoreRepository
 */
export const fetchAllServiceOrders = async (empresaId: string = 'emp_daniloempreendimentos'): Promise<OrdemDeServico[]> => {
  try {
    const orders = await FirestoreRepository.getAll<OrdemDeServico>('ordensServico', empresaId);

    const isolatedOrders = orders.filter(o => {
      if (!o.empresaId) {
        return empresaId === 'emp_daniloempreendimentos';
      }
      return o.empresaId === empresaId;
    }).map(o => {
      if (o.status === 'Concluído com restrições' || (o.status as string) === 'Com Restrições') {
        return { ...o, status: 'Pendente' as const };
      }
      return o;
    });

    sortServiceOrdersByCreationDate(isolatedOrders);
    return isolatedOrders;
  } catch (error) {
    console.warn('Fallback to LocalStorage due to read issue:', error);
    return getLocalServiceOrders(empresaId);
  }
};

/**
 * Fallback local cache recovery (SaaS Tenant-Isolated)
 */
export const getLocalServiceOrders = (empresaId: string): OrdemDeServico[] => {
  const keys = [
    `remaf_cache_ordensServico_${empresaId}`,
    `remaf_cache_service_orders_${empresaId}`,
    `remaf_prod_service_orders_cache_${empresaId}`, 
    `remaf_service_orders_${empresaId}`
  ];
  for (const key of keys) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const mapped = parsed.map(o => {
            if (o.status === 'Concluído com restrições' || (o.status as string) === 'Com Restrições') {
              return { ...o, status: 'Pendente' as const };
            }
            return o;
          });
          return sortServiceOrdersByCreationDate(mapped);
        }
      }
    } catch (_) {}
  }
  return [];
};

/**
 * Computes next unique incremental sequence number
 */
export const generateNextOSNumber = async (empresaId: string, existingOrders?: OrdemDeServico[]): Promise<string> => {
  const orders = existingOrders || await fetchAllServiceOrders(empresaId);
  if (orders.length === 0) {
    return 'OS-1001';
  }
  
  let maxNum = 1000;
  orders.forEach(o => {
    const parts = o.numeroOS.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  
  return `OS-${maxNum + 1}`;
};

export const uploadImageFile = async (dataUrl: string, _folder: 'antes' | 'depois', _filename: string): Promise<string> => {
  return dataUrl;
};

/**
 * Deletes a service order via FirestoreRepository
 */
export const deleteServiceOrder = async (id: string, empresaId: string): Promise<void> => {
  try {
    await FirestoreRepository.delete('ordensServico', id, empresaId);
  } catch (error) {
    console.error('Error deleting service order with FirestoreRepository:', error);
    throw error;
  }
};

export const uploadPDFReport = async (pdfBase64: string, _osNumber: string): Promise<string> => {
  return pdfBase64;
};
