// Carrega as variáveis do arquivo .env
require('dotenv').config();

// Importa o driver mysql2 (na versão com "Promises")
const mysql = require('mysql2/promise');

// Cria o "Pool" de conexões com o banco
// Um Pool é mais eficiente que uma conexão única
console.log('Tentando conectar ao banco de dados...');
console.log(`Host: ${process.env.DB_HOST}, User: ${process.env.DB_USER}`);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testa a conexão imediatamente
pool.getConnection()
    .then(connection => {
        console.log('✅ CONEXÃO COM O BANCO MYSQL (LOCAWEB) BEM SUCEDIDA!');
        connection.release(); // Libera a conexão de volta para o pool
    })
    .catch(err => {
        console.error('❌ ERRO AO CONECTAR COM O BANCO:');
        console.error(err.message);
        // Se der erro de "Access denied", verifique as credenciais no .env
        // Se der erro de "ECONNREFUSED", verifique o Host, a Porta ou o Firewall na Locaweb
    });

// Exporta o pool para ser usado em outros arquivos (como o server.js)
module.exports = pool;