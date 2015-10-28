task-list
===========
Simple utility library for managing a list of tasks and their lifecycle
with support for promises and Node.js-style callbacks.

## Installation

```bash
npm install task-list --save
```

## Overview

The `task-list` module is used to orchestrate starting and
stopping tasks in sequential order.

Each task is provided as an object that provides
a `start` function and an optional `stop` function.

If your task is _asynchronous_ then your `start`/`stop` function can either
invoke a callback or return a promise. If returning a promise, then
your `start`/`stop` function should have no arguments. If not using
promises for your asynchronous operation, then your function should
declare a single `callback` argument which will be a Node.js-style
callback that you can invoke to indicate success or failure.

If your task is _synchronous_ then make sure your `start`/`stop` function
does not declare any arguments. As long as the function doesn't return
something that looks like a `Promise` then it will be assumed that
your task completed synchronously.

## Usage

Simple example with minimal configuration:

```javascript
var tasks = require('task-list').create([
    {
        name: 'asynchronous-task',

        // if you want to use callback for your async operation then
        // your function should have one argument which will be the
        // callback function
        start: function(callback) {
            // do something
            callback();
        },

        // NOTE: "stop" functional is optional
        // if you want to use callback for your async operation then
        // your function should have one argument which will be the
        // callback function
        stop: function(callback) {
            // do something
            callback();
        }
    },

    {
        name: 'asynchronous-task-using-promise',

        start: function() {
            // return a Promise
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    resolve();
                }, 10);
            });
        }
    },

    {
        name: 'synchronous-task',

        // synchronous operations should be declared as a function
        // with no arguments
        start: function() {
            // all we need to do is return if our task is synchronous
        }
    }
]);

// Using callback-style to start/stop all tasks
tasks.startAll(function(err) {
    if (err) {
        // some error occurred
    } else {
        // tasks are running
    }

    // now stop the tasks
    tasks.stopAll(function(err) {
        if (err) {
            // one or more services failed to stop
        } else {
            // all services stopped successfully
        }
    });
});

// startAll and stopAll can also be invoked with no argument if you
// would rather use promises.
tasks.startAll().then(function() {
    // now stop the tasks and return the Promise that it creates
    return tasks.stopAll();
}).then(function() {
    console.log('All tasks were started and have now been stopped');
}).catch(function(err) {
    throw err;
})
```

An example that provides a `logger`:

```javascript
var options = {
    logger: {
        info: function(message) {
            console.log('INFO: ' + message);
        },

        success: function(message) {
            console.log('SUCCESS: ' + message);
        },

        error: function(message) {
            console.error('ERROR: ' + message);
        }
    }
};

var services = require('task-list').create([
    {
        name: 'task1',

        start: function() {
            // do something
        }
    }
], options);
```

## API

### Method: `create(tasks, options)`

Returns a `TaskList` which has operations for controlling the lifecycle
of the tasks

#### `options`

- `logger`: An object that has `info`, `success`, or `error` properties
    which should be functions that expect a single _message_ argument.
    The `info`, `success`, and `error` properties are optional and
    if not provided then the corresponding log level will not produce
    any output.

**Example:**

```javascript
var tasks = require('task-list').create(tasksArray, options)
```


### Class: TaskList

A `TaskList` is returned by call to `require('task-list').create(...)`.

*NOTE:* If you call `startAll` or `stopAll` without a callback argument
then a `Promise` will be returned. The `Promise` implementation will
be the native `Promise` provided by the JavaScript runtime environment
or the `Promise` implementation that your application exposed as a
global. If there is no global `Promise` implementation found, then
you will encounter exceptions.

#### Method: `startAll([callback])`

This method is used to start all of the tasks that belong to this `TaskList`.
If a callback is provided then it is expected to be a Node.js-style callback
that will be invoked when all tasks have been started or error occurred.
If a callback is not provided then a `Promise` will be returned.

#### Method: `stopAll([callback])`

This method is used to stop all of the tasks that belong to this `TaskList`.
If a callback is provided then it is expected to be a Node.js-style callback
that will be invoked when all tasks have been stopped or error occurred.
If a callback is not provided then a `Promise` will be returned.

