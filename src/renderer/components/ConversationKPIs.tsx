/**
 * ConversationKPIs Component
 *
 * KPIs específicos para cada conversa individual
 */

import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Clock,
  DollarSign,
  Tag,
  AlertTriangle,
  CheckCircle,
  Smile,
  Frown,
  Meh,
  Target,
  MessageCircle,
} from "lucide-react";

interface ConversationKPIsProps {
  accountId: string;
  contactNumber: string;
}

interface KPIData {
  sentiment: {
    label: string;
    score: number;
    emoji: string;
    color: string;
  };
  responseTime: {
    avg: number; // minutos
    last: number;
    fastest: number;
    slowest: number;
    status: "fast" | "normal" | "slow";
  };
  status: {
    hasUnresponded: boolean;
    lastMessageDirection: "sent" | "received";
    waitingMinutes: number;
  };
  category: {
    name: string;
    confidence: number;
    icon: string;
  };
  urgency: {
    level: string;
    score: number;
    color: string;
  };
  extraction: {
    values: number[];
    totalValue: number;
    hasNegotiation: boolean;
    emails: string[];
    phones: string[];
  };
  engagement: {
    responseRate: number; // % de mensagens do cliente que foram respondidas
    avgClientLength: number;
    avgCompanyLength: number;
    clientEngagement: "high" | "medium" | "low";
  };
  timing: {
    firstMessageTime: string;
    lastMessageTime: string;
    conversationDuration: number; // em horas
    mostActiveHour: number;
    mostActiveDay: string;
  };
  intent: {
    primary: string;
    confidence: number;
    secondary?: string;
  };
  stats: {
    totalMessages: number;
    clientMessages: number;
    companyMessages: number;
    avgMessageLength: number;
    mediaMessages: number;
    longestMessage: number;
  };
}

const ConversationKPIs: React.FC<ConversationKPIsProps> = ({
  accountId,
  contactNumber,
}) => {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKPIs();
  }, [accountId, contactNumber]);

  const loadKPIs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:3000/api/conversation-kpis?accountId=${accountId}&contactNumber=${encodeURIComponent(
          contactNumber
        )}`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar KPIs");
      }

      const data = await response.json();
      setKpis(data);
    } catch (err: any) {
      console.error("❌ [KPIs] Erro:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-4">
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm text-blue-700 font-medium">
              Analisando conversa com IA...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !kpis) {
    return null; // Não mostrar nada se houver erro
  }

  const getSentimentIcon = (emoji: string) => {
    if (emoji === "😊") return <Smile className="w-4 h-4" />;
    if (emoji === "😠") return <Frown className="w-4 h-4" />;
    return <Meh className="w-4 h-4" />;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              Análise Inteligente
            </h3>
            <p className="text-xs text-gray-500">
              Insights com IA • {kpis.stats.totalMessages} mensagens
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {/* Sentimento */}
        <div
          className={`p-3 rounded-lg border ${
            kpis.sentiment.color === "green"
              ? "bg-green-50 border-green-200"
              : kpis.sentiment.color === "red"
              ? "bg-red-50 border-red-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {getSentimentIcon(kpis.sentiment.emoji)}
            <span className="text-xs font-medium text-gray-700">
              Sentimento
            </span>
          </div>
          <p
            className={`text-sm font-bold ${
              kpis.sentiment.color === "green"
                ? "text-green-700"
                : kpis.sentiment.color === "red"
                ? "text-red-700"
                : "text-gray-700"
            }`}
          >
            {kpis.sentiment.label}
          </p>
          <p className="text-xs text-gray-600">
            {(kpis.sentiment.score * 100).toFixed(0)}% confiança
          </p>
        </div>

        {/* Tempo de Resposta */}
        <div
          className={`p-3 rounded-lg border ${
            kpis.responseTime.status === "fast"
              ? "bg-green-50 border-green-200"
              : kpis.responseTime.status === "slow"
              ? "bg-yellow-50 border-yellow-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium text-gray-700">
              Tempo Resp.
            </span>
          </div>
          <p
            className={`text-sm font-bold ${
              kpis.responseTime.status === "fast"
                ? "text-green-700"
                : kpis.responseTime.status === "slow"
                ? "text-yellow-700"
                : "text-blue-700"
            }`}
          >
            {formatTime(kpis.responseTime.avg)}
          </p>
          <p className="text-xs text-gray-600">média</p>
        </div>

        {/* Status */}
        <div
          className={`p-3 rounded-lg border ${
            kpis.status.hasUnresponded
              ? "bg-red-50 border-red-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {kpis.status.hasUnresponded ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span className="text-xs font-medium text-gray-700">Status</span>
          </div>
          <p
            className={`text-sm font-bold ${
              kpis.status.hasUnresponded ? "text-red-700" : "text-green-700"
            }`}
          >
            {kpis.status.hasUnresponded ? "Aguardando" : "Respondida"}
          </p>
          {kpis.status.hasUnresponded && (
            <p className="text-xs text-gray-600">
              há {formatTime(kpis.status.waitingMinutes)}
            </p>
          )}
        </div>

        {/* Categoria */}
        <div className="p-3 rounded-lg border bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4" />
            <span className="text-xs font-medium text-gray-700">Categoria</span>
          </div>
          <p className="text-sm font-bold text-purple-700">
            {kpis.category.icon} {kpis.category.name}
          </p>
          <p className="text-xs text-gray-600">
            {(kpis.category.confidence * 100).toFixed(0)}% confiança
          </p>
        </div>

        {/* Urgência */}
        <div
          className={`p-3 rounded-lg border ${
            kpis.urgency.color === "red"
              ? "bg-red-50 border-red-200"
              : kpis.urgency.color === "yellow"
              ? "bg-yellow-50 border-yellow-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium text-gray-700">Urgência</span>
          </div>
          <p
            className={`text-sm font-bold ${
              kpis.urgency.color === "red"
                ? "text-red-700"
                : kpis.urgency.color === "yellow"
                ? "text-yellow-700"
                : "text-blue-700"
            }`}
          >
            {kpis.urgency.level}
          </p>
          <p className="text-xs text-gray-600">
            {(kpis.urgency.score * 100).toFixed(0)}% score
          </p>
        </div>

        {/* Valores Mencionados */}
        {kpis.extraction.values.length > 0 && (
          <div className="p-3 rounded-lg border bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium text-gray-700">Valores</span>
            </div>
            <p className="text-sm font-bold text-green-700">
              R$ {kpis.extraction.totalValue.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600">
              {kpis.extraction.values.length}{" "}
              {kpis.extraction.values.length === 1 ? "valor" : "valores"}
            </p>
          </div>
        )}

        {/* Estatísticas */}
        <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium text-gray-700">Mensagens</span>
          </div>
          <p className="text-sm font-bold text-gray-700">
            {kpis.stats.totalMessages} total
          </p>
          <p className="text-xs text-gray-600">
            {kpis.stats.clientMessages} cliente / {kpis.stats.companyMessages}{" "}
            empresa
          </p>
        </div>

        {/* Tamanho médio de mensagem */}
        {kpis.stats.avgMessageLength > 0 && (
          <div className="p-3 rounded-lg border bg-indigo-50 border-indigo-200">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4" />
              <span className="text-xs font-medium text-gray-700">
                Tamanho Médio
              </span>
            </div>
            <p className="text-sm font-bold text-indigo-700">
              {Math.round(kpis.stats.avgMessageLength)} chars
            </p>
            <p className="text-xs text-gray-600">por mensagem</p>
          </div>
        )}

        {/* Taxa de Engajamento */}
        <div
          className={`p-3 rounded-lg border ${
            kpis.engagement.clientEngagement === "high"
              ? "bg-green-50 border-green-200"
              : kpis.engagement.clientEngagement === "low"
              ? "bg-red-50 border-red-200"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium text-gray-700">
              Engajamento
            </span>
          </div>
          <p
            className={`text-sm font-bold ${
              kpis.engagement.clientEngagement === "high"
                ? "text-green-700"
                : kpis.engagement.clientEngagement === "low"
                ? "text-red-700"
                : "text-yellow-700"
            }`}
          >
            {kpis.engagement.responseRate.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-600">taxa de resposta</p>
        </div>

        {/* Duração da Conversa */}
        {kpis.timing.conversationDuration > 0 && (
          <div className="p-3 rounded-lg border bg-cyan-50 border-cyan-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium text-gray-700">Duração</span>
            </div>
            <p className="text-sm font-bold text-cyan-700">
              {kpis.timing.conversationDuration < 1
                ? `${Math.round(kpis.timing.conversationDuration * 60)} min`
                : kpis.timing.conversationDuration < 24
                ? `${kpis.timing.conversationDuration.toFixed(1)}h`
                : `${Math.round(kpis.timing.conversationDuration / 24)}d`}
            </p>
            <p className="text-xs text-gray-600">conversa ativa</p>
          </div>
        )}

        {/* Intenção Principal */}
        {kpis.intent.primary && (
          <div className="p-3 rounded-lg border bg-orange-50 border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium text-gray-700">
                Intenção
              </span>
            </div>
            <p className="text-sm font-bold text-orange-700">
              {kpis.intent.primary}
            </p>
            <p className="text-xs text-gray-600">
              {(kpis.intent.confidence * 100).toFixed(0)}% confiança
            </p>
          </div>
        )}

        {/* Tempo de Resposta Mais Rápido */}
        {kpis.responseTime.fastest > 0 && (
          <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium text-gray-700">
                Mais Rápido
              </span>
            </div>
            <p className="text-sm font-bold text-emerald-700">
              {formatTime(kpis.responseTime.fastest)}
            </p>
            <p className="text-xs text-gray-600">melhor resposta</p>
          </div>
        )}

        {/* Emails Encontrados */}
        {kpis.extraction.emails.length > 0 && (
          <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium text-gray-700">Emails</span>
            </div>
            <p className="text-sm font-bold text-blue-700">
              {kpis.extraction.emails.length}
            </p>
            <p className="text-xs text-gray-600">encontrados</p>
          </div>
        )}

        {/* Telefones Encontrados */}
        {kpis.extraction.phones.length > 0 && (
          <div className="p-3 rounded-lg border bg-violet-50 border-violet-200">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium text-gray-700">
                Telefones
              </span>
            </div>
            <p className="text-sm font-bold text-violet-700">
              {kpis.extraction.phones.length}
            </p>
            <p className="text-xs text-gray-600">encontrados</p>
          </div>
        )}

        {/* Mensagens com Mídia */}
        {kpis.stats.mediaMessages > 0 && (
          <div className="p-3 rounded-lg border bg-pink-50 border-pink-200">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium text-gray-700">Mídia</span>
            </div>
            <p className="text-sm font-bold text-pink-700">
              {kpis.stats.mediaMessages}
            </p>
            <p className="text-xs text-gray-600">
              {(
                (kpis.stats.mediaMessages / kpis.stats.totalMessages) *
                100
              ).toFixed(0)}
              %
            </p>
          </div>
        )}

        {/* Horário Mais Ativo */}
        {kpis.timing.mostActiveHour >= 0 && (
          <div className="p-3 rounded-lg border bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium text-gray-700">
                Horário Ativo
              </span>
            </div>
            <p className="text-sm font-bold text-amber-700">
              {kpis.timing.mostActiveHour}h
            </p>
            <p className="text-xs text-gray-600">mais mensagens</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationKPIs;
