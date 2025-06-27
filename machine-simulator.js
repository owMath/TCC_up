// machine-simulator.js - Simulador de máquinas para testes
const net = require('net');
const fs = require('fs');
const path = require('path');

// Configurações
const SERVER_HOST = 'localhost';
const SERVER_PORT = 8080;
const MACHINE_COUNT = 3; // Número de máquinas para simular
const UPDATE_INTERVAL = 5000; // 5 segundos entre atualizações

// Classe para simular uma máquina industrial
class MachineSimulator {
  constructor(id) {
    this.id = id;
    this.name = `Máquina ${id}`;
    this.status = 'running'; // running, idle, stopped
    this.socket = null;
    this.connected = false;
    
    // Métricas de produção - valores iniciais
    this.metrics = {
      plannedProductionTime: 480, // 8 horas em minutos
      downtime: 0,
      operatingTime: 0,
      idealCycleTime: 0.5, // 30 segundos por peça
      totalPieces: 0,
      defectivePieces: 0,
      lastUpdateTime: Date.now()
    };
    
    // Configurações específicas para cada máquina para simular comportamentos diferentes
    this.config = {
      performanceVariation: 0.95 + (Math.random() * 0.1), // 95-105%
      qualityVariation: 0.98 + (Math.random() * 0.04),    // 98-102%
      breakdownProbability: 0.005 * id,                   // 0.5-1.5% chance por atualização
      idleProbability: 0.01 * id                         // 1-3% chance por atualização
    };
    
    // Log para registrar alterações de estado
    this.stateLog = [];
  }
  
  // Conectar ao servidor TCP
  connect() {
    this.socket = new net.Socket();
    
    this.socket.connect(SERVER_PORT, SERVER_HOST, () => {
      console.log(`Máquina ${this.id}: Conectada ao servidor ${SERVER_HOST}:${SERVER_PORT}`);
      this.connected = true;
      
      // Enviar dados iniciais com estado atual
      this.sendData();
      
      // Iniciar simulação se ainda não estiver rodando
      if (!this.simulationInterval) {
        this.startSimulation();
      }
    });
    
    this.socket.on('error', (err) => {
      console.error(`Máquina ${this.id}: Erro de conexão:`, err);
      this.connected = false;
      
      // Tentar reconectar após 5 segundos
      setTimeout(() => this.connect(), 5000);
    });
    
    this.socket.on('close', () => {
      console.log(`Máquina ${this.id}: Conexão fechada`);
      this.connected = false;
      
      // Não limpar o intervalo de simulação, apenas marcar como desconectado
      // Isso mantém a atualização de métricas mesmo quando desconectado
      
      // Tentar reconectar após 5 segundos
      setTimeout(() => this.connect(), 5000);
    });
  }
  
  // Iniciar simulação
  startSimulation() {
    // Verificar se já existe um intervalo de simulação
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    
    this.simulationInterval = setInterval(() => {
      this.updateMetrics();
      if (this.connected) {
        this.sendData();
      }
    }, UPDATE_INTERVAL);
  }
  
  // Atualizar métricas simuladas
  updateMetrics() {
    // Calcular tempo decorrido desde a última atualização
    const now = Date.now();
    const elapsedMinutes = (now - this.metrics.lastUpdateTime) / (1000 * 60);
    this.metrics.lastUpdateTime = now;
    
    // Verificar mudanças de estado
    this.checkStateChanges();
    
    // Só atualizar métricas se a máquina estiver em execução
    if (this.status === 'running') {
      // Atualizar tempo operacional
      this.metrics.operatingTime += elapsedMinutes;
      
      // Produção de peças (baseada no tempo ideal de ciclo)
      const expectedPieces = Math.floor(elapsedMinutes / this.metrics.idealCycleTime);
      
      // Aplicar variação de performance
      const actualPieces = Math.floor(expectedPieces * this.config.performanceVariation);
      this.metrics.totalPieces += actualPieces;
      
      // Calcular peças defeituosas
      const newDefects = Math.floor(actualPieces * (1 - this.config.qualityVariation));
      this.metrics.defectivePieces += newDefects;
      
    } else if (this.status === 'idle') {
      // Tempo ocioso conta como tempo de inatividade
      this.metrics.downtime += elapsedMinutes;
    } else if (this.status === 'stopped') {
      // Tempo de parada (manutenção, avaria)
      this.metrics.downtime += elapsedMinutes;
    }
  }
  
  // Verificar alterações de estado aleatórias
  checkStateChanges() {
    // Máquina em execução pode quebrar ou ficar ociosa
    if (this.status === 'running') {
      if (Math.random() < this.config.breakdownProbability) {
        this.status = 'stopped';
        this.logStateChange('running', 'stopped', 'Falha de equipamento');
      } else if (Math.random() < this.config.idleProbability) {
        this.status = 'idle';
        this.logStateChange('running', 'idle', 'Aguardando material');
      }
    } 
    // Máquina ociosa pode voltar a funcionar
    else if (this.status === 'idle') {
      if (Math.random() < 0.2) {
        this.status = 'running';
        this.logStateChange('idle', 'running', 'Retomada de produção');
      }
    } 
    // Máquina parada pode ser consertada
    else if (this.status === 'stopped') {
      if (Math.random() < 0.1) {
        this.status = 'running';
        this.logStateChange('stopped', 'running', 'Manutenção concluída');
      }
    }
  }
  
  // Registrar mudanças de estado
  logStateChange(fromState, toState, reason) {
    const change = {
      timestamp: new Date(),
      fromState,
      toState,
      reason
    };
    
    this.stateLog.push(change);
    console.log(`Máquina ${this.id}: ${fromState} -> ${toState} (${reason})`);
    
    // Manter apenas os últimos 100 registros
    if (this.stateLog.length > 100) {
      this.stateLog.shift();
    }
    
    // Enviar imediatamente uma atualização quando o estado mudar
    if (this.connected) {
      this.sendData();
    }
  }
  
  // Enviar dados para o servidor TCP
  sendData() {
    if (!this.connected || !this.socket) {
      return;
    }
    
    // Criar objeto de dados
    const data = {
      machineId: this.id,
      name: this.name,
      status: this.status,
      plannedProductionTime: this.metrics.plannedProductionTime,
      downtime: this.metrics.downtime,
      operatingTime: this.metrics.operatingTime,
      idealCycleTime: this.metrics.idealCycleTime,
      totalPieces: this.metrics.totalPieces,
      defectivePieces: this.metrics.defectivePieces,
      timestamp: new Date(),
      // Adicionar informações de estado para diagnóstico
      lastStateChangeReason: this.stateLog.length > 0 ? this.stateLog[this.stateLog.length - 1].reason : null,
      lastStateChangeTime: this.stateLog.length > 0 ? this.stateLog[this.stateLog.length - 1].timestamp : null
    };
    
    // Enviar como JSON
    try {
      this.socket.write(JSON.stringify(data) + '\n');
      console.log(`Máquina ${this.id}: Dados enviados (status: ${this.status})`);
    } catch (error) {
      console.error(`Máquina ${this.id}: Erro ao enviar dados:`, error);
      this.connected = false;
      
      // Tentar reconectar
      setTimeout(() => this.connect(), 5000);
    }
  }
}

// Iniciar simuladores de máquinas
function startSimulators() {
  console.log(`Iniciando ${MACHINE_COUNT} simuladores de máquinas...`);
  
  for (let i = 1; i <= MACHINE_COUNT; i++) {
    const machine = new MachineSimulator(i);
    machine.connect();
  }
}

// Iniciar simulação
startSimulators();