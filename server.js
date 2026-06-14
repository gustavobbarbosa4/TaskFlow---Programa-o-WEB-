const express = require('express');
const session = require('express-session'); // Adicionado para gerenciar o login

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const port = 3000;
const app = express();

// Configuração de sessão para o relacionamento do banco
app.use(session({
    secret: 'chave-secreta-do-taskflow',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);

app.get('/', (req, res)=>{
    res.redirect('/auth/login');
});

app.listen(port, ()=>{
    console.log('app rodando na porta ' + port);
});

