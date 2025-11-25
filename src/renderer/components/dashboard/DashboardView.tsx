/**
 * DashboardView Component
 *
 * Visualização principal do dashboard com todos os KPIs
 */

import React, { useEffect, useState } from "react";
import KPICard from "./KPICard.tsx";
import VendorRanking from "./VendorRanking.tsx";
import ActivityChart from "./ActivityChart.tsx";
import AlertsPanel from "./AlertsPanel.tsx";
import DateRangeFilter from "./DateRangeFilter.tsx";
import {
  MessageCircle,
  Send,
  Users,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";

export interface DashboardKPIs {
  today: {
    messagesSent: number;
    messagesReceived: number;
    activeConversations: number;
    newContacts: number;
  };
  performance: {
    avgResponseTime: number; // em minutos
    responseRate: number; // percentual
    peakHour: number | null;
    firstContactTime: string | null;
    lastContactTime: string | null;
    maxResponseGap: number;
  };
  coverage: {
    uniqueCustomers: number;
    afterHoursMessages: {
      count: number;
      percentage: string;
    };
    avgConversationDuration: number;
  };
  insights: {
    topVendor: {
      id: string;
      name: string;
      activeConversations: number;
      messagesSent: number;
    } | null;
    growth: {
      growth: string;
      trend: "up" | "down" | "stable";
      current: number;
      previous: number;
    };
    performanceVsTeam: {
      vendorMessages: number;
      teamAvg: number;
      percentage: string;
      status: "above" | "below";
    } | null;
  };
  vendors: Array<{
    accountId: string;
    accountName: string;
    messagesSent: number;
    messagesReceived: number;
    activeConversations: number;
    avgResponseTime: number;
  }>;
  hourlyActivity: Array<{
    hour: number;
    sent: number;
    received: number;
  }>;
  alerts: Array<{
    type: "no_response" | "disconnected" | "cold_conversation";
    message: string;
    accountId?: string;
    contactNumber?: string;
  }>;
  mediaStats: {
    images: number;
    videos: number;
    documents: number;
    audios: number;
  };
}

const DashboardView: React.FC = () => {
  console.log("🚀 [DASHBOARD] Componente montado");

  // Dashboard sempre mostra visão geral (não filtra por conta)
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [useCustomDate, setUseCustomDate] = useState(false);

  console.log("🎨 [DASHBOARD] Render - loading:", loading, "kpis:", !!kpis);

  // Buscar KPIs
  useEffect(() => {
    console.log("🎯 [DASHBOARD] useEffect disparado");
    console.log("🎯 [DASHBOARD] period:", period);
    console.log("🎯 [DASHBOARD] useCustomDate:", useCustomDate);
    fetchKPIs();
    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      console.log("🔄 [DASHBOARD] Atualizando KPIs automaticamente...");
      fetchKPIs();
    }, 30000);
    return () => {
      console.log("🧹 [DASHBOARD] Limpando interval");
      clearInterval(interval);
    };
  }, [period, useCustomDate, startDate, endDate]); // Adiciona filtros de data

  const fetchKPIs = async () => {
    console.log("📊 [DASHBOARD] fetchKPIs iniciado");
    console.log("📊 [DASHBOARD] Construindo URL...");

    try {
      // Dashboard sempre mostra visão geral (sem filtro de conta)
      let url = `http://localhost:3000/api/dashboard-kpis?period=${period}`;

      // Adicionar filtros de data se estiver usando data customizada
      if (useCustomDate && startDate && endDate) {
        url += `&startDate=${encodeURIComponent(
          startDate
        )}&endDate=${encodeURIComponent(endDate)}`;
      }

      console.log("📊 [DASHBOARD] URL:", url);
      console.log("📊 [DASHBOARD] Fazendo fetch...");

      const response = await fetch(url);

      console.log("📊 [DASHBOARD] Response status:", response.status);
      console.log("📊 [DASHBOARD] Response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ [DASHBOARD] Dados recebidos:", data);
        setKpis(data);
        console.log("✅ [DASHBOARD] State atualizado com sucesso");
      } else {
        const errorText = await response.text();
        console.error(
          "❌ [DASHBOARD] Erro na resposta:",
          response.status,
          errorText
        );
      }
    } catch (error) {
      console.error("❌ [DASHBOARD] Erro ao buscar KPIs:", error);
      if (error instanceof Error) {
        console.error("❌ [DASHBOARD] Error message:", error.message);
      }
    } finally {
      console.log("🏁 [DASHBOARD] fetchKPIs finalizado");
      setLoading(false);
    }
  };

  if (loading) {
    console.log("⏳ [DASHBOARD] Renderizando loading state");
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!kpis) {
    console.log("⚠️ [DASHBOARD] Renderizando erro state (sem dados)");
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Erro ao carregar dados do dashboard</p>
      </div>
    );
  }

  console.log("✅ [DASHBOARD] Renderizando dashboard completo");

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-600">
            Visão geral de todas as contas
            {useCustomDate && startDate && endDate && (
              <span className="ml-2 text-blue-600 font-medium">
                • Filtrado de {new Date(startDate).toLocaleString("pt-BR")} até{" "}
                {new Date(endDate).toLocaleString("pt-BR")}
              </span>
            )}
          </p>
        </div>

        {/* Seletores de período e data */}
        <div className="flex gap-2">
          {!useCustomDate && (
            <>
              <button
                onClick={() => setPeriod("today")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === "today"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setPeriod("week")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Mês
              </button>
            </>
          )}

          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onApply={() => setUseCustomDate(true)}
            onClear={() => {
              setStartDate("");
              setEndDate("");
              setUseCustomDate(false);
            }}
          />
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={<Send className="w-5 h-5" />}
          label="Mensagens Enviadas"
          value={kpis.today.messagesSent}
          color="blue"
        />
        <KPICard
          icon={<MessageCircle className="w-5 h-5" />}
          label="Mensagens Recebidas"
          value={kpis.today.messagesReceived}
          color="green"
        />
        <KPICard
          icon={<Activity className="w-5 h-5" />}
          label="Conversas Ativas"
          value={kpis.today.activeConversations}
          color="purple"
        />
        <KPICard
          icon={<Users className="w-5 h-5" />}
          label="Novos Contatos"
          value={kpis.today.newContacts}
          color="orange"
        />
      </div>

      {/* Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPICard
          icon={<Clock className="w-5 h-5" />}
          label="Tempo Médio de Resposta"
          value={`${kpis.performance.avgResponseTime.toFixed(0)} min`}
          color="indigo"
          isText
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Taxa de Resposta"
          value={`${kpis.performance.responseRate.toFixed(0)}%`}
          color="teal"
          isText
        />
        <KPICard
          icon={<Activity className="w-5 h-5" />}
          label="Pico de Atividade"
          value={
            kpis.performance.peakHour !== null
              ? `${kpis.performance.peakHour}:00h`
              : "Sem dados"
          }
          color="pink"
          isText
        />
      </div>

      {/* Novos KPIs - Horários */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={<Clock className="w-5 h-5" />}
          label="Primeiro Contato"
          value={kpis.performance.firstContactTime || "Sem dados"}
          color="teal"
          isText
        />
        <KPICard
          icon={<Clock className="w-5 h-5" />}
          label="Último Contato"
          value={kpis.performance.lastContactTime || "Sem dados"}
          color="teal"
          isText
        />
        <KPICard
          icon={<Users className="w-5 h-5" />}
          label="Clientes Únicos"
          value={kpis.coverage.uniqueCustomers}
          color="green"
        />
        <KPICard
          icon={<Clock className="w-5 h-5" />}
          label="Tempo Máx. sem Atender"
          value={`${Math.round(kpis.performance.maxResponseGap)} min`}
          color="pink"
          isText
        />
      </div>

      {/* Insights Avançados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-gray-800 text-sm">
              Fora do Horário
            </h4>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {kpis.coverage.afterHoursMessages.count}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {kpis.coverage.afterHoursMessages.percentage}% do total
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h4 className="font-semibold text-gray-800 text-sm">
              Duração Média
            </h4>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(kpis.coverage.avgConversationDuration)} min
          </div>
          <div className="text-xs text-gray-500 mt-1">Por conversa</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-800 text-sm">Crescimento</h4>
          </div>
          <div
            className={`text-2xl font-bold ${
              kpis.insights.growth.trend === "up"
                ? "text-green-600"
                : kpis.insights.growth.trend === "down"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {kpis.insights.growth.trend === "up"
              ? "↗"
              : kpis.insights.growth.trend === "down"
              ? "↘"
              : "→"}{" "}
            {kpis.insights.growth.growth}%
          </div>
          <div className="text-xs text-gray-500 mt-1">vs período anterior</div>
        </div>
      </div>

      {/* Melhor Vendedor */}
      {kpis.insights.topVendor && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow-sm p-6 mb-6 border-2 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🏆</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800">
                Melhor Vendedor do Período
              </h3>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {kpis.insights.topVendor.name}
              </p>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span>💬 {kpis.insights.topVendor.messagesSent} mensagens</span>
                <span>
                  👥 {kpis.insights.topVendor.activeConversations} conversas
                  ativas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alertas */}
      {kpis.alerts.length > 0 && (
        <div className="mb-6">
          <AlertsPanel alerts={kpis.alerts} />
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranking de Vendedores */}
        <div className="lg:col-span-1">
          <VendorRanking vendors={kpis.vendors} />
        </div>

        {/* Gráfico de Atividade */}
        <div className="lg:col-span-2">
          <ActivityChart data={kpis.hourlyActivity} />
        </div>
      </div>

      {/* Estatísticas de Mídia */}
      <div className="mt-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📎 Mídia Compartilhada
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {kpis.mediaStats.images}
              </div>
              <div className="text-sm text-gray-600">Imagens</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {kpis.mediaStats.videos}
              </div>
              <div className="text-sm text-gray-600">Vídeos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {kpis.mediaStats.documents}
              </div>
              <div className="text-sm text-gray-600">Documentos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {kpis.mediaStats.audios}
              </div>
              <div className="text-sm text-gray-600">Áudios</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
