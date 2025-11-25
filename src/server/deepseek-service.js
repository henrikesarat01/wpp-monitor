/**
 * DeepSeek Service - Integração com API DeepSeek para análise avançada
 *
 * Fornece análise mais humanizada e robusta usando modelo de linguagem avançado
 * com fallback para IA local em caso de falha
 */

import fetch from "node-fetch";

class DeepSeekService {
  constructor() {
    this.apiKey = "sk-0622fea8a443487d822fd462b41c5085";
    this.apiUrl = "https://api.deepseek.com/v1/chat/completions";
    this.model = "deepseek-chat";
    this.available = true;
    this.lastError = null;
  }

  /**
   * Testa se a API está disponível
   */
  async testConnection() {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: "test" }],
          max_tokens: 10,
        }),
        timeout: 5000,
      });

      this.available = response.ok;
      return this.available;
    } catch (error) {
      console.error("❌ [DEEPSEEK] Erro ao testar conexão:", error.message);
      this.available = false;
      this.lastError = error.message;
      return false;
    }
  }

  /**
   * Gera resumo humanizado e contextualizado da conversa
   * @param {Array} messages - Array de mensagens {content, direction, timestamp}
   * @param {Object} context - Contexto adicional (nome do contato, período, etc)
   * @returns {Object} - {summary, sentiment, intent, highlights}
   */
  async generateConversationSummary(messages, context = {}) {
    if (!this.available) {
      throw new Error("DeepSeek API não disponível");
    }

    try {
      // Preparar texto da conversa
      const conversationText = messages
        .map((m) => {
          const speaker = m.direction === "received" ? "Cliente" : "Empresa";
          const time = new Date(m.timestamp).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });

          // Se for áudio com transcrição, usar a transcrição ao invés do content
          let messageContent = m.content;
          if (m.type === "audio" && m.audioTranscription) {
            messageContent = m.audioTranscription;
          } else if (m.type === "audio") {
            messageContent = "[Áudio sem transcrição]";
          }

          return `[${time}] ${speaker}: ${messageContent}`;
        })
        .join("\n");

      // Criar prompt estruturado
      const prompt = `Você é um assistente especializado em análise de conversas comerciais. Analise a conversa abaixo e extraia TODOS os detalhes importantes.

INFORMAÇÕES DO CONTEXTO:
- Contato: ${context.contactName || "Cliente"}
- Período: ${context.period || "Não especificado"}
- Total de mensagens: ${messages.length}

CONVERSA:
${conversationText}

IMPORTANTE: As mensagens de áudio já foram TRANSCRITAS e o texto está disponível acima. Analise o conteúdo textual fornecido.

INSTRUÇÕES CRÍTICAS:
1. SEJA ESPECÍFICO: Mencione produtos, valores, prazos, condições de pagamento exatamente como foram ditos
2. EXTRAIA DETALHES: Se foi mencionado preço, modelo, quantidade, prazo - INCLUA no resumo
3. NÃO SEJA VAGO: Evite frases genéricas como "cliente demonstrou interesse" - diga QUAL foi o interesse específico
4. CAPTURE VALORES: Se foi mencionado R$ 3.500, parcelamento em 10x, garantia de 3 meses - INCLUA tudo isso
5. IDENTIFIQUE O PRODUTO/SERVIÇO: Especifique exatamente o que está sendo negociado (ex: "motor do Gol G3 1.6 AP 2002")
6. DETALHE A RESPOSTA: Se a empresa deu uma resposta, seja específico sobre o que foi oferecido

EXEMPLO DE RESUMO BOM (específico):
"Cliente consultou disponibilidade do motor do Gol G3 1.6 AP 2002. Empresa confirmou disponibilidade pelo valor de R$ 3.500,00, com opção de parcelamento em até 10 vezes, incluindo 3 meses de garantia e serviço de instalação."

EXEMPLO DE RESUMO RUIM (vago):
"Cliente fez uma consulta sobre um produto. Empresa respondeu com informações sobre disponibilidade e preço."

Responda APENAS no formato JSON abaixo (sem markdown, sem blocos de código):
{
  "summary": "Resumo DETALHADO e ESPECÍFICO com todos os valores, produtos e condições mencionados",
  "sentiment": "positive|neutral|negative",
  "sentimentReason": "Explicação do sentimento baseada no tom da conversa",
  "intent": "Intenção específica (ex: consulta de preço, negociação, reclamação, etc)",
  "intentConfidence": 0.85,
  "highlights": ["Detalhe específico 1 com valores", "Detalhe específico 2", "Detalhe específico 3"],
  "conclusion": "Status atual e próximos passos esperados",
  "urgencyLevel": "low|medium|high|critical",
  "suggestedActions": ["Ação específica baseada no contexto"]
}`;

      console.log("🤖 [DEEPSEEK] Enviando requisição para análise...");

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente especializado em análise de conversas de atendimento. Responda sempre em JSON válido, sem markdown.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
        timeout: 30000,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API Error: ${response.status} - ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      console.log("✅ [DEEPSEEK] Análise recebida com sucesso");

      // Parse do JSON
      const analysis = JSON.parse(content);

      return {
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        sentimentReason: analysis.sentimentReason,
        intent: analysis.intent,
        intentConfidence: analysis.intentConfidence || 0.8,
        highlights: analysis.highlights || [],
        conclusion: analysis.conclusion || "",
        urgencyLevel: analysis.urgencyLevel || "low",
        suggestedActions: analysis.suggestedActions || [],
        provider: "deepseek",
      };
    } catch (error) {
      console.error("❌ [DEEPSEEK] Erro na análise:", error.message);
      this.lastError = error.message;
      throw error;
    }
  }

  /**
   * Analisa uma única mensagem (otimizado para dashboard)
   * @param {string} content - Conteúdo da mensagem
   * @returns {Object} - {sentiment, category, urgency, intent, scores}
   */
  async analyzeSingleMessage(content) {
    if (!this.available) {
      throw new Error("DeepSeek API não disponível");
    }

    try {
      const prompt = `Analise esta mensagem de atendimento ao cliente:

"${content}"

Determine:
- sentiment: "positive", "neutral" ou "negative" com score (0-1)
- category: "vendas", "suporte", "reclamação", "dúvida" ou "negociação"
- urgency: nível de 0 a 10 (0=baixa, 10=crítica)
- intent: intenção principal ("comprar", "reclamar", "perguntar", "cancelar", "negociar", etc)

Responda APENAS em JSON (sem markdown):
{
  "sentiment": "positive",
  "sentimentScore": 0.85,
  "category": "vendas",
  "categoryScore": 0.9,
  "urgency": 3,
  "urgencyLevel": "low",
  "intent": "comprar",
  "intentScore": 0.8
}`;

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente de análise de mensagens. Responda sempre em JSON válido.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 300,
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return {
        sentiment: result.sentiment || "neutral",
        sentimentScore: result.sentimentScore || 0.5,
        category: result.category || "geral",
        categoryScore: result.categoryScore || 0.5,
        urgency: result.urgency || 5,
        urgencyLevel: result.urgencyLevel || "medium",
        intent: result.intent || "conversar",
        intentScore: result.intentScore || 0.5,
      };
    } catch (error) {
      console.error(
        "❌ [DEEPSEEK] Erro ao analisar mensagem individual:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Analisa mensagens individuais para dashboard (em lote)
   * @param {Array} messages - Array de mensagens para análise
   * @returns {Array} - Mensagens com análise
   */
  async analyzeMessages(messages) {
    if (!this.available) {
      throw new Error("DeepSeek API não disponível");
    }

    try {
      // Processar em lotes para otimizar
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);

        const prompt = `Analise as seguintes mensagens de atendimento e retorne um array JSON com a análise de cada uma:

${batch
  .map(
    (m, idx) => `
Mensagem ${idx + 1}:
Conteúdo: ${m.content}
Direção: ${m.direction === "received" ? "Cliente" : "Empresa"}
`
  )
  .join("\n")}

Para cada mensagem, determine:
- sentiment: "positive", "neutral" ou "negative"
- category: "vendas", "suporte", "reclamação", "dúvida" ou "negociação"
- urgency: 0 a 1 (0 = baixa, 1 = crítica)
- intent: intenção principal

Responda APENAS com um array JSON (sem markdown):
[
  {
    "sentiment": "positive",
    "category": "vendas",
    "urgency": 0.3,
    "intent": "comprar"
  }
]`;

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: "system",
                content:
                  "Você é um assistente de análise de mensagens. Responda sempre em JSON válido.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 1000,
            temperature: 0.3,
            response_format: { type: "json_object" },
          }),
          timeout: 20000,
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const analyses = JSON.parse(content);

        // Combinar resultados com mensagens originais
        batch.forEach((msg, idx) => {
          results.push({
            ...msg,
            analysis: analyses[idx] || {
              sentiment: "neutral",
              category: "geral",
              urgency: 0.5,
              intent: "conversar",
            },
          });
        });

        // Delay entre lotes para não sobrecarregar API
        if (i + batchSize < messages.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ [DEEPSEEK] ${results.length} mensagens analisadas`);
      return results;
    } catch (error) {
      console.error("❌ [DEEPSEEK] Erro ao analisar mensagens:", error.message);
      throw error;
    }
  }

  /**
   * Analisa conversa para KPIs (otimizado - uma única chamada)
   * @param {Array} messages - Array de mensagens {content, direction, timestamp}
   * @returns {Object} - Análise completa para KPIs
   */
  async analyzeConversationForKPIs(messages) {
    if (!this.available) {
      throw new Error("DeepSeek API não disponível");
    }

    try {
      // Preparar texto da conversa (limitado para otimizar)
      const conversationText = messages
        .slice(0, 50) // Limitar a 50 mensagens mais recentes
        .map((m) => {
          const speaker = m.direction === "received" ? "Cliente" : "Empresa";
          const time = new Date(m.timestamp).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });

          // Se for áudio com transcrição, usar a transcrição
          let messageContent = m.content;
          if (m.type === "audio" && m.audioTranscription) {
            messageContent = m.audioTranscription;
          } else if (m.type === "audio") {
            messageContent = "[Áudio sem transcrição]";
          }

          return `[${time}] ${speaker}: ${messageContent}`;
        })
        .join("\n");

      const prompt = `Você é um especialista em análise de conversas comerciais. Analise esta conversa e extraia TODOS os detalhes importantes.

CONVERSA (${messages.length} mensagens):
${conversationText}

INSTRUÇÕES CRÍTICAS:
1. SEJA ESPECÍFICO: Mencione produtos, valores, prazos, condições EXATAMENTE como foram ditos
2. EXTRAIA VALORES: Se foi mencionado R$ 3.500, parcelamento em 10x, garantia - INCLUA tudo
3. IDENTIFIQUE PRODUTOS: Especifique exatamente o que está sendo negociado (ex: "motor AT 8v do Gol")
4. CAPTURE DETALHES: Condições de pagamento, garantias, prazos de entrega
5. CATEGORIA PRECISA: Não use categorias vagas - seja específico (ex: "consulta_preco" não "dúvida")

CATEGORIAS VÁLIDAS:
- consulta_preco: Cliente perguntando valores
- negociacao: Discussão de valores/condições
- venda_fechada: Venda confirmada
- suporte: Dúvidas sobre uso/instalação
- reclamacao: Cliente insatisfeito
- orcamento: Solicitação de orçamento
- agendamento: Marcação de serviço/visita
- pos_venda: Acompanhamento após venda

Responda APENAS em JSON (sem markdown):
{
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.85,
  "category": "consulta_preco",
  "categoryConfidence": 0.95,
  "intent": "Intenção específica do cliente",
  "intentConfidence": 0.95,
  "urgency": 0.6,
  "urgencyLevel": "low|medium|high|critical",
  "hasNegotiation": true,
  "extractedValues": [3000, 5000],
  "extractedProducts": ["Motor AT 8v do Gol"],
  "extractedConditions": ["Garantia de 3 meses", "Base de troca"],
  "summary": "Resumo específico com TODOS os detalhes mencionados"
}`;

      console.log("🤖 [DEEPSEEK] Analisando conversa para KPIs...");

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente especializado em análise de conversas de atendimento. Seja ESPECÍFICO e extraia TODOS os detalhes mencionados. Responda sempre em JSON válido.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 1000,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
        timeout: 15000,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API Error: ${response.status} - ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const analysis = JSON.parse(content);

      console.log("✅ [DEEPSEEK] KPIs analisados com sucesso");
      console.log(
        `📊 [DEEPSEEK] Valores extraídos: ${
          analysis.extractedValues?.length || 0
        }`
      );
      console.log(
        `📦 [DEEPSEEK] Produtos: ${analysis.extractedProducts?.length || 0}`
      );

      return {
        sentiment: analysis.sentiment || "neutral",
        sentimentScore: analysis.sentimentScore || 0.5,
        category: analysis.category || "geral",
        categoryConfidence: analysis.categoryConfidence || 0.5,
        intent: analysis.intent || "conversar",
        intentConfidence: analysis.intentConfidence || 0.5,
        urgency: analysis.urgency || 0.3,
        urgencyLevel: analysis.urgencyLevel || "low",
        hasNegotiation: analysis.hasNegotiation || false,
        extractedValues: analysis.extractedValues || [],
        extractedProducts: analysis.extractedProducts || [],
        extractedConditions: analysis.extractedConditions || [],
        summary: analysis.summary || "",
        provider: "deepseek",
      };
    } catch (error) {
      console.error("❌ [DEEPSEEK] Erro na análise de KPIs:", error.message);
      this.lastError = error.message;
      throw error;
    }
  }

  /**
   * Verifica status da API
   */
  /**
   * Extrai informações estruturadas de lead a partir das mensagens
   * @param {Array} messages - Array de mensagens
   * @param {Object} context - Contexto adicional
   * @returns {Object} - Informações extraídas do lead
   */
  async extractLeadInfo(messages, context = {}) {
    console.log("🎯 [DEEPSEEK-LEAD] Iniciando extractLeadInfo()");
    console.log(
      `📊 [DEEPSEEK-LEAD] Total de mensagens recebidas: ${messages.length}`
    );
    console.log(
      `👤 [DEEPSEEK-LEAD] Contato: ${context.contactName || "Desconhecido"}`
    );

    if (!this.available) {
      console.error("❌ [DEEPSEEK-LEAD] API não disponível");
      throw new Error("DeepSeek API não disponível");
    }

    try {
      // Contar tipos de mensagens
      const audioCount = messages.filter((m) => m.type === "audio").length;
      const audioWithTranscription = messages.filter(
        (m) => m.type === "audio" && m.audioTranscription
      ).length;
      const textCount = messages.filter(
        (m) => m.content && m.type !== "audio"
      ).length;

      console.log(`📝 [DEEPSEEK-LEAD] Mensagens de texto: ${textCount}`);
      console.log(`🎙️ [DEEPSEEK-LEAD] Áudios totais: ${audioCount}`);
      console.log(
        `✅ [DEEPSEEK-LEAD] Áudios com transcrição: ${audioWithTranscription}`
      );

      // Log das primeiras mensagens para debug
      console.log(`🔍 [DEEPSEEK-LEAD] Estrutura das primeiras 3 mensagens:`);
      messages.slice(0, 3).forEach((m, i) => {
        console.log(`  Msg ${i + 1}:`, {
          type: m.type,
          direction: m.direction,
          hasContent: !!m.content,
          hasAudioTranscription: !!m.audioTranscription,
          contentPreview: m.content?.substring(0, 50),
          audioPreview: m.audioTranscription?.substring(0, 50),
        });
      });

      // Preparar texto da conversa
      const conversationText = messages
        .map((m, idx) => {
          const speaker = m.direction === "received" ? "Cliente" : "Empresa";
          let messageContent = m.content;

          // Se for áudio com transcrição, usar a transcrição
          if (m.type === "audio" && m.audioTranscription) {
            messageContent = `[ÁUDIO TRANSCRITO]: ${m.audioTranscription}`;
            console.log(
              `🎙️ [DEEPSEEK-LEAD] Msg ${
                idx + 1
              } - Áudio transcrito: ${m.audioTranscription.substring(
                0,
                100
              )}...`
            );
          } else if (m.audioTranscription && !messageContent) {
            // Fallback: se tem audioTranscription mas não tem type="audio"
            messageContent = `[ÁUDIO TRANSCRITO]: ${m.audioTranscription}`;
            console.log(
              `🎙️ [DEEPSEEK-LEAD] Msg ${
                idx + 1
              } - Transcrição sem type: ${m.audioTranscription.substring(
                0,
                100
              )}...`
            );
          } else if (m.type === "audio") {
            messageContent = "[Áudio sem transcrição]";
            console.log(
              `⚠️ [DEEPSEEK-LEAD] Msg ${idx + 1} - Áudio SEM transcrição`
            );
          }

          return `${speaker}: ${messageContent}`;
        })
        .join("\n");

      console.log(
        `📄 [DEEPSEEK-LEAD] Tamanho do texto da conversa: ${conversationText.length} caracteres`
      );
      console.log(
        `📝 [DEEPSEEK-LEAD] Prévia da conversa:\n${conversationText.substring(
          0,
          300
        )}...`
      );

      // Criar prompt para extração de informações
      const prompt = `Você é um assistente de análise de leads comerciais. Analise a conversa abaixo e extraia TODAS as informações relevantes do cliente/lead.

CONTATO: ${context.contactName || "Cliente"}
TOTAL DE MENSAGENS: ${messages.length}

CONVERSA:
${conversationText}

EXTRAIA AS SEGUINTES INFORMAÇÕES:

1. PRODUTOS/SERVIÇOS: Quais produtos ou serviços o cliente está interessado? Seja ESPECÍFICO (modelos, marcas, versões)
2. VALORES: Todos os valores mencionados (preços, orçamentos, propostas)
3. INTERESSE: Qual o nível de interesse? (baixo, médio, alto, muito_alto)
4. URGÊNCIA: O cliente tem urgência? (baixa, média, alta, crítica)
5. ESTÁGIO: Em que estágio está a negociação? (contato_inicial, pesquisando, negociando, pronto_comprar, fechado, perdido)
6. NECESSIDADE: Qual a necessidade/problema principal do cliente?
7. ORÇAMENTO: O cliente mencionou orçamento ou faixa de preço?
8. PRAZO: Há algum prazo mencionado?
9. OBJEÇÕES: Quais objeções ou dúvidas o cliente levantou?
10. DECISOR: O cliente é o decisor ou precisa consultar alguém?
11. CONCORRÊNCIA: Mencionou estar consultando concorrentes?
12. PRÓXIMOS PASSOS: Quais foram os próximos passos combinados?

Responda APENAS em formato JSON (sem markdown, sem blocos de código):
{
  "products": ["produto 1 específico", "produto 2 específico"],
  "values": ["R$ 3.500", "R$ 1.200"],
  "totalValue": 4700.00,
  "interestLevel": "alto|médio|baixo",
  "urgencyLevel": "alta|média|baixa",
  "stage": "contato_inicial|pesquisando|negociando|pronto_comprar|fechado|perdido",
  "mainNeed": "Descrição da necessidade principal",
  "budget": "Orçamento mencionado ou 'não mencionado'",
  "deadline": "Prazo mencionado ou 'não mencionado'",
  "objections": ["objeção 1", "objeção 2"],
  "isDecisionMaker": true,
  "checkingCompetitors": false,
  "nextSteps": ["passo 1", "passo 2"],
  "notes": "Observações importantes adicionais",
  "sentiment": "positivo|neutro|negativo",
  "conversionProbability": 0.75
}`;

      console.log("🤖 [DEEPSEEK-LEAD] Enviando requisição para extração...");

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente especializado em análise de leads comerciais. Responda sempre em JSON válido, sem markdown.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
          temperature: 0.5,
          response_format: { type: "json_object" },
        }),
        timeout: 30000,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API Error: ${response.status} - ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      console.log("✅ [DEEPSEEK-LEAD] Resposta recebida da API");
      console.log(
        "📄 [DEEPSEEK-LEAD] Resposta bruta:",
        content.substring(0, 500)
      );

      // Parse do JSON
      let leadInfo;
      try {
        leadInfo = JSON.parse(content);
        console.log("✅ [DEEPSEEK-LEAD] JSON parseado com sucesso");
        console.log(
          "📦 [DEEPSEEK-LEAD] Produtos extraídos:",
          leadInfo.products
        );
        console.log("💰 [DEEPSEEK-LEAD] Valores extraídos:", leadInfo.values);
        console.log("🎯 [DEEPSEEK-LEAD] Necessidade:", leadInfo.mainNeed);
        console.log("⚠️ [DEEPSEEK-LEAD] Objeções:", leadInfo.objections);
        console.log("📋 [DEEPSEEK-LEAD] Próximos passos:", leadInfo.nextSteps);
        console.log("📊 [DEEPSEEK-LEAD] Estágio:", leadInfo.stage);
        console.log("🎭 [DEEPSEEK-LEAD] Sentimento:", leadInfo.sentiment);
      } catch (parseError) {
        console.error(
          "❌ [DEEPSEEK-LEAD] Erro ao parsear JSON:",
          parseError.message
        );
        console.error("📄 [DEEPSEEK-LEAD] Conteúdo completo:", content);
        throw new Error(
          `Erro ao parsear resposta do DeepSeek: ${parseError.message}`
        );
      }

      return {
        products: leadInfo.products || [],
        values: leadInfo.values || [],
        totalValue: leadInfo.totalValue || 0,
        interestLevel: leadInfo.interestLevel || "médio",
        urgencyLevel: leadInfo.urgencyLevel || "média",
        stage: leadInfo.stage || "contato_inicial",
        mainNeed: leadInfo.mainNeed || "",
        budget: leadInfo.budget || "não mencionado",
        deadline: leadInfo.deadline || "não mencionado",
        objections: leadInfo.objections || [],
        isDecisionMaker: leadInfo.isDecisionMaker !== false,
        checkingCompetitors: leadInfo.checkingCompetitors || false,
        nextSteps: leadInfo.nextSteps || [],
        notes: leadInfo.notes || "",
        sentiment: leadInfo.sentiment || "neutro",
        conversionProbability: leadInfo.conversionProbability || 0.5,
        provider: "deepseek",
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ [DEEPSEEK-LEAD] Erro na extração:", error.message);
      this.lastError = error.message;
      throw error;
    }
  }

  getStatus() {
    return {
      available: this.available,
      lastError: this.lastError,
      provider: "deepseek",
      model: this.model,
    };
  }
}

// Singleton
const deepseekService = new DeepSeekService();

// Testar conexão na inicialização
deepseekService.testConnection().then((available) => {
  if (available) {
    console.log("✅ [DEEPSEEK] Serviço inicializado e disponível");
  } else {
    console.warn(
      "⚠️ [DEEPSEEK] Serviço inicializado mas API não está disponível - fallback para IA local"
    );
  }
});

export default deepseekService;
