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

function getPositiveId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function getAccessibleTask(taskId, user) {
    if (user.nivel_acesso === 'admin') {
        const result = await db.query(
            'SELECT *, true AS can_share, true AS can_delete FROM tarefas WHERE id = $1',
            [taskId]
        );
        return result.rows[0];
    }

    const result = await db.query(
        `SELECT
            t.*,
            (t.usuario_id = $2) AS can_share,
            (t.usuario_id = $2) AS can_delete
        FROM tarefas t
        WHERE t.id = $1
        AND (
            t.usuario_id = $2
            OR EXISTS (
                SELECT 1
                FROM tarefa_compartilhamentos tc
                WHERE tc.tarefa_id = t.id
                AND tc.usuario_id = $2
            )
        )`,
        [taskId, user.id]
    );

    return result.rows[0];
}

async function getUsersForFilters() {
    const result = await db.query(
        'SELECT id, nome FROM usuarios ORDER BY nome'
    );
    return result.rows;
}

async function renderTaskList(req, res, completedView) {
    const isAdmin = req.session.user.nivel_acesso === 'admin';
    const priorityFilter = TASK_PRIORITIES.includes(req.query.prioridade)
        ? req.query.prioridade
        : '';
    const userFilter = isAdmin ? getPositiveId(req.query.usuario_id) : null;
    const users = await getUsersForFilters();

    const params = [];
    const conditions = [];

    conditions.push(completedView
        ? "(t.completed = true OR t.status = 'completo')"
        : "(t.completed = false AND t.status <> 'completo')");

    if (priorityFilter) {
        params.push(priorityFilter);
        conditions.push(`t.prioridade = $${params.length}`);
    }

    if (isAdmin) {
        if (userFilter) {
            params.push(userFilter);
            conditions.push(`t.usuario_id = $${params.length}`);
        }
    } else {
        params.push(req.session.user.id);
        conditions.push(`(
            t.usuario_id = $${params.length}
            OR EXISTS (
                SELECT 1
                FROM tarefa_compartilhamentos tc
                WHERE tc.tarefa_id = t.id
                AND tc.usuario_id = $${params.length}
            )
        )`);
    }

    const result = await db.query(`
        SELECT
            t.id,
            t.titulo AS title,
            t.descricao AS description,
            t.completed,
            t.status,
            t.prioridade,
            t.usuario_id,
            u.nome AS usuario,
            (t.usuario_id = $${params.length + 1}) AS is_owner,
            EXISTS (
                SELECT 1
                FROM tarefa_compartilhamentos tc
                WHERE tc.tarefa_id = t.id
                AND tc.usuario_id = $${params.length + 1}
            ) AS is_shared
        FROM tarefas t
        INNER JOIN usuarios u
            ON u.id = t.usuario_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY
            CASE t.prioridade
                WHEN 'urgente' THEN 1
                WHEN 'alta' THEN 2
                WHEN 'media' THEN 3
                WHEN 'baixa' THEN 4
                ELSE 5
            END,
            t.id DESC
    `, [...params, req.session.user.id]);

    res.render('tasks', {
        tasks: result.rows,
        user: req.session.user,
        priorityFilter,
        userFilter: userFilter || '',
        users,
        priorities: TASK_PRIORITIES,
        completedView
    });
}

exports.listTasks = async (req, res) => {
    try {
        await renderTaskList(req, res, false);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao buscar tarefas');
    }
};

exports.listCompletedTasks = async (req, res) => {
    try {
        await renderTaskList(req, res, true);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao buscar tarefas concluídas');
    }
};

exports.createTask = async (req, res) => {
    const { title, description, usuario_id } = req.body;
    const priority = getAllowedPriority(req.body.prioridade);

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

exports.showEditTask = async (req, res) => {
    const { id } = req.params;

    try {
        const task = await getAccessibleTask(id, req.session.user);

        if (!task) {
            return res.status(404).send('Tarefa não encontrada');
        }

        res.render('editTask', {
            task: {
                id: task.id,
                title: task.titulo,
                description: task.descricao,
                completed: task.completed,
                status: task.status,
                prioridade: task.prioridade
            },
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

exports.editTask = async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const isAdmin = req.session.user.nivel_acesso === 'admin';

    try {
        const task = await getAccessibleTask(id, req.session.user);

        if (!task) {
            return res.status(404).send('Tarefa não encontrada');
        }

        const status = getAllowedStatus(req.body.status, isAdmin, task.status);
        const completed = status === 'completo';
        const priority = isAdmin
            ? getAllowedPriority(req.body.prioridade)
            : task.prioridade;

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

exports.startTask = async (req, res) => {
    const { id } = req.params;

    try {
        const task = await getAccessibleTask(id, req.session.user);

        if (!task) {
            return res.status(404).send('Tarefa não encontrada');
        }

        if (task.status !== 'nao_iniciado') {
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

exports.deleteTask = async (req, res) => {
    const { id } = req.params;

    try {
        const task = await getAccessibleTask(id, req.session.user);

        if (!task) {
            return res.status(404).send('Tarefa não encontrada');
        }

        if (!task.can_delete) {
            return res.status(403).send('Acesso negado');
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

exports.showCreateTask = async (req, res) => {
    try {
        let users = [];

        if (req.session.user.nivel_acesso === 'admin') {
            users = await getUsersForFilters();
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

exports.completeTask = async (req, res) => {
    const { id } = req.params;

    try {
        const task = await getAccessibleTask(id, req.session.user);

        if (!task) {
            return res.status(404).send('Tarefa não encontrada');
        }

        if (req.session.user.nivel_acesso !== 'admin' && task.status === 'cancelado') {
            return res.status(403).send('Apenas administradores podem alterar tarefas canceladas');
        }

        const completed = !task.completed;
        const status = completed ? 'completo' : 'em_desenvolvimento';

        await db.query(
            'UPDATE tarefas SET completed = $1, status = $2 WHERE id = $3',
            [completed, status, id]
        );

        res.redirect(req.headers.referer && req.headers.referer.includes('/tasks/completed')
            ? '/tasks/completed'
            : '/tasks');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao concluir tarefa');
    }
};

exports.shareTask = async (req, res) => {
    const { id } = req.params;
    const sharedUserIds = Array.isArray(req.body.usuario_ids)
        ? req.body.usuario_ids
        : [req.body.usuario_ids];

    const validIds = sharedUserIds
        .map(getPositiveId)
        .filter(sharedId => sharedId !== null);

    if (validIds.length === 0) {
        return res.redirect('/tasks');
    }

    try {
        const task = await getAccessibleTask(id, req.session.user);

        if (!task) {
            return res.status(404).send('Tarefa não encontrada');
        }

        if (!task.can_share) {
            return res.status(403).send('Acesso negado');
        }

        const uniqueIds = [...new Set(validIds)].filter(sharedId => Number(task.usuario_id) !== sharedId);

        if (uniqueIds.length === 0) {
            return res.redirect('/tasks');
        }

        const values = uniqueIds.map((_, index) => `($1, $${index + 2})`).join(', ');
        const params = [id, ...uniqueIds];

        await db.query(
            `INSERT INTO tarefa_compartilhamentos (tarefa_id, usuario_id)
             VALUES ${values}
             ON CONFLICT (tarefa_id, usuario_id) DO NOTHING`,
            params
        );

        res.redirect('/tasks');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao compartilhar tarefa');
    }
};
