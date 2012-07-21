//
// # Authentication API Endpoint
//

var ObjectID = mongo.ObjectID;
var crypto = require('crypto');
var OAuth = require('oauth').OAuth;

(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    
    var hashPass = function(pass) {
        var passHash = crypto.createHash('sha512');
        passHash.update(pass);
        return passHash.digest('hex');
    }
    
    var handleReq = function(req, res, next) {
        var path = req.url;
        
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
        var findUserId = function(id) {
            var query = {
                id: new ObjectID(id)
            }
            findUser(query);
        }
        
        if(req.method == 'GET') {
            var query = {};
            
            if(path === '' || path === '/') {
                res.data(req.session.data);
            } else if(path.indexOf('/twitter') === 0) {
                var oa = getTwitterOAuth();
                var parsedUrl = req.urlParsed;
                if( parsedUrl.query && parsedUrl.query.oauth_token && req.session.data.auth["twitter_oauth_token_secret"] ) {
                  oa.getOAuthAccessToken(parsedUrl.query.oauth_token, req.session.data.auth["twitter_oauth_token_secret"],
                     function( error, oauth_token, oauth_token_secret, additionalParameters ) {
                       if( error ) {
                		house.log.err(error);
                		//resObj['error'] = error.Message;
                		//writeJsonResponse(res, resObj, jsoncallback);
                	 } else {
                         house.log.debug('additionalParameters');
                		 house.log.debug(additionalParameters);
                         req.session.data.auth["twitter_oauth_token_secret"]= oauth_token_secret;
                         req.session.data.auth["twitter_oauth_token"]= oauth_token;
                         
                         var redirectTwitterUrl = function() {
                              res.writeHead(302, {'Location': req.session.data['twitter_redirect_url']});
                              res.end();
                         }
                         
                        var twitterUser = { 
                		  uid: additionalParameters.user_id,
                		  name: additionalParameters.screen_name,
                              token: oauth_token,
                              secret: oauth_token_secret
                        }
                        var twitterAvatar = 'https://api.twitter.com/1/users/profile_image?screen_name='+additionalParameters.screen_name+'&size=original';
                        
                        var updatedObject = {"$set": {"twitterSession": twitterUser, 'avatar': twitterAvatar}}
                          
                		req.session.data.auth.twitter = twitterUser;
                		
                		// lookup to see if you 've connected before
                		var query = {"twitterSession.uid": additionalParameters.user_id};
                
                        ds.find(col, query, function(err, data){
                            if(err) {
                                house.log.err(err);
                            } else if(data) {
                                
                                if(data.length === 0) {
                                
                                	// Offer to login, or register
                                	if(req.session.data.user) {
                                		// already logged in, lets connect to twitter
                                		house.log.info('connect logged in user to twitter: '+req.session.data.user)
                                		
                                		ds.update(col, {"name": req.session.data.user}, updatedObject, function(err, docs) {
                            				if(err) {
                                                house.log.err(err);
                            				} else {
                            					house.log.debug(docs);
                            				}
                                            redirectTwitterUrl();
                                		});
                                	} else {
                                         
                                        ds.insert(col, {"name":'@'+twitterUser.name, "groups":[], "twitterSession": twitterUser, 'avatar': twitterAvatar}, function(err, user){
                                            if(err) {
                                                house.log.err(err);
                                                res.end('error');
                                            } else {
                                                if(_.isArray(user)) {
                                                    user = _(user).first();
                                                }
                                                house.log.debug('new twitter user reg')
                                                house.log.debug(user);
                                                req.authorizeUser(user, function(){
                                                    redirectTwitterUrl();
                                                });
                                            }
                                        });
                                	}
                                } else {
                                  var user = data;
                                  house.log.debug(user);
                                  house.log.debug('found twitter user with document')
                                  house.log.debug({"_id": user._id})
                                  house.log.debug(updatedObject)
                                    ds.update(col, {"_id": user._id}, updatedObject, function(err, docs) {
                                        if(err) house.log.err(err);
                                    });
                                  // login user
                                    req.authorizeUser(user, function(){
                                        redirectTwitterUrl();
                                    });
                                }
                                
                            } else {
                                house.log.err(new Error('no data from mongo'));
                            }
                        });
                       }
                     });
                } else {
                  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, oauth_authorize_url, additionalParameters ) {
                    if(error) {
                      house.log.err(error);
                    } else {
                        req.session.data.auth = {
            				"twitter_oauth_token_secret": oauth_token_secret
            				, "twitter_oauth_token": oauth_token
            			};
            			req.session.data['twitter_redirect_url'] = req.headers.referer;
                 	   res.writeHead(302, {'Location': "http://twitter.com/oauth/authenticate?oauth_token=" + oauth_token});
              		  res.end();
             		}
                  });
                }
            }
            
            
        } else if(req.method == 'POST') {
            house.log.debug('post');
            if(path == '') {
                
                if(req.fields.hasOwnProperty('name') && req.fields.hasOwnProperty('pass')) {
                    var name = req.fields.name;
                    var pass = hashPass(req.fields.pass);
                    
                    ds.find(col, {name: name, pass: pass}, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                            return;
                        }
                        if(data.length === 0) {
                            ds.find(col, {name: name}, function(err, data) {
                                if(err) {
                                    house.log.err(err);
                                    res.end('error');
                                } else if(data.length === 0) {
                                    ds.insert(col, {name: name, pass: pass}, function(err, data){
                                        if(err) {
                                            house.log.err(err);
                                            res.end('error');
                                        } else {
                                            var userData = data;
                                            if(_.isArray(data)) {
                                                userData = _(data).first();
                                            }
                                            req.authorizeUser(userData, function(){
                                                res.data(userData);
                                            });
                                        }
                                    });
                                } else {
                                    // incorrect password for user
                                    res.writeHead(403);
                                    res.end('{}');
                                }
                            });
                        } else {
                            var userData = data;
                            if(_.isArray(data)) {
                                userData = _(data).first();
                            }
                            req.authorizeUser(userData, function(){
                                res.data(userData);
                            });
                        }
                    });
                }
                
                
            }
        } else if(req.method == 'PUT') {
            
        } else if(req.method == 'DELETE') {
            req.destroySession(function(){
                res.data({});
            });
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    
    var getTwitterOAuth = function() {
        var oa = new OAuth(options.twitter.urls.requestToken, options.twitter.urls.accessToken,
            options.twitter.key, options.twitter.secret,
            "1.0A", options.twitter.urls.endPoint, "HMAC-SHA1");
        return oa;
    }
    
    return handleReq;
});

