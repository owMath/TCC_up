// app.js - Arquivo principal da aplicação (atualizado)
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { ObjectId } = require('mongodb');
const { connectToDatabase, registerUser, loginUser, verifyToken, generatePasswordResetToken, verifyResetToken, resetPassword, getUserById, updateUserProfile } = require('./modules/auth/auth');
const { setupWebSocketServer } = require('./websocket-integration');
const { sendPasswordResetEmail, verifyEmailConfig } = require('./modules/email/emailService');
require('dotenv').config();

// Tratamento de erros globais não capturados
process.on('uncaughtException', (error) => {
  console.error(`[ERRO FATAL] Exceção não tratada:`, error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERRO FATAL] Promessa rejeitada não tratada:', reason);
});

// Inicializar app Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'templates')));

// Middleware para logar todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Conectar ao MongoDB antes de iniciar o servidor
(async () => {
 try {
   console.log('[INICIALIZAÇÃO] Conectando ao MongoDB...');
   await connectToDatabase();
   
   // Verificar configuração de email
   console.log('[INICIALIZAÇÃO] Verificando configuração de email...');
   const emailConfigCheck = await verifyEmailConfig();
   console.log('[INICIALIZAÇÃO] Verificação da configuração de email:', emailConfigCheck);
   
   // Rotas
   app.get('/', (req, res) => {
     console.log('[ACESSO] Página de login acessada');
     res.sendFile(path.join(__dirname, 'templates', 'login.html'));
   });

   // Rota para página de dashboard (protegida)
   app.get('/dashboard', (req, res) => {
     console.log('[ACESSO] Dashboard acessado');
     res.sendFile(path.join(__dirname, 'templates', 'dashboard.html'));
   });

   // Rota para página de solicitação de recuperação de senha
   app.get('/forgot-password', (req, res) => {
     console.log('[ACESSO] Página de recuperação de senha acessada');
     res.sendFile(path.join(__dirname, 'templates', 'forgot-password.html'));
   });

   // Rota para página de redefinição de senha
   app.get('/reset-password', (req, res) => {
     console.log('[ACESSO] Página de redefinição de senha acessada com token');
     res.sendFile(path.join(__dirname, 'templates', 'reset-password.html'));
   });

   // API de autenticação
   app.post('/api/register', async (req, res) => {
     // Extrair dados básicos para validação
     const { name, email, password } = req.body;
     console.log(`[REGISTRO] Tentativa de registro para email: ${email}`);
     
     if (!name || !email || !password) {
       console.log(`[REGISTRO] Falha - Campos obrigatórios não preenchidos`);
       return res.status(400).json({ success: false, message: 'Nome, e-mail e senha são obrigatórios' });
     }
     
     // Passar o objeto completo para a função de registro
     const result = await registerUser(req.body);
     
     if (result.success) {
       console.log(`[REGISTRO] Sucesso - Novo usuário: ${name} (${email})`);
     } else {
       console.log(`[REGISTRO] Falha - Motivo: ${result.message}`);
     }
     
     res.status(result.success ? 201 : 400).json(result);
   });

   app.post('/api/login', async (req, res) => {
     const { email, password } = req.body;
     console.log(`[LOGIN] Tentativa para email: ${email}`);
     
     if (!email || !password) {
       console.log(`[LOGIN] Falha - Campos obrigatórios não preenchidos`);
       return res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios' });
     }
     
     const result = await loginUser(email, password);
     
     if (result.success) {
       console.log(`[LOGIN] Sucesso - Usuário: ${result.user.name} (${email})`);
     } else {
       console.log(`[LOGIN] Falha - Motivo: ${result.message}`);
     }
     
     res.status(result.success ? 200 : 401).json(result);
   });

   // Nova rota para obter dados do perfil do usuário
   app.get('/api/profile', verifyToken, async (req, res) => {
     try {
       const userId = req.user.userId;
       console.log(`[PERFIL] Solicitação de dados para usuário ID: ${userId}`);
       
       const result = await getUserById(userId);
       
       if (result.success) {
         console.log(`[PERFIL] Dados recuperados com sucesso para: ${result.user.name}`);
         res.json({ success: true, user: result.user });
       } else {
         console.log(`[PERFIL] Falha - Motivo: ${result.message}`);
         res.status(404).json({ success: false, message: result.message });
       }
     } catch (error) {
       console.error('[PERFIL] Erro ao buscar perfil:', error);
       res.status(500).json({ success: false, message: 'Erro interno no servidor' });
     }
   });

   // Nova rota para atualizar o perfil do usuário
   app.put('/api/profile', verifyToken, async (req, res) => {
     try {
       const userId = req.user.userId;
       const userData = req.body;
       console.log(`[PERFIL] Solicitação de atualização para usuário ID: ${userId}`);
       
       // Evitar que o usuário altere seu papel/nível de acesso
       delete userData.role;
       delete userData.accessLevel;
       
       const result = await updateUserProfile(userId, userData);
       
       if (result.success) {
         // Obter o perfil atualizado para retornar
         const updatedProfile = await getUserById(userId);
         console.log(`[PERFIL] Atualizado com sucesso: ${result.message}`);
         res.json({
           success: true,
           message: result.message,
           user: updatedProfile.success ? updatedProfile.user : null
         });
       } else {
         console.log(`[PERFIL] Falha na atualização: ${result.message}`);
         res.status(400).json({ success: false, message: result.message });
       }
     } catch (error) {
       console.error('[PERFIL] Erro ao atualizar perfil:', error);
       res.status(500).json({ success: false, message: 'Erro interno no servidor' });
     }
   });

   // API para solicitar redefinição de senha - CORRIGIDA
   app.post('/api/forgot-password', async (req, res) => {
     try {
       const { email } = req.body;
       console.log(`[RECUPERAÇÃO] Solicitação para email: ${email}`);
       
       if (!email) {
         console.log(`[RECUPERAÇÃO] Falha - Email não fornecido`);
         return res.status(400).json({ success: false, message: 'E-mail é obrigatório' });
       }
       
       console.log(`[RECUPERAÇÃO] Gerando token para: ${email}`);
       const result = await generatePasswordResetToken(email);
       
       if (result.success) {
         console.log(`[RECUPERAÇÃO] Token gerado com sucesso para: ${email}`);
         // Usar o serviço de email criado em vez de configurar nodemailer diretamente
         console.log(`[RECUPERAÇÃO] Enviando email para: ${email}`);
         const emailResult = await sendPasswordResetEmail(
           email, 
           result.resetToken, 
           result.username || 'usuário', // Usar 'usuário' como fallback se username não estiver disponível
           req.headers.host
         );

         if (emailResult.success) {
           console.log(`[RECUPERAÇÃO] Email enviado com sucesso para: ${email}`);
           return res.json({ 
             success: true, 
             message: 'Email de recuperação enviado com sucesso'
           });
         } else {
           console.error(`[RECUPERAÇÃO] Erro ao enviar email para ${email}:`, emailResult.error);
           return res.status(500).json({ 
             success: false, 
             message: 'Erro ao enviar email de recuperação'
           });
         }
       } else {
         console.log(`[RECUPERAÇÃO] Falha ao gerar token: ${result.message}`);
         return res.status(400).json(result);
       }
     } catch (error) {
       console.error('[RECUPERAÇÃO] Erro na recuperação de senha:', error);
       res.status(500).json({ success: false, message: 'Erro interno no servidor' });
     }
   });

   // API para verificar token de redefinição
   app.get('/api/verify-reset-token', async (req, res) => {
     try {
       const { token } = req.query;
       console.log(`[TOKEN] Verificando token: ${token ? token.substring(0, 10) + '...' : 'não fornecido'}`);
       
       if (!token) {
         console.log(`[TOKEN] Falha - Token não fornecido`);
         return res.status(400).json({ success: false, message: 'Token é obrigatório' });
       }
       
       const result = await verifyResetToken(token);
       
       if (result.success) {
         console.log(`[TOKEN] Token válido para email: ${result.email}`);
       } else {
         console.log(`[TOKEN] Token inválido: ${result.message}`);
       }
       
       res.json(result);
     } catch (error) {
       console.error('[TOKEN] Erro ao verificar token:', error);
       res.status(500).json({ success: false, message: 'Erro interno no servidor' });
     }
   });

   // API para definir nova senha
   app.post('/api/reset-password', async (req, res) => {
     try {
       const { token, password } = req.body;
       console.log(`[REDEFINIÇÃO] Tentativa com token: ${token ? token.substring(0, 10) + '...' : 'não fornecido'}`);
       
       if (!token || !password) {
         console.log(`[REDEFINIÇÃO] Falha - Token ou senha não fornecidos`);
         return res.status(400).json({ success: false, message: 'Token e senha são obrigatórios' });
       }
       
       if (password.length < 6) {
         console.log(`[REDEFINIÇÃO] Falha - Senha muito curta`);
         return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres' });
       }
       
       const result = await resetPassword(token, password);
       
       if (result.success) {
         console.log(`[REDEFINIÇÃO] Senha redefinida com sucesso`);
       } else {
         console.log(`[REDEFINIÇÃO] Falha ao redefinir senha: ${result.message}`);
       }
       
       res.json(result);
     } catch (error) {
       console.error('[REDEFINIÇÃO] Erro ao redefinir senha:', error);
       res.status(500).json({ success: false, message: 'Erro interno no servidor' });
     }
   });

   // API para dados de máquinas (protegida)
   app.get('/api/machines', verifyToken, async (req, res) => {
     try {
       console.log(`[MÁQUINAS] Solicitação de lista de máquinas por usuário ID: ${req.user.userId}`);
       const db = await connectToDatabase();
       
       // Buscar máquinas únicas
       const machines = await db.collection('machine_data')
         .aggregate([
           { $sort: { timestamp: -1 } },
           { $group: { _id: "$machineId", data: { $first: "$$ROOT" } } },
           { $replaceRoot: { newRoot: "$data" } }
         ])
         .toArray();
       
       console.log(`[MÁQUINAS] ${machines.length} máquinas recuperadas`);
       res.json({ success: true, machines });
     } catch (error) {
       console.error('[MÁQUINAS] Erro ao buscar máquinas:', error);
       res.status(500).json({ success: false, message: 'Erro ao buscar máquinas' });
     }
   });

   // API para dados históricos de uma máquina (protegida)
   app.get('/api/machines/:machineId/history', verifyToken, async (req, res) => {
     try {
       const { machineId } = req.params;
       console.log(`[HISTÓRICO] Solicitação para máquina: ${machineId} por usuário ID: ${req.user.userId}`);
       
       const db = await connectToDatabase();
       
       // Buscar histórico da máquina
       const history = await db.collection('machine_data')
         .find({ machineId: machineId })
         .sort({ timestamp: -1 })
         .limit(100)
         .toArray();
       
       console.log(`[HISTÓRICO] ${history.length} registros recuperados para máquina: ${machineId}`);
       res.json({ success: true, history });
     } catch (error) {
       console.error(`[HISTÓRICO] Erro ao buscar histórico da máquina ${req.params.machineId}:`, error);
       res.status(500).json({ success: false, message: 'Erro ao buscar histórico da máquina' });
     }
   });

   // API para dados de OEE (protegida)
   app.get('/api/oee', verifyToken, async (req, res) => {
     try {
       const { machineId, startDate, endDate } = req.query;
       console.log(`[OEE] Cálculo solicitado para máquina: ${machineId || 'todas'} por usuário ID: ${req.user.userId}`);
       console.log(`[OEE] Período: ${startDate || 'sem início'} até ${endDate || 'sem fim'}`);
       
       const db = await connectToDatabase();
       
       // Definir filtros de consulta
       const query = {};
       if (machineId) query.machineId = machineId;
       
       // Adicionar filtro de data se fornecido
       if (startDate || endDate) {
         query.timestamp = {};
         if (startDate) query.timestamp.$gte = new Date(startDate);
         if (endDate) query.timestamp.$lte = new Date(endDate);
       }
       
       // Buscar dados para calcular OEE
       const machineData = await db.collection('machine_data')
         .find(query)
         .sort({ timestamp: -1 })
         .toArray();
         
       if (machineData.length === 0) {
         console.log(`[OEE] Nenhum dado encontrado para os filtros fornecidos`);
         return res.status(404).json({ 
           success: false, 
           message: 'Nenhum dado encontrado para calcular OEE' 
         });
       }

       console.log(`[OEE] ${machineData.length} registros encontrados, calculando métricas...`);
       
       // Calcular componentes do OEE
       const availability = calculateAvailability(machineData);
       const performance = calculatePerformance(machineData);
       const quality = calculateQuality(machineData);
       
       // Calcular OEE total (multiplicação dos três fatores)
       const totalOEE = (availability * performance * quality) / 10000;
       
       // Formatar resultados para 1 casa decimal
       const formatValue = (value) => Number(value.toFixed(1));
       
       const oee = {
         total: formatValue(totalOEE),
         availability: formatValue(availability),
         performance: formatValue(performance),
         quality: formatValue(quality)
       };
       
       console.log(`[OEE] Cálculo concluído - OEE Total: ${oee.total}%`);
       console.log(`[OEE] Disponibilidade: ${oee.availability}%, Desempenho: ${oee.performance}%, Qualidade: ${oee.quality}%`);
       
       res.json({ 
         success: true, 
         oee,
         analysedPeriod: {
           start: machineData[machineData.length - 1].timestamp,
           end: machineData[0].timestamp,
           totalRecords: machineData.length
         }
       });
       
     } catch (error) {
       console.error('[OEE] Erro ao calcular OEE:', error);
       res.status(500).json({ success: false, message: 'Erro ao calcular OEE' });
     }
   });

   // Iniciar servidor com WebSocket
   const server = setupWebSocketServer(app);
   
   server.listen(PORT, () => {
     console.log('===========================================');
     console.log(`[SERVIDOR] Aplicação iniciada na porta ${PORT}`);
     console.log(`[SERVIDOR] Modo: ${process.env.NODE_ENV || 'desenvolvimento'}`);
     console.log('===========================================');
   });
   
   // Iniciar servidor TCP em um processo separado para receber dados das máquinas
   const { fork } = require('child_process');
   console.log('[SERVIDOR TCP] Iniciando servidor TCP...');
   const tcpProcess = fork('./tcp-server.js');
   
   tcpProcess.on('message', (message) => {
     console.log('[SERVIDOR TCP] Mensagem recebida:', message);
   });
   
   tcpProcess.on('error', (error) => {
     console.error('[SERVIDOR TCP] Erro:', error);
   });
   
 } catch (error) {
   console.error('[ERRO FATAL] Erro ao iniciar o servidor:', error);
   process.exit(1);
 }
})();

/**
* Calcula o componente de disponibilidade do OEE
* Disponibilidade = (Tempo de Operação / Tempo Planejado) * 100
*/
function calculateAvailability(machineData) {
 let totalPlannedTime = 0;
 let totalOperatingTime = 0;
 
 machineData.forEach(record => {
   // Verificar se os dados necessários estão disponíveis
   if (record.plannedProductionTime && record.downtime !== undefined) {
     totalPlannedTime += record.plannedProductionTime;
     totalOperatingTime += (record.plannedProductionTime - record.downtime);
   }
 });
 
 // Evitar divisão por zero
 if (totalPlannedTime === 0) return 0;
 
 return (totalOperatingTime / totalPlannedTime) * 100;
}

/**
* Calcula o componente de performance do OEE
* Performance = ((Peças Produzidas * Tempo de Ciclo Ideal) / Tempo de Operação) * 100
*/
function calculatePerformance(machineData) {
 let totalOperatingTime = 0;
 let totalIdealProductionTime = 0;
 
 machineData.forEach(record => {
   // Verificar se os dados necessários estão disponíveis
   if (
     record.plannedProductionTime !== undefined && 
     record.downtime !== undefined && 
     record.partsProduced !== undefined && 
     record.idealCycleTime !== undefined
   ) {
     const operatingTime = record.plannedProductionTime - record.downtime;
     totalOperatingTime += operatingTime;
     totalIdealProductionTime += (record.partsProduced * record.idealCycleTime);
   }
 });
 
 // Evitar divisão por zero
 if (totalOperatingTime === 0) return 0;
 
 return (totalIdealProductionTime / totalOperatingTime) * 100;
}

/**
* Calcula o componente de qualidade do OEE
* Qualidade = (Peças Boas / Peças Produzidas) * 100
*/
function calculateQuality(machineData) {
 let totalPartsProduced = 0;
 let totalGoodParts = 0;
 
 machineData.forEach(record => {
   // Verificar se os dados necessários estão disponíveis
   if (record.partsProduced !== undefined && record.defectiveParts !== undefined) {
     totalPartsProduced += record.partsProduced;
     totalGoodParts += (record.partsProduced - record.defectiveParts);
   }
 });
 
 // Evitar divisão por zero
 if (totalPartsProduced === 0) return 0;
 
 return (totalGoodParts / totalPartsProduced) * 100;
}