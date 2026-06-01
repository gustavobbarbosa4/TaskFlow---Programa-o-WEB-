const express = require('express');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const port = 3000;
const app = express();

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

