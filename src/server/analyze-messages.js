#!/usr/bin/env node

/**
 * Script para analisar mensagens do banco com IA
 * e gerar relatório no terminal
 */

import aiService from "./ai-service.js";
import db from "./database.js";

const { messages, contacts } = db;

// Cores para terminal
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log("\n" + "=".repeat(60));
  log(title, "bright");
  console.log("=".repeat(60) + "\n");
}

function section(title) {
  console.log("\n" + "-".repeat(60));
  log(title, "cyan");
  console.log("-".repeat(60));
}

async function analyzeDatabase() {
  try {
    header("🤖 ANÁLISE DE IA DAS MENSAGENS DO BANCO DE DADOS");

    // 1. Buscar mensagens não analisadas
    log("📊 Buscando mensagens no banco...", "blue");

    const allMessages = messages.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    log(`✅ Encontradas ${allMessages.length} mensagens`, "green");

    if (allMessages.length === 0) {
      log("⚠️  Nenhuma mensagem encontrada no banco!", "yellow");
      return;
    }

    // 2. Filtrar mensagens com texto
    const textMessages = allMessages.filter(
      (m) => m.content && m.content.length > 5 && m.direction === "received"
    );

    log(`📝 ${textMessages.length} mensagens de texto recebidas`, "blue");

    // 3. Inicializar IA
    header("🧠 INICIALIZANDO MODELOS DE IA");
    log("⏳ Isso pode demorar alguns minutos na primeira vez...", "yellow");

    await aiService.initialize();
    log("✅ Modelos carregados!", "green");

    // 4. Analisar amostra de mensagens
    const sampleSize = Math.min(10, textMessages.length);
    const sample = textMessages.slice(0, sampleSize);

    header(`🔍 ANALISANDO ${sampleSize} MENSAGENS (AMOSTRA)`);

    const analyses = [];

    for (let i = 0; i < sample.length; i++) {
      const msg = sample[i];
      log(`\n[${i + 1}/${sampleSize}] Analisando mensagem...`, "blue");
      log(`Texto: "${msg.content.substring(0, 80)}..."`, "reset");

      const analysis = await aiService.analyzeMessage(msg.content);
      analyses.push({ message: msg, analysis });

      log(`  ├─ Categoria: ${analysis.classification.category}`, "cyan");
      log(
        `  ├─ Urgência: ${analysis.urgency.priority}/10 (${analysis.urgency.level})`,
        analysis.urgency.priority >= 7 ? "red" : "yellow"
      );
      log(
        `  ├─ Sentimento: ${analysis.sentiment.sentiment} ${analysis.sentiment.emoji}`,
        analysis.sentiment.sentiment === "positive" ? "green" : "red"
      );
      log(`  └─ Intenção: ${analysis.intent.intent}`, "magenta");
    }

    // 5. Estatísticas Agregadas
    header("📊 ESTATÍSTICAS AGREGADAS");

    // Distribuição por categoria
    section("📂 Distribuição por Categoria");
    const categoryCount = {};
    analyses.forEach((a) => {
      const cat = a.analysis.classification.category;
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const percentage = ((count / analyses.length) * 100).toFixed(1);
        const bar = "█".repeat(Math.round((count / analyses.length) * 20));
        log(
          `  ${category.padEnd(15)} ${bar} ${count} (${percentage}%)`,
          "green"
        );
      });

    // Distribuição de urgência
    section("🚨 Distribuição de Urgência");
    const urgencyLevels = { critical: 0, high: 0, medium: 0, low: 0 };
    analyses.forEach((a) => {
      urgencyLevels[a.analysis.urgency.level]++;
    });

    Object.entries(urgencyLevels).forEach(([level, count]) => {
      const percentage = ((count / analyses.length) * 100).toFixed(1);
      const color =
        level === "critical" ? "red" : level === "high" ? "yellow" : "green";
      log(`  ${level.padEnd(10)} ${count} mensagens (${percentage}%)`, color);
    });

    // Sentimento
    section("😊 Análise de Sentimento");
    const sentiments = { positive: 0, negative: 0, neutral: 0 };
    let totalSentimentScore = 0;

    analyses.forEach((a) => {
      const sent = a.analysis.sentiment.sentiment;
      sentiments[sent] = (sentiments[sent] || 0) + 1;
      totalSentimentScore += a.analysis.sentiment.score;
    });

    Object.entries(sentiments).forEach(([sentiment, count]) => {
      const percentage = ((count / analyses.length) * 100).toFixed(1);
      const emoji =
        sentiment === "positive"
          ? "😊"
          : sentiment === "negative"
          ? "😠"
          : "😐";
      const color =
        sentiment === "positive"
          ? "green"
          : sentiment === "negative"
          ? "red"
          : "yellow";
      log(
        `  ${emoji} ${sentiment.padEnd(
          10
        )} ${count} mensagens (${percentage}%)`,
        color
      );
    });

    const avgSentiment = (totalSentimentScore / analyses.length).toFixed(2);
    log(`  📊 Score médio: ${avgSentiment}`, "cyan");

    // Intenções
    section("🎯 Distribuição de Intenções");
    const intentCount = {};
    analyses.forEach((a) => {
      const intent = a.analysis.intent.intent;
      intentCount[intent] = (intentCount[intent] || 0) + 1;
    });

    Object.entries(intentCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([intent, count]) => {
        const percentage = ((count / analyses.length) * 100).toFixed(1);
        log(`  ${intent.padEnd(15)} ${count} (${percentage}%)`, "magenta");
      });

    // Extração de dados
    section("🔍 Informações Extraídas");
    let totalEmails = 0;
    let totalPhones = 0;
    let totalValues = 0;
    let sumValues = 0;

    analyses.forEach((a) => {
      const ext = a.analysis.extraction;
      totalEmails += ext.emails?.length || 0;
      totalPhones += ext.phones?.length || 0;
      if (ext.values?.length > 0) {
        totalValues += ext.values.length;
        sumValues += ext.values.reduce((a, b) => a + b, 0);
      }
    });

    log(`  📧 E-mails encontrados: ${totalEmails}`, "cyan");
    log(`  📱 Telefones encontrados: ${totalPhones}`, "cyan");
    log(`  💰 Valores em R$ mencionados: ${totalValues}`, "cyan");
    if (sumValues > 0) {
      log(`  💵 Soma total de valores: R$ ${sumValues.toFixed(2)}`, "green");
      log(
        `  📊 Valor médio: R$ ${(sumValues / totalValues).toFixed(2)}`,
        "green"
      );
    }

    // Top mensagens urgentes
    section("🔴 TOP 5 MENSAGENS MAIS URGENTES");
    const topUrgent = analyses
      .sort((a, b) => b.analysis.urgency.priority - a.analysis.urgency.priority)
      .slice(0, 5);

    topUrgent.forEach((item, i) => {
      const msg = item.message;
      const analysis = item.analysis;
      log(
        `\n${i + 1}. Urgência: ${analysis.urgency.priority}/10 (${
          analysis.urgency.level
        })`,
        "red"
      );
      log(`   Mensagem: "${msg.content.substring(0, 100)}..."`, "reset");
      log(`   Categoria: ${analysis.classification.category}`, "cyan");
      log(
        `   Sentimento: ${analysis.sentiment.sentiment}`,
        analysis.sentiment.sentiment === "positive" ? "green" : "red"
      );
    });

    // Resumo final
    header("📋 RESUMO EXECUTIVO");

    const criticalCount = analyses.filter(
      (a) => a.analysis.urgency.level === "critical"
    ).length;
    const negativeCount = analyses.filter(
      (a) => a.analysis.sentiment.sentiment === "negative"
    ).length;
    const avgUrgency = (
      analyses.reduce((sum, a) => sum + a.analysis.urgency.priority, 0) /
      analyses.length
    ).toFixed(1);

    log(`📊 Total analisado: ${analyses.length} mensagens`, "bright");
    log(
      `🔴 Mensagens críticas: ${criticalCount} (${(
        (criticalCount / analyses.length) *
        100
      ).toFixed(1)}%)`,
      "red"
    );
    log(
      `😠 Sentimento negativo: ${negativeCount} (${(
        (negativeCount / analyses.length) *
        100
      ).toFixed(1)}%)`,
      "red"
    );
    log(`⚡ Urgência média: ${avgUrgency}/10`, "yellow");

    if (criticalCount > 0) {
      log(
        `\n⚠️  ATENÇÃO: ${criticalCount} mensagem(ns) crítica(s) requer(em) ação imediata!`,
        "red"
      );
    }

    if (negativeCount > analyses.length * 0.3) {
      log(
        `⚠️  ALERTA: ${((negativeCount / analyses.length) * 100).toFixed(
          0
        )}% de sentimento negativo detectado!`,
        "yellow"
      );
    }

    header("✅ ANÁLISE CONCLUÍDA");
    log(
      "Para analisar todas as mensagens, remova o limite de 100 no código.",
      "cyan"
    );
  } catch (error) {
    log(`\n❌ ERRO: ${error.message}`, "red");
    console.error(error);
  }
}

// Executar análise
log("🚀 Iniciando análise...", "bright");
analyzeDatabase()
  .then(() => {
    log("\n✨ Análise finalizada com sucesso!", "green");
    process.exit(0);
  })
  .catch((error) => {
    log(`\n❌ Erro fatal: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  });
