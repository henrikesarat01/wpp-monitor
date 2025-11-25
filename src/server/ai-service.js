/**
 * AI Service - Serviço de Inteligência Artificial Local
 *
 * Usa Transformers.js para análise de mensagens sem APIs externas
 */

import { pipeline, env } from "@xenova/transformers";

// Configurar para usar modelos locais (cache)
env.allowLocalModels = true;
env.allowRemoteModels = true;

class AIService {
  constructor() {
    this.initialized = false;
    this.classificationPipeline = null;
    this.sentimentPipeline = null;
    this.summarizationPipeline = null;
    this.zerShotPipeline = null;
  }

  /**
   * Inicializa todos os modelos de IA
   */
  async initialize() {
    if (this.initialized) {
      console.log("🤖 [AI] Modelos já inicializados");
      return;
    }

    console.log("🤖 [AI] Iniciando carregamento dos modelos...");
    console.log("⏳ [AI] Isso pode levar alguns minutos na primeira vez...");

    try {
      // 1. Modelo de classificação zero-shot (mais versátil)
      console.log("📦 [AI] Carregando modelo de classificação...");
      this.zeroShotPipeline = await pipeline(
        "zero-shot-classification",
        "Xenova/mobilebert-uncased-mnli"
      );
      console.log("✅ [AI] Modelo de classificação carregado!");

      // 2. Modelo de análise de sentimento
      console.log("📦 [AI] Carregando modelo de sentimento...");
      this.sentimentPipeline = await pipeline(
        "sentiment-analysis",
        "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
      );
      console.log("✅ [AI] Modelo de sentimento carregado!");

      // 3. Modelo de resumo automático
      console.log("📦 [AI] Carregando modelo de summarization...");
      this.summarizationPipeline = await pipeline(
        "summarization",
        "Xenova/distilbart-cnn-6-6"
      );
      console.log("✅ [AI] Modelo de summarization carregado!");

      this.initialized = true;
      console.log("🎉 [AI] Todos os modelos carregados com sucesso!");
    } catch (error) {
      console.error("❌ [AI] Erro ao carregar modelos:", error);
      throw error;
    }
  }

  /**
   * Classifica uma mensagem em categorias
   * @param {string} text - Texto da mensagem
   * @returns {Object} - { category, score, allScores }
   */
  async classifyMessage(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const categories = [
        "sales inquiry",
        "customer support",
        "complaint",
        "question",
        "negotiation",
      ];

      const result = await this.zeroShotPipeline(text, categories);

      // Mapear para português
      const categoryMap = {
        "sales inquiry": "vendas",
        "customer support": "suporte",
        complaint: "reclamacao",
        question: "duvida",
        negotiation: "negociacao",
      };

      const category = categoryMap[result.labels[0]] || "outros";
      const score = result.scores[0];

      // Todas as pontuações
      const allScores = {};
      result.labels.forEach((label, idx) => {
        allScores[categoryMap[label]] = result.scores[idx];
      });

      return {
        category,
        score,
        allScores,
        confidence: score > 0.7 ? "high" : score > 0.4 ? "medium" : "low",
      };
    } catch (error) {
      console.error("❌ [AI] Erro ao classificar mensagem:", error);
      return {
        category: "outros",
        score: 0,
        allScores: {},
        confidence: "low",
        error: error.message,
      };
    }
  }

  /**
   * Detecta urgência de uma mensagem
   * @param {string} text - Texto da mensagem
   * @returns {Object} - { isUrgent, score, priority }
   */
  async detectUrgency(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Palavras-chave de urgência em português
      const urgentKeywords = [
        "urgente",
        "emergência",
        "imediato",
        "agora",
        "rápido",
        "hoje",
        "problema",
        "erro",
        "não funciona",
        "parado",
        "ajuda",
        "socorro",
        "importante",
        "preciso",
        "quanto antes",
      ];

      const textLower = text.toLowerCase();
      let urgencyScore = 0;

      // Contar palavras de urgência
      urgentKeywords.forEach((keyword) => {
        if (textLower.includes(keyword)) {
          urgencyScore += 0.15;
        }
      });

      // Usar classificação zero-shot para contexto
      const urgencyLabels = [
        "urgent message",
        "normal message",
        "low priority",
      ];
      const result = await this.zeroShotPipeline(text, urgencyLabels);

      if (result.labels[0] === "urgent message") {
        urgencyScore += result.scores[0] * 0.5;
      }

      // Normalizar para 0-10
      const priority = Math.min(Math.round(urgencyScore * 10), 10);
      const isUrgent = priority >= 7;

      return {
        isUrgent,
        priority,
        score: urgencyScore,
        level:
          priority >= 8
            ? "critical"
            : priority >= 6
            ? "high"
            : priority >= 4
            ? "medium"
            : "low",
      };
    } catch (error) {
      console.error("❌ [AI] Erro ao detectar urgência:", error);
      return {
        isUrgent: false,
        priority: 5,
        score: 0.5,
        level: "medium",
        error: error.message,
      };
    }
  }

  /**
   * Analisa sentimento de uma mensagem
   * @param {string} text - Texto da mensagem
   * @returns {Object} - { sentiment, score }
   */
  async analyzeSentiment(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.sentimentPipeline(text);
      const rawSentiment = result[0].label.toLowerCase();
      const rawScore = result[0].score;

      // Ajustar para considerar scores intermediários como neutro
      // Se o score for menor que 0.65, considerar neutro (baixa confiança)
      let finalSentiment = rawSentiment;
      let finalScore = rawScore;

      if (rawScore < 0.65) {
        finalSentiment = "neutral";
        finalScore = 0.5;
      }

      return {
        sentiment: finalSentiment,
        score: finalScore,
        emoji:
          finalSentiment === "positive"
            ? "😊"
            : finalSentiment === "negative"
            ? "😠"
            : "😐",
      };
    } catch (error) {
      console.error("❌ [AI] Erro ao analisar sentimento:", error);
      return {
        sentiment: "neutral",
        score: 0.5,
        emoji: "😐",
        error: error.message,
      };
    }
  }

  /**
   * Analisa sentimento de uma conversa completa considerando contexto
   * @param {Array} messages - Array de mensagens {content, direction}
   * @returns {Object} - { sentiment, score, emoji }
   */
  async analyzeConversationSentiment(messages) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Palavras-chave positivas e negativas em português
      const positiveKeywords = [
        "obrigad",
        "ótimo",
        "perfeito",
        "excelente",
        "bom",
        "legal",
        "show",
        "top",
        "maravilh",
        "pode entregar",
        "vou pegar",
        "vou comprar",
        "okay",
        "certo",
        "beleza",
      ];

      const negativeKeywords = [
        "problema",
        "ruim",
        "péssimo",
        "horrível",
        "não gostei",
        "reclamação",
        "insatisfeito",
        "decepcionado",
        "não funciona",
        "defeito",
        "cancelar",
        "devolver",
      ];

      // Juntar conteúdo das mensagens
      const allContent = messages.map((m) => m.content.toLowerCase()).join(" ");

      // Contar palavras-chave
      let positiveCount = 0;
      let negativeCount = 0;

      positiveKeywords.forEach((keyword) => {
        const matches = allContent.match(new RegExp(keyword, "gi"));
        if (matches) positiveCount += matches.length;
      });

      negativeKeywords.forEach((keyword) => {
        const matches = allContent.match(new RegExp(keyword, "gi"));
        if (matches) negativeCount += matches.length;
      });

      // Analisar sentimento das últimas 3 mensagens (mais peso)
      const recentMessages = messages.slice(-3);
      const recentText = recentMessages.map((m) => m.content).join(" ");
      const aiSentiment = await this.analyzeSentiment(
        recentText.substring(0, 500)
      );

      // Combinar análise de palavras-chave com análise da IA
      let finalSentiment = "neutral";
      let finalScore = 0.5;

      // Se há palavras positivas e nenhuma negativa
      if (positiveCount > 0 && negativeCount === 0) {
        finalSentiment = "positive";
        finalScore = Math.min(0.7 + positiveCount * 0.05, 0.95);
      }
      // Se há palavras negativas e nenhuma positiva
      else if (negativeCount > 0 && positiveCount === 0) {
        finalSentiment = "negative";
        finalScore = Math.min(0.7 + negativeCount * 0.05, 0.95);
      }
      // Se há ambas, usar a IA como desempate
      else if (positiveCount > 0 || negativeCount > 0) {
        if (positiveCount > negativeCount) {
          finalSentiment = "positive";
          finalScore = 0.65;
        } else if (negativeCount > positiveCount) {
          finalSentiment = "negative";
          finalScore = 0.65;
        } else {
          // Empate: usar análise da IA
          finalSentiment = aiSentiment.sentiment;
          finalScore = aiSentiment.score;
        }
      }
      // Se não há palavras-chave, usar análise da IA
      else {
        finalSentiment = aiSentiment.sentiment;
        finalScore = aiSentiment.score;
      }

      console.log(
        `🤖 [SENTIMENT] Positivas: ${positiveCount}, Negativas: ${negativeCount}, Final: ${finalSentiment} (${(
          finalScore * 100
        ).toFixed(0)}%)`
      );

      return {
        sentiment: finalSentiment,
        score: finalScore,
        emoji:
          finalSentiment === "positive"
            ? "😊"
            : finalSentiment === "negative"
            ? "😠"
            : "😐",
      };
    } catch (error) {
      console.error("❌ [AI] Erro ao analisar sentimento da conversa:", error);
      return {
        sentiment: "neutral",
        score: 0.5,
        emoji: "😐",
        error: error.message,
      };
    }
  }

  /**
   * Analisa intenção do cliente
   * @param {string} text - Texto da mensagem
   * @returns {Object} - { intent, score, confidence }
   */
  async analyzeIntent(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const intents = [
        "wants to buy",
        "has a complaint",
        "asking question",
        "wants to cancel",
        "negotiating price",
      ];

      const result = await this.zeroShotPipeline(text, intents);

      const intentMap = {
        "wants to buy": "comprar",
        "has a complaint": "reclamar",
        "asking question": "perguntar",
        "wants to cancel": "cancelar",
        "negotiating price": "negociar",
      };

      return {
        intent: intentMap[result.labels[0]],
        score: result.scores[0],
        confidence: result.scores[0] > 0.6 ? "high" : "medium",
        allIntents: result.labels.map((label, idx) => ({
          intent: intentMap[label],
          score: result.scores[idx],
        })),
      };
    } catch (error) {
      console.error("❌ [AI] Erro ao analisar intenção:", error);
      return {
        intent: "outros",
        score: 0,
        confidence: "low",
        error: error.message,
      };
    }
  }

  /**
   * Extrai informações estruturadas de uma mensagem
   * @param {string} text - Texto da mensagem
   * @returns {Object} - { products, values, emails, phones }
   */
  extractInformation(text) {
    try {
      // Regex para diferentes tipos de informação
      const patterns = {
        email: /[\w.-]+@[\w.-]+\.\w+/gi,
        phone: /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/g,
        money: /R\$\s?\d+(?:[.,]\d{3})*(?:[.,]\d{2})?/gi,
        percentage: /\d+(?:[.,]\d+)?%/g,
      };

      const emails = text.match(patterns.email) || [];
      const phones = text.match(patterns.phone) || [];
      const values = text.match(patterns.money) || [];
      const percentages = text.match(patterns.percentage) || [];

      // Extrair valores numéricos
      const numericValues = values.map((v) => {
        const num = v.replace("R$", "").replace(/\./g, "").replace(",", ".");
        return parseFloat(num);
      });

      return {
        emails,
        phones,
        values: numericValues,
        hasMoneyMention: values.length > 0,
        maxValue: numericValues.length > 0 ? Math.max(...numericValues) : 0,
        minValue: numericValues.length > 0 ? Math.min(...numericValues) : 0,
        avgValue:
          numericValues.length > 0
            ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
            : 0,
        percentages,
      };
    } catch (error) {
      console.error("❌ [AI] Erro ao extrair informações:", error);
      return {
        emails: [],
        phones: [],
        values: [],
        hasMoneyMention: false,
        maxValue: 0,
        minValue: 0,
        avgValue: 0,
        percentages: [],
      };
    }
  }

  /**
   * Gera resumo de uma conversa
   * @param {string} text - Texto completo da conversa
   * @param {number} maxLength - Tamanho máximo do resumo (palavras)
   * @returns {Object} - { summary, originalLength, summaryLength, compressionRate }
   */
  async summarizeConversation(text, maxLength = 150) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Limitar texto de entrada (modelo aceita max ~1024 tokens)
      const maxInputLength = 800; // palavras (aumentado de 500)
      const words = text.split(/\s+/);
      const truncatedText = words.slice(0, maxInputLength).join(" ");

      console.log(`📝 [AI] Gerando resumo de ${words.length} palavras...`);

      const result = await this.summarizationPipeline(truncatedText, {
        max_length: maxLength,
        min_length: Math.floor(maxLength / 4), // Reduzido de /3 para dar mais flexibilidade
        do_sample: true, // Mudado para true para gerar texto mais natural
        temperature: 0.7, // Adiciona um pouco de criatividade
        top_k: 50,
        top_p: 0.95,
      });

      const summary = result[0].summary_text;
      const summaryWords = summary.split(/\s+/).length;
      const compressionRate = ((1 - summaryWords / words.length) * 100).toFixed(
        1
      );

      console.log(
        `✅ [AI] Resumo gerado: ${summaryWords} palavras (${compressionRate}% compressão)`
      );

      return {
        summary,
        originalLength: words.length,
        summaryLength: summaryWords,
        compressionRate: parseFloat(compressionRate),
        timeSaved: Math.round((words.length - summaryWords) * 0.25), // ~0.25s por palavra
      };
    } catch (error) {
      console.error("❌ [AI] Erro ao gerar resumo:", error);

      // Fallback: resumo simples sem IA
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const firstSentences = sentences.slice(0, 3).join(". ") + ".";
      const words = text.split(/\s+/);

      return {
        summary: firstSentences,
        originalLength: words.length,
        summaryLength: firstSentences.split(/\s+/).length,
        compressionRate: 0,
        timeSaved: 0,
        error: error.message,
        fallback: true,
      };
    }
  }

  /**
   * Análise completa de uma mensagem (tudo de uma vez)
   * @param {string} text - Texto da mensagem
   * @returns {Object} - Análise completa
   */
  async analyzeMessage(text) {
    console.log("🔍 [AI] Analisando mensagem:", text.substring(0, 50) + "...");

    const [classification, urgency, sentiment, intent, extraction] =
      await Promise.all([
        this.classifyMessage(text),
        this.detectUrgency(text),
        this.analyzeSentiment(text),
        this.analyzeIntent(text),
        Promise.resolve(this.extractInformation(text)),
      ]);

    console.log("✅ [AI] Análise completa concluída!");

    return {
      classification,
      urgency,
      sentiment,
      intent,
      extraction,
      analyzedAt: new Date().toISOString(),
    };
  }
}

// Singleton instance
const aiService = new AIService();

export default aiService;
