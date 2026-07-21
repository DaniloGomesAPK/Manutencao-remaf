/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Servico, Insumo } from '../types';
import { PrecificacaoService } from './PrecificacaoService';

export interface ImportError {
  row: number;
  column: string;
  reason: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  newCount: number;
  duplicateCount: number;
  invalidCount: number;
  validRecords: any[];
  errors: ImportError[];
  invalidRowsWithReason?: any[];
}

export interface ImportSummary {
  date: string;
  time: string;
  user: string;
  filename: string;
  imported: number;
  updated: number;
  errorsCount: number;
}

export const ImportExportService = {
  /**
   * Generates and downloads the official Excel template (.xlsx)
   */
  downloadModeloExcel() {
    // 1. Data Sheet
    const headers = [
      'Tipo',
      'Nome do Serviço',
      'Categoria',
      'Valor Total',
      'Insumo 1',
      'Custo 1',
      'Insumo 2',
      'Custo 2',
      'Insumo 3',
      'Custo 3',
      'Horas',
      'Valor Hora',
      'Custos Fixos'
    ];

    const sampleRows = [
      {
        'Tipo': 'Assistente',
        'Nome do Serviço': 'Troca de Óleo e Filtro Padrão',
        'Categoria': 'Lubrificação',
        'Valor Total': 0, // Calculated automatically for Assistente
        'Insumo 1': 'Óleo Sintético 5W30',
        'Custo 1': 120.00,
        'Insumo 2': 'Filtro de Óleo',
        'Custo 2': 45.00,
        'Insumo 3': 'Anel de Vedação',
        'Custo 3': 5.00,
        'Horas': 0.8,
        'Valor Hora': 120.00,
        'Custos Fixos': 15.00
      },
      {
        'Tipo': 'Rápido',
        'Nome do Serviço': 'Limpeza de Radiador Express',
        'Categoria': 'Arrefecimento',
        'Valor Total': 250.00,
        'Insumo 1': '',
        'Custo 1': 0,
        'Insumo 2': '',
        'Custo 2': 0,
        'Insumo 3': '',
        'Custo 3': 0,
        'Horas': 0,
        'Valor Hora': 0,
        'Custos Fixos': 0
      }
    ];

    const wb = XLSX.utils.book_new();
    const wsData = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    XLSX.utils.book_append_sheet(wb, wsData, 'Serviços');

    // 2. Instructions Sheet
    const instructionsAOA = [
      ['INSTRUÇÕES PARA PREENCHIMENTO DA PLANILHA DE IMPORTAÇÃO'],
      [],
      ['REGRAS DE VALIDAÇÃO E IMPORTAÇÃO INTELIGENTE:'],
      ['1. Tipo: Obrigatório. Deve ser exatamente "Rápido" ou "Assistente".'],
      ['2. Nome do Serviço: Obrigatório. Deve ser único por serviço no banco.'],
      ['3. Categoria: Obrigatória. Ajuda na filtragem dos serviços.'],
      [''],
      ['SE TIPO = Rápido:'],
      ['- Obrigatório preencher: Nome do Serviço, Categoria e Valor Total.'],
      ['- Sistema ignorará automaticamente os campos de insumos, horas e custos fixos.'],
      [''],
      ['SE TIPO = Assistente:'],
      ['- Obrigatório preencher: Nome do Serviço, Categoria, pelo menos 1 Insumo (descrição e custo), Horas e Valor Hora.'],
      ['- Sistema calculará automaticamente: Custos Totais, Impostos (baseado em Minha Empresa), Preço Mínimo, Preço Recomendado e Lucro Líquido.'],
      [],
      ['PREPARE O SEU EXCEL E IMPORTE NA CENTRAL DE PRECIFICAÇÃO offline-first!']
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsAOA);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

    const wscols = [
      { wch: 12 }, // Tipo
      { wch: 35 }, // Nome do Serviço
      { wch: 18 }, // Categoria
      { wch: 15 }, // Valor Total
      { wch: 25 }, // Insumo 1
      { wch: 10 }, // Custo 1
      { wch: 25 }, // Insumo 2
      { wch: 10 }, // Custo 2
      { wch: 25 }, // Insumo 3
      { wch: 10 }, // Custo 3
      { wch: 8 },  // Horas
      { wch: 12 }, // Valor Hora
      { wch: 12 }  // Custos Fixos
    ];
    wsData['!cols'] = wscols;

    XLSX.writeFile(wb, 'Modelo_Importacao_Servicos.xlsx');
  },

  /**
   * Exports existing database of services to an Excel file (.xlsx)
   */
  exportarServicos(servicos: Servico[], filterType: 'all' | 'rapido' | 'assistente' = 'all', category?: string) {
    let list = servicos;
    if (filterType === 'rapido') {
      list = list.filter(s => s.tipoCadastro === 'Cadastro Rápido');
    } else if (filterType === 'assistente') {
      list = list.filter(s => s.tipoCadastro === 'Assistente de Precificação');
    }
    if (category && category !== 'Todas') {
      list = list.filter(s => s.categoria === category);
    }

    const dataToExport = list.map(s => {
      const insumo1 = s.materiais?.[0]?.descricao || '';
      const custo1 = s.materiais?.[0]?.custoTotal || 0;
      const insumo2 = s.materiais?.[1]?.descricao || '';
      const custo2 = s.materiais?.[1]?.custoTotal || 0;
      const insumo3 = s.materiais?.[2]?.descricao || '';
      const custo3 = s.materiais?.[2]?.custoTotal || 0;

      const tipoStr = s.tipoCadastro === 'Cadastro Rápido' ? 'Rápido' : 'Assistente';
      const valorTotalVal = s.precoRecomendado || s.precoSelecionado || 0;

      return {
        'Tipo': tipoStr,
        'Nome do Serviço': s.nome,
        'Categoria': s.categoria,
        'Valor Total': valorTotalVal,
        'Insumo 1': insumo1,
        'Custo 1': custo1,
        'Insumo 2': insumo2,
        'Custo 2': custo2,
        'Insumo 3': insumo3,
        'Custo 3': custo3,
        'Horas': s.tempoMedioExecucao || 0,
        'Valor Hora': s.valorHora || 0,
        'Custos Fixos': s.custosFixos || 0
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport, {
      header: ['Tipo', 'Nome do Serviço', 'Categoria', 'Valor Total', 'Insumo 1', 'Custo 1', 'Insumo 2', 'Custo 2', 'Insumo 3', 'Custo 3', 'Horas', 'Valor Hora', 'Custos Fixos']
    });

    const wscols = [
      { wch: 12 }, // Tipo
      { wch: 35 }, // Nome
      { wch: 18 }, // Categoria
      { wch: 15 }, // Valor Total
      { wch: 22 }, // Insumo 1
      { wch: 10 }, // Custo 1
      { wch: 22 }, // Insumo 2
      { wch: 10 }, // Custo 2
      { wch: 22 }, // Insumo 3
      { wch: 10 }, // Custo 3
      { wch: 8 },  // Horas
      { wch: 12 }, // Valor Hora
      { wch: 12 }  // Custos Fixos
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Banco de Serviços');
    XLSX.writeFile(wb, `Exportacao_Banco_Servicos_${filterType}.xlsx`);
  },

  /**
   * Generates and downloads the Excel sheet containing only invalid records and reasons
   */
  baixarPlanilhaDeErros(invalidRows: any[]) {
    if (!invalidRows || invalidRows.length === 0) return;

    const headers = [
      'Tipo',
      'Nome do Serviço',
      'Categoria',
      'Valor Total',
      'Insumo 1',
      'Custo 1',
      'Insumo 2',
      'Custo 2',
      'Insumo 3',
      'Custo 3',
      'Horas',
      'Valor Hora',
      'Custos Fixos',
      'Motivo do Erro'
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(invalidRows, { header: headers });

    const wscols = [
      { wch: 12 }, // Tipo
      { wch: 35 }, // Nome
      { wch: 18 }, // Categoria
      { wch: 15 }, // Valor Total
      { wch: 22 }, // Insumo 1
      { wch: 10 }, // Custo 1
      { wch: 22 }, // Insumo 2
      { wch: 10 }, // Custo 2
      { wch: 22 }, // Insumo 3
      { wch: 10 }, // Custo 3
      { wch: 8 },  // Horas
      { wch: 12 }, // Valor Hora
      { wch: 12 }, // Custos Fixos
      { wch: 45 }  // Motivo do Erro
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Erros de Importação');
    XLSX.writeFile(wb, 'Erros_Importacao_Servicos.xlsx');
  },

  /**
   * Parses uploaded excel sheet, performs validation and returns preview data
   */
  async processarUploadExcel(file: File, existingServices: Servico[]): Promise<ImportPreviewResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('Falha ao carregar conteúdo do arquivo.'));
            return;
          }

          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];

          const rows = XLSX.utils.sheet_to_json(sheet) as any[];

          const errors: ImportError[] = [];
          const validRecords: any[] = [];
          const invalidRowsWithReason: any[] = [];

          let duplicateCount = 0;
          let newCount = 0;
          let invalidCount = 0;

          rows.forEach((row, index) => {
            const rowNumber = index + 2;

            const tipoRaw = row['Tipo'];
            const tipoStr = typeof tipoRaw === 'string' ? tipoRaw.trim() : (tipoRaw ? String(tipoRaw).trim() : '');

            const nomeRaw = row['Nome do Serviço'];
            const nome = typeof nomeRaw === 'string' ? nomeRaw.trim() : (nomeRaw ? String(nomeRaw).trim() : '');

            const categoriaRaw = row['Categoria'];
            const categoria = typeof categoriaRaw === 'string' ? categoriaRaw.trim() : (categoriaRaw ? String(categoriaRaw).trim() : '');

            const valorTotalVal = parseFloat(row['Valor Total'] !== undefined ? row['Valor Total'] : 0);
            const horasVal = parseFloat(row['Horas'] !== undefined ? row['Horas'] : 0);
            const valorHoraVal = parseFloat(row['Valor Hora'] !== undefined ? row['Valor Hora'] : 0);
            const custosFixosVal = parseFloat(row['Custos Fixos'] !== undefined ? row['Custos Fixos'] : 0);

            let rowHasError = false;
            const rowErrors: string[] = [];

            // 1. Validation for Tipo
            let tipo: 'Cadastro Rápido' | 'Assistente de Precificação' = 'Cadastro Rápido';
            if (!tipoStr) {
              rowErrors.push('O tipo de cadastro (Rápido ou Assistente) é obrigatório.');
              rowHasError = true;
            } else if (tipoStr.toLowerCase() === 'rápido' || tipoStr.toLowerCase() === 'rapido') {
              tipo = 'Cadastro Rápido';
            } else if (tipoStr.toLowerCase() === 'assistente') {
              tipo = 'Assistente de Precificação';
            } else {
              rowErrors.push('O tipo de cadastro deve ser apenas "Rápido" ou "Assistente".');
              rowHasError = true;
            }

            // 2. Validation for Name
            if (!nome) {
              rowErrors.push('O nome do serviço é obrigatório.');
              rowHasError = true;
            }

            // 3. Validation for Category
            if (!categoria) {
              rowErrors.push('A categoria do serviço é obrigatória.');
              rowHasError = true;
            }

            // Validation based on Tipo
            let materiais: Insumo[] = [];
            let tempoMedioExecucao = 0;
            let valorHora = 0;
            let custosFixos = 0;
            let precoRecomendado = 0;

            if (tipo === 'Cadastro Rápido') {
              if (isNaN(valorTotalVal) || valorTotalVal <= 0) {
                rowErrors.push('Para o Cadastro Rápido, o Valor Total deve ser informado e maior que zero.');
                rowHasError = true;
              } else {
                precoRecomendado = valorTotalVal;
              }
            } else if (tipo === 'Assistente de Precificação') {
              if (isNaN(horasVal) || horasVal <= 0) {
                rowErrors.push('Para o Assistente, as horas de execução devem ser informadas e maiores que zero.');
                rowHasError = true;
              } else {
                tempoMedioExecucao = horasVal;
              }

              if (isNaN(valorHoraVal) || valorHoraVal < 0) {
                rowErrors.push('Para o Assistente, o valor da hora técnica deve ser maior ou igual a zero.');
                rowHasError = true;
              } else {
                valorHora = valorHoraVal;
              }

              if (isNaN(custosFixosVal) || custosFixosVal < 0) {
                rowErrors.push('Custos fixos devem ser maiores ou iguais a zero.');
                rowHasError = true;
              } else {
                custosFixos = custosFixosVal;
              }

              let hasInsumos = false;
              for (let i = 1; i <= 3; i++) {
                const desc = row[`Insumo ${i}`]?.toString().trim() || '';
                const custoVal = parseFloat(row[`Custo ${i}`] !== undefined ? row[`Custo ${i}`] : 0);

                if (desc || (custoVal && custoVal > 0)) {
                  if (isNaN(custoVal) || custoVal < 0) {
                    rowErrors.push(`O custo do insumo ${i} deve ser um número válido e maior ou igual a zero.`);
                    rowHasError = true;
                  } else {
                    hasInsumos = true;
                    materiais.push({
                      id: 'ins_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
                      descricao: desc || `Insumo ${i}`,
                      quantidade: 1,
                      unidade: 'UN',
                      custoUnitario: custoVal || 0,
                      custoTotal: custoVal || 0
                    });
                  }
                }
              }

              if (!hasInsumos) {
                rowErrors.push('Para o Assistente, é obrigatório cadastrar pelo menos um Insumo válido (Insumo 1 e Custo 1).');
                rowHasError = true;
              }
            }

            if (rowHasError) {
              invalidCount++;
              rowErrors.forEach(err => {
                errors.push({ row: rowNumber, column: 'Geral', reason: err });
              });

              invalidRowsWithReason.push({
                ...row,
                'Motivo do Erro': rowErrors.join(' | ')
              });
              return;
            }

            const isDuplicate = existingServices.some(s => s.nome.toLowerCase() === nome.toLowerCase());
            if (isDuplicate) {
              duplicateCount++;
            } else {
              newCount++;
            }

            validRecords.push({
              tipoCadastro: tipo,
              nome,
              categoria,
              descricao: row['Descrição'] || row['Descricao'] || `Importado via planilha Excel (${tipo === 'Cadastro Rápido' ? 'Rápido' : 'Assistente'})`,
              materiais,
              tempoMedioExecucao,
              valorHora,
              custosFixos,
              precoRecomendado,
              isDuplicate
            });
          });

          resolve({
            totalRows: rows.length,
            newCount,
            duplicateCount,
            invalidCount,
            validRecords,
            errors,
            invalidRowsWithReason
          });

        } catch (err: any) {
          reject(new Error('Erro ao interpretar planilha Excel. Verifique a estrutura das colunas. Detalhes: ' + err.message));
        }
      };

      reader.onerror = () => {
        reject(new Error('Falha na leitura física do arquivo Excel.'));
      };

      reader.readAsBinaryString(file);
    });
  },

  /**
   * Finalizes the import by calculating complete finance parameters and saving to database
   */
  async salvarImportacao(
    validRecords: any[],
    duplicateDecision: 'update' | 'ignore' | 'create_new',
    aliquotaEfetiva: number,
    existingServices: Servico[],
    saveServicoFn: (s: Servico) => Promise<Servico>
  ): Promise<{ imported: number; updated: number; ignored: number }> {
    let imported = 0;
    let updated = 0;
    let ignored = 0;

    for (const record of validRecords) {
      const existing = existingServices.find(s => s.nome.toLowerCase() === record.nome.toLowerCase());

      let finalPrecoRecomendado = record.precoRecomendado;
      let finalPrecoMinimo = record.precoRecomendado;
      let finalPrecoPremium = record.precoRecomendado;
      let finalMarkup = 1;

      if (record.tipoCadastro === 'Assistente de Precificação') {
        const vals = PrecificacaoService.calcularValores({
          materiais: record.materiais,
          tempoMedioExecucao: record.tempoMedioExecucao,
          valorHora: record.valorHora,
          custosFixos: record.custosFixos,
          impostos: aliquotaEfetiva,
          margemUtilizada: 25
        });
        finalPrecoMinimo = vals.precoMinimo;
        finalPrecoRecomendado = vals.precoRecomendado;
        finalPrecoPremium = vals.precoPremium;
        finalMarkup = vals.markupFinal;
      }

      if (existing) {
        if (duplicateDecision === 'ignore') {
          ignored++;
          continue;
        }

        if (duplicateDecision === 'update') {
          const updatedSrv: Servico = {
            ...existing,
            categoria: record.categoria,
            descricao: record.descricao || existing.descricao,
            tipoCadastro: record.tipoCadastro,
            materiais: record.materiais,
            tempoMedioExecucao: record.tempoMedioExecucao,
            valorHora: record.valorHora,
            custosFixos: record.custosFixos,
            impostos: record.tipoCadastro === 'Assistente de Precificação' ? aliquotaEfetiva : 0,
            markup: finalMarkup,
            precoMinimo: finalPrecoMinimo,
            precoRecomendado: finalPrecoRecomendado,
            precoPremium: finalPrecoPremium,
            precoSelecionado: finalPrecoRecomendado,
            ultimaAtualizacao: new Date().toISOString()
          };

          await saveServicoFn(updatedSrv);
          updated++;
          continue;
        }

        if (duplicateDecision === 'create_new') {
          let newName = `${record.nome} - Cópia`;
          let attempt = 1;
          while (existingServices.some(s => s.nome.toLowerCase() === newName.toLowerCase())) {
            attempt++;
            newName = `${record.nome} - Cópia ${attempt}`;
          }

          const newSrv: Servico = {
            id: 'srv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
            empresaId: existing.empresaId,
            nome: newName,
            categoria: record.categoria,
            descricao: record.descricao,
            tipoCadastro: record.tipoCadastro,
            materiais: record.materiais,
            tempoMedioExecucao: record.tempoMedioExecucao,
            valorHora: record.valorHora,
            custosFixos: record.custosFixos,
            impostos: record.tipoCadastro === 'Assistente de Precificação' ? aliquotaEfetiva : 0,
            margemUtilizada: record.tipoCadastro === 'Assistente de Precificação' ? 25 : 0,
            markup: finalMarkup,
            precoMinimo: finalPrecoMinimo,
            precoRecomendado: finalPrecoRecomendado,
            precoPremium: finalPrecoPremium,
            precoSelecionado: finalPrecoRecomendado,
            modalidadePreco: 'recomendado',
            dataCriacao: new Date().toISOString(),
            ultimaAtualizacao: new Date().toISOString(),
            quantidadeUtilizacoes: 0,
            status: 'Ativo'
          };

          await saveServicoFn(newSrv);
          imported++;
          continue;
        }
      } else {
        const newSrv: Servico = {
          id: 'srv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
          empresaId: 'default_tenant',
          nome: record.nome,
          categoria: record.categoria,
          descricao: record.descricao,
          tipoCadastro: record.tipoCadastro,
          materiais: record.materiais,
          tempoMedioExecucao: record.tempoMedioExecucao,
          valorHora: record.valorHora,
          custosFixos: record.custosFixos,
          impostos: record.tipoCadastro === 'Assistente de Precificação' ? aliquotaEfetiva : 0,
          margemUtilizada: record.tipoCadastro === 'Assistente de Precificação' ? 25 : 0,
          markup: finalMarkup,
          precoMinimo: finalPrecoMinimo,
          precoRecomendado: finalPrecoRecomendado,
          precoPremium: finalPrecoPremium,
          precoSelecionado: finalPrecoRecomendado,
          modalidadePreco: 'recomendado',
          dataCriacao: new Date().toISOString(),
          ultimaAtualizacao: new Date().toISOString(),
          quantidadeUtilizacoes: 0,
          status: 'Ativo'
        };

        await saveServicoFn(newSrv);
        imported++;
      }
    }

    return { imported, updated, ignored };
  }
};
