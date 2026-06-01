const express = require('express');

const router = express.Router();

const taskController = require('../controllers/taskController');

router.get('/', taskController.listTasks);

router.get('/create', taskController.showCreateTask);

router.post('/create', taskController.createTask);

router.get('/edit/:id', taskController.showEditTask);

router.post('/edit/:id', taskController.editTask);

router.get('/delete/:id', taskController.deleteTask);

module.exports = router;