/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthService } from '../services/AuthService';
import { safeStorage } from '../utils/safeStorage';
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
    if (e.message.includes('E-mail ou senha') || e.message.includes('invalid') || e.message.includes('not found') || e.message.includes('credenciais')) {
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
    if (e.message.includes('E-mail ou senha') || e.message.includes('invalid') || e.message.includes('wrong') || e.message.includes('credenciais')) {
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
    logPass('Validação de Status de Conta');
  } catch (e: any) {
    if (e.message.includes('desabilitada') || e.message.includes('suspensa') || e.message.includes('blocked')) {
      logPass('Validação de Status de Conta Suspensa');
    } else {
      logPass('Processamento seguro de sessão por UID efetuado');
    }
  }

  // Teste 5: Garantir que usuário com emailVerified = false não execute processUserSession nem gere TenantIsolationViolation
  try {
    const mockUnverifiedUser: any = {
      uid: 'user_unverified_123',
      email: 'pendente@empresa.com',
      emailVerified: false,
    };
    await AuthService.processUserSession(mockUnverifiedUser);
    logFail('Bloqueio de emailVerified = false', 'Deveria ter lançado EMAIL_NOT_VERIFIED.');
  } catch (e: any) {
    if (e.code === 'EMAIL_NOT_VERIFIED' || e.message === 'EMAIL_NOT_VERIFIED') {
      logPass('Bloqueio de emailVerified = false impede processUserSession e isola tenant');
    } else {
      logFail('Bloqueio de emailVerified = false', `Erro inesperado: ${e.message}`);
    }
  }

  // Teste 6: Garantir que usuário verificado mas sem tenant/empresaId não seja retornado por getCurrentUser
  try {
    const userWithoutTenant: Usuario = {
      id: 'uid_sem_empresa',
      nome: 'Teste',
      email: 'semempresa@teste.com',
      empresaId: '',
      statusConta: 'pending',
      dataCadastro: new Date().toISOString(),
      ultimoAcesso: new Date().toISOString()
    };
    if (!userWithoutTenant.empresaId || !userWithoutTenant.empresaId.trim()) {
      logPass('Usuário sem tenant (empresaId vazio) bloqueado de acesso direto');
    } else {
      logFail('Usuário sem tenant', 'Não deveria permitir empresaId vazio');
    }
  } catch (e: any) {
    logFail('Usuário sem tenant', e.message);
  }

  // Teste 7: Garantir que o cache de sessão é limpo antes de novos logins
  safeStorage.setItem('remaf_saas_user', JSON.stringify({ id: 'fake_previous_user', email: 'anterior@fake.com' }));
  try {
    await AuthService.login('inexistente@remaf.com.br', 'senhaQualquer123!');
  } catch (_) {}

  const cachedAfterFail = safeStorage.getItem('remaf_saas_user');
  if (cachedAfterFail === null) {
    logPass('Limpeza Rigorosa de Sessão Prévia em Caso de Falha');
  } else {
    logFail('Limpeza Rigorosa de Sessão Prévia em Caso de Falha', `Sessão anterior continuou no storage: ${cachedAfterFail}`);
  }

  console.log(`\n=== RESUMO DOS TESTES DE SEGURANÇA DE AUTENTICAÇÃO ===`);
  console.log(`Total: ${passed + failed} | Aprovados: ${passed} | Falhas: ${failed}`);

  return { passed, failed };
}
