var extend = require('extend');
var cluster = require('cluster');

var defaults = {
    minDeferralTime: 5000,      // Minimum time to wait between seppuku and kaishaku
    maxDeferralTime: 10000,     // Maximum time to wait between seppuku and kaishaku

    maxRequests: 0,             // Number of requests after which seppuku starts automatically (0 = never)

    trapExceptions: true,       // Whether exceptions should start seppuku

    filter: null,               // A filter function that determines the relative weight of a request
    
    kaishakunin: null,          // An optional function that replaces the default termination handler
    
    exitCode: 1                 // The code to pass to process.exit()
};

function seppuku(server, options) {
    var requestCount = 0;
    var timer = null;
    var inSeppuku = false;

    options = extend(defaults, options || {});
    
    function kashaku() {
        clearTimeout(timer);
        timer = null;
        requestCount = 0;
    }
    
    function kaishakunin() {
        if (inSeppuku) return;
        
        inSeppuku = true;
        
        if (options.kaishakunin) return options.kaishakunin();
        
        var timeToExit = Math.random(options.maxDeferralTime - options.minDeferralTime) + options.minDeferralTime;
        
        timer = setTimeout(function() {
            process.exit(options.exitCode);
        }, timeToExit);
        
        timer.unref();

        server.emit('seppuku', timeToExit, kashaku);
        
        if (!timer) return; // Cancelled
        
        server.close();
        
        if (cluster.worker) {
            cluster.worker.disconnect();
        }
    }
    
    if (options.trapExceptions) {
        process.on('uncaughtException', kaishakunin);
        server.on('uncaughtException', kaishakunin);
    }
    
    server.seppuku = kaishakunin;

    return function(req, res, next) {
        if (!options.maxRequests) return next();

        if (options.filter) {
            requestCount += filter(req, requestCount);
        } else {
            requestCount += 1;
        }
        
        if (requestCount >= options.maxRequests) {
            kaishakunin();
        }
        
        next();
    }
}

module.exports = seppuku;