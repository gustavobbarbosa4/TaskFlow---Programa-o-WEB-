const express = require('express');

const router = express.Router();

const adminController = require('../controllers/adminController');

const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.get('/users', authMiddleware, adminMiddleware, adminController.listUsers);

router.get('/users/edit/:id', authMiddleware, adminMiddleware, adminController.showEditUser);

router.post('/users/edit/:id', authMiddleware, adminMiddleware, adminController.editUser);

router.post('/users/delete/:id', authMiddleware, adminMiddleware, adminController.deleteUser);

router.get('/users/create', authMiddleware, adminMiddleware, adminController.showCreateUser);

router.post('/users/create', authMiddleware, adminMiddleware, adminController.createUser);

module.exports = router;
