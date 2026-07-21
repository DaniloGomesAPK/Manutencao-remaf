/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrdemDeServico, Equipamento, Cliente } from '../types';
import { Empresa } from '../models/Empresa';
import { formatToBrazilianDate } from './dateFormatter';

/**
 * Loads a base64 image (or URL) into an HTMLImageElement asynchronously
 * to read its real natural width and height.
 */
const getImageDimensions = (base64Str: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    if (!base64Str) {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width || 0, height: img.naturalHeight || img.height || 0 });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = base64Str;
  });
};

/**
 * Calculates optimal width and height to fit an image into a bounding box
 * while strictly maintaining its source aspect ratio.
 */
const getFitDimensions = (
  origWidth: number,
  origHeight: number,
  maxWidth: number,
  maxHeight: number
) => {
  if (origWidth <= 0 || origHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }
  const aspectRatio = origWidth / origHeight;
  
  // Try scaling based on full width
  let targetWidth = maxWidth;
  let targetHeight = targetWidth / aspectRatio;
  
  // If target height exceeds bounding box, scale based on height instead
  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
    targetWidth = targetHeight * aspectRatio;
  }
  
  return { width: targetWidth, height: targetHeight };
};

/**
 * Generates an extremely polished, professional "Prontuário Inteligente do Equipamento" PDF.
 * Uses jsPDF with beautiful vectors, clean grids, smart technical parsing, and zero external charts APIs.
 */
export const generateProntuarioPDF = async (
  equipment: Equipamento,
  allOrders: OrdemDeServico[],
  company: Empresa | null,
  client: Cliente | null
): Promise<string> => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Custom extreme safety wrappers for drawing shapes to prevent crashes
  const originalRect = doc.rect.bind(doc);
  doc.rect = (rx: number, ry: number, rw: number, rh: number, style?: string): any => {
    const cleanX = isFinite(rx) ? rx : 0;
    const cleanY = isFinite(ry) ? ry : 0;
    const cleanW = isFinite(rw) ? rw : 0;
    const cleanH = isFinite(rh) ? rh : 0;
    const cleanStyle = style === 'SF' ? 'FD' : style;
    try {
      return originalRect(cleanX, cleanY, cleanW, cleanH, cleanStyle);
    } catch (e) {
      console.warn("Recovered from jsPDF.rect drawing exception:", e);
      return doc;
    }
  };

  const originalTriangle = doc.triangle.bind(doc);
  doc.triangle = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, style?: string): any => {
    const cx1 = isFinite(x1) ? x1 : 0;
    const cy1 = isFinite(y1) ? y1 : 0;
    const cx2 = isFinite(x2) ? x2 : 0;
    const cy2 = isFinite(y2) ? y2 : 0;
    const cx3 = isFinite(x3) ? x3 : 0;
    const cy3 = isFinite(y3) ? y3 : 0;
    try {
      return originalTriangle(cx1, cy1, cx2, cy2, cx3, cy3, style);
    } catch (e) {
      console.warn("Recovered from jsPDF.triangle drawing exception:", e);
      return doc;
    }
  };

  // Brand colors (DG SaaS/Automotivo style)
  const primaryColor = { r: 0, g: 31, b: 63 };    // #001f3f Navy Blue
  const accentColor = { r: 255, g: 102, b: 0 };   // #FF6600 Orange
  const textColor = { r: 51, g: 51, b: 51 };       // Charcoal #333333
  const lightGrey = { r: 245, g: 247, b: 250 };    // Light neutral #F5F7FA
  const borderColor = { r: 220, g: 225, b: 230 };  // Subtle borders

  const marginX = 15;
  const pageHeight = 297;
  const pageWidth = 210;
  const contentWidth = pageWidth - (marginX * 2); // 180mm

  // Date formatter helper
  const formatDateBRL = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return formatToBrazilianDate(dateStr);
  };

  // Currency formatter helper
  const formatCurrencyBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // --- FILTER AND PREPARE DATA ---
  const equipmentPlaqueClean = (equipment.placa || '').toLowerCase().replace(/\s/g, '');
  
  const filteredOrders = allOrders
    .filter(order => {
      const orderPlaqueClean = (order.placa || '').toLowerCase().replace(/\s/g, '');
      const matchesPlaque = orderPlaqueClean && equipmentPlaqueClean && orderPlaqueClean === equipmentPlaqueClean;
      const matchesId = order.equipamentoId === equipment.id;
      const matchesName = order.equipamento?.toLowerCase().trim() === `${equipment.fabricante} ${equipment.modelo}`.toLowerCase().trim();
      return matchesPlaque || matchesId || matchesName;
    })
    .sort((a, b) => {
      const dateA = a.dataAbertura ? new Date(`${a.dataAbertura}T${a.horaAbertura || '00:00'}`) : new Date(0);
      const dateB = b.dataAbertura ? new Date(`${b.dataAbertura}T${b.horaAbertura || '00:00'}`) : new Date(0);
      return dateA.getTime() - dateB.getTime(); // Chronological ascending order
    });

  // Calculate statistics
  const totalOS = filteredOrders.length;
  const totalInvested = filteredOrders.reduce((sum, o) => sum + (o.valorTotalOrcamento || 0), 0);
  
  let firstMaintenanceDate = 'N/A';
  let lastMaintenanceDate = 'N/A';
  let avgIntervalDays = 0;
  let avgCostPerOS = totalOS > 0 ? totalInvested / totalOS : 0;

  if (totalOS > 0) {
    firstMaintenanceDate = formatDateBRL(filteredOrders[0].dataAbertura);
    lastMaintenanceDate = formatDateBRL(filteredOrders[totalOS - 1].dataAbertura);

    if (totalOS > 1) {
      const start = new Date(filteredOrders[0].dataAbertura);
      const end = new Date(filteredOrders[totalOS - 1].dataAbertura);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      avgIntervalDays = Math.round(diffDays / (totalOS - 1));
    }
  }

  // --- RECURRENCE AND COST BREAKDOWN PARSING ---
  const componentCounts: { [key: string]: { count: number; cost: number } } = {};
  const servicesList: string[] = [];
  let partsCostSum = 0;
  let laborCostSum = 0;

  filteredOrders.forEach(os => {
    // Parse services executed
    if (os.servicoExecutado) {
      servicesList.push(os.servicoExecutado);
    }
    
    // Parse budget items
    if (os.orcamento && os.orcamento.length > 0) {
      os.orcamento.forEach(item => {
        const desc = item.descricao.trim();
        const descLower = desc.toLowerCase();
        
        // Count recurrence
        if (componentCounts[desc]) {
          componentCounts[desc].count += item.quantidade;
          componentCounts[desc].cost += item.valorTotal;
        } else {
          componentCounts[desc] = { count: item.quantidade, cost: item.valorTotal };
        }

        // Distinguish Parts/Supplies vs Labor heuristic
        const isLabor = descLower.includes('mão de obra') || 
                        descLower.includes('mão-de-obra') || 
                        descLower.includes('serviço') || 
                        descLower.includes('instalacao') || 
                        descLower.includes('instalação') || 
                        descLower.includes('troca de') || 
                        descLower.includes('reparo') || 
                        descLower.includes('conserto') || 
                        descLower.includes('alinhamento') || 
                        descLower.includes('balanceamento') || 
                        descLower.includes('regulagem');

        if (isLabor) {
          laborCostSum += item.valorTotal;
        } else {
          partsCostSum += item.valorTotal;
        }
      });
    } else {
      // Fallback if budget is empty: attribute entire total to labor
      laborCostSum += os.valorTotalOrcamento || 0;
    }
  });

  // Sort components by recurrence count descending
  const topComponents = Object.entries(componentCounts)
    .map(([desc, data]) => ({ desc, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Operational cost trend
  let costTrend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
  if (totalOS >= 2) {
    const half = Math.ceil(totalOS / 2);
    const firstHalfCost = filteredOrders.slice(0, half).reduce((sum, o) => sum + (o.valorTotalOrcamento || 0), 0) / half;
    const secondHalfCost = filteredOrders.slice(half).reduce((sum, o) => sum + (o.valorTotalOrcamento || 0), 0) / (totalOS - half);
    
    if (secondHalfCost > firstHalfCost * 1.05) {
      costTrend = 'UP';
    } else if (secondHalfCost < firstHalfCost * 0.95) {
      costTrend = 'DOWN';
    }
  }

  // General Health Evaluation
  let healthEvaluation: 'EXCELLENT' | 'REGULAR' | 'CRITICAL' = 'EXCELLENT';
  if (totalOS > 5 || costTrend === 'UP' || topComponents.some(c => c.count > 2)) {
    healthEvaluation = 'REGULAR';
  }
  if (totalOS > 10 || (costTrend === 'UP' && totalOS > 5) || topComponents.some(c => c.count >= 4) || (totalOS > 3 && avgIntervalDays < 15)) {
    healthEvaluation = 'CRITICAL';
  }

  // --- BEGIN PDF WRITING ---
  let pageNumber = 1;
  let y = 15;

  const drawPageHeader = () => {
    // Upper dark bar
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(0, 0, pageWidth, 12, 'F');
    
    // Thin accent orange bar
    doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
    doc.rect(0, 12, pageWidth, 1.2, 'F');

    // Header metadata info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    const headerTitle = company?.nomeFantasia ? `${company.nomeFantasia.toUpperCase()} - CENTRAL DE RELATÓRIOS` : 'DG GESTÃO AUTOMOTIVA';
    doc.text(headerTitle, marginX, 7.5);

    doc.setFont('helvetica', 'normal');
    const docMeta = `PRONTUÁRIO INTELECTUAL - PLACA: ${equipment.placa.toUpperCase()}`;
    doc.text(docMeta, pageWidth - marginX, 7.5, { align: 'right' });
  };

  const drawPageFooter = () => {
    // Thin gray line above footer
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.setLineWidth(0.3);
    doc.line(marginX, 278, pageWidth - marginX, 278);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);

    const footerText = company?.nomeFantasia ? `${company.nomeFantasia} | Prontuário de Manutenção` : 'DG GESTÃO | Prontuário do Equipamento';
    doc.text(footerText, marginX, 283);
    doc.text(`Página ${pageNumber}`, pageWidth - marginX, 283, { align: 'right' });
  };

  const ensureSpace = (neededHeight: number) => {
    const cleanHeight = isFinite(neededHeight) ? neededHeight : 0;
    if (y + cleanHeight > 270) {
      drawPageFooter();
      doc.addPage();
      pageNumber++;
      y = 20; // Reset vertical cursor
      drawPageHeader();
    }
  };

  const drawSectionHeader = (title: string) => {
    ensureSpace(18);
    y += 5;
    
    // Vertical left accent marker
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(marginX, y - 4, 3.5, 6.5, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(title.toUpperCase(), marginX + 5, y);
    
    // Separator bottom line
    doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
    doc.rect(marginX, y + 1.8, contentWidth, 0.4, 'F');
    
    y += 7;
  };

  // ==================== PAGE 1: COVER PAGE ====================
  // Clean, high contrast background layout: pure white for the whole cover page
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // --- REDESIGNED BRANDED CORPORATE HEADER (Based on OS pattern) ---
  // Top Colored Banner Bar
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Main logo area background is pure white
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 6, pageWidth, 38, 'F');

  // Inside the logo area, we draw ONLY the logomarca of the company, with no further info
  if (company && company.logomarca) {
    try {
      const logoUrl = company.logomarca;
      const dims = await getImageDimensions(logoUrl);
      const maxW = 90; // Large logo width to occupy a major part of the header
      const maxH = 32; // Large logo height
      const fit = getFitDimensions(dims.width, dims.height, maxW, maxH);
      
      // Center logo vertically in the white block (y range 6 to 44, total height 38)
      const centeredY = 6 + (38 - fit.height) / 2;
      doc.addImage(logoUrl, 'JPEG', 15, centeredY, fit.width, fit.height, undefined, 'FAST');
    } catch (e) {
      console.warn("Failed to load company logo for PDF:", e);
    }
  }

  // First solid red bar right below the logo block
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b); // #FF6600
  doc.rect(0, 44, pageWidth, 1.2, 'F');

  // Large document title shifted upwards for beautiful balance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text('PRONTUÁRIO INTELIGENTE', 20, 75);
  doc.text('DO EQUIPAMENTO', 20, 86);

  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(20, 93, 45, 1.8, 'F'); // Title accent bar

  // Document description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(100, 100, 100);
  const descTxt = 'Relatório técnico consolidado que agrega o histórico de atendimentos, análise de custos recorrentes, tendência operacional e parecer preditivo de manutenção.';
  const splitDesc = doc.splitTextToSize(descTxt, 160);
  doc.text(splitDesc, 20, 102);

  // Equipment Metadata Dossier Block (Elegant clean card) shifted upwards
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.setLineWidth(0.4);
  doc.rect(20, 125, contentWidth - 10, 75, 'FD');

  // Dossier title
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(20, 125, contentWidth - 10, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DOSSIÊ TÉCNICO E IDENTIFICAÇÃO DO ATIVO', 25, 130.5);

  // Two-column metadata details
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  
  // Col 1
  doc.setFont('helvetica', 'normal');
  doc.text('EQUIPAMENTO / MÁQUINA:', 26, 142);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.text(equipment.tipo.toUpperCase() || 'N/A', 26, 147);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text('FABRICANTE / MARCA:', 26, 156);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.text(equipment.fabricante.toUpperCase() || 'N/A', 26, 161);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text('MODELO / ANO:', 26, 170);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.text(`${equipment.modelo.toUpperCase()} – ANO ${equipment.ano || 'N/A'}`, 26, 175);

  // Col 2
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text('PLACA / IDENTIFICAÇÃO:', 110, 142);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b); // Highlight plaque in Orange
  doc.text(equipment.placa.toUpperCase() || 'N/A', 110, 147);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text('PROPRIETÁRIO / CLIENTE:', 110, 156);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  const clientName = client?.nome || equipment.clienteNome || 'CLIENTE NÃO VINCULADO';
  doc.text(clientName.toUpperCase(), 110, 161);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text('Nº DE SÉRIE / PATRIMÔNIO:', 110, 170);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  const serialNo = [equipment.numeroSerie, equipment.patrimonio].filter(Boolean).join(' / ');
  doc.text(serialNo.toUpperCase() || 'N/A', 110, 175);

  // Divider inside card
  doc.setDrawColor(226, 232, 240);
  doc.line(26, 182, pageWidth - 26, 182);

  // Indicators summary in covering card
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text('DADOS ADICIONAIS:', 26, 188);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  const kmOrHour = `QUILOMETRAGEM ATUAL: ${equipment.quilometragem ? `${equipment.quilometragem} KM` : 'N/A'}     |     HORÍMETRO ATUAL: ${equipment.horimetro ? `${equipment.horimetro} H` : 'N/A'}`;
  doc.text(kmOrHour.toUpperCase(), 26, 193);

  // Cover Page Bottom Details (Emission)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text(`DATA DE EMISSÃO: ${formatDateBRL(new Date().toISOString().split('T')[0])}`, 20, 260);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('Este documento é recalculo dinâmico obtido a partir de dados históricos reais armazenados offline localmente.', 20, 265);

  // ==================== PAGE 2: INDICATORS & CHART ====================
  doc.addPage();
  pageNumber++;
  drawPageHeader();
  
  y = 20;
  drawSectionHeader('1. Indicadores Gerais do Ativo');
  
  ensureSpace(48);
  // Grid coordinates of the 6 KPI cards (2 columns x 3 rows)
  const cardW = 86;
  const cardH = 15;
  const rowH = 18;
  const colX2 = marginX + cardW + 8;

  const drawKPICard = (x: number, yPos: number, title: string, value: string, iconColor: {r: number, g: number, b: number}) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.setLineWidth(0.3);
    doc.rect(x, yPos, cardW, cardH, 'FD');

    // Colored left visual accent bar
    doc.setFillColor(iconColor.r, iconColor.g, iconColor.b);
    doc.rect(x, yPos, 2, cardH, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(title.toUpperCase(), x + 4, yPos + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(textColor.r, textColor.g, textColor.b);
    doc.text(value, x + 4, yPos + 11.5);
  };

  // Row 1
  drawKPICard(marginX, y, 'Total de Ordens de Serviço (OS)', `${totalOS} intervenções`, primaryColor);
  drawKPICard(colX2, y, 'Valor Total Investido', formatCurrencyBRL(totalInvested), accentColor);
  
  // Row 2
  y += rowH;
  drawKPICard(marginX, y, 'Data da Primeira Manutenção', firstMaintenanceDate, primaryColor);
  drawKPICard(colX2, y, 'Data da Última Manutenção', lastMaintenanceDate, primaryColor);

  // Row 3
  y += rowH;
  const intervalVal = totalOS > 1 ? `${avgIntervalDays} dias em média` : 'Intervalo indisponível';
  drawKPICard(marginX, y, 'Intervalo Médio entre Intervenções', intervalVal, primaryColor);
  drawKPICard(colX2, y, 'Custo Médio por OS', formatCurrencyBRL(avgCostPerOS), primaryColor);

  y += cardH + 12;

  // CHART SECTION: Evolução de Custos (Dynamic pure vector bar chart in jsPDF!)
  drawSectionHeader('2. Histórico e Evolução de Custos');
  ensureSpace(70);

  if (totalOS > 0) {
    const chartHeight = 45;
    const chartYStart = y + chartHeight; // Bottom line of chart

    // Sort orders chronologically to present cost flow properly
    const chartData = filteredOrders.slice(-8); // Take up to 8 most recent orders for high density rendering
    const maxCost = Math.max(...chartData.map(o => o.valorTotalOrcamento || 0), 100);

    // Draw Axes
    doc.setDrawColor(180, 190, 200);
    doc.setLineWidth(0.4);
    doc.line(marginX + 15, chartYStart, marginX + contentWidth - 5, chartYStart); // X Axis
    doc.line(marginX + 15, y + 5, marginX + 15, chartYStart); // Y Axis

    // Y Axis scale indicators (Grid lines)
    const steps = 3;
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    for (let i = 0; i <= steps; i++) {
      const gridY = chartYStart - (chartHeight * (i / steps));
      const valLabel = formatCurrencyBRL(maxCost * (i / steps));
      doc.text(valLabel, marginX + 13, gridY + 1, { align: 'right' });

      // Subtle horizontal helper line
      if (i > 0) {
        doc.setDrawColor(240, 242, 245);
        doc.setLineWidth(0.2);
        doc.line(marginX + 16, gridY, marginX + contentWidth - 5, gridY);
      }
    }

    // Draw vertical bars
    const barCount = chartData.length;
    const availableWidth = contentWidth - 25;
    const barSpacing = availableWidth / barCount;
    const barWidth = Math.min(barSpacing * 0.55, 12);

    chartData.forEach((os, idx) => {
      const osCost = os.valorTotalOrcamento || 0;
      const barH = (osCost / maxCost) * chartHeight;
      const barX = marginX + 22 + (idx * barSpacing) - (barWidth / 2);
      const barY = chartYStart - barH;

      // Draw vector styled bar
      doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.rect(barX, barY, barWidth, barH, 'F');

      // Top highlight on the bar
      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.rect(barX, barY, barWidth, 1, 'F');

      // Label with price on top of bar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(textColor.r, textColor.g, textColor.b);
      const costTxt = osCost > 0 ? formatCurrencyBRL(osCost) : 'R$ 0';
      doc.text(costTxt, barX + (barWidth / 2), barY - 2.5, { align: 'center' });

      // Label under the bar (Plaque or Date)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 120, 120);
      doc.text(os.numeroOS, barX + (barWidth / 2), chartYStart + 3.5, { align: 'center' });
      doc.text(formatDateBRL(os.dataAbertura), barX + (barWidth / 2), chartYStart + 7, { align: 'center' });
    });

    y += chartHeight + 15;
  } else {
    // Fallback if no OS
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text('Não existem ordens de serviço ou registros financeiros cadastrados para este equipamento.', marginX + 5, y + 10);
    y += 20;
  }

  // ==================== PAGE 3: BUSINESS INTELLIGENCE & PARECER ====================
  doc.addPage();
  pageNumber++;
  drawPageHeader();

  y = 20;
  drawSectionHeader('3. Análise de Recorrência e Inteligência');

  ensureSpace(60);
  // Bento Grid layout: Left column (Recurrent parts), Right Column (Costs Breakdown)
  const colW = 86;
  const colY = y;

  // Col 1: Components and Parts Table
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.setLineWidth(0.35);
  doc.rect(marginX, colY, colW, 56, 'FD');

  // Title block
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(marginX, colY, colW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PEÇAS / INSUMOS MAIS RECORRENTES', marginX + 4, colY + 4.5);

  // Components list
  let itemY = colY + 12;
  doc.setFontSize(7.5);
  if (topComponents.length > 0) {
    topComponents.forEach((item, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColor.r, textColor.g, textColor.b);
      doc.text(`${idx + 1}. ${item.desc.substring(0, 22)}`, marginX + 4, itemY);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 110, 110);
      const partsSummary = `Qtde: ${item.count}   |   Total: ${formatCurrencyBRL(item.cost)}`;
      doc.text(partsSummary, marginX + 4, itemY + 4.2);

      // Mini bottom divider
      if (idx < topComponents.length - 1) {
        doc.setDrawColor(230, 235, 240);
        doc.line(marginX + 4, itemY + 6.2, marginX + colW - 4, itemY + 6.2);
      }
      itemY += 9;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(140, 140, 140);
    doc.text('Nenhuma recorrência de peças identificada.', marginX + 4, colY + 16);
  }

  // Col 2: Category distribution (Peças vs Mão de Obra) with visual progress bar!
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.rect(colX2, colY, colW, 56, 'FD');

  // Title block
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(colX2, colY, colW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DISTRIBUIÇÃO POR CATEGORIA DE DESPESAS', colX2 + 4, colY + 4.5);

  const totalSum = partsCostSum + laborCostSum || 1;
  const partsPct = Math.round((partsCostSum / totalSum) * 100);
  const laborPct = Math.round((laborCostSum / totalSum) * 100);

  // Render bento details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text('INVESTIMENTO EM PEÇAS:', colX2 + 5, colY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.text(`${formatCurrencyBRL(partsCostSum)} (${partsPct}%)`, colX2 + 5, colY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text('INVESTIMENTO EM MÃO DE OBRA / SERVIÇOS:', colX2 + 5, colY + 29);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.text(`${formatCurrencyBRL(laborCostSum)} (${laborPct}%)`, colX2 + 5, colY + 34);

  // Horizontal visual percent progress bar!
  const progressBarW = colW - 10;
  const partsBarW = (partsCostSum / totalSum) * progressBarW;

  // Background track
  doc.setFillColor(220, 225, 230);
  doc.rect(colX2 + 5, colY + 40, progressBarW, 4, 'F');

  // Parts Fill (Orange)
  if (partsBarW > 0) {
    doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
    doc.rect(colX2 + 5, colY + 40, partsBarW, 4, 'F');
  }

  // Labor Fill (Deep Blue)
  const laborBarW = progressBarW - partsBarW;
  if (laborBarW > 0) {
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(colX2 + 5 + partsBarW, colY + 40, laborBarW, 4, 'F');
  }

  // Bar labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text('■ PEÇAS', colX2 + 5, colY + 49);

  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text('■ SERVIÇOS / MO', colX2 + 25, colY + 49);

  y += 62;

  // PARECER TÉCNICO INTELIGENTE (Calculated dynamic text and predictions!)
  drawSectionHeader('4. Parecer Técnico Inteligente');
  ensureSpace(70);

  // Diagnostics panel card
  doc.setFillColor(252, 253, 254);
  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.rect(marginX, y, contentWidth, 58, 'FD');

  // Decorative blue block marker inside panel
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(marginX, y, 1.8, 58, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text('DIAGNÓSTICO DA TENDÊNCIA OPERACIONAL E CONSERVAÇÃO', marginX + 4, y + 6);

  // Build the dynamic analysis texts
  let trendExplanation = '';
  if (costTrend === 'UP') {
    trendExplanation = 'TENDÊNCIA ALERTA DE ALTA: Identificado um aumento progressivo e sistemático nos custos das últimas manutenções em relação aos primeiros registros deste equipamento. Isto sugere um desgaste de fadiga de componentes estruturais, indicando que o veículo está entrando em um período crítico onde reparos tendem a ser mais severos e onerosos.';
  } else if (costTrend === 'DOWN') {
    trendExplanation = 'TENDÊNCIA DE ESTABILIDADE EM BAIXA: Constatado um decréscimo ou estabilidade descendente nos custos financeiros consolidados nas intervenções mais recentes. Isto aponta para a eficiência dos planos corretivos aplicados anteriormente ou excelente qualidade de uso operacional.';
  } else {
    trendExplanation = 'TENDÊNCIA OPERACIONAL ESTÁVEL: Os custos e frequências das ordens de serviço têm se mantido estritamente dentro da margem padrão linear estimada de desgaste comum.';
  }

  let recurrenceDiagnosis = '';
  if (topComponents.length > 0 && topComponents[0].count >= 2) {
    recurrenceDiagnosis = `ANÁLISE DE FADIGA DE MATERIAL: Registrado alto índice de manutenção no componente "${topComponents[0].desc}". A recorrência sistemática deste mesmo elemento de desgaste sugere fadiga acelerada por condições de operação severas, defeito na qualidade técnica das peças instaladas anteriormente ou folga dimensional em sistemas adjacentes. Recomenda-se suspender substituições simples e iniciar diagnóstico técnico preventivo profundo do subsistema associado.`;
  } else {
    recurrenceDiagnosis = 'ANÁLISE DE COMPONENTES: Histórico saudável sem reincidências severas ou fadigas prematuras detectadas em uma mesma peça ou insumo. O desgaste do ativo transcorre de forma homogênea e esperada para seu modelo.';
  }

  let budgetAlert = '';
  if (totalInvested > 12000) {
    budgetAlert = 'ALERTA DE ALTO INVESTIMENTO ACUMULADO: O investimento financeiro agregado ultrapassou a barreira crítica padrão para o porte do equipamento. Recomenda-se realizar uma análise de viabilidade Capex vs. Opex para avaliar se custos preventivos/corretivos não estão canibalizando o valor de revenda do ativo.';
  } else {
    budgetAlert = 'ORÇAMENTO SAUDÁVEL: O montante financeiro total acumulado de intervenções está plenamente equilibrado e justificado diante do tempo de vida útil e taxa operacional do ativo.';
  }

  // Draw paragraphs
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textColor.r, textColor.g, textColor.b);

  let textY = y + 13;
  const lineH = 3.6;

  const drawParagraph = (textStr: string) => {
    const splitLines = doc.splitTextToSize(textStr, contentWidth - 10);
    splitLines.forEach((line: string) => {
      doc.text(line, marginX + 4, textY);
      textY += lineH;
    });
    textY += 2; // small space between paragraphs
  };

  drawParagraph(trendExplanation);
  drawParagraph(recurrenceDiagnosis);
  drawParagraph(budgetAlert);

  y += 68;

  // ==================== PAGE 4: TIMELINE, HEALTH & CLOSURE ====================
  doc.addPage();
  pageNumber++;
  drawPageHeader();

  y = 20;
  drawSectionHeader('5. Linha do Tempo e Histórico (OS)');
  ensureSpace(70);

  // Timeline table columns
  const colOS = 22;
  const colDate = 20;
  const colDesc = 50;
  const colItens = 60;
  const colVal = 28;

  // Draw Table Header
  doc.setFillColor(235, 240, 245);
  doc.rect(marginX, y, contentWidth, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  
  let headerX = marginX + 2;
  doc.text('PROTOCOLO', headerX, y + 4.5);
  headerX += colOS;
  doc.text('DATA', headerX, y + 4.5);
  headerX += colDate;
  doc.text('AVARIA / DIAGNÓSTICO', headerX, y + 4.5);
  headerX += colDesc;
  doc.text('ITENS E PEÇAS SUBSTITUÍDAS', headerX, y + 4.5);
  headerX += colItens;
  doc.text('VALOR TOTAL', headerX, y + 4.5);

  y += 7;

  // Draw chronological rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor.r, textColor.g, textColor.b);

  if (filteredOrders.length > 0) {
    filteredOrders.forEach((os, idx) => {
      ensureSpace(12);

      // Alternating row backgrounds
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, contentWidth, 9, 'F');
      }

      // Draw subtle row separator line
      doc.setDrawColor(230, 235, 240);
      doc.setLineWidth(0.25);
      doc.line(marginX, y + 9, marginX + contentWidth, y + 9);

      // Columns
      let rowX = marginX + 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(os.numeroOS, rowX, y + 5.5);
      
      rowX += colOS;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(formatDateBRL(os.dataAbertura), rowX, y + 5.5);

      rowX += colDate;
      const avariaTxt = os.descricaoAvaria || os.servicoExecutado || 'Manutenção corretiva';
      const truncatedAvaria = avariaTxt.length > 32 ? avariaTxt.substring(0, 30) + '...' : avariaTxt;
      doc.text(truncatedAvaria, rowX, y + 5.5);

      rowX += colDesc;
      const budgetItemsStr = os.orcamento && os.orcamento.length > 0
        ? os.orcamento.map(i => `${i.quantidade}x ${i.descricao}`).join(', ')
        : 'Apenas mão de obra descrita';
      const truncatedBudget = budgetItemsStr.length > 40 ? budgetItemsStr.substring(0, 38) + '...' : budgetItemsStr;
      doc.text(truncatedBudget, rowX, y + 5.5);

      rowX += colItens;
      doc.setFont('helvetica', 'bold');
      const valText = os.valorTotalOrcamento ? formatCurrencyBRL(os.valorTotalOrcamento) : 'R$ 0,00';
      doc.text(valText, rowX, y + 5.5);

      y += 9;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Não há manutenções cadastradas.', marginX + 5, y + 6);
    y += 10;
  }

  y += 5;

  // RESUMO EXECUTIVO DE SAÚDE
  drawSectionHeader('6. Resumo Executivo e Próximas Paradas');
  ensureSpace(60);

  // Health Panel Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.rect(marginX, y, contentWidth, 38, 'FD');

  // Health Badge in the card
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text('AVALIAÇÃO INTEGRADA DE SAÚDE TÉCNICA DO ATIVO', marginX + 4, y + 7.5);

  let healthBadge = '';
  let healthBadgeColor = { r: 16, g: 185, b: 129 }; // Emerald Green
  let healthDesc = '';

  if (healthEvaluation === 'EXCELLENT') {
    healthBadge = 'NÍVEL ÓTIMO 🟢 (DISPONIBILIDADE PLENA)';
    healthBadgeColor = { r: 16, g: 185, b: 129 };
    healthDesc = 'O equipamento apresenta um desgaste extremamente baixo, baixa reincidência de falhas e intervalos regulares de intervenção. Sua disponibilidade para tarefas produtivas está classificada em capacidade ideal, sem necessidade de paradas preventivas imediatas urgentes fora dos cronogramas regulares de lubrificação e troca de fluidos básicos.';
  } else if (healthEvaluation === 'REGULAR') {
    healthBadge = 'NÍVEL REGULAR 🟡 (REQUER MONITORAMENTO)';
    healthBadgeColor = { r: 245, g: 158, b: 11 }; // Amber Orange
    healthDesc = 'Apresenta fadigas em peças pontuais e tendência financeira em elevação sutil. O ativo opera sob condições estáveis mas exige acompanhamento mais rigoroso por parte do operador para evitar surpresas de falha inesperada em subsistemas mecânicos vitais.';
  } else {
    healthBadge = 'NÍVEL CRÍTICO 🔴 (PARADA DE PREVENÇÃO RECOMENDADA)';
    healthBadgeColor = { r: 239, g: 68, b: 68 }; // Rose Red
    healthDesc = 'O ativo registra reincidência severa de falha mecânica, custos globais acumulados críticos ou curtíssimo tempo médio entre atendimentos. Altíssimo risco de quebra catastrófica inesperada. Recomenda-se programar parada técnica preditiva urgente para revisão integral imediata do motor, transmissão e sistemas de segurança.';
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(healthBadgeColor.r, healthBadgeColor.g, healthBadgeColor.b);
  doc.text(healthBadge, marginX + 4, y + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  const splitHealthDesc = doc.splitTextToSize(healthDesc, contentWidth - 10);
  doc.text(splitHealthDesc, marginX + 4, y + 18.5);

  // Recommendations summary below
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text('PRÓXIMAS PARADAS PREVENTIVAS RECOMENDADAS:', marginX + 4, y + 31);

  doc.setFont('helvetica', 'normal');
  let recommendedDate = 'Regular de catálogo';
  if (totalOS > 0) {
    const lastDateObj = new Date(filteredOrders[totalOS - 1].dataAbertura);
    const intervalToAdd = avgIntervalDays > 0 ? avgIntervalDays : 45;
    lastDateObj.setDate(lastDateObj.getDate() + intervalToAdd);
    recommendedDate = lastDateObj.toISOString().split('T')[0];
  }
  const recsStr = `1. Próxima Revisão Periódica Preditiva Estimada: ${formatDateBRL(recommendedDate)}   |   2. Substituir preventivamente o componente recorrente: ${topComponents.length > 0 ? topComponents[0].desc.toUpperCase() : 'NENHUM EM ALERTA'}`;
  doc.text(recsStr, marginX + 4, y + 34.5);

  y += 48;

  // CORPORATE SIGNATURE BLOCKS AT THE BOTTOM
  ensureSpace(35);
  doc.setDrawColor(180, 190, 200);
  doc.setLineWidth(0.3);

  // Line 1
  const sigW = 65;
  const sigY = y + 16;
  doc.line(marginX + 10, sigY, marginX + 10 + sigW, sigY);
  doc.line(pageWidth - marginX - 10 - sigW, sigY, pageWidth - marginX - 10, sigY);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.text('RESPONSÁVEL TÉCNICO / INSPETOR', marginX + 10 + (sigW / 2), sigY + 4, { align: 'center' });
  doc.text('CLIENTE / PROPRIETÁRIO DO ATIVO', pageWidth - marginX - 10 - (sigW / 2), sigY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('Assinatura e carimbo corporativo', marginX + 10 + (sigW / 2), sigY + 7, { align: 'center' });
  doc.text('Ciente e de acordo com o parecer', pageWidth - marginX - 10 - (sigW / 2), sigY + 7, { align: 'center' });

  // Draw final footer
  drawPageFooter();

  // Return generated DataURI
  return doc.output('datauristring');
};
