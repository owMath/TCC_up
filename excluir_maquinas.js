// excluir-maquinas.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Usar a string de conexão do .env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://math:1234@tcc.tbjfx.mongodb.net/?retryWrites=true&w=majority&appName=TCC';

async function excluirMaquinas() {
    let client;
    
    try {
        console.log('Conectando ao MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('Conexão estabelecida com sucesso!');
        
        const db = client.db('sistema_oee');
        const collection = db.collection('machine_data');
        
        // Perguntar confirmação antes de excluir
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.question('Você está prestes a excluir TODAS as máquinas. Digite "SIM" para confirmar: ', async (resposta) => {
            if (resposta === 'SIM') {
                const resultado = await collection.deleteMany({});
                console.log(`Excluídos ${resultado.deletedCount} documentos`);
            } else {
                console.log('Operação cancelada pelo usuário.');
            }
            
            // Fechar conexão e finalizar
            await client.close();
            readline.close();
        });
        
    } catch (erro) {
        console.error('Erro ao conectar ou excluir:', erro);
        if (client) await client.close();
    }
}

// Executar a função
excluirMaquinas();