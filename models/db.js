const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('erro ao conectar no PostgreSQL:', err);
    } else {
        console.log('postgreSQL conectado com sucesso!');
    }
});

async function initializeDatabase() {
    try {
        await pool.query(`
            ALTER TABLE tarefas
            ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'nao_iniciado'
        `);

        await pool.query(`
            ALTER TABLE tarefas
            ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) DEFAULT 'media'
        `);

        await pool.query(`
            UPDATE tarefas
            SET status = CASE
                WHEN completed = true THEN 'completo'
                ELSE 'nao_iniciado'
            END
            WHERE status IS NULL
        `);

        await pool.query(`
            UPDATE tarefas
            SET prioridade = 'media'
            WHERE prioridade IS NULL
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS tarefa_compartilhamentos (
                id SERIAL PRIMARY KEY,
                tarefa_id INTEGER NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (tarefa_id, usuario_id)
            )
        `);
    } catch (err) {
        console.error('erro ao preparar tabelas:', err);
    }
}

pool.ready = initializeDatabase();

module.exports = pool;
