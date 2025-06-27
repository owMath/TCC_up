// websocket-integration.js - Integração WebSocket para o servidor Express
const WebSocket = require('ws');
const http = require('http');
const { connectToDatabase } = require('./modules/auth/auth');
const { registerWebSocketClient } = require('./tcp-server');

// Função para integrar WebSocket com o servidor Express
function setupWebSocketServer(app) {
  // Criar servidor HTTP a partir do app Express
  const server = http.createServer(app);
  
  // Inicializar servidor WebSocket
  const wss = new WebSocket.Server({ 
    server,
    // Aumentar o tempo de ping para evitar desconexões
    pingInterval: 30000,
    pingTimeout: 60000
  });
  
  console.log('[WEBSOCKET] Servidor WebSocket iniciado');
  
  // Armazenar conexões de clientes
  const clients = new Set();
  
  // Manipular conexões WebSocket
  wss.on('connection', (ws, req) => {
    // Verificar token na URL de conexão para autenticação (opcional)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Adicionar cliente à lista
    clients.add(ws);
    
    // Atribuir um ID exclusivo ao cliente (para logs)
    ws.id = Math.random().toString(36).substring(2, 10);
    
    // Registrar este cliente no TCP server também
    registerWebSocketClient(ws);
    
    console.log(`[WEBSOCKET] Nova conexão de ${clientIP} (ID: ${ws.id}). Total de clientes: ${clients.size}`);
    
    // Enviar dados iniciais ao cliente
    console.log(`[WEBSOCKET] Enviando dados iniciais para cliente ${ws.id}`);
    sendInitialData(ws);
    
    // Enviar uma mensagem de teste a cada 10 segundos para manter a conexão viva
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
        console.log(`[WEBSOCKET] Ping enviado para cliente ${ws.id}`);
      }
    }, 10000);
    
    // Evento de mensagem recebida do cliente
    ws.on('message', (message) => {
      try {
        console.log(`[WEBSOCKET] Mensagem recebida de cliente ${ws.id}:`, message.toString().substring(0, 100) + (message.length > 100 ? '...' : ''));
        const data = JSON.parse(message);
        handleClientMessage(ws, data);
      } catch (error) {
        console.error(`[WEBSOCKET] Erro ao processar mensagem do cliente ${ws.id}:`, error);
      }
    });
    
    // Evento de desconexão
    ws.on('close', () => {
      clients.delete(ws);
      clearInterval(pingInterval);
      console.log(`[WEBSOCKET] Conexão fechada para cliente ${ws.id}. Total de clientes: ${clients.size}`);
    });
    
    // Verificar erro
    ws.on('error', (error) => {
      console.error(`[WEBSOCKET] Erro na conexão com cliente ${ws.id}:`, error);
      clients.delete(ws);
      clearInterval(pingInterval);
    });
  });
  
  // Função para enviar dados para todos os clientes
  function broadcast(data) {
    console.log(`[WEBSOCKET] Iniciando broadcast do tipo "${data.type}" para ${clients.size} clientes`);
    
    const message = JSON.stringify(data);
    let successCount = 0;
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        successCount++;
      }
    });
    
    console.log(`[WEBSOCKET] Broadcast concluído: ${successCount}/${clients.size} clientes receberam a mensagem`);
  }
  
  // Função para enviar dados iniciais ao cliente
  async function sendInitialData(ws) {
    try {
      console.log(`[WEBSOCKET] Preparando dados iniciais para cliente ${ws.id}`);
      
      // Conectar ao banco de dados se necessário
      const db = await connectToDatabase();
      
      // Buscar dados recentes das máquinas
      console.log(`[WEBSOCKET] Buscando dados recentes de máquinas para cliente ${ws.id}`);
      const machineData = await db.collection('machine_data')
        .find()
        .sort({ timestamp: -1 })
        .limit(20)
        .toArray();
      
      console.log(`[WEBSOCKET] Recuperados ${machineData.length} registros de máquinas`);
      
      // Calcular OEE geral
      console.log(`[WEBSOCKET] Calculando OEE geral para cliente ${ws.id}`);
      const oeeData = calculateOverallOEE(machineData);
      
      // Enviar dados iniciais
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'initial_data',
          machineData: machineData,
          oeeData: oeeData
        }));
        console.log(`[WEBSOCKET] Dados iniciais enviados para cliente ${ws.id} (${machineData.length} registros, OEE: ${oeeData.total}%)`);
      } else {
        console.log(`[WEBSOCKET] Cliente ${ws.id} não está mais conectado, dados iniciais descartados`);
      }
    } catch (error) {
      console.error(`[WEBSOCKET] Erro ao enviar dados iniciais para cliente ${ws.id}:`, error);
    }
  }
  
  // Função para calcular OEE geral
  function calculateOverallOEE(machineData) {
    console.log(`[WEBSOCKET] Iniciando cálculo de OEE geral com ${machineData ? machineData.length : 0} registros`);
    
    if (!machineData || machineData.length === 0) {
      console.log(`[WEBSOCKET] Sem dados para calcular OEE`);
      return {
        total: 0,
        availability: 0,
        performance: 0,
        quality: 0
      };
    }
    
    // Agrupar por ID de máquina para obter dados mais recentes de cada máquina
    const machinesById = {};
    machineData.forEach(data => {
      if (!machinesById[data.machineId] || 
          new Date(data.timestamp) > new Date(machinesById[data.machineId].timestamp)) {
        machinesById[data.machineId] = data;
      }
    });
    
    const machines = Object.values(machinesById);
    console.log(`[WEBSOCKET] Processando OEE para ${machines.length} máquinas únicas`);
    
    // Calcular médias
    let totalAvailability = 0;
    let totalPerformance = 0;
    let totalQuality = 0;
    let machineCount = 0;
    
    machines.forEach(machine => {
      // Verificar se a máquina tem os dados necessários e não está parada
      if (machine.status !== 'stopped' && 
          typeof machine.plannedProductionTime === 'number' &&
          typeof machine.downtime === 'number' &&
          typeof machine.operatingTime === 'number' &&
          typeof machine.idealCycleTime === 'number' &&
          typeof machine.totalPieces === 'number' &&
          typeof machine.defectivePieces === 'number') {
        
        // Calcular métricas individuais
        const availability = machine.plannedProductionTime > 0 
          ? (machine.plannedProductionTime - machine.downtime) / machine.plannedProductionTime * 100 
          : 0;
        
        const performance = machine.idealCycleTime > 0 && machine.operatingTime > 0
          ? (machine.totalPieces * machine.idealCycleTime) / machine.operatingTime * 100
          : 0;
        
        const quality = machine.totalPieces > 0
          ? (machine.totalPieces - machine.defectivePieces) / machine.totalPieces * 100
          : 0;
        
        console.log(`[WEBSOCKET] Máquina ${machine.machineId} - Disponibilidade: ${availability.toFixed(1)}%, Desempenho: ${performance.toFixed(1)}%, Qualidade: ${quality.toFixed(1)}%`);
        
        totalAvailability += availability;
        totalPerformance += performance;
        totalQuality += quality;
        machineCount++;
      } else {
        console.log(`[WEBSOCKET] Máquina ${machine.machineId} ignorada no cálculo (parada ou dados insuficientes)`);
      }
    });
    
    // Evitar divisão por zero
    if (machineCount === 0) {
      console.log(`[WEBSOCKET] Nenhuma máquina válida para calcular OEE`);
      return {
        total: 0,
        availability: 0,
        performance: 0,
        quality: 0
      };
    }
    
    const avgAvailability = totalAvailability / machineCount;
    const avgPerformance = totalPerformance / machineCount;
    const avgQuality = totalQuality / machineCount;
    
    const overallOEE = (avgAvailability * avgPerformance * avgQuality) / 10000;
    
    console.log(`[WEBSOCKET] OEE Geral calculado: ${overallOEE.toFixed(1)}% (A: ${avgAvailability.toFixed(1)}%, P: ${avgPerformance.toFixed(1)}%, Q: ${avgQuality.toFixed(1)}%)`);
    
    return {
      total: overallOEE.toFixed(1),
      availability: avgAvailability.toFixed(1),
      performance: avgPerformance.toFixed(1),
      quality: avgQuality.toFixed(1)
    };
  }
  
  // Função para processar mensagens do cliente
  function handleClientMessage(ws, data) {
    console.log(`[WEBSOCKET] Processando mensagem do tipo "${data.type}" do cliente ${ws.id}`);
    
    // Baseado no tipo de mensagem, realizar ações diferentes
    if (data.type === 'request_machine_data') {
      // Cliente solicitou dados de uma máquina específica
      console.log(`[WEBSOCKET] Cliente ${ws.id} solicitou dados da máquina ${data.machineId}`);
      sendMachineData(ws, data.machineId);
    } else if (data.type === 'request_oee_data') {
      // Cliente solicitou dados de OEE
      console.log(`[WEBSOCKET] Cliente ${ws.id} solicitou dados de OEE geral`);
      sendOEEData(ws);
    } else if (data.type === 'pong') {
      // Resposta ao ping, não precisa fazer nada
      console.log(`[WEBSOCKET] Pong recebido do cliente ${ws.id}`);
    } else {
      console.log(`[WEBSOCKET] Tipo de mensagem desconhecido de cliente ${ws.id}: ${data.type}`);
    }
  }
  
  // Função para enviar dados de uma máquina específica
  async function sendMachineData(ws, machineId) {
    try {
      console.log(`[WEBSOCKET] Buscando dados da máquina ${machineId} para cliente ${ws.id}`);
      const db = await connectToDatabase();
      
      // Buscar dados da máquina
      const machineData = await db.collection('machine_data')
        .find({ machineId: machineId })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();
      
      if (machineData.length > 0 && ws.readyState === WebSocket.OPEN) {
        // Calcular OEE para esta máquina
        console.log(`[WEBSOCKET] Calculando OEE para máquina ${machineId}`);
        const oeeData = calculateOEE(machineData[0]);
        
        ws.send(JSON.stringify({
          type: 'machine_data',
          machineId: machineId,
          data: machineData[0],
          oee: oeeData
        }));
        console.log(`[WEBSOCKET] Dados da máquina ${machineId} enviados para cliente ${ws.id} (OEE: ${oeeData.oee}%)`);
      } else {
        console.log(`[WEBSOCKET] Sem dados para máquina ${machineId} ou cliente ${ws.id} desconectado`);
      }
    } catch (error) {
      console.error(`[WEBSOCKET] Erro ao buscar dados da máquina ${machineId} para cliente ${ws.id}:`, error);
    }
  }
  
  // Função para calcular OEE individual
  function calculateOEE(data) {
    console.log(`[WEBSOCKET] Calculando OEE para máquina ${data.machineId}, status: ${data.status}`);
    
    // Se a máquina estiver parada, retorne zeros
    if (data.status === 'stopped') {
      console.log(`[WEBSOCKET] Máquina ${data.machineId} está parada, OEE será zero`);
      return {
        availability: '0.0',
        performance: '0.0',
        quality: '0.0',
        oee: '0.0'
      };
    }
    
    // Calculando disponibilidade
    const availability = data.plannedProductionTime > 0 
      ? Math.min(100, Math.max(0, ((data.plannedProductionTime - data.downtime) / data.plannedProductionTime * 100)))
      : 0;
    
    // Calculando performance
    const performance = (data.idealCycleTime > 0 && data.operatingTime > 0)
      ? Math.min(100, Math.max(0, (data.totalPieces * data.idealCycleTime) / data.operatingTime * 100))
      : 0;
    
    // Calculando qualidade
    const quality = data.totalPieces > 0
      ? Math.min(100, Math.max(0, (data.totalPieces - data.defectivePieces) / data.totalPieces * 100))
      : 0;
    
    // Calculando OEE
    const oee = (availability * performance * quality) / 10000;
    
    console.log(`[WEBSOCKET] OEE calculado para máquina ${data.machineId}: ${oee.toFixed(1)}% (A: ${availability.toFixed(1)}%, P: ${performance.toFixed(1)}%, Q: ${quality.toFixed(1)}%)`);
    
    return {
      availability: availability.toFixed(1),
      performance: performance.toFixed(1),
      quality: quality.toFixed(1),
      oee: oee.toFixed(1)
    };
  }
  
  // Função para enviar dados de OEE
  async function sendOEEData(ws) {
    try {
      console.log(`[WEBSOCKET] Preparando dados de OEE geral para cliente ${ws.id}`);
      const db = await connectToDatabase();
      
      // Buscar todos os dados recentes de máquinas para calcular OEE
      const machineData = await db.collection('machine_data')
        .aggregate([
          { $sort: { timestamp: -1 } },
          { $group: { _id: "$machineId", data: { $first: "$$ROOT" } } },
          { $replaceRoot: { newRoot: "$data" } }
        ])
        .toArray();
      
      console.log(`[WEBSOCKET] Recuperados dados de ${machineData.length} máquinas para cálculo de OEE`);
      
      // Calcular OEE geral
      const oeeData = calculateOverallOEE(machineData);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'oee_data',
          data: oeeData
        }));
        console.log(`[WEBSOCKET] Dados de OEE enviados para cliente ${ws.id} (OEE: ${oeeData.total}%)`);
      } else {
        console.log(`[WEBSOCKET] Cliente ${ws.id} não está mais conectado, dados de OEE descartados`);
      }
    } catch (error) {
      console.error(`[WEBSOCKET] Erro ao buscar dados de OEE para cliente ${ws.id}:`, error);
    }
  }
  
  // Expor a função broadcast para uso global
  global.wsBroadcast = broadcast;
  
  // Enviar uma atualização simulada periódica caso não haja atualizações reais
  // Isso é bom para testes, pode ser removido em produção
  setInterval(() => {
    if (clients.size > 0) {
      console.log(`[WEBSOCKET] Enviando heartbeat para ${clients.size} clientes conectados`);
      broadcast({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        activeConnections: clients.size
      });
    }
  }, 15000);
  
  return server;
}

module.exports = { setupWebSocketServer };