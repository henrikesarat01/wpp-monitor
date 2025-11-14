/**
 * ChatList Component
 *
 * Lista de conversas/contatos
 */

import React from "react";
import { MessageSquare, Search } from "lucide-react";
import { useApp } from "../context/AppContext";

const ChatList: React.FC = () => {
  const { contacts, selectedContact, setSelectedContact, selectedAccount } =
    useApp();
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.number.includes(searchTerm) ||
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="p-4 border-b border-gray-200">
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
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <p className="text-sm">Nenhum contato encontrado</p>
          </div>
        ) : (
          <div>
            {filteredContacts.map((contact) => {
              const isPending = contact.number.startsWith("pending:");
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedContact?.id === contact.id ? "bg-blue-50" : ""
                  } ${isPending ? "bg-yellow-50 hover:bg-yellow-100" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${
                        isPending
                          ? "from-yellow-400 to-yellow-600"
                          : "from-blue-400 to-blue-600"
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
                        {contact.name || contact.number}
                      </h4>
                      <p
                        className={`text-xs truncate ${
                          isPending ? "text-yellow-600" : "text-gray-500"
                        }`}
                      >
                        {isPending ? "⏰ Aguardando resposta" : contact.number}
                      </p>
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
