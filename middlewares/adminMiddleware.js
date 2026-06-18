function adminMiddleware(req, res, next) {

    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    if (req.session.user.nivel_acesso !== 'admin') {
        return res.status(403).send('Acesso negado');
    }

    next();
}

module.exports = adminMiddleware;