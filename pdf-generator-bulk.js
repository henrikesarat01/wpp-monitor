/**
 * Gerador de PDF para Exportação em Massa
 * Layout compacto para múltiplas conversas
 */

export async function generateBulkPDF(doc, exportData) {
  const { startDate, endDate, totalConversations, conversations, exportDate } =
    exportData;

  // Cores
  const colors = {
    primary: "#1E40AF",
    secondary: "#059669",
    accent: "#D97706",
    text: "#111827",
    textLight: "#6B7280",
    bg: "#F9FAFB",
  };

  const margin = 40;
  const pageHeight = doc.page.height;
  const footerSpace = 40;
  let y = 60;
  let pageNumber = 1;

  // Função para verificar quebra de página
  const checkPageBreak = (neededSpace) => {
    if (y + neededSpace > pageHeight - footerSpace) {
      addFooter(pageNumber);
      doc.addPage();
      pageNumber++;
      addHeader();
      y = 70;
    }
  };

  // Função para adicionar cabeçalho
  const addHeader = () => {
    doc.rect(0, 0, doc.page.width, 50).fill(colors.primary);
    doc
      .fontSize(20)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("IARA", margin, 15);
    doc
      .fontSize(9)
      .fillColor("#FFFFFF")
      .font("Helvetica")
      .text("Exportacao em Massa", margin + 80, 22);
  };

  // Função para adicionar rodapé
  const addFooter = (page) => {
    const footerY = pageHeight - 25;
    doc
      .fontSize(7)
      .fillColor(colors.textLight)
      .text(
        `Gerado por IARA - ${exportDate} | Pagina ${page}`,
        margin,
        footerY,
        {
          align: "center",
          width: doc.page.width - margin * 2,
        }
      );
  };

  // === PÁGINA DE CAPA ===
  addHeader();

  y = 150;

  doc
    .fontSize(24)
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .text("RELATORIO DE CONVERSAS", margin, y, {
      align: "center",
      width: doc.page.width - margin * 2,
    });

  y += 50;

  doc
    .fontSize(14)
    .fillColor(colors.text)
    .font("Helvetica")
    .text(`Periodo: ${startDate} ate ${endDate}`, margin, y, {
      align: "center",
      width: doc.page.width - margin * 2,
    });

  y += 40;

  doc
    .fontSize(16)
    .fillColor(colors.secondary)
    .font("Helvetica-Bold")
    .text(`${totalConversations} Conversas`, margin, y, {
      align: "center",
      width: doc.page.width - margin * 2,
    });

  addFooter(pageNumber);

  // === PÁGINAS DE CONVERSAS ===
  // Começar nova página após a capa
  doc.addPage();
  pageNumber++;
  addHeader();
  y = 70;

  conversations.forEach((conv, index) => {
    // Verificar se precisa de nova página (espaço mínimo para cabeçalho da conversa)
    checkPageBreak(100);

    // Separador entre conversas (exceto a primeira)
    if (index > 0) {
      y += 10;
      doc
        .moveTo(margin, y)
        .lineTo(doc.page.width - margin, y)
        .strokeColor("#E5E7EB")
        .lineWidth(1)
        .stroke();
      y += 10;
    }

    // Número da conversa
    doc
      .fontSize(10)
      .fillColor(colors.textLight)
      .font("Helvetica")
      .text(`Conversa ${index + 1} de ${totalConversations}`, margin, y);
    y += 15;

    // Nome/Número do contato
    doc
      .fontSize(16)
      .fillColor(colors.primary)
      .font("Helvetica-Bold")
      .text(conv.contactName || conv.contactNumber, margin, y);
    y += 15;

    doc
      .fontSize(10)
      .fillColor(colors.textLight)
      .font("Helvetica")
      .text(conv.contactNumber, margin, y);
    y += 20;

    // === RESUMO ===
    checkPageBreak(80);
    doc.rect(margin, y, doc.page.width - margin * 2, 25).fill(colors.primary);
    doc
      .fontSize(12)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("RESUMO", margin + 10, y + 6);
    y += 35;

    // Cards de métricas
    const cardWidth = (doc.page.width - margin * 2 - 20) / 3;

    // Sentimento
    const sentimentColors = {
      positivo: "#10B981",
      positive: "#10B981",
      neutro: "#D97706",
      neutral: "#D97706",
      negativo: "#DC2626",
      negative: "#DC2626",
    };
    const sentimentColor =
      sentimentColors[conv.summary.sentiment?.toLowerCase()] ||
      colors.secondary;

    doc
      .roundedRect(margin, y, cardWidth, 50, 5)
      .fill("#FFFFFF")
      .stroke("#E5E7EB");
    doc.rect(margin, y, cardWidth, 3).fill(sentimentColor);
    doc
      .fontSize(8)
      .fillColor(colors.textLight)
      .font("Helvetica")
      .text("Sentimento", margin + 8, y + 12);
    doc
      .fontSize(14)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text(conv.summary.sentiment || "N/A", margin + 8, y + 28);

    // Mensagens
    doc
      .roundedRect(margin + cardWidth + 10, y, cardWidth, 50, 5)
      .fill("#FFFFFF")
      .stroke("#E5E7EB");
    doc.rect(margin + cardWidth + 10, y, cardWidth, 3).fill(colors.primary);
    doc
      .fontSize(8)
      .fillColor(colors.textLight)
      .font("Helvetica")
      .text("Mensagens", margin + cardWidth + 18, y + 12);
    doc
      .fontSize(14)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text(
        String(conv.analysis.totalMessages || 0),
        margin + cardWidth + 18,
        y + 28
      );

    // Engajamento
    doc
      .roundedRect(margin + cardWidth * 2 + 20, y, cardWidth, 50, 5)
      .fill("#FFFFFF")
      .stroke("#E5E7EB");
    doc
      .rect(margin + cardWidth * 2 + 20, y, cardWidth, 3)
      .fill(colors.secondary);
    doc
      .fontSize(8)
      .fillColor(colors.textLight)
      .font("Helvetica")
      .text("Engajamento", margin + cardWidth * 2 + 28, y + 12);
    doc
      .fontSize(14)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text(
        conv.analysis.engagementRate
          ? `${conv.analysis.engagementRate}%`
          : "N/A",
        margin + cardWidth * 2 + 28,
        y + 28
      );

    y += 55;

    // Texto do resumo
    checkPageBreak(40);
    doc
      .fontSize(9)
      .fillColor(colors.text)
      .font("Helvetica")
      .text(conv.summary.summary || "Sem resumo disponivel", margin, y, {
        width: doc.page.width - margin * 2,
        align: "justify",
      });
    y += 35;

    // Tópicos (limitado a 3)
    if (conv.summary.keyTopics && conv.summary.keyTopics.length > 0) {
      checkPageBreak(50);
      doc
        .fontSize(10)
        .fillColor(colors.text)
        .font("Helvetica-Bold")
        .text("Principais Topicos:", margin, y);
      y += 15;

      conv.summary.keyTopics.slice(0, 3).forEach((topic) => {
        checkPageBreak(15);
        doc.fontSize(8).fillColor(colors.text).font("Helvetica");
        doc.circle(margin + 4, y + 3, 1.5).fill(colors.primary);
        doc.text(topic, margin + 12, y, {
          width: doc.page.width - margin * 2 - 12,
        });
        y += 13;
      });
      y += 5;
    }

    // === INTELIGÊNCIA COMERCIAL ===
    checkPageBreak(90);
    doc.rect(margin, y, doc.page.width - margin * 2, 25).fill(colors.secondary);
    doc
      .fontSize(12)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("INTELIGENCIA COMERCIAL", margin + 10, y + 6);
    y += 35;

    // Box de info
    const boxHeight = 75;
    doc
      .roundedRect(margin, y, doc.page.width - margin * 2, boxHeight, 5)
      .fill(colors.bg);

    let boxY = y + 10;
    doc
      .fontSize(8)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Interesse: ", margin + 12, boxY, { continued: true });
    doc.font("Helvetica").text(conv.leadInfo.interestLevel || "N/A");
    boxY += 13;

    doc
      .font("Helvetica-Bold")
      .text("Urgencia: ", margin + 12, boxY, { continued: true });
    doc.font("Helvetica").text(conv.leadInfo.urgencyLevel || "N/A");
    boxY += 13;

    doc
      .font("Helvetica-Bold")
      .text("Estagio: ", margin + 12, boxY, { continued: true });
    doc.font("Helvetica").text(conv.leadInfo.stage || "N/A");
    boxY += 13;

    if (conv.leadInfo.conversionProbability) {
      doc
        .font("Helvetica-Bold")
        .text("Conversao: ", margin + 12, boxY, { continued: true });
      doc.font("Helvetica").text(`${conv.leadInfo.conversionProbability}%`);
    }

    y += boxHeight + 15;

    // Produtos (limitado a 3)
    const products = conv.leadInfo.products || [];
    if (products.length > 0) {
      checkPageBreak(60);
      doc
        .fontSize(9)
        .fillColor(colors.text)
        .font("Helvetica-Bold")
        .text("Produtos:", margin, y);
      y += 13;

      products.slice(0, 3).forEach((product) => {
        checkPageBreak(13);
        doc.fontSize(8).fillColor(colors.text).font("Helvetica");
        doc.circle(margin + 4, y + 3, 1.5).fill(colors.secondary);
        doc.text(product, margin + 12, y, {
          width: doc.page.width - margin * 2 - 12,
        });
        y += 13;
      });
      y += 5;
    }

    // Valores
    if (conv.leadInfo.budget || conv.leadInfo.totalValue) {
      checkPageBreak(30);
      if (conv.leadInfo.budget) {
        doc
          .fontSize(8)
          .fillColor(colors.text)
          .font("Helvetica-Bold")
          .text("Orcamento: ", margin, y, { continued: true });
        doc.font("Helvetica").text(conv.leadInfo.budget);
        y += 13;
      }
      if (conv.leadInfo.totalValue) {
        doc
          .font("Helvetica-Bold")
          .text("Valor: ", margin, y, { continued: true });
        doc.font("Helvetica").text(conv.leadInfo.totalValue);
        y += 13;
      }
      y += 5;
    }

    // Objeções (limitado a 2)
    const objections = conv.leadInfo.objections || [];
    if (objections.length > 0) {
      checkPageBreak(40);
      doc
        .fontSize(9)
        .fillColor(colors.text)
        .font("Helvetica-Bold")
        .text("Objecoes:", margin, y);
      y += 13;

      objections.slice(0, 2).forEach((obj) => {
        checkPageBreak(13);
        doc.fontSize(8).fillColor(colors.text).font("Helvetica");
        doc.circle(margin + 4, y + 3, 1.5).fill("#DC2626");
        doc.text(obj, margin + 12, y, {
          width: doc.page.width - margin * 2 - 12,
        });
        y += 13;
      });
    }

    y += 10; // Espaço após cada conversa
  });

  // Adicionar rodapé final
  addFooter(pageNumber);

  // NÃO chamar doc.end() aqui
}
