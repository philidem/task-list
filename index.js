var series = require('raptor-async/series');

var NOOP = function() {};
var nextTick = require('./nextTick');

var TaskState = exports.TaskState = {
    INITIAL: {},
    STARTED: {},
    STOPPED: {},
    ERROR: {},
    DISABLED: {}
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

function TaskList(tasks, options) {
    /* jshint devel:true */
    var logger;

    if (options) {
        logger = options.logger;
    }

    this.tasks = tasks;
    this.taskByNameMap = {};

    if (logger) {
        if (logger === true) {
            logger = {
                info: console.log.bind(console),
                success: console.log.bind(console),
                error: console.error.bind(console)
            };
        } else {
            logger.info = logger.info || NOOP;
            logger.success = logger.success || NOOP;
            logger.error = logger.error || NOOP;
        }
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

        task.state = TaskState.INITIAL;

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
    }
}

function _isPromise(obj) {
    return (obj) && (obj.then) && (typeof obj.then === 'function');
}

function _invokeTask(task, funcName, callback) {
    var func = task[funcName];
    // Invoke task in next tick so that the previous task is not in
    // the call stack of new task
    if (func.length === 0) {
        nextTick(function() {
            var result = func.call(task);
            if (_isPromise(result)) {
                // task function returned promise so normalize to callback
                result.then(function() {
                    callback();
                }).catch(function(err) {
                    callback(err || new Error('Task failed to ' + funcName));
                });
            } else {
                // function is synchronous
                callback();
            }
        });
    } else {

        nextTick(function() {
            func.call(task, callback);
        });
    }
}

var TaskList_prototype = TaskList.prototype;

TaskList_prototype.getTaskByName = function(name) {
    return this.taskByNameMap[name];
};

function _createPromiseAndCallback() {
    var callback;
    var promise = new Promise(function(resolve, reject) {
        // create a callback that will resolve/reject the promise
        callback = function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        };
    });

    return [promise, callback];
}

TaskList_prototype.startAll = function(callback) {
    var logger = this.logger;
    var work = [];

    var promise;
    if (!callback) {
        var promiseAndCallback = _createPromiseAndCallback();
        promise = promiseAndCallback[0];
        callback = promiseAndCallback[1];
    }

    this.tasks.forEach(function(task, index) {
        var disabledFunc;

        if (task.disabled) {
            if (task.disabled.constructor === Function) {
                disabledFunc = task.disabled;
            } else {
                task.state = TaskState.DISABLED;
                logger.info(task.type.disabledMessage(task));
                return;
            }
        }

        work.push(function(callback) {
            if (disabledFunc && disabledFunc()) {
                task.state = TaskState.DISABLED;
                logger.info(task.type.disabledMessage(task));
                return callback();
            }

            logger.info(task.type.startingMessage(task));

            _invokeTask(task, 'start', function(startErr) {
                if (startErr) {
                    task.state = TaskState.ERROR;
                    logger.error(task.type.startErrorMessage(task));
                } else {
                    task.state = TaskState.STARTED;
                    logger.success(task.type.startedMessage(task));
                }

                callback(startErr);
            });
        });

        return promise;
    });

    series(work, function(err) {
        if (err) {
            callback(err);
        } else {
            callback();
        }
    });

    return promise;
};

TaskList_prototype.stopAll = function(callback) {
    var logger = this.logger;
    var work = [];

    var promise;
    if (!callback) {
        var promiseAndCallback = _createPromiseAndCallback();
        promise = promiseAndCallback[0];
        callback = promiseAndCallback[1];
    }

    var failures = [];

    this.tasks.forEach(function(task, index) {

        if (!task.stop || (task.state !== TaskState.STARTED)) {
            return;
        }

        work.push(function(callback) {
            logger.info(task.type.stoppingMessage(task));
            _invokeTask(task, 'stop', function(stopErr) {
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

    return promise;
};

exports.create = function(tasks, options) {
    if (arguments.length === 1) {
        if (Array.isArray(arguments[0])) {
            // provided an array of tasks
        } else {
            // provided a single options object
            options = arguments[0];
            tasks = options.tasks;
            if (!tasks) {
                throw new Error('"tasks" property is required if calling create with single options argument');
            }
        }
    } else if (arguments.length === 2) {
        // provided tasks and options as expected
    } else {
        throw new Error('Invalid arguments');
    }

    return new TaskList(tasks, options);
};
