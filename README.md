# Seppuku: Allow your Node.js workers to die honourably

Seppuku (named after the highly ritual suicide ceremony of Japanese samurai) is a simple module that streamlines the process of gracefully shutting down worker processes in a Node.js cluster that serves web pages through [restify](https://npmjs.org/package/restify) or [express](https://npmjs.org/package/express). 

It can be triggered manually, in response to an abnormal condition (e.g.: an unhandled exception), or automatically after a configurable number of requests to keep memory creep at bay. By default, it stops the server from accepting connections, instructs the parent process to respawn, and gives existing connections a period of time to shut down, after which it automatically terminates the worker process. To help prevent accidental hosing of your servers, these shutdown periods can be randomized so that two workers started at roughly the same time are less likely to enter seppuku at the same time.

## Usage

```javascript

var restify = require('restify');
var seppuku = require('seppuku');

var server = restify.createServer();

server.use(seppuku(server, options));

// Go about your business. You're done!

```

## Options

Seppuku's functionality can be altered by passing a number of options, listed below together with their respective defaults:

```javascript
{
    minDeferralTime: 5000,      // Minimum time to wait between seppuku and kaishaku
    maxDeferralTime: 10000,     // Maximum time to wait between seppuku and kaishaku

    maxRequests: 0,             // Number of requests after which seppuku starts automatically (0 = never)

    trapExceptions: true,       // Whether exceptions should start seppuku

    filter: null,               // A filter function that determines the relative weight of a request
    
    kaishakunin: null,          // An optional function that replaces the default termination handler
    
    exitCode: 1                 // The code to pass to process.exit()
};
```

### Randomizing the termination time

When a seppuku operation starts, the default `kaishakunin` (“beheading”) method shuts down the server and instructs the worker to disconnect from the parent process (which should then automatically spawn a new worker). Before terminating the worker process, `kaishakunin()` (“beheader”) waits a variable amount of time to allow existing requests to be terminated gracefully, after which, if any requests are still open, it calls `process.exit(1)`.

The termination time is randomized in order to minimize the impact that multiple workers started on or around the same time could have if they entered a seppuku at the same time. You can provide a set of `minDeferralTime` and `maxDeferralTime` options to determine the randomization boundaries.

### Restarting automatically after a certain number of requests

Seppuku has the ability to restart automatically after a certain number of requests have been processed by the server. This can be helpful if you have a creeping memory leak that you cannot attend right away. You can set the `maxRequest` option to any arbitrary number, or to zero if you want to turn off this functionality altogether.

By default, seppuku increments the request counter by one every time a request is processed, regardless of its type. If you wish, you can specify a `filter` function that receives the current request alongside the current request count and can pass a different weight value depending on the type of request. For example, if you don't want `HEAD` and `OPTIONS` requests to be counted towards the request count, you could write this filter:

```javascript

var options = {
    maxRequests: 10000,
    filter: function(req, requestCount) {
        switch(req.method.toLowerCase()) {
            case 'head':
            case 'options':
            
            return 0;
        }
        
        return 1;
    }
}

seppuku(server, options);

```

### Writing a custom termination handler

The default termination handler performs the following:

1. Determine and set a timer for the termination time.
2. Emit the `seppuku` event on the server instance
3. Close the server
4. Disconnect the worker (this step is safely skipped if the process is not running in a cluster)
5. Terminate the process if the timer expires

Note that the timer itself is not retained; if all outstanding events (including existing requests) are resolved before the termination time, the process will terminate before the timer has expired.

If the default termination handler doesn't do everything you need, you have a couple of options. The first is to trap the `seppuku` event on the server object, which is emitted as soon as the seppuku process begins. It receives two parameters, the first the amount of time until the process will be terminated, and the second a cancellation callback (more about this later).

If you desire a completely custom termination process, you can pass your own `kaishakunin` method as an option—at which point you're completely on your own. Here's an example:

```javascript
server.on('seppuku', function(count, cancel) {
    // Terminate immediately
    process.exit(255);
});
```

## Initiating a seppuku operation manually

Simply call `server.seppuku()`, and all will be handled for you.

## Cancelling a seppuku operation

You can terminate a seppuku operation by trapping the `seppuku` event emitted by your server instance and calling the callback that the handler receives as its second parameter. This causes seppuku to be completely reset as if you were restarting the server.

```javascript
server.on('seppuku', function(count, cancel) {
    if (someCondition) {
        cancel();
    }
});
```

## Contributing

Contributions are welcome, particularly if accompanied by a unit test.

## License

Copyright © 2013 Marco Tabini & Associates, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
