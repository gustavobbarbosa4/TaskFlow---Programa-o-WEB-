const express = require('express');

const router = express.Router();

const taskController = require('../controllers/taskController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, taskController.listTasks);

router.get('/create', authMiddleware, taskController.showCreateTask);

router.post('/create', authMiddleware, taskController.createTask);

router.get('/edit/:id', authMiddleware, taskController.showEditTask); //carrega a tela de edição de tarefa

router.post('/edit/:id', authMiddleware, taskController.editTask); // editar tarefa

router.get('/delete/:id', authMiddleware, taskController.deleteTask); // deletar tarefa

router.get('/complete/:id', authMiddleware, taskController.completeTask); // define se a tarefa foi concluída

module.exports = router;