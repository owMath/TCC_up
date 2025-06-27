// test-smtp.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log("=== TESTE DE CONEXÃO SMTP COM GMAIL ===");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "[CONFIGURADO]" : "[NÃO CONFIGURADO]");
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      debug: true // Ativar logs detalhados
    });
    
    console.log("Verificando configuração...");
    const verification = await transporter.verify();
    console.log("Verificação bem-sucedida!");
    
    console.log("Enviando email de teste...");
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER,
      subject: "Teste de conexão SMTP",
      html: "<p>Este é um email de teste para verificar a conexão SMTP.</p>"
    });
    
    console.log("Email enviado com sucesso!");
    console.log("ID da mensagem:", info.messageId);
    return true;
  } catch (error) {
    console.error("ERRO NA CONEXÃO SMTP:", error);
    return false;
  }
}

testSMTP().then(success => {
  if (success) {
    console.log("\nTeste concluído com sucesso!");
  } else {
    console.log("\nTeste falhou!");
  }
});