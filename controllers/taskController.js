const tasks = [];

exports.listTasks = (req, res) => {
    res.render('tasks', {
        tasks
    });
}

exports.showCreateTask = (req, res) => {
    res.render('createTask');
};

exports.createTask = (req, res) => {
    tasks.push({
        id: Date.now(),
        title: req.body.title,
        description: req.body.description,
        completed: false
    });
    console.log(req.body)
    res.redirect('/tasks');
};

exports.showEditTask = (req, res) => {
    const task = tasks.find(
        t => t.id == req.params.id
    );

    res.render('editTask', {
        task
    });
};

exports.editTask = (req, res) => {
    const task = tasks.find(
        t => t.id == req.params.id
    );

    task.title = req.body.title;
    task.description = req.body.description;

    res.redirect('/tasks');
};

exports.deleteTask = (req, res) => {
    const index = tasks.findIndex(
        t => t.id == req.params.id
    );

    tasks.splice(index, 1);

    res.redirect('/tasks');
};

