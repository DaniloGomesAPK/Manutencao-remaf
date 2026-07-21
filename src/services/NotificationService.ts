/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

type NotificationListener = (notifications: SystemNotification[]) => void;

let notificationsList: SystemNotification[] = [
  {
    id: 'notif_welcome',
    type: 'success',
    title: 'Bem-vindo ao DG Gestão Automotiva',
    message: 'Seu ambiente de trabalho foi inicializado com sucesso e o banco de dados offline local está ativo.',
    timestamp: new Date().toISOString(),
    read: false
  }
];

const listeners = new Set<NotificationListener>();

export const NotificationService = {
  /**
   * Adiciona uma nova notificação do sistema.
   */
  notify(type: SystemNotification['type'], title: string, message: string): SystemNotification {
    const notif: SystemNotification = {
      id: `notif_${Math.random().toString(36).substring(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    notificationsList = [notif, ...notificationsList];
    this.notifyListeners();
    return notif;
  },

  /**
   * Retorna a lista de notificações atuais.
   */
  getNotifications(): SystemNotification[] {
    return [...notificationsList];
  },

  /**
   * Marca uma notificação específica como lida.
   */
  markAsRead(id: string): void {
    notificationsList = notificationsList.map(n => n.id === id ? { ...n, read: true } : n);
    this.notifyListeners();
  },

  /**
   * Marca todas as notificações como lidas.
   */
  markAllAsRead(): void {
    notificationsList = notificationsList.map(n => ({ ...n, read: true }));
    this.notifyListeners();
  },

  /**
   * Remove uma notificação específica.
   */
  clear(id: string): void {
    notificationsList = notificationsList.filter(n => n.id !== id);
    this.notifyListeners();
  },

  /**
   * Inscreve um ouvinte para atualizações das notificações.
   */
  subscribe(listener: NotificationListener): () => void {
    listeners.add(listener);
    listener(this.getNotifications());
    return () => {
      listeners.delete(listener);
    };
  },

  notifyListeners(): void {
    const current = this.getNotifications();
    listeners.forEach(listener => {
      try {
        listener(current);
      } catch (err) {
        console.error('Erro no ouvinte de notificações:', err);
      }
    });
  }
};
