/**
 * ChatList Component
 *
 * Lista de conversas/contatos
 */

import React from "react";
import { MessageSquare, Search, Clock } from "lucide-react";
import { useApp } from "../context/AppContext";

type TimeFilter = "all" | "1h" | "2h" | "5h" | "12h" | "24h";

const ChatList: React.FC = () => {
  const { contacts, selectedContact, setSelectedContact, selectedAccount } =
    useApp();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("all");

  const getHoursAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const msgTime = new Date(timestamp).getTime();
    return (now - msgTime) / (1000 * 60 * 60); // horas
  };

  const filteredContacts = contacts.filter((contact: any) => {
    // Filtro de busca
    const matchesSearch =
      contact.number.includes(searchTerm) ||
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Se filtro for "Todos", mostrar todos que passaram na busca
    if (timeFilter === "all") return true;

    // Para filtros de tempo, APENAS mostrar mensagens não respondidas
    if (contact.lastMessageDirection !== "received") return false;
    if (!contact.lastMessageTime) return false;

    const hoursAgo = getHoursAgo(contact.lastMessageTime);

    // Aplicar intervalos específicos
    switch (timeFilter) {
      case "1h":
        return hoursAgo >= 1 && hoursAgo < 2;
      case "2h":
        return hoursAgo >= 2 && hoursAgo < 5;
      case "5h":
        return hoursAgo >= 5 && hoursAgo < 12;
      case "12h":
        return hoursAgo >= 12 && hoursAgo < 24;
      case "24h":
        return hoursAgo >= 24;
      default:
        return false;
    }
  });

  if (!selectedAccount) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-400 p-6">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecione uma conta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar contatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtros de Tempo */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock size={14} />
            <span>Sem resposta há:</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "1h", "2h", "5h", "12h", "24h"] as TimeFilter[]).map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    timeFilter === filter
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {filter === "all" ? "Todos" : `+${filter}`}
                </button>
              )
            )}
          </div>
        </div>

        {/* Exportação em Massa */}
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <button
            onClick={() => {
              // TODO: Implementar modal de exportação
              const exportEvent = new CustomEvent("openBulkExport");
              window.dispatchEvent(exportEvent);
            }}
            className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar Conversas
          </button>
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <p className="text-sm">Nenhum contato encontrado</p>
          </div>
        ) : (
          <div>
            {filteredContacts.map((contact: any) => {
              const isPending = contact.number.startsWith("pending:");
              const isWaitingResponse =
                contact.lastMessageDirection === "received";
              const borderColor = isWaitingResponse
                ? "border-l-4 border-l-red-500"
                : "border-l-4 border-l-green-500";

              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${borderColor} ${
                    selectedContact?.id === contact.id ? "bg-blue-50" : ""
                  } ${isPending ? "bg-yellow-50 hover:bg-yellow-100" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${
                        isPending
                          ? "from-yellow-400 to-yellow-600"
                          : isWaitingResponse
                          ? "from-red-400 to-red-600"
                          : "from-green-400 to-green-600"
                      } rounded-full flex items-center justify-center text-white font-semibold`}
                    >
                      {isPending
                        ? "⏳"
                        : contact.name?.[0]?.toUpperCase() || contact.number[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-medium truncate ${
                          isPending ? "text-yellow-800" : "text-gray-800"
                        }`}
                      >
                        {contact.name || "Sem nome"}
                      </h4>
                      <p
                        className={`text-xs truncate ${
                          isPending ? "text-yellow-600" : "text-gray-500"
                        }`}
                      >
                        {contact.number}
                      </p>
                      {isWaitingResponse && contact.lastMessageTime && (
                        <p className="text-xs text-red-600 mt-0.5">
                          ⏰ Aguardando resposta há{" "}
                          {Math.floor(getHoursAgo(contact.lastMessageTime))}h
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
