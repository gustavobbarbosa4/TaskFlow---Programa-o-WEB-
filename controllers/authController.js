const db = require('../models/db');

exports.showLogin = (req, res) => {
    res.render('login');
};

exports.showRegister = (req, res) => {
    res.render('register');
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || user.senha !== password) {
            return res.status(400).send('Email ou senha incorretos.');
        }

        // guarda os dados do utilizador na sessão para o relacionamento
        req.session.user = {
            id: user.id,
            name: user.nome,
            email: user.email
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
        // verifica se o email já existe no banco
        const userExists = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).send('Este email já está registado.');
        }

        // insere o novo utilizador no banco de dados
        await db.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
            [name, email, password]
        );

        res.redirect('/auth/login'); // ajustado para a sua rota de autenticação
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao registar utilizador');
    }
};

exports.logout = (req, res) => { 

    req.session.destroy((err) => { // destrói a sessão do usuário

        if (err) {
            console.error(err);
            return res.status(500).send('Erro ao realizar logout');
        }

        res.redirect('/auth/login');
    });

};
