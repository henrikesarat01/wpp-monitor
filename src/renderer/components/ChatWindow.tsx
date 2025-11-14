/**
 * ChatWindow Component
 *
 * Janela principal de visualização de mensagens
 */

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import MessageItem from "./MessageItem";

const ChatWindow: React.FC = () => {
  const { selectedContact, selectedAccount, messages, deleteConversation } =
    useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  if (!selectedAccount) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <MessageCircle size={64} className="mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">Bem-vindo ao WPP Monitor</h3>
          <p className="text-sm">Selecione uma conta para começar</p>
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
        <div className="flex items-center justify-between">
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <p className="text-xs text-gray-400 text-center">
          Modo somente leitura • {messages.length} mensagens
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
