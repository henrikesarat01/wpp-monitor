/**
 * StatsPanel Component
 * 
 * Painel lateral com estatísticas e métricas
 */

import React from 'react';
import { Users, MessageCircle, Activity, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';

const StatsPanel: React.FC = () => {
  const { stats } = useApp();

  const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
  }> = ({ icon, label, value, color }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <span className="text-2xl font-bold text-gray-800">{value}</span>
      </div>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );

  const maxMessages = Math.max(...(stats?.messagesPerHour.map((h) => h.count) || [1]));

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Estatísticas</h3>

      {/* Cards de métricas */}
      <div className="space-y-3 mb-6">
        <StatCard
          icon={<Smartphone size={20} className="text-blue-600" />}
          label="Contas Conectadas"
          value={stats?.activeAccounts || 0}
          color="bg-blue-50"
        />
        <StatCard
          icon={<MessageCircle size={20} className="text-green-600" />}
          label="Total de Mensagens"
          value={stats?.totalMessages || 0}
          color="bg-green-50"
        />
        <StatCard
          icon={<Users size={20} className="text-purple-600" />}
          label="Contatos"
          value={stats?.totalContacts || 0}
          color="bg-purple-50"
        />
      </div>

      {/* Gráfico de mensagens por hora */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-gray-600" />
          <h4 className="font-semibold text-gray-800">Mensagens por Hora</h4>
        </div>
        
        <div className="space-y-2">
          {stats?.messagesPerHour && stats.messagesPerHour.length > 0 ? (
            stats.messagesPerHour.map((item) => (
              <div key={item.hour} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-8">
                  {item.hour.toString().padStart(2, '0')}h
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${(item.count / maxMessages) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 w-8 text-right">
                  {item.count}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">
              Sem dados disponíveis
            </p>
          )}
        </div>
      </div>

      {/* Info adicional */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={18} className="text-blue-600" />
          <h4 className="font-semibold text-blue-800">Status Geral</h4>
        </div>
        <p className="text-xs text-blue-700">
          Sistema operando normalmente. Todos os dados são armazenados localmente.
        </p>
      </div>
    </div>
  );
};

// Importing icon for consistency
import { Smartphone } from 'lucide-react';

export default StatsPanel;
