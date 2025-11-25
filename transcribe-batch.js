#!/usr/bin/env node

/**
 * Script: Transcrever Áudios em Lote
 *
 * Este script processa todas as mensagens de áudio ainda não transcritas
 * Útil para transcrever áudios antigos de uma vez só
 */

import "dotenv/config";
import transcriptionService from "./src/server/transcription-service.js";
import db from "./src/server/database.js";
import path from "path";
import fs from "fs";

// Configurações
const BATCH_SIZE = 10; // Processar 10 áudios por vez
const DELAY_BETWEEN_BATCHES = 2000; // 2 segundos entre lotes

console.log("🎤 ========================================");
console.log("🎤 TRANSCRIÇÃO EM LOTE DE ÁUDIOS");
console.log("🎤 ========================================\n");

// Verificar se serviço está disponível
if (!transcriptionService.isAvailable()) {
  console.error("❌ Serviço de transcrição não disponível");
  console.error("💡 Configure OPENAI_API_KEY no .env");
  process.exit(1);
}

console.log("✅ Serviço de transcrição disponível\n");

// Buscar áudios não transcritos
console.log("📊 Buscando mensagens de áudio...");
const untranscribedAudios = db.db
  .prepare(
    `
  SELECT 
    id, 
    mediaUrl, 
    timestamp,
    accountId,
    direction
  FROM messages 
  WHERE type = 'audio' 
    AND mediaUrl IS NOT NULL 
    AND audioTranscription IS NULL
  ORDER BY timestamp DESC
`
  )
  .all();

console.log(
  `📊 Total de áudios não transcritos: ${untranscribedAudios.length}`
);

if (untranscribedAudios.length === 0) {
  console.log("✅ Todos os áudios já foram transcritos!");
  process.exit(0);
}

// Confirmar com usuário
console.log("\n⚠️  ATENÇÃO:");
console.log(
  `   Este script irá transcrever ${untranscribedAudios.length} mensagens de áudio`
);
const estimatedMinutes = untranscribedAudios.length * 0.5; // Estimativa: 30s por áudio
const estimatedCost = estimatedMinutes * 0.006;
console.log(`   Tempo estimado: ${estimatedMinutes.toFixed(1)} minutos`);
console.log(`   Custo estimado: $${estimatedCost.toFixed(2)}`);
console.log("\n   Pressione CTRL+C para cancelar ou aguarde 5 segundos...\n");

// Aguardar 5 segundos
await new Promise((resolve) => setTimeout(resolve, 5000));

console.log("🚀 Iniciando transcrição em lote...\n");

let processed = 0;
let success = 0;
let failed = 0;
let notFound = 0;

// Processar em lotes
for (let i = 0; i < untranscribedAudios.length; i += BATCH_SIZE) {
  const batch = untranscribedAudios.slice(i, i + BATCH_SIZE);
  const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(untranscribedAudios.length / BATCH_SIZE);

  console.log(
    `📦 Processando lote ${batchNumber}/${totalBatches} (${batch.length} áudios)...`
  );

  for (const audio of batch) {
    processed++;
    const progress = ((processed / untranscribedAudios.length) * 100).toFixed(
      1
    );

    try {
      const audioPath = path.join(process.cwd(), audio.mediaUrl);

      if (!fs.existsSync(audioPath)) {
        console.log(
          `   ⚠️  [${progress}%] Arquivo não encontrado: ${audio.id.substring(
            0,
            12
          )}...`
        );
        notFound++;
        continue;
      }

      console.log(
        `   🎤 [${progress}%] Transcrevendo: ${audio.id.substring(0, 12)}...`
      );

      const transcription = await transcriptionService.transcribeAudio(
        audioPath,
        "pt"
      );

      // Salvar no banco
      db.db
        .prepare(
          `
        UPDATE messages 
        SET audioTranscription = ?,
            audioTranscribedAt = datetime('now'),
            audioTranscriptionProvider = ?
        WHERE id = ?
      `
        )
        .run(transcription.text, transcription.provider, audio.id);

      console.log(
        `   ✅ [${progress}%] Sucesso: "${transcription.text.substring(
          0,
          40
        )}..."`
      );
      success++;
    } catch (error) {
      console.error(
        `   ❌ [${progress}%] Erro em ${audio.id.substring(0, 12)}: ${
          error.message
        }`
      );
      failed++;
    }

    // Pequeno delay entre transcrições
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Delay entre lotes
  if (i + BATCH_SIZE < untranscribedAudios.length) {
    console.log(`   ⏳ Aguardando ${DELAY_BETWEEN_BATCHES / 1000}s...\n`);
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
  }
}

// Resumo final
console.log("\n🎤 ========================================");
console.log("🎤 TRANSCRIÇÃO CONCLUÍDA");
console.log("🎤 ========================================\n");

console.log("📊 ESTATÍSTICAS:");
console.log(`   Total processado: ${processed}`);
console.log(`   ✅ Sucesso: ${success}`);
console.log(`   ❌ Falhas: ${failed}`);
console.log(`   ⚠️  Não encontrados: ${notFound}`);

const successRate =
  processed > 0 ? ((success / processed) * 100).toFixed(1) : 0;
console.log(`   📈 Taxa de sucesso: ${successRate}%`);

// Verificar quantos restam
const remainingCount = db.db
  .prepare(
    `
  SELECT COUNT(*) as count
  FROM messages 
  WHERE type = 'audio' 
    AND mediaUrl IS NOT NULL 
    AND audioTranscription IS NULL
`
  )
  .get().count;

console.log(`\n📊 Áudios ainda pendentes: ${remainingCount}`);

if (remainingCount === 0) {
  console.log("🎉 Parabéns! Todos os áudios foram transcritos!");
} else if (remainingCount === notFound) {
  console.log("⚠️  Os áudios pendentes são arquivos não encontrados no disco");
} else if (failed > 0) {
  console.log(
    "💡 Execute o script novamente para tentar transcrever as falhas"
  );
}

console.log("\n✅ Processo finalizado!\n");
process.exit(0);
