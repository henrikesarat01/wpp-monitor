/**
 * LogsModal Component
 * 
 * Modal para visualização de logs do sistema
 */

import React, { useState, useEffect } from 'react';
import { X, Trash2, Download, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LogsModalProps {
  onClose: () => void;
}

const LogsModal: React.FC<LogsModalProps> = ({ onClose }) => {
  const { logs, clearLogs, fetchLogs } = useApp();
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => 
    filter === 'all' ? true : log.level === filter
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('Tem certeza que deseja limpar todos os logs?')) {
      await clearLogs();
    }
  };

  const handleDownloadLogs = () => {
    const logText = logs
      .map((log) => `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wpp-monitor-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Logs do Sistema</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={20} className="text-gray-600" />
            </button>
            <button
              onClick={handleDownloadLogs}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Baixar Logs"
            >
              <Download size={20} className="text-gray-600" />
            </button>
            <button
              onClick={handleClearLogs}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Limpar Logs"
            >
              <Trash2 size={20} className="text-red-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2">
            {(['all', 'info', 'warn', 'error'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === level
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {level === 'all' ? 'Todos' : level.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${getLevelColor(
                        log.level
                      )}`}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span className="flex-1 text-gray-700">{log.message}</span>
                    {log.accountNumber && (
                      <span className="text-gray-500 whitespace-nowrap">
                        {log.accountNumber}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 text-center text-sm text-gray-500">
          Total de logs: {filteredLogs.length}
        </div>
      </div>
    </div>
  );
};

export default LogsModal;
