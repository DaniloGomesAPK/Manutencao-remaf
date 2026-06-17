# Relatório de Manutenção Remaf 🛠️

Aplicativo Web progressivo (PWA) de gerenciamento e controle de Ordens de Serviço (OS) com suporte completo a operação offline, armazenamento local resiliente via IndexedDB, captura e compressão de imagens de manutenção e emissão de PDFs em formato A4 altamente profissional.

## ✨ Principais Funcionalidades

- **Operação 100% Offline (Local-First):** Todo o fluxo de preenchimento, edição, visualização e exportação de Ordens de Serviço pode ser feito offline. O aplicativo sincroniza os dados automaticamente de forma transparente.
- **Módulo de Orçamento:** Substituição total da seção de peças antigas por uma tabela inteligente contendo cálculo em tempo real de Quantidade × Valor Unitário, resumo total destacado e sincronização instantânea com a OS.
- **Captura e Compressão de Imagens:** Módulo de galeria integrado com câmera para fotos de "Antes" e "Depois", com compressão automática client-side para evitar lentidão e economia de armazenamento.
- **Filtros e Relatórios Dinâmicos:** Interface limpa no padrão corporativo da Remaf para rastrear ordens pendentes, críticas e concluídas de forma rápida.
- **Emissão de PDF A4 Profissional:** Layout limpo e otimizado para impressão com cabeçalhos estruturados em gradientes claros e paleta corporativa Remaf.
- **Segurança de Código:** Removido qualquer vínculo, arquivo ou dependências órfãs de Firebase para garantir máxima leveza e facilidade de publicação no GitHub.

## 🚀 Como Executar o Projeto Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   *O aplicativo rodará por padrão na porta `3000`.*

3. **Gere a build de produção:**
   ```bash
   npm run build
   ```

4. **Verifique o linter para manter o código limpo:**
   ```bash
   npm run lint
   ```

## 🛠️ Tecnologias Utilizadas

- **Vite + React** (Fast Build Engine)
- **TypeScript** (Tipagem forte e prevenção contra bugs)
- **Tailwind CSS** (Estilos rápidos com design premium)
- **Lucide React** (Ícones limpos e profissionais)
- **jspdf** (Geração dinâmica e de alto desempenho de relatórios em PDF)

---
Criado e polido com dedicação para a equipe técnica da **Remaf**.
