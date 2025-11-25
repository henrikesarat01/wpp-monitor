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
  useRef,
  ReactNode,
} from "react";
import { io } from "socket.io-client";
import { API_URL } from "../utils/config";

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
  audioTranscription?: string; // Transcrição do áudio
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

// Use shared API_URL (defaults to port 8523)
// The value lives in `src/renderer/utils/config.ts`

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

  // ✅ useRef para controlar chamadas duplicadas
  const isLoadingContactsRef = useRef(false);
  const lastContactsLoadRef = useRef<number>(0);
  const isRefreshingDataRef = useRef(false);
  const lastRefreshDataRef = useRef<number>(0);

  // Inicializar Socket.io
  useEffect(() => {
    console.log("🔌 [FRONTEND] Inicializando Socket.io...");
    console.log("🔌 [FRONTEND] API_URL:", API_URL);

    const socketInstance = io(API_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log(
        "🔌 [FRONTEND] ✅ Socket.io conectado! ID:",
        socketInstance.id
      );
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 [FRONTEND] ❌ Socket.io desconectado. Razão:", reason);
      if (reason === "io server disconnect") {
        console.log(
          "🔌 [FRONTEND] ⚠️ Servidor desconectou. Reconectando manualmente..."
        );
        socketInstance.connect();
      }
    });

    socketInstance.on("connect_error", (error) => {
      console.error("🔌 [FRONTEND] ❌ Erro de conexão:", error.message);
    });

    socketInstance.on("reconnect", (attemptNumber) => {
      console.log(
        "🔌 [FRONTEND] ♻️ Reconectado após",
        attemptNumber,
        "tentativas"
      );
    });

    socketInstance.on("reconnecting", (attemptNumber) => {
      console.log(
        "🔌 [FRONTEND] 🔄 Tentando reconectar... Tentativa",
        attemptNumber
      );
    });

    // ✅ DEBUG: Capturar TODOS os eventos
    socketInstance.onAny((eventName, ...args) => {
      console.log(`🔌 [FRONTEND-DEBUG] Evento recebido: "${eventName}"`, args);
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
      // ✅ CORREÇÃO: Verificar se mensagem já existe antes de adicionar (evita duplicatas)
      setMessages((prev) => {
        console.log(
          "💬 [FRONTEND-SOCKET] Estado atual de mensagens:",
          prev.length
        );

        // Verificar se a mensagem já existe pelo ID
        const exists = prev.some((msg) => msg.id === message.id);
        if (exists) {
          console.log(
            "💬 [FRONTEND-SOCKET] ⚠️  Mensagem já existe no estado, ignorando duplicata:",
            message.id
          );
          return prev;
        }

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

    // ✅ NOVO: Evento quando contato @lid é criado
    socketInstance.on(
      "contact-created",
      (data: { contact: Contact; accountId: string }) => {
        console.log("📞 [FRONTEND-SOCKET] *** CONTATO CRIADO (@lid) ***");
        console.log("📞 [FRONTEND-SOCKET] Contact:", data.contact);
        console.log("📞 [FRONTEND-SOCKET] Account ID:", data.accountId);

        // Adicionar à lista de contatos (sempre, independente da conta selecionada)
        setContacts((prev) => {
          // Verificar se o contato já existe
          const exists = prev.some((c) => c.number === data.contact.number);
          if (exists) {
            console.log("📞 [FRONTEND-SOCKET] Contato já existe na lista");
            return prev;
          }
          console.log("📞 [FRONTEND-SOCKET] ✅ Adicionando contato à lista");
          return [data.contact, ...prev];
        });

        // Recarregar dados para garantir sincronização
        console.log("📞 [FRONTEND-SOCKET] Chamando refreshData()...");
        refreshData();
      }
    );

    // ✅ Evento quando áudio é transcrito
    socketInstance.on(
      "audio-transcribed",
      (data: {
        messageId: string;
        transcription: string;
        provider: string;
      }) => {
        console.log("🎤 [FRONTEND-SOCKET] *** ÁUDIO TRANSCRITO ***");
        console.log("🎤 [FRONTEND-SOCKET] Message ID:", data.messageId);
        console.log("🎤 [FRONTEND-SOCKET] Transcription:", data.transcription);

        // Atualizar mensagem com transcrição
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, audioTranscription: data.transcription }
              : msg
          )
        );

        console.log(
          "🎤 [FRONTEND-SOCKET] ✅ Transcrição adicionada à mensagem"
        );
      }
    );

    // ✅ Evento de estatísticas de transcrição
    socketInstance.on(
      "transcription-stats",
      (data: {
        totalAudios: number;
        transcribedAudios: number;
        pendingAudios: number;
        percentComplete: number;
        hoursNeeded: number;
        minutesNeeded: number;
        cyclesNeeded: number;
      }) => {
        console.log(
          "\n🎤 ════════════════════════════════════════════════════════"
        );
        console.log("🎤 [FRONTEND] ESTATÍSTICAS DE TRANSCRIÇÃO DE ÁUDIOS");
        console.log(
          "🎤 ════════════════════════════════════════════════════════"
        );
        console.log(`🎤 Total de áudios no banco:        ${data.totalAudios}`);
        console.log(
          `✅ Áudios já transcritos:           ${data.transcribedAudios}`
        );
        console.log(
          `⏳ Áudios pendentes:                ${data.pendingAudios}`
        );
        console.log(
          `📊 Progresso:                       ${data.percentComplete}%`
        );

        if (data.pendingAudios > 0) {
          console.log(
            `⏱️  Tempo estimado para conclusão:  ~${data.hoursNeeded}h (${data.minutesNeeded} min)`
          );
          console.log(
            `🔄 Ciclos necessários:              ${data.cyclesNeeded} (10 áudios/ciclo)`
          );
        } else {
          console.log(`🎉 Todos os áudios já foram transcritos!`);
        }

        console.log(
          "🎤 ════════════════════════════════════════════════════════\n"
        );
      }
    );

    // ✅ Evento de progresso de transcrição
    socketInstance.on("transcription-progress", (data: any) => {
      if (data.status === "started") {
        console.log(`\n📋 [FRONTEND] ${data.message}`);
      } else if (data.status === "processing") {
        console.log(
          `🎤 [FRONTEND] [${data.current}/${data.total}] "${data.preview}"`
        );
      } else if (data.status === "completed") {
        console.log(
          "\n📊 ═══════════════════════════════════════════════════════"
        );
        console.log("📊 [FRONTEND] RESULTADO DO PROCESSAMENTO");
        console.log(
          "📊 ═══════════════════════════════════════════════════════"
        );
        console.log(`✅ Transcritos com sucesso:     ${data.transcribed}`);
        console.log(`❌ Erros:                        ${data.errors}`);
        console.log(`⚠️  Ignorados (arquivo ausente): ${data.skipped}`);
        console.log(`⏱️  Tempo total:                 ${data.elapsedTime}s`);
        console.log(`⏳ Áudios ainda pendentes:       ${data.totalPending}`);
        console.log(
          "📊 ═══════════════════════════════════════════════════════\n"
        );
      }
    });

    // ✅ NOVO: Evento quando @lid é unificado com número real
    socketInstance.on(
      "contact-unified",
      (data: {
        oldContactId: string;
        newContactId: string;
        oldNumber: string;
        newNumber: string;
        contactName?: string;
      }) => {
        console.log("🔗 [FRONTEND-SOCKET] *** CONTATO UNIFICADO ***");
        console.log("🔗 [FRONTEND-SOCKET] Old:", data.oldNumber);
        console.log("🔗 [FRONTEND-SOCKET] New:", data.newNumber);

        // Atualizar lista de contatos
        setContacts((prev) =>
          prev.map((c) =>
            c.number === data.oldNumber
              ? {
                  ...c,
                  number: data.newNumber,
                  name: data.contactName || c.name,
                }
              : c
          )
        );

        // Se o contato @lid estava selecionado, atualizar para o número real
        if (selectedContact && selectedContact.number === data.oldNumber) {
          setSelectedContact({
            id: data.newContactId,
            number: data.newNumber,
            name: data.contactName || selectedContact.name,
          });
        }

        // Recarregar mensagens para refletir mudança
        if (selectedAccount && selectedContact) {
          fetchMessages(selectedAccount.id, data.newNumber);
        }

        refreshData();
      }
    );

    // ✅ NOVO: Evento quando contato é atualizado (nome, etc)
    socketInstance.on(
      "contact-updated",
      (data: {
        oldNumber: string;
        newNumber: string;
        contactName?: string;
      }) => {
        console.log("📝 [FRONTEND-SOCKET] *** CONTATO ATUALIZADO ***");
        console.log("📝 [FRONTEND-SOCKET] Update:", data);

        // Atualizar lista de contatos
        setContacts((prev) =>
          prev.map((c) =>
            c.number === data.oldNumber
              ? {
                  ...c,
                  number: data.newNumber,
                  name: data.contactName || c.name,
                }
              : c
          )
        );

        refreshData();
      }
    );

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
      // Reset do debounce ao trocar de conta (força carregamento imediato)
      lastContactsLoadRef.current = 0;

      // Carregar contatos imediatamente
      const loadContacts = async () => {
        // ✅ Debounce: Evitar chamadas mais rápidas que 2 segundos (mesma conta)
        const now = Date.now();
        const timeSinceLastLoad = now - lastContactsLoadRef.current;
        if (timeSinceLastLoad < 2000 && timeSinceLastLoad > 0) {
          console.log(
            "⏳ [FRONTEND] Ignorando loadContacts (debounce de 2s). Tempo desde última: " +
              timeSinceLastLoad +
              "ms"
          );
          return;
        }

        // Evitar múltiplas chamadas simultâneas
        if (isLoadingContactsRef.current) {
          console.log(
            "⏳ [FRONTEND] Ignorando chamada duplicada de loadContacts (já em progresso)"
          );
          return;
        }

        isLoadingContactsRef.current = true;
        lastContactsLoadRef.current = now;

        try {
          console.log(
            "📞 [FRONTEND] Carregando contatos para conta:",
            selectedAccount.id
          );
          const res = await fetch(
            `${API_URL}/api/contacts/${selectedAccount.id}`
          );
          if (res.ok) {
            const data: Contact[] = await res.json();

            // ✅ CORREÇÃO: Remover duplicatas caso existam
            const uniqueContacts: Contact[] = Array.from(
              new Map(data.map((c) => [c.id, c])).values()
            );

            if (uniqueContacts.length !== data.length) {
              console.warn(
                `⚠️ [FRONTEND] Duplicatas de contatos detectadas! Total: ${data.length}, Únicos: ${uniqueContacts.length}`
              );
            }

            console.log(
              "📞 [FRONTEND] ✅ Contatos carregados:",
              uniqueContacts.length
            );
            setContacts(uniqueContacts);
          } else {
            console.error(
              "📞 [FRONTEND] ❌ Erro ao carregar contatos:",
              res.status
            );
          }
        } catch (err) {
          console.error("📞 [FRONTEND] ❌ Error loading contacts:", err);
        } finally {
          isLoadingContactsRef.current = false;
        }
      };

      loadContacts();

      // Limpar contato selecionado ao trocar de conta
      setSelectedContact(null);

      return () => {
        isLoadingContactsRef.current = false;
      };
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
    // ✅ Debounce: Evitar chamadas mais rápidas que 3 segundos
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshDataRef.current;
    if (timeSinceLastRefresh < 3000) {
      console.log(
        "⏳ [FRONTEND] Ignorando refreshData (debounce de 3s). Tempo desde última: " +
          timeSinceLastRefresh +
          "ms"
      );
      return;
    }

    // Evitar múltiplas chamadas simultâneas
    if (isRefreshingDataRef.current) {
      console.log("⏳ [FRONTEND] Ignorando refreshData (já em progresso)");
      return;
    }

    isRefreshingDataRef.current = true;
    lastRefreshDataRef.current = now;

    try {
      console.log("🔄 [FRONTEND] Executando refreshData...");

      // Buscar contas
      const accountsRes = await fetch(`${API_URL}/api/accounts`);
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData);
      }

      // ⚠️ NÃO buscar contatos aqui - deixa o useEffect gerenciar isso
      // para evitar loop infinito

      // Buscar estatísticas
      const statsRes = await fetch(`${API_URL}/api/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      console.log("✅ [FRONTEND] refreshData concluído");
    } catch (error) {
      console.error("❌ [FRONTEND] Error refreshing data:", error);
    } finally {
      isRefreshingDataRef.current = false;
    }
  };

  const fetchMessages = async (accountId: string, contactNumber: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/messages/${accountId}/${contactNumber}`
      );
      if (res.ok) {
        const data: Message[] = await res.json();

        // ✅ CORREÇÃO: Remover duplicatas caso existam (usar Map para garantir IDs únicos)
        const uniqueMessages: Message[] = Array.from(
          new Map(data.map((msg) => [msg.id, msg])).values()
        );

        if (uniqueMessages.length !== data.length) {
          console.warn(
            `⚠️ [FRONTEND] Duplicatas detectadas! Total: ${data.length}, Únicos: ${uniqueMessages.length}`
          );
        }

        setMessages(uniqueMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const addAccount = async (name: string) => {
    try {
      console.log("🟢 [CONTEXT] addAccount() iniciado");
      console.log("🟢 [CONTEXT] Enviando POST para " + API_URL + "/api/accounts");
      console.log("🟢 [CONTEXT] Payload:", { name });

      const response = await fetch(`${API_URL}/api/accounts`, {
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
