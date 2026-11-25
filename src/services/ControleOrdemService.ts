import { ControleOrdem } from '../models/ControleOrdem';
import { FirestoreRepository } from './FirestoreRepository';

const COLLECTION = 'controle_ordens';

export const ControleOrdemService = {
  getAll(empresaId: string, userEmail?: string): Promise<ControleOrdem[]> {
    return FirestoreRepository.getAll<ControleOrdem>(COLLECTION, empresaId, userEmail);
  },

  save(row: ControleOrdem, userEmail?: string): Promise<ControleOrdem> {
    return FirestoreRepository.add<ControleOrdem>(COLLECTION, row, row.empresaId, userEmail);
  },

  delete(id: string, empresaId: string, userEmail?: string): Promise<void> {
    return FirestoreRepository.delete(COLLECTION, id, empresaId, userEmail);
  },

  listen(empresaId: string, callback: (rows: ControleOrdem[]) => void, userEmail?: string): () => void {
    return FirestoreRepository.listen<ControleOrdem>(COLLECTION, empresaId, callback, [], userEmail);
  },
};
