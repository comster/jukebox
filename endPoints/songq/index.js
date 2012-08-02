//
// # Song Q Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    
    var getRoomIdMaxRank = function(roomId, callback) {
        ds.find(col, {room_id: roomId, limit: 1, sort: 'rank-'}, function(err, data){
            if(err) {
                callback(1);
            } else if(data) {
                console.log('getMaxRank')
                console.log(data)
                if(_.isArray(data)) {
                    data = data[0];
                    if(data && data.rank) {
                        callback(data.rank);
                    } else {
                        callback(1);
                    }
                } else {
                    callback(1);
                }
            } else {
                callback(1);
            }
        });
    }
    
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
                    if(query.hasOwnProperty('room_id')) {
                        query.room_id = new ObjectID(query.room_id);
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
                var newSongQ = req.fields;
                newSongQ.at = new Date();
                
                if(req.fields.hasOwnProperty('song')) {
                    if(req.fields.song.id && typeof req.fields.song.id == 'string') {
                        req.fields.song.id = new ObjectID(req.fields.song.id);
                    }
                }
                
                if(req.fields.hasOwnProperty('room_id')) {
                    if(typeof req.fields.room_id == 'string') {
                        roomStr = req.fields.room_id;
                        req.fields.room_id = new ObjectID(req.fields.room_id);
                    }
                }
                
                newSongQ.dj = {
                    id: req.session.data.user,
                    name: req.session.data.name
                }
                newSongQ.rank = getRoomIdMaxRank(req.fields.room_id, function(maxRank){
                    newSongQ.rank = maxRank+1;
                    
                    ds.insert(col, newSongQ, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            res.data(data);
                            house.ioChat.in(roomStr).emit(col, data);
                        }
                    });
                });
            }
        } else if(req.method == 'PUT') {
            var query = {};
            if(docId) {
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
                                house.ioChat.in(roomStr).emit(col, data);
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
                
                ds.find(col, query, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else if(data) {
                        
                        ds.remove(col, query, function(err, removedata){
                            if(err) {
                                house.log.err(err);
                                res.end('error');
                            } else {
                                res.data(data);
                                var roomStr = data[0].room_id;
                                console.log(roomStr);
                                house.ioChat.in(roomStr).emit(col, {deleted_id:data[0].id});
                            }
                        });
                    } else {
                        house.log.err(new Error('no data from mongo'));
                    }
                });
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});

