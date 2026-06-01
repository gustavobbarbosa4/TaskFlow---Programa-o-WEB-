exports.showLogin = (req, res) => {
    res.render('login');
};

exports.showRegister = (req, res) => {
    res.render('register');
};

exports.login = (req, res) => {
    res.send('Login realizado');
};

exports.register = (req, res) => {
    res.send('Usuário cadastrado'); 
};

exports.logout = (req, res) => {
    res.send('Logout realizado')
}
