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
            expect(err.failures.length).to.equal(1);

            expect(serviceList.getTaskByName('task1').state).to.equal(taskList.TaskState.ERROR);
            expect(serviceList.getTaskByName('task2').state).to.equal(undefined);

            done();
        });
    });
});
