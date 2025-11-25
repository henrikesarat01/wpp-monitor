/**
 * Sidebar Component
 *
 * Menu lateral com lista de contas conectadas
 */

import React, { useState } from "react";
import { Plus, Smartphone, Circle, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";

interface SidebarProps {
  onAddAccount: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddAccount }) => {
  const { accounts, selectedAccount, setSelectedAccount, deleteAccount } =
    useApp();
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-500";
      case "qr_required":
        return "text-yellow-500";
      default:
        return "text-gray-400";
    }
  };

  const handleDeleteAccount = async (
    accountId: string,
    accountName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Evitar selecionar a conta ao clicar no botão

    const confirmed = window.confirm(
      `Tem certeza que deseja apagar a conta "${accountName}"?\n\nIsso irá:\n- Desconectar do WhatsApp\n- Apagar todas as mensagens\n- Remover a sessão\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    setDeletingAccountId(accountId);
    try {
      await deleteAccount(accountId);
    } catch (error) {
      alert("Erro ao deletar conta");
    } finally {
      setDeletingAccountId(null);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">IARA</h1>
        <p className="text-xs text-gray-500 mt-1">
          Inteligência Analítica de Rastreamento Avançado
        </p>
      </div>

      {/* Add Account Button */}
      <button
        onClick={onAddAccount}
        className="m-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-colors shadow-sm"
      >
        <Plus size={20} />
        <span className="font-medium">Adicionar Conta</span>
      </button>

      {/* Accounts List */}
      <div className="flex-1 overflow-y-auto">
        {accounts.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <Smartphone size={48} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma conta conectada</p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`relative group rounded-lg transition-colors ${
                  selectedAccount?.id === account.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <button
                  onClick={() => setSelectedAccount(account)}
                  className="w-full text-left p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 truncate">
                        {account.name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {account.number}
                      </p>
                    </div>
                    <Circle
                      size={10}
                      className={getStatusColor(account.status)}
                      fill="currentColor"
                    />
                  </div>
                </button>
                <button
                  onClick={(e) =>
                    handleDeleteAccount(account.id, account.name, e)
                  }
                  disabled={deletingAccountId === account.id}
                  className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title="Apagar conta"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
        <p>v1.0.0 • 100% Local</p>
      </div>
    </div>
  );
};

export default Sidebar;
