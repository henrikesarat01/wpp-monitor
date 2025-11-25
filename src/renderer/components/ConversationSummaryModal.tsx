/**
 * ConversationSummaryModal Component
 *
 * Modal para exibir resumo de conversa gerado por IA
 */

import React from "react";
import {
  X,
  MessageSquare,
  Calendar,
  TrendingUp,
  FileText,
  Sparkles,
} from "lucide-react";

interface ConversationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: {
    summary: string;
    messageCount: number;
    period: {
      startDate?: string;
      endDate?: string;
    };
    sentiment?: string;
    sentimentScore?: number;
    sentimentReason?: string;
    intent?: string;
    intentConfidence?: number;
    highlights?: string[];
    conclusion?: string;
    urgencyLevel?: string;
    suggestedActions?: string[];
    extractedInfo?: {
      emails: string[];
      phones: string[];
      values: number[];
    };
    conversationLength?: number;
    compressionRate?: number;
    provider?: string;
    cached?: boolean;
    noNewMessages?: boolean;
  } | null;
  loading: boolean;
  contactName: string;
}

const ConversationSummaryModal: React.FC<ConversationSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  loading,
  contactName,
}) => {
  if (!isOpen) return null;

  console.log(
    "🎨 [MODAL] Renderizando modal. Loading:",
    loading,
    "Summary:",
    summary
  );

  const formatDate = (dateStr?: string) => {
    try {
      if (!dateStr) return "Não especificado";
      return new Date(dateStr).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("❌ [MODAL] Erro ao formatar data:", error);
      return "Data inválida";
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "text-green-600 bg-green-50";
      case "negative":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getSentimentLabel = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "Positivo";
      case "negative":
        return "Negativo";
      default:
        return "Neutro";
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Resumo da Conversa
                </h2>
                <p className="text-sm text-gray-500">{contactName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                <p className="text-gray-600">Gerando resumo com IA...</p>
                <p className="text-sm text-gray-400 mt-2">
                  Analisando mensagens e contexto
                </p>
              </div>
            ) : summary ? (
              <div className="space-y-6">
                {/* Banner de Cache */}
                {summary.cached && summary.noNewMessages && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-800">
                        📋 Resumo já atualizado
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Não há novas mensagens desde a última análise. Este
                        resumo está atualizado e não foi necessário gerar um
                        novo relatório.
                      </p>
                    </div>
                  </div>
                )}

                {/* Período */}
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Período Analisado
                    </p>
                    <p className="text-xs text-blue-700">
                      {formatDate(summary?.period?.startDate)} até{" "}
                      {formatDate(summary?.period?.endDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {summary?.messageCount || 0}
                    </p>
                    <p className="text-xs text-blue-700">mensagens</p>
                  </div>
                </div>

                {/* Sentimento */}
                {summary?.sentiment && (
                  <div
                    className={`flex items-center gap-4 p-4 rounded-lg ${getSentimentColor(
                      summary.sentiment
                    )}`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Sentimento Geral</p>
                      <p className="text-xs opacity-80">
                        {getSentimentLabel(summary.sentiment)}
                      </p>
                    </div>
                    {summary?.sentimentScore && (
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {((summary.sentimentScore || 0) * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs opacity-80">confiança</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Resumo */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">
                      Resumo Gerado por IA
                    </h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {summary?.summary || "Nenhum resumo disponível"}
                  </p>
                  {summary?.compressionRate && (
                    <p className="mt-4 text-xs text-gray-500">
                      Taxa de compressão:{" "}
                      {(summary.compressionRate || 0).toFixed(1)}% • Original:{" "}
                      {summary?.conversationLength || 0} caracteres
                    </p>
                  )}
                </div>

                {/* Informações Extraídas */}
                {summary?.extractedInfo &&
                  ((summary.extractedInfo?.emails?.length || 0) > 0 ||
                    (summary.extractedInfo?.phones?.length || 0) > 0 ||
                    (summary.extractedInfo?.values?.length || 0) > 0) && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                        <h4 className="font-medium text-gray-900 text-sm">
                          Informações Extraídas
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {(summary.extractedInfo?.emails?.length || 0) > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              E-mails:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(summary.extractedInfo?.emails || []).map(
                                (email, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                                  >
                                    {email}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        {(summary.extractedInfo?.phones?.length || 0) > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Telefones:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(summary.extractedInfo?.phones || []).map(
                                (phone, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                                  >
                                    {phone}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        {(summary.extractedInfo?.values?.length || 0) > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              💵 Valores Monetários
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(summary.extractedInfo?.values || []).map(
                                (value, index) => (
                                  <span
                                    key={index}
                                    className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded"
                                  >
                                    R$ {value.toFixed(2)}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Intenção e Contexto (Novos campos DeepSeek) */}
                {(summary?.intent ||
                  summary?.highlights ||
                  summary?.conclusion) && (
                  <div className="space-y-3">
                    {/* Intenção */}
                    {summary?.intent && (
                      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-indigo-900 text-sm">
                            🎯 Intenção do Cliente
                          </h4>
                          {summary?.intentConfidence && (
                            <span className="text-xs text-indigo-600">
                              {(summary.intentConfidence * 100).toFixed(0)}%
                              confiança
                            </span>
                          )}
                        </div>
                        <p className="text-indigo-800">{summary.intent}</p>
                      </div>
                    )}

                    {/* Destaques */}
                    {summary?.highlights && summary.highlights.length > 0 && (
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <h4 className="font-semibold text-yellow-900 text-sm mb-2">
                          ⭐ Pontos-Chave
                        </h4>
                        <ul className="space-y-1">
                          {summary.highlights.map((highlight, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-yellow-800 flex items-start gap-2"
                            >
                              <span className="text-yellow-600 mt-0.5">•</span>
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Conclusão */}
                    {summary?.conclusion && (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <h4 className="font-semibold text-green-900 text-sm mb-2">
                          ✅ Conclusão
                        </h4>
                        <p className="text-sm text-green-800">
                          {summary.conclusion}
                        </p>
                      </div>
                    )}

                    {/* Ações Sugeridas */}
                    {summary?.suggestedActions &&
                      summary.suggestedActions.length > 0 && (
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <h4 className="font-semibold text-orange-900 text-sm mb-2">
                            💡 Ações Sugeridas
                          </h4>
                          <ul className="space-y-1">
                            {summary.suggestedActions.map((action, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-orange-800 flex items-start gap-2"
                              >
                                <span className="text-orange-600 mt-0.5">
                                  →
                                </span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Nível de Urgência */}
                    {summary?.urgencyLevel &&
                      summary.urgencyLevel !== "low" && (
                        <div
                          className={`rounded-lg p-4 border ${
                            summary.urgencyLevel === "critical"
                              ? "bg-red-50 border-red-200"
                              : summary.urgencyLevel === "high"
                              ? "bg-orange-50 border-orange-200"
                              : "bg-yellow-50 border-yellow-200"
                          }`}
                        >
                          <h4
                            className={`font-semibold text-sm mb-1 ${
                              summary.urgencyLevel === "critical"
                                ? "text-red-900"
                                : summary.urgencyLevel === "high"
                                ? "text-orange-900"
                                : "text-yellow-900"
                            }`}
                          >
                            ⚠️ Nível de Urgência:{" "}
                            {summary.urgencyLevel === "critical"
                              ? "Crítico"
                              : summary.urgencyLevel === "high"
                              ? "Alto"
                              : "Médio"}
                          </h4>
                          <p
                            className={`text-sm ${
                              summary.urgencyLevel === "critical"
                                ? "text-red-800"
                                : summary.urgencyLevel === "high"
                                ? "text-orange-800"
                                : "text-yellow-800"
                            }`}
                          >
                            Esta conversa requer atenção prioritária
                          </p>
                        </div>
                      )}
                  </div>
                )}

                {/* Provider Badge */}
                {summary?.provider && (
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      <Sparkles className="w-3 h-3" />
                      {summary.provider === "deepseek"
                        ? "Análise DeepSeek"
                        : "Análise Local"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                <p>Nenhum resumo disponível</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConversationSummaryModal;
