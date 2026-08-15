/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utilitário para transformar erros técnicos do JavaScript, DOM, Storage,
 * Firebase Auth e Firestore em mensagens amigáveis e claras para o usuário final.
 */
export function getFriendlyErrorMessage(error: unknown, defaultMessage = 'Ocorreu um imprevisto. Por favor, tente novamente.'): string {
  if (!error) return defaultMessage;

  const rawMessage = typeof error === 'string'
    ? error
    : (error as any)?.message || (error as any)?.code || String(error);

  const errorString = String(rawMessage).toLowerCase();

  // 1. Erros de Armazenamento Local / Quota Excedida (LocalStorage)
  if (
    errorString.includes('quota') ||
    errorString.includes('setitem') ||
    errorString.includes('quotaexceeded') ||
    errorString.includes('storage') ||
    errorString.includes('exceeded the quota') ||
    errorString.includes('ns_error_dom_quota_reached')
  ) {
    return 'O espaço de armazenamento temporário do seu navegador estava cheio. Limpamos automaticamente arquivos temporários e caches antigos para liberar espaço. Por favor, tente novamente.';
  }

  // 2. Erros de Autenticação Firebase (Firebase Auth)
  if (
    errorString.includes('auth/invalid-credential') ||
    errorString.includes('auth/wrong-password') ||
    errorString.includes('auth/user-not-found') ||
    errorString.includes('credenciais') ||
    errorString.includes('e-mail ou senha inválidos')
  ) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.';
  }

  if (errorString.includes('auth/email-already-in-use') || errorString.includes('já está cadastrado')) {
    return 'Este e-mail já possui cadastro no sistema. Você pode entrar diretamente com sua senha ou recuperá-la.';
  }

  if (errorString.includes('auth/weak-password')) {
    return 'A senha informada é muito simples. Por segurança, utilize no mínimo 6 caracteres.';
  }

  if (errorString.includes('auth/invalid-email')) {
    return 'O formato do e-mail digitado é inválido. Por favor, confira o endereço informado.';
  }

  if (errorString.includes('auth/too-many-requests')) {
    return 'Muitas tentativas consecutivas detectadas. Por segurança, aguarde alguns instantes antes de tentar novamente.';
  }

  if (errorString.includes('auth/popup-closed-by-user') || errorString.includes('auth/cancelled-popup-request')) {
    return 'O login com o Google foi interrompido antes de ser concluído. Clique no botão novamente se desejar entrar.';
  }

  if (errorString.includes('auth/user-disabled')) {
    return 'Esta conta foi temporariamente desativada. Entre em contato com o suporte para reativação.';
  }

  if (errorString.includes('auth/network-request-failed')) {
    return 'Não foi possível conectar aos servidores de autenticação. Verifique sua conexão com a internet e tente novamente.';
  }

  // 3. Erros de Permissão e Licença do Firestore
  if (
    errorString.includes('permission-denied') ||
    errorString.includes('missing or insufficient permissions') ||
    errorString.includes('permissão')
  ) {
    return 'Acesso restrito ou período de testes finalizado. Por favor, verifique a ativação do seu plano para continuar.';
  }

  if (errorString.includes('resource-exhausted')) {
    return 'O sistema está processando um alto volume de requisições. Aguarde alguns segundos e tente novamente.';
  }

  if (errorString.includes('deadline-exceeded') || errorString.includes('timeout')) {
    return 'A operação demorou mais que o esperado para responder. Verifique sua conexão com a internet.';
  }

  if (errorString.includes('unavailable') || errorString.includes('failed to get document because the client is offline')) {
    return 'Servidor temporariamente indisponível ou você está offline. Seus dados continuam salvos com segurança no seu dispositivo.';
  }

  // 4. Erros de Rede e Conectividade
  if (
    errorString.includes('failed to fetch') ||
    errorString.includes('networkerror') ||
    errorString.includes('err_internet_disconnected') ||
    errorString.includes('offline')
  ) {
    return 'Sem conexão com a internet no momento. Verifique sua rede e tente novamente.';
  }

  // 5. Erros de JSON ou dados corrompidos
  if (errorString.includes('unexpected token') || errorString.includes('json.parse')) {
    return 'Não foi possível processar os dados temporários locais. Recarregue a página para atualizar as informações.';
  }

  // 6. Mensagens já amigáveis em Português
  if (
    typeof rawMessage === 'string' &&
    rawMessage.length > 5 &&
    !rawMessage.includes('at ') &&
    !rawMessage.includes('function') &&
    !rawMessage.includes('TypeError') &&
    !rawMessage.includes('ReferenceError') &&
    !rawMessage.includes('SyntaxError') &&
    !rawMessage.includes('object Object') &&
    !rawMessage.includes('Unhandled')
  ) {
    return rawMessage;
  }

  return defaultMessage;
}
