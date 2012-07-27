//
//
//
//
//
//

(function(){
    var chat = this;
    
    chat.apiUrl = houseApi+'/chat';
    
    chat.UserModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var viewType = 'UserName';
            if(options && options.hasOwnProperty('viewType')) {
                viewType = options.viewType;
            }
            if(!this.hasOwnProperty(viewType)) {
                if(!options) options = {};
                options.model = this;
                this[viewType] = new chat[viewType](options);
            }
            return this[viewType];
        }
    });
    
    chat.RoomModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var roomView = 'RoomName';
            if(options && options.hasOwnProperty('roomView')) {
                roomView = options.roomView;
            }
            if(!this.hasOwnProperty(roomView)) {
                if(!options) options = {};
                options.model = this;
                this[roomView] = new chat[roomView](options);
            }
            return this[roomView];
        }
    });
    
    chat.MessageModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var viewType = 'MessageView';
            if(options && options.hasOwnProperty('viewType')) {
                viewType = options.viewType;
            }
            if(!this.hasOwnProperty(viewType)) {
                if(!options) options = {};
                options.model = this;
                this[viewType] = new chat[viewType](options);
            }
            return this[viewType];
        }
    });

    chat.UserCollection = Backbone.Collection.extend({
        model: chat.UserModel,
        url: chat.apiUrl,
        initialize: function(docs, options) {
            var self = this;
            this.url = this.url + '/' + options.roomId + '/users';
        }, load: function(callback) {
            var self = this;
            this.reset();
            var fo = {add:true};
            if(callback) fo.success = callback;
            this.fetch(fo);
        }, comparator: function(a,b) {
            return a.get('name') > b.get('name');
        }
    });
    chat.RoomCollection = Backbone.Collection.extend({
        model: chat.RoomModel,
        url: chat.apiUrl,
        initialize: function() {
            
        }, load: function(callback) {
            var self = this;
            this.reset();
            var fo = {add:true};
            if(callback) fo.success = callback;
            this.fetch(fo);
        }
    });
    chat.MessageCollection = Backbone.Collection.extend({
        model: chat.MessageModel,
        url: chat.apiUrl,
        initialize: function(docs, options) {
            var self = this;
            this.url = this.url + '/' + options.roomId;
        }, load: function(callback) {
            var self = this;
            this.reset();
            this.fetch({add:true, success:callback});
        }, comparator: function(a,b) {
            return a.get('at') > b.get('at');
        }
    });
    
    chat.UserListView = Backbone.View.extend({
        tag: 'div',
        className: 'userList',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.$ul = $('<ul class="users"></ul>');
            var self = this;
            this.collection.on('add', function(doc, col) {
                var $li = $('<li></li>');
                var view = doc.getView();
                $li.append(view.render().el);
                $li.attr('data-id', doc.get('id'));
                self.$ul.append($li);
                
                doc.on('remove', function(){
                    $li.remove();
                    return false;
                });
            });
        },
        events: {
            "click li": "selectLi"
        },
        selectLi: function(el) {
            var room = this.collection.get($(el.target).attr('data-id'));
            this.trigger('select', room);
        }
    });
    
    chat.MessageListView = Backbone.View.extend({
        tag: 'div',
        className: 'messageList',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.$ul = $('<ul class="messages"></ul>');
            var self = this;
            this.collection.on('add', function(doc, col) {
                var $li = $('<li></li>');
                $li.append(doc.getView().render().el);
                $li.attr('data-id', doc.get('id'));
                self.$ul.prepend($li);
            });
        },
        events: {
            "click li": "selectLi"
        },
        selectLi: function(el) {
            var room = this.collection.get($(el.target).attr('data-id'));
            this.trigger('select', room);
        }
    });
    
    chat.RoomNewFormView = Backbone.View.extend({
        tag: 'div',
        className: 'roomForm',
        render: function() {
            this.$el.html('<form><input type="text" name="name" placeholder="enter a room name" /><input type="submit" value="Make a Room" /></form>');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.model = new chat.RoomModel({}, {collection: this.collection});
            this.model.on("change", function(model, options){
                var s = model.save(null, {silent: true, wait: true})
                .done(function(s, typeStr, respStr) {
                    self.trigger('saved', self.model);
                    self.clear();
                    self.collection.add(self.model);
                })
            });
        },
        events: {
            "submit": "submit"
        },
        submit: function(el) {
            console.log(this.model)
            this.model.set({name: this.$el.find('input[name="name"]').val()}, {wait: true});
            
            return false;
        },
        clear: function() {
            this.$el.find('input[name="name"]').val('');
        },
        focus: function() {
            this.$el.find('input').first().focus();
        }
    });
    
    chat.MessageFormView = Backbone.View.extend({
        tag: 'div',
        className: 'messageForm',
        render: function() {
            this.$el.html('<form data-room-id="'+this.options.roomId+'"><input type="text" name="msg" placeholder="enter a message" autocomplete="off" /><input type="submit" value="Send" /></form>');
            this.$msg = this.$el.find('input[name="msg"]');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
            "submit": "submit"
        },
        submit: function(el) {
            var self = this;
            var m = new chat.MessageModel({}, {collection: this.collection});
            m.set({msg: this.$msg.val()});
            var s = m.save(null, {silent: true, wait: true})
                .done(function(){
                    self.trigger('saved', m);
                    self.collection.add(m);
                });
            self.clear(); // clear as soon as we save, not waiting for the response
            
            if (window.webkitNotifications) {
                if (window.webkitNotifications.checkPermission() == 0) { // 0 is PERMISSION_ALLOWED
                } else {
                    window.webkitNotifications.requestPermission();
                }
            }
            
            return false;
        },
        clear: function() {
            this.$msg.val('');
            this.render();
            this.focus();
        },
        focus: function() {
            this.$msg.focus();
        }
    });
    
    chat.RoomListView = Backbone.View.extend({
        tag: 'div',
        className: 'roomList',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.$ul = $('<ul class="rooms"></ul>');
            var self = this;
            this.collection.on('add', function(doc, col) {
                var $li = $('<li></li>');
                $li.append(doc.getView(self.options.roomView).render().el);
                $li.attr('data-id', doc.get('id'));
                self.$ul.append($li);
            });
        },
        events: {
            "click li": "selectLi"
        },
        selectLi: function(el) {
            console.log(el);
            var room = this.collection.get($(el.target).attr('data-id'));
            $(el.target).parent().attr('selected', true);
            $(el.target).parent().siblings().removeAttr('selected');
            this.trigger('select', room);
        }
    });
    
    chat.RoomName = Backbone.View.extend({
        tag: 'span',
        className: 'room',
        render: function() {
            this.$el.html(this.model.get('name'));
            this.$el.attr('data-id', this.model.get('id'));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
        }
    });
    
    chat.UserName = Backbone.View.extend({
        tag: 'span',
        className: 'user',
        render: function() {
            this.$el.html(this.model.get('name'));
            this.$el.attr('data-id', this.model.get('id'));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
        }
    });
    
    chat.RoomView = Backbone.View.extend({
        tag: 'div',
        className: 'chatroom',
        render: function() {
            this.$el.html('');
            this.$el.attr('data-id', this.model.get('id'));
            this.setElement(this.$el);
            
            this.$el.append(this.userListView.render().el);
            this.$el.append(this.messageFormView.render().el);
            this.$el.append(this.messageListView.render().el);
            
            return this;
        },
        initialize: function() {
            var self = this;
            var docs, users;
            
            if(this.model.has('messages')) {
                console.log(this.model.get('messages'));
                docs = this.model.get('messages');
            }
            if(this.model.has('users')) {
                console.log(this.model.get('users'));
                users = this.model.get('users');
            }
            this.messageCollection = new chat.MessageCollection(docs, {roomId: this.model.get('id')});
            this.messageListView = new chat.MessageListView({collection: this.messageCollection});
            this.messageFormView = new chat.MessageFormView({collection: this.messageCollection, roomId: this.model.get('id')});
            
            this.userCollection = new chat.UserCollection(users, {roomId: this.model.get('id')});
            this.userListView = new chat.UserListView({collection: this.userCollection});
            this.userCollection.load();
            this.messageCollection.load(function(){
                self.messageCollection.on('add', function(doc){
                    chat.notify({title: doc.get('user').name, msg: doc.get('msg'), img: ''});
                });
            });
        },
        events: {
        }
    });
    
    chat.MessageView = Backbone.View.extend({
        tag: 'span',
        className: 'msg',
        render: function() {
            this.$el.html(this.model.get('msg'));
            this.$el.prepend('<span data-id="'+this.model.get('user').id+'" class="user">'+this.model.get('user').name+'</span> ');
            //this.$el.append('<span class="at" title="'+this.model.get('at')+'">'+moment(this.model.get('at')).fromNow()+'</span>');
            this.$el.attr('data-id', this.model.get('id'));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
        }
    });
    
    chat.AppView = Backbone.View.extend({
        render: function() {
            //this.$el.html('');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            self.roomsOpenView = new chat.RoomsOpenView();
            this.$el.append(this.roomsOpenView.render().el);
        },
        events: {
        }
    });
    
    chat.notify = function(options) {
        if (window.webkitNotifications) {
            var notification = window.webkitNotifications.createNotification(options.img, options.title, options.msg);
            //return window.webkitNotifications.createHTMLNotification('http://someurl.com');
            notification.show();
            setTimeout(function(){
                notification.cancel();
            }, 5500);
            return notification;
        }
    }
    
    chat.RoomsOpenView = Backbone.View.extend({
        tag: 'div',
        className: 'roomsOpen',
        render: function() {
            if(!this.initialized) {
                this.on('initialized', this.render);
                return this;
            }
            this.$el.html('');
            
            this.$el.append(this.roomsFindOrCreateView.render().el);
            
            this.$el.append(this.roomsOpenListView.render().el);
            
            this.$el.append(this.$chatFrame);
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.initialized = false;
            var self = this;
            
            self.rooms = {};
            this.$chatFrame = $('<div id="chats"></div>');
            self.openFrames = {};
            
            this.collection = new chat.RoomCollection();
            
            this.roomsOpenListView = new chat.RoomListView({collection: this.collection})
            .on('select', function(room) {
                if(!room) return;
                self.selectedRoom = room.get('id');
                var $r;
                if(self.openFrames.hasOwnProperty(room.get('id'))) {
                    $r = self.openFrames[room.get('id')];
                } else {
                    var roomview = room.getView({roomView: 'RoomView'});
                    self.rooms[room.get('id')] = roomview;
                    $r = self.openFrames[room.get('id')] = roomview.render().$el;
                    self.$chatFrame.append($r);
                }
                $r.siblings().hide().removeAttr('selected');
                $r.show();
                $r.attr('selected', true);
            });
            
            require(['/socket.io/socket.io.js'], function() {
                var socket = self.io = io.connect(window.location.origin+'/socket.io/chat');
                socket.on('connect', function(data) {
                });
                socket.on('message', function (data) {
                    self.rooms[data.room_id].messageCollection.add(data);
                });
                
                socket.on('entered', function (data) {
                    self.rooms[data.room_id].userCollection.add(data.user);
                });
                socket.on('exited', function (data) {
                    console.log(data);
                    if(data.user) {
                        var u = self.rooms[data.room_id].userCollection.get(data.user.id);
                        if(u) u.trigger('remove');
                        self.rooms[data.room_id].userCollection.remove(data.user.id);
                    }
                });
                self.roomsFindOrCreateView = new chat.RoomsFindOrCreateView();
                self.roomsFindOrCreateView.on('room', function(room){
                    self.openRoom(room);
                    self.roomsOpenListView.trigger('select', room);
                });
                
                window.socketSong = function(filename, song) {
                    socket.emit('song', {roomId: filename, song: song});
                }
                window.chatSocket = socket;
                
                socket.on('song', function (filename) {
                    console.log('socket song '+filename)
                    window.mediaPlayer.loadSong(filename)
                });
                
                self.initialized = true;
                self.trigger('initialized');
            });
        },
        events: {
        },
        openRoom: function(room) {
            if(room) {
                this.collection.add(room.clone());
                
                if(this.io) {
                    this.io.emit('join', room.get('id'));
                } 
            }
        }
    });
    
    chat.RoomsFindOrCreateView = Backbone.View.extend({
        tag: 'div',
        className: 'roomsFindOrCreate',
        render: function() {
            this.$el.html('<button class="open">⚛</button>');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.collection = new chat.RoomCollection();
            this.roomsFindListView = new chat.RoomListView({collection: this.collection});
            this.roomNewFormView = new chat.RoomNewFormView({collection: this.collection});
            this.collection.load(function(){
                console.log(self.collection.first());
                self.trigger('room', self.collection.first());
            });
            this.roomsFindListView.on('select', function(room){
                // navigate to room
                self.trigger('room', room);
                
                self.$lightBox.remove();
            });
        },
        events: {
            "click .open": "open"
        },
        open: function() {
            var $e = $('<div></div>');
            $e.append(this.roomsFindListView.render().el);
            $e.append(this.roomNewFormView.render().el);
            this.$lightBox = chat.lightBox($e);
        }
    });
    
    chat.lightBox = function(el) {
        var $lightBox = $('<div class="lightbox"></div>');
        var $close = $('<p class="close"><a href="#" title="close"></a></p>').click(function(){
            $lightBox.hide();
            return false;
        });
        var $div = $('<div></div>').append(el);
        $('body').append($lightBox.append($div).append($close));
        return $lightBox;
    }
    if(define) {
        define(function () {
            return chat;
        });
    }
})();