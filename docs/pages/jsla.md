JS.LA
=====

[Jukebox Home](http://JukeboxJs.com/)
[Jukebox Demo](http://JukeboxJs.com/jukebox/)
[Jukebox on Github](https://github.com/comster/jukebox/)
[About Me](https://www.jeffpelton.com/)

![JSLA](jukebox_jsla.png)



Contents
========
 - App Requirements
 - Technology Strategy
 - HTML5 App Features & Limitations
 - System Architecture
 - RESTful server, socketio, and static files
 - Backbone Client App
 - Organizing a backbone project
 - Chat & sockets
 - Audio in the browser using aurora.js
 - Metadata from audio, album art
 - HTML sliders and progress bars, drag and drop
 - Uploading with xhr2
 - Vizualizing audio using dancer.js & d3
 - Mobile approach using media queries and user agent
 - Where to go from here?




##App Requirements

 - HTML5 Web App
 - Audio Playback without Flash
 - Chat Rooms via Sockets
 - User Authentication
 - Media Server
 - Library Data
 - Queue Data




##Technology Strategy

_Open Source_.  Not targeting massive deployment to production.  Experimenting with the technology.

 - [mongodb](http://www.mongodb.org/)
 - [node.js](http://nodejs.org/)
 - [house.js](https://github.com/comster/house)
 - [socket.io.js](http://socket.io)
 - [jquery.js](http://jquery.com/)
 - [underscore.js](http://documentcloud.github.com/underscore/)
 - [backbone.js](http://backbonejs.org/)
 - [aurora.js](https://github.com/ofmlabs/aurora.js/)
 - [dancer.js](http://jsantell.github.com/dancer.js/)
 - [d3.js](http://d3js.org/)



##HTML5 App Features & Limitations

Applications targeting the browser.  HTML5, JS & CSS.
 
 - Browser compatability
 - URLs & SEO
 - App Stores
 - Device screen resolutions
 - Network connection, Offline & Caching


Resources

 - [HTML5rocks.com](http://www.html5rocks.com/)
 - [Can I Use.com](http://caniuse.com/)
 - [TodoMVC: JS framework list](http://todomvc.com/)




##System Architecture


### Server

 - House on Node.js
   - Users & Auth
   - Media Uploads
   - Library Data & Queue
   - Chat Room Sockets

### Client

 - Backbone App View
    - Nav View
    - Media Player View
      - Player Controls
      - Player Information
      - Player Visualization
    - Library View
      - Song List
         - Song Row
      - Song Upload
      - Song Search
    - Queue View
      - Song Queue List
      - Song Played List
    - Chat View
      - Room List
         - New Room Form
      - Open Room
         - Member List
         - Message List
            - Message Row
              - User Avatar & Name
              - Msg Txt
         - New Message Form




##RESTful server, socketio, and static files

Backbone friendly REST endpoints:

- [Authentication](endPoints/auth/index.js.html)
- [Media Files](endPoints/files/index.js.html)
- [Song Library](endPoints/songs/index.js.html)
- [Song Queue](endPoints/songq/index.js.html)
- [Songs Played](endPoints/songp/index.js.html)
- [Chat Rooms](endPoints/chat/index.js.html) REST & socket server

Backbone application static files served from apps/jukebox/web to /jukebox



##Backbone Client App

Organizing a backbone project

 - [Require.js](http://requirejs.org/) & [Why AMD?](http://requirejs.org/docs/whyamd.html)

Example Bootstrap:

    <html>
      <body>
        <div id="jukebox"></div>
        <script src="require.js"></script>
        <script>
        require(['jquery.js'], function(){
            require(['index.js'], function(webApp){
                webApp.init(function(jukebox){
                    jukebox.setEl($('#jukebox'));
                });
            });
        });
        </script>
      </body>
    </html>

    // index.js
    (function(){
        var app = {};
        app.init = function($el, callback) {
            require(['underscore.js'], function(){
                require(['backbone.js'], function(){
                    require(['jukebox.js'], function(jukebox) {
                        if(callback) callback(jukebox);
                    });
                });
            });
        }

        // use require module pattern
        if(define) {
            define(function () {
                return app;
            });
        }
    })();







##Backbone Components

Understand how Views, Models and Collections work together:

 - Views have a var $el, a render() function and can listen to dom events
 - Views often reference a Collection or Model. ex. ListView (has col) and RowView (has model).
 - Collections contain Models

Example:

    var MyListView = Backbone.View.extend({

        initialize: function() {
            
            this.collection = new MyCollection();

            // listen for new documents to add to the list
            this.collection.on('add', function(doc){
                self.$el.append(doc.getView().el);
            });

            // load initial data from the server
            this.collection.fetch();
        },
        render: function() {
            this.$el.html('<ul></ul>');
            return this;
        },
        events: {
            "click": "alert"
        },
        alert: function() {
            alert('you clicked on the view el');
        }
    });

    var view = new MyView({el: $('#div-id')});

    view.render();



##Chat & sockets

[Chat Server](endPoints/chat/index.js.html)

    var io = house.io.of('/socket.io/chat');
    
    // user connection to chat
    io.on('connection', function (socket) {
        
        // Ask for the room status
        socket.on('info', function(room_id, callback) {
            callback(roomInfo[room_id]);
        });
        
        // Manually advance the queue for a room
        socket.on('skip', function(data) {
            advanceRoomSongQ(data.roomId, true);
        });

        // Request to join a room
        socket.on('join', function(roomId) {
            // subscribe this socket (user) to this room
            socket.join(roomId);

            // tell the others in the room
            io.in(roomId).emit('entered', {room_id: roomId, user: roomUsers[roomId][socket.handshake.session.id]});
            
            socket.on('disconnect', function () {
              io.in(roomId).emit('exited', {room_id: roomId, user: roomUsers[roomId][socket.handshake.session.id]});
              socket.leave(roomId);
            });
        });
    });

    // example of saving a message on the server and emitting it to the chat room
    var newMsg = {room_id, msg, user, at};
    insertMessage(newMsg, function(err, data) {
        io.in(room_id).emit('message', newMsg);
    });

[Chat Client](apps/jukebox/web/houseChat.js.html)

    // Backbone listens for messages
    chat.MessageListView = Backbone.View.extend({
        initialize: function() {
            this.collection.on('add', function(doc, col) {
                $ul.append(doc.getView().render().el);
            });
        }
    });

    var socket = io.connect('http://localhost/socket.io/chat');

    // join a room
    socket.emit('join', room.get('id'));

    // listen for messages
    socket.on('message', function (data) {
        self.rooms[data.room_id].messageCollection.add(data);
    });





##Audio in the browser using aurora.js

 - [Can I Use?: Audio API](http://caniuse.com/#feat=audio-api)
 - [Aurora on github](https://github.com/ofmlabs/aurora.js)
 - mp3, flac, alac, m4a, aac, ogg

Example:

    var player = Player.fromURL('http://mysite.com/audio.wav');
    var player = Player.fromFile(file);
    player.play();

    player.on('format', function(format){
        /*
        bitrate: 320000
        channelsPerFrame: 2
        formatID: "mp3"
        sampleRate: 44100
        */
    });
    
    player.on('duration', function(msecs){
        // update current song time
    });





##Metadata from audio, album art

Metadata from aurora:

    player.on('metadata', function(metadata){
        /*
        album
        artist
        genre
        title
        trackNumber
        year
        */
    
        var src = window.URL.createObjectURL(metadata.cover.toBlob());
        $('.coverArt').append('<img src="' + src + '" />');
    });





##Uploading with xhr2

 - [XMLHttpRequest Level 2](http://dev.w3.org/2006/webapi/XMLHttpRequest-2/)
 - [HTML5rocks.com/en/tutorials/file/xhr2/](http://www.html5rocks.com/en/tutorials/file/xhr2/)
 - [Can I Use?: XHR2](http://caniuse.com/#feat=xhr2)


Example:

    var formData = new FormData();
    var xhr = new XMLHttpRequest();
    
    formData.append('files', blobOrFile);
    
    xhr.open('POST', '/api/files', true);
    
    // Listen to the upload progress.
    var progressBar = $row.find('progress');

    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        progressBar.val((e.loaded / e.total) * 100);
        progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
      }
    };
    
    xhr.onload = function(e) {
        console.log('upload complete');
        var data = JSON.parse(e.target.response);
    };
    
    xhr.send(formData);





##HTML sliders and progress bars, drag and drop

 - [Can I Use?: Input range](http://caniuse.com/#feat=input-range)
 - [Can I Use?: Progress Meter](http://caniuse.com/#feat=progressmeter)
 - [Can I Use?: DragnDrop](http://caniuse.com/#feat=dragndrop)
 - [http://www.html5rocks.com/en/tutorials/file/dndfiles/#toc-selecting-files-dnd](http://www.html5rocks.com/en/tutorials/file/dndfiles/#toc-selecting-files-dnd)

Example:

    <input class="rating" type="range" min="0" max="100" title="Rating" value="50">
    
    <meter min="0.0" max="100.0" value="33.33"></meter>


Result:

<input class="rating" type="range" min="0" max="100" title="Rating" value="50">

<meter min="0.0" max="100.0" value="33.33"></meter>





##Vizualizing audio using dancer.js & d3

 - [Dancer API](http://jsantell.github.com/dancer.js/)
 - Dancer [patch](https://github.com/comster/dancer.js/commit/1b369a78dce26829b495b86d4aa0f5fddfeded1f) to work with Aurora [forked on github](https://github.com/comster/dancer.js)
 - [Basic D3 Sample](http://bl.ocks.org/1062544)
 - [Dancer.js & Aurora Example](http://comster.github.com/dancer.js/examples/aurora/)

Example:

    var dancer = new Dancer();
    
    var kick = dancer.createKick({
        onKick: function ( mag ) {
          console.log('Kick!');
          drawRadParticles(mag);
        },
        offKick: function ( mag ) {
          console.log('no kick :(');
          drawSadParticles(mag);
        }
      }).on();




##Mobile approach using media queries and user agent

 - Target screen sizes using css media queries
 - Use browser user agent to determain iphone for limiting visualization
 - Not currently targeting network connection for media format & compression

Example of css media query to format app for smaller screens:

    @media only screen and (min-width: 767px) {
        nav li:hover {
            color: green;
        }
    }

Example:

    if(window.navigator.userAgent.indexOf('iPhone') !== -1) {
        pageSize = 100;
    } else {
        pageSize = 10; // load less on iphone
    }



##Where to go from here?

Other cool HTML5

 - Routing URLs
 - [Can I Use?: History](http://caniuse.com/#feat=history)
 - Web Workers


TODO

 - Visualizations as plug-ins
 - Skins
 - Podcast player
 - Drag and drop images to chat
 - DJ more than the audio (visual, skin, etc)
 - Drag and drop queue
 - Round Robin Queue
 - Compress HTML app css & js.
 - Reference files remotely, without CORS
 - Youtube API
 - Last.fm




##Thank you

Tell me what you think @comster and git the code at https://github.com/comster



