'use strict';

var restify = require('restify');
var request = require('request');
var async = require('async');
var expect = require('chai').expect;
var fs = require('fs');

var seppuku = require('../lib');

describe('Seppuku', function() {
  
    var port = 5000;
  
    function setupServer(options, cb) {
        var server = restify.createServer();
        
        server.use(seppuku(server, options));
        
        server.get('/hello', function(req, res, next) {
            res.send('howdy');
            next();
        });
        
        server.get('/except', function(req, res, next) {
            throw new Error('error!');
        });
        
        server.listen(port, function() {
            cb(server, port++);
        });
    };
    
    it('should not interfere with the operation of the server', function(done) {
        setupServer(null, function(server, port) {
            async.each(
                ['','','','',''],
                
                function(item, callback) {
                    request('http://localhost:' + port + '/hello', callback);
                },
                
                function() {
                    done();
                }
            )
        });
    });
    
    it('should allow canceling an imminent termination', function(done) {
        var options = {
            maxRequests: 3
        };
        
        setupServer(options, function(server, port) {
            server.on('seppuku', function(count, cancel) {
                cancel();
                done();
            });
            
            async.each(
                ['','','',''],
                
                function(item, callback) {
                    request('http://localhost:' + port + '/hello', callback);
                }
            );
        });
    });
    
    it('should allow providing your own kaishakunin function', function(done) {
        var options = {
            minDeferralTime: 100,
            maxDeferralTime: 100,
            
            maxRequests: 3,
            
            kaishakunin: function() {
                done();
            }
        };
        
        setupServer(options, function(server, port) {
            async.each(
                ['','','',''],
                
                function(item, callback) {
                    request('http://localhost:' + port + '/hello', callback);
                }
            );
        });
    });
    
    it('should successfully trap exceptions', function(done) {
        var options = {
            minDeferralTime: 100,
            maxDeferralTime: 100,
            
            maxRequests: 3,
            
            kaishakunin: function() {
                done();
            }
        };
        
        setupServer(options, function(server, port) {
            request('http://localhost:' + port + '/except');
        });
    });
    
    it('should allow filtering of requests', function(done) {
        var options = {
            maxRequests: 3,
            
            filter: function() {
                return 3;
            },
            
            kaishakunin: function() {
                done();
            }
        };
        
        setupServer(options, function(server, port) {
            request('http://localhost:' + port + '/hello');
        });
    });
    
    it('should allow invoking seppuku on demand', function(done) {
        var options = {
            maxRequests: 3,
            
            filter: function() {
                return 3;
            },
            
            kaishakunin: function() {
                done();
            }
        };
        
        setupServer(options, function(server, port) {
            server.seppuku();
        });
    });
});