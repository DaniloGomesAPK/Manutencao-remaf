/**
 * Navigation State Persistence & Smart Focus Helpers for DG Orçamentos Phase 3.1 (Produtividade)
 * Preserves search terms, filters, selected items, and scroll positions across module switches.
 */

export interface ModuleNavState {
  searchTerm?: string;
  filterStatus?: string;
  category?: string;
  selectedId?: string;
  scrollPos?: number;
  activeTab?: string;
  showTable?: boolean;
  extra?: Record<string, any>;
}

export function saveModuleState(moduleKey: string, state: Partial<ModuleNavState>) {
  try {
    const existing = getModuleState(moduleKey);
    const updated = { ...existing, ...state };
    sessionStorage.setItem(`remaf_nav_state_${moduleKey}`, JSON.stringify(updated));
  } catch (_) {}
}

export function getModuleState(moduleKey: string): ModuleNavState {
  try {
    const data = sessionStorage.getItem(`remaf_nav_state_${moduleKey}`);
    return data ? JSON.parse(data) : {};
  } catch (_) {
    return {};
  }
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);
}

export function applySmartFocus(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null, options?: { force?: boolean; delay?: number }) {
  if (!element) return;
  if (!isMobileDevice() || options?.force) {
    setTimeout(() => {
      try {
        element.focus();
        if (element instanceof HTMLInputElement && element.type === 'text') {
          // Place cursor at end of text
          const len = element.value.length;
          element.setSelectionRange(len, len);
        }
      } catch (_) {}
    }, options?.delay ?? 100);
  }
}
