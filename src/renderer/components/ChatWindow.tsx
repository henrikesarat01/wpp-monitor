/**
 * ChatWindow Component
 *
 * Janela principal de visualização de mensagens
 */

import React, { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Trash2,
  Sparkles,
  Calendar,
  X,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import MessageItem from "./MessageItem";
import ConversationSummaryModal from "./ConversationSummaryModal";
import ConversationKPIs from "./ConversationKPIs";
import LeadInfoModal from "./LeadInfoModal";

const ChatWindow: React.FC = () => {
  const { selectedContact, selectedAccount, messages, deleteConversation } =
    useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const summaryRequestInProgress = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para filtro de data
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredMessages, setFilteredMessages] = useState(messages);

  // Estados para resumo
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Estado para KPIs
  const [showKPIs, setShowKPIs] = useState(false);

  // Estado para informações do lead
  const [showLeadInfoModal, setShowLeadInfoModal] = useState(false);

  // Estado para exportação
  const [isExporting, setIsExporting] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages]);

  // Aplicar filtro de data
  useEffect(() => {
    if (!startDate && !endDate) {
      setFilteredMessages(messages);
      return;
    }

    const filtered = messages.filter((msg) => {
      const msgDate = new Date(msg.timestamp);
      if (startDate && msgDate < new Date(startDate)) return false;
      if (endDate && msgDate > new Date(endDate)) return false;
      return true;
    });

    setFilteredMessages(filtered);
  }, [messages, startDate, endDate]);

  const handleExportConversation = async () => {
    if (!selectedAccount || !selectedContact) return;

    setIsExporting(true);
    try {
      console.log("📦 [EXPORT] Iniciando exportação...");

      const response = await fetch(
        "http://localhost:3000/api/export-conversation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccount.id,
            contactNumber: selectedContact.number,
            startDate: startDate || null,
            endDate: endDate || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao exportar conversa");
      }

      const data = await response.json();
      console.log("✅ [EXPORT] Dados recebidos:", data);

      // Preparar dados estruturados para PDF
      const exportData = {
        contactName: selectedContact.name || selectedContact.number,
        contactNumber: selectedContact.number,
        exportDate: new Date().toLocaleString("pt-BR"),
        period:
          startDate || endDate
            ? `${
                startDate
                  ? new Date(startDate).toLocaleString("pt-BR")
                  : "início"
              } até ${
                endDate ? new Date(endDate).toLocaleString("pt-BR") : "agora"
              }`
            : null,
        summary: data.summary,
        leadInfo: data.leadInfo,
        analysis: data.analysis,
      };

      // Usar API do Electron para salvar PDF
      const filename = `conversa_${
        selectedContact.name || selectedContact.number
      }_${new Date().toISOString().split("T")[0]}.pdf`;

      const savedPath = await (window as any).electron.saveFile(
        filename,
        JSON.stringify(exportData)
      );

      if (savedPath) {
        console.log("✅ [EXPORT] Arquivo salvo em:", savedPath);
        alert(`✅ Conversa exportada com sucesso!\n\nSalvo em:\n${savedPath}`);
      } else {
        console.log("ℹ️ [EXPORT] Exportação cancelada pelo usuário");
      }
    } catch (error: any) {
      console.error("❌ [EXPORT] Erro:", error);
      alert(`Erro ao exportar conversa: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedAccount || !selectedContact) return;

    console.log("Tentando deletar conversa:", {
      accountId: selectedAccount.id,
      contactNumber: selectedContact.number,
      contactName: selectedContact.name,
    });

    const confirmed = window.confirm(
      `Tem certeza que deseja apagar todas as mensagens da conversa com ${
        selectedContact.name || selectedContact.number
      }?`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteConversation(selectedAccount.id, selectedContact.number);
      console.log("Conversa deletada com sucesso");
    } catch (error) {
      console.error("Erro ao deletar conversa:", error);
      alert("Erro ao deletar conversa");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedAccount || !selectedContact) {
      console.log("⚠️ handleGenerateSummary: Conta ou contato não selecionado");
      return;
    }

    // Prevenir múltiplas chamadas simultâneas
    if (summaryRequestInProgress.current) {
      console.log("⏳ Requisição de resumo já em andamento, ignorando...");
      return;
    }

    console.log("🚀 [SUMMARY] Iniciando geração de resumo...");
    summaryRequestInProgress.current = true;
    setSummaryLoading(true);
    setShowSummaryModal(true);
    setSummaryData(null);

    try {
      console.log("🤖 [SUMMARY] Gerando resumo...", {
        accountId: selectedAccount.id,
        contactNumber: selectedContact.number,
        startDate,
        endDate,
      });

      // Timeout de 60 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("⏰ [SUMMARY] Timeout de 60s atingido, abortando...");
        controller.abort();
      }, 60000);

      console.log("📡 [SUMMARY] Enviando requisição para backend...");
      const response = await fetch(
        "http://localhost:3000/api/conversation-summary",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId: selectedAccount.id,
            contactNumber: selectedContact.number,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      console.log("📡 [SUMMARY] Resposta recebida. Status:", response.status);

      if (!response.ok) {
        console.error("❌ [SUMMARY] Resposta com erro:", response.status);
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao gerar resumo");
      }

      const data = await response.json();
      console.log("✅ [SUMMARY] Resumo recebido com sucesso:", data);
      console.log("✅ [SUMMARY] Atualizando estado com dados do resumo...");

      // Verificar se é cache e mostrar alerta
      if (data.cached && data.noNewMessages) {
        console.log("ℹ️ [SUMMARY] Resumo em cache detectado");
        alert(
          "ℹ️ Resumo já atualizado\n\n" +
            "Não há novas mensagens desde a última análise.\n" +
            "O resumo exibido está atualizado e não foi necessário gerar um novo relatório.\n\n" +
            "✅ Isso economiza chamadas à API!"
        );
      }

      setSummaryData(data);
      console.log("✅ [SUMMARY] Estado atualizado. Modal deve exibir resumo.");
    } catch (error: any) {
      console.error("❌ [SUMMARY] Erro capturado:", error);
      console.error("❌ [SUMMARY] Tipo de erro:", error.name);
      console.error("❌ [SUMMARY] Mensagem:", error.message);
      console.error("❌ [SUMMARY] Stack:", error.stack);

      let errorMessage = "Erro ao gerar resumo da conversa";
      if (error.name === "AbortError") {
        errorMessage = "Tempo esgotado. A conversa pode ser muito longa.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error("❌ [SUMMARY] Exibindo alerta de erro:", errorMessage);
      alert(errorMessage);

      console.log("❌ [SUMMARY] Fechando modal após erro...");
      setShowSummaryModal(false);
      setSummaryData(null);
    } finally {
      console.log("🏁 [SUMMARY] Finalizando requisição...");
      setSummaryLoading(false);
      summaryRequestInProgress.current = false;
      console.log("🏁 [SUMMARY] Flags resetadas. Pronto para nova requisição.");
    }
  };

  const handleClearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setShowDateFilter(false);
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return "Selecione";
    const date = new Date(dateStr);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!selectedAccount) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <MessageCircle size={64} className="mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">Bem-vindo ao IARA</h3>
          <p className="text-sm">
            Inteligência Analítica de Rastreamento Avançado
          </p>
        </div>
      </div>
    );
  }

  if (!selectedContact) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <MessageCircle size={64} className="mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">
            Nenhuma conversa selecionada
          </h3>
          <p className="text-sm">Escolha um contato para ver as mensagens</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {selectedContact.name?.[0]?.toUpperCase() ||
                selectedContact.number[0]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                {selectedContact.name || selectedContact.number}
              </h3>
              <p className="text-xs text-gray-500">{selectedContact.number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportConversation}
              disabled={isExporting || filteredMessages.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              title="Exportar Resumo + Info Lead + Análise"
            >
              <Download size={18} />
              <span className="text-sm font-medium">
                {isExporting ? "Exportando..." : "Exportar"}
              </span>
            </button>
            <button
              onClick={() => setShowKPIs(!showKPIs)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                showKPIs
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title="Análise da conversa"
            >
              <BarChart3 size={18} />
              <span className="text-sm font-medium">Análise</span>
              {showKPIs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={() => setShowLeadInfoModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
              title="Informações comerciais"
            >
              <FileText size={18} />
              <span className="text-sm font-medium">Info Lead</span>
            </button>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`p-2 rounded-lg transition-colors ${
                startDate || endDate
                  ? "bg-blue-500 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              title="Filtrar por data"
            >
              <Calendar size={20} />
            </button>
            <button
              onClick={handleGenerateSummary}
              disabled={filteredMessages.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Gerar resumo com IA"
            >
              <Sparkles size={18} />
              <span className="text-sm font-medium">Resumir</span>
            </button>
            <button
              onClick={handleDeleteConversation}
              disabled={isDeleting}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Apagar conversa"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Filtro de Data */}
        {showDateFilter && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">
                Filtrar Mensagens por Período
              </h4>
              <button
                onClick={() => setShowDateFilter(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Data Inicial
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Data Final
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Atalhos rápidos */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const now = new Date();
                  const today = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                  );
                  setStartDate(today.toISOString().slice(0, 16));
                  setEndDate(now.toISOString().slice(0, 16));
                }}
                className="px-3 py-1 text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const yesterday = new Date(
                    now.getTime() - 24 * 60 * 60 * 1000
                  );
                  const yesterdayStart = new Date(
                    yesterday.getFullYear(),
                    yesterday.getMonth(),
                    yesterday.getDate()
                  );
                  setStartDate(yesterdayStart.toISOString().slice(0, 16));
                  setEndDate(now.toISOString().slice(0, 16));
                }}
                className="px-3 py-1 text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Últimas 24h
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const weekAgo = new Date(
                    now.getTime() - 7 * 24 * 60 * 60 * 1000
                  );
                  setStartDate(weekAgo.toISOString().slice(0, 16));
                  setEndDate(now.toISOString().slice(0, 16));
                }}
                className="px-3 py-1 text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                7 dias
              </button>
              {(startDate || endDate) && (
                <button
                  onClick={handleClearDateFilter}
                  className="px-3 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Limpar Filtro
                </button>
              )}
            </div>

            {/* Info do filtro ativo */}
            {(startDate || endDate) && (
              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                <Clock size={14} />
                <span>
                  {startDate && `De ${formatDateForDisplay(startDate)}`}
                  {startDate && endDate && " "}
                  {endDate && `até ${formatDateForDisplay(endDate)}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPIs da Conversa - Mostra apenas se showKPIs for true */}
      {selectedAccount && selectedContact && showKPIs && (
        <div className="px-4 animate-slideDown">
          <ConversationKPIs
            accountId={selectedAccount.id}
            contactNumber={selectedContact.number}
          />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm">
              {messages.length === 0
                ? "Nenhuma mensagem ainda"
                : "Nenhuma mensagem no período selecionado"}
            </p>
          </div>
        ) : (
          <>
            {filteredMessages.map((message, index) => {
              // Calcular tempo de resposta
              let responseTime = null;

              // Se esta mensagem é do usuário (fromMe = true)
              if (message.direction === "sent") {
                // Procurar a última mensagem do cliente antes desta
                for (let i = index - 1; i >= 0; i--) {
                  const prevMsg = filteredMessages[i];
                  if (prevMsg.direction === "received") {
                    // Calcular diferença em minutos
                    const diff =
                      new Date(message.timestamp).getTime() -
                      new Date(prevMsg.timestamp).getTime();
                    const minutes = Math.floor(diff / 60000);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);

                    if (days > 0) {
                      responseTime = `${days}d ${hours % 24}h`;
                    } else if (hours > 0) {
                      responseTime = `${hours}h ${minutes % 60}min`;
                    } else if (minutes > 0) {
                      responseTime = `${minutes}min`;
                    } else {
                      responseTime = "< 1min";
                    }
                    break;
                  }
                }
              }

              return (
                <React.Fragment key={message.id}>
                  {responseTime && (
                    <div className="flex justify-center my-2">
                      <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Clock size={12} />
                        <span>Tempo de resposta: {responseTime}</span>
                      </div>
                    </div>
                  )}
                  <MessageItem message={message} />
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <p className="text-xs text-gray-400 text-center">
          Modo somente leitura •{" "}
          {filteredMessages.length !== messages.length
            ? `${filteredMessages.length} de ${messages.length} mensagens (filtradas)`
            : `${messages.length} mensagens`}
        </p>
      </div>

      {/* Modal de Resumo */}
      <ConversationSummaryModal
        isOpen={showSummaryModal}
        onClose={() => {
          console.log("🔒 Fechando modal de resumo");
          setShowSummaryModal(false);
          setSummaryData(null);
          setSummaryLoading(false);
          summaryRequestInProgress.current = false;
        }}
        summary={summaryData}
        loading={summaryLoading}
        contactName={selectedContact.name || selectedContact.number}
      />

      {/* Modal de Informações do Lead */}
      <LeadInfoModal
        isOpen={showLeadInfoModal}
        onClose={() => setShowLeadInfoModal(false)}
        accountId={selectedAccount.id}
        contactNumber={selectedContact.number}
        contactName={selectedContact.name || selectedContact.number}
      />
    </div>
  );
};

export default ChatWindow;
