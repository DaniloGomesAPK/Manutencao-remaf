/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CheckoutConfig {
  monthlyCheckoutUrl?: string;
  annualCheckoutUrl?: string;
}

type CheckoutListener = (plan: 'mensal' | 'anual') => void;

const WHATSAPP_NUMBER = '5573999868104';

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
   * Configura URLs de checkout
   */
  setConfig(newConfig: CheckoutConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Abre o WhatsApp com mensagem do Plano Mensal (R$ 50/mês)
   */
  openMonthlyCheckout(userEmail?: string): void {
    console.log('[CheckoutService] Redirecionando para WhatsApp para contratar Plano Mensal');
    let message = 'Olá! Tenho interesse em adquirir o acesso ao sistema DG Gestão em Orçamentos no Plano Mensal (R$ 50,00/mês).';
    if (userEmail) {
      message += ` Meu e-mail de cadastro é: ${userEmail}.`;
    }
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    this.notifyListeners('mensal');
  }

  /**
   * Abre o WhatsApp com mensagem do Plano Anual (R$ 550/ano PIX)
   */
  openAnnualCheckout(userEmail?: string): void {
    console.log('[CheckoutService] Redirecionando para WhatsApp para contratar Plano Anual');
    let message = 'Olá! Tenho interesse em adquirir o acesso ao sistema DG Gestão em Orçamentos no Plano Anual (R$ 550,00/ano no PIX - 1 mês grátis).';
    if (userEmail) {
      message += ` Meu e-mail de cadastro é: ${userEmail}.`;
    }
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    this.notifyListeners('anual');
  }

  private notifyListeners(plan: 'mensal' | 'anual') {
    this.listeners.forEach((listener) => {
      try {
        listener(plan);
      } catch (e) {
        console.error('[CheckoutService] Erro no ouvinte de checkout:', e);
      }
    });
  }
}

export const CheckoutService = new CheckoutServiceManager();

