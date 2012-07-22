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
    
    var io = house.io.of('/socket.io/chat');
    io.authorization(function (data, accept) {
        accept(null, true);
    });
    io.on('connection', function (socket) {
        house.log.debug('user connected to io chat');
        
        socket.on('song', function(data) {
            console.log('song via socket!!!!!!!!!!');
            console.log(socket.handshake.session)
            console.log(arguments);
            if(socket.handshake.session.hasOwnProperty('user')) {
                var song = data.song;
                var roomId = data.roomId;
                io.in(roomId).emit('song', song);
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
        var path = req.url;
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
                
                if(req.fields.msg) {
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

