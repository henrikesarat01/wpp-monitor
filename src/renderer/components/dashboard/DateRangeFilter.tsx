/**
 * DateRangeFilter Component
 *
 * Filtro de intervalo de data/hora para o dashboard
 */

import React, { useState } from "react";
import { Calendar, Clock, X } from "lucide-react";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApply: () => void;
  onClear: () => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);

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

  const handleApply = () => {
    onApply();
    setIsOpen(false);
  };

  const handleClear = () => {
    onClear();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Botão de filtro */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          startDate || endDate
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span>Filtrar por Data</span>
        {(startDate || endDate) && (
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
            ●
          </span>
        )}
      </button>

      {/* Dropdown de filtros */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Filtrar por Período
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Data Inicial */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data/Hora Inicial
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {startDate && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDateForDisplay(startDate)}
                  </p>
                )}
              </div>

              {/* Data Final */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Data/Hora Final
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {endDate && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDateForDisplay(endDate)}
                  </p>
                )}
              </div>

              {/* Atalhos rápidos */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Atalhos:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const now = new Date();
                      const today = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate()
                      );
                      onStartDateChange(today.toISOString().slice(0, 16));
                      onEndDateChange(now.toISOString().slice(0, 16));
                    }}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
                      const yesterdayEnd = new Date(
                        yesterdayStart.getTime() + 24 * 60 * 60 * 1000 - 1
                      );
                      onStartDateChange(
                        yesterdayStart.toISOString().slice(0, 16)
                      );
                      onEndDateChange(yesterdayEnd.toISOString().slice(0, 16));
                    }}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Ontem
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      const weekAgo = new Date(
                        now.getTime() - 7 * 24 * 60 * 60 * 1000
                      );
                      onStartDateChange(weekAgo.toISOString().slice(0, 16));
                      onEndDateChange(now.toISOString().slice(0, 16));
                    }}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Últimos 7 dias
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      const monthAgo = new Date(
                        now.getTime() - 30 * 24 * 60 * 60 * 1000
                      );
                      onStartDateChange(monthAgo.toISOString().slice(0, 16));
                      onEndDateChange(now.toISOString().slice(0, 16));
                    }}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Últimos 30 dias
                  </button>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Limpar
                </button>
                <button
                  onClick={handleApply}
                  disabled={!startDate || !endDate}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    startDate && endDate
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Aplicar Filtro
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangeFilter;
