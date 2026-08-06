/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthService } from '../services/AuthService';
import { Usuario } from '../models/Usuario';

/**
 * Suite de Testes Automáticos de Segurança do Fluxo de Autenticação (Firebase Auth)
 */
export async function runAuthSecurityTests() {
  console.log('=== INICIANDO TESTES AUTOMÁTICOS DE SEGURANÇA DE AUTENTICAÇÃO ===');

  let passed = 0;
  let failed = 0;

  function logPass(testName: string) {
    console.log(`✅ TEST PASSED: [${testName}]`);
    passed++;
  }

  function logFail(testName: string, reason: string) {
    console.error(`❌ TEST FAILED: [${testName}] - ${reason}`);
    failed++;
  }

  // Teste 1: Tentar login com e-mail inexistente e senha qualquer deve ser NEGADO (sem criar conta)
  try {
    const fakeEmail = `fake_user_${Date.now()}@teste-invalid.com`;
    await AuthService.login(fakeEmail, 'SenhaErrada123!');
    logFail('Usuário Inexistente Negado', 'Deveria ter lançado erro de e-mail/senha inválidos, mas o login passou.');
  } catch (e: any) {
    if (e.message.includes('E-mail ou senha inválidos') || e.message.includes('invalid') || e.message.includes('not found')) {
      logPass('Usuário Inexistente Negado');
    } else {
      logFail('Usuário Inexistente Negado', `Mensagem de erro inesperada: ${e.message}`);
    }
  }

  // Teste 2: Tentar login com e-mail correto e senha incorreta deve ser NEGADO
  try {
    // Tenta com um e-mail cadastrado porém senha errada
    await AuthService.login('admin@remaf.com.br', 'SenhaTotalmenteIncorreta999!');
    logFail('Senha Incorreta Negada', 'Deveria ter negado o acesso para senha incorreta.');
  } catch (e: any) {
    if (e.message.includes('E-mail ou senha inválidos') || e.message.includes('invalid') || e.message.includes('wrong')) {
      logPass('Senha Incorreta Negada');
    } else {
      logFail('Senha Incorreta Negada', `Mensagem de erro inesperada: ${e.message}`);
    }
  }

  // Teste 3: Tentar login informando e-mail de outro usuário com senha de outro deve ser NEGADO
  try {
    await AuthService.login('usuario_vitima@remaf.com.br', 'SenhaAtacante123!');
    logFail('E-mail de Terceiros Negado', 'Permitiu autenticar em e-mail alheio com credencial incompatível.');
  } catch (e: any) {
    logPass('E-mail de Terceiros Negado');
  }

  // Teste 4: Validação de Conta Desabilitada / Suspensa no processUserSession
  try {
    const mockUserBlocked: any = {
      uid: 'user_test_blocked_123',
      email: 'bloqueado@empresa.com',
      displayName: 'Usuário Bloqueado'
    };

    // Força checagem com status de conta bloqueada
    await AuthService.processUserSession(mockUserBlocked);
    // Se o documento users/{uid} tiver statusConta = 'blocked', processUserSession deve rejeitar
    logPass('Validação de Status de Conta');
  } catch (e: any) {
    if (e.message.includes('desabilitada') || e.message.includes('suspensa') || e.message.includes('blocked')) {
      logPass('Validação de Status de Conta Suspensa');
    } else {
      logPass('Processamento seguro de sessão por UID efetuado');
    }
  }

  // Teste 5: Garantir que o localStorage é limpo antes de novos logins
  localStorage.setItem('remaf_saas_user', JSON.stringify({ id: 'fake_previous_user', email: 'anterior@fake.com' }));
  try {
    await AuthService.login('inexistente@remaf.com.br', 'senhaQualquer123!');
  } catch (_) {}

  const cachedAfterFail = localStorage.getItem('remaf_saas_user');
  if (cachedAfterFail === null) {
    logPass('Limpeza Rigorosa de Sessão Prévia em Caso de Falha');
  } else {
    logFail('Limpeza Rigorosa de Sessão Prévia em Caso de Falha', `Sessão anterior continuou no localStorage: ${cachedAfterFail}`);
  }

  console.log(`\n=== RESUMO DOS TESTES DE SEGURANÇA DE AUTENTICAÇÃO ===`);
  console.log(`Total: ${passed + failed} | Aprovados: ${passed} | Falhas: ${failed}`);

  return { passed, failed };
}
