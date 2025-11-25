/**
 * ActivityChart Component
 *
 * Gráfico de atividade por hora
 */

import React from "react";
import { BarChart3 } from "lucide-react";

interface ActivityData {
  hour: number;
  sent: number;
  received: number;
}

interface ActivityChartProps {
  data: ActivityData[];
}

const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  const maxValue = Math.max(
    ...data.map((item) => Math.max(item.sent, item.received)),
    1
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Atividade por Hora
        </h3>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-gray-600">Enviadas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Recebidas</span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="space-y-2">
        {data.length > 0 ? (
          data.map((item) => (
            <div key={item.hour} className="flex items-center gap-3">
              {/* Hora */}
              <div className="w-12 text-xs text-gray-600 font-medium">
                {item.hour.toString().padStart(2, "0")}:00
              </div>

              {/* Barras */}
              <div className="flex-1 flex gap-1">
                {/* Barra enviadas */}
                <div className="flex-1 relative">
                  <div className="bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${(item.sent / maxValue) * 100}%` }}
                    >
                      {item.sent > 0 && (
                        <span className="text-xs text-white font-semibold">
                          {item.sent}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Barra recebidas */}
                <div className="flex-1 relative">
                  <div className="bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-green-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${(item.received / maxValue) * 100}%` }}
                    >
                      {item.received > 0 && (
                        <span className="text-xs text-white font-semibold">
                          {item.received}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="w-12 text-right text-xs text-gray-600 font-bold">
                {item.sent + item.received}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Sem dados de atividade</p>
          </div>
        )}
      </div>

      {/* Resumo */}
      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {data.reduce((sum, item) => sum + item.sent, 0)}
              </div>
              <div className="text-xs text-gray-600">Total Enviadas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {data.reduce((sum, item) => sum + item.received, 0)}
              </div>
              <div className="text-xs text-gray-600">Total Recebidas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {data.reduce((sum, item) => sum + item.sent + item.received, 0)}
              </div>
              <div className="text-xs text-gray-600">Total Geral</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityChart;
