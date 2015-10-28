var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var assert = require('assert');

var taskList = require('../');

describe('task-list' , function() {
    it('should support starting and stopping services', function(done) {
        var task1Started = false;
        var task2Started = false;

        var serviceList = taskList.create([
            {
                name: 'task1',

                start: function(callback) {
                    task1Started = true;
                    callback();
                },

                stop: function(callback) {
                    task1Started = false;
                    callback();
                }
            },

            {
                name: 'task2',

                start: function(callback) {
                    task2Started = true;
                    callback();
                },

                stop: function(callback) {
                    task2Started = false;
                    callback();
                }
            }
        ]);

        serviceList.startAll(function(err) {
            assert(!err);
            expect(task1Started).to.equal(true);
            expect(task2Started).to.equal(true);

            expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.STARTED);
            expect(serviceList.getTaskByName('task2').state).to.equal(taskList.TaskState.STARTED);

            serviceList.stopAll(function(err) {
                assert(!err);
                expect(task1Started).to.equal(false);
                expect(task2Started).to.equal(false);

                expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.STOPPED);
                expect(serviceList.getTaskByName('task2').state).to.equal(taskList.TaskState.STOPPED);

                done();
            });
        });
    });

    it('should support creating task list with configuration object', function(done) {
        var task1Started = false;
        var task2Started = false;
        var infoCount = 0;
        var successCount = 0;
        var errorCount = 0;

        var serviceList = taskList.create({
            logger: {
                info: function(message) {
                    infoCount++;
                },

                success: function(message) {
                    successCount++;
                },

                error: function(message) {
                    errorCount++;
                }
            },

            tasks: [
                {
                    name: 'task1',

                    start: function(callback) {
                        task1Started = true;
                        callback();
                    },

                    stop: function(callback) {
                        task1Started = false;
                        callback();
                    }
                },

                {
                    name: 'task2',

                    start: function(callback) {
                        task2Started = true;
                        callback();
                    },

                    stop: function(callback) {
                        task2Started = false;
                        callback();
                    }
                }
            ]
        });

        serviceList.startAll(function(err) {
            assert(!err);

            expect(task1Started).to.equal(true);
            expect(task2Started).to.equal(true);

            expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.STARTED);
            expect(serviceList.getTaskByName('task2').state).to.equal(taskList.TaskState.STARTED);

            expect(infoCount).to.equal(2);
            expect(successCount).to.equal(2);
            expect(errorCount).to.equal(0);

            serviceList.stopAll(function(err) {
                assert(!err);
                expect(task1Started).to.equal(false);
                expect(task2Started).to.equal(false);

                expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.STOPPED);
                expect(serviceList.getTaskByName('task2').state).to.equal(taskList.TaskState.STOPPED);

                expect(infoCount).to.equal(4);
                expect(successCount).to.equal(4);
                expect(errorCount).to.equal(0);
                done();
            });
        });
    });

    it('should handle reporting errors', function(done) {

        var serviceList = taskList.create([
            {
                name: 'task1',

                start: function(callback) {
                    callback(new Error('task1 failed'));
                }
            },

            {
                name: 'task2',

                start: function(callback) {
                    callback(new Error('task2 failed'));
                }
            }
        ]);

        serviceList.startAll(function(err) {
            expect(err.message).to.equal('task1 failed');

            expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.ERROR);
            expect(serviceList.getTaskByName('task2').state).to.equal(taskList.TaskState.INITIAL);

            done();
        });
    });

    it('should support disabling a task', function(done) {
        var task1Started = null;
        var task2Started = null;

        var serviceList = taskList.create([
            {
                name: 'task1',

                disabled: function() {
                    return true;
                },

                start: function(callback) {
                    task1Started = true;
                    callback();
                },

                stop: function(callback) {
                    task1Started = false;
                    callback();
                }
            },

            {
                name: 'task2',

                disabled: true,

                start: function(callback) {
                    task2Started = true;
                    callback();
                },

                stop: function(callback) {
                    task2Started = false;
                    callback();
                }
            }
        ]);

        expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.INITIAL);
        expect(serviceList.getTaskByName('task2').state).to.equal(taskList.TaskState.INITIAL);

        serviceList.startAll(function(err) {
            assert(!err);
            expect(task1Started).to.equal(null);
            expect(task2Started).to.equal(null);

            expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.DISABLED);
            expect(serviceList.getTaskByName('task2').state).to.equal(taskList.TaskState.DISABLED);

            serviceList.stopAll(function(err) {
                assert(!err);
                expect(task1Started).to.equal(null);
                expect(task2Started).to.equal(null);

                expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.DISABLED);
                expect(serviceList.getTaskByName('task2').state).to.equal(taskList.TaskState.DISABLED);

                done();
            });
        });
    });

    it('should support synchronous task', function(done) {
        var task1Started = false;

        var serviceList = taskList.create([
            {
                name: 'task1',

                start: function() {
                    task1Started = true;
                },

                stop: function() {
                    task1Started = false;
                }
            },
        ]);

        serviceList.startAll(function(err) {
            assert(!err);
            expect(task1Started).to.equal(true);

            serviceList.stopAll(function(err) {
                assert(!err);
                expect(task1Started).to.equal(false);

                expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.STOPPED);

                done();
            });
        });
    });

    it('should support tasks that return promise in start/stop function', function(done) {
        var task1Started = false;

        var serviceList = taskList.create([
            {
                name: 'task1',

                start: function() {
                    return new Promise(function(resolve, reject) {
                        task1Started = true;
                        resolve();
                    });
                },

                stop: function() {
                    return new Promise(function(resolve, reject) {
                        task1Started = false;
                        resolve();
                    });
                }
            },
        ]);

        serviceList.startAll(function(err) {
            assert(!err);
            expect(task1Started).to.equal(true);

            serviceList.stopAll(function(err) {
                assert(!err);
                expect(task1Started).to.equal(false);

                expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.STOPPED);

                done();
            });
        });
    });

    it('should support promise return value for startAll and stopAll', function(done) {
        var task1Started = false;

        var serviceList = taskList.create([
            {
                name: 'task1',

                start: function() {
                    return new Promise(function(resolve, reject) {
                        setTimeout(function() {
                            task1Started = true;
                            resolve();
                        }, 10);
                    });
                },

                stop: function() {
                    return new Promise(function(resolve, reject) {
                        setTimeout(function() {
                            task1Started = false;
                            resolve();
                        }, 10);
                    });
                }
            }
        ]);

        serviceList.startAll().then(function() {
            expect(task1Started).to.equal(true);
            return serviceList.stopAll();
        }).then(function() {
            expect(task1Started).to.equal(false);
            done();
        }).catch(function(err) {
            throw err;
        });
    });

    it('should creation with just array of tasks', function(done) {
        var started = false;
        taskList.create([
            {
                name: 'task1',
                start: function() {
                    started = true;
                }
            }
        ]).startAll(function(err) {
            expect(started).to.equal(true);
            done();
        });
    });

    it('should creation with just array of tasks and options', function(done) {
        var started = false;
        var logged = false;

        var options = {
            logger: {
                info: function() {
                    logged = true;
                }
            }
        };

        taskList.create([
            {
                name: 'task1',
                start: function() {
                    started = true;
                }
            }
        ], options).startAll(function(err) {
            expect(started).to.equal(true);
            expect(logged).to.equal(true);
            done();
        });
    });

    it('should creation with just options', function(done) {
        var started = false;
        var logged = false;

        var options = {
            logger: {
                info: function() {
                    logged = true;
                }
            },

            tasks: [
                {
                    name: 'task1',
                    start: function() {
                        started = true;
                    }
                }
            ]
        };

        taskList.create(options).startAll(function(err) {
            expect(started).to.equal(true);
            expect(logged).to.equal(true);
            done();
        });
    });

});
