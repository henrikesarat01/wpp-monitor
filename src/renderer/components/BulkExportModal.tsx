import { useState, useEffect } from "react";
import { X, Calendar, Download, Loader } from "lucide-react";

interface BulkExportModalProps {
  accountId: string;
  onClose: () => void;
}

export default function BulkExportModal({
  accountId,
  onClose,
}: BulkExportModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // Definir data padrão: últimos 30 dias
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setEndDate(end.toISOString().split("T")[0]);
    setStartDate(start.toISOString().split("T")[0]);
  }, []);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Por favor, selecione as datas de início e fim");
      return;
    }

    setIsExporting(true);
    setStatus("Iniciando exportação...");

    try {
      const response = await fetch("http://localhost:3000/api/export-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          startDate: new Date(startDate + "T00:00:00").toISOString(),
          endDate: new Date(endDate + "T23:59:59").toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao exportar conversas");
      }

      const data = await response.json();

      if (data.conversations.length === 0) {
        alert("Nenhuma conversa encontrada no período selecionado");
        setIsExporting(false);
        return;
      }

      setStatus(`Gerando PDF com ${data.conversations.length} conversas...`);

      // Preparar dados para o PDF
      const exportData = {
        accountId,
        startDate,
        endDate,
        totalConversations: data.conversations.length,
        conversations: data.conversations,
        exportDate: new Date().toLocaleDateString("pt-BR"),
      };

      // Salvar PDF usando Electron
      const filename = `Conversas_${startDate}_${endDate}.pdf`;
      const filePath = await window.electron.saveFile(
        filename,
        JSON.stringify(exportData)
      );

      if (filePath) {
        alert(`PDF exportado com sucesso!\n\nLocal: ${filePath}`);
        onClose();
      } else {
        throw new Error("Exportação cancelada ou erro ao salvar PDF");
      }
    } catch (error) {
      console.error("Erro ao exportar:", error);
      alert("Erro ao exportar conversas: " + (error as Error).message);
    } finally {
      setIsExporting(false);
      setStatus("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Exportar Conversas
          </h2>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filtros de Data */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isExporting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isExporting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>

        {/* Status */}
        {isExporting && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm font-medium">{status}</span>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="mb-2">
            <strong>O PDF incluirá:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Resumo de cada conversa</li>
            <li>Informações de leads (produtos, valores, objeções)</li>
            <li>Análise de métricas (mensagens, engajamento)</li>
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            * Dados serão gerados automaticamente se não estiverem em cache
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !startDate || !endDate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader size={16} className="animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download size={16} />
                Exportar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
