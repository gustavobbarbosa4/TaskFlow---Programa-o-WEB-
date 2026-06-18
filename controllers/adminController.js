const db = require('../models/db');

exports.listUsers = async (req, res) => { // lista usuários

    try {

        const result = await db.query(`
            SELECT
                id,
                nome,
                email,
                nivel_acesso
            FROM usuarios
            ORDER BY id
        `);

        res.render('admin/users', {
            users: result.rows
        });

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao listar usuários');

    }
};

exports.showEditUser = async (req, res) => { // formulário de edição

    const { id } = req.params;

    try {

        const result = await db.query(
            'SELECT * FROM usuarios WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).send('Usuário não encontrado');
        }

        res.render('admin/editUser', {
            user: result.rows[0]
        });

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao carregar usuário');

    }
};

exports.editUser = async (req, res) => { // atualziar usuário

    const { id } = req.params;

    const {
        nome,
        email,
        nivel_acesso
    } = req.body;

    const accessLevel = nivel_acesso === 'admin' ? 'admin' : 'user';

    try {

        await db.query(
            `
            UPDATE usuarios
            SET nome = $1,
                email = $2,
                nivel_acesso = $3
            WHERE id = $4
            `,
            [nome, email, accessLevel, id]
        );

        res.redirect('/admin/users');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao atualizar usuário');

    }
};

exports.deleteUser = async (req, res) => { // excluir usuário

    const { id } = req.params;

    try {

        await db.query(
            'DELETE FROM tarefas WHERE usuario_id = $1',
            [id]
        );

        await db.query(
            'DELETE FROM usuarios WHERE id = $1',
            [id]
        );

        res.redirect('/admin/users');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao excluir usuário');

    }
};

exports.createUser = async (req, res) => {

    const { nome, email, senha, nivel_acesso } = req.body;
    const accessLevel = nivel_acesso === 'admin' ? 'admin' : 'user';

    try {
        const bcrypt = require('bcrypt');

        const userExists = await db.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).send('Este email já está registrado.');
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        await db.query(
            `
            INSERT INTO usuarios (nome, email, senha, nivel_acesso)
            VALUES ($1, $2, $3, $4)
            `,
            [nome, email, hashedPassword, accessLevel]
        );

        res.redirect('/admin/users');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao criar usuário');

    }
};

exports.showCreateUser = (req, res) => {
    res.render('admin/createUser');
};
