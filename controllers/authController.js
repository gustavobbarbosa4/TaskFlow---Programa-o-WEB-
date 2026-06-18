const db = require('../models/db');
const bcrypt = require('bcrypt');

exports.showLogin = (req, res) => {
    res.render('login');
};

exports.showRegister = (req, res) => {
    res.render('register');
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(400).send('Email ou senha incorretos.');
        }

        const validPassword = await bcrypt.compare(
            password,
            user.senha
        );

        if (!validPassword) {
            return res.status(400).send('Email ou senha incorretos.');
        }

        // Guarda os dados do utilizador na sessão
        req.session.user = {
            id: user.id,
            name: user.nome,
            email: user.email,
            nivel_acesso: user.nivel_acesso
        };

        res.redirect('/tasks');

    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao efetuar login');
    }
};

exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Verifica se o email já existe
        const userExists = await db.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).send('Este email já está registado.');
        }

        // Criptografa a senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insere o novo utilizador
        await db.query(
            'INSERT INTO usuarios (nome, email, senha, nivel_acesso) VALUES ($1, $2, $3, $4)',
            [name, email, hashedPassword, 'user']
        );

        res.redirect('/auth/login');

    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao registar utilizador');
    }
};

exports.logout = (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            console.error(err);
            return res.status(500).send('Erro ao realizar logout');
        }

        res.redirect('/auth/login');

    });

};
