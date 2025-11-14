/**
 * AddAccountModal Component
 * 
 * Modal para adicionar nova conta WhatsApp (exibe QR Code)
 */

import React, { useState } from 'react';
import { X, Smartphone, Loader } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AddAccountModalProps {
  onClose: () => void;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose }) => {
  const { addAccount, qrCode, connectionStatus } = useApp();
  const [name, setName] = useState('');
  const [step, setStep] = useState<'form' | 'qr'>('form');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    console.log('🔵 [FRONTEND] Botão "Gerar QR Code" clicado');
    console.log('🔵 [FRONTEND] Nome digitado:', name);

    setLoading(true);
    try {
      console.log('🔵 [FRONTEND] Chamando addAccount()...');
      await addAccount(name);
      console.log('🔵 [FRONTEND] addAccount() concluído com sucesso');
      console.log('🔵 [FRONTEND] Mudando para step "qr" para exibir QR Code');
      setStep('qr');
    } catch (error) {
      console.error('🔴 [FRONTEND] Erro ao adicionar conta:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Adicionar Conta</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Conta
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Minha Conta Principal"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Dê um nome para identificar esta conta
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Smartphone className="text-blue-600 flex-shrink-0" size={20} />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Como funciona:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700">
                      <li>Clique em "Gerar QR Code"</li>
                      <li>Abra o WhatsApp no celular</li>
                      <li>Vá em Mais opções → Dispositivos conectados</li>
                      <li>Escaneie o QR Code</li>
                      <li>O número será detectado automaticamente</li>
                    </ol>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader size={20} className="animate-spin" />}
                {loading ? 'Gerando...' : 'Gerar QR Code'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              {connectionStatus === 'connected' ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Smartphone size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Conectado com sucesso!
                  </h3>
                  <p className="text-sm text-gray-500">
                    Sua conta está pronta para uso
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              ) : qrCode ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Escaneie o QR Code
                  </h3>
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <img src={qrCode} alt="QR Code" className="w-full h-auto" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Abra o WhatsApp no celular e escaneie este código
                  </p>
                  <ol className="text-xs text-gray-600 text-left space-y-1">
                    <li>1. Abra WhatsApp no celular</li>
                    <li>2. Toque em Menu ou Configurações</li>
                    <li>3. Toque em Aparelhos conectados</li>
                    <li>4. Toque em Conectar um aparelho</li>
                    <li>5. Aponte o celular para esta tela</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-4">
                  <Loader size={48} className="animate-spin text-blue-500 mx-auto" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Gerando QR Code...
                  </h3>
                  <p className="text-sm text-gray-500">
                    Aguarde alguns instantes
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal;
