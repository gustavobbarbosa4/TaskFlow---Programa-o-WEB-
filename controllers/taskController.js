const db = require('../models/db');

const TASK_STATUSES = ['nao_iniciado', 'iniciado', 'em_desenvolvimento', 'completo', 'cancelado'];
const USER_TASK_STATUSES = ['nao_iniciado', 'iniciado', 'em_desenvolvimento', 'completo'];
const TASK_PRIORITIES = ['baixa', 'media', 'alta', 'urgente'];

function getAllowedStatus(status, isAdmin, currentStatus = 'nao_iniciado') {
    if (!isAdmin && currentStatus === 'cancelado') {
        return currentStatus;
    }

    const allowedStatuses = isAdmin ? TASK_STATUSES : USER_TASK_STATUSES;
    return allowedStatuses.includes(status) ? status : currentStatus;
}

function getAllowedPriority(priority) {
    return TASK_PRIORITIES.includes(priority) ? priority : 'media';
}

//ista tarefa apenas do utilizador logado
exports.listTasks = async (req, res) => {

    try {

        let result;
        let users = [];
        const priorityFilter = TASK_PRIORITIES.includes(req.query.prioridade)
            ? req.query.prioridade
            : '';
        const userFilter = Number.isInteger(Number(req.query.usuario_id)) && Number(req.query.usuario_id) > 0
            ? Number(req.query.usuario_id)
            : '';

        if (req.session.user.nivel_acesso === 'admin') {

            const usersResult = await db.query(
                'SELECT id, nome FROM usuarios ORDER BY nome'
            );
            users = usersResult.rows;

            const params = [];
            const conditions = [];

            if (priorityFilter) {
                params.push(priorityFilter);
                conditions.push(`t.prioridade = $${params.length}`);
            }

            if (userFilter) {
                params.push(userFilter);
                conditions.push(`t.usuario_id = $${params.length}`);
            }

            const whereClause = conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';

            result = await db.query(`
                SELECT
                    t.id,
                    t.titulo AS title,
                    t.descricao AS description,
                    t.completed,
                    t.status,
                    t.prioridade,
                    t.usuario_id,
                    u.nome AS usuario
                FROM tarefas t
                INNER JOIN usuarios u
                    ON u.id = t.usuario_id
                ${whereClause}
                ORDER BY
                    CASE t.prioridade
                        WHEN 'urgente' THEN 1
                        WHEN 'alta' THEN 2
                        WHEN 'media' THEN 3
                        WHEN 'baixa' THEN 4
                        ELSE 5
                    END,
                    t.id DESC
            `, params);

        } else {

            const params = [req.session.user.id];
            let whereClause = 'WHERE usuario_id = $1';

            if (priorityFilter) {
                params.push(priorityFilter);
                whereClause += ' AND prioridade = $2';
            }

            result = await db.query(
                `SELECT
                    id,
                    titulo AS title,
                    descricao AS description,
                    completed,
                    status,
                    prioridade
                FROM tarefas
                ${whereClause}
                ORDER BY
                    CASE prioridade
                        WHEN 'urgente' THEN 1
                        WHEN 'alta' THEN 2
                        WHEN 'media' THEN 3
                        WHEN 'baixa' THEN 4
                        ELSE 5
                    END,
                    id DESC`,
                params
            );

        }

        res.render('tasks', {
            tasks: result.rows,
            user: req.session.user,
            priorityFilter,
            userFilter,
            users,
            priorities: TASK_PRIORITIES
        });

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao buscar tarefas');

    }
};

// cria tarefa vinculada ao ID do utilizador logado
exports.createTask = async (req, res) => {

    const { title, description, usuario_id } = req.body;
    const priority = getAllowedPriority(req.body.prioridade);

    // REGRA:
    // - admin pode escolher usuário
    // - usuário comum sempre cria para si mesmo
    const userId =
        req.session.user.nivel_acesso === 'admin' && usuario_id
            ? usuario_id
            : req.session.user.id;

    try {

        await db.query(
            'INSERT INTO tarefas (titulo, descricao, completed, usuario_id, status, prioridade) VALUES ($1, $2, $3, $4, $5, $6)',
            [title, description, false, userId, 'nao_iniciado', priority]
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

    try {

        let result;

        if (req.session.user.nivel_acesso === 'admin') {

            result = await db.query(
                `SELECT
                    id,
                    titulo AS title,
                    descricao AS description,
                    completed,
                    status,
                    prioridade
                FROM tarefas
                WHERE id = $1`,
                [id]
            );

        } else {

            result = await db.query(
                `SELECT
                    id,
                    titulo AS title,
                    descricao AS description,
                    completed,
                    status,
                    prioridade
                FROM tarefas
                WHERE id = $1
                AND usuario_id = $2`,
                [id, req.session.user.id]
            );

        }

        if (result.rows.length === 0) {
            return res.status(404).send('Tarefa não encontrada');
        }

        res.render('editTask', {
            task: result.rows[0],
            user: req.session.user,
            priorities: TASK_PRIORITIES,
            statuses: req.session.user.nivel_acesso === 'admin'
                ? TASK_STATUSES
                : USER_TASK_STATUSES
        });

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao buscar tarefa');

    }
};

// atualiza tarefa no banco de dados
exports.editTask = async (req, res) => {

    const { id } = req.params;
    const { title, description } = req.body;
    const isAdmin = req.session.user.nivel_acesso === 'admin';

    try {

        let task;

        if (isAdmin) {
            task = await db.query(
                'SELECT * FROM tarefas WHERE id = $1',
                [id]
            );
        } else {
            task = await db.query(
                'SELECT * FROM tarefas WHERE id = $1 AND usuario_id = $2',
                [id, req.session.user.id]
            );
        }

        if (task.rows.length === 0) {
            return res.status(isAdmin ? 404 : 403).send(isAdmin ? 'Tarefa não encontrada' : 'Acesso negado');
        }

        const status = getAllowedStatus(req.body.status, isAdmin, task.rows[0].status);
        const completed = status === 'completo';
        const priority = isAdmin
            ? getAllowedPriority(req.body.prioridade)
            : task.rows[0].prioridade;

        await db.query(
            'UPDATE tarefas SET titulo = $1, descricao = $2, status = $3, completed = $4, prioridade = $5 WHERE id = $6',
            [title, description, status, completed, priority, id]
        );

        res.redirect('/tasks');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao atualizar tarefa');

    }
};

// iniciar tarefa
exports.startTask = async (req, res) => {

    const { id } = req.params;

    try {

        let result;

        if (req.session.user.nivel_acesso === 'admin') {

            result = await db.query(
                'SELECT status FROM tarefas WHERE id = $1',
                [id]
            );

        } else {

            result = await db.query(
                'SELECT status FROM tarefas WHERE id = $1 AND usuario_id = $2',
                [id, req.session.user.id]
            );

        }

        if (result.rows.length === 0) {
            return res.status(404).send('Tarefa não encontrada');
        }

        if (result.rows[0].status !== 'nao_iniciado') {
            return res.redirect('/tasks');
        }

        await db.query(
            'UPDATE tarefas SET status = $1, completed = $2 WHERE id = $3',
            ['iniciado', false, id]
        );

        res.redirect('/tasks');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao iniciar tarefa');

    }
};

// excluir tarefa do banco de dados
exports.deleteTask = async (req, res) => {

    const { id } = req.params;

    try {

        if (req.session.user.nivel_acesso !== 'admin') {

            const task = await db.query(
                'SELECT * FROM tarefas WHERE id = $1 AND usuario_id = $2',
                [id, req.session.user.id]
            );

            if (task.rows.length === 0) {
                return res.status(403).send('Acesso negado');
            }
        }

        await db.query(
            'DELETE FROM tarefas WHERE id = $1',
            [id]
        );

        res.redirect('/tasks');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao excluir tarefa');

    }
};

// exibir tela de criação
exports.showCreateTask = async (req, res) => {

    try {

        let users = [];

        if (req.session.user.nivel_acesso === 'admin') {
            const result = await db.query(
                'SELECT id, nome FROM usuarios ORDER BY nome'
            );
            users = result.rows;
        }

        res.render('createTask', {
            users,
            user: req.session.user
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao carregar tela');
    }
};

// concluir/desconcluir tarefa
exports.completeTask = async (req, res) => {

    const { id } = req.params;

    try {

        let result;

        if (req.session.user.nivel_acesso === 'admin') {

            result = await db.query(
                'SELECT completed, status FROM tarefas WHERE id = $1',
                [id]
            );

        } else {

            result = await db.query(
                'SELECT completed, status FROM tarefas WHERE id = $1 AND usuario_id = $2',
                [id, req.session.user.id]
            );

        }

        if (result.rows.length === 0) {
            return res.status(404).send('Tarefa não encontrada');
        }

        if (req.session.user.nivel_acesso !== 'admin' && result.rows[0].status === 'cancelado') {
            return res.status(403).send('Apenas administradores podem alterar tarefas canceladas');
        }

        const novoStatus = !result.rows[0].completed;
        const progressStatus = novoStatus ? 'completo' : 'em_desenvolvimento';

        console.log('Tarefa:', id);
        console.log('Status antigo:', result.rows[0].completed);
        console.log('Status novo:', novoStatus);

        await db.query(
            'UPDATE tarefas SET completed = $1, status = $2 WHERE id = $3',
            [novoStatus, progressStatus, id]
        );

        res.redirect('/tasks');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao concluir tarefa');

    }
};
