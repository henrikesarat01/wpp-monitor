/**
 * IARA - App Principal
 *
 * Componente raiz que organiza o layout e gerencia contextos globais
 */

import React, { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatList from "./components/ChatList";
import ChatWindow from "./components/ChatWindow";
import StatsPanel from "./components/StatsPanel";
import AddAccountModal from "./components/AddAccountModal";
import LogsModal from "./components/LogsModal";
import BulkExportModal from "./components/BulkExportModal";
import { DashboardView } from "./components/dashboard";
import AIDashboard from "./components/dashboard/AIDashboard";

const AppContent: React.FC = () => {
  const { selectedAccount } = useApp();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [dashboardView, setDashboardView] = useState<"default" | "ai">(
    "default"
  );

  // Listener para logs do processo principal
  useEffect(() => {
    if (window.electron?.onMainLog) {
      window.electron.onMainLog((log: string) => {
        console.log("📡", log);
      });
    }
  }, []);

  // Listener para abrir modal de exportação em massa
  useEffect(() => {
    const handleOpenBulkExport = () => {
      if (selectedAccount) {
        setShowBulkExport(true);
      } else {
        alert("Por favor, selecione uma conta primeiro");
      }
    };

    window.addEventListener("openBulkExport", handleOpenBulkExport);
    return () =>
      window.removeEventListener("openBulkExport", handleOpenBulkExport);
  }, [selectedAccount]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar onAddAccount={() => setShowAddAccount(true)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          onShowLogs={() => setShowLogs(true)}
          onShowStats={() => setShowStats(!showStats)}
          onShowDashboard={() => setShowDashboard(!showDashboard)}
        />

        {/* Content Area */}
        {showDashboard ? (
          // Dashboard completo com tabs
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs de navegação */}
            <div className="bg-white border-b border-gray-200 px-6">
              <div className="flex gap-4">
                <button
                  onClick={() => setDashboardView("default")}
                  className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                    dashboardView === "default"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  📊 Dashboard Geral
                </button>
                <button
                  onClick={() => setDashboardView("ai")}
                  className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                    dashboardView === "ai"
                      ? "border-purple-600 text-purple-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  🤖 Dashboard de IA
                </button>
              </div>
            </div>

            {/* Conteúdo do dashboard */}
            <div className="flex-1 overflow-auto">
              {dashboardView === "default" ? (
                <DashboardView />
              ) : (
                <AIDashboard />
              )}
            </div>
          </div>
        ) : (
          // View padrão de chat
          <div className="flex-1 flex overflow-hidden">
            {/* Chat List */}
            <ChatList />

            {/* Chat Window */}
            <ChatWindow />

            {/* Stats Panel (conditional) */}
            {showStats && <StatsPanel />}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddAccount && (
        <AddAccountModal onClose={() => setShowAddAccount(false)} />
      )}

      {showLogs && <LogsModal onClose={() => setShowLogs(false)} />}

      {showBulkExport && selectedAccount && (
        <BulkExportModal
          accountId={selectedAccount.id}
          onClose={() => setShowBulkExport(false)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
