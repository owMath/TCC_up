// tcp-server.js - Servidor TCP para comunicação com máquinas
const net = require('net');
const { MongoClient } = require('mongodb');
const WebSocket = require('ws');

// Configurações
const TCP_PORT = process.env.TCP_PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://math:1234@tcc.tbjfx.mongodb.net/?retryWrites=true&w=majority&appName=TCC';

// Clientes WebSocket conectados
let webSocketClients = [];

// Função para registrar um cliente WebSocket
function registerWebSocketClient(client) {
  if (!webSocketClients.includes(client)) {
    webSocketClients.push(client);
    console.log(`[TCP-WS] Cliente WebSocket registrado. Total: ${webSocketClients.length}`);
  }
}

// Cliente MongoDB
let db;

// Conectar ao MongoDB
async function connectToDatabase() {
  try {
    console.log('[TCP-DB] Tentando conectar ao MongoDB Atlas...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('[TCP-DB] Conectado ao MongoDB Atlas com sucesso');
    db = client.db('sistema_oee');
    return db;
  } catch (error) {
    console.error('[TCP-DB] Erro ao conectar ao MongoDB:', error);
    throw error;
  }
}

// Enviar dados para todos os clientes WebSocket
function broadcastToClients(data) {
  const activeClients = webSocketClients.filter(client => client.readyState === WebSocket.OPEN).length;
  console.log(`[TCP-WS] Enviando atualização do tipo "${data.type}" para ${activeClients} clientes ativos`);
  
  let sentCount = 0;
  webSocketClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
      sentCount++;
    }
  });
  
  console.log(`[TCP-WS] Mensagem enviada com sucesso para ${sentCount}/${webSocketClients.length} clientes`);
}

// Processar dados recebidos de uma máquina - CORRIGIDO
async function processMachineData(data, machineId) {
  try {
    console.log(`[TCP-DATA] Processando dados da máquina ${machineId}`);
    
    // Verificar se os dados são válidos
    if (!data || typeof data !== 'object') {
      console.error(`[TCP-DATA] Dados inválidos recebidos da máquina ${machineId}:`, data);
      return;
    }
    
    // Adicionar timestamp e ID da máquina se necessário
    const machineData = {
      ...data,
      machineId: data.machineId || machineId,
      timestamp: data.timestamp || new Date()
    };
    
    console.log(`[TCP-DATA] Máquina ${machineId} - Status: ${machineData.status || 'N/A'}`);
    
    // Calcular OEE
    console.log(`[TCP-DATA] Calculando OEE para máquina ${machineId}`);
    const oeeData = calculateOEE(machineData);
    console.log(`[TCP-DATA] OEE calculado: ${oeeData.oee}% (A: ${oeeData.availability}%, P: ${oeeData.performance}%, Q: ${oeeData.quality}%)`);
    
    // Salvar dados no MongoDB com o OEE calculado
    if (db) {
      const dataToSave = {
        ...machineData,
        oeeData: oeeData // Incluir OEE nos dados salvos
      };
      
      console.log(`[TCP-DB] Salvando dados da máquina ${machineId} no banco de dados`);
      const result = await db.collection('machine_data').insertOne(dataToSave);
      console.log(`[TCP-DB] Dados da máquina ${machineId} salvos com ID: ${result.insertedId}`);
    } else {
      console.warn(`[TCP-DB] Banco de dados não está disponível, dados da máquina ${machineId} não foram salvos`);
    }
    
    // Enviar dados atualizados para os clientes WebSocket
    console.log(`[TCP-WS] Enviando atualização da máquina ${machineId} para clientes WebSocket`);
    broadcastToClients({
      type: 'machine_update',
      machine: {
        id: machineId,
        data: machineData,
        oee: oeeData
      }
    });
    
    // Atualizar OEE geral
    console.log(`[TCP-DATA] Atualizando cálculo de OEE geral após mudanças na máquina ${machineId}`);
    updateOverallOEE();
    
  } catch (error) {
    console.error(`[TCP-ERROR] Erro ao processar dados da máquina ${machineId}:`, error);
  }
}

// Função para calcular o OEE de uma máquina
function calculateOEE(data) {
  console.log(`[TCP-OEE] Iniciando cálculo de OEE para máquina ${data.machineId || 'desconhecida'}`);
  
  // Se a máquina estiver parada, retorne zeros
  if (data.status === 'stopped') {
    console.log(`[TCP-OEE] Máquina com status 'stopped', retornando OEE zero`);
    return {
      availability: '0.0',
      performance: '0.0',
      quality: '0.0',
      oee: '0.0'
    };
  }
  
  // Validação dos dados de entrada - use valores padrão se os dados estiverem ausentes ou inválidos
  const plannedTime = data.plannedProductionTime !== undefined ? Math.max(0, Number(data.plannedProductionTime)) : 0;
  const downtime = data.downtime !== undefined ? Math.max(0, Number(data.downtime)) : 0;
  const idealCycleTime = data.idealCycleTime !== undefined ? Math.max(0, Number(data.idealCycleTime)) : 0;
  const operatingTime = data.operatingTime !== undefined ? Math.max(0, Number(data.operatingTime)) : 0;
  const totalPieces = data.totalPieces !== undefined ? Math.max(0, Number(data.totalPieces)) : 0;
  const defectivePieces = data.defectivePieces !== undefined ? Math.max(0, Number(data.defectivePieces)) : 0;
  
  console.log(`[TCP-OEE] Valores para cálculo - Planned: ${plannedTime}, Downtime: ${downtime}, Operating: ${operatingTime}`);
  console.log(`[TCP-OEE] Produção - Total peças: ${totalPieces}, Defeituosas: ${defectivePieces}, Ciclo ideal: ${idealCycleTime}`);
  
  // Garantir que o número de peças defeituosas não exceda o total de peças
  const validDefectivePieces = Math.min(defectivePieces, totalPieces);
  
  // Calculando disponibilidade (evitando divisão por zero)
  let availability = 0;
  if (plannedTime > 0) {
    // Garantir que o downtime não seja maior que o plannedTime
    const validDowntime = Math.min(downtime, plannedTime);
    availability = ((plannedTime - validDowntime) / plannedTime) * 100;
    console.log(`[TCP-OEE] Disponibilidade calculada: ${availability.toFixed(1)}%`);
  } else {
    console.log(`[TCP-OEE] Disponibilidade não calculada (tempo planejado = 0)`);
  }
  
  // Calculando performance (evitando divisão por zero)
  let performance = 0;
  if (operatingTime > 0 && idealCycleTime > 0) {
    performance = (totalPieces * idealCycleTime / operatingTime) * 100;
    console.log(`[TCP-OEE] Performance calculada: ${performance.toFixed(1)}%`);
  } else {
    console.log(`[TCP-OEE] Performance não calculada (tempo operação = 0 ou ciclo ideal = 0)`);
  }
  
  // Calculando qualidade (evitando divisão por zero)
  let quality = 0;
  if (totalPieces > 0) {
    quality = ((totalPieces - validDefectivePieces) / totalPieces) * 100;
    console.log(`[TCP-OEE] Qualidade calculada: ${quality.toFixed(1)}%`);
  } else {
    console.log(`[TCP-OEE] Qualidade não calculada (total de peças = 0)`);
  }
  
  // Limitando valores a 100% no máximo
  availability = Math.min(100, Math.max(0, availability));
  performance = Math.min(100, Math.max(0, performance));
  quality = Math.min(100, Math.max(0, quality));
  
  // Calculando OEE (produto dos três componentes)
  const oee = (availability * performance * quality) / 10000;
  console.log(`[TCP-OEE] OEE final calculado: ${oee.toFixed(1)}%`);
  
  return {
    availability: availability.toFixed(1),
    performance: performance.toFixed(1),
    quality: quality.toFixed(1),
    oee: oee.toFixed(1)
  };
}

// Atualizar OEE geral baseado em todas as máquinas
async function updateOverallOEE() {
  try {
    console.log('[TCP-OEE] Iniciando cálculo de OEE geral para todas as máquinas');
    
    if (!db) {
      console.warn('[TCP-OEE] Banco de dados não disponível, cálculo de OEE geral abortado');
      return;
    }
    
    // Buscar dados recentes de todas as máquinas
    console.log('[TCP-DB] Buscando dados recentes de todas as máquinas');
    const machines = await db.collection('machine_data')
      .aggregate([
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$machineId", data: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$data" } }
      ])
      .toArray();
    
    console.log(`[TCP-OEE] Encontradas ${machines.length} máquinas para cálculo de OEE geral`);
    
    if (machines.length === 0) {
      console.log('[TCP-OEE] Nenhuma máquina encontrada, cálculo de OEE geral abortado');
      return;
    }
    
    // Calcular médias incluindo todas as máquinas (ativas e paradas)
    let totalAvailability = 0;
    let totalPerformance = 0;
    let totalQuality = 0;
    let totalOEE = 0;
    
    machines.forEach(machine => {
      console.log(`[TCP-OEE] Processando máquina ${machine.machineId} para OEE geral`);
      const oee = machine.oeeData || calculateOEE(machine);
      totalAvailability += parseFloat(oee.availability);
      totalPerformance += parseFloat(oee.performance);
      totalQuality += parseFloat(oee.quality);
      totalOEE += parseFloat(oee.oee);
    });
    
    const avgAvailability = totalAvailability / machines.length;
    const avgPerformance = totalPerformance / machines.length;
    const avgQuality = totalQuality / machines.length;
    const avgOEE = totalOEE / machines.length;
    
    console.log(`[TCP-OEE] OEE geral calculado: ${avgOEE.toFixed(1)}% (A: ${avgAvailability.toFixed(1)}%, P: ${avgPerformance.toFixed(1)}%, Q: ${avgQuality.toFixed(1)}%)`);
    
    // Enviar OEE geral atualizado
    console.log('[TCP-WS] Enviando atualização de OEE geral para clientes WebSocket');
    broadcastToClients({
      type: 'oee_update',
      oee: {
        total: avgOEE.toFixed(1),
        availability: avgAvailability.toFixed(1),
        performance: avgPerformance.toFixed(1),
        quality: avgQuality.toFixed(1)
      }
    });
    
  } catch (error) {
    console.error('[TCP-ERROR] Erro ao atualizar OEE geral:', error);
  }
}

// Função melhorada para processar mensagens JSON potencialmente fragmentadas
function parseMessages(buffer) {
  console.log(`[TCP-PARSE] Analisando buffer de dados com ${buffer.length} bytes`);
  
  const messages = [];
  let data = buffer.trim();
  
  // Verificar se o buffer está vazio
  if (!data) {
    console.log('[TCP-PARSE] Buffer vazio, nenhuma mensagem para processar');
    return messages;
  }
  
  // Função auxiliar para verificar se um JSON está completo
  function isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Função recursiva para extrair JSONs completos da string
  function extractJSON(jsonStr) {
    if (!jsonStr || jsonStr.length === 0) {
      return '';
    }
    
    // Encontrar o primeiro índice de uma possível abertura de JSON
    const firstOpenBrace = jsonStr.indexOf('{');
    if (firstOpenBrace === -1) {
      console.log('[TCP-PARSE] Nenhuma abertura de JSON encontrada no buffer');
      return ''; // Nenhuma abertura de JSON encontrada
    }
    
    // Remover qualquer conteúdo antes da primeira chave de abertura
    let remainingStr = jsonStr.substring(firstOpenBrace);
    
    // Verificar se esta é uma mensagem JSON completa
    if (isValidJSON(remainingStr)) {
      console.log('[TCP-PARSE] JSON completo encontrado no buffer');
      messages.push(JSON.parse(remainingStr));
      return ''; // Toda a string foi processada
    }
    
    // Caso não seja um JSON completo, procurar por possíveis JSONs completos
    // usando um algoritmo de balanceamento de chaves
    let openBraces = 0;
    let lastCompleteJson = -1;
    
    for (let i = 0; i < remainingStr.length; i++) {
      if (remainingStr[i] === '{') {
        openBraces++;
      } else if (remainingStr[i] === '}') {
        openBraces--;
        
        // Se encontramos um conjunto balanceado de chaves
        if (openBraces === 0) {
          const potentialJson = remainingStr.substring(0, i + 1);
          
          // Verificar se é um JSON válido
          if (isValidJSON(potentialJson)) {
            console.log('[TCP-PARSE] JSON válido extraído do buffer');
            messages.push(JSON.parse(potentialJson));
            lastCompleteJson = i + 1;
            
            // Verificar se temos mais chaves de abertura após este JSON
            const nextOpenBrace = remainingStr.indexOf('{', i + 1);
            if (nextOpenBrace !== -1) {
              console.log('[TCP-PARSE] Mais JSONs potenciais encontrados no buffer');
              // Continuar a procurar mais JSONs no restante da string
              return remainingStr.substring(lastCompleteJson);
            } else {
              // Não há mais JSONs potenciais
              return '';
            }
          }
        }
      }
    }
    
    // Se chegamos aqui, pode haver um JSON incompleto
    if (lastCompleteJson !== -1) {
      console.log('[TCP-PARSE] JSON parcial detectado no final do buffer');
      return remainingStr.substring(lastCompleteJson);
    }
    
    console.log('[TCP-PARSE] Buffer contém um JSON incompleto');
    return remainingStr;
  }
  
  // Processar a string repetidamente até que não haja mais JSONs completos
  let remainingData = data;
  let previousLength = remainingData.length + 1; // Iniciar com um valor maior para garantir o primeiro loop
  
  // Continuar processando enquanto estamos fazendo progresso
  // e ainda há dados para analisar
  while (remainingData.length > 0 && remainingData.length < previousLength) {
    previousLength = remainingData.length;
    remainingData = extractJSON(remainingData);
  }
  
  console.log(`[TCP-PARSE] Extração completa: ${messages.length} mensagens JSON encontradas`);
  return messages;
}

// Servidor TCP
function startTCPServer() {
  console.log(`[TCP-SERVER] Iniciando servidor TCP na porta ${TCP_PORT}...`);
  
  // Registro de máquinas conectadas (para estatísticas)
  const connectedMachines = new Map();
  
  const server = net.createServer((socket) => {
    const machineId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[TCP-SERVER] Nova conexão de máquina: ${machineId}`);
    
    // Registrar a máquina conectada
    connectedMachines.set(machineId, {
      connectedAt: new Date(),
      ip: socket.remoteAddress,
      port: socket.remotePort,
      lastActivity: new Date(),
      messageCount: 0,
      byteCount: 0
    });
    
    console.log(`[TCP-SERVER] Total de máquinas conectadas: ${connectedMachines.size}`);
    
    let buffer = '';
    
    socket.on('data', (data) => {
      // Atualizar estatísticas
      const stats = connectedMachines.get(machineId);
      if (stats) {
        stats.lastActivity = new Date();
        stats.byteCount += data.length;
        stats.messageCount++;
      }
      
      console.log(`[TCP-SERVER] Dados recebidos de ${machineId}: ${data.length} bytes`);
      
      // Receber dados e processar
      buffer += data.toString();
      
      // Tentar extrair mensagens JSON completas
      const messages = parseMessages(buffer);
      
      if (messages.length > 0) {
        console.log(`[TCP-SERVER] ${messages.length} mensagens JSON completas extraídas do buffer`);
        
        // Processar cada mensagem extraída
        messages.forEach((message, index) => {
          console.log(`[TCP-SERVER] Processando mensagem ${index + 1}/${messages.length} de ${machineId}`);
          processMachineData(message, machineId);
        });
        
        // Verificar se há dados incompletos no buffer
        try {
          // Tentar verificar se o buffer contém um JSON completo
          JSON.parse(buffer);
          // Se chegou aqui, o buffer inteiro é um JSON válido e já foi processado
          console.log(`[TCP-SERVER] Buffer completamente processado para ${machineId}`);
          buffer = '';
        } catch (e) {
          // Verificar se já processamos mensagens completas e restam fragmentos
          if (messages.length > 0) {
            // Tentar identificar o início do próximo JSON potencial
            const lastJsonEnd = buffer.lastIndexOf('}');
            if (lastJsonEnd !== -1 && lastJsonEnd < buffer.length - 1) {
              // Manter apenas o que pode ser o início de um novo JSON
              const newBuffer = buffer.substring(lastJsonEnd + 1);
              console.log(`[TCP-SERVER] Mantendo fragmento de ${newBuffer.length} bytes para próximo processamento`);
              buffer = newBuffer;
            }
          }
          // Se não conseguirmos determinar com certeza, manteremos o buffer para processamento futuro
          console.log(`[TCP-SERVER] Buffer parcial mantido com ${buffer.length} bytes para ${machineId}`);
        }
      } else {
        console.log(`[TCP-SERVER] Nenhuma mensagem completa no buffer para ${machineId}, aguardando mais dados`);
      }
    });
    
    socket.on('close', () => {
      console.log(`[TCP-SERVER] Conexão fechada: ${machineId}`);
      connectedMachines.delete(machineId);
      console.log(`[TCP-SERVER] Total de máquinas conectadas: ${connectedMachines.size}`);
    });
    
    socket.on('error', (err) => {
      console.error(`[TCP-SERVER] Erro na conexão ${machineId}:`, err);
      connectedMachines.delete(machineId);
    });
  });
  
  server.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`[TCP-SERVER] Servidor TCP escutando na porta ${TCP_PORT} em todas as interfaces de rede`);
  });
  
  // Registrar possíveis erros do servidor
  server.on('error', (error) => {
    console.error('[TCP-SERVER] Erro no servidor TCP:', error);
  });
  
  // Log periódico de máquinas conectadas
  setInterval(() => {
    if (connectedMachines.size > 0) {
      console.log(`[TCP-STATS] Status atual: ${connectedMachines.size} máquinas conectadas`);
      
      // Mostrar estatísticas de cada máquina
      connectedMachines.forEach((stats, id) => {
        const uptimeSecs = Math.floor((new Date() - stats.connectedAt) / 1000);
        const lastActivitySecs = Math.floor((new Date() - stats.lastActivity) / 1000);
        
        console.log(`[TCP-STATS] Máquina ${id} - Uptime: ${uptimeSecs}s, Última atividade: ${lastActivitySecs}s atrás, Mensagens: ${stats.messageCount}, Bytes: ${stats.byteCount}`);
      });
    }
  }, 60000); // A cada minuto
  
  return server;
}

// Iniciar o servidor
async function init() {
  try {
    console.log('[TCP-INIT] Iniciando servidor TCP...');
    await connectToDatabase();
    const tcpServer = startTCPServer();
    
    console.log('[TCP-INIT] Servidor TCP iniciado e conectado ao banco de dados com sucesso');
    
    // Informar processo pai que estamos prontos
    if (process.send) {
      process.send({ status: 'ready', message: 'Servidor TCP iniciado e conectado ao banco de dados' });
    }
    
    return { tcpServer };
  } catch (error) {
    console.error('[TCP-ERROR] Erro fatal ao iniciar servidor TCP:', error);
    
    // Informar processo pai sobre o erro
    if (process.send) {
      process.send({ status: 'error', error: error.message });
    }
    
    throw error;
  }
}

// Exportar funções para uso no módulo principal
module.exports = {
  init,
  broadcastToClients,
  registerWebSocketClient
};

// Iniciar o servidor quando executado diretamente
if (require.main === module) {
  console.log('[TCP-MAIN] Iniciando TCP Server como processo principal');
  init().catch(error => {
    console.error('[TCP-FATAL] Erro fatal:', error);
    process.exit(1);
  });
}