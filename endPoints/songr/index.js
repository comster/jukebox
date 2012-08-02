//
// # Song Rating Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection || 'songr';
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var findQuery = function(query) {
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
                    if(query.hasOwnProperty('song_id')) {
                        query.song_id = new ObjectID(query.song_id);
                    }
                    // query mongo id's
                    if(query.hasOwnProperty('id')) {
                        query._id = new ObjectID(query.id);
                        delete query.id;
                    }
                }
                findQuery(query);
            }
            
        } else if(req.method == 'POST') {
            house.log.debug('post');
            console.log(path)
            console.log(req.fields)
            if(path == '' && req.session.data.user) {
                var roomStr = '';
                var newSongR = req.fields;
                newSongR.at = new Date();
                
                if(req.fields.hasOwnProperty('song_id')) {
                    if(req.fields.song_id && typeof req.fields.song_id == 'string') {
                        newSongR.song_id = new ObjectID(req.fields.song_id);
                    }
                }
                
                if(req.fields.hasOwnProperty('room_id')) {
                    if(typeof req.fields.room_id == 'string') {
                        roomStr = req.fields.room_id;
                        newSongR.room_id = new ObjectID(req.fields.room_id);
                    }
                }
                
                newSongR.user = {
                    id: req.session.data.user,
                    name: req.session.data.name
                }
                
                newSongR.score = parseInt(req.fields.score, 10);
                    
                ds.insert(col, newSongR, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        res.data(data);
                        house.ioChat.in(roomStr).emit('songr', data);
                    }
                });
            }
        } else if(req.method == 'PUT') {
            var query = {};
            if(docId) {
                var roomStr = '';
                query._id = docId;
            
                ds.update(col, query, req.fields, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        house.log.debug(data);
                        res.data({});
                        
                        ds.find(col, query, function(err, data){
                            if(err) {
                                house.log.err(err);
                            } else if(data) {
                                var roomStr = data[0].room_id;
                                house.ioChat.in(roomStr).emit('songr', data);
                            } else {
                                house.log.err(new Error('no data from mongo'));
                            }
                        });
                    }
                });
            }
        } else if(req.method == 'DELETE') {
            var query = {};
            if(docId) {
                query._id = docId;
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

