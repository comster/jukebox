//
// # Authentication API Endpoint
//

var ObjectID = mongo.ObjectID;
var crypto = require('crypto');

(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    
    // SHA512 password hashing
    var hashPass = function(pass) {
        var passHash = crypto.createHash('sha512');
        passHash.update(pass);
        return passHash.digest('hex');
    }
    
    // Request handler for auth endpoint
    var handleReq = function(req, res, next) {
        
        // Request path sans the matched endpoint
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        house.log.debug('auth req url: '+path);
        
        // Helper method to query users collection with a query and respond with the results
        var findUser = function(query) {
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    res.data(data);
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        // Helper method to query for a user id and respond with the results
        var findUserId = function(id) {
            var query = {
                id: new ObjectID(id)
            }
            findUser(query);
        }
        var getSessionConfig = function() {
            return {
                socketPort: house.config.socketPort || house.config.webPort
            };
        }
        // Handle GET requests for session data / status
        if(req.method == 'GET') {
            var query = {};
            req.session.data.config = getSessionConfig();
            if(path === '' || path === '/') {
                res.data(req.session.data);
            } else {
            }
            
        // Handle POST requests as login/registration attempt
        } else if(req.method == 'POST') {
            house.log.debug('post');
            if(path == '') {
                
                if(req.fields.hasOwnProperty('name') && req.fields.hasOwnProperty('pass')) {
                    var name = req.fields.name.toLowerCase();
                    var pass = hashPass(req.fields.pass);
                    
                    ds.find(col, {name: name, pass: pass}, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                            return;
                        }
                        if(data.length === 0) {
                            
                            // See if there is already an account with this user name
                            ds.find(col, {name: name}, function(err, data) {
                                if(err) {
                                    house.log.err(err);
                                    res.end('error');
                                
                                // If there isn't a user, let's make one with the given credentials
                                } else if(data.length === 0) {
                                    
                                    // Register this as a new user account
                                    ds.insert(col, {name: name, pass: pass}, function(err, data){
                                        if(err) {
                                            house.log.err(err);
                                            res.end('error');
                                        } else {
                                            var userData = data;
                                            if(_.isArray(data)) {
                                                userData = _(data).first();
                                            }
                                            
                                            // Authorize the new user to this request session
                                            req.authorizeUser(userData, function(){
                                                res.data(userData);
                                            });
                                        }
                                    });
                                    
                                // Incorrect password for user
                                } else {
                                    // Respond with 403!  http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.1
                                    res.writeHead(403);
                                    res.end('{}');
                                }
                            });
                        } else {
                            var userData = data;
                            if(_.isArray(data)) {
                                userData = _(data).first();
                            }
                            
                            // Authorize the existing user to this request session
                            req.authorizeUser(userData, function(){
                                res.data(userData);
                            });
                        }
                    });
                }
            }
            
        // Handle PUT to update the session for this requset session
        } else if(req.method == 'PUT') {
            
        // Handle DELETE requests to destroy the session for this request
        } else if(req.method == 'DELETE') {
            req.destroySession(function(){
                res.data({});
            });
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    
    return handleReq;
});

