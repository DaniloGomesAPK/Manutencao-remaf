/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  collection, 
  query, 
  onSnapshot,
  QueryConstraint,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import { app } from '../config/firebase';
import { openDB } from '../db';
import { LogService } from './LogService';

const db = getFirestore(app);

export const ALL_STORES = [
  'clientes',
  'equipamentos',
  'ordensServico',
  'financeiro',
  'precificacao',
  'historicos',
  'relatorios',
  'configuracoes',
  'company_profile',
  'servicos_inteligentes',
] as const;

export type StoreName = typeof ALL_STORES[number];

export interface SyncStatusInfo {
  status: 'synced' | 'syncing' | 'offline';
  isOnline: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
}

export type MappedCollectionName = StoreName;

/**
 * Valida rigorosamente o empresaId para garantir isolamento multiempresa (Tenant Isolation).
 * Lança exceção e registra log de segurança se o empresaId for nulo, indefinido, vazio ou 'emp_default'.
 */
export function validateEmpresaId(
  empresaId: string | null | undefined,
  operacao: string,
  colecao: string,
  userEmail?: string
): string {
  if (
    !empresaId ||
    typeof empresaId !== 'string' ||
    empresaId.trim() === '' ||
    empresaId === 'emp_default' ||
    empresaId === 'null' ||
    empresaId === 'undefined'
  ) {
    const errorMsg = `[TenantIsolationViolation] Operação '${operacao}' abortada na coleção '${colecao}': empresaId ausente ou inválido ('${String(empresaId)}').`;
    
    LogService.logOperation(
      userEmail || 'usuario_desconhecido',
      colecao,
      'invalid_tenant',
      operacao as any,
      0,
      errorMsg
    );

    LogService.logError(
      'SEGURANÇA_MULTIEMPRESA',
      'FirestoreRepository',
      errorMsg,
      new Error().stack,
      `Tentativa de acesso não autorizado/sem tenant na coleção ${colecao}`
    );

    throw new Error(errorMsg);
  }

  return empresaId.trim();
}

/**
 * Retorna o caminho oficial isolado do SaaS multi-tenant no Firestore:
 * empresas/{empresaId}/{colecao}
 */
export function getTenantCollectionPath(colecao: string, empresaId: string, operacao: string = 'path_resolution'): string {
  const validTenantId = validateEmpresaId(empresaId, operacao, colecao);
  
  let pathCollection = colecao;
  if (colecao === 'service_orders') pathCollection = 'ordensServico';
  if (colecao === 'precificacoes') pathCollection = 'precificacao';
  if (colecao === 'servicos_inteligentes') pathCollection = 'servicos';

  return `empresas/${validTenantId}/${pathCollection}`;
}

/**
 * Remove campos binários/base64 de grande porte (fotos, assinaturas, PDFs) do payload
 * enviado para a nuvem para economizar banda e otimizar limites do Firestore.
 */
export function stripHeavyFields(item: any): DocumentData {
  if (!item || typeof item !== 'object') return item;
  const clone = { ...item };

  delete clone.fotosAntes;
  delete clone.fotosDepois;
  delete clone.pdfGerado;
  delete clone.pdfBase64;
  delete clone.assinaturaTecnico;
  delete clone.assinaturaCliente;
  delete clone.logomarca;
  delete clone.anexos;

  return clone;
}

/**
 * Camada Central de Persistência FirestoreRepository
 * Centraliza toda a comunicação com o Firebase Firestore utilizando a SDK oficial.
 * Nenhuma tela ou componente acessa diretamente o Firebase.
 */
export const FirestoreRepository = {
  /**
   * Helper para verificar estado de conexão
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  /**
   * Adiciona ou cria um novo documento na coleção do inquilino
   */
  async add<T extends { id?: string; empresaId?: string; sincronizado?: boolean; ultimaSincronizacao?: string | null; [key: string]: any }>(
    colecao: MappedCollectionName | string,
    data: T,
    empresaId: string,
    userEmail?: string
  ): Promise<T> {
    const startTime = performance.now();
    const tenantId = validateEmpresaId(data.empresaId || empresaId, 'add', colecao, userEmail);
    const docId = data.id || 'doc_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    const timestamp = new Date().toISOString();

    const recordWithMeta: T = {
      ...data,
      id: docId,
      empresaId: tenantId,
      createdAt: data.createdAt || timestamp,
      updatedAt: timestamp,
      sincronizado: false,
      ultimaSincronizacao: data.ultimaSincronizacao || null,
    };

    // 1. Grava no cache local primeiro (IndexedDB / LocalStorage)
    await saveLocalStoreItem(colecao, recordWithMeta);

    // 2. Tenta gravar no Firestore oficial se estiver online
    if (this.isOnline()) {
      try {
        const collectionPath = getTenantCollectionPath(colecao, tenantId, 'add');
        const docRef = doc(db, collectionPath, docId);
        const lightData = stripHeavyFields(recordWithMeta);

        lightData.sincronizado = true;
        lightData.ultimaSincronizacao = timestamp;

        await setDoc(docRef, lightData, { merge: true });

        recordWithMeta.sincronizado = true;
        recordWithMeta.ultimaSincronizacao = timestamp;
        await saveLocalStoreItem(colecao, recordWithMeta);

        LogService.logOperation(userEmail || 'usuario', colecao, docId, 'add', performance.now() - startTime);
      } catch (error) {
        LogService.logOperation(userEmail || 'usuario', colecao, docId, 'add', performance.now() - startTime, error);
        console.warn(`[FirestoreRepository] Falha ao adicionar doc no Firestore (${colecao}/${docId}), salvo localmente:`, error);
      }
    } else {
      LogService.logOperation(userEmail || 'usuario', colecao, docId, 'add', performance.now() - startTime, 'Offline mode - saved locally');
    }

    notifySyncStatusChange();
    return recordWithMeta;
  },

  /**
   * Atualiza um documento existente
   */
  async update<T extends { [key: string]: any }>(
    colecao: MappedCollectionName | string,
    docId: string,
    data: Partial<T>,
    empresaId: string,
    userEmail?: string
  ): Promise<void> {
    const startTime = performance.now();
    const validTenantId = validateEmpresaId(empresaId, 'update', colecao, userEmail);
    const timestamp = new Date().toISOString();

    const existingList = await getLocalStoreItems<any>(colecao, validTenantId);
    const existing = existingList.find(i => i.id === docId) || {};

    const updatedDoc = {
      ...existing,
      ...data,
      id: docId,
      empresaId: validTenantId,
      updatedAt: timestamp,
      sincronizado: false,
    };

    await saveLocalStoreItem(colecao, updatedDoc);

    if (this.isOnline()) {
      try {
        const collectionPath = getTenantCollectionPath(colecao, validTenantId, 'update');
        const docRef = doc(db, collectionPath, docId);
        const lightData = stripHeavyFields(updatedDoc);

        lightData.sincronizado = true;
        lightData.ultimaSincronizacao = timestamp;

        await setDoc(docRef, lightData, { merge: true });

        updatedDoc.sincronizado = true;
        updatedDoc.ultimaSincronizacao = timestamp;
        await saveLocalStoreItem(colecao, updatedDoc);

        LogService.logOperation(userEmail || 'usuario', colecao, docId, 'update', performance.now() - startTime);
      } catch (error) {
        LogService.logOperation(userEmail || 'usuario', colecao, docId, 'update', performance.now() - startTime, error);
        console.warn(`[FirestoreRepository] Falha ao atualizar doc no Firestore (${colecao}/${docId}):`, error);
      }
    } else {
      LogService.logOperation(userEmail || 'usuario', colecao, docId, 'update', performance.now() - startTime, 'Offline mode - updated locally');
    }

    notifySyncStatusChange();
  },

  /**
   * Exclui um documento do Firestore e do banco local
   */
  async delete(
    colecao: MappedCollectionName | string,
    docId: string,
    empresaId: string,
    userEmail?: string
  ): Promise<void> {
    const startTime = performance.now();
    const validTenantId = validateEmpresaId(empresaId, 'delete', colecao, userEmail);

    await deleteLocalStoreItem(colecao, docId, validTenantId);

    if (this.isOnline()) {
      try {
        const collectionPath = getTenantCollectionPath(colecao, validTenantId, 'delete');
        const docRef = doc(db, collectionPath, docId);
        await deleteDoc(docRef);

        LogService.logOperation(userEmail || 'usuario', colecao, docId, 'delete', performance.now() - startTime);
      } catch (error) {
        LogService.logOperation(userEmail || 'usuario', colecao, docId, 'delete', performance.now() - startTime, error);
        console.warn(`[FirestoreRepository] Falha ao excluir no Firestore (${colecao}/${docId}):`, error);
      }
    } else {
      LogService.logOperation(userEmail || 'usuario', colecao, docId, 'delete', performance.now() - startTime, 'Offline mode - deleted locally');
    }

    notifySyncStatusChange();
  },

  /**
   * Busca um único documento pelo ID
   */
  async get<T extends { id: string }>(
    colecao: MappedCollectionName | string,
    docId: string,
    empresaId: string,
    userEmail?: string
  ): Promise<T | null> {
    const startTime = performance.now();
    const validTenantId = validateEmpresaId(empresaId, 'get', colecao, userEmail);

    if (this.isOnline()) {
      try {
        const collectionPath = getTenantCollectionPath(colecao, validTenantId, 'get');
        const docRef = doc(db, collectionPath, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const remoteData = { id: docSnap.id, ...docSnap.data() } as T;
          
          const localList = await getLocalStoreItems<T>(colecao, validTenantId);
          const localDoc = localList.find(i => i.id === docId);
          const merged = { ...localDoc, ...remoteData, sincronizado: true };

          await saveLocalStoreItem(colecao, merged);
          LogService.logOperation(userEmail || 'usuario', colecao, docId, 'get', performance.now() - startTime);
          return merged;
        }
      } catch (error) {
        LogService.logOperation(userEmail || 'usuario', colecao, docId, 'get', performance.now() - startTime, error);
      }
    }

    const localList = await getLocalStoreItems<T>(colecao, validTenantId);
    const found = localList.find(i => i.id === docId) || null;
    LogService.logOperation(userEmail || 'usuario', colecao, docId, 'get', performance.now() - startTime, found ? null : 'Doc not found local/offline');
    return found;
  },

  /**
   * Retorna todos os documentos pertencentes exclusivamente ao inquilino (empresaId)
   */
  async getAll<T extends { id: string; empresaId?: string; sincronizado?: boolean }>(
    colecao: MappedCollectionName | string,
    empresaId: string,
    userEmail?: string
  ): Promise<T[]> {
    const startTime = performance.now();
    const validTenantId = validateEmpresaId(empresaId, 'getAll', colecao, userEmail);

    if (this.isOnline()) {
      try {
        const collectionPath = getTenantCollectionPath(colecao, validTenantId, 'getAll');
        const querySnapshot = await getDocs(collection(db, collectionPath));
        const remoteDocs: T[] = [];

        querySnapshot.forEach((docSnap) => {
          remoteDocs.push({ id: docSnap.id, ...docSnap.data() } as T);
        });

        const localDocs = await getLocalStoreItems<T>(colecao, validTenantId);
        const mergedMap = new Map<string, T>();

        localDocs.forEach((lDoc) => mergedMap.set(lDoc.id, lDoc));

        remoteDocs.forEach((rDoc) => {
          const lDoc = mergedMap.get(rDoc.id);
          if (lDoc && lDoc.sincronizado === false) {
            return;
          }
          const mergedDoc = { ...lDoc, ...rDoc, sincronizado: true };
          mergedMap.set(rDoc.id, mergedDoc);
        });

        const mergedList = Array.from(mergedMap.values());
        await saveLocalStoreBatch(colecao, mergedList, validTenantId);

        LogService.logOperation(userEmail || 'usuario', colecao, 'all', 'getAll', performance.now() - startTime);
        return mergedList;
      } catch (error) {
        LogService.logOperation(userEmail || 'usuario', colecao, 'all', 'getAll', performance.now() - startTime, error);
        console.warn(`[FirestoreRepository] Erro ao buscar da nuvem (${colecao}), usando cache local:`, error);
      }
    }

    const localDocs = await getLocalStoreItems<T>(colecao, validTenantId);
    LogService.logOperation(userEmail || 'usuario', colecao, 'all', 'getAll', performance.now() - startTime, 'Read from local cache');
    return localDocs;
  },

  /**
   * Executa consultas personalizadas no Firestore com filtros (where, orderBy, limit)
   */
  async query<T extends { id: string; empresaId?: string }>(
    colecao: MappedCollectionName | string,
    empresaId: string,
    constraints: QueryConstraint[],
    userEmail?: string
  ): Promise<T[]> {
    const startTime = performance.now();
    const validTenantId = validateEmpresaId(empresaId, 'query', colecao, userEmail);

    if (this.isOnline()) {
      try {
        const collectionPath = getTenantCollectionPath(colecao, validTenantId, 'query');
        const q = query(collection(db, collectionPath), ...constraints);
        const querySnapshot = await getDocs(q);
        const results: T[] = [];

        querySnapshot.forEach((docSnap) => {
          results.push({ id: docSnap.id, ...docSnap.data() } as T);
        });

        LogService.logOperation(userEmail || 'usuario', colecao, 'query', 'query', performance.now() - startTime);
        return results;
      } catch (error) {
        LogService.logOperation(userEmail || 'usuario', colecao, 'query', 'query', performance.now() - startTime, error);
      }
    }

    const localAll = await getLocalStoreItems<T>(colecao, validTenantId);
    LogService.logOperation(userEmail || 'usuario', colecao, 'query', 'query', performance.now() - startTime, 'Query executed on local cache');
    return localAll;
  },

  /**
   * Escuta em tempo real (onSnapshot) alterações na coleção do inquilino.
   */
  listen<T extends { id: string; empresaId?: string }>(
    colecao: MappedCollectionName | string,
    empresaId: string,
    callback: (docs: T[]) => void,
    constraints: QueryConstraint[] = [],
    userEmail?: string
  ): Unsubscribe {
    const startTime = performance.now();
    const validTenantId = validateEmpresaId(empresaId, 'listen', colecao, userEmail);
    const collectionPath = getTenantCollectionPath(colecao, validTenantId, 'listen');

    try {
      const q = query(collection(db, collectionPath), ...constraints);
      
      const unsubscribe = onSnapshot(
        q,
        async (querySnapshot) => {
          const remoteDocs: T[] = [];
          querySnapshot.forEach((docSnap) => {
            remoteDocs.push({ id: docSnap.id, ...docSnap.data() } as T);
          });

          const localDocs = await getLocalStoreItems<T>(colecao, validTenantId);
          const mergedMap = new Map<string, T>();

          localDocs.forEach((l) => mergedMap.set(l.id, l));
          remoteDocs.forEach((r) => {
            const lDoc = mergedMap.get(r.id);
            if (lDoc && (lDoc as any).sincronizado === false) return;
            mergedMap.set(r.id, { ...lDoc, ...r, sincronizado: true });
          });

          const finalList = Array.from(mergedMap.values());
          await saveLocalStoreBatch(colecao, finalList, validTenantId);

          LogService.logOperation(userEmail || 'usuario', colecao, 'realtime_snapshot', 'listen', performance.now() - startTime);
          callback(finalList);
        },
        (error) => {
          LogService.logOperation(userEmail || 'usuario', colecao, 'realtime_snapshot', 'listen', performance.now() - startTime, error);
          console.warn(`[FirestoreRepository] Erro no listener real-time de ${colecao}:`, error);
          getLocalStoreItems<T>(colecao, validTenantId).then((localDocs) => callback(localDocs));
        }
      );

      return unsubscribe;
    } catch (err) {
      LogService.logOperation(userEmail || 'usuario', colecao, 'listen_fail', 'listen', performance.now() - startTime, err);
      getLocalStoreItems<T>(colecao, validTenantId).then((localDocs) => callback(localDocs));
      return () => {};
    }
  },

  /**
   * Sincroniza todos os registros pendentes (sincronizado === false) de todas as coleções
   */
  async syncPendingRecords(empresaId: string, userEmail?: string): Promise<{ syncedCount: number; remainingCount: number }> {
    const validTenantId = validateEmpresaId(empresaId, 'syncPendingRecords', 'all_stores', userEmail);

    if (!this.isOnline()) {
      const remaining = await this.getPendingCount(validTenantId);
      return { syncedCount: 0, remainingCount: remaining };
    }

    let syncedCount = 0;
    const now = new Date().toISOString();

    for (const storeName of ALL_STORES) {
      try {
        const localItems = await getLocalStoreItems<any>(storeName, validTenantId);
        const pendingItems = localItems.filter((i) => i.sincronizado === false);

        for (const item of pendingItems) {
          try {
            const itemTenantId = validateEmpresaId(item.empresaId || validTenantId, 'syncPendingItem', storeName, userEmail);
            const collectionPath = getTenantCollectionPath(storeName, itemTenantId, 'syncPendingRecords');
            const docRef = doc(db, collectionPath, item.id);
            const lightData = stripHeavyFields(item);

            lightData.sincronizado = true;
            lightData.ultimaSincronizacao = now;

            await setDoc(docRef, lightData, { merge: true });

            item.sincronizado = true;
            item.ultimaSincronizacao = now;
            await saveLocalStoreItem(storeName, item);
            syncedCount++;
          } catch (itemErr) {
            console.error(`[FirestoreRepository] Erro ao sincronizar item pendente em ${storeName}/${item.id}:`, itemErr);
          }
        }
      } catch (colErr) {
        console.error(`[FirestoreRepository] Erro na coleção ${storeName} durante sync:`, colErr);
      }
    }

    const remainingCount = await this.getPendingCount(validTenantId);
    notifySyncStatusChange();
    return { syncedCount, remainingCount };
  },

  /**
   * Contagem de itens pendentes para o inquilino
   */
  async getPendingCount(empresaId: string): Promise<number> {
    const validTenantId = validateEmpresaId(empresaId, 'getPendingCount', 'all_stores');
    let count = 0;
    for (const storeName of ALL_STORES) {
      try {
        const items = await getLocalStoreItems<any>(storeName, validTenantId);
        count += items.filter((i) => i.sincronizado === false).length;
      } catch (_) {}
    }
    return count;
  }
};

// --- FUNÇÕES AUXILIARES INTERNAS DE CACHE LOCAL ---

async function getLocalStoreItems<T>(colecao: string, empresaId: string): Promise<T[]> {
  const validTenantId = validateEmpresaId(empresaId, 'getLocalStoreItems', colecao);

  try {
    const idbName = mapCollectionToStoreName(colecao);
    if (idbName) {
      const dbInstance = await openDB();
      const items = await new Promise<T[]>((resolve, reject) => {
        const transaction = dbInstance.transaction(idbName, 'readonly');
        const store = transaction.objectStore(idbName);
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result as T[]) || []);
        request.onerror = () => reject(request.error);
      });

      const filtered = items.filter((i: any) => !i.empresaId || i.empresaId === validTenantId);
      if (filtered.length > 0) return filtered;
    }
  } catch (_) {}

  try {
    const key = `remaf_cache_${colecao}_${validTenantId}`;
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}

  return [];
}

async function saveLocalStoreItem(colecao: string, item: any): Promise<void> {
  const empId = validateEmpresaId(item.empresaId, 'saveLocalStoreItem', colecao);

  try {
    const idbName = mapCollectionToStoreName(colecao);
    if (idbName) {
      const dbInstance = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = dbInstance.transaction(idbName, 'readwrite');
        const store = transaction.objectStore(idbName);
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    const key = `remaf_cache_${colecao}_${empId}`;
    const cached = localStorage.getItem(key);
    let list: any[] = cached ? JSON.parse(cached) : [];
    if (!Array.isArray(list)) list = [];
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx !== -1) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn(`[FirestoreRepository] Erro no salvamento local de ${colecao}:`, e);
  }
}

async function saveLocalStoreBatch(colecao: string, items: any[], empresaId: string): Promise<void> {
  const validTenantId = validateEmpresaId(empresaId, 'saveLocalStoreBatch', colecao);

  try {
    const idbName = mapCollectionToStoreName(colecao);
    if (idbName) {
      const dbInstance = await openDB();
      const tx = dbInstance.transaction(idbName, 'readwrite');
      const store = tx.objectStore(idbName);
      for (const item of items) {
        store.put(item);
      }
    }

    const key = `remaf_cache_${colecao}_${validTenantId}`;
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.warn(`[FirestoreRepository] Erro no salvamento local em lote de ${colecao}:`, e);
  }
}

async function deleteLocalStoreItem(colecao: string, id: string, empresaId: string): Promise<void> {
  const validTenantId = validateEmpresaId(empresaId, 'deleteLocalStoreItem', colecao);

  try {
    const idbName = mapCollectionToStoreName(colecao);
    if (idbName) {
      const dbInstance = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = dbInstance.transaction(idbName, 'readwrite');
        const store = transaction.objectStore(idbName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    const key = `remaf_cache_${colecao}_${validTenantId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      let list: any[] = JSON.parse(cached);
      if (Array.isArray(list)) {
        list = list.filter((x) => x.id !== id);
        localStorage.setItem(key, JSON.stringify(list));
      }
    }
  } catch (e) {
    console.warn(`[FirestoreRepository] Erro na exclusão local de ${colecao}:`, e);
  }
}

function mapCollectionToStoreName(colecao: string): string {
  if (colecao === 'service_orders' || colecao === 'ordensServico') return 'service_orders';
  if (colecao === 'company_profile') return 'company_profile';
  if (colecao === 'clientes') return 'clientes';
  if (colecao === 'equipamentos') return 'equipamentos';
  if (colecao === 'servicos_inteligentes' || colecao === 'servicos') return 'servicos_inteligentes';
  if (colecao === 'precificacoes' || colecao === 'precificacao') return 'precificacoes';
  if (colecao === 'financeiro') return 'financeiro';
  if (colecao === 'configuracoes') return 'configuracoes';
  return colecao;
}

function notifySyncStatusChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('remaf_sync_status_changed'));
  }
}
