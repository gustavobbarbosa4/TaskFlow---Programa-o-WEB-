const express = require('express');

const router = express.Router();

const taskController = require('../controllers/taskController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, taskController.listTasks);

router.get('/create', authMiddleware, taskController.showCreateTask);

router.post('/create', authMiddleware, taskController.createTask);

router.get('/edit/:id', authMiddleware, taskController.showEditTask);

router.post('/edit/:id', authMiddleware, taskController.editTask);

router.get('/delete/:id', authMiddleware, taskController.deleteTask);

module.exports = router;