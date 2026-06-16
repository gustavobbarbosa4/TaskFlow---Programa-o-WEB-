const db = require('../models/db');


//ista tarefa apenas do utilizador logado
exports.listTasks = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const result = await db.query(
            'SELECT id, titulo AS title, descricao AS description, completed FROM tarefas WHERE usuario_id = $1 ORDER BY id DESC',
            [userId]
        );
        
        res.render('tasks', {
            tasks: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao buscar tarefas');
    }
};

exports.showCreateTask = (req, res) => {
    res.render('createTask');
};

// cria tarefa vinculada ao ID do utilizador logado
exports.createTask = async (req, res) => {
    const { title, description } = req.body;
    const userId = req.session.user.id;
    
    try {
        await db.query(
            'INSERT INTO tarefas (titulo, descricao, completed, usuario_id) VALUES ($1, $2, $3, $4)',
            [title, description, false, userId]
        );
        res.redirect('/tasks');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao salvar tarefa');
    }
};


//buscar tarefa específica para editar
exports.showEditTask = async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;

    try {
        const result = await db.query(
            `SELECT id,
                    titulo AS title,
                    descricao AS description,
                    completed
             FROM tarefas
             WHERE id = $1
             AND usuario_id = $2`, // permite o usuário alterar apenas as próprias tarefas
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send('Tarefa não encontrada');
        }

        const task = result.rows[0];

        res.render('editTask', { task });

    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao buscar tarefa');
    }
};

// atualiza tarefa no banco de dados
exports.editTask = async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    try {
        await db.query(
            'UPDATE tarefas SET titulo = $1, descricao = $2 WHERE id = $3',
            [title, description, id]
        );
        res.redirect('/tasks');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao atualizar tarefa');
    }
};

// excluir tarefa do banco de dados
exports.deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM tarefas WHERE id = $1', [id]);
        res.redirect('/tasks');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao excluir tarefa');
    }
};
