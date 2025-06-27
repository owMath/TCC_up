// modules/auth/auth.js - Módulo de autenticação
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// URL de conexão MongoDB (use variáveis de ambiente em produção)
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://math:1234@tcc.tbjfx.mongodb.net/?retryWrites=true&w=majority&appName=TCC';
const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_jwt_seguro'; // Use variáveis de ambiente em produção

// Cliente MongoDB
let client;
let db;

// Conectar ao MongoDB
async function connectToDatabase() {
 try {
   client = new MongoClient(MONGODB_URI);
   await client.connect();
   console.log('Conectado ao MongoDB Atlas');
   db = client.db('sistema_oee');
   return db;
 } catch (error) {
   console.error('Erro ao conectar ao MongoDB:', error);
   throw error;
 }
}

// Registrar novo usuário
async function registerUser(userData) {
 try {
   // Extrair dados básicos obrigatórios
   const { name, email, password } = userData;
   
   // Verificar campos obrigatórios
   if (!name || !email || !password) {
     return { success: false, message: 'Campos obrigatórios não preenchidos' };
   }
   
   // Verificar se o usuário já existe
   const usersCollection = db.collection('users');
   const existingUser = await usersCollection.findOne({ email });
   
   if (existingUser) {
     return { success: false, message: 'Este e-mail já está em uso' };
   }
   
   // Hash da senha
   const saltRounds = 10;
   const hashedPassword = await bcrypt.hash(password, saltRounds);
   
   // Criar novo usuário com todos os campos do formulário
   const newUser = {
     name: userData.name,
     email: userData.email,
     password: hashedPassword,
     phone: userData.phone || '',
     gender: userData.gender || '',
     city: userData.city || '',
     state: userData.state || '',
     department: userData.department || '',
     position: userData.position || '',
     employeeId: userData.employeeId || '',
     companySector: userData.companySector || '',
     accessLevel: userData.accessLevel || 'user',
     role: userData.accessLevel === 'admin' ? 'admin' : 'user',
     createdAt: new Date(),
     updatedAt: new Date()
   };
   
   // Inserir usuário no banco
   const result = await usersCollection.insertOne(newUser);
   
   if (result.insertedId) {
     return { 
       success: true, 
       message: 'Usuário registrado com sucesso',
       userId: result.insertedId
     };
   } else {
     return { success: false, message: 'Erro ao registrar usuário' };
   }
 } catch (error) {
   console.error('Erro no registro:', error);
   return { success: false, message: 'Erro interno no servidor' };
 }
}

// Login de usuário
async function loginUser(email, password) {
 try {
   // Buscar usuário pelo e-mail
   const usersCollection = db.collection('users');
   const user = await usersCollection.findOne({ email });
   
   if (!user) {
     return { success: false, message: 'E-mail não encontrado' };
   }
   
   // Verificar senha
   const passwordMatch = await bcrypt.compare(password, user.password);
   
   if (!passwordMatch) {
     return { success: false, message: 'Senha incorreta' };
   }
   
   // Gerar token JWT
   const token = jwt.sign(
     { 
       userId: user._id, 
       email: user.email,
       role: user.role,
       accessLevel: user.accessLevel || 'user'
     },
     JWT_SECRET,
     { expiresIn: '24h' }
   );
   
   return {
     success: true,
     message: 'Login realizado com sucesso',
     token,
     user: {
       id: user._id,
       name: user.name,
       email: user.email,
       role: user.role,
       accessLevel: user.accessLevel || 'user',
       department: user.department,
       position: user.position
     }
   };
 } catch (error) {
   console.error('Erro no login:', error);
   return { success: false, message: 'Erro interno no servidor' };
 }
}

// Middleware para verificar JWT
function verifyToken(req, res, next) {
 const token = req.headers.authorization?.split(' ')[1];
 
 if (!token) {
   return res.status(401).json({ message: 'Token não fornecido' });
 }
 
 try {
   const decoded = jwt.verify(token, JWT_SECRET);
   req.user = decoded;
   next();
 } catch (error) {
   return res.status(401).json({ message: 'Token inválido ou expirado' });
 }
}

// Gerar token para recuperação de senha
async function generatePasswordResetToken(email) {
 try {
   console.log(`[DEBUG] Iniciando generatePasswordResetToken para ${email}`);
   
   // MODO DE TESTE: Sempre permitir recuperação para este email específico
   if (email === 'omatheusbraboelffi@gmail.com') {
     console.log('[DEBUG] Usando modo de teste para o email do desenvolvedor');
     
     // Gerar token aleatório para teste
     const resetToken = crypto.randomBytes(32).toString('hex');
     
     // Definir data de expiração (1 hora)
     const expiresAt = new Date();
     expiresAt.setHours(expiresAt.getHours() + 1);
     
     console.log('[DEBUG] Token gerado para modo de teste:', resetToken.substring(0, 10) + '...');
     
     return {
       success: true,
       email,
       resetToken,
       expiresAt,
       username: 'Usuário Teste' // Nome para teste
     };
   }
   
   // Fluxo normal
   console.log('[DEBUG] Buscando usuário no banco de dados');
   const usersCollection = db.collection('users');
   const user = await usersCollection.findOne({ email });
   
   if (!user) {
     console.log('[DEBUG] Usuário não encontrado no banco de dados');
     return { success: false, message: 'E-mail não encontrado' };
   }
   
   console.log('[DEBUG] Usuário encontrado:', user.name);
   
   // Gerar token aleatório
   const resetToken = crypto.randomBytes(32).toString('hex');
   console.log('[DEBUG] Token gerado:', resetToken.substring(0, 10) + '...');
   
   // Definir data de expiração (1 hora)
   const expiresAt = new Date();
   expiresAt.setHours(expiresAt.getHours() + 1);
   
   // Salvar token no banco de dados
   console.log('[DEBUG] Salvando token no banco de dados');
   await usersCollection.updateOne(
     { email },
     { 
       $set: { 
         resetToken,
         resetTokenExpires: expiresAt,
         updatedAt: new Date()
       } 
     }
   );
   
   const result = {
     success: true,
     email,
     resetToken,
     expiresAt,
     username: user.name
   };
   
   console.log('[DEBUG] Retornando resultado com username:', result.username);
   return result;
 } catch (error) {
   console.error('[DEBUG] Erro ao gerar token de redefinição:', error);
   return { success: false, message: 'Erro interno no servidor' };
 }
}

// Verificar se o token de reset é válido
async function verifyResetToken(token) {
 try {
   console.log('[DEBUG] Verificando token:', token.substring(0, 10) + '...');
   
   // Aceitar token de teste
   if (token === 'token-de-teste-123456') {
     console.log('[DEBUG] Usando token de teste');
     return {
       success: true,
       email: 'omatheusbraboelffi@gmail.com'
     };
   }
   
   const usersCollection = db.collection('users');
   const user = await usersCollection.findOne({ 
     resetToken: token,
     resetTokenExpires: { $gt: new Date() }
   });
   
   if (!user) {
     console.log('[DEBUG] Token inválido ou expirado');
     return { success: false, message: 'Token inválido ou expirado' };
   }
   
   console.log('[DEBUG] Token válido para usuário:', user.email);
   return {
     success: true,
     email: user.email
   };
 } catch (error) {
   console.error('[DEBUG] Erro ao verificar token:', error);
   return { success: false, message: 'Erro interno no servidor' };
 }
}

// Redefinir senha
async function resetPassword(token, newPassword) {
 try {
   console.log('[DEBUG] Redefinindo senha com token:', token.substring(0, 10) + '...');
   
   // Aceitar token de teste
   if (token === 'token-de-teste-123456') {
     console.log('[DEBUG] Usando token de teste para redefinição');
     return { success: true, message: 'Senha redefinida com sucesso (modo de teste)' };
   }
   
   // Verificar se o token é válido
   const tokenCheck = await verifyResetToken(token);
   if (!tokenCheck.success) {
     console.log('[DEBUG] Token inválido ou expirado na redefinição');
     return tokenCheck;
   }
   
   // Hash da nova senha
   const saltRounds = 10;
   const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
   
   // Atualizar a senha e remover o token
   const usersCollection = db.collection('users');
   const result = await usersCollection.updateOne(
     { resetToken: token },
     { 
       $set: { 
         password: hashedPassword,
         updatedAt: new Date()
       },
       $unset: { 
         resetToken: "",
         resetTokenExpires: "" 
       }
     }
   );
   
   if (result.modifiedCount === 1) {
     console.log('[DEBUG] Senha redefinida com sucesso');
     return { success: true, message: 'Senha redefinida com sucesso' };
   } else {
     console.log('[DEBUG] Nenhum documento atualizado');
     return { success: false, message: 'Erro ao redefinir senha' };
   }
 } catch (error) {
   console.error('[DEBUG] Erro ao redefinir senha:', error);
   return { success: false, message: 'Erro interno no servidor' };
 }
}

// Função para obter dados do usuário pelo ID
async function getUserById(userId) {
 try {
   const usersCollection = db.collection('users');
   // Converter a string de ID para ObjectId se necessário
   const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
   
   // Excluir a senha ao retornar o objeto do usuário
   const user = await usersCollection.findOne(
     { _id: id },
     { projection: { password: 0, resetToken: 0, resetTokenExpires: 0 } }
   );
   
   if (!user) {
     return { success: false, message: 'Usuário não encontrado' };
   }
   
   return {
     success: true,
     user: user
   };
 } catch (error) {
   console.error('Erro ao buscar usuário:', error);
   return { success: false, message: 'Erro interno no servidor' };
 }
}

// Atualizar dados do usuário
async function updateUserProfile(userId, userData) {
 try {
   const usersCollection = db.collection('users');
   // Converter a string de ID para ObjectId se necessário
   const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
   
   // Remover campos que não devem ser atualizados diretamente
   const { password, resetToken, resetTokenExpires, _id, ...updateData } = userData;
   
   // Adicionar timestamp de atualização
   updateData.updatedAt = new Date();
   
   const result = await usersCollection.updateOne(
     { _id: id },
     { $set: updateData }
   );
   
   if (result.modifiedCount === 1) {
     return { 
       success: true, 
       message: 'Perfil atualizado com sucesso' 
     };
   } else if (result.matchedCount === 1) {
     return { 
       success: true, 
       message: 'Nenhuma alteração realizada' 
     };
   } else {
     return { 
       success: false, 
       message: 'Usuário não encontrado' 
     };
   }
 } catch (error) {
   console.error('Erro ao atualizar perfil:', error);
   return { success: false, message: 'Erro interno no servidor' };
 }
}

module.exports = {
 connectToDatabase,
 registerUser,
 loginUser,
 verifyToken,
 generatePasswordResetToken,
 verifyResetToken,
 resetPassword,
 getUserById,
 updateUserProfile
};