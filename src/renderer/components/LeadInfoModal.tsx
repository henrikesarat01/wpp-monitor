/**
 * LeadInfoModal Component
 *
 * Modal para exibir informações comerciais extraídas automaticamente da conversa
 */

import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  FileText,
  DollarSign,
  Tag,
  TrendingUp,
  AlertCircle,
  Package,
  Clock,
  Target,
} from "lucide-react";

interface LeadInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  contactNumber: string;
  contactName: string;
}

interface ExtractedInfo {
  products: string[];
  values: string[];
  totalValue: number;
  stage: string;
  priority: string;
  keyPoints: string[];
  sentiment: string;
  sentimentScore: number;
  intent: string;
  urgency: string;
  lastUpdate: string;
  messageCount: number;
}

const LeadInfoModal: React.FC<LeadInfoModalProps> = ({
  isOpen,
  onClose,
  accountId,
  contactNumber,
  contactName,
}) => {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Carregar informações extraídas
  useEffect(() => {
    if (isOpen) {
      loadExtractedInfo();
    }
  }, [isOpen, accountId, contactNumber]);

  const loadExtractedInfo = async () => {
    setLoading(true);
    setError(null);

    console.log("🔍 [INFO-LEADS] Iniciando carregamento de informações...");
    console.log("🔍 [INFO-LEADS] Account ID:", accountId);
    console.log("🔍 [INFO-LEADS] Contact Number:", contactNumber);

    try {
      // Primeiro tenta carregar cache via GET
      console.log("📡 [INFO-LEADS] Tentando carregar cache via GET...");
      const response = await fetch(
        `http://localhost:3000/api/lead-info/extract?accountId=${accountId}&contactNumber=${contactNumber}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📦 [INFO-LEADS] Resposta recebida:", data);
        console.log("🔍 [INFO-LEADS] Provider usado:", data.info?.provider);
        console.log("💾 [INFO-LEADS] Veio do cache?", data.info?.cached);
        console.log(
          "📊 [INFO-LEADS] Produtos encontrados:",
          data.info?.products
        );
        console.log("💰 [INFO-LEADS] Valores encontrados:", data.info?.values);
        console.log(
          "🎯 [INFO-LEADS] Necessidade principal:",
          data.info?.mainNeed
        );
        console.log("⚠️ [INFO-LEADS] Objeções:", data.info?.objections);
        console.log("📋 [INFO-LEADS] Próximos passos:", data.info?.nextSteps);
        console.log("📝 [INFO-LEADS] Notas:", data.info?.notes);
        console.log(
          "📈 [INFO-LEADS] Total de mensagens:",
          data.info?.messageCount
        );

        setExtractedInfo(data.info);

        // Se não veio do cache e não usou DeepSeek, fazer análise completa
        if (!data.info?.cached && data.info?.provider !== "deepseek") {
          console.log(
            "⚠️ [INFO-LEADS] Análise local detectada, forçando análise com DeepSeek..."
          );
          await handleReExtract();
        }
      } else {
        throw new Error("Erro ao carregar informações");
      }
    } catch (err) {
      console.error("❌ [INFO-LEADS] Erro ao carregar informações:", err);
      setError("Erro ao carregar informações extraídas");
    } finally {
      setLoading(false);
    }
  };

  const handleReExtract = async () => {
    setExtracting(true);
    setError(null);

    console.log("🔄 [INFO-LEADS] Forçando re-extração com DeepSeek...");
    console.log("📡 [INFO-LEADS] Account ID:", accountId);
    console.log("📡 [INFO-LEADS] Contact Number:", contactNumber);

    try {
      const response = await fetch(
        "http://localhost:3000/api/lead-info/extract",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId,
            contactNumber,
            forceRefresh: true,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ [INFO-LEADS] Re-extração concluída!");
        console.log("📦 [INFO-LEADS] Nova resposta:", data);
        console.log("🔍 [INFO-LEADS] Provider usado:", data.info?.provider);
        console.log("📊 [INFO-LEADS] Produtos:", data.info?.products);
        console.log("💰 [INFO-LEADS] Valores:", data.info?.values);
        console.log("🎯 [INFO-LEADS] Necessidade:", data.info?.mainNeed);
        console.log("⚠️ [INFO-LEADS] Objeções:", data.info?.objections);
        console.log("📋 [INFO-LEADS] Próximos passos:", data.info?.nextSteps);

        setExtractedInfo(data.info);
      } else {
        const errorText = await response.text();
        console.error("❌ [INFO-LEADS] Erro HTTP:", response.status, errorText);
        throw new Error("Erro ao extrair informações");
      }
    } catch (err) {
      console.error("❌ [INFO-LEADS] Erro ao extrair informações:", err);
      setError("Erro ao extrair informações");
    } finally {
      setExtracting(false);
    }
  };

  const getStageLabel = (stage: string) => {
    const stages: Record<string, string> = {
      initial_contact: "Contato Inicial",
      interested: "Interessado",
      proposal_sent: "Proposta Enviada",
      negotiation: "Em Negociação",
      closed_won: "Fechado - Ganho",
      closed_lost: "Fechado - Perdido",
    };
    return stages[stage] || stage;
  };

  const getSentimentColor = (sentiment: string) => {
    const colors: Record<string, string> = {
      positivo: "text-green-600",
      neutro: "text-gray-600",
      negativo: "text-red-600",
    };
    return colors[sentiment] || colors.neutro;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  Informações Comerciais Extraídas
                </h2>
                <p className="text-sm text-blue-100">
                  {contactName} • {contactNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReExtract}
                disabled={extracting}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                title="Atualizar extração"
              >
                <RefreshCw
                  size={20}
                  className={extracting ? "animate-spin" : ""}
                />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-600">
              <AlertCircle size={48} className="mb-4" />
              <p>{error}</p>
              <button
                onClick={loadExtractedInfo}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Tentar novamente
              </button>
            </div>
          ) : !extractedInfo ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>Nenhuma informação disponível</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Estágio */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Target size={18} />
                    <span className="text-sm font-semibold">Estágio</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">
                    {getStageLabel(extractedInfo.stage)}
                  </p>
                </div>

                {/* Urgência */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-700 mb-2">
                    <AlertCircle size={18} />
                    <span className="text-sm font-semibold">Urgência</span>
                  </div>
                  <p className="text-lg font-bold text-purple-900 capitalize">
                    {extractedInfo.urgency}
                  </p>
                </div>
              </div>

              {/* Produtos Solicitados */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-700 mb-3">
                  <Package size={18} />
                  <span className="font-semibold">
                    Produtos/Serviços Mencionados pelo Cliente
                  </span>
                </div>
                {extractedInfo.products.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {extractedInfo.products.map((product, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Nenhum produto específico detectado nas mensagens
                  </p>
                )}
              </div>

              {/* Valores Mencionados */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-3">
                  <DollarSign size={18} />
                  <span className="font-semibold">
                    Valores/Preços Discutidos
                  </span>
                </div>
                {extractedInfo.values.length > 0 ? (
                  <div className="space-y-2">
                    {extractedInfo.values.map((value, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 bg-white border border-green-300 rounded-lg text-sm font-medium"
                      >
                        {value}
                      </div>
                    ))}
                    {extractedInfo.totalValue > 0 && (
                      <div className="pt-2 border-t border-green-300">
                        <p className="text-lg font-bold text-green-900">
                          Total estimado: R${" "}
                          {extractedInfo.totalValue.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Nenhum valor ou preço detectado na conversa
                  </p>
                )}
              </div>

              {/* Pontos-Chave */}
              {extractedInfo.keyPoints.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-700 mb-3">
                    <Tag size={18} />
                    <span className="font-semibold">Pontos-Chave</span>
                  </div>
                  <ul className="space-y-2">
                    {extractedInfo.keyPoints.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="text-yellow-600 mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Análise de Sentimento e Intenção */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <TrendingUp size={18} />
                    <span className="text-sm font-semibold">Sentimento</span>
                  </div>
                  <p
                    className={`text-lg font-bold capitalize ${getSentimentColor(
                      extractedInfo.sentiment
                    )}`}
                  >
                    {extractedInfo.sentiment}
                  </p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${extractedInfo.sentimentScore * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <Target size={18} />
                    <span className="text-sm font-semibold">Intenção</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 capitalize">
                    {extractedInfo.intent}
                  </p>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-700 mb-3">
                  <Clock size={18} />
                  <span className="font-semibold">Informações Adicionais</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total de mensagens:</span>
                    <p className="font-semibold text-gray-900">
                      {extractedInfo.messageCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Última atualização:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(extractedInfo.lastUpdate).toLocaleString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 Informações extraídas automaticamente das mensagens
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadInfoModal;
