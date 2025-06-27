// test-email.js
// Script para testar a configuração de email diretamente
require('dotenv').config();
const { sendPasswordResetEmail, verifyEmailConfig } = require('./modules/email/emailService');

async function runEmailTests() {
  console.log("======== TESTE DE VERIFICAÇÃO DE EMAIL ========");
  console.log("Configurações carregadas do .env:");
  console.log("HOST:", process.env.EMAIL_HOST);
  console.log("PORT:", process.env.EMAIL_PORT);
  console.log("SECURE:", process.env.EMAIL_SECURE);
  console.log("USER:", process.env.EMAIL_USER);
  console.log("PASS:", process.env.EMAIL_PASS ? "******" : "NÃO DEFINIDO");
  console.log("FROM:", process.env.EMAIL_FROM);
  
  try {
    console.log("\nVerificando configuração do email...");
    const configResult = await verifyEmailConfig();
    console.log("Resultado da verificação:", configResult);
    
    if (configResult.success) {
      console.log("\nEnviando email de teste...");
      const testEmail = process.env.EMAIL_USER; // Enviar para o próprio email
      const emailResult = await sendPasswordResetEmail(
        testEmail,
        "token-de-teste-123456",
        "Usuário de Teste",
        "localhost:3000"
      );
      
      console.log("Resultado do envio:", emailResult);
    }
  } catch (error) {
    console.error("Erro durante os testes:", error);
  }
}

// Executar os testes
runEmailTests();