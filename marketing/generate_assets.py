# -*- coding: utf-8 -*-
import os
import sys
from PIL import Image, ImageDraw, ImageFont

# Directories setup
os.makedirs('marketing/assets', exist_ok=True)
os.makedirs('public/marketing/assets', exist_ok=True)

# Main Colors of DG Gestão Automotiva App
COLOR_DARK_BLUE = (0, 31, 63, 255)      # #001f3f (Navy Imperial)
COLOR_MID_BLUE = (0, 51, 102, 255)       # #003366 (Slate Blue Accent)
COLOR_LIGHT_BLUE = (0, 102, 204, 255)    # #0066cc (Active Blue)
COLOR_ORANGE = (255, 102, 0, 255)        # #FF6600 (Brand Accent)
COLOR_TEAL = (0, 229, 255, 255)          # #00E5FF (Accent Teal)
COLOR_WHITE = (255, 255, 255, 255)
COLOR_LIGHT_GRAY = (248, 250, 252, 255)  # #f8fafc (App background)
COLOR_DARK_GRAY = (15, 23, 42, 255)      # #0f172a (Sidebar/Dark elements)
COLOR_BORDER_SLATE = (226, 232, 240, 255) # #e2e8f0 (Grid borders)
COLOR_GREEN = (16, 185, 129, 255)        # #10b981 (Success/Approved)

# Helper: Save image to both locations
def save_image(img, filename):
    for prefix in ['marketing/assets', 'public/marketing/assets']:
        full_path = os.path.join(prefix, filename)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        img.save(full_path, 'PNG')
    print(f"Generated: {filename}")

# Font loader with system fallback
def get_font(font_type='regular', size=12):
    try:
        if font_type == 'bold':
            return ImageFont.truetype("/usr/share/fonts/truetype/freefont/FreeSansBold.ttf", size)
        elif font_type == 'mono':
            return ImageFont.truetype("/usr/share/fonts/truetype/freefont/FreeMono.ttf", size)
        else:
            return ImageFont.truetype("/usr/share/fonts/truetype/freefont/FreeSans.ttf", size)
    except:
        return ImageFont.load_default()

# Helper: Draw smooth rounded rectangle
def draw_rounded_rect(draw, coords, r, fill, outline=None, width=1):
    draw.rounded_rectangle(coords, radius=r, fill=fill, outline=outline, width=width)

# Helper: Draw linear gradient background
def draw_gradient_background(img, colors):
    draw = ImageDraw.Draw(img)
    width, height = img.size
    if len(colors) == 2:
        c1, c2 = colors
        for y in range(height):
            r = int(c1[0] + (c2[0] - c1[0]) * y / height)
            g = int(c1[1] + (c2[1] - c1[1]) * y / height)
            b = int(c1[2] + (c2[2] - c1[2]) * y / height)
            draw.line((0, y, width, y), fill=(r, g, b, 255))
    elif len(colors) == 3:
        c1, c2, c3 = colors
        half = height // 2
        for y in range(half):
            r = int(c1[0] + (c2[0] - c1[0]) * y / half)
            g = int(c1[1] + (c2[1] - c1[1]) * y / half)
            b = int(c1[2] + (c2[2] - c1[2]) * y / half)
            draw.line((0, y, width, y), fill=(r, g, b, 255))
        for y in range(half, height):
            dy = y - half
            r = int(c2[0] + (c3[0] - c2[0]) * dy / half)
            g = int(c2[1] + (c3[1] - c2[1]) * dy / half)
            b = int(c2[2] + (c3[2] - c2[2]) * dy / half)
            draw.line((0, y, width, y), fill=(r, g, b, 255))

# Helper: Draw glowing background circles
def draw_aurora_glow(img, glows):
    draw = ImageDraw.Draw(img)
    for glow in glows:
        cx, cy, r_max, color = glow["cx"], glow["cy"], glow["r"], glow["color"]
        steps = 12
        for s in range(steps):
            r = int(r_max * (1 - s / steps))
            alpha = int(22 * (s / steps))
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(color[0], color[1], color[2], alpha))

# Helper: Draw logo icon
def draw_logo_icon(draw, x, y, size):
    draw_rounded_rect(draw, (x, y, x + size, y + size), int(size * 0.25), COLOR_ORANGE)
    font = get_font('bold', int(size * 0.5))
    draw.text((x + int(size * 0.16), y + int(size * 0.18)), "DG", fill=COLOR_WHITE, font=font)

# Multiline text drawer with spacing
def draw_multiline_text(draw, x, y, text, font, fill, spacing=6):
    lines = text.split('\n')
    curr_y = y
    for line in lines:
        draw.text((x, curr_y), line, fill=fill, font=font)
        try:
            bbox = font.getbbox(line)
            h = bbox[3] - bbox[1]
            curr_y += h + spacing
        except:
            curr_y += font.size + spacing

# -------------------------------------------------------------
# HIGH FIDELITY ACTUAL SCREEN DRAWING PIPELINE
# -------------------------------------------------------------

# Screen 1: Dashboard
def draw_dashboard_screen(img, x, y, w, h, is_mobile=False):
    draw = ImageDraw.Draw(img)
    # Background
    draw.rectangle((x, y, x + w, y + h), fill=(248, 250, 252, 255))
    
    if is_mobile:
        # Header mobile
        draw.rectangle((x, y, x + w, y + int(h * 0.14)), fill=(15, 23, 42, 255))
        draw_logo_icon(draw, x + 10, y + int(h * 0.03), int(h * 0.08))
        draw.text((x + int(h * 0.14), y + int(h * 0.045)), "DG GESTÃO", fill=COLOR_WHITE, font=get_font('bold', int(h * 0.05)))
        
        # Welcome Banner mobile
        banner_y = y + int(h * 0.16)
        banner_h = int(h * 0.24)
        draw_rounded_rect(draw, (x + 8, banner_y, x + w - 8, banner_y + banner_h), 8, (0, 51, 102, 255))
        draw.text((x + 16, banner_y + 10), "Gestão Automotiva", fill=COLOR_WHITE, font=get_font('bold', int(h * 0.045)))
        draw.text((x + 16, banner_y + 26), "v1.0 Profissional", fill=COLOR_TEAL, font=get_font('mono', int(h * 0.035)))
        
        # Shortcuts mobile
        grid_y = banner_y + banner_h + 10
        grid_h = int(h * 0.16)
        draw_rounded_rect(draw, (x + 8, grid_y, x + w - 8, grid_y + grid_h), 8, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        draw.text((x + 16, grid_y + 10), "➕ Nova OS", fill=(15, 23, 42, 255), font=get_font('bold', int(h * 0.042)))
        draw.text((x + 16, grid_y + int(grid_h * 0.55)), "💰 Precificar", fill=(15, 23, 42, 255), font=get_font('bold', int(h * 0.042)))
        
        # Orders list
        list_y = grid_y + grid_h + 10
        draw.text((x + 10, list_y), "ÚLTIMOS ATENDIMENTOS", fill=(0, 51, 102, 255), font=get_font('bold', int(h * 0.038)))
        # Row
        row1_y = list_y + int(h * 0.06)
        draw_rounded_rect(draw, (x + 8, row1_y, x + w - 8, row1_y + int(h * 0.14)), 6, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        draw.text((x + 16, row1_y + 4), "Civic - BRA-2E19", fill=(15, 23, 42, 255), font=get_font('bold', int(h * 0.035)))
        draw.text((x + 16, row1_y + int(h * 0.07)), "Danilo Gomes", fill=(100, 116, 139, 255), font=get_font('regular', int(h * 0.03)))
        draw.text((x + w - 85, row1_y + 4), "R$ 765,00", fill=COLOR_ORANGE, font=get_font('bold', int(h * 0.035)))
        
    else:
        # Left Sidebar (20% width)
        side_w = int(w * 0.2)
        draw.rectangle((x, y, x + side_w, y + h), fill=(15, 23, 42, 255))
        # Logo
        draw_logo_icon(draw, x + 10, y + 10, 24)
        draw.text((x + 40, y + 15), "DG GESTÃO", fill=COLOR_WHITE, font=get_font('bold', 12))
        
        # Sidebar links
        links = [("🏠 Painel", COLOR_ORANGE), ("📋 Ordens", COLOR_WHITE), ("👥 Clientes", COLOR_WHITE), ("🚜 Equipamentos", COLOR_WHITE), ("💰 Precificação", COLOR_WHITE), ("📊 Relatórios", COLOR_WHITE)]
        for idx, (label, color) in enumerate(links):
            ly = y + 50 + idx * 26
            if label.startswith("🏠"):
                draw.rectangle((x + 4, ly - 4, x + side_w - 4, ly + 20), fill=(255, 102, 0, 30))
            draw.text((x + 14, ly), label, fill=color, font=get_font('bold', 10))
            
        # Top Header Bar
        head_h = 32
        draw.rectangle((x + side_w, y, x + w, y + head_h), fill=COLOR_WHITE)
        draw.line((x + side_w, y + head_h, x + w, y + head_h), fill=COLOR_BORDER_SLATE, width=1)
        draw.text((x + side_w + 12, y + 10), "Painel Geral da Oficina", fill=(15, 23, 42, 255), font=get_font('bold', 11))
        draw.text((x + w - 120, y + 10), "● Conectado (Offline-Ready)", fill=COLOR_GREEN, font=get_font('bold', 8))
        
        # Main area offset
        content_x = x + side_w + 12
        content_y = y + head_h + 12
        content_w = w - side_w - 24
        
        # Welcome Banner
        banner_h = int(h * 0.22)
        draw_rounded_rect(draw, (content_x, content_y, content_x + content_w, content_y + banner_h), 10, (0, 51, 102, 255))
        draw.text((content_x + 20, content_y + 12), "Gestão Integrada de Manutenção Automotiva", fill=COLOR_WHITE, font=get_font('bold', 14))
        draw.text((content_x + 20, content_y + 32), "Monitore atendimentos em tempo real, gerencie placas e automatize precificações.", fill=(203, 213, 225, 255), font=get_font('regular', 9))
        
        # Shortcut Row
        row_y = content_y + banner_h + 12
        card_w = (content_w - 24) // 4
        card_h = int(h * 0.18)
        shortcuts = [("➕ Nova OS", "Abrir atendimentos"), ("👥 Clientes", "Fichas de contato"), ("🚜 Equipamentos", "Controle de frotas"), ("💰 Precificação", "Markup & simulador")]
        for idx, (title, desc) in enumerate(shortcuts):
            cx = content_x + idx * (card_w + 8)
            draw_rounded_rect(draw, (cx, row_y, cx + card_w, row_y + card_h), 8, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
            draw.text((cx + 10, row_y + 10), title, fill=(0, 51, 102, 255), font=get_font('bold', 10))
            draw.text((cx + 10, row_y + 26), desc, fill=(148, 163, 184, 255), font=get_font('regular', 7))
            
        # Recent activity table
        table_y = row_y + card_h + 12
        table_h = h - (table_y - y) - 12
        if table_h > 30:
            draw_rounded_rect(draw, (content_x, table_y, content_x + content_w, table_y + table_h), 8, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
            draw.text((content_x + 12, table_y + 8), "ÚLTIMOS ATENDIMENTOS NO PÁTIO", fill=(15, 23, 42, 255), font=get_font('bold', 9))
            
            # Draw Header of table
            ty = table_y + 24
            draw.line((content_x + 12, ty, content_x + content_w - 12, ty), fill=(241, 245, 249, 255), width=1)
            draw.text((content_x + 16, ty + 4), "CÓDIGO", fill=(148, 163, 184, 255), font=get_font('bold', 7))
            draw.text((content_x + 60, ty + 4), "CLIENTE / VEÍCULO", fill=(148, 163, 184, 255), font=get_font('bold', 7))
            draw.text((content_x + 200, ty + 4), "VALOR", fill=(148, 163, 184, 255), font=get_font('bold', 7))
            draw.text((content_x + content_w - 80, ty + 4), "STATUS", fill=(148, 163, 184, 255), font=get_font('bold', 7))
            
            # Row 1
            r1 = ty + 16
            draw.text((content_x + 16, r1), "OS #1084", fill=(15, 23, 42, 255), font=get_font('bold', 8))
            draw.text((content_x + 60, r1), "Danilo S. Gomes — Honda Civic 2.0 (BRA-2E19)", fill=(71, 85, 105, 255), font=get_font('bold', 8))
            draw.text((content_x + 200, r1), "R$ 765,00", fill=COLOR_ORANGE, font=get_font('bold', 8))
            draw_rounded_rect(draw, (content_x + content_w - 80, r1 - 1, content_x + content_w - 12, r1 + 10), 3, COLOR_GREEN)
            draw.text((content_x + content_w - 72, r1 + 1), "CONCLUÍDO", fill=COLOR_WHITE, font=get_font('bold', 6))

# Screen 2: Ordem de Serviço
def draw_os_digital_screen(img, x, y, w, h, is_mobile=False):
    draw = ImageDraw.Draw(img)
    # Background
    draw.rectangle((x, y, x + w, y + h), fill=(248, 250, 252, 255))
    
    if is_mobile:
        # Mobile top
        draw.rectangle((x, y, x + w, y + int(h * 0.12)), fill=(15, 23, 42, 255))
        draw.text((x + 10, y + 10), "Nova Ordem de Serviço", fill=COLOR_WHITE, font=get_font('bold', 12))
        
        # Step header
        step_y = y + int(h * 0.15)
        draw_rounded_rect(draw, (x + 8, step_y, x + w - 8, step_y + 36), 6, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        draw.text((x + 16, step_y + 10), "Passo 3 de 5: Orçamento de Peças", fill=COLOR_ORANGE, font=get_font('bold', 9))
        
        # Form box
        form_y = step_y + 44
        draw_rounded_rect(draw, (x + 8, form_y, x + w - 8, form_y + 130), 6, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        draw.text((x + 16, form_y + 10), "Cliente: Danilo S. Gomes", fill=(15, 23, 42, 255), font=get_font('bold', 9))
        draw.text((x + 16, form_y + 24), "Honda Civic 2.0 EXL (BRA-2E19)", fill=(71, 85, 105, 255), font=get_font('regular', 8))
        
        # Item list
        draw.line((x + 16, form_y + 42, x + w - 16, form_y + 42), fill=COLOR_BORDER_SLATE, width=1)
        draw.text((x + 16, form_y + 48), "• Pastilha Brembo Diant. - R$ 280,00", fill=(71, 85, 105, 255), font=get_font('regular', 8))
        draw.text((x + 16, form_y + 64), "• Par Discos Vent. Freio - R$ 420,00", fill=(71, 85, 105, 255), font=get_font('regular', 8))
        draw.text((x + 16, form_y + 80), "• Mão de Obra Sangria - R$ 150,00", fill=(71, 85, 105, 255), font=get_font('regular', 8))
        
        # Total
        draw.line((x + 16, form_y + 96, x + w - 16, form_y + 96), fill=COLOR_BORDER_SLATE, width=1)
        draw.text((x + 16, form_y + 104), "VALOR TOTAL:", fill=(15, 23, 42, 255), font=get_font('bold', 9))
        draw.text((x + w - 90, form_y + 102), "R$ 765,00", fill=COLOR_ORANGE, font=get_font('bold', 11))
        
        # Action Button
        btn_y = form_y + 140
        draw_rounded_rect(draw, (x + 8, btn_y, x + w - 8, btn_y + 30), 6, COLOR_ORANGE)
        draw.text((x + w//2 - 40, btn_y + 8), "AVANÇAR PASSO ➔", fill=COLOR_WHITE, font=get_font('bold', 9))
        
    else:
        # Sidebar (20% width)
        side_w = int(w * 0.2)
        draw.rectangle((x, y, x + side_w, y + h), fill=(15, 23, 42, 255))
        draw_logo_icon(draw, x + 10, y + 10, 24)
        draw.text((x + 40, y + 15), "DG GESTÃO", fill=COLOR_WHITE, font=get_font('bold', 12))
        
        # Sidebar links
        links = [("🏠 Painel", COLOR_WHITE), ("📋 Ordens", COLOR_ORANGE), ("👥 Clientes", COLOR_WHITE), ("🚜 Equipamentos", COLOR_WHITE), ("💰 Precificação", COLOR_WHITE), ("📊 Relatórios", COLOR_WHITE)]
        for idx, (label, color) in enumerate(links):
            ly = y + 50 + idx * 26
            if label.startswith("📋"):
                draw.rectangle((x + 4, ly - 4, x + side_w - 4, ly + 20), fill=(255, 102, 0, 30))
            draw.text((x + 14, ly), label, fill=color, font=get_font('bold', 10))
            
        # Top Header
        head_h = 32
        draw.rectangle((x + side_w, y, x + w, y + head_h), fill=COLOR_WHITE)
        draw.line((x + side_w, y + head_h, x + w, y + head_h), fill=COLOR_BORDER_SLATE, width=1)
        draw.text((x + side_w + 12, y + 10), "Nova Ordem de Serviço (Abertura Técnica)", fill=(15, 23, 42, 255), font=get_font('bold', 11))
        
        # Content layout
        content_x = x + side_w + 12
        content_y = y + head_h + 12
        content_w = w - side_w - 24
        
        # Stepper block
        step_h = 36
        draw_rounded_rect(draw, (content_x, content_y, content_x + content_w, content_y + step_h), 6, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        # Circles for step indicator
        steps_text = ["1. Cliente", "2. Fotos", "3. Orçamento", "4. Checkout", "5. Fim"]
        for idx, step_lbl in enumerate(steps_text):
            cx = content_x + 16 + idx * (content_w // 5)
            circle_color = COLOR_ORANGE if idx == 2 else (COLOR_DARK_BLUE if idx < 2 else (226, 232, 240, 255))
            draw.ellipse((cx, content_y + 10, cx + 16, content_y + 26), fill=circle_color)
            draw.text((cx + 5, content_y + 13), str(idx+1), fill=COLOR_WHITE, font=get_font('bold', 8))
            draw.text((cx + 22, content_y + 13), step_lbl, fill=(15, 23, 42, 255) if idx == 2 else (148, 163, 184, 255), font=get_font('bold', 8))
            
        # Form box
        form_y = content_y + step_h + 12
        form_h = h - (form_y - y) - 12
        if form_h > 30:
            draw_rounded_rect(draw, (content_x, form_y, content_x + content_w, form_y + form_h), 10, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
            
            # Title inside form
            draw.text((content_x + 20, form_y + 12), "Composição de Peças, Serviços e Valores", fill=(15, 23, 42, 255), font=get_font('bold', 11))
            draw.text((content_x + 20, form_y + 28), "Identificação: Danilo S. Gomes | Honda Civic 2.0 EXL | Placa: BRA-2E19", fill=(100, 116, 139, 255), font=get_font('bold', 8))
            
            # Table of budget
            ty = form_y + 44
            draw.rectangle((content_x + 20, ty, content_x + content_w - 20, ty + 16), fill=(241, 245, 249, 255))
            draw.text((content_x + 30, ty + 3), "DESCRIÇÃO DO ITEM / SERVIÇO", fill=(71, 85, 105, 255), font=get_font('bold', 8))
            draw.text((content_x + content_w - 180, ty + 3), "QTD", fill=(71, 85, 105, 255), font=get_font('bold', 8))
            draw.text((content_x + content_w - 100, ty + 3), "PREÇO TOTAL", fill=(71, 85, 105, 255), font=get_font('bold', 8))
            
            # Table items
            items = [("Kit Pastilha de Freio Brembo Diant.", "1 un", "R$ 280,00"), ("Par de Discos Ventilados de Freio Civic 2020", "1 un", "R$ 420,00"), ("Mão de Obra - Sangria e Troca de Fluido", "1 un", "R$ 150,00")]
            for idx, (name, qty, val) in enumerate(items):
                iy = ty + 20 + idx * 18
                if iy + 14 < form_y + form_h:
                    draw.text((content_x + 30, iy), name, fill=(15, 23, 42, 255), font=get_font('regular', 8))
                    draw.text((content_x + content_w - 180, iy), qty, fill=(71, 85, 105, 255), font=get_font('regular', 8))
                    draw.text((content_x + content_w - 100, iy), val, fill=(15, 23, 42, 255), font=get_font('bold', 8))
                    draw.line((content_x + 20, iy + 14, content_x + content_w - 20, iy + 14), fill=(241, 245, 249, 255), width=1)
                    
            # Total sum box
            tot_y = ty + 20 + len(items) * 18 + 10
            if tot_y + 30 < form_y + form_h:
                draw_rounded_rect(draw, (content_x + content_w - 220, tot_y, content_x + content_w - 20, tot_y + 26), 4, (0, 51, 102, 15))
                draw.text((content_x + content_w - 210, tot_y + 7), "SOMA DOS ITENS:", fill=(0, 51, 102, 255), font=get_font('bold', 8))
                draw.text((content_x + content_w - 110, tot_y + 6), "R$ 765,00", fill=COLOR_ORANGE, font=get_font('bold', 11))
                
            # Wizard Action Buttons
            act_y = form_y + form_h - 26
            if act_y > tot_y + 26:
                draw_rounded_rect(draw, (content_x + 20, act_y, content_x + 100, act_y + 18), 4, COLOR_WHITE, outline=(203, 213, 225, 255))
                draw.text((content_x + 36, act_y + 4), "◄ ANTERIOR", fill=(100, 116, 139, 255), font=get_font('bold', 7))
                
                draw_rounded_rect(draw, (content_x + content_w - 120, act_y, content_x + content_w - 20, act_y + 18), 4, COLOR_ORANGE)
                draw.text((content_x + content_w - 112, act_y + 4), "SALVAR E AVANÇAR ➔", fill=COLOR_WHITE, font=get_font('bold', 7))

# Screen 3: Central de Precificação
def draw_precificacao_screen(img, x, y, w, h, is_mobile=False):
    draw = ImageDraw.Draw(img)
    # Background
    draw.rectangle((x, y, x + w, y + h), fill=(248, 250, 252, 255))
    
    if is_mobile:
        # Header mobile
        draw.rectangle((x, y, x + w, y + int(h * 0.12)), fill=(15, 23, 42, 255))
        draw.text((x + 10, y + 10), "Central de Precificação", fill=COLOR_WHITE, font=get_font('bold', 11))
        
        # Results mobile
        res_y = y + int(h * 0.15)
        res_h = int(h * 0.28)
        draw_rounded_rect(draw, (x + 8, res_y, x + w - 8, res_y + res_h), 6, COLOR_WHITE, outline=COLOR_ORANGE)
        draw.rectangle((x + 8, res_y, x + w - 8, res_y + 20), fill=(255, 102, 0, 15))
        draw.text((x + 16, res_y + 4), "MARKUP TÉCNICO IDEAL", fill=COLOR_ORANGE, font=get_font('bold', 8))
        draw.text((x + 16, res_y + 24), "Markup: 2.27x", fill=(0, 51, 102, 255), font=get_font('bold', 12))
        draw.text((x + 16, res_y + 44), "Preço de Venda Sugerido:", fill=(100, 116, 139, 255), font=get_font('regular', 8))
        draw.text((x + 16, res_y + 56), "R$ 794,50", fill=COLOR_ORANGE, font=get_font('bold', 16))
        
        # Form list
        form_y = res_y + res_h + 10
        draw_rounded_rect(draw, (x + 8, form_y, x + w - 8, form_y + 140), 6, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        fields = [("Custo da Peça", "R$ 350,00"), ("Imposto (DAS)", "6.0 %"), ("Despesas Fixas", "15.0 %"), ("Comissão Mecânico", "10.0 %"), ("Margem Desejada", "25.0 %")]
        for idx, (label, val) in enumerate(fields):
            fy = form_y + 8 + idx * 24
            draw.text((x + 16, fy), label, fill=(100, 116, 139, 255), font=get_font('regular', 8))
            draw.text((x + w - 80, fy), val, fill=(15, 23, 42, 255), font=get_font('bold', 8))
            draw.line((x + 16, fy + 18, x + w - 16, fy + 18), fill=(241, 245, 249, 255), width=1)
            
    else:
        # Sidebar (20% width)
        side_w = int(w * 0.2)
        draw.rectangle((x, y, x + side_w, y + h), fill=(15, 23, 42, 255))
        draw_logo_icon(draw, x + 10, y + 10, 24)
        draw.text((x + 40, y + 15), "DG GESTÃO", fill=COLOR_WHITE, font=get_font('bold', 12))
        
        # Sidebar links
        links = [("🏠 Painel", COLOR_WHITE), ("📋 Ordens", COLOR_WHITE), ("👥 Clientes", COLOR_WHITE), ("🚜 Equipamentos", COLOR_WHITE), ("💰 Precificação", COLOR_ORANGE), ("📊 Relatórios", COLOR_WHITE)]
        for idx, (label, color) in enumerate(links):
            ly = y + 50 + idx * 26
            if label.startswith("💰"):
                draw.rectangle((x + 4, ly - 4, x + side_w - 4, ly + 20), fill=(255, 102, 0, 30))
            draw.text((x + 14, ly), label, fill=color, font=get_font('bold', 10))
            
        # Top Header
        head_h = 32
        draw.rectangle((x + side_w, y, x + w, y + head_h), fill=COLOR_WHITE)
        draw.line((x + side_w, y + head_h, x + w, y + head_h), fill=COLOR_BORDER_SLATE, width=1)
        draw.text((x + side_w + 12, y + 10), "Central de Precificação Inteligente", fill=(15, 23, 42, 255), font=get_font('bold', 11))
        
        # Content layout
        content_x = x + side_w + 12
        content_y = y + head_h + 12
        content_w = w - side_w - 24
        
        # Split: Form left, Results right
        col_w = (content_w - 12) // 2
        
        # Left card (Form)
        draw_rounded_rect(draw, (content_x, content_y, content_x + col_w, y + h - 12), 10, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        draw.text((content_x + 16, content_y + 12), "Simulador de Custo e Margem", fill=(15, 23, 42, 255), font=get_font('bold', 11))
        
        fields = [
            ("Custo de Aquisição (Peça)", "R$ 350,00"),
            ("Impostos Diretos (DAS)", "6.0 %"),
            ("Despesas Operacionais Fixas", "15.0 %"),
            ("Comissão do Mecânico", "10.0 %"),
            ("Margem de Lucro Desejada", "25.0 %")
        ]
        for idx, (label, val) in enumerate(fields):
            fy = content_y + 36 + idx * 30
            if fy + 24 < y + h:
                draw.text((content_x + 16, fy), label, fill=(100, 116, 139, 255), font=get_font('regular', 8))
                draw_rounded_rect(draw, (content_x + 16, fy + 12, content_x + col_w - 16, fy + 28), 4, (248, 250, 252, 255), outline=COLOR_BORDER_SLATE)
                draw.text((content_x + 22, fy + 16), val, fill=(15, 23, 42, 255), font=get_font('bold', 8))
                
        # Right card (Results)
        rx = content_x + col_w + 12
        draw_rounded_rect(draw, (rx, content_y, rx + col_w, y + h - 12), 10, COLOR_WHITE, outline=COLOR_ORANGE)
        draw.rectangle((rx, content_y, rx + col_w, content_y + 26), fill=(255, 102, 0, 15))
        draw.text((rx + 16, content_y + 8), "MÉTODO MARKUP DE ACELERAÇÃO DE CAIXA", fill=COLOR_ORANGE, font=get_font('bold', 8))
        
        draw.text((rx + 16, content_y + 38), "Markup Técnico Ideal:", fill=(15, 23, 42, 255), font=get_font('bold', 9))
        draw.text((rx + 16, content_y + 50), "2.27", fill=COLOR_GREEN, font=get_font('bold', 22))
        
        draw.text((rx + 16, content_y + 84), "Preço de Venda Sugerido para o Pátio:", fill=(100, 116, 139, 255), font=get_font('regular', 8))
        draw.text((rx + 16, content_y + 96), "R$ 794,50", fill=COLOR_ORANGE, font=get_font('bold', 28))
        
        # Margem real
        draw.text((rx + 16, content_y + 140), "Margem Líquida Realizada: R$ 198,62 (25.0%)", fill=(15, 23, 42, 255), font=get_font('bold', 9))
        
        # Color bar split
        bar_y = content_y + 160
        if bar_y + 10 < y + h:
            draw_rounded_rect(draw, (rx + 16, bar_y, rx + col_w - 16, bar_y + 8), 4, (15, 23, 42, 255))
            # Cost part
            draw.rectangle((rx + 16, bar_y, rx + 16 + int(col_w * 0.44), bar_y + 8), fill=COLOR_ORANGE)
            # Commission part
            draw.rectangle((rx + 16 + int(col_w * 0.44), bar_y, rx + 16 + int(col_w * 0.54), bar_y + 8), fill=COLOR_LIGHT_BLUE)
            # Profit part
            draw.rectangle((rx + 16 + int(col_w * 0.54), bar_y, rx + col_w - 16, bar_y + 8), fill=COLOR_GREEN)

# Screen 4: Relatório Inteligente
def draw_relatorios_screen(img, x, y, w, h, is_mobile=False):
    draw = ImageDraw.Draw(img)
    # Background
    draw.rectangle((x, y, x + w, y + h), fill=(248, 250, 252, 255))
    
    if is_mobile:
        # Mobile top
        draw.rectangle((x, y, x + w, y + int(h * 0.12)), fill=(15, 23, 42, 255))
        draw.text((x + 10, y + 10), "Relatórios & Metas", fill=COLOR_WHITE, font=get_font('bold', 11))
        
        # KPI Card 1
        k1_y = y + int(h * 0.15)
        k1_h = int(h * 0.22)
        draw_rounded_rect(draw, (x + 8, k1_y, x + w - 8, k1_y + k1_h), 6, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        draw.text((x + 16, k1_y + 6), "FATURAMENTO TOTAL (MÊS)", fill=(100, 116, 139, 255), font=get_font('bold', 8))
        draw.text((x + 16, k1_y + 18), "R$ 24.850,00", fill=(15, 23, 42, 255), font=get_font('bold', 14))
        draw.text((x + 16, k1_y + 36), "▲ +12.4% vs mês anterior", fill=COLOR_GREEN, font=get_font('bold', 8))
        
        # KPI Card 2
        k2_y = k1_y + k1_h + 10
        draw_rounded_rect(draw, (x + 8, k2_y, x + w - 8, k2_y + k1_h), 6, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        draw.text((x + 16, k2_y + 6), "TICKET MÉDIO POR VEÍCULO", fill=(100, 116, 139, 255), font=get_font('bold', 8))
        draw.text((x + 16, k2_y + 18), "R$ 730,88", fill=COLOR_ORANGE, font=get_font('bold', 14))
        
    else:
        # Sidebar (20% width)
        side_w = int(w * 0.2)
        draw.rectangle((x, y, x + side_w, y + h), fill=(15, 23, 42, 255))
        draw_logo_icon(draw, x + 10, y + 10, 24)
        draw.text((x + 40, y + 15), "DG GESTÃO", fill=COLOR_WHITE, font=get_font('bold', 12))
        
        # Sidebar links
        links = [("🏠 Painel", COLOR_WHITE), ("📋 Ordens", COLOR_WHITE), ("👥 Clientes", COLOR_WHITE), ("🚜 Equipamentos", COLOR_WHITE), ("💰 Precificação", COLOR_WHITE), ("📊 Relatórios", COLOR_ORANGE)]
        for idx, (label, color) in enumerate(links):
            ly = y + 50 + idx * 26
            if label.startswith("📊"):
                draw.rectangle((x + 4, ly - 4, x + side_w - 4, ly + 20), fill=(255, 102, 0, 30))
            draw.text((x + 14, ly), label, fill=color, font=get_font('bold', 10))
            
        # Top Header
        head_h = 32
        draw.rectangle((x + side_w, y, x + w, y + head_h), fill=COLOR_WHITE)
        draw.line((x + side_w, y + head_h, x + w, y + head_h), fill=COLOR_BORDER_SLATE, width=1)
        draw.text((x + side_w + 12, y + 10), "Relatórios Operacionais e Financeiros", fill=(15, 23, 42, 255), font=get_font('bold', 11))
        
        # Content layout
        content_x = x + side_w + 12
        content_y = y + head_h + 12
        content_w = w - side_w - 24
        
        # KPI Row
        kpi_w = (content_w - 24) // 4
        kpi_h = int(h * 0.18)
        kpis = [
            ("Faturamento Mês", "R$ 24.850,00", "▲ +12% vs meta", COLOR_GREEN),
            ("Ticket Médio", "R$ 730,88", "Foco em preventivas", COLOR_ORANGE),
            ("OS Concluídas", "34 Unidades", "Produtividade pátio", (0, 51, 102, 255)),
            ("Margem Média", "28.5%", "Meta mínima: 25%", COLOR_GREEN)
        ]
        for idx, (label, val, trend, clr) in enumerate(kpis):
            kx = content_x + idx * (kpi_w + 8)
            draw_rounded_rect(draw, (kx, content_y, kx + kpi_w, content_y + kpi_h), 8, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
            draw.text((kx + 10, content_y + 10), label, fill=(100, 116, 139, 255), font=get_font('bold', 8))
            draw.text((kx + 10, content_y + 24), val, fill=(15, 23, 42, 255), font=get_font('bold', 11))
            draw.text((kx + 10, content_y + 44), trend, fill=clr, font=get_font('bold', 7))
            
        # Chart Row
        chart_y = content_y + kpi_h + 12
        chart_h = h - (chart_y - y) - 12
        if chart_h > 30:
            draw_rounded_rect(draw, (content_x, chart_y, content_x + content_w, chart_y + chart_h), 10, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
            draw.text((content_x + 16, chart_y + 10), "Faturamento Semanal do Caixa (R$)", fill=(15, 23, 42, 255), font=get_font('bold', 10))
            
            # Grid lines
            grid_base = chart_y + chart_h - 26
            grid_top = chart_y + 36
            for gl in range(4):
                gly = grid_base - gl * ((grid_base - grid_top) // 3)
                draw.line((content_x + 60, gly, content_x + content_w - 20, gly), fill=(241, 245, 249, 255), width=1)
                
            # Bars
            weeks = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"]
            vals = [0.55, 0.78, 0.95, 0.70]
            val_labels = ["R$ 5.2k", "R$ 6.8k", "R$ 7.1k", "R$ 5.7k"]
            bar_w = (content_w - 120) // 4
            for i in range(4):
                bx = content_x + 60 + i * (bar_w + 16)
                bh = int((grid_base - grid_top) * vals[i])
                draw_rounded_rect(draw, (bx, grid_base - bh, bx + bar_w, grid_base), 4, COLOR_ORANGE if i == 2 else (0, 51, 102, 255))
                draw.text((bx + 2, grid_base - bh - 12), val_labels[i], fill=(15, 23, 42, 255), font=get_font('bold', 8))
                draw.text((bx + int(bar_w * 0.3), grid_base + 6), weeks[i], fill=(100, 116, 139, 255), font=get_font('bold', 8))

# Screen 5: PDF da Ordem de Serviço
def draw_pdf_os_screen(img, x, y, w, h, is_mobile=False):
    draw = ImageDraw.Draw(img)
    draw_rounded_rect(draw, (x, y, x + w, y + h), 8, COLOR_WHITE, outline=(226, 232, 240, 255), width=2)
    
    # Scale fonts based on screen width w
    f_xs = max(7, int(w * 0.024))
    f_sm = max(8, int(w * 0.028))
    f_md = max(10, int(w * 0.036))
    f_lg = max(12, int(w * 0.045))
    
    font_xs = get_font('regular', f_xs)
    font_bold_xs = get_font('bold', f_xs)
    font_bold_sm = get_font('bold', f_sm)
    font_bold_md = get_font('bold', f_md)
    font_bold_lg = get_font('bold', f_lg)
    
    pad_x = max(10, int(w * 0.05))
    pad_y = max(10, int(h * 0.05))
    
    # Logo
    logo_sz = max(16, int(w * 0.06))
    draw_logo_icon(draw, x + pad_x, y + pad_y, logo_sz)
    draw.text((x + pad_x + logo_sz + 8, y + pad_y + int(logo_sz * 0.1)), "DG GESTÃO AUTOMOTIVA", fill=COLOR_DARK_BLUE, font=font_bold_sm)
    
    # Header Title
    draw.text((x + w - pad_x - max(110, int(w * 0.28)), y + pad_y), "ORDEM DE SERVIÇO", fill=(15, 23, 42, 255), font=font_bold_sm)
    draw.text((x + w - pad_x - max(110, int(w * 0.28)), y + pad_y + f_sm + 3), "Nº #1084 | Via PDF", fill=(100, 116, 139, 255), font=font_xs)
    
    # Line
    div_y = y + pad_y + logo_sz + max(10, int(h * 0.04))
    draw.line((x + pad_x, div_y, x + w - pad_x, div_y), fill=(203, 213, 225, 255), width=1)
    
    # Emissor and Cliente
    row_y = div_y + max(10, int(h * 0.03))
    line_spacing = f_xs + 3
    
    draw.text((x + pad_x, row_y), "EMISSOR: Danilo Gomes Auto Center", fill=(15, 23, 42, 255), font=font_bold_xs)
    draw.text((x + pad_x, row_y + line_spacing), "CNPJ: 12.345.678/0001-99", fill=(100, 116, 139, 255), font=font_xs)
    
    row2_y = row_y + line_spacing * 2 + max(8, int(h * 0.02))
    draw.text((x + pad_x, row2_y), "CLIENTE: Danilo dos Santos Gomes", fill=(15, 23, 42, 255), font=font_bold_xs)
    draw.text((x + pad_x, row2_y + line_spacing), "VEÍCULO: Honda Civic (BRA-2E19)", fill=(100, 116, 139, 255), font=font_xs)
    
    # Line 2
    div2_y = row2_y + line_spacing * 2 + max(8, int(h * 0.02))
    draw.line((x + pad_x, div2_y, x + w - pad_x, div2_y), fill=(203, 213, 225, 255), width=1)
    
    # Table of items
    table_y = div2_y + max(8, int(h * 0.02))
    table_h = f_xs + 6
    draw.rectangle((x + pad_x, table_y, x + w - pad_x, table_y + table_h), fill=(241, 245, 249, 255))
    draw.text((x + pad_x + 6, table_y + 3), "DESCRIÇÃO DO SERVIÇO / PEÇA", fill=(15, 23, 42, 255), font=font_bold_xs)
    draw.text((x + w - pad_x - max(60, int(w * 0.15)), table_y + 3), "TOTAL", fill=(15, 23, 42, 255), font=font_bold_xs)
    
    rows = [("Kit Pastilha Brembo", "R$ 280,00"), ("Par Discos Vent. Freio", "R$ 420,00"), ("Mão de Obra Sangria", "R$ 150,00")]
    curr_ty = table_y + table_h + 4
    for idx, (desc, val) in enumerate(rows):
        draw.text((x + pad_x + 6, curr_ty), f"0{idx+1} | {desc}", fill=(71, 85, 105, 255), font=font_xs)
        draw.text((x + w - pad_x - max(60, int(w * 0.15)), curr_ty), val, fill=(15, 23, 42, 255), font=font_xs)
        curr_ty += f_xs + 4
        draw.line((x + pad_x, curr_ty, x + w - pad_x, curr_ty), fill=(241, 245, 249, 255), width=1)
        curr_ty += 2
        
    # Total Box
    tot_y = curr_ty + max(8, int(h * 0.02))
    tot_w = max(120, int(w * 0.35))
    tot_h = f_xs * 2 + 10
    draw.rectangle((x + w - pad_x - tot_w, tot_y, x + w - pad_x, tot_y + tot_h), fill=COLOR_DARK_BLUE)
    draw.text((x + w - pad_x - tot_w + 8, tot_y + 4), "TOTAL GERAL", fill=COLOR_WHITE, font=font_xs)
    draw.text((x + w - pad_x - tot_w + 8, tot_y + 4 + f_xs + 2), "R$ 765,00", fill=COLOR_TEAL, font=font_bold_sm)
    
    draw.text((x + pad_x, tot_y + 4), "Forma de Pagamento: PIX à vista", fill=(71, 85, 105, 255), font=font_xs)
    draw.text((x + pad_x, tot_y + 4 + f_xs + 2), "Gerado por DG Gestão Automotiva", fill=(148, 163, 184, 255), font=font_xs)
    
    # Signature line
    sig_y = y + h - max(20, int(h * 0.08))
    if sig_y > tot_y + tot_h + 15:
        draw.line((x + pad_x * 2, sig_y, x + w - pad_x * 2, sig_y), fill=(203, 213, 225, 255), width=1)
        draw.text((x + pad_x * 2 + 10, sig_y + 4), "Assinatura do Cliente Autorizado", fill=(100, 116, 139, 255), font=font_xs)

# Screen 6: Cadastro de Clientes & Equipamentos
def draw_clientes_equipamentos_screen(img, x, y, w, h, is_mobile=False):
    draw = ImageDraw.Draw(img)
    # Background
    draw.rectangle((x, y, x + w, y + h), fill=(248, 250, 252, 255))
    
    if is_mobile:
        # Mobile header
        draw.rectangle((x, y, x + w, y + int(h * 0.12)), fill=(15, 23, 42, 255))
        draw.text((x + 10, y + 10), "Veículos & Clientes", fill=COLOR_WHITE, font=get_font('bold', 12))
        
        # Search mobile
        search_y = y + int(h * 0.15)
        draw_rounded_rect(draw, (x + 8, search_y, x + w - 8, search_y + 30), 4, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        draw.text((x + 16, search_y + 8), "Buscar placa (Ex: BRA-2E19)...", fill=(148, 163, 184, 255), font=get_font('regular', 8))
        
        # Card 1
        card_y = search_y + 38
        draw_rounded_rect(draw, (x + 8, card_y, x + w - 8, card_y + 110), 6, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        # License plate mercosul graphic
        draw_rounded_rect(draw, (x + 16, card_y + 10, x + 90, card_y + 34), 4, (15, 23, 42, 255))
        draw.rectangle((x + 16, card_y + 10, x + 90, card_y + 16), fill=(0, 51, 102, 255))
        draw.text((x + 20, card_y + 11), "BRASIL", fill=COLOR_WHITE, font=get_font('bold', 5))
        draw.text((x + 24, card_y + 18), "BRA-2E19", fill=COLOR_WHITE, font=get_font('bold', 10))
        
        draw.text((x + 16, card_y + 44), "Honda Civic 2.0 EXL (2020)", fill=(15, 23, 42, 255), font=get_font('bold', 9))
        draw.text((x + 16, card_y + 60), "Proprietário: Danilo S. Gomes", fill=(100, 116, 139, 255), font=get_font('regular', 8))
        draw.text((x + 16, card_y + 76), "WhatsApp: (73) 99986-8104", fill=(100, 116, 139, 255), font=get_font('regular', 8))
        
    else:
        # Sidebar
        side_w = int(w * 0.2)
        draw.rectangle((x, y, x + side_w, y + h), fill=(15, 23, 42, 255))
        draw_logo_icon(draw, x + 10, y + 10, 24)
        draw.text((x + 40, y + 15), "DG GESTÃO", fill=COLOR_WHITE, font=get_font('bold', 12))
        
        links = [("🏠 Painel", COLOR_WHITE), ("📋 Ordens", COLOR_WHITE), ("👥 Clientes", COLOR_ORANGE), ("🚜 Equipamentos", COLOR_WHITE), ("💰 Precificação", COLOR_WHITE), ("📊 Relatórios", COLOR_WHITE)]
        for idx, (label, color) in enumerate(links):
            ly = y + 50 + idx * 26
            if label.startswith("👥"):
                draw.rectangle((x + 4, ly - 4, x + side_w - 4, ly + 20), fill=(255, 102, 0, 30))
            draw.text((x + 14, ly), label, fill=color, font=get_font('bold', 10))
            
        # Header
        head_h = 32
        draw.rectangle((x + side_w, y, x + w, y + head_h), fill=COLOR_WHITE)
        draw.line((x + side_w, y + head_h, x + w, y + head_h), fill=COLOR_BORDER_SLATE, width=1)
        draw.text((x + side_w + 12, y + 10), "Cadastro de Clientes e Veículos (Equipamentos)", fill=(15, 23, 42, 255), font=get_font('bold', 11))
        
        content_x = x + side_w + 12
        content_y = y + head_h + 12
        content_w = w - side_w - 24
        
        # Search and Action Row
        search_h = 30
        draw_rounded_rect(draw, (content_x, content_y, content_x + int(content_w * 0.7), content_y + search_h), 6, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
        draw.text((content_x + 12, content_y + 8), "Pesquise por placa de veículo ou nome do cliente...", fill=(148, 163, 184, 255), font=get_font('regular', 8))
        
        draw_rounded_rect(draw, (content_x + int(content_w * 0.72), content_y, content_x + content_w, content_y + search_h), 6, COLOR_ORANGE)
        draw.text((content_x + int(content_w * 0.75), content_y + 8), "➕ CADASTRAR", fill=COLOR_WHITE, font=get_font('bold', 8))
        
        # Grid of equipment cards
        grid_y = content_y + search_h + 12
        card_w = (content_w - 12) // 2
        card_h = h - (grid_y - y) - 12
        
        if card_h > 30:
            # Card 1 (Honda Civic)
            draw_rounded_rect(draw, (content_x, grid_y, content_x + card_w, grid_y + card_h), 10, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
            
            # Mercosul plate
            px = content_x + 16
            py = grid_y + 14
            draw_rounded_rect(draw, (px, py, px + 80, py + 26), 4, (15, 23, 42, 255))
            draw.rectangle((px, py, px + 80, py + 15), fill=(0, 51, 102, 255))
            draw.text((px + 20, py + 8), "BRASIL", fill=COLOR_WHITE, font=get_font('bold', 5))
            draw.text((px + 22, py + 14), "BRA-2E19", fill=COLOR_WHITE, font=get_font('bold', 9))
            
            draw.text((content_x + 16, grid_y + 48), "Honda Civic 2.0 EXL (2020)", fill=(15, 23, 42, 255), font=get_font('bold', 10))
            draw.text((content_x + 16, grid_y + 64), "Proprietário: Danilo S. Gomes", fill=(71, 85, 105, 255), font=get_font('bold', 8))
            draw.text((content_x + 16, grid_y + 80), "Contato: (73) 99986-8104", fill=(100, 116, 139, 255), font=get_font('regular', 8))
            draw.text((content_x + 16, grid_y + 96), "Histórico: 4 Atendimentos realizados", fill=COLOR_GREEN, font=get_font('bold', 8))
            
            # Card 2 (Corolla)
            rx = content_x + card_w + 12
            draw_rounded_rect(draw, (rx, grid_y, rx + card_w, grid_y + card_h), 10, COLOR_WHITE, outline=COLOR_BORDER_SLATE)
            
            px2 = rx + 16
            draw_rounded_rect(draw, (px2, py, px2 + 80, py + 26), 4, (15, 23, 42, 255))
            draw.rectangle((px2, py, px2 + 80, py + 15), fill=(0, 51, 102, 255))
            draw.text((px2 + 20, py + 8), "BRASIL", fill=COLOR_WHITE, font=get_font('bold', 5))
            draw.text((px2 + 22, py + 14), "QOY-4A12", fill=COLOR_WHITE, font=get_font('bold', 9))
            
            draw.text((rx + 16, grid_y + 48), "Toyota Corolla XEI (2021)", fill=(15, 23, 42, 255), font=get_font('bold', 10))
            draw.text((rx + 16, grid_y + 64), "Proprietário: Clara Mendonça", fill=(71, 85, 105, 255), font=get_font('bold', 8))
            draw.text((rx + 16, grid_y + 80), "Contato: (11) 98124-5512", fill=(100, 116, 139, 255), font=get_font('regular', 8))
            draw.text((rx + 16, grid_y + 96), "Histórico: 1 Atendimento ativo", fill=(0, 51, 102, 255), font=get_font('bold', 8))

# Dispatcher
def draw_app_screen_by_type(img, screen_type, x, y, w, h, force_mobile=False):
    is_mobile = force_mobile or (w < 250)
    if screen_type == 'dashboard':
        draw_dashboard_screen(img, x, y, w, h, is_mobile)
    elif screen_type == 'os_digital':
        draw_os_digital_screen(img, x, y, w, h, is_mobile)
    elif screen_type == 'precificacao':
        draw_precificacao_screen(img, x, y, w, h, is_mobile)
    elif screen_type == 'relatorios':
        draw_relatorios_screen(img, x, y, w, h, is_mobile)
    elif screen_type == 'pdf_os':
        draw_pdf_os_screen(img, x, y, w, h, is_mobile)
    elif screen_type == 'cadastro_clientes':
        draw_clientes_equipamentos_screen(img, x, y, w, h, is_mobile)
    else:
        # Fallback to Dashboard
        draw_dashboard_screen(img, x, y, w, h, is_mobile)

# -------------------------------------------------------------
# HIGH RESOLUTION DYNAMIC DEVICE CHASSIS DRAWING
# -------------------------------------------------------------

def draw_laptop_device(img, x, y, w, h, screen_type):
    # Laptop screen chassis
    draw = ImageDraw.Draw(img)
    bezel = (30, 41, 59, 255) # Deep metallic bezel
    draw_rounded_rect(draw, (x, y, x + w, y + h), int(w * 0.02), bezel)
    
    # Webcam
    draw.ellipse((x + w//2 - 2, y + 4, x + w//2 + 2, y + 8), fill=(71, 85, 105, 255))
    
    # Inside screen boundary
    scr_x = x + int(w * 0.015)
    scr_y = y + int(h * 0.04)
    scr_w = w - int(w * 0.03)
    scr_h = h - int(h * 0.1)
    draw_app_screen_by_type(img, screen_type, scr_x, scr_y, scr_w, scr_h)
    
    # Metallic keyboard base
    draw = ImageDraw.Draw(img)
    base_y = y + h - 2
    ext = int(w * 0.08)
    draw_rounded_rect(draw, (x - ext, base_y, x + w + ext, base_y + int(h * 0.05)), int(h * 0.02), (203, 213, 225, 255))
    # Base bottom shadow reflection
    draw.rectangle((x - ext, base_y + int(h * 0.035), x + w + ext, base_y + int(h * 0.05)), fill=(148, 163, 184, 255))
    # Display hinge or finger indent
    indent_w = int(w * 0.12)
    draw_rounded_rect(draw, (x + w//2 - indent_w, base_y + 1, x + w//2 + indent_w, base_y + 4), 2, (100, 116, 139, 255))

def draw_tablet_device(img, x, y, w, h, screen_type):
    draw = ImageDraw.Draw(img)
    bezel_color = (15, 23, 42, 255) # Sleek tablet bezel
    draw_rounded_rect(draw, (x, y, x + w, y + h), int(w * 0.06), bezel_color)
    
    # Front webcam
    draw.ellipse((x + w//2 - 3, y + int(h * 0.02), x + w//2 + 3, y + int(h * 0.032)), fill=(51, 65, 85, 255))
    
    # Screen boundaries
    scr_x = x + int(w * 0.04)
    scr_y = y + int(h * 0.045)
    scr_w = w - int(w * 0.08)
    scr_h = h - int(h * 0.08)
    draw_app_screen_by_type(img, screen_type, scr_x, scr_y, scr_w, scr_h)
    
    # Home status indicator swipe bar
    draw = ImageDraw.Draw(img)
    draw_rounded_rect(draw, (x + w//2 - int(w*0.12), y + h - int(h*0.025), x + w//2 + int(w*0.12), y + h - int(h*0.02)), 2, (100, 116, 139, 255))

def draw_smartphone_device(img, x, y, w, h, screen_type):
    draw = ImageDraw.Draw(img)
    bezel_color = (15, 23, 42, 255) # Curved phone chassis
    draw_rounded_rect(draw, (x, y, x + w, y + h), int(w * 0.14), bezel_color)
    
    # Inner viewport screen
    scr_x = x + int(w * 0.04)
    scr_y = y + int(h * 0.02)
    scr_w = w - int(w * 0.08)
    scr_h = h - int(h * 0.04)
    draw_rounded_rect(draw, (scr_x, scr_y, scr_x + scr_w, scr_y + scr_h), int(w * 0.1), (2, 6, 23, 255))
    
    # Dynamic Island / Notch
    notch_w = int(w * 0.32)
    notch_h = int(h * 0.035)
    draw_rounded_rect(draw, (x + (w - notch_w)//2, y + int(h * 0.038), x + (w + notch_w)//2, y + int(h * 0.07)), int(notch_h * 0.4), (2, 6, 23, 255))
    
    # App screen inside view (shifted for Dynamic Island)
    app_y = scr_y + int(h * 0.052)
    app_h = scr_h - int(h * 0.062)
    draw_app_screen_by_type(img, screen_type, scr_x, app_y, scr_w, app_h, force_mobile=True)
    
    # Home swipe indicator line at bottom
    draw = ImageDraw.Draw(img)
    draw_rounded_rect(draw, (x + w//2 - int(w * 0.16), y + h - int(h * 0.025), x + w//2 + int(w * 0.16), y + h - int(h * 0.02)), 1, (100, 116, 139, 255))


# -------------------------------------------------------------
# 1. GENERATING 10 INSTAGRAM POSTS (1080x1350)
# -------------------------------------------------------------
# Marketing content for 10 Instagram posts
post_content = {
    1: {
        "badge": "OPERAÇÃO SEM PAPEL", "title": "Pare de Perder Tempo\nCom Papel na Oficina",
        "desc": "Substitua ordens de serviço físicas por\numa operação 100% digital e ágil.",
        "bullets": ["✓ OS enviada via WhatsApp", "✓ Checklist com fotos reais", "✓ Menos burocracia, mais lucro"]
    },
    2: {
        "badge": "ORGANIZAÇÃO GERAL", "title": "Sua Oficina Organizada\nEm Poucos Cliques",
        "desc": "Controle fluxo de pátio, comissões de\nmecânicos e status em tempo real.",
        "bullets": ["✓ Histórico por placa de carro", "✓ Painel visual inteligente", "✓ Todo o time em sincronia"]
    },
    3: {
        "badge": "HISTÓRICO VITALÍCIO", "title": "Histórico Completo\nDos Equipamentos",
        "desc": "Tenha a ficha completa de cada carro\npesquisando apenas a placa no celular.",
        "bullets": ["✓ Prontuário de manutenções", "✓ Histórico de peças trocadas", "✓ Valorize o serviço prestado"]
    },
    4: {
        "badge": "LUCRO GARANTIDO", "title": "Precificação Inteligente\nE Sem Prejuízos",
        "desc": "Calcule a margem exata e Markup ideal\ncom base nos custos reais de autopeças.",
        "bullets": ["✓ Impeça prejuízos ocultos", "✓ Simule margens líquidas", "✓ Margem de lucro de verdade"]
    },
    5: {
        "badge": "FINANCEIRO ATIVO", "title": "Controle Financeiro\nDa Manutenção",
        "desc": "Acompanhe contas a pagar, faturamento\nlíquido e metas semanais de caixa.",
        "bullets": ["✓ Relatórios automáticos", "✓ Ticket médio por veículo", "✓ Fluxo de caixa descomplicado"]
    },
    6: {
        "badge": "PRODUTO PREMIUM", "title": "Muito Mais Que Uma\nOrdem de Serviço",
        "desc": "Um sistema completo de vendas,\nprecificação e acompanhamento de pátio.",
        "bullets": ["✓ Checklist fotográfico real", "✓ Geração automática de PDF", "✓ Comunicação via WhatsApp"]
    },
    7: {
        "badge": "OPERAÇÃO OFFLINE", "title": "Trabalhe Sem Limites\nE Sem Internet",
        "desc": "Nossa tecnologia PWA permite registrar\nordens de serviço sem internet.",
        "bullets": ["✓ Armazenamento local seguro", "✓ Sincronização automática", "✓ Zero quedas de sistema"]
    },
    8: {
        "badge": "ORÇAMENTO WHATSAPP", "title": "Orçamentos Rápidos\nVia WhatsApp",
        "desc": "Envie propostas completas de serviços\ncom um clique para seu cliente aprovar.",
        "bullets": ["✓ Envio instantâneo", "✓ Aprovação rápida de serviços", "✓ Maior conversão de vendas"]
    },
    9: {
        "badge": "SISTEMA INTEGRADO", "title": "Sua Oficina 100%\nSob Controle",
        "desc": "De ponta a ponta: do checklist de entrada\nno pátio até o faturamento consolidado.",
        "bullets": ["✓ Gestão profissional", "✓ Menos erros operacionais", "✓ Maior produtividade do pátio"]
    },
    10: {
        "badge": "DESEMPENHO DO PÁTIO", "title": "Aumente o Ticket Médio\nDa Sua Oficina Mecânica",
        "desc": "Com propostas transparentes e fotos dos\nelevadores, os clientes aprovam mais.",
        "bullets": ["✓ Conquiste confiança real", "✓ Mostre o problema por foto", "✓ Venda serviços complementares"]
    }
}

print("Generating 10 Instagram Posts...")
for idx in range(1, 11):
    img = Image.new("RGBA", (1080, 1350), COLOR_DARK_GRAY)
    draw = ImageDraw.Draw(img)
    
    # Background layout
    bg_colors = [COLOR_DARK_BLUE, COLOR_MID_BLUE] if idx % 2 == 0 else [COLOR_MID_BLUE, COLOR_DARK_GRAY]
    draw_gradient_background(img, bg_colors)
    
    # Aurora glows
    draw_aurora_glow(img, [
        {"cx": 900, "cy": 300, "r": 500, "color": COLOR_ORANGE},
        {"cx": 100, "cy": 1000, "r": 400, "color": COLOR_TEAL}
    ])
    
    # Header Branding
    draw_logo_icon(draw, 80, 80, 64)
    draw.text((160, 96), "DG GESTÃO AUTOMOTIVA", fill=COLOR_WHITE, font=get_font('bold', 18))
    draw.text((160, 122), "SISTEMA DE GESTÃO INTELIGENTE", fill=COLOR_TEAL, font=get_font('bold', 12))
    
    # Content
    data = post_content[idx]
    # Topic Badge
    draw_rounded_rect(draw, (80, 180, 380, 215), 6, (255, 102, 0, 40), outline=COLOR_ORANGE, width=1)
    draw.text((95, 188), data["badge"], fill=COLOR_ORANGE, font=get_font('bold', 11))
    
    # Headings
    draw_multiline_text(draw, 80, 240, data["title"], get_font('bold', 34), COLOR_WHITE, spacing=8)
    draw_multiline_text(draw, 80, 360, data["desc"], get_font('regular', 16), (203, 213, 225, 255), spacing=6)
    
    # Checklist
    for c, bullet in enumerate(data["bullets"]):
        cy = 480 + c * 45
        draw.ellipse((80, cy, 96, cy+16), fill=COLOR_ORANGE)
        draw.line((84, cy+8, 88, cy+12), fill=COLOR_WHITE, width=2)
        draw.line((88, cy+12, 92, cy+4), fill=COLOR_WHITE, width=2)
        draw.text((110, cy), bullet, fill=COLOR_WHITE, font=get_font('bold', 14))
        
    # Render Mockup devices (Make them massive, occupying ~60% of the artwork height/width)
    post_screens = {
        1: 'os_digital',
        2: 'dashboard',
        3: 'cadastro_clientes',
        4: 'precificacao',
        5: 'relatorios',
        6: 'pdf_os',
        7: 'dashboard',
        8: 'os_digital',
        9: 'dashboard',
        10: 'relatorios'
    }
    chosen_screen = post_screens[idx]
    
    if idx % 2 == 0:
        draw_tablet_device(img, 530, 220, 480, 680, chosen_screen)
    else:
        draw_smartphone_device(img, 560, 180, 440, 840, chosen_screen)
        
    # Footer
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 1280, 1080, 1350), fill=(15, 23, 42, 180))
    draw.text((80, 1300), "Acesse dggestao.com.br", fill=(203, 213, 225, 255), font=get_font('regular', 14))
    draw_rounded_rect(draw, (680, 1296, 1000, 1334), 8, COLOR_ORANGE)
    draw.text((710, 1306), "SOLICITAR DEMONSTRAÇÃO", fill=COLOR_WHITE, font=get_font('bold', 12))
    
    save_image(img, f'instagram_post_{idx}.png')

# -------------------------------------------------------------
# 2. GENERATING 5 STORIES (1080x1920)
# -------------------------------------------------------------
print("Generating 5 Stories...")
for idx in range(1, 6):
    img = Image.new("RGBA", (1080, 1920), COLOR_DARK_GRAY)
    draw = ImageDraw.Draw(img)
    draw_gradient_background(img, [COLOR_DARK_BLUE, COLOR_MID_BLUE, COLOR_DARK_GRAY])
    
    draw_aurora_glow(img, [
        {"cx": 540, "cy": 960, "r": 600, "color": COLOR_ORANGE},
        {"cx": 900, "cy": 1600, "r": 400, "color": COLOR_TEAL}
    ])
    
    # Top Logo
    draw_logo_icon(draw, 490, 100, 100)
    draw.text((360, 210), "DG GESTÃO AUTOMOTIVA", fill=COLOR_WHITE, font=get_font('bold', 24))
    
    # Center Device (Giant smartphone mockup taking ~60% height of story)
    screen_choices = ['dashboard', 'os_digital', 'precificacao', 'relatorios', 'pdf_os']
    chosen_screen = screen_choices[idx-1]
    draw_smartphone_device(img, 240, 400, 600, 1100, chosen_screen)
    
    # Captions
    draw = ImageDraw.Draw(img)
    draw_rounded_rect(draw, (140, 290, 940, 370), 10, (255, 102, 0, 40), outline=COLOR_ORANGE, width=2)
    story_titles = [
        "CONTROLE TOTAL DA SUA OFICINA", "GERENCIE SUAS ORDENS DE SERVIÇO",
        "PRECIFIQUE COM MARGEM GARANTIDA", "VEJA RELATÓRIOS DO SEU CELULAR",
        "IMPRIMA E ENVIE SUAS OS EM PDF"
    ]
    draw.text((220, 312), story_titles[idx-1], fill=COLOR_WHITE, font=get_font('bold', 19))
    
    # Slogan bottom
    draw.text((280, 1550), "Orce Rápido. Venda Melhor. 100% Offline.", fill=COLOR_TEAL, font=get_font('bold', 18))
    
    # Call to action
    draw_rounded_rect(draw, (240, 1720, 840, 1820), 20, COLOR_ORANGE)
    draw.text((360, 1752), "SOLICITE UMA DEMONSTRAÇÃO", fill=COLOR_WHITE, font=get_font('bold', 18))
    
    save_image(img, f'story_{idx}.png')

# -------------------------------------------------------------
# 3. GENERATING 3 SITE BANNERS (1200x400)
# -------------------------------------------------------------
print("Generating 3 Site Banners...")
for idx in range(1, 4):
    img = Image.new("RGBA", (1200, 400), COLOR_DARK_GRAY)
    draw = ImageDraw.Draw(img)
    draw_gradient_background(img, [COLOR_DARK_BLUE, COLOR_MID_BLUE])
    
    draw_aurora_glow(img, [
        {"cx": 950, "cy": 200, "r": 300, "color": COLOR_ORANGE},
        {"cx": 100, "cy": 300, "r": 200, "color": COLOR_TEAL}
    ])
    
    draw_logo_icon(draw, 60, 50, 48)
    draw.text((120, 60), "DG GESTÃO AUTOMOTIVA", fill=COLOR_WHITE, font=get_font('bold', 20))
    
    banner_titles = [
        "O Sistema Definitivo de Gestão para Oficinas Mecânicas",
        "Central de Precificação: Markup Ideal e Lucros Reais",
        "Gestão Integrada com WhatsApp e Faturamento Completo"
    ]
    draw.text((60, 130), banner_titles[idx-1], fill=COLOR_WHITE, font=get_font('bold', 26))
    draw.text((60, 180), "Funciona 100% Offline | Checklist de Fotos | Sincronização em Nuvem", fill=COLOR_TEAL, font=get_font('bold', 14))
    
    # CTA Buttons
    draw_rounded_rect(draw, (60, 260, 300, 310), 8, COLOR_ORANGE)
    draw.text((90, 276), "ASSINAR PLANO MENSAL", fill=COLOR_WHITE, font=get_font('bold', 12))
    
    draw_rounded_rect(draw, (320, 260, 560, 310), 8, COLOR_DARK_BLUE, outline=COLOR_WHITE)
    draw.text((360, 276), "VER DETALHES DO PLANO ANUAL", fill=COLOR_WHITE, font=get_font('bold', 12))
    
    # Laptop
    screen_choices = ['dashboard', 'precificacao', 'relatorios']
    draw_laptop_device(img, 720, 60, 420, 260, screen_choices[idx-1])
    
    save_image(img, f'banner_site_{idx}.png')

# -------------------------------------------------------------
# 4. GENERATING 3 WHATSAPP BANNERS (1080x1080)
# -------------------------------------------------------------
print("Generating 3 WhatsApp Banners...")
for idx in range(1, 4):
    img = Image.new("RGBA", (1080, 1080), COLOR_DARK_GRAY)
    draw = ImageDraw.Draw(img)
    draw_gradient_background(img, [COLOR_DARK_BLUE, COLOR_BORDER_SLATE])
    
    draw_aurora_glow(img, [
        {"cx": 900, "cy": 900, "r": 400, "color": COLOR_ORANGE},
        {"cx": 100, "cy": 100, "r": 300, "color": COLOR_TEAL}
    ])
    
    draw_logo_icon(draw, 80, 80, 80)
    draw.text((180, 92), "DG GESTÃO AUTOMOTIVA", fill=COLOR_WHITE, font=get_font('bold', 24))
    draw.text((180, 126), "Suporte e Demonstração via WhatsApp: (73) 99986-8104", fill=COLOR_TEAL, font=get_font('bold', 14))
    
    wa_titles = [
        "Orçamentos Digitais pelo Celular do Cliente",
        "Central de Precificação: Garanta Seus Lucros",
        "Dashboard Completo com Multi-usuários e Fotos"
    ]
    draw.text((80, 220), wa_titles[idx-1], fill=COLOR_WHITE, font=get_font('bold', 32))
    draw.text((80, 280), "Adote o sistema definitivo. Planos a partir de R$ 50,00 mensais.", fill=(203, 213, 225, 255), font=get_font('regular', 18))
    
    draw_rounded_rect(draw, (80, 360, 380, 410), 10, COLOR_ORANGE)
    draw.text((120, 376), "FALAR CONOSCO VIA WHATSAPP", fill=COLOR_WHITE, font=get_font('bold', 14))
    
    # Tablet and Smartphone stacked
    screen_choices = ['os_digital', 'precificacao', 'relatorios']
    draw_tablet_device(img, 660, 360, 340, 480, screen_choices[idx-1])
    draw_smartphone_device(img, 460, 460, 220, 420, 'dashboard')
    
    save_image(img, f'banner_whatsapp_{idx}.png')

# -------------------------------------------------------------
# 5. GENERATING 6 STANDALONE DEVICE MOCKUPS
#    WITHOUT MASSIVE BORDERS AND WITH TRANSPARENT BACKGROUND
# -------------------------------------------------------------
print("Generating standalone Device Mockups with transparent backgrounds and ~90% scale...")

# Notebook Mockup (Laptop width 1100 inside 1200 width image = 91% area)
img_notebook = Image.new("RGBA", (1200, 800), (0, 0, 0, 0))
# Ambient shadow under device
draw_nb = ImageDraw.Draw(img_notebook)
draw_nb.ellipse((40, 710, 1160, 760), fill=(0, 0, 0, 60))
# Laptop device
draw_laptop_device(img_notebook, 100, 100, 1000, 620, 'dashboard')
save_image(img_notebook, 'mockup_notebook.png')

# Tablet Mockup (Tablet width 800 inside 1000 width image = 80%)
img_tablet = Image.new("RGBA", (1000, 1000), (0, 0, 0, 0))
draw_tab = ImageDraw.Draw(img_tablet)
draw_tab.ellipse((140, 930, 860, 970), fill=(0, 0, 0, 70))
# Tablet device with Central de Precificação
draw_tablet_device(img_tablet, 150, 50, 700, 900, 'precificacao')
save_image(img_tablet, 'mockup_tablet.png')

# Smartphone 1 Mockup (Phone width 700 inside 800 width image = 87.5%)
img_phone1 = Image.new("RGBA", (800, 1000), (0, 0, 0, 0))
draw_ph1 = ImageDraw.Draw(img_phone1)
draw_ph1.ellipse((100, 950, 700, 985), fill=(0, 0, 0, 80))
# Phone device with Ordem de Serviço step form
draw_smartphone_device(img_phone1, 100, 40, 600, 920, 'os_digital')
save_image(img_phone1, 'mockup_smartphone_1.png')

# Smartphone 2 Mockup (Phone width 700 inside 800 width image = 87.5%)
img_phone2 = Image.new("RGBA", (800, 1000), (0, 0, 0, 0))
draw_ph2 = ImageDraw.Draw(img_phone2)
draw_ph2.ellipse((100, 950, 700, 985), fill=(0, 0, 0, 80))
# Phone device with Cadastro de Clientes/Equipamentos
draw_smartphone_device(img_phone2, 100, 40, 600, 920, 'cadastro_clientes')
save_image(img_phone2, 'mockup_smartphone_2.png')

# PDF Document OS Mockup (Perfect floating document page)
img_pdf_doc = Image.new("RGBA", (800, 1000), (0, 0, 0, 0))
draw_p_doc = ImageDraw.Draw(img_pdf_doc)
draw_p_doc.ellipse((80, 940, 720, 975), fill=(0, 0, 0, 45))
# Render PDF OS screen directly
draw_pdf_os_screen(img_pdf_doc, 100, 40, 600, 880)
save_image(img_pdf_doc, 'mockup_pdf_os.png')

# Desktop Workspace Mockup (Desktop with Relatório Inteligente)
img_desktop = Image.new("RGBA", (1200, 800), (0, 0, 0, 0))
draw_desk = ImageDraw.Draw(img_desktop)
# Desktop shadow
draw_desk.ellipse((100, 750, 1100, 785), fill=(0, 0, 0, 75))
# Monitor bezel
draw_rounded_rect(draw_desk, (100, 60, 1100, 660), 20, (15, 23, 42, 255))
# Monitor inner screen
draw_app_screen_by_type(img_desktop, 'relatorios', 120, 80, 960, 550)
# Monitor stand and base
draw_rounded_rect(draw_desk, (560, 660, 640, 740), 4, (203, 213, 225, 255))
draw_rounded_rect(draw_desk, (480, 740, 720, 760), 8, (148, 163, 184, 255))
save_image(img_desktop, 'mockup_desktop.png')

print("All visual marketing assets created successfully inside marketing/assets and public/marketing/assets!")
