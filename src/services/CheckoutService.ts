/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationService } from './NotificationService';

export interface CheckoutConfig {
  monthlyCheckoutUrl?: string;
  annualCheckoutUrl?: string;
}

type CheckoutListener = (plan: 'mensal' | 'anual') => void;

class CheckoutServiceManager {
  private listeners: Set<CheckoutListener> = new Set();
  private config: CheckoutConfig = {
    monthlyCheckoutUrl: '',
    annualCheckoutUrl: ''
  };

  /**
   * Registra um ouvinte para aberturas de checkout (ex: Modal de Pagamento na UI)
   */
  subscribe(listener: CheckoutListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Configura URLs de checkout da Cakto futuramente
   */
  setConfig(newConfig: CheckoutConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Abre o checkout do Plano Mensal (R$ 50/mês)
   */
  openMonthlyCheckout(): void {
    console.log('[CheckoutService] Iniciando checkout do Plano Mensal');
    if (this.config.monthlyCheckoutUrl) {
      window.open(this.config.monthlyCheckoutUrl, '_blank');
      return;
    }
    
    // Notifica os componentes UI registrados para abrir o modal de aviso
    this.notifyListeners('mensal');
  }

  /**
   * Abre o checkout do Plano Anual (R$ 550/ano PIX)
   */
  openAnnualCheckout(): void {
    console.log('[CheckoutService] Iniciando checkout do Plano Anual');
    if (this.config.annualCheckoutUrl) {
      window.open(this.config.annualCheckoutUrl, '_blank');
      return;
    }
    
    // Notifica os componentes UI registrados para abrir o modal de aviso
    this.notifyListeners('anual');
  }

  private notifyListeners(plan: 'mensal' | 'anual') {
    if (this.listeners.size === 0) {
      NotificationService.notify(
        'info',
        'Pagamento via Cakto em Breve',
        'O sistema de pagamentos estará disponível em breve. Sua licença foi reservada com sucesso!'
      );
    } else {
      this.listeners.forEach((listener) => {
        try {
          listener(plan);
        } catch (e) {
          console.error('[CheckoutService] Erro no ouvinte de checkout:', e);
        }
      });
    }
  }
}

export const CheckoutService = new CheckoutServiceManager();
