/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrdemDeServico } from '../types';
import { formatToBrazilianDate } from './dateFormatter';
import { EmpresaService } from '../services/EmpresaService';
import { getPerfilConfig, isCampoVisivel, getCampoLabel, getProtocoloLabel } from '../config/perfis';

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
 * Generates a beautiful professional PDF report using jsPDF with proper page flow
 * and custom corporate brand colors (#003366 Deep Blue, #FF6600 Orange, and clean spacing).
 */
export const generateOSReportPDF = async (os: OrdemDeServico): Promise<string> => {
  const targetEmpresaId = os.empresaId?.trim();
  if (!targetEmpresaId) {
    throw new Error('Erro de geração de PDF: vínculo empresarial ausente na Ordem de Serviço.');
  }

  const company = await EmpresaService.getEmpresa(targetEmpresaId);
  const perfilConfig = getPerfilConfig(company?.perfilEmpresa);
  const docTitleLabel = perfilConfig.labels.ordemServico || 'Ordem de Serviço';
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Custom extreme safety wrappers for drawing shapes to prevent any numeric/style validation crashes
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
  
  // Brand colors
  const primaryColor = { r: 0, g: 51, b: 102 };   // #003366 Deep Blue
  const accentColor = { r: 255, g: 102, b: 0 };   // #FF6600 Orange
  const textColor = { r: 51, g: 51, b: 51 };       // Charcoal #333333
  const lightGrey = { r: 245, g: 247, b: 250 };    // Light neutral #F5F7FA
  const borderColor = { r: 220, g: 225, b: 230 };  // Subtle borders

  const marginX = 15;
  const pageHeight = 297;
  const pageWidth = 210;
  const contentWidth = pageWidth - (marginX * 2); // 180mm
  
  let y = 15; // Vertical cursor
  let pageNumber = 1;

  // Helper: Draw elegant header on every page
  const drawPageHeader = () => {
    // Top colored banner bar
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(0, 0, pageWidth, 12, 'F');
    
    // Thin safety line below banner
    doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
    doc.rect(0, 12, pageWidth, 1.5, 'F');
  };

  // Helper: Draw elegant footer with signatures and pages
  const drawPageFooter = () => {
    // Thin accent divider line at y = 280
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.setLineWidth(0.3);
    doc.line(marginX, 278, pageWidth - marginX, 278);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    
    // Left-aligned footer: system info
    const companyName = (company?.nomeFantasia || company?.razaoSocial || '').trim();
    const companyText = companyName && companyName !== 'Sua Empresa' ? `${docTitleLabel} - ${companyName}` : docTitleLabel;
    doc.text(`${companyText} | Sistema de Ordens de Serviço`, marginX, 283);
    
    // Right-aligned footer: page count
    doc.text(`Página ${pageNumber}`, pageWidth - marginX, 283, { align: 'right' });
  };

  // Helper: Check y-overflow and insert elegant page break
  const ensureSpace = (neededHeight: number) => {
    const cleanHeight = isFinite(neededHeight) ? neededHeight : 0;
    if (y + cleanHeight > 270) {
      drawPageFooter();
      doc.addPage();
      pageNumber++;
      y = 20; // reset layout cursor on new page
      drawPageHeader();
    }
  };

  // Helper: Draw section head with left accent border and subtitle
  const drawSectionHeader = (title: string) => {
    ensureSpace(15);
    y += 5;
    
    // Left blue vertical bar
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(marginX, y - 4, 3, 6, 'F');
    
    // Text title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(title.toUpperCase(), marginX + 5, y);
    
    // Bottom orange highlight line
    doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
    doc.rect(marginX, y + 1.5, contentWidth, 0.5, 'F');
    
    y += 7;
  };

  // --- NEW BRANDED CORPORATE HEADER (Based on User's Sample) ---
  // Page 1 gets the fully loaded header as requested.
  // Priority: 1. Logomarca | 2. Nome Fantasia | 3. Razão Social (fallback if Nome Fantasia is empty)
  const companyName = (company?.nomeFantasia || company?.razaoSocial || '').trim();

  // 1. Calculate dynamic heights first
  let logoHeight = 0;
  let fitLogo: { width: number; height: number } | null = null;
  if (company && company.logomarca) {
    try {
      const logoUrl = company.logomarca;
      const dims = await getImageDimensions(logoUrl);
      const maxW = 90; // Large logo width to occupy a major part of the header
      const maxH = 32; // Large logo height
      fitLogo = getFitDimensions(dims.width, dims.height, maxW, maxH);
      logoHeight = fitLogo.height;
    } catch (e) {
      console.warn("Failed to calculate logo dimensions:", e);
    }
  }

  // Calculate Company Title Height (Priority: Nome Fantasia -> Razão Social)
  let nameHeight = 0;
  let nameLines: string[] = [];
  if (companyName && companyName !== 'Sua Empresa') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    nameLines = doc.splitTextToSize(companyName.toUpperCase(), 120);
    nameHeight = nameLines.length * 3.5;
  }

  // Calculate Slogan Height
  let sloganHeight = 0;
  let sloganLines: string[] = [];
  if (company) {
    const rawSlogan = (company.slogan || '').trim();
    const sloganLower = rawSlogan.toLowerCase();
    
    // Regra de validação: Omitir se vazio, nulo, indefinido ou se corresponder ao exemplo
    const isExampleSlogan =
      !rawSlogan ||
      sloganLower === 'ex: excelência em prestação de serviço' ||
      sloganLower === 'excelência em prestação de serviço' ||
      sloganLower === 'ex: excelencia em prestacao de servico' ||
      sloganLower === 'excelencia em prestacao de servico';

    if (!isExampleSlogan) {
      const displaySlogan = rawSlogan.toUpperCase();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      sloganLines = doc.splitTextToSize(displaySlogan, 120).slice(0, 2); // Limit to maximum 2 lines
      sloganHeight = sloganLines.length * 3.5;
    }
  }

  // Calculate required ending Y of the logo block
  // Top Colored Banner is 6mm. We start drawing inside the white block at y=10.
  let leftColY = 10;
  if (fitLogo) {
    leftColY += logoHeight + 4; // Logo height + spacing
  }
  if (nameLines.length > 0) {
    leftColY += nameHeight + 2.5; // Name height + vertical spacing
  }
  if (sloganLines.length > 0) {
    leftColY += sloganHeight + 1.5; // Slogan height + vertical spacing
  }
  
  // The end height of the white area must be at least 38mm, but can grow if needed
  const headerEndY = Math.max(38, leftColY + 2);

  // Top Colored Banner Bar
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Main logo area background is pure white
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 6, pageWidth, headerEndY - 6, 'F');

  // Draw Left Column Contents (Logo, Name, Slogan)
  let drawY = 10;
  if (company && company.logomarca && fitLogo) {
    try {
      doc.addImage(company.logomarca, 'JPEG', 15, drawY, fitLogo.width, fitLogo.height, undefined, 'FAST');
      drawY += logoHeight + 4;
    } catch (_) {}
  }

  // Draw Title (Nome Fantasia or Razão Social)
  if (nameLines.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    for (const line of nameLines) {
      doc.text(line, 15, drawY);
      drawY += 3.5;
    }
    drawY += 1.5; // spacing
  }

  // Draw Slogan
  if (sloganLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    for (const line of sloganLines) {
      doc.text(line, 15, drawY);
      drawY += 3.5;
    }
  }

  // Right-aligned Info on logo area (Protocolo and Data) - Column 2 (Fixed 30% area, starts at x=145)
  // Perfectly centered vertically inside the white block (between y=6 and y=headerEndY)
  const centerY = 6 + (headerEndY - 6) / 2;
  const protocolY = centerY - 3.5;
  const dataY = centerY + 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b); // Deep Blue
  const labelProtocolo = `${getProtocoloLabel(perfilConfig, 'Protocolo')}: `;
  doc.text(labelProtocolo, 145, protocolY);
  
  const widthProtocolo = doc.getTextWidth(labelProtocolo);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor.r, textColor.g, textColor.b); // Charcoal
  doc.text(os.numeroOS || 'Aguardando', 145 + widthProtocolo, protocolY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b); // Deep Blue
  const labelData = 'Data: ';
  doc.text(labelData, 145, dataY);
  
  const widthData = doc.getTextWidth(labelData);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor.r, textColor.g, textColor.b); // Charcoal
  doc.text(formatToBrazilianDate(os.dataAbertura) || '', 145 + widthData, dataY);

  // First solid red bar right below the logo block
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b); // #FF6600
  doc.rect(0, headerEndY, pageWidth, 1.2, 'F');

  // Dynamic Rendering of Company Details (Independent rendering of all available fields)
  const detailLines: Array<{ text: string; colorType: 'dark' | 'grey' | 'blue' }> = [];

  if (company) {
    // Line 1: Address (Endereço, Número, Bairro, Cidade, Estado)
    const addrParts: string[] = [];
    const streetAndNum = [company.endereco?.trim(), company.numero?.trim()].filter(Boolean).join(', ');
    if (streetAndNum) addrParts.push(streetAndNum);
    if (company.bairro?.trim()) addrParts.push(company.bairro.trim());
    const cityState = [company.cidade?.trim(), company.estado?.trim()].filter(Boolean).join(' - ');
    if (cityState) addrParts.push(cityState);

    if (addrParts.length > 0) {
      detailLines.push({
        text: addrParts.join(' – ').toUpperCase(),
        colorType: 'dark'
      });
    }

    // Line 2: Identifiers (CEP, CNPJ, Inscrição Estadual)
    const regParts: string[] = [];
    if (company.cep?.trim()) regParts.push(`CEP: ${company.cep.trim()}`);
    if (company.cnpj?.trim()) regParts.push(`CNPJ: ${company.cnpj.trim()}`);
    if (company.inscricaoEstadual?.trim()) regParts.push(`IE: ${company.inscricaoEstadual.trim()}`);

    if (regParts.length > 0) {
      detailLines.push({
        text: regParts.join('       -       '),
        colorType: 'grey'
      });
    }

    // Line 3: Contacts / Additional Info (Razão Social if distinct from title, Email, Phones, Site)
    const contactParts: string[] = [];
    
    const titleLower = companyName.toLowerCase();
    const razaoLower = (company.razaoSocial || '').trim().toLowerCase();
    if (company.razaoSocial?.trim() && razaoLower !== titleLower) {
      contactParts.push(`Razão Social: ${company.razaoSocial.trim()}`);
    }

    if (company.email?.trim()) {
      contactParts.push(`E-mail: ${company.email.trim()}`);
    }

    const phones: string[] = [];
    if (company.whatsapp?.trim()) phones.push(company.whatsapp.trim());
    if (company.telefone?.trim() && company.telefone.trim() !== company.whatsapp?.trim()) {
      phones.push(company.telefone.trim());
    }
    if (phones.length > 0) {
      contactParts.push(`Fone/WhatsApp: ${phones.join(' / ')}`);
    }

    if (company.site?.trim()) {
      contactParts.push(`Site: ${company.site.trim()}`);
    }

    if (contactParts.length > 0) {
      detailLines.push({
        text: contactParts.join('       |       '),
        colorType: 'blue'
      });
    }
  }

  if (detailLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    let currentDetailY = headerEndY + 6;
    for (const line of detailLines) {
      if (line.colorType === 'dark') {
        doc.setTextColor(51, 51, 51); // Charcoal
      } else if (line.colorType === 'grey') {
        doc.setTextColor(80, 80, 80); // Neutral dark grey
      } else {
        doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b); // Deep Blue
      }
      doc.text(line.text, pageWidth / 2, currentDetailY, { align: 'center' });
      currentDetailY += 5.5;
    }

    // Second solid red bar below details block
    doc.setFillColor(accentColor.r, accentColor.g, accentColor.b); // #FF6600
    doc.rect(0, currentDetailY + 1, pageWidth, 1.2, 'F');

    y = currentDetailY + 7;
  } else {
    y = headerEndY + 6;
  }

  // --- METADATA SECTOR (Dynamic Grid Card based on perfilConfig) ---
  interface MetaItem {
    label: string;
    value: string;
  }
  const metaItems: MetaItem[] = [];

  // Cliente
  if (isCampoVisivel(perfilConfig, 'cliente')) {
    metaItems.push({
      label: getCampoLabel(perfilConfig, 'cliente', 'CLIENTE').toUpperCase(),
      value: os.clienteNome || 'Não informado'
    });
  }

  // Equipamento / Veículo / Máquina / Sistema
  if (isCampoVisivel(perfilConfig, 'equipamento')) {
    metaItems.push({
      label: getCampoLabel(perfilConfig, 'equipamento', 'EQUIPAMENTO / MÁQUINA').toUpperCase(),
      value: os.equipamento || 'Não informado'
    });
  }

  // Técnico Responsável
  metaItems.push({
    label: (perfilConfig.labels.tecnico || 'TÉCNICO RESPONSÁVEL').toUpperCase(),
    value: os.tecnico || 'Não informado'
  });

  // Abertura do Atendimento
  metaItems.push({
    label: 'ABERTURA DO ATENDIMENTO',
    value: `${formatToBrazilianDate(os.dataAbertura)} às ${os.horaAbertura || '00:00'}`
  });

  // Placa (apenas se visível no perfil)
  if (isCampoVisivel(perfilConfig, 'placa') && os.placa) {
    metaItems.push({
      label: getCampoLabel(perfilConfig, 'placa', 'PLACA DO EQUIPAMENTO').toUpperCase(),
      value: os.placa.toUpperCase()
    });
  }

  // Chassi (apenas se visível no perfil)
  if (isCampoVisivel(perfilConfig, 'chassi') && os.chassi) {
    metaItems.push({
      label: getCampoLabel(perfilConfig, 'chassi', 'CHASSI').toUpperCase(),
      value: os.chassi.toUpperCase()
    });
  }

  // Quilometragem / Horímetro (Uso) - apenas se visíveis no perfil
  const isKmVis = isCampoVisivel(perfilConfig, 'quilometragem');
  const isHorVis = isCampoVisivel(perfilConfig, 'horimetro');
  if ((isKmVis && os.quilometragem) || (isHorVis && os.horimetro)) {
    let useLabel = 'USO';
    if (isKmVis && isHorVis) {
      useLabel = 'USO (QUILOMETRAGEM / HORÍMETRO)';
    } else if (isKmVis) {
      useLabel = getCampoLabel(perfilConfig, 'quilometragem', 'QUILOMETRAGEM').toUpperCase();
    } else {
      useLabel = getCampoLabel(perfilConfig, 'horimetro', 'HORÍMETRO').toUpperCase();
    }

    const usageParts: string[] = [];
    if (isKmVis && os.quilometragem) usageParts.push(`${os.quilometragem} KM`);
    if (isHorVis && os.horimetro) usageParts.push(`${os.horimetro} H`);

    metaItems.push({
      label: useLabel,
      value: usageParts.join(' / ')
    });
  }

  // Número de Série
  if (isCampoVisivel(perfilConfig, 'numeroSerie') && os.numeroSerie) {
    metaItems.push({
      label: getCampoLabel(perfilConfig, 'numeroSerie', 'NÚMERO DE SÉRIE').toUpperCase(),
      value: os.numeroSerie.toUpperCase()
    });
  }

  // Patrimônio
  if (isCampoVisivel(perfilConfig, 'patrimonio') && os.patrimonio) {
    metaItems.push({
      label: getCampoLabel(perfilConfig, 'patrimonio', 'PATRIMÔNIO').toUpperCase(),
      value: os.patrimonio.toUpperCase()
    });
  }

  // Local da Obra
  if (isCampoVisivel(perfilConfig, 'localObra') && os.localObra) {
    metaItems.push({
      label: getCampoLabel(perfilConfig, 'localObra', 'LOCAL DA OBRA').toUpperCase(),
      value: os.localObra
    });
  }

  // Responsável pela Obra
  if (isCampoVisivel(perfilConfig, 'responsavelObra') && os.responsavelObra) {
    metaItems.push({
      label: getCampoLabel(perfilConfig, 'responsavelObra', 'RESPONSÁVEL PELA OBRA').toUpperCase(),
      value: os.responsavelObra
    });
  }

  // Setor
  if (isCampoVisivel(perfilConfig, 'setor') && os.setor) {
    metaItems.push({
      label: getCampoLabel(perfilConfig, 'setor', 'SETOR').toUpperCase(),
      value: os.setor
    });
  }

  // Linha de Produção
  if (isCampoVisivel(perfilConfig, 'linhaProducao') && os.linhaProducao) {
    metaItems.push({
      label: getCampoLabel(perfilConfig, 'linhaProducao', 'LINHA DE PRODUÇÃO').toUpperCase(),
      value: os.linhaProducao
    });
  }

  // Draw Dynamic Two-Column Card
  const rowCount = Math.ceil(metaItems.length / 2);
  const rowHeight = 11;
  const boxHeight = Math.max(rowCount * rowHeight + 4, 24);

  ensureSpace(boxHeight + 8);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.setLineWidth(0.3);
  doc.rect(marginX, y, contentWidth, boxHeight, 'FD');

  // Divide line down the middle
  doc.line(pageWidth / 2, y + 2, pageWidth / 2, y + boxHeight - 2);

  metaItems.forEach((item, idx) => {
    const col = idx % 2; // 0 (left) or 1 (right)
    const row = Math.floor(idx / 2);
    const itemX = col === 0 ? marginX + 5 : (pageWidth / 2) + 5;
    const itemY = y + 5 + (row * rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(item.label, itemX, itemY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(textColor.r, textColor.g, textColor.b);
    doc.text(item.value, itemX, itemY + 4.5);
  });

  y += boxHeight + 6;

  // --- SECTOR 2: DETALHES DE AVARIA (Etapa 2) ---
  if (os.descricaoAvaria) {
    drawSectionHeader('Serviços Necessários');
    
    ensureSpace(20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor.r, textColor.g, textColor.b);
    
    // Handle multi-line wrapping nicely
    const wrappedDesc = doc.splitTextToSize(os.descricaoAvaria, contentWidth - 10);
    const boxHeight = Math.max((Number(wrappedDesc?.length) || 0) * 4.5 + 8, 14);
    
    ensureSpace(boxHeight);
    
    // Background card for description texts
    doc.setFillColor(lightGrey.r, lightGrey.g, lightGrey.b);
    doc.rect(marginX, y, contentWidth, boxHeight, 'F');
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.rect(marginX, y, contentWidth, boxHeight, 'S');
    
    doc.text(wrappedDesc, marginX + 5, y + 6);
    y += isFinite(boxHeight) ? (boxHeight + 4) : 18;
  }

  // Obversations under photos standard before
  if (os.observacoesFotosAntes) {
    ensureSpace(12);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Obs. Serviços Necessários: ${os.observacoesFotosAntes}`, marginX + 2, y);
    y += 6;
  }

  // --- FOTOS ANTES (Gallery grid) ---
  if (os.fotosAntes && os.fotosAntes.length > 0) {
    drawSectionHeader('Fotos Antes');
    
    const photoWidth = 55; // fits 3 photos across easily (3x55 = 165mm, fits 180mm content)
    const photoHeight = 42;
    const spacingX = 6;
    const itemHeight = photoHeight + 7; // added 7mm for caption descriptions under each photo
    const spacingY = 4;
    
    ensureSpace(itemHeight + 10);

    let col = 0;
    
    for (let i = 0; i < os.fotosAntes.length; i++) {
      // Calculate row positioning
      if (col === 3) {
        col = 0;
        y += itemHeight + spacingY;
        ensureSpace(itemHeight + 5);
      }
      
      const px = marginX + col * (photoWidth + spacingX);
      
      // Draw outer box frame
      doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      doc.setLineWidth(0.3);
      doc.rect(px, y, photoWidth, photoHeight, 'S');

      try {
        const imgUrl = os.fotosAntes[i];
        if (imgUrl.startsWith('data:image')) {
          const dims = await getImageDimensions(imgUrl);
          const fit = getFitDimensions(dims.width, dims.height, photoWidth - 2, photoHeight - 2);
          const centeredX = px + 1 + (photoWidth - 2 - fit.width) / 2;
          const centeredY = y + 1 + (photoHeight - 2 - fit.height) / 2;
          doc.addImage(imgUrl, 'JPEG', centeredX, centeredY, fit.width, fit.height, undefined, 'FAST');
        } else {
          // Fallback box for plain URL images that cannot be base64 embedded directly in clients
          doc.setFillColor(lightGrey.r, lightGrey.g, lightGrey.b);
          doc.rect(px + 1, y + 1, photoWidth - 2, photoHeight - 2, 'F');
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          doc.text('Foto Armazenada', px + photoWidth / 2, y + photoHeight / 2 - 2, { align: 'center' });
          doc.setFontSize(5.5);
          doc.text('(Consultar arquivo online)', px + photoWidth / 2, y + photoHeight / 2 + 4, { align: 'center' });
        }
      } catch (e) {
        // Safe graphic fallback in case image parser fails
        doc.setFillColor(lightGrey.r, lightGrey.g, lightGrey.b);
        doc.rect(px + 1, y + 1, photoWidth - 2, photoHeight - 2, 'F');
        doc.setFontSize(8);
        doc.text('Erro ao carregar', px + photoWidth / 2, y + photoHeight / 2, { align: 'center' });
      }

      // Draw photo description / info below the box
      const descText = (os.fotosAntesDescricoes?.[i] || '').trim();
      if (descText) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(70, 70, 70);
        const wrappedDesc = doc.splitTextToSize(descText, photoWidth - 2);
        doc.text(wrappedDesc, px + photoWidth / 2, y + photoHeight + 3.5, { align: 'center' });
      }

      col++;
    }
    y += itemHeight + 8;
  }

  // --- SECTOR 3: CONCLUSAO DA MANUTENCAO (Etapa 3) ---
  if (os.servicoExecutado) {
    drawSectionHeader('Serviço Executado');

    // Status Pill at top of service info
    ensureSpace(20);
    const currentStatus = os.status || 'Pendente';
    
    // Status badges styles map
    let statusBg = { r: 210, g: 245, b: 220 }; // light green
    let statusText = { r: 15, g: 120, b: 40 }; // dark green
    if (currentStatus === 'Concluído com restrições') {
      statusBg = { r: 255, g: 238, b: 210 }; // light orange-yellow
      statusText = { r: 180, g: 100, b: 10 };
    } else if (currentStatus === 'Pendente') {
      statusBg = { r: 254, g: 219, b: 219 }; // light red
      statusText = { r: 190, g: 30, b: 30 };
    }

    doc.setFillColor(statusBg.r, statusBg.g, statusBg.b);
    doc.rect(marginX, y, 70, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(statusText.r, statusText.g, statusText.b);
    doc.text(`STATUS FINAL: ${currentStatus.toUpperCase()}`, marginX + 3, y + 4.8);
    y += 10;

    // Describe wrapped text box
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor.r, textColor.g, textColor.b);
    
    const wrappedService = doc.splitTextToSize(os.servicoExecutado, contentWidth - 10);
    const boxHeightService = Math.max((Number(wrappedService?.length) || 0) * 4.5 + 8, 14);
    
    ensureSpace(boxHeightService);
    doc.setFillColor(lightGrey.r, lightGrey.g, lightGrey.b);
    doc.rect(marginX, y, contentWidth, boxHeightService, 'F');
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.rect(marginX, y, contentWidth, boxHeightService, 'S');
    
    doc.text(wrappedService, marginX + 5, y + 6);
    y += isFinite(boxHeightService) ? (boxHeightService + 5) : 19;
  }

  // Orçamento (substituindo Peças Substituídas)
  if (os.orcamento && os.orcamento.length > 0) {
    const rowHeight = 6;
    const tableWidth = contentWidth;
    const colQtdWidth = 15;
    const colTotalWidth = 28;
    const colUnitWidth = 28;
    const colDescWidth = tableWidth - colQtdWidth - colUnitWidth - colTotalWidth; // fluid calculation

    ensureSpace((os.orcamento.length + 2) * rowHeight + 12);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b); // Deep Blue #003366
    doc.text('ORÇAMENTO:', marginX, y);
    y += 3.5;

    // Header Background
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b); // Deep Blue
    doc.rect(marginX, y, tableWidth, rowHeight, 'F');
    
    // Header Texts
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255); // White text
    
    doc.text('Qtd', marginX + 2, y + 4.2);
    doc.text('Descrição do Item / Peça', marginX + colQtdWidth + 2, y + 4.2);
    doc.text('Valor Unit. (R$)', marginX + colQtdWidth + colDescWidth + 2, y + 4.2);
    doc.text('Total (R$)', marginX + colQtdWidth + colDescWidth + colUnitWidth + 2, y + 4.2);
    
    y += rowHeight;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor.r, textColor.g, textColor.b); // Charcoal #333333
    doc.setFontSize(7.5);

    os.orcamento.forEach((item, index) => {
      const wrappedDesc = doc.splitTextToSize(item.descricao, colDescWidth - 4) as string[];
      const linesLength = wrappedDesc.length;
      const itemRowHeight = Math.max(6, (linesLength * 4.2) + 1.8);

      ensureSpace(itemRowHeight);

      // Alternating row background
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252); // extremely light slate-50
        doc.rect(marginX, y, tableWidth, itemRowHeight, 'F');
      }
      
      // Draw bottom grid line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.1);
      doc.line(marginX, y + itemRowHeight, marginX + tableWidth, y + itemRowHeight);

      // Quantidade
      doc.text(String(item.quantidade), marginX + 2, y + 4.1);
      
      // Descrição - desenho multilinha dinâmico
      wrappedDesc.forEach((line, lineIdx) => {
        doc.text(line, marginX + colQtdWidth + 2, y + 4.1 + (lineIdx * 4.2));
      });

      // Unit value
      const valUnitStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario);
      doc.text(valUnitStr, marginX + colQtdWidth + colDescWidth + 2, y + 4.1);

      // Total row value
      const valTotalStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorTotal);
      doc.text(valTotalStr, marginX + colQtdWidth + colDescWidth + colUnitWidth + 2, y + 4.1);

      y += itemRowHeight;
    });

    // Total Budget Row
    const budgetTotalRowHeight = 7;
    ensureSpace(budgetTotalRowHeight + 8);

    doc.setFillColor(241, 245, 249); // slate-100 highlight
    doc.rect(marginX, y, tableWidth, budgetTotalRowHeight, 'F');
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.setLineWidth(0.15);
    doc.rect(marginX, y, tableWidth, budgetTotalRowHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b); // Deep Blue #003366
    doc.text('VALOR TOTAL DO ORÇAMENTO:', marginX + 3, y + 4.8);

    const totalBudgetVal = os.valorTotalOrcamento || os.orcamento.reduce((acc, current) => acc + current.valorTotal, 0);
    const totalBudgetStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBudgetVal);
    
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b); // Accent orange for total emphasize
    doc.text(totalBudgetStr, marginX + colQtdWidth + colDescWidth + colUnitWidth + 2, y + 4.8);

    y += budgetTotalRowHeight + 8;
  }

  // Observações gerais da etapa final
  if (os.observacoesFinais) {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('OBSERVAÇÕES ADICIONAIS:', marginX, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor.r, textColor.g, textColor.b);
    
    const wrappedObsFin = doc.splitTextToSize(os.observacoesFinais, contentWidth - 10);
    doc.text(wrappedObsFin, marginX + 2, y + 4.5);
    
    const obsFinLength = Number(wrappedObsFin?.length) || 0;
    y += (obsFinLength * 4.2) + 8;
  }

  // --- FOTOS DEPOIS (Gallery grid) ---
  if (os.fotosDepois && os.fotosDepois.length > 0) {
    drawSectionHeader('Fotos Depois');
    
    const photoWidth = 55;
    const photoHeight = 42;
    const spacingX = 6;
    const itemHeight = photoHeight + 7; // added 7mm for caption descriptions under each photo
    const spacingY = 4;
    
    ensureSpace(itemHeight + 10);

    let col = 0;
    
    for (let i = 0; i < os.fotosDepois.length; i++) {
      if (col === 3) {
        col = 0;
        y += itemHeight + spacingY;
        ensureSpace(itemHeight + 5);
      }
      
      const px = marginX + col * (photoWidth + spacingX);
      
      doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      doc.setLineWidth(0.3);
      doc.rect(px, y, photoWidth, photoHeight, 'S');

      try {
        const imgUrl = os.fotosDepois[i];
        if (imgUrl.startsWith('data:image')) {
          const dims = await getImageDimensions(imgUrl);
          const fit = getFitDimensions(dims.width, dims.height, photoWidth - 2, photoHeight - 2);
          const centeredX = px + 1 + (photoWidth - 2 - fit.width) / 2;
          const centeredY = y + 1 + (photoHeight - 2 - fit.height) / 2;
          doc.addImage(imgUrl, 'JPEG', centeredX, centeredY, fit.width, fit.height, undefined, 'FAST');
        } else {
          doc.setFillColor(lightGrey.r, lightGrey.g, lightGrey.b);
          doc.rect(px + 1, y + 1, photoWidth - 2, photoHeight - 2, 'F');
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          doc.text('Foto Armazenada', px + photoWidth / 2, y + photoHeight / 2 - 2, { align: 'center' });
          doc.setFontSize(5.5);
          doc.text('(Consultar arquivo online)', px + photoWidth / 2, y + photoHeight / 2 + 4, { align: 'center' });
        }
      } catch (e) {
        doc.setFillColor(lightGrey.r, lightGrey.g, lightGrey.b);
        doc.rect(px + 1, y + 1, photoWidth - 2, photoHeight - 2, 'F');
        doc.setFontSize(8);
        doc.text('Erro ao carregar', px + photoWidth / 2, y + photoHeight / 2, { align: 'center' });
      }

      // Draw photo description / info below the box
      const descText = (os.fotosDepoisDescricoes?.[i] || '').trim();
      if (descText) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(70, 70, 70);
        const wrappedDesc = doc.splitTextToSize(descText, photoWidth - 2);
        doc.text(wrappedDesc, px + photoWidth / 2, y + photoHeight + 3.5, { align: 'center' });
      }

      col++;
    }
    y += itemHeight + 12;
  }

  // --- CONDIÇÕES COMERCIAIS NO PDF ---
  if (os.formaPagamento) {
    ensureSpace(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('CONDIÇÕES COMERCIAIS / INFORMAÇÕES DE RECEBIMENTO', marginX, y);
    y += 3.5;

    // Draw card containing details
    doc.setFillColor(lightGrey.r, lightGrey.g, lightGrey.b);
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.setLineWidth(0.15);

    // Dynamic height based on content
    let linesToDraw: string[] = [];
    linesToDraw.push(`Forma de Pagamento: ${os.formaPagamento}`);

    if (os.formaPagamento === 'PIX') {
      if (os.chavePix) {
        linesToDraw.push(`Chave PIX (${os.tipoChavePix || 'Chave'}): ${os.chavePix}`);
      }
      if (os.favorecidoPix) {
        linesToDraw.push(`Favorecido (Titular): ${os.favorecidoPix}`);
      }
    } else if (os.formaPagamento === 'Transferência Bancária' || os.formaPagamento === 'Boleto Bancário') {
      const bankDetails = [
        os.banco ? `Banco: ${os.banco}` : '',
        os.agencia ? `Agência: ${os.agencia}` : '',
        os.conta ? `Conta: ${os.conta} (${os.tipoConta || 'Corrente'})` : ''
      ].filter(Boolean).join(' | ');

      if (bankDetails) {
        linesToDraw.push(bankDetails);
      }
      if (os.favorecidoConta) {
        linesToDraw.push(`Favorecido (Titular): ${os.favorecidoConta} ${os.cpfCnpjConta ? `(CPF/CNPJ: ${os.cpfCnpjConta})` : ''}`);
      }
    } else if (os.formaPagamento === 'Cartão de Crédito') {
      linesToDraw.push(`Opção de Parcelamento: ${os.parcelamento || 'À vista'}`);
    } else if (os.formaPagamento === 'Pedido de Compra' && os.numeroPedidoCompra) {
      linesToDraw.push(`Número do Pedido de Compra do Cliente: ${os.numeroPedidoCompra}`);
    }

    if (os.observacoesComerciais) {
      linesToDraw.push(os.observacoesComerciais);
    }

    // Format lines to wrap
    let finalLines: string[] = [];
    linesToDraw.forEach(line => {
      const wrapped = doc.splitTextToSize(line, contentWidth - 10) as string[];
      finalLines.push(...wrapped);
    });

    const cardHeight = (finalLines.length * 4.2) + 6;
    ensureSpace(cardHeight + 6);

    doc.rect(marginX, y, contentWidth, cardHeight, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textColor.r, textColor.g, textColor.b);

    finalLines.forEach((line, lineIdx) => {
      doc.text(line, marginX + 5, y + 5 + (lineIdx * 4.2));
    });

    y += cardHeight + 6;
  }

  // --- SIGNATURE AND DATE SECTOR ---
  ensureSpace(45);
  y += 5;
  
  doc.setFillColor(lightGrey.r, lightGrey.g, lightGrey.b);
  doc.rect(marginX, y, contentWidth, 32, 'F');
  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.rect(marginX, y, contentWidth, 32, 'S');

  // Date of Completion / Emission details on left column of card
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  
  const isConcluido = os.status === 'Concluído';
  const labelDataConclusao = isConcluido ? 'DATA DE CONCLUSÃO' : 'DATA DE EMISSÃO';
  doc.text(labelDataConclusao, marginX + 8, y + 8);
  
  const closingDate = (isConcluido && os.dataConclusao) ? os.dataConclusao : os.dataAbertura;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.text(formatToBrazilianDate(closingDate), marginX + 8, y + 14);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Registro gerado e assinado digitalmente.', marginX + 8, y + 24);

  // Digital Signature area on the right column of card (simulated)
  const signX = marginX + 110;
  
  doc.setDrawColor(180, 185, 190);
  doc.setLineWidth(0.4);
  doc.line(signX, y + 17, signX + 55, y + 17); // line for signature

  // Draw simulated dynamic technician signature in italic orange handwriting
  doc.setFont('courier', 'oblique');
  doc.setFontSize(12);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text(os.tecnico, signX + 27, y + 14, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('ASSINATURA DIGITAL DO TÉCNICO', signX + 27, y + 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`UID: ${os.id.substring(0, 12).toUpperCase()}...`, signX + 27, y + 25, { align: 'center' });

  // Finalize document footers
  drawPageFooter();

  // Return base64 URI for PDF frame embedding/downloading
  return doc.output('datauristring');
};
