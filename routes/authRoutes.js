const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/login', authMiddleware,authController.showLogin);

router.post('/login', authMiddleware,authController.login);

router.get('/register', authMiddleware,authController.showRegister);

router.post('/register', authMiddleware,authController.register);

router.get('/logout', authMiddleware,authController.logout);

module.exports = router;