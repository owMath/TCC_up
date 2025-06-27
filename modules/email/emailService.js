// modules/email/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuração do transporte de email
const createTransporter = () => {
  // Use as variáveis de ambiente definidas no .env
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    }
  });
};

// Função para enviar email de recuperação de senha
async function sendPasswordResetEmail(email, resetToken, username, host) {
  try {
    const transporter = createTransporter();
    
    // URL de recuperação com o token
    const resetUrl = `http://${host}/reset-password?token=${resetToken}`;
    
    // Conteúdo do email
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Sistema OEE" <noreply@sistema-oee.com>',
      to: email,
      subject: 'Recuperação de Senha - Sistema OEE',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a73e8;">Recuperação de Senha - Sistema OEE</h2>
          <p>Olá ${username || 'usuário'},</p>
          <p>Recebemos uma solicitação para redefinir sua senha do Sistema OEE.</p>
          <p>Clique no botão abaixo para definir uma nova senha. Este link é válido por 1 hora.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Redefinir Senha</a>
          </div>
          <p>Se você não solicitou esta recuperação, ignore este email.</p>
          <p>Atenciosamente,<br>Equipe Sistema OEE</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">Este é um email automático, não responda a esta mensagem.</p>
        </div>
      `
    };

    // Enviar o email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return { success: false, error: error.message };
  }
}

// Verificar a configuração do email (teste de conexão)
async function verifyEmailConfig() {
  try {
    const transporter = createTransporter();
    const verification = await transporter.verify();
    return { success: true, message: 'Configuração de email verificada com sucesso' };
  } catch (error) {
    console.error('Erro na configuração de email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail,
  verifyEmailConfig
};