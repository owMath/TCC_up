// teste-machine-simulator.js
// Script simplificado para simular máquinas e testar a conexão

const net = require('net');

// Configurações
const SERVER_HOST = 'localhost';
const SERVER_PORT = 8080;
const UPDATE_INTERVAL = 3000; // 3 segundos entre atualizações (mais rápido para testes)

function simulateMachine(id) {
    console.log(`Iniciando simulação da máquina ${id}...`);
    
    // Conectar ao servidor TCP
    const socket = new net.Socket();
    
    socket.connect(SERVER_PORT, SERVER_HOST, () => {
        console.log(`Máquina ${id}: Conectada ao servidor ${SERVER_HOST}:${SERVER_PORT}`);
        
        // Enviar dados periodicamente
        const interval = setInterval(() => {
            // Simular status aleatório às vezes
            const statuses = ['running', 'idle', 'stopped'];
            const status = Math.random() < 0.2 
                ? statuses[Math.floor(Math.random() * statuses.length)] 
                : 'running';
            
            // Simular métricas com alguma variação
            const data = {
                machineId: id,
                name: `Máquina ${id}`,
                status: status,
                plannedProductionTime: 480, // 8 horas em minutos
                downtime: Math.random() * 60, // 0-60 minutos de downtime
                operatingTime: 480 - (Math.random() * 60),
                idealCycleTime: 0.5, // 30 segundos por peça
                totalPieces: 800 + Math.floor(Math.random() * 100), // 800-900 peças
                defectivePieces: Math.floor(Math.random() * 20), // 0-20 peças defeituosas
                timestamp: new Date()
            };
            
            // Enviar dados
            socket.write(JSON.stringify(data) + '\n');
            console.log(`Máquina ${id}: Dados enviados (status: ${status})`);
            
        }, UPDATE_INTERVAL);
        
        // Manipular desconexão
        socket.on('close', () => {
            console.log(`Máquina ${id}: Conexão fechada`);
            clearInterval(interval);
        });
        
        // Manipular erros
        socket.on('error', (err) => {
            console.error(`Máquina ${id}: Erro:`, err);
            socket.destroy();
            clearInterval(interval);
        });
    });
    
    socket.on('error', (err) => {
        console.error(`Máquina ${id}: Erro ao conectar:`, err);
    });
    
    return socket;
}

// Simular 3 máquinas
console.log(`Iniciando simulador de máquinas para teste...`);
const machine1 = simulateMachine(1);
const machine2 = simulateMachine(2);
const machine3 = simulateMachine(3);

// Lidar com CTRL+C para encerrar graciosamente
process.on('SIGINT', () => {
    console.log('Encerrando simulações...');
    machine1.destroy();
    machine2.destroy();
    machine3.destroy();
    process.exit(0);
});