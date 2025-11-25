/**
 * Serviço de Transcrição de Áudio
 * Usa Groq API (GRATUITA!) com Whisper Large v3 para transcrição
 */

import fs from "fs";

class TranscriptionService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.available = !!this.apiKey;
    this.apiUrl = "https://api.groq.com/openai/v1/audio/transcriptions";

    if (this.available) {
      console.log("✅ [TRANSCRIPTION] Serviço Groq inicializado (GRATUITO!)");
      console.log("🚀 [TRANSCRIPTION] Usando Whisper Large v3 - Alta precisão");
      console.log("💰 [TRANSCRIPTION] Custo: R$0.00 (144 req/min grátis)");
    } else {
      console.warn("⚠️  [TRANSCRIPTION] GROQ_API_KEY não configurada");
      console.warn(
        "⚠️  [TRANSCRIPTION] Crie uma conta gratuita em: https://console.groq.com"
      );
    }
  }

  /**
   * Transcreve um arquivo de áudio usando Groq API (Whisper Large v3)
   */
  async transcribeAudio(audioFilePath, language = "pt") {
    if (!this.available) {
      throw new Error(
        "Groq API key não configurada. Crie gratuitamente em https://console.groq.com"
      );
    }

    console.log(`🎤 [TRANSCRIPTION] Transcrevendo áudio: ${audioFilePath}`);
    console.log(`🚀 [TRANSCRIPTION] Usando Groq API (GRATUITO!)`);

    try {
      // Verificar se o arquivo existe
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Arquivo de áudio não encontrado: ${audioFilePath}`);
      }

      const fileStats = fs.statSync(audioFilePath);
      const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
      console.log(`📊 [TRANSCRIPTION] Tamanho do arquivo: ${fileSizeMB}MB`);

      const startTime = Date.now();

      // Usar child_process para chamar curl (mais confiável para multipart)
      const { execSync } = await import("child_process");

      const curlCommand = `curl -s -X POST "${this.apiUrl}" \
        -H "Authorization: Bearer ${this.apiKey}" \
        -F "file=@${audioFilePath}" \
        -F "model=whisper-large-v3-turbo" \
        -F "language=${language}" \
        -F "response_format=json"`;

      const stdout = execSync(curlCommand, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      const result = JSON.parse(stdout);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`⏱️  [TRANSCRIPTION] Transcrito em ${duration}s`);
      console.log(`✅ [TRANSCRIPTION] Transcrição concluída com sucesso`);
      console.log(`📝 [TRANSCRIPTION] Texto: "${result.text || "(vazio)"}"`);

      return {
        text: result.text || "",
        provider: "groq",
        duration: parseFloat(duration),
      };
    } catch (error) {
      console.error(`❌ [TRANSCRIPTION] Erro ao transcrever:`, error.message);
      throw error;
    }
  }

  /**
   * Transcreve múltiplos áudios em lote
   */
  async transcribeBatch(audios, language = "pt") {
    console.log(
      `🎤 [TRANSCRIPTION] Transcrevendo ${audios.length} áudios em lote...`
    );

    const results = [];

    for (const audio of audios) {
      try {
        const transcription = await this.transcribeAudio(
          audio.audioFilePath,
          language
        );

        results.push({
          id: audio.id,
          transcription: transcription.text,
          duration: transcription.duration,
          provider: transcription.provider,
        });

        // Pequeno delay entre requisições
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `❌ [TRANSCRIPTION] Erro ao transcrever áudio ${audio.id}:`,
          error.message
        );
        results.push({
          id: audio.id,
          transcription: null,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Retorna informações sobre o serviço de transcrição
   */
  getStatus() {
    return {
      available: this.available,
      provider: "groq",
      model: "whisper-large-v3-turbo",
      free: true,
      cost: "R$ 0,00 (144 requisições/minuto)",
      rateLimit: "144 req/min",
    };
  }
}

// Singleton
const transcriptionService = new TranscriptionService();

export default transcriptionService;
