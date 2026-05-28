const express = require('express')
const app = express()
const port = 8080

app.get('/', (req, res)=>{
    res.send('Teste')
})

app.listen(port, ()=>{
    console.log('app rodando na porta ' + port);
});