const express = require('express');
const session = require('express-session'); // Adicionado para gerenciar o login
require('dotenv').config();
const db = require('./models/db');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const adminRoutes = require('./routes/adminRoutes');

const port = 3000;
const app = express();

// Configuração de sessão para o relacionamento do banco
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave-secreta-do-taskflow',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true
    }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res)=>{
    res.redirect('/auth/login');
});

db.ready.then(() => {
    app.listen(port, ()=>{
        console.log('app rodando na porta ' + port);
    });
});

