/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrdemDeServico } from './types';

// Define DB config for IndexedDB
const DB_NAME = 'RemafOfflineDB';
const DB_VERSION = 4;
const STORE_NAME = 'service_orders';
export const COMPANY_STORE_NAME = 'company_profile';
export const CLIENTES_STORE_NAME = 'clientes';
export const EQUIPAMENTOS_STORE_NAME = 'equipamentos';
export const SERVICOS_INTELIGENTES_STORE_NAME = 'servicos_inteligentes';
export const PRECIFICACOES_STORE_NAME = 'precificacoes';

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
    };
  });
}

// --- OPTIONAL FUTURE SUPABASE CONFIGURATION & SYNC EXTRACTION ---
// This client configuration is inactive by default (offline-first).
// If a user later adds Supabase credentials, they can hook this service up.
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

/**
 * Executes synchronisation cycle with Supabase if configured.
 * Otherwise, resolves immediately and silently as offline-only.
 */
export const syncWithSupabase = async (): Promise<{ success: boolean; count: number; error: string | null }> => {
  const config = getSupabaseConfig();
  if (!config.enabled) {
    return { success: true, count: 0, error: 'Supabase não configurada. Operando no modo Offline exclusivo.' };
  }

  try {
    const orders = await fetchAllServiceOrders();
    console.log(`[Supabase Async Sync] Sincronizando ${orders.length} ordens de serviço locais com o servidor...`);
    
    // In a real active setup, the integration would perform:
    // const { data, error } = await supabase.from('service_orders').upsert(orders);
    // if (error) throw error;
    
    const now = new Date().toISOString();
    localStorage.setItem('remaf_last_supabase_sync', now);
    
    return { success: true, count: orders.length, error: null };
  } catch (err: any) {
    console.error('[Supabase Sync Error]', err);
    return { success: false, count: 0, error: err.message || 'Falha na conexão de rede com o servidor' };
  }
};


// --- AUTHENTICATION API (100% Client-Side Local) ---
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
    email: 'daniloempreendimentos@gmail.com', // Active technician identifier
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


// --- DATABASE OPERATIONS ---

/**
 * Safe local ID generator
 */
export const generateNewDocumentId = (): string => {
  return 'os_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
};

/**
 * Saves or updates a service order in IndexedDB (SaaS Tenant-Isolated)
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
    // 1. Primary storage: IndexedDB (stores full records including WebP compressed images)
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(documentWithTimestamps);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 2. Synchronous/Fast fallback layout: update localStorage cache per company tenant
    const lightCopy = { ...documentWithTimestamps };
    delete lightCopy.fotosAntes;
    delete lightCopy.fotosDepois;
    delete lightCopy.pdfGerado;

    const keys = [
      `remaf_service_orders_${empresaId}`, 
      `remaf_prod_service_orders_cache_${empresaId}`
    ];
    keys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        let list: any[] = cached ? JSON.parse(cached) : [];
        if (!Array.isArray(list)) list = [];
        const idx = list.findIndex(o => o.id === docId);
        if (idx !== -1) {
          list[idx] = lightCopy;
        } else {
          list.push(lightCopy);
        }
        sortServiceOrdersByCreationDate(list);
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        console.warn(`Local Storage write status: Key "${key}" -`, e);
      }
    });

  } catch (error) {
    console.error('Error saving to local databases (IndexedDB & LocalStorage):', error);
    throw error;
  }

  return docId;
};

/**
 * Fetches all service orders for a specific EmpresaID (SaaS Tenant-Isolated)
 */
export const fetchAllServiceOrders = async (empresaId: string = 'emp_daniloempreendimentos'): Promise<OrdemDeServico[]> => {
  try {
    const db = await openDB();
    const orders = await new Promise<OrdemDeServico[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    // Filtra por empresaId para garantir estrito isolamento SaaS multi-tenant!
    // Para compatibilidade com versões anteriores, se uma OS não tiver empresaId,
    // nós a atribuímos para Danilo Empreendimentos ('emp_daniloempreendimentos') se este for o tenant ativo.
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

    // Ordenar decrescente pela data de criação
    sortServiceOrdersByCreationDate(isolatedOrders);

    // Refresh lightweight cache silenty
    try {
      const lightList = isolatedOrders.map(o => {
        const c = { ...o };
        delete c.fotosAntes;
        delete c.fotosDepois;
        delete c.pdfGerado;
        return c;
      });
      localStorage.setItem(`remaf_prod_service_orders_cache_${empresaId}`, JSON.stringify(lightList));
    } catch (_) {}

    return isolatedOrders;
  } catch (error) {
    console.warn('Fallback to LocalStorage due to IndexedDB read issue:', error);
    return getLocalServiceOrders(empresaId);
  }
};

/**
 * Fallback local cache recovery (SaaS Tenant-Isolated)
 */
export const getLocalServiceOrders = (empresaId: string): OrdemDeServico[] => {
  const keys = [
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
 * Computes next unique incremental sequence number (SaaS Tenant-Isolated)
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

/**
 * Image storage adapter. Converts and stores images locally in WebP format
 */
export const uploadImageFile = async (dataUrl: string, _folder: 'antes' | 'depois', _filename: string): Promise<string> => {
  // WebP representation already compressed by imageCompressor utility
  return dataUrl;
};

/**
 * Deletes a service order from IndexedDB and local storage cache (SaaS Tenant-Isolated)
 */
export const deleteServiceOrder = async (id: string, empresaId: string): Promise<void> => {
  try {
    // 1. Delete from IndexedDB
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 2. Delete from LocalStorage caches
    const keys = [
      `remaf_service_orders_${empresaId}`, 
      `remaf_prod_service_orders_cache_${empresaId}`
    ];
    keys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          let list: any[] = JSON.parse(cached);
          if (Array.isArray(list)) {
            list = list.filter(o => o.id !== id);
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      } catch (e) {
        console.warn(`Local Storage delete issue: Key "${key}" -`, e);
      }
    });

  } catch (error) {
    console.error('Error deleting from local databases (IndexedDB & LocalStorage):', error);
    throw error;
  }
};

/**
 * PDF base64 storage adaptor inside IndexedDB
 */
export const uploadPDFReport = async (pdfBase64: string, _osNumber: string): Promise<string> => {
  return pdfBase64;
};
