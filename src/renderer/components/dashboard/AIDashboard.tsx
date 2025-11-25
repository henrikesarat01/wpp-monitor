/**
 * AI Dashboard Component
 *
 * Dashboard com KPIs de Inteligência Artificial
 */

import React, { useEffect, useState } from "react";
import {
  Brain,
  AlertTriangle,
  Target,
  DollarSign,
  Smile,
  Clock,
  CheckCircle,
} from "lucide-react";

interface AIKPIs {
  classification: {
    distribution: Array<{
      category: string;
      count: number;
      percentage: string;
      avgConfidence: number;
    }>;
    conversion: Array<{
      category: string;
      total: number;
      responded: number;
      conversionRate: string;
    }>;
    avgTime: Array<{
      category: string;
      avgMinutes: string;
      conversations: number;
    }>;
  };
  urgency: {
    notResponded: Array<{
      id: string;
      content: string;
      timestamp: string;
      aiUrgency: number;
      aiUrgencyLevel: string;
      contactName: string;
      contactNumber: string;
      waitingMinutes: number;
    }>;
    priorityScore: {
      avgUrgency: string;
      distribution: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
    };
    sla: {
      total: number;
      onTime: number;
      missed: number;
      slaRate: string;
      avgResponseTime: string;
      targetMinutes: number;
    };
  };
  intent: {
    distribution: Array<{
      intent: string;
      count: number;
      percentage: string;
      avgConfidence: number;
    }>;
    conversion: Array<{
      intent: string;
      total: number;
      converted: number;
      conversionRate: string;
    }>;
    journey: Array<{
      from_intent: string;
      to_intent: string;
      count: number;
    }>;
  };
  extraction: {
    monetaryValues: {
      count: number;
      values: Array<{
        messageId: string;
        content: string;
        value: number;
        timestamp: string;
      }>;
      avgTicket: string;
      maxValue: string;
      minValue: string;
    };
    sentiment: Array<{
      sentiment: string;
      count: number;
      percentage: string;
      avgConfidence: number;
    }>;
  };
  summaries: {
    stats: {
      total: number;
      avgCompressionRate: number;
      avgOriginalLength: number;
      avgSummaryLength: number;
      timeSavedMinutes: number;
      timeSavedHours: number;
    };
    recent: Array<{
      id: string;
      contact: string;
      remoteJid: string;
      originalText: string;
      summary: string;
      originalLength: number;
      summaryLength: number;
      compressionRate: number;
      timeSavedSeconds: number;
      timestamp: number;
    }>;
    byContact: Array<{
      contact: string;
      remoteJid: string;
      summaryCount: number;
      avgCompressionRate: number;
      timeSavedMinutes: number;
    }>;
  };
  stats: {
    totalMessages: number;
    analyzedMessages: number;
    analysisRate: string;
    coverage: {
      category: number;
      urgency: number;
      intent: number;
      sentiment: number;
    };
  };
}

const categoryLabels: Record<string, string> = {
  vendas: "Vendas",
  suporte: "Suporte",
  reclamacao: "Reclamação",
  duvida: "Dúvida",
  negociacao: "Negociação",
  outros: "Outros",
};

const intentLabels: Record<string, string> = {
  comprar: "Comprar",
  reclamar: "Reclamar",
  perguntar: "Perguntar",
  cancelar: "Cancelar",
  negociar: "Negociar",
  outros: "Outros",
};

const sentimentEmoji: Record<string, string> = {
  positive: "😊",
  negative: "😠",
  neutral: "😐",
};

const AIDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<AIKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3000/api/ai-kpis?period=${period}`
      );
      const data = await response.json();
      console.log("🤖 [AI Dashboard] KPIs recebidos:", data);
      setKpis(data);
    } catch (error) {
      console.error("❌ [AI Dashboard] Erro ao buscar KPIs:", error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeMessages = async () => {
    try {
      setAnalyzing(true);
      console.log("🤖 [AI Dashboard] Iniciando análise de mensagens...");

      const response = await fetch(
        "http://localhost:3000/api/ai-analyze-messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            limit: 50,
            onlyNew: true,
          }),
        }
      );

      const result = await response.json();
      console.log("✅ [AI Dashboard] Análise concluída:", result);

      alert(
        `✅ Análise concluída!\n\n` +
          `📊 Total: ${result.total}\n` +
          `✅ Analisadas: ${result.analyzed}\n` +
          `❌ Erros: ${result.errors}`
      );

      // Recarregar KPIs após análise
      await fetchKPIs();
    } catch (error) {
      console.error("❌ [AI Dashboard] Erro ao analisar:", error);
      alert("❌ Erro ao analisar mensagens. Verifique o console.");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
    const interval = setInterval(fetchKPIs, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="text-center text-gray-500 py-8">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-600" />
            Dashboard de Inteligência Artificial
          </h1>
          <p className="text-gray-500 mt-1">
            Análise automática de mensagens com IA (DeepSeek + Local)
          </p>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2">
          {/* Botão Analisar Mensagens */}
          <button
            onClick={analyzeMessages}
            disabled={analyzing}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              analyzing
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            <Brain className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing ? "Analisando..." : "Analisar Mensagens"}
          </button>

          {/* Filtro de período */}
          {(["today", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p === "today" && "Hoje"}
              {p === "week" && "Semana"}
              {p === "month" && "Mês"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats gerais */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Mensagens Analisadas</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.stats.analyzedMessages}
              </p>
            </div>
            <Brain className="w-10 h-10 text-purple-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {kpis.stats.analysisRate}% do total
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Urgências Pendentes</p>
              <p className="text-2xl font-bold text-red-600">
                {kpis.urgency.notResponded.length}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Prioridade ≥ 7/10</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">SLA Urgente</p>
              <p className="text-2xl font-bold text-green-600">
                {kpis.urgency.sla.slaRate}%
              </p>
            </div>
            <Clock className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Meta: {kpis.urgency.sla.targetMinutes} min
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ticket Médio</p>
              <p className="text-2xl font-bold text-blue-600">
                R$ {kpis.extraction.monetaryValues.avgTicket}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {kpis.extraction.monetaryValues.count} valores
          </p>
        </div>
      </div>

      {/* Classificação Inteligente */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Classificação Inteligente
          </h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Distribuição */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                Distribuição por Tipo
              </h3>
              <div className="space-y-2">
                {kpis.classification.distribution.map((item) => (
                  <div key={item.category} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">
                          {categoryLabels[item.category] || item.category}
                        </span>
                        <span className="text-gray-600">
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Taxa de Conversão */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                Taxa de Resposta
              </h3>
              <div className="space-y-2">
                {kpis.classification.conversion.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm font-medium">
                      {categoryLabels[item.category] || item.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {item.responded}/{item.total}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          parseFloat(item.conversionRate) >= 80
                            ? "text-green-600"
                            : parseFloat(item.conversionRate) >= 50
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {item.conversionRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tempo Médio */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                Tempo Médio de Atendimento
              </h3>
              <div className="space-y-2">
                {kpis.classification.avgTime.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm font-medium">
                      {categoryLabels[item.category] || item.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-bold text-gray-900">
                        {item.avgMinutes} min
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Urgências */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Mensagens Urgentes Não Respondidas
          </h2>
        </div>
        <div className="p-4">
          {kpis.urgency.notResponded.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>Todas as mensagens urgentes foram respondidas! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {kpis.urgency.notResponded.slice(0, 10).map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    msg.aiUrgencyLevel === "critical"
                      ? "bg-red-50 border-red-600"
                      : "bg-orange-50 border-orange-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-gray-900">
                        {msg.contactName || msg.contactNumber}
                      </span>
                      <span
                        className={`ml-2 px-2 py-1 text-xs font-bold rounded ${
                          msg.aiUrgencyLevel === "critical"
                            ? "bg-red-600 text-white"
                            : "bg-orange-600 text-white"
                        }`}
                      >
                        {msg.aiUrgency}/10
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      Aguardando {Math.round(msg.waitingMinutes)} min
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid Inferior */}
      <div className="grid grid-cols-2 gap-6">
        {/* Análise de Intenção */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Análise de Intenção
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {kpis.intent.distribution.map((item) => (
                <div
                  key={item.intent}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">
                        {intentLabels[item.intent] || item.intent}
                      </span>
                      <span className="text-sm text-gray-600">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sentimento */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Smile className="w-5 h-5 text-green-600" />
              Análise de Sentimento
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {kpis.extraction.sentiment.map((item) => (
                <div key={item.sentiment} className="text-center">
                  <div className="text-4xl mb-2">
                    {sentimentEmoji[item.sentiment] || "😐"}
                  </div>
                  <div className="text-lg font-bold text-gray-900 capitalize">
                    {item.sentiment}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.count} mensagens ({item.percentage}%)
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        item.sentiment === "positive"
                          ? "bg-green-600"
                          : item.sentiment === "negative"
                          ? "bg-red-600"
                          : "bg-gray-600"
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Valores Monetários */}
      {kpis.extraction.monetaryValues.count > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Valores Monetários Mencionados
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Ticket Médio</p>
                <p className="text-xl font-bold text-green-600">
                  R$ {kpis.extraction.monetaryValues.avgTicket}
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Maior Valor</p>
                <p className="text-xl font-bold text-blue-600">
                  R$ {kpis.extraction.monetaryValues.maxValue}
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Menor Valor</p>
                <p className="text-xl font-bold text-purple-600">
                  R$ {kpis.extraction.monetaryValues.minValue}
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {kpis.extraction.monetaryValues.values.slice(0, 10).map((val) => (
                <div
                  key={val.messageId}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <p className="text-sm text-gray-700 flex-1 line-clamp-1">
                    {val.content}
                  </p>
                  <span className="text-sm font-bold text-green-600 ml-4">
                    R$ {val.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Resumos de Conversas */}
      {kpis.summaries && kpis.summaries.stats.total > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              Resumos de Conversas (IA)
            </h2>
          </div>
          <div className="p-4">
            {/* Stats de Resumos */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <p className="text-sm text-gray-600">Total de Resumos</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {kpis.summaries.stats.total}
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Compressão Média</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(kpis.summaries.stats.avgCompressionRate * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Tempo Economizado</p>
                <p className="text-2xl font-bold text-green-600">
                  {kpis.summaries.stats.timeSavedHours.toFixed(1)}h
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {kpis.summaries.stats.timeSavedMinutes.toFixed(0)} minutos
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Tamanho Médio</p>
                <p className="text-xl font-bold text-blue-600">
                  {kpis.summaries.stats.avgSummaryLength} palavras
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  de {kpis.summaries.stats.avgOriginalLength}
                </p>
              </div>
            </div>

            {/* Top Contatos com Mais Economia */}
            {kpis.summaries.byContact.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">
                  Top Economia de Tempo por Contato
                </h3>
                <div className="space-y-2">
                  {kpis.summaries.byContact.slice(0, 5).map((contact) => (
                    <div
                      key={contact.remoteJid}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {contact.contact}
                        </p>
                        <p className="text-xs text-gray-500">
                          {contact.summaryCount} resumos • Compressão média:{" "}
                          {(contact.avgCompressionRate * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                          {contact.timeSavedMinutes.toFixed(1)} min
                        </p>
                        <p className="text-xs text-gray-500">economizados</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumos Recentes */}
            {kpis.summaries.recent.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">
                  Resumos Recentes
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {kpis.summaries.recent.map((summary) => (
                    <div
                      key={summary.id}
                      className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-semibold text-gray-900">
                            {summary.contact}
                          </span>
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                            {summary.compressionRate.toFixed(0)}% menor
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Economizou {summary.timeSavedSeconds}s de leitura
                        </span>
                      </div>

                      {/* Resumo */}
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">
                          📝 Resumo ({summary.summaryLength} palavras):
                        </p>
                        <p className="text-sm text-gray-700 italic">
                          "{summary.summary}"
                        </p>
                      </div>

                      {/* Texto Original (colapsável) */}
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          Ver texto original ({summary.originalLength} palavras)
                        </summary>
                        <p className="text-xs text-gray-600 mt-2 pl-3 border-l-2 border-gray-300">
                          {summary.originalText}
                        </p>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIDashboard;
