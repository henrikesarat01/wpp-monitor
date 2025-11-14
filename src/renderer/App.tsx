/**
 * WPP Monitor - App Principal
 *
 * Componente raiz que organiza o layout e gerencia contextos globais
 */

import React, { useState, useEffect } from "react";
import { AppProvider } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatList from "./components/ChatList";
import ChatWindow from "./components/ChatWindow";
import StatsPanel from "./components/StatsPanel";
import AddAccountModal from "./components/AddAccountModal";
import LogsModal from "./components/LogsModal";

const App: React.FC = () => {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Listener para logs do processo principal
  useEffect(() => {
    if (window.electron?.onMainLog) {
      window.electron.onMainLog((log: string) => {
        console.log("📡", log);
      });
    }
  }, []);

  return (
    <AppProvider>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar onAddAccount={() => setShowAddAccount(true)} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <Header
            onShowLogs={() => setShowLogs(true)}
            onShowStats={() => setShowStats(!showStats)}
          />

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chat List */}
            <ChatList />

            {/* Chat Window */}
            <ChatWindow />

            {/* Stats Panel (conditional) */}
            {showStats && <StatsPanel />}
          </div>
        </div>

        {/* Modals */}
        {showAddAccount && (
          <AddAccountModal onClose={() => setShowAddAccount(false)} />
        )}

        {showLogs && <LogsModal onClose={() => setShowLogs(false)} />}
      </div>
    </AppProvider>
  );
};

export default App;
