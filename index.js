var series = require('raptor-async/series');

var NOOP = function() {};

var TaskState = exports.TaskState = {
    STARTED: {},
    STOPPED: {},
    ERROR: {}
};

var TaskType = exports.TaskType = {
    SERVICE: {
        disabledMessage: function(task) {
            return 'Service "' + task.name + '" is disabled.';
        },

        startingMessage: function(task) {
            return 'Starting service "' + task.name + '"...';
        },

        startedMessage: function(task) {
            return 'Service "' + task.name + '" started.';
        },

        stoppingMessage: function(task) {
            return 'Stopping service "' + task.name + '"...';
        },

        stoppedMessage: function(task) {
            return 'Service "' + task.name + '" stopped.';
        },

        startErrorMessage: function(task) {
            return 'Error starting service "' + task.name + '".';
        },

        stopErrorMessage: function(task) {
            return 'Error stopping service "' + task.name + '".';
        }
    },
    TASK: {
        disabledMessage: function(task) {
            return 'Task "' + task.name + '" is disabled.';
        },

        startingMessage: function(task) {
            return 'Starting task "' + task.name + '"...';
        },

        startedMessage: function(task) {
            return 'Task "' + task.name + '" completed.';
        },

        startErrorMessage: function(task) {
            return 'Error running task "' + task.name + '".';
        },

        stoppingMessage: function(task) {
            return 'Stopping task "' + task.name + '"...';
        },

        stoppedMessage: function(task) {
            return 'Task "' + task.name + '" stopped.';
        },

        stopErrorMessage: function(task) {
            return 'Task "' + task.name + '" stopped.';
        }
    }
};

function TaskList(options) {
    /* jshint devel:true */

    var tasks;
    var logger;
    if (Array.isArray(options)) {
        tasks = options;
    } else {
        tasks = options.tasks;
        logger = options.logger;
    }

    this.tasks = tasks;
    this.taskByNameMap = {};

    if (logger) {
        if (logger === true) {
            logger = {};
        }

        logger.info = logger.info || console.log.bind(console);
        logger.success = logger.success || console.log.bind(console);
        logger.error = logger.error || console.error.bind(console);
    } else {
        logger = {
            info: NOOP,
            success: NOOP,
            error: NOOP
        };
    }

    this.logger = logger;

    for (var i = 0; i < tasks.length; i++) {
        var task = tasks[i];

        if (task.name) {
            this.taskByNameMap[task.name] = task;
        } else {
            // Use index as name for display purposes
            task.name = '#' + i;
        }

        var typeName = task.type;
        if (typeName) {
            task.type = TaskType[typeName.toUpperCase()];
            if (!task.type) {
                throw new Error('Invalid task type: "' + typeName + '". Should be one of: ' + Object.keys(TaskType).map(function(typeName) {
                    return typeName.toLowerCase();
                }).join(', '));
            }
        } else {
            task.type = TaskType.TASK;
        }

        /*jshint loopfunc: true */
        ['start', 'stop'].forEach(function(property) {
            var func = task[property];
            if (func && (func.length !== 1)) {
                throw new Error('Task "' + task.name + '" has invalid "' + property + '" function. This function should accept one argument which is callback.');
            }
        });
    }
}

var TaskList_prototype = TaskList.prototype;

TaskList_prototype.getTaskByName = function(name) {
    return this.taskByNameMap[name];
};

TaskList_prototype.startAll = function(callback) {
    var logger = this.logger;
    var work = [];

    var failures = [];

    this.tasks.forEach(function(task, index) {
        if (task.disabled) {
            logger.info(task.type.disabledMessage(task));
            return;
        }

        work.push(function(callback) {
            logger.info(task.type.startingMessage(task));
            task.start(function(startErr) {
                if (startErr) {
                    task.state = TaskState.ERROR;

                    var err = new Error(task.type.startErrorMessage(task));
                    err.cause = startErr;

                    failures.push({
                        task: task,
                        err: startErr
                    });

                    callback(err);
                } else {
                    task.state = TaskState.STARTED;
                    logger.success(task.type.startedMessage(task));
                    callback();
                }
            });
        });
    });

    series(work, function(err) {
        if (err) {
            err.failures = failures;
            callback(err);
        } else {
            callback();
        }
    });
};

TaskList_prototype.stopAll = function(callback) {
    var logger = this.logger;
    var work = [];

    var failures = [];

    this.tasks.forEach(function(task, index) {

        if (!task.stop || (task.state !== TaskState.STARTED)) {
            return;
        }

        work.push(function(callback) {
            logger.info(task.type.stoppingMessage(task));
            task.stop(function(stopErr) {
                if (stopErr) {
                    task.state = TaskState.ERROR;

                    logger.error('Failed to stop "' + task.name + '". Error: ' + (stopErr.stack || stopErr));
                    failures.push({
                        task: task,
                        err: stopErr
                    });
                } else {
                    task.state = TaskState.STOPPED;
                    logger.success(task.type.stoppedMessage(task));
                    callback();
                }
            });
        });
    });

    series(work, function(err) {
        if (err) {
            logger.error('Errors occurrred while stopping tasks.');
            return callback(err);
        }

        if (failures.length > 0) {
            err = new Error('Following tasks failed to stop: ' + failures.map(function(failure) {
                return failure.task.name;
            }).join(', '));

            err.failures = failures;
            return callback(err);
        }

        callback();
    });
};

exports.create = function(options) {
    return new TaskList(options);
};
