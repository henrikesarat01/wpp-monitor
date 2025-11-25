/**
 * VendorRanking Component
 *
 * Ranking de vendedores por performance
 */

import React, { useState } from "react";
import { Trophy, MessageCircle, Clock, Activity } from "lucide-react";

interface Vendor {
  accountId: string;
  accountName: string;
  messagesSent: number;
  messagesReceived: number;
  activeConversations: number;
  avgResponseTime: number;
}

interface VendorRankingProps {
  vendors: Vendor[];
}

type SortBy = "messages" | "conversations" | "responseTime";

const VendorRanking: React.FC<VendorRankingProps> = ({ vendors }) => {
  const [sortBy, setSortBy] = useState<SortBy>("messages");

  const sortedVendors = [...vendors].sort((a, b) => {
    switch (sortBy) {
      case "messages":
        return b.messagesSent - a.messagesSent;
      case "conversations":
        return b.activeConversations - a.activeConversations;
      case "responseTime":
        return a.avgResponseTime - b.avgResponseTime;
      default:
        return 0;
    }
  });

  const getStars = (index: number) => {
    if (index === 0) return "⭐⭐⭐⭐⭐";
    if (index === 1) return "⭐⭐⭐⭐";
    if (index === 2) return "⭐⭐⭐";
    return "⭐⭐";
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return "👤";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Ranking de Vendedores
        </h3>
      </div>

      {/* Seletor de métrica */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSortBy("messages")}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            sortBy === "messages"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <MessageCircle className="w-4 h-4 inline mr-1" />
          Mensagens
        </button>
        <button
          onClick={() => setSortBy("conversations")}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            sortBy === "conversations"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Activity className="w-4 h-4 inline mr-1" />
          Conversas
        </button>
        <button
          onClick={() => setSortBy("responseTime")}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            sortBy === "responseTime"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Clock className="w-4 h-4 inline mr-1" />
          Resposta
        </button>
      </div>

      {/* Lista de vendedores */}
      <div className="space-y-3">
        {sortedVendors.length > 0 ? (
          sortedVendors.map((vendor, index) => (
            <div
              key={vendor.accountId}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                index < 3
                  ? "bg-gradient-to-r from-yellow-50 to-transparent"
                  : "bg-gray-50"
              } hover:bg-gray-100`}
            >
              {/* Posição */}
              <div className="text-2xl">{getMedalIcon(index)}</div>

              {/* Info do vendedor */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-800 truncate">
                    {vendor.accountName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {getStars(index)}
                  </span>
                </div>

                <div className="flex gap-4 text-xs text-gray-600">
                  {sortBy === "messages" && (
                    <span className="font-medium text-blue-600">
                      {vendor.messagesSent} msgs
                    </span>
                  )}
                  {sortBy === "conversations" && (
                    <span className="font-medium text-purple-600">
                      {vendor.activeConversations} conversas
                    </span>
                  )}
                  {sortBy === "responseTime" && (
                    <span className="font-medium text-green-600">
                      {vendor.avgResponseTime.toFixed(0)} min
                    </span>
                  )}
                </div>
              </div>

              {/* Badge de posição */}
              <div className="text-lg font-bold text-gray-400">
                #{index + 1}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Nenhum vendedor ativo</p>
          </div>
        )}
      </div>

      {/* Estatísticas resumidas */}
      {sortedVendors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-gray-800">
                {sortedVendors.reduce((sum, v) => sum + v.messagesSent, 0)}
              </div>
              <div className="text-xs text-gray-600">Total Msgs</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">
                {sortedVendors.reduce(
                  (sum, v) => sum + v.activeConversations,
                  0
                )}
              </div>
              <div className="text-xs text-gray-600">Conversas</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">
                {sortedVendors.length > 0
                  ? (
                      sortedVendors.reduce(
                        (sum, v) => sum + v.avgResponseTime,
                        0
                      ) / sortedVendors.length
                    ).toFixed(0)
                  : 0}
              </div>
              <div className="text-xs text-gray-600">Média Resp.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorRanking;
