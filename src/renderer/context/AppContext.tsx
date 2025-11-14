/**
 * AppContext - Context Global da Aplicação
 *
 * Gerencia estado global e comunicação com backend via Socket.io
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { io } from "socket.io-client";

// Types
interface Account {
  id: string;
  name: string;
  number: string;
  status: "connected" | "disconnected" | "qr_required";
  dataLogin: Date;
}

interface Contact {
  id: string;
  name?: string;
  number: string;
}

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  direction: "sent" | "received";
  type: string;
  mediaUrl?: string;
  contactNumber?: string; // Número do contato (vem do Socket.io)
  accountNumber?: string; // Número da conta (vem do Socket.io)
  contactName?: string; // Nome do contato (vem do Socket.io)
}

interface LogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  accountNumber?: string;
}

interface Stats {
  totalAccounts: number;
  activeAccounts: number;
  totalMessages: number;
  totalContacts: number;
  messagesPerHour: { hour: number; count: number }[];
}

interface AppContextType {
  accounts: Account[];
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => void;
  contacts: Contact[];
  selectedContact: Contact | null;
  setSelectedContact: (contact: Contact | null) => void;
  messages: Message[];
  logs: LogEntry[];
  stats: Stats | null;
  qrCode: string | null;
  connectionStatus: string;
  addAccount: (name: string) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  deleteConversation: (
    accountId: string,
    contactNumber: string
  ) => Promise<void>;
  refreshData: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  clearLogs: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_URL = "http://localhost:3000";

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("disconnected");

  // Inicializar Socket.io
  useEffect(() => {
    console.log("🔌 [FRONTEND] Inicializando Socket.io...");
    console.log("🔌 [FRONTEND] API_URL:", API_URL);

    const socketInstance = io(API_URL);

    socketInstance.on("connect", () => {
      console.log(
        "🔌 [FRONTEND] ✅ Socket.io conectado! ID:",
        socketInstance.id
      );
    });

    socketInstance.on("disconnect", () => {
      console.log("🔌 [FRONTEND] ❌ Socket.io desconectado");
    });

    // Event listeners
    socketInstance.on(
      "qr-code",
      (data: { accountId: string; qrCode: string }) => {
        console.log('🔌 [FRONTEND] Recebeu evento "qr-code"');
        setQrCode(data.qrCode);
        setConnectionStatus("qr_required");
      }
    );

    socketInstance.on(
      "connection-status",
      (data: { accountId: string; status: string }) => {
        console.log(
          '🔌 [FRONTEND] Recebeu evento "connection-status":',
          data.status
        );
        setConnectionStatus(data.status);
        if (data.status === "connected") {
          setQrCode(null);
          refreshData();
        }
      }
    );

    socketInstance.on("new-message", (message: Message) => {
      console.log("💬 [FRONTEND-SOCKET] *** NOVA MENSAGEM RECEBIDA ***");
      console.log("💬 [FRONTEND-SOCKET] Mensagem completa:", message);
      console.log(
        "💬 [FRONTEND-SOCKET] Contact number:",
        message.contactNumber
      );
      console.log(
        "💬 [FRONTEND-SOCKET] Account number:",
        message.accountNumber
      );

      // Atualizar lista de mensagens se o contato está selecionado
      setMessages((prev) => {
        console.log(
          "💬 [FRONTEND-SOCKET] Estado atual de mensagens:",
          prev.length
        );
        const updated = [...prev, message];
        console.log(
          "💬 [FRONTEND-SOCKET] ✅ Mensagem adicionada! Total agora:",
          updated.length
        );
        return updated;
      });

      console.log("💬 [FRONTEND-SOCKET] Chamando refreshData()...");
      refreshData();
    });

    socketInstance.on("log", (log: LogEntry) => {
      console.log('🔌 [FRONTEND] Recebeu evento "log"');
      setLogs((prev) => [log, ...prev].slice(0, 100));
    });

    socketInstance.on("account-update", () => {
      console.log('🔌 [FRONTEND] Recebeu evento "account-update"');
      refreshData();
    });

    console.log("🔌 [FRONTEND] Todos os listeners registrados");

    return () => {
      console.log("🔌 [FRONTEND] Fechando Socket.io...");
      socketInstance.close();
    };
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    refreshData();
  }, []);

  // ✅ Recarregar contatos quando conta selecionada mudar
  useEffect(() => {
    if (selectedAccount) {
      fetch(`${API_URL}/api/contacts/${selectedAccount.id}`)
        .then((res) => res.json())
        .then((data) => setContacts(data))
        .catch((err) => console.error("Error loading contacts:", err));

      // Limpar contato selecionado ao trocar de conta
      setSelectedContact(null);
    } else {
      setContacts([]);
      setSelectedContact(null);
    }
  }, [selectedAccount]);

  // Carregar mensagens quando contato é selecionado
  useEffect(() => {
    if (selectedAccount && selectedContact) {
      fetchMessages(selectedAccount.id, selectedContact.number);
    } else {
      setMessages([]);
    }
  }, [selectedAccount, selectedContact]);

  // Funções API
  const refreshData = async () => {
    try {
      // Buscar contas
      const accountsRes = await fetch(`${API_URL}/api/accounts`);
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData);
      }

      // ✅ Buscar contatos da conta selecionada (se houver)
      if (selectedAccount) {
        const contactsRes = await fetch(
          `${API_URL}/api/contacts/${selectedAccount.id}`
        );
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          setContacts(contactsData);
        }
      } else {
        // Se não há conta selecionada, limpar contatos
        setContacts([]);
      }

      // Buscar estatísticas
      const statsRes = await fetch(`${API_URL}/api/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  const fetchMessages = async (accountId: string, contactNumber: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/messages/${accountId}/${contactNumber}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const addAccount = async (name: string) => {
    try {
      console.log("🟢 [CONTEXT] addAccount() iniciado");
      console.log(
        "🟢 [CONTEXT] Enviando POST para http://localhost:3000/api/accounts"
      );
      console.log("🟢 [CONTEXT] Payload:", { name });

      const response = await fetch("http://localhost:3000/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      console.log("🟢 [CONTEXT] Resposta recebida - Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔴 [CONTEXT] Erro na resposta:", errorText);
        throw new Error("Failed to add account");
      }

      const account = await response.json();
      console.log("🟢 [CONTEXT] Conta criada:", account);
      setAccounts([...accounts, account]);
      console.log("🟢 [CONTEXT] Estado atualizado com sucesso");
    } catch (error) {
      console.error("🔴 [CONTEXT] Erro ao adicionar conta:", error);
      throw error;
    }
  };

  const deleteAccount = async (accountId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/accounts/${accountId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      // Atualizar lista de contas
      setAccounts(accounts.filter((acc) => acc.id !== accountId));

      // Limpar seleção se a conta deletada era a selecionada
      if (selectedAccount?.id === accountId) {
        setSelectedAccount(null);
        setSelectedContact(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  const deleteConversation = async (
    accountId: string,
    contactNumber: string
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/api/messages/${accountId}/${contactNumber}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      const data = await response.json();

      // Limpar mensagens localmente
      setMessages([]);

      // Se o contato foi deletado, remover da lista de contatos
      if (data.contactDeleted) {
        setContacts(contacts.filter((c) => c.number !== contactNumber));
        setSelectedContact(null);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      throw error;
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/logs`);
      if (res.ok) {
        const data = await res.json();
        const logsArray = data.logs
          .split("\n")
          .filter((line: string) => line.trim())
          .map((line: string) => {
            // Parse log lines (formato simples)
            return {
              timestamp: new Date(),
              level: "info" as const,
              message: line,
            };
          });
        setLogs(logsArray);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const clearLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/logs`, { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  };

  const value: AppContextType = {
    accounts,
    selectedAccount,
    setSelectedAccount,
    contacts,
    selectedContact,
    setSelectedContact,
    messages,
    logs,
    stats,
    qrCode,
    connectionStatus,
    addAccount,
    deleteAccount,
    deleteConversation,
    refreshData,
    fetchLogs,
    clearLogs,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
