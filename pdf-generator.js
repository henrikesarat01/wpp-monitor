/**
 * Gerador de PDF Profissional - Versão Compacta
 * Layout limpo em 1-2 páginas máximo
 */

export async function generateProfessionalPDF(doc, exportData) {
  const {
    contactName,
    contactNumber,
    exportDate,
    summary,
    leadInfo,
    analysis,
  } = exportData;

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

  // Função para verificar se precisa de nova página
  const checkPageBreak = (neededSpace) => {
    if (y + neededSpace > pageHeight - footerSpace) {
      doc.addPage();
      // Re-adicionar cabeçalho na nova página
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
        .text("Análise de Conversa", margin + 80, 22);
      y = 70;
    }
  };

  // === CABEÇALHO ===
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
    .text("Análise de Conversa", margin + 80, 22);

  y = 70;

  // === INFORMAÇÕES DO CONTATO ===
  doc
    .fontSize(16)
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .text("Relatório de Análise", margin, y);
  y += 25;

  doc
    .fontSize(11)
    .fillColor(colors.text)
    .font("Helvetica-Bold")
    .text("Contato: ", margin, y, { continued: true });
  doc.font("Helvetica").text(contactName || contactNumber);
  y += 15;

  doc.font("Helvetica-Bold").text("Telefone: ", margin, y, { continued: true });
  doc.font("Helvetica").text(contactNumber);
  y += 15;

  doc.font("Helvetica-Bold").text("Data: ", margin, y, { continued: true });
  doc.font("Helvetica").text(exportDate);
  y += 30;

  // === SEÇÃO 1: RESUMO ===
  checkPageBreak(200);
  doc.rect(margin, y, doc.page.width - margin * 2, 30).fill(colors.primary);
  doc
    .fontSize(14)
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .text("RESUMO DA CONVERSA", margin + 10, y + 8);
  y += 45;

  // Cards de métricas em linha
  const cardWidth = (doc.page.width - margin * 2 - 20) / 3;
  const sentimentColors = {
    positivo: "#10B981",
    positive: "#10B981",
    neutro: "#D97706",
    neutral: "#D97706",
    negativo: "#DC2626",
    negative: "#DC2626",
  };
  const sentimentColor =
    sentimentColors[summary.sentiment?.toLowerCase()] || colors.secondary;

  // Card 1: Sentimento
  doc
    .roundedRect(margin, y, cardWidth, 60, 5)
    .fill("#FFFFFF")
    .stroke("#E5E7EB");
  doc.rect(margin, y, cardWidth, 4).fill(sentimentColor);
  doc
    .fontSize(9)
    .fillColor(colors.textLight)
    .font("Helvetica")
    .text("Sentimento", margin + 10, y + 15);
  doc
    .fontSize(16)
    .fillColor(colors.text)
    .font("Helvetica-Bold")
    .text(summary.sentiment || "N/A", margin + 10, y + 32);

  // Card 2: Confiança
  doc
    .roundedRect(margin + cardWidth + 10, y, cardWidth, 60, 5)
    .fill("#FFFFFF")
    .stroke("#E5E7EB");
  doc.rect(margin + cardWidth + 10, y, cardWidth, 4).fill(colors.secondary);
  doc
    .fontSize(9)
    .fillColor(colors.textLight)
    .font("Helvetica")
    .text("Confianca", margin + cardWidth + 20, y + 15);
  doc
    .fontSize(16)
    .fillColor(colors.text)
    .font("Helvetica-Bold")
    .text(
      summary.confidence ? `${summary.confidence}%` : "N/A",
      margin + cardWidth + 20,
      y + 32
    );

  // Card 3: Mensagens
  doc
    .roundedRect(margin + cardWidth * 2 + 20, y, cardWidth, 60, 5)
    .fill("#FFFFFF")
    .stroke("#E5E7EB");
  doc.rect(margin + cardWidth * 2 + 20, y, cardWidth, 4).fill(colors.primary);
  doc
    .fontSize(9)
    .fillColor(colors.textLight)
    .font("Helvetica")
    .text("Mensagens", margin + cardWidth * 2 + 30, y + 15);
  doc
    .fontSize(16)
    .fillColor(colors.text)
    .font("Helvetica-Bold")
    .text(
      String(analysis.totalMessages || 0),
      margin + cardWidth * 2 + 30,
      y + 32
    );

  y += 75;

  // Texto do resumo
  checkPageBreak(80);
  doc
    .fontSize(10)
    .fillColor(colors.text)
    .font("Helvetica")
    .text(summary.summary || "Sem resumo disponivel", margin, y, {
      width: doc.page.width - margin * 2,
      align: "justify",
    });
  y += 60;

  // Razão do Sentimento
  if (summary.sentimentReason) {
    doc
      .fontSize(9)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Razao do Sentimento: ", margin, y, { continued: true });
    doc.font("Helvetica").text(summary.sentimentReason);
    y += 20;
  }

  // Score do Sentimento
  if (summary.sentimentScore) {
    doc
      .fontSize(9)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Score: ", margin, y, { continued: true });
    doc.font("Helvetica").text(summary.sentimentScore.toString());
    y += 20;
  }

  // Tópicos principais
  if (summary.keyTopics && summary.keyTopics.length > 0) {
    checkPageBreak(100);
    doc
      .fontSize(11)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Principais Topicos:", margin, y);
    y += 18;
    summary.keyTopics.forEach((topic) => {
      checkPageBreak(20);
      doc.fontSize(9).fillColor(colors.text).font("Helvetica");
      doc.circle(margin + 5, y + 4, 2).fill(colors.primary);
      doc.text(topic, margin + 15, y, {
        width: doc.page.width - margin * 2 - 15,
      });
      y += 15;
    });
    y += 10;
  }

  // === SEÇÃO 2: INTELIGÊNCIA COMERCIAL ===
  y += 10;
  checkPageBreak(250);
  doc.rect(margin, y, doc.page.width - margin * 2, 30).fill(colors.secondary);
  doc
    .fontSize(14)
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .text("INTELIGENCIA COMERCIAL", margin + 10, y + 8);
  y += 45;

  // Box de informações do Lead
  const boxHeight = 135;
  doc
    .roundedRect(margin, y, doc.page.width - margin * 2, boxHeight, 5)
    .fill(colors.bg);
  let boxY = y + 12;

  doc
    .fontSize(9)
    .fillColor(colors.text)
    .font("Helvetica-Bold")
    .text("Nivel de Interesse: ", margin + 15, boxY, { continued: true });
  doc.font("Helvetica").text(leadInfo.interestLevel || "N/A");
  boxY += 15;

  doc
    .font("Helvetica-Bold")
    .text("Urgencia: ", margin + 15, boxY, { continued: true });
  doc
    .font("Helvetica")
    .text(leadInfo.urgencyLevel || leadInfo.urgency || "N/A");
  boxY += 15;

  doc
    .font("Helvetica-Bold")
    .text("Estagio: ", margin + 15, boxY, { continued: true });
  doc.font("Helvetica").text(leadInfo.stage || "N/A");
  boxY += 15;

  doc
    .font("Helvetica-Bold")
    .text("Tomador de Decisao: ", margin + 15, boxY, { continued: true });
  doc.font("Helvetica").text(leadInfo.isDecisionMaker ? "Sim" : "Nao");
  boxY += 15;

  doc
    .font("Helvetica-Bold")
    .text("Verificando Concorrentes: ", margin + 15, boxY, { continued: true });
  doc.font("Helvetica").text(leadInfo.checkingCompetitors ? "Sim" : "Nao");
  boxY += 15;

  if (leadInfo.conversionProbability) {
    doc
      .font("Helvetica-Bold")
      .text("Prob. de Conversao: ", margin + 15, boxY, { continued: true });
    doc.font("Helvetica").text(`${leadInfo.conversionProbability}%`);
    boxY += 15;
  }

  if (leadInfo.sentiment) {
    doc
      .font("Helvetica-Bold")
      .text("Sentimento do Lead: ", margin + 15, boxY, { continued: true });
    doc.font("Helvetica").text(leadInfo.sentiment);
  }

  y += boxHeight + 15;

  // Produtos/Serviços
  const products = leadInfo.products || leadInfo.productsServices || [];
  if (products.length > 0) {
    checkPageBreak(80);
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Produtos/Servicos:", margin, y);
    y += 18;
    products.forEach((product) => {
      checkPageBreak(20);
      doc.fontSize(9).fillColor(colors.text).font("Helvetica");
      doc.circle(margin + 5, y + 4, 2).fill(colors.secondary);
      doc.text(product, margin + 15, y, {
        width: doc.page.width - margin * 2 - 15,
      });
      y += 15;
    });
    y += 10;
  }

  // Valores extraídos da conversa
  if (leadInfo.values && leadInfo.values.length > 0) {
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Valores Mencionados:", margin, y);
    y += 18;
    leadInfo.values.forEach((value) => {
      doc.fontSize(9).fillColor(colors.text).font("Helvetica");
      doc.circle(margin + 5, y + 4, 2).fill(colors.accent);
      doc.text(value, margin + 15, y, {
        width: doc.page.width - margin * 2 - 15,
      });
      y += 15;
    });
    y += 10;
  }

  // Informações Financeiras
  if (leadInfo.budget || leadInfo.totalValue || leadInfo.deadline) {
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Informacoes Financeiras:", margin, y);
    y += 18;

    if (leadInfo.budget) {
      doc
        .fontSize(9)
        .fillColor(colors.text)
        .font("Helvetica-Bold")
        .text("Orcamento: ", margin, y, { continued: true });
      doc.font("Helvetica").text(leadInfo.budget);
      y += 15;
    }

    if (leadInfo.totalValue) {
      doc
        .font("Helvetica-Bold")
        .text("Valor Total: ", margin, y, { continued: true });
      doc.font("Helvetica").text(leadInfo.totalValue);
      y += 15;
    }

    if (leadInfo.deadline) {
      doc
        .font("Helvetica-Bold")
        .text("Prazo: ", margin, y, { continued: true });
      doc.font("Helvetica").text(leadInfo.deadline);
      y += 15;
    }
    y += 10;
  }

  // Necessidade Principal
  if (leadInfo.mainNeed) {
    checkPageBreak(80);
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Necessidade Principal:", margin, y);
    y += 18;
    doc
      .fontSize(9)
      .fillColor(colors.text)
      .font("Helvetica")
      .text(leadInfo.mainNeed, margin, y, {
        width: doc.page.width - margin * 2,
      });
    y += 30;
  }

  // Objeções
  if (leadInfo.objections && leadInfo.objections.length > 0) {
    checkPageBreak(80);
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Objecoes:", margin, y);
    y += 18;
    leadInfo.objections.forEach((objection) => {
      checkPageBreak(20);
      doc.fontSize(9).fillColor(colors.text).font("Helvetica");
      doc.circle(margin + 5, y + 4, 2).fill("#DC2626");
      doc.text(objection, margin + 15, y, {
        width: doc.page.width - margin * 2 - 15,
      });
      y += 15;
    });
    y += 10;
  }

  // Próximos Passos
  if (leadInfo.nextSteps && leadInfo.nextSteps.length > 0) {
    checkPageBreak(80);
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Proximos Passos:", margin, y);
    y += 18;
    leadInfo.nextSteps.forEach((step) => {
      checkPageBreak(20);
      doc.fontSize(9).fillColor(colors.text).font("Helvetica");
      doc.circle(margin + 5, y + 4, 2).fill("#10B981");
      doc.text(step, margin + 15, y, {
        width: doc.page.width - margin * 2 - 15,
      });
      y += 15;
    });
    y += 10;
  }

  // Notas Adicionais
  if (leadInfo.notes) {
    checkPageBreak(80);
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Notas Adicionais:", margin, y);
    y += 18;
    doc
      .fontSize(9)
      .fillColor(colors.text)
      .font("Helvetica")
      .text(leadInfo.notes, margin, y, {
        width: doc.page.width - margin * 2,
      });
    y += 30;
  }

  // === SEÇÃO 3: ANÁLISE DETALHADA ===
  y += 10;
  checkPageBreak(200);
  doc.rect(margin, y, doc.page.width - margin * 2, 30).fill(colors.accent);
  doc
    .fontSize(14)
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .text("ANALISE DETALHADA", margin + 10, y + 8);
  y += 45;

  // Métricas de Conversa
  doc
    .fontSize(10)
    .fillColor(colors.text)
    .font("Helvetica-Bold")
    .text("Metricas da Conversa:", margin, y);
  y += 18;

  const metricsBox = [
    { label: "Total de Mensagens", value: analysis.totalMessages || 0 },
    { label: "Mensagens Recebidas", value: analysis.receivedMessages || 0 },
    { label: "Mensagens Enviadas", value: analysis.sentMessages || 0 },
    {
      label: "Taxa de Engajamento",
      value: analysis.engagementRate ? `${analysis.engagementRate}%` : "N/A",
    },
    {
      label: "Tempo Medio de Resposta",
      value: analysis.avgResponseTime
        ? `${analysis.avgResponseTime} min`
        : "N/A",
    },
    {
      label: "Duracao da Conversa",
      value: analysis.conversationDuration
        ? `${analysis.conversationDuration} horas`
        : "N/A",
    },
  ];

  metricsBox.forEach((metric) => {
    doc
      .fontSize(9)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text(`${metric.label}: `, margin, y, { continued: true });
    doc.font("Helvetica").text(String(metric.value));
    y += 15;
  });

  y += 10;

  // Datas
  if (analysis.firstMessageDate || analysis.lastMessageDate) {
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("Periodo da Conversa:", margin, y);
    y += 18;

    if (analysis.firstMessageDate) {
      doc
        .fontSize(9)
        .fillColor(colors.text)
        .font("Helvetica-Bold")
        .text("Primeira Mensagem: ", margin, y, { continued: true });
      doc
        .font("Helvetica")
        .text(new Date(analysis.firstMessageDate).toLocaleString("pt-BR"));
      y += 15;
    }

    if (analysis.lastMessageDate) {
      doc
        .font("Helvetica-Bold")
        .text("Ultima Mensagem: ", margin, y, { continued: true });
      doc
        .font("Helvetica")
        .text(new Date(analysis.lastMessageDate).toLocaleString("pt-BR"));
      y += 15;
    }
  }

  // === RODAPÉ ===
  const footerY = doc.page.height - 25;
  doc
    .fontSize(7)
    .fillColor(colors.textLight)
    .text(`Gerado por IARA - ${exportData.exportDate}`, margin, footerY, {
      align: "center",
      width: doc.page.width - margin * 2,
    });

  // NÃO chamar doc.end() aqui - será chamado no main.js
}
