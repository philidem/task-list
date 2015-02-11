task-list
===========
Simple utility library for managing a list of tasks and their lifecycle.

## Installation
```bash
npm install task-list --save
```

## Overview
A task list is created from an array of objects. Each object has a `start`
function and an optional `stop` function. Both of these functions should expect
a callback argument that should be invoked when the operation completes.
Operations can be called on the task list and if a logger was provided
in the config then the current activity will be logged via the given logger.

## Usage
Simple example with minimal configuration:
```javascript
var services = taskList.create([
    {
        name: 'service1',

        start: function(callback) {
            // do something
            callback();
        },

        // "stop" functional is optional
        stop: function(callback) {
            // do something
            callback();
        }
    },

    {
        name: 'service2',

        start: function(callback) {
            // do something
            callback();
        },

        // "stop" functional is optional
        stop: function(callback) {
            // do something
            callback();
        }
    }
]);

services.startAll(function(err) {
    if (err) {
        // some error occurred
    } else {
        // services are running
    }

    // now stop the services
    services.stopAll(function(err) {
        if (err) {
            // one or more services failed to stop
        } else {
            // all services stopped successfully
        }
    });
});
```

An example that provides a `logger`:
```javascript
var services = taskList.create({
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
    },

    tasks: [
        {
            name: 'task1',

            start: function(callback) {
                // do something
                callback();
            },

            // "stop" functional is optional
            stop: function(callback) {
                callback();
            }
        },

        {
            name: 'task2',

            start: function(callback) {
                // do something
                callback();
            },

            // "stop" functional is optional
            stop: function(callback) {
                callback();
            }
        }
    ]
});
```
