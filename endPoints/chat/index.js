//
// # Authentication API Endpoint
//

var ObjectID = mongo.ObjectID;

(exports = module.exports = function(house, options){
    // This endpoint requires a data source
    var ds = options.ds;
    var colRooms = options.roomsCollection;
    var colMsgs = options.messagesCollection;
    
    var roomUsers = {};
    var timeouts = {};
    var songplaying = {};
    
    var io = house.io.of('/socket.io/chat');
    io.authorization(function (data, accept) {
        console.log('socket auth');
        accept(null, true);
    });
    io.on('connection', function (socket) {
        house.log.debug('user connected to io chat');
        
        // Ask for the room status!
        socket.on('info', function(room_id, callback) {
            console.log('socket.on info');
            console.log(typeof room_id);
            console.log(room_id);
            var roomInfo = {
            };
            if(roomUsers.hasOwnProperty(room_id)) {
                roomInfo.users = roomUsers[room_id];
            }
            house.log.debug(songplaying);
            if(songplaying.hasOwnProperty(room_id)) {
                roomInfo.song = songplaying[room_id];
            }
            console.log('roomInfo');
            console.log(roomInfo);
            callback(roomInfo);
        });
        
        // Ask everyone to play this song!
        /*
        socket.on('song', function(data) {
            console.log('song via socket!!!!!!!!!!');
            console.log(socket.handshake.session)
            console.log(arguments);
            if(socket.handshake.session.hasOwnProperty('user')) {
                var song = data.song;
                var roomId = data.roomId;
                io.in(roomId).emit('song', song);
            }
        });*/
        
        var getCurrentlyPlaying = function(roomId, callback) {
            ds.find('songq', {room_id:roomId, pAt: {$exists: true}}, function(err, data) {
                callback(data);
            });
        }
        
        // get the next songq
        var getTopofQueue = function(roomId, callback) {
            ds.find('songq', {room_id:roomId, pAt: {$exists: false}}, function(err, data) {
                console.log(arguments);
                if(callback) callback(data);
            });
        }
        
        // set the songq as playing
        var putPlaying = function(songq, callback) {
            console.log('putPlaying')
            console.log(songq)
            ds.update('songq', {"_id":songq.id}, {"$set": {pAt: new Date()}}, function(err, data){
                console.log(arguments);
                console.log('playing song----------');
                songplaying[songq.room_id.toString()] = songq.song;
                songplaying[songq.room_id.toString()].pAt = new Date();
                house.log.debug(songplaying);
                if(callback) callback(data);
            });
        }
        
        var pushSongqToP = function(songq, callback) {
            songq.qAt = songq.at;
            songq.at = new Date();
            delete songq.id;
            console.log(songq);
            ds.insert('songp', songq, function(data){
                
                // increment the song playCount
                console.log(songq.song);
                ds.update('songs', {_id:songq.song.id}, {"$inc":{"playCount": 1}}, function(err, data){
                });
                
                if(callback) callback(data);
            });
        }
        
        var removeSongq = function(songqId, callback) {
            console.log('remove songq')
            console.log(songqId);
            ds.remove('songq', {"_id": songqId}, function(){
                console.log('removed songq');
                if(callback) callback();
            });
        }
        
        var advanceRoomSongQ = function(roomId) {
            // grab oldest "at" with room_id from q
            getCurrentlyPlaying(roomId, function(playingSongq){
                console.log('getCurrentlyPlaying');
                console.log(playingSongq);
                if(playingSongq.length > 0) {
                    playingSongq = _.first(playingSongq);
                    console.log(playingSongq);
                    // remove from songq
                    removeSongq(playingSongq.id);
                    // add to songp
                    pushSongqToP(playingSongq);
                } else {
                    
                }
                
                // get top of songq
                getTopofQueue(roomId, function(songq){
                    if(songq.length > 0) {
                        songq = _.first(songq);
                        // set it to playing
                        putPlaying(songq);
                        
                        // set timeout to advance to next song automattically
                        if(songq.song.duration) {
                            console.log('song q duration '+songq.song.duration);
                            
                            var preloadTime = 10 * 1000;
                            var loadNextSongIn = (songq.song.duration * 1000) - preloadTime;
                            
                            timeouts[roomId] = setTimeout(function(){
                                getTopofQueue(roomId, function(songq){
                                    if(songq.length > 0) {
                                        songq = _.first(songq);
                                    
                                        //io.in(roomId).emit('loadSong', songq.song); // no advantage here?
                                        console.log('preload song q!!!!!!!!!!!!');
                                    
                                        timeouts[roomId] = setTimeout(function(){
                                            console.log('advance song q!!!!!!!!!!!!');
                                            advanceRoomSongQ(roomId);
                                        }, preloadTime);
                                    }
                                });
                            }, loadNextSongIn);
                        }
                        
                        console.log('~~~~~~~~~~emit play song')
                        console.log(songq.song.filename);
                        // emit to room to play song
                        io.in(roomId).emit('song', '/api/files/'+songq.song.filename);
                    }
                });
            });
        }
        
        // Skip current song in room
        socket.on('skip', function(data) {
            console.log('skip song !!!!!!!!!!');
            console.log(socket.handshake.session)
            if(socket.handshake.session.hasOwnProperty('user')) {
                var roomId = data.room_id;
                roomId = new ObjectID(roomId)
                
                if(timeouts.hasOwnProperty(roomId)) {
                    clearTimeout(timeouts[roomId]); 
                }
                
                advanceRoomSongQ(roomId)
            }
        });
        
        socket.on('join', function(roomId) {
            
            if(!roomUsers.hasOwnProperty(roomId)) {
                roomUsers[roomId] = {};
            }
            roomUsers[roomId][socket.handshake.session.id] = {
                name: socket.handshake.session.name,
                id: socket.handshake.session.id
            }
            if(socket.handshake.session.avatar) {
                roomUsers[roomId][socket.handshake.session.id].avatar = socket.handshake.session.avatar;
            }
            
            socket.join(roomId);
            house.log.info('join to io.chat');
            io.in(roomId).emit('entered', {room_id: roomId, user: roomUsers[roomId][socket.handshake.session.id]});
            
            socket.on('disconnect', function () {
              house.log.info('user disconnected from io.chat');
              io.in(roomId).emit('exited', {room_id: roomId, user: roomUsers[roomId][socket.handshake.session.id]});
              socket.leave(roomId);
              delete roomUsers[roomId][socket.handshake.session.id];
            });
        });
    });
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        var docId;
        var postfix;
        
        if(path.length > 1 && path.indexOf('/') === 0) {
            var docId = path.substr(1);
            var docii = docId.indexOf('/');
            if(docii !== -1) {
                postfix = docId.substr(docii+1);
                docId = docId.substr(0, docii);
            }
            docId = new ObjectID(docId);
        }
        if(req.method == 'GET') {
            var query = {};
            if(!docId) {
                
                // Room List
                ds.find(colRooms, {}, function(err, data) {
                   res.data(data);
                });
                
            } else {
                if(postfix && postfix == 'users') {
                    // Room users
                    var o = [];
                    for(var i in roomUsers[docId]) {
                        o.push(roomUsers[docId][i]);
                    }
                    res.data(o);
                } else {
                    // Room Messages
                    ds.find(colMsgs, {room_id:docId}, function(err, data) {
                        res.data(data);
                    });
                }
            }
            
        } else if(req.method == 'POST') {
            house.log.debug('post');
            
            var getAuthorDocFromSession = function() {
                var u = {
                    name: req.session.data.name
                };
                if(req.session.data.user) {
                    u.id = req.session.data.user;
                }
                return u;
            }
            
            if(!docId) {
                
                // New Room
                ds.insert(colRooms, {name: req.fields.name, user: getAuthorDocFromSession()}, function(err, data) {
                   res.data(data);
                });
                
            } else {
                
                if(req.fields && req.fields.msg) {
                    // New Message to Room
                    ds.insert(colMsgs, {room_id: docId, msg: req.fields.msg, user: getAuthorDocFromSession(), at: new Date()}, function(err, data) {
                        res.data(data);
                        io.in(docId).emit('message', data);
                    });
                }
            }
            
        } else if(req.method == 'PUT') {
        } else if(req.method == 'DELETE') {
        } else if(req.method == 'OPTIONS') {
        }
    }
    
    return handleReq;
});

