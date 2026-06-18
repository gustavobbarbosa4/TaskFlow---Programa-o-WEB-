const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/login', authController.showLogin);

router.post('/login', authController.login);

router.get('/register', authController.showRegister);

router.post('/register', authController.register);

router.get('/logout', authMiddleware, authController.logout);

module.exports = router;