//
//
//
(function(){

    var jukebox = {};
    
    var AppView = Backbone.View.extend({
        render: function() {
            this.$el.html('');
            
            this.headerNavView.render();
            
            this.$el.append(this.$appHeader);
            this.$el.append(this.$appFrames);
            
            this.headerNavView.go('Jukebox');
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.$appHeader = $('<header id="jukeHead"><center>Loading..</center></header>');
            this.$appFrames = $('<div id="frames"></div>');
            
            this.headerNavView = new HeaderNavView({el:this.$appHeader, "$frames": this.$appFrames});
            self.headerNavView.render();
            this.headerNavView.addView('Player', new MediaPlayerView({el: $('<div id="mediaPlayer"></div>')}));
            this.headerNavView.addView('Library', new LibraryView({el: $('<div id="library"></div>')}));
            require(['houseChat.js'], function(houseChat) {
                var chatApp = window.chat = new houseChat.AppView({el: $('<div id="chat"></div>')});
                self.headerNavView.addView('Chat', chatApp);
                self.headerNavView.addView('Queue', new QueueView({el: $('<div id="queue"></div>'), chat: chatApp}));
            });
        },
        events: {
        }
    });
    
    var HeaderNavView = Backbone.View.extend({
        addView: function(viewName, view) {
            this.views[viewName] = view;
            window["JukeBox"+viewName] = view;
            this.options.$frames.append(view.render().$el);
        },
        render: function() {
            var txt = this.currentView || 'Loading ...';
            this.$el.html('<a class="openNav" title="Menu" href="#"><img src="assets/img/logo-drums.png" /></a><center>'+txt+'</center>');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.views = {};
            this.addView('Jukebox', new NavView({"headerNav": this}));
        },
        events: {
            "click .openNav": "openNav"
        },
        openNav: function(){
            this.go('Jukebox');
            return false;
        },
        go: function(viewName){
            this.currentView = viewName;
            for(var i in this.views) {
                this.views[i].$el.removeAttr('selected');
            }
            this.views[viewName].render();
            //this.views[viewName].$el.show();
            this.views[viewName].$el.attr('selected', true);
            
            console.log(viewName);
            this.options.$frames.attr('data-sel', viewName);
            
            this.render();
        }
    });
    
    var NavView = Backbone.View.extend({
        className: 'nav',
        render: function() {
            this.$el.html('');
            
            this.$el.append('<div class="playing"><img src="assets/img/icons/library.png" /> Playing</div>');
            this.$el.append('<div class="library"><img src="assets/img/icons/upload.png" /> Library</div>');
            this.$el.append('<div class="history"><img src="assets/img/icons/queue.png" /> History</div>');
            this.$el.append('<div class="chat"><img src="assets/img/icons/chat.png" /> Chat</div>');
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
            "click .playing": "goPlaying",
            "click .library": "goLibrary",
            "click .history": "goHistory",
            "click .chat": "goChat"
        },
        deselectAll: function() {
            this.$el.children().removeAttr('selected');
        },
        goPlaying: function() {
            var self = this;
            this.options.headerNav.go('Player');
            this.deselectAll();
            this.$el.find('.playing').attr('selected', true);
        },
        goLibrary: function() {
            var self = this;
            this.options.headerNav.go('Library');
            this.deselectAll();
            this.$el.find('.library').attr('selected', true);
        },
        goHistory: function() {
            var self = this;
            this.options.headerNav.go('Queue');
            this.deselectAll();
            this.$el.find('.history').attr('selected', true);
        },
        goChat: function() {
            var self = this;
            this.options.headerNav.go('Chat');
            this.deselectAll();
            this.$el.find('.chat').attr('selected', true);
        }
    });
    
    var QueueView = Backbone.View.extend({
        render: function() {
            this.$el.append(this.$div);
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            var self = this;
            this.$div = $('<div></div>');
            this.$played = $('<ul class="played"></ul>');
            this.$queue = $('<ul class="queue"></ul>');
            this.$div.append(this.$played);
            this.$div.append(this.$queue);
            
            self.queues = {};
            self.plays = {};
            self.songsQueueList;
            
            options.chat.roomsOpenView.roomsOpenListView.on('select', function(room){
                console.log('update queue with room '+room.get('id'));
                
                self.queues[room.get('id')] = new SongqListView({el: self.$queue, roomId: room.get('id')});
                self.songsQueueList = self.queues[room.get('id')];
                
                // request the room information
                chatSocket.emit('info', room.get('id'), function(roomInfo){
                    console.log(roomInfo);
                    
                    if(roomInfo.song) {
                    
                        // start playing song and scrub to live based on diff of pAt and new Date()
                        console.log(roomInfo.song)
                        console.log(new Date())
                        var d = new Date();
                        var pd = new Date(roomInfo.song.pAt);
                        var diff = d.getTime() - pd.getTime();
                        
                        JukeBoxPlayer.loadSong('/api/files/'+roomInfo.song.filename, roomInfo.song, diff);
                    }
                });
                
                self.plays[room.get('id')] = self.songsPlayedList = new SongpListView({el: self.$played, roomId: room.get('id')});
                
                self.queues[room.get('id')].render();
                self.plays[room.get('id')].render();
            });
            
        },
        events: {
        }
    });
    
    //
    
    function parseFile(file, callback){
        console.log(file);
      ID3v2.parseFile(file,function(tags){
        console.log(tags);
        callback(tags);
      })
    }
    
    var UploadFrame = Backbone.View.extend({
        tagName: "span",
        className: "uploadFrame",
        //htmlTemplate: 'Upload Files <iframe src="upload.html"></iframe>', haha, the old way of doing things.
        // mozdirectory webkitdirectory directory aren't really useful?
        htmlTemplate: '<input type="file" multiple onchange="fileChangeListener(this.files)"><div class="uploadFiles"><button class="upload_all" title="Upload All">☁☁☁</button></div>',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.append(this.$up);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            window.fileChangeListener = this.inputChange;
            this.$up = $(this.template({}));
        },
        events: {
            "click .upload_all": "uploadAll"
        },
        uploadAll: function() {
            var self = this;
            var i = 0;
            var filesToUpload = $('.uploadFiles button.upload');
            var uploadIt = function() {
                if(filesToUpload.hasOwnProperty(i)) {
                    filesToUpload[i].click();
                    if(i+1 == filesToUpload.length) {
                        return;
                    } else {
                        i++;
                        
                        // TODO get callback when upload progress finishes
                        setTimeout(function(){
                            uploadIt(filesToUpload[i]);
                        }, 2200);
                    }
                }
            }
            uploadIt();
        },
        inputChange: function(files) {
            var self = this;
            
            function canPlay(type){
              var a = document.createElement('audio');
              return !!(a.canPlayType && a.canPlayType(type).replace(/no/, ''));
            }
            function uploadFile(blobOrFile, $row) {
                
                var formData = new FormData();
                var xhr = new XMLHttpRequest();
                             
                var onReady = function(e) {
                 // ready state
                };
                
                var onError = function(err) {
                  // something went wrong with upload
                };
                
                formData.append('files', blobOrFile);
                xhr.open('POST', '/api/files', true);
                xhr.addEventListener('error', onError, false);
                //xhr.addEventListener('progress', onProgress, false);
                xhr.addEventListener('readystatechange', onReady, false);
                
              xhr.onload = function(e) {
                  console.log('upload complete');
                  var data = JSON.parse(e.target.response);
                  
                  if(data.hasOwnProperty('song')) {
                    window.JukeBoxLibrary.songListView.collection.add(new SongModel(data.song));
                  }
                  
                  $row.remove();
              };
            
              // Listen to the upload progress.
              var progressBar = $row.find('progress');
              xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                  progressBar.val((e.loaded / e.total) * 100);
                  //progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
                }
              };
            
                xhr.send(formData);
            }
              var queue = [];
              var mp3 = true;//canPlay('audio/mpeg;'), ogg = canPlay('audio/ogg; codecs="vorbis"');
              for(var i = 0; i < files.length; i++){
                var file = files[i];
                var path = file.webkitRelativePath || file.mozFullPath || file.name;
                if (path.indexOf('.AppleDouble') != -1) {
                 // Meta-data folder on Apple file systems, skip
                continue;
                }         
                var size = file.size || file.fileSize || 4096;
                if(size < 4095) { 
                // Most probably not a real MP3
                continue;
                }
            
                  queue.push(file);
              }
                                      
                                      //<progress min="0" max="100" value="0">0% complete</progress>
              var process = function(){
                if(queue.length){
                  console.log(queue);
                  var f = queue.shift();
                  parseFile(f,function(tags){
                      console.log(tags);
                      
                      // TODO make this a backbone view
                      
                      var $localFile = $('<div class="localFile"></div>');
                      var $actions = $('<span class="actions"></span> ');
                      var $title = $('<span class="title"></span> ');
                      var $artist = $('<span class="artist"></span> ');
                      var $album = $('<span class="album"></span> ');
                      var $year = $('<span class="year"></span> ');
                      var $genre = $('<span class="genre"></span> ');
                      
                      var t2 = guessSong(f.webkitRelativePath || f.mozFullPath || f.name); 
                      console.log(t2);
                      $actions.html('');
                      
                      var title = tags.Title || t2.Title;
                      $title.html(title);
                      
                      var artist = tags.Artist || t2.Artist;
                      $artist.html(artist);
                      
                      var album = tags.Album || t2.Album;
                      $album.html(album);
                      
                      var year = tags.Year || t2.Year;
                      $year.html(year);
                      
                      var genre = tags.Genre || "";
                      $genre.html(genre);
                      
                      $localFile.append($actions);
                      $localFile.append($title);
                      $localFile.append($artist);
                      $localFile.append($album);
                      $localFile.append($year);
                      $localFile.append($genre);
                      
                      $localFile.append('<progress min="0" max="100" value="0" style="display:none;">0% complete</progress>');
                      
                      var url;
                      if(window.createObjectURL){
                        url = window.createObjectURL(f)
                      }else if(window.createBlobURL){
                        url = window.createBlobURL(f)
                      }else if(window.URL && window.URL.createObjectURL){
                        url = window.URL.createObjectURL(f)
                      }else if(window.webkitURL && window.webkitURL.createObjectURL){
                        url = window.webkitURL.createObjectURL(f)
                      }
                      
                      var $remove = $('<button>x</button>').click(function(){
                          $localFile.remove();
                          return false;
                      });
                      
                      var $playMedia = $('<button>▸</button>').click(function(){
                          mediaPlayer.loadSong(f);
                          return false;
                      });
                      
                      var $uploadMedia = $('<button class="upload" title="upload">☁</button>').click(function(){
                          var $localFile = $(this).parents('.localFile');
                          $localFile.find('progress').show();
                          uploadFile(f, $localFile);
                          $uploadMedia.remove();
                          return false;
                      });
                      $actions.append($remove);
                      $actions.append($playMedia);
                      $actions.append($uploadMedia);
                        $('.uploadFiles').append($localFile);
                    process();
                  })
                  var lq = queue.length;
                  setTimeout(function(){
                    if(queue.length == lq){
                      process();
                    }
                  },300);
                }
              }
              process();
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var LibraryView = Backbone.View.extend({
        className: 'library',
        element: 'div',
        render: function() {
            this.$el.append(this.$div);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.$div = $('<div></div>');
            this.uploadFrame = new UploadFrame({library:this});
            this.songListView = new SongListView({library:this});
            this.searchFrame = new SearchView({library:this});
            this.$div.append(this.searchFrame.render().el);
            this.$div.append(this.uploadFrame.render().el);
            this.$div.append(this.songListView.render().el);
            require(['id3v2.js'], function(){            });
        },
        events: {
            "submit form": "submit"
        }, submit: function() {
            
            return false;
        }
    });
    
    var MediaPlayerView = Backbone.View.extend({
        className: 'player',
        element: 'div',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$player); //
            if(this.song && this.song.title) {
                var str = this.song.title+' - '+this.song.artist+' on '+this.song.album;
                this.$el.find('.songInfo').html(str);
                window.document.title = str;
            }
            
            this.$player.append(this.$viz);
            this.$player.append(this.$canvas);
            
            this.setElement(this.$el);
            return this;
        },
        renderDuration: function() {
            var p = 0;
            if(this.player.duration) {
                var d = this.player.duration / 1000;
                var t = this.player.currentTime / 1000;
                p = (t / d) * 100;
                t = d - t;
                this.$el.find('meter').val(p);
                this.$el.find('.progress').html(' - '+Math.floor(t/60) +':'+ pad(Math.floor(t%60)));
            } else {
                var t = this.player.currentTime / 1000;
                this.$el.find('.progress').html(Math.floor(t/60) +':'+ pad(Math.floor(t%60)));
            }
        },
        renderSongInfo: function() {
            var str = '';
            console.log(this.metadata);
            
            var title = this.metadata.title || this.metadata.Title || '';
            var artist = this.metadata.artist || this.metadata.Artist || this.metadata["Album Artist"] || '';
            var album = this.metadata.album || this.metadata.Album || '';
            
            str += title ? title + ' - ' : '';
            str += artist ? artist : '';
            str += album ? ' on '+album : '';
            str += this.metadata.year ? ' '+this.metadata.year : '';
            console.log(str);
            if(str) {
                this.$el.find('.songInfo').html(str);
                window.document.title = str;
                var cover = this.metadata.coverArt || this.metadata["Cover Art"] || '';
                console.log(cover)
                if(cover) {
                    if(!cover.toBlob) cover = cover.data
                    var src = window.webkitURL.createObjectURL(cover.toBlob());
                    $('#vizual').html('<img src="' + src + '" />');
                }
            }
        },
        initialize: function() {
            var self = this;
            this.$player = $('<div><meter min="0.0" max="100.0" value="0"></meter><button class="mute" title="Mute">♫</button><span class="loading"></span><span class="songInfo"></span><span class="time"><span class="currentTime"></span><span class="duration"></span> <span class="progress"></span></span></div>');
            this.$canvas = $('<canvas id="waveform" />');
            this.$viz = $('<div id="vizual"></div>');
            window.mediaPlayer = this;
            this.preloads = {};
        },
        events: {
            "click button.playPause": "playPause"
            , "click button.mute": "mute"
            , "click button.seek": "seek"
        },
        mute: function() {
            if(this.player.volume == 0) {
                this.player.volume = 100;
            } else {
                this.player.volume = 0;
            }
        },
        preloadSong: function(song) {
           this.preloads[song.filename] = Player.fromURL('/api/files/'+song.filename);
           this.preloads[song.filename].preload();
           console.log('preloading');
        },
        loadSong: function(fileName, song, diff) {
            var self = this;
            
            if(this.currentSong) {
                if(fileName == this.currentSong.filename) return;
                
                // only client side, move it into the songp collection from the songq
                
                JukeBoxQueue.songsQueueList.collection.each(function(songq){
                    console.log(songq);
                    if(self.currentSong && songq.get('song').id == self.currentSong.id) {
                        console.log('found playing song in songq');
                        
                        var songpJson = songq.attributes;
                        songpJson.qAt = songpJson.at;
                        
                        JukeBoxQueue.songsPlayedList.collection.add(new SongpModel(songq));
                        JukeBoxQueue.songsQueueList.collection.remove(songq.id);
                    }
                });
            }
            
            if(song) {
                this.currentSong = song;
            }
            var player;
            
            self.$el.find('.loading').html('Loading...');
            
            if(typeof fileName == 'string') {
                
                if(this.preloads.hasOwnProperty(fileName)) {
                    player = this.preloads.player;
                } else {
                    player = Player.fromURL(fileName);
                }
            } else {
                
                // preview local file
                player = Player.fromFile(fileName);
                fileName = fileName.fileName;
            }
            
            if(this.hasOwnProperty('player')) {
                this.player.stop();
                delete this.player;
            }
            
            this.player = player;
            
            if(song) {
                this.song = song;
                this.render();
            }
            console.log('loadSong: '+fileName);
            
            player.on('error', function(err){
                console.log(err);
            });
            console.log(player)
            player.on('buffer', function(percent){
            });
            player.on('ready', function(){
                self.$el.find('.loading').html('');
                player.play();
                
                if(diff) {
                    player.device.seek(diff);
                }
            });
            player.on('progress', function(msecs){
                //console.log(self.player.duration);
                //console.log(self.player.currentTime);
                //console.log(msecs);
                //console.log('song played '+msecs);
                self.renderDuration();
            });
            player.on('format', function(format){
                /*
                bitrate: 320000
                channelsPerFrame: 2
                formatID: "mp3"
                sampleRate: 44100
                */
            });
            player.on('metadata', function(metadata){
                self.metadata = metadata;
                if(metadata) {
                    self.renderSongInfo();
                }
                /*album: "Haven"
                albumArtist: "Dark Tranquillity"
                artist: "Dark Tranquillity"
                comments: Object
                genre: "Metal"
                title: "Haven"
                trackNumber: "6"
                year: "2000"*/
            });
            player.on('duration', function(msecs){
                //console.log(arguments);
            });
            
            this.visualizePlayer(player);
            
            if(this.preloads.hasOwnProperty(fileName)) {
                player.play();
            } else {
                player.preload();
            }
        },
        visualizePlayer: function() {
            
            return;
             var
              dancer = new Dancer( player ),
              beat = dancer.createBeat({
                onBeat: function ( mag ) {
                  console.log('Beat!');
                },
                offBeat: function ( mag ) {
                  console.log('no beat :(');
                }
              });
            
            // Let's turn this beat on right away
            beat.on();
            
            dancer.onceAt( 10, function() {
              // Let's set up some things once at 10 seconds
            }).between( 10, 60, function() {
              // After 10s, let's do something on every frame for the first minute
            }).after( 60, function() {
              // After 60s, let's get this real and map a frequency to an object's y position
              // Note that the instance of dancer is bound to "this"
              object.y = this.getFrequency( 400 );
            }).onceAt( 120, function() {
              // After 120s, we'll turn the beat off as another object's y position is still being mapped from the previous "after" method
              beat.off();
            });
        },
        next: function() {
        },
        seek: function() {
            this.player.pause();
            this.player.device.seek(60000);
            this.player.play();
            //this.player.device.start();
        },
        playPause: function() {
            this.player.togglePlayback();
        },
        pause: function() {
            this.player.pause();
            this.$el.find('.playPause').html('Play');
        },
        play: function() {
            this.player.play();
            this.$el.find('.playPause').html('Pause');
        }
    });
    
    var SearchView = Backbone.View.extend({
        className: 'search',
        element: 'div',
        render: function() {
            this.$el.html('');
            var $form = $('<form></form>').append(this.$search);
            this.$el.append($form);
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            this.$search = $('<input class="search" type="text" name="query" placeholder="search for tunes" autocomplete="off" />');
            this.$songList = options.library.songListView.$el;
        },
        events: {
            "keyup input": "search"
        }, search: function(e){
            var regex = new RegExp(this.$search.val().trim().replace(/\s+/g, '.*'), 'ig');
            for(var i = $('.songList .song'), l = i.length; l--;){
              if(regex.test(i[l].dataset.ss)){
                  $(i[l]).parent().removeClass('hidden');
              }else{
                  $(i[l]).parent().addClass('hidden');
              }
            }
        }
    });
    
    var VisualView = Backbone.View.extend({
        className: 'visual',
        element: 'div',
        render: function() {
            this.$el.html('<canvas />');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
        }
    });
    
    
    SongModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var self = this;
            var viewType = 'SongRow';
            if(options && options.hasOwnProperty('viewType')) {
                viewType = options.viewType;
            }
            if(!this.hasOwnProperty(viewType)) {
                if(!options) options = {};
                options.model = this;
                this[viewType] = new SongRow(options);
                this[viewType].on('queue', function(songModel, roomId){
                    console.log(arguments);
                    var songqCollection = JukeBoxQueue.songsQueueList.collection;
                    var songq = new SongqModel({}, {collection: songqCollection});
                    songq.on("change", function(songq, options){
                        var s = songq.save(null, {silent: true, wait: true})
                            .done(function(s, typeStr, respStr) {
                                self.trigger('saved', songq);
                                songqCollection.add(songq);
                            });
                    });
                    var newSongq = {
                        song: songModel.attributes,
                        room_id: roomId
                    };
                    console.log(newSongq);
                    songq.set(newSongq, {wait: true});
                });
            }
            return this[viewType];
        }
    });
    
    SongCollection = Backbone.Collection.extend({
        model: SongModel,
        url: '/api/songs',
        initialize: function(docs, options) {
            var self = this;
        }, load: function(callback) {
            var self = this;
            this.reset();
            this.fetch({add:true});
        }, comparator: function(a,b) {
            return a.get('at') > b.get('at');
        }
    });
    
    SongListView = Backbone.View.extend({
        tag: 'div',
        className: 'songList',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.$ul = $('<ul class="songs"></ul>');
            var self = this;
            if(!this.collection) {
                this.collection = new SongCollection();
            }
            this.collection.on('add', function(doc, col) {
                var $li = $('<li></li>');
                var view = doc.getView();
                $li.append(view.render().el);
                $li.attr('data-id', doc.get('id'));
                self.$ul.prepend($li);
                
                doc.on('remove', function(){
                    $li.remove();
                    return false;
                });
            });
            this.collection.load();
        },
        events: {
            "click li": "selectLi"
        },
        selectLi: function(el) {
            //var room = this.collection.get($(el.target).attr('data-id'));
            //this.trigger('select', room);
            $(el.target).parent('li').attr('selected', true);
            $(el.target).parent('li').siblings().removeAttr('selected');
        }
    });
    
    SongqModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var viewType = 'SongqRow';
            if(options && options.hasOwnProperty('viewType')) {
                viewType = options.viewType;
            }
            if(!this.hasOwnProperty(viewType)) {
                if(!options) options = {};
                options.model = this;
                this[viewType] = new SongqRow(options);
            }
            return this[viewType];
        }
    });
    
    SongqCollection = Backbone.Collection.extend({
        model: SongqModel,
        url: '/api/songq',
        initialize: function(docs, options) {
            var self = this;
            this.fitler = {};
        }, load: function(callback) {
            var self = this;
            this.reset();
            
            this.filter.sort = 'rank';
            
            var options = {data: this.filter};
            options.add = true;
            
            if(callback) options.success = callback;
            this.fetch(options);
        }, comparator: function(a,b) {
            return a.get('rank') < b.get('rank');
        },
        filter: function(obj) {
            this.filter = obj;
        }
    });
    
    SongqListView = Backbone.View.extend({
        tag: 'div',
        className: 'songsQueueList',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$ul);
            this.$el.append(this.$skip);
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            this.$ul = $('<ul class="songs"></ul>');
            this.$skip = $('<button class="skip">☣</button>');
            var self = this;
            if(!this.collection) {
                this.collection = new SongqCollection();
            }
            this.room_id = options.roomId;
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
            this.collection.filter({room_id: options.roomId});
            this.collection.load();
        },
        events: {
            "click li": "selectLi",
            "click .skip": "skip"
        },
        selectLi: function(el) {
            //var room = this.collection.get($(el.target).attr('data-id'));
            //this.trigger('select', room);
            $(el.target).parent('li').attr('selected', true);
            $(el.target).parent('li').siblings().removeAttr('selected');
        },
        skip: function() {
            chatSocket.emit('skip', {room_id: this.room_id});
        }
    });
    
    var UserAvatar = Backbone.View.extend({
        tagName: 'span',
        className: 'user',
        render: function() {
            this.$el.html('');
            var $avatar = $('<img src="/jukebox/assets/img/icons/library.png" />');
            if(this.model.has('avatar')) {
                $avatar.attr('src', '/api/files/'+this.model.get('avatar'));
            }
            this.$el.prepend($avatar);
            this.$el.addClass(this.model.get('name'));
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
    
    var SongqRow = Backbone.View.extend({
        tagName: 'span',
        className: 'songq',
        render: function() {
            this.$el.html('<span class="dj" title="'+this.model.get('dj').name+'"></span><span class="title">'+this.model.get('song').title+'</span> <span class="artist">'+this.model.get('song').artist+'</span><button class="remove" title="Remove from queue spot '+this.model.get('rank')+'">x</button>');
            this.$el.attr('title', this.model.get('song').ss);
            this.$el.attr('data-id', this.model.get('id'));
            this.$el.find('.dj').append(this.userAvatar.render().el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.user = window.usersCollection.get(this.model.get('dj').id);
            this.userAvatar = new UserAvatar({model: this.user});
        },
        events: {
            "click .remove": "unqueueSong"
            //, "click .play": "playSong"
        },
        unqueueSong: function() {
            this.model.destroy();
        }
    });
    
    
    SongpModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var viewType = 'SongpRow';
            if(options && options.hasOwnProperty('viewType')) {
                viewType = options.viewType;
            }
            if(!this.hasOwnProperty(viewType)) {
                if(!options) options = {};
                options.model = this;
                this[viewType] = new SongpRow(options);
            }
            return this[viewType];
        }
    });
    
    SongpCollection = Backbone.Collection.extend({
        model: SongpModel,
        url: '/api/songp',
        initialize: function(docs, options) {
            var self = this;
            this.fitler = {};
        }, load: function(callback) {
            var self = this;
            this.reset();
            this.filter.limit = 15;
            this.filter.sort = 'pAt-';
            var options = {data: this.filter};
            options.add = true;
            
            if(callback) options.success = callback;
            this.fetch(options);
        }, comparator: function(a,b) {
            return a.get('pAt') > b.get('pAt');
        },
        filter: function(obj) {
            this.filter = obj;
        }
    });
    
    SongpListView = Backbone.View.extend({
        tag: 'div',
        className: 'songsPlayedList',
        render: function() {
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            this.$ul = $('<ul class="songs"></ul>');
            var self = this;
            if(!this.collection) {
                this.collection = new SongpCollection();
            }
            this.room_id = options.roomId;
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
            this.collection.filter({room_id: options.roomId});
            this.collection.load();
        },
        events: {
            "click li": "selectLi"
        },
        selectLi: function(el) {
            //var room = this.collection.get($(el.target).attr('data-id'));
            //this.trigger('select', room);
            $(el.target).parent('li').attr('selected', true);
            $(el.target).parent('li').siblings().removeAttr('selected');
        }
    });
    
    SongpRow = Backbone.View.extend({
        tag: 'span',
        className: 'songp',
        render: function() {
            if(this.model.get('song')) {
                this.$el.html('<span class="title">'+this.model.get('song').title+'</span> <span class="artist">'+this.model.get('song').artist+'</span>');
            }
            if(this.model.has('pAt')) {
                this.$el.append('<span class="pAt">'+this.model.get('pAt')+'</span>');
            }
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
    
    var formatSeconds = function(seconds) {
        var str = '';
        str = Math.floor(seconds/60) +':'+ pad(Math.floor(seconds%60));
        return str;
    }
    
    SongRow = Backbone.View.extend({
        tag: 'span',
        className: 'song',
        render: function() {
            var str = '<span class="title">'+this.model.get('title')+'</span> ';
            if(this.model.has('duration')) {
                str = '<span class="duration">'+formatSeconds(this.model.get('duration'))+'</span> '+str;
            }
            if(this.model.get('album')) {
                str += '<span class="album">'+this.model.get('album')+'</span>';
            }
            if(this.model.get('artist')) {
                str += '<span class="artist">'+this.model.get('artist')+'</span>';
            }
            this.$el.html('<button class="queue" title="Queue Song">❥</button><button class="play" title="Preview Song">▸</button>'+str);
            this.$el.attr('data-id', this.model.get('id'));
            this.$el.attr('data-ss', this.model.get('ss'));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
            "click .queue": "queueSong"
            , "click .play": "playSong"
        },
        playSong: function() {
            // play song
            mediaPlayer.loadSong('/api/files/'+encodeURIComponent(this.model.get('filename')), this.model);
        },
        queueSong: function() {
            this.$el.attr('data-queue', true);
            this.$el.siblings().removeAttr('data-queue');
            console.log('queue to room id '+$('.chatroom[selected]').attr('data-id'))
            this.trigger('queue', this.model, $('.chatroom[selected]').attr('data-id'));
        }
    });
    
    jukebox.init = function($el, callback) {
        var self = this;
        this.initAuth(function(loginStatus){
            console.log(loginStatus)
            
            if($el && loginStatus && loginStatus.has('groups') && loginStatus.get('groups').indexOf('friend') !== -1) {
                var $app = $('<div id="app"></div>');
                $el.append($app);
                require(['aurora.js'], function() {
                    require(['mp3.js'], function() { require(['flac.js'], function() { require(['alac.js'], function() { require(['aac.js'], function() {
                        require(['dancer.js'], function() {
                            require(['moment.min.js'], function(){
                                self.view = new AppView({el: $app});
                                
                                self.view.render();
                                
                                if(callback) callback();
                            });
                        });
                    }); }); }); });
                });
            } else {
                alert('401');
            }
        });
    }
    
    jukebox.initAuth = function(callback) {
        require(['houseAuth.js'], function(auth) {
            auth.get(function(err, loginStatus){
                var $profile = $('<div id="me"></div>');
                $('body').append($profile);
                if(err) {
                    
                } else if(loginStatus) {
                    if(loginStatus && loginStatus.has('user')) {
                        jukebox.user = loginStatus.user;
                        var profileView = loginStatus.getView();
                        $profile.html(profileView.render().el);
                        callback(loginStatus);
                    } else {
                        if(!jukebox.hasOwnProperty('$loginPrompt')) {
                            var $auth = $('<div></div>');
                            jukebox.$loginPrompt = $('<div class="lightbox"></div>');
                            var $close = $('<p class="close"><a href="#" title="close"></a></p>').click(function(){
                                jukebox.$loginPrompt.hide();
                                return false;
                            });
                            jukebox.$loginPrompt.hide();
                            $('body').append(jukebox.$loginPrompt.append($auth).append($close));
                        }
                        
                        var $loginButton = $('<button>login</button>').click(function(){
                            promptLogin();
                        });
                        $profile.html($loginButton);
                        
                        var promptLogin = function() {
                            jukebox.$loginPrompt.show();
                            auth.prompt($auth).authorized(function(loginStatus){
                                jukebox.$loginPrompt.hide();
                                var profileView = loginStatus.getView();
                                $profile.html(profileView.render().el);
                                
                                callback(loginStatus);
                            });
                        }
                    }
                }
            });
        });
    }
    
    if(define) {
        define(function () {
            return jukebox;
        });
    }
    function pad(n){
        return n > 9 ? ''+n : '0'+n;
    }
})();
