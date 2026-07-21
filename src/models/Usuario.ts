/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Usuario {
  id: string;          // ID do Usuário
  nome: string;        // Nome
  email: string;       // E-mail
  empresaId: string;   // EmpresaID
  statusConta: 'ativo' | 'suspenso' | 'pendente'; // Status da Conta
  dataCadastro: string;// Data de Cadastro
  ultimoAcesso: string;// Último Acesso
}
