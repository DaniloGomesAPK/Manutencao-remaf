import { OrdemDeServico } from './types';

export const isLocalSandbox = false;

const DB_NAME = 'RemafIndexedDB';
const DB_VERSION = 2;
const STORE_NAME = 'serviceOrders';

const STORES = [
  'serviceOrders',
  'clientes',
  'equipamentos',
  'servicos',
  'precificacao',
  'lixeira',
  'financeiro',
  'historicos',
  'relatorios',
  'configuracoes',
  'company_profile',
  'empresas',
  'sync_queue',
  'logs',
  'empresa'
];

let dbInstance: IDBDatabase | null = null;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          const objectStore = db.createObjectStore(store, { keyPath: 'id' });
          if (store === 'serviceOrders') {
            objectStore.createIndex('by-empresaId', 'empresaId', { unique: false });
          }
        }
      });
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const generateNewDocumentId = (): string => {
  return `os_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const generateNextOSNumber = async (empresaId: string, customOrdersList?: OrdemDeServico[]): Promise<string> => {
  const cleanEmpresaId = empresaId?.trim();
  if (!cleanEmpresaId) {
    throw new Error('Operação bloqueada: empresaId é obrigatório para gerar o número da OS.');
  }
  const orders = customOrdersList && Array.isArray(customOrdersList) 
    ? customOrdersList.filter(o => o.empresaId === cleanEmpresaId)
    : await fetchAllServiceOrders(cleanEmpresaId);
  const nextNum = orders.length + 1;
  return `OS-${String(nextNum).padStart(4, '0')}`;
};

/**
 * Salva ou atualiza uma Ordem de Serviço isolada estritamente por empresaId.
 */
export const saveOrdemDeServico = async (osData: OrdemDeServico): Promise<OrdemDeServico> => {
  const empresaId = osData.empresaId?.trim();
  if (!empresaId) {
    throw new Error('Operação bloqueada: Impossível salvar Ordem de Serviço sem um empresaId válido.');
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const savedOS: OrdemDeServico = {
      ...osData,
      empresaId,
      id: osData.id || generateNewDocumentId(),
      dataAbertura: osData.dataAbertura || new Date().toISOString(),
      horaAbertura: osData.horaAbertura || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: osData.status || 'Pendente',
      updatedAt: new Date().toISOString(),
    };

    const request = store.put(savedOS);
    request.onsuccess = () => resolve(savedOS);
    request.onerror = () => reject(request.error);
  });
};

export const saveServiceOrder = saveOrdemDeServico;

/**
 * Consulta todas as Ordens de Serviço pertencentes exclusivamente à empresa especificada.
 */
export const fetchAllServiceOrders = async (empresaId: string): Promise<OrdemDeServico[]> => {
  const cleanEmpresaId = empresaId?.trim();
  if (!cleanEmpresaId) {
    throw new Error('Operação bloqueada: Impossível consultar Ordens de Serviço sem um empresaId válido.');
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all = (request.result || []) as OrdemDeServico[];
      const filtered = all.filter(o => o.empresaId === cleanEmpresaId);
      filtered.sort((a, b) => {
        const da = new Date(a.dataAbertura || 0).getTime();
        const dbTime = new Date(b.dataAbertura || 0).getTime();
        return dbTime - da;
      });
      resolve(filtered);
    };

    request.onerror = () => reject(request.error);
  });
};

/**
 * Consulta uma Ordem de Serviço por ID garantindo vínculo com a empresa.
 */
export const fetchServiceOrderById = async (id: string, empresaId: string): Promise<OrdemDeServico | null> => {
  const cleanEmpresaId = empresaId?.trim();
  if (!cleanEmpresaId) {
    throw new Error('Operação bloqueada: Impossível consultar Ordem de Serviço sem um empresaId válido.');
  }
  if (!id || !id.trim()) {
    throw new Error('Operação bloqueada: ID da Ordem de Serviço não informado.');
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id.trim());

    request.onsuccess = () => {
      const order = request.result as OrdemDeServico | undefined;
      if (order && order.empresaId === cleanEmpresaId) {
        resolve(order);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

/**
 * Exclui uma Ordem de Serviço pertencente exclusivamente à empresa informada.
 */
export const deleteServiceOrder = async (id: string, empresaId: string): Promise<boolean> => {
  const cleanEmpresaId = empresaId?.trim();
  if (!cleanEmpresaId) {
    throw new Error('Operação bloqueada: Impossível excluir Ordem de Serviço sem um empresaId válido.');
  }
  if (!id || !id.trim()) {
    throw new Error('Operação bloqueada: ID da Ordem de Serviço não informado.');
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id.trim());

    getReq.onsuccess = () => {
      const existing = getReq.result as OrdemDeServico | undefined;
      if (!existing || existing.empresaId !== cleanEmpresaId) {
        return resolve(false);
      }

      const delReq = store.delete(id.trim());
      delReq.onsuccess = () => resolve(true);
      delReq.onerror = () => reject(delReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
};

/**
 * Atualiza o status de uma Ordem de Serviço com validação de tenant.
 */
export const updateServiceOrderStatus = async (
  id: string, 
  status: OrdemDeServico['status'], 
  empresaId: string
): Promise<OrdemDeServico | null> => {
  const cleanEmpresaId = empresaId?.trim();
  if (!cleanEmpresaId) {
    throw new Error('Operação bloqueada: Impossível atualizar status da OS sem um empresaId válido.');
  }

  const os = await fetchServiceOrderById(id, cleanEmpresaId);
  if (!os) {
    throw new Error(`Ordem de Serviço ${id} não encontrada para a empresa informada.`);
  }

  const updated: OrdemDeServico = {
    ...os,
    status,
    updatedAt: new Date().toISOString()
  };

  return await saveOrdemDeServico(updated);
};

export const uploadPDFReport = async (pdfUri: string, _numeroOS?: string): Promise<string> => {
  return pdfUri;
};
