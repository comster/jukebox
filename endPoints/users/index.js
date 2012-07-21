//
// # Users Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    
    var ds = options.ds;
    var col = options.collection;
    
    var handleReq = function(req, res, next) {
        var path = req.url;
        
        var findQuery = function(query) {
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    for(var i in data) {
                        delete data[i].pass;
                        
                        if(req.session.data.user && data[i].id.toString() == req.session.data.user.toString()) {
                            //console.log('your own record')
                        } else {
                            data[i] = {
                                id: data[i].id,
                                name: data[i].name
                            }
                        }
                    }
                    res.data(data);
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        var docId;
        
        if(path.length > 1 && path.indexOf('/') === 0) {
            var docId = path.substr(1);
            docId = new ObjectID(docId);
        }
        
        if(req.method == 'GET') {
            var query = {};
            
            if(docId) {
                query._id = docId;
                findQuery(query);
            } else {
                if(req.query) {
                    query = req.query;
                    
                    // query mongo id's
                    if(query.hasOwnProperty('id')) {
                        query._id = new ObjectID(query.id);
                        delete query.id;
                    }
                }
                findQuery(query);
            }
            
        } else if(req.method == 'POST') {
            
        } else if(req.method == 'PUT') {
            var query = {};
            if(docId) {
                
                // must be a user
                if(!req.session.data.user) return;
                
                // you can only update your own document
                query._id = req.session.data.user;
            
                ds.update(col, query, req.fields, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        house.log.debug(data);
                        res.data({});
                    }
                });
            }
        } else if(req.method == 'DELETE') {
            var query = {};
            if(docId) {
                if(!req.session.data.user) return;
                
                // you can only delete your own document
                query._id = req.session.data.user;
                
                ds.remove(col, query, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        res.data(data);
                    }
                });
                
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});
