/**
 * Header Component
 * 
 * Barra superior com informações e controles
 */

import React from 'react';
import { RefreshCw, FileText, BarChart3, Circle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onShowLogs: () => void;
  onShowStats: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowLogs, onShowStats }) => {
  const { selectedAccount, refreshData } = useApp();

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'connected':
        return { text: 'Conectado', color: 'text-green-600', bg: 'bg-green-50' };
      case 'qr_required':
        return { text: 'Aguardando QR', color: 'text-yellow-600', bg: 'bg-yellow-50' };
      case 'connecting':
        return { text: 'Conectando...', color: 'text-blue-600', bg: 'bg-blue-50' };
      default:
        return { text: 'Desconectado', color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  const status = selectedAccount ? getStatusText(selectedAccount.status) : getStatusText();

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {selectedAccount ? (
          <>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedAccount.name}
              </h2>
              <p className="text-xs text-gray-500">{selectedAccount.number}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bg}`}>
              <Circle size={8} className={status.color} fill="currentColor" />
              <span className={`text-xs font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
          </>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-gray-800">WPP Monitor</h2>
            <p className="text-xs text-gray-500">Selecione uma conta para começar</p>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <button
          onClick={refreshData}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={20} className="text-gray-600" />
        </button>
        
        <button
          onClick={onShowStats}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Estatísticas"
        >
          <BarChart3 size={20} className="text-gray-600" />
        </button>

        <button
          onClick={onShowLogs}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Logs"
        >
          <FileText size={20} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default Header;
