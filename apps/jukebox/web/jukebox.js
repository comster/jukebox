//
// JUKEBOX!
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
            this.$mediaPreviewer = $('<div id="mediaPreviewer"></div>');
            
            this.headerNavView = window.jukeboxNav = new HeaderNavView({el:this.$appHeader, "$frames": this.$appFrames});
            self.headerNavView.render();
            this.headerNavView.addView('Player', new MediaPlayerView({el: $('<div id="mediaPlayer"></div>')}));
            this.headerNavView.addView('Previewer', new MediaPlayerView({el: this.$mediaPreviewer, previewer: true}));
            this.headerNavView.addView('Library', new LibraryView({el: $('<div id="library"></div>')}));
            require(['houseChat.js'], function(houseChat) {
                var chatApp = window.chat = new houseChat.AppView({el: $('<div id="chat"></div>')});
                self.headerNavView.addView('Chat', chatApp);
                self.headerNavView.addView('Queue', new QueueView({el: $('<div id="queue"></div>'), chat: chatApp}));
            });
            this.$mediaPreviewer.addClass('hidden');
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
            //<div class="wrapper"><div class="spinner pie"></div><div class="filler pie"></div><div class="mask"></div></div> // circle spinner
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
            this.views[viewName].$el.attr('selected', true);
            if(viewName == 'Player') {
                this.views['Previewer'].$el.attr('selected', true);
            }
            
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
            this.$el.html('');
            this.$el.append(this.$div);
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            var self = this;
            this.$div = $('<div></div>');
            
            self.queues = {};
            self.plays = {};
            self.songsQueueList;
            
            options.chat.roomsOpenView.roomsOpenListView.on('select', function(room){
                if(self.songsQueueList) self.songsQueueList.remove();
                if(self.songsPlayedList) self.songsPlayedList.remove();
                self.$played = $('<ul class="played"></ul>');
                self.$queue = $('<ul class="queue"></ul>');
                self.$div.append(self.$played);
                self.$div.append(self.$queue);
                self.songsQueueList = new SongqListView({el: self.$queue, roomId: room.get('id')});
                self.songsPlayedList = new SongpListView({el: self.$played, roomId: room.get('id')});
                
                // request the room information
                chatSocket.emit('info', room.get('id'), function(roomInfo){
                    
                    if(roomInfo.song) {
                    
                        // start playing song and scrub to live based on diff of pAt and new Date()
                        var d = new Date();
                        var pd = new Date(roomInfo.song.pAt);
                        var diff = d.getTime() - pd.getTime();
                        
                        JukeBoxPlayer.loadSong('/api/files/'+roomInfo.song.filename, roomInfo.song, diff);
                        JukeBoxPlayer.player.play();
                    }
                });
                
                self.songsQueueList.render();
                self.songsPlayedList.render();
            });
        }
    });
    
    function parseFile(file, callback){
        var parsed = false;
        setTimeout(function(){
            if(!parsed) {
                callback({});
            }
        }, 1000);
        ID3v2.parseFile(file, function(tags){
            parsed = true;
            callback(tags);
        });
    }
    
    var UploadFrame = Backbone.View.extend({
        tagName: "span",
        className: "uploadFrame",
        //htmlTemplate: 'Upload Files <iframe src="upload.html"></iframe>', haha, the old way of doing things.
        // mozdirectory webkitdirectory directory aren't really useful?
        htmlTemplate: '<span class="drg">Drag files here or </span><input type="file" multiple onchange="fileChangeListener(this.files)"><div class="uploadFiles"><button class="upload_all" title="Upload All">☁☁☁</button></div>',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html('');
            this.$el.append(this.$up);
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            // TODO NEED HELP!
            window.fileChangeListener = this.inputChange;
            window.UploadFrame = this;
            this.$up = $(this.template({}));
        },
        events: {
            "click .upload_all": "uploadAll",
            "dragover": "handleDragOver",
            "drop": "handleFileSelect"
        },
        handleFileSelect: function(e) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            console.log('eeee');
            var files = e.originalEvent.dataTransfer.files;
            
            for(var i = 0, f; f = files[i]; i++) {
                this.appendFile(f);
            }
            return false;
        },
        handleDragOver: function(e) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            this.$el.addClass('dragover')
            e.originalEvent.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
            return false;
        },
        uploadAll: function() {
            var self = window.UploadFrame;
            var i = 0;
            var filesToUpload = $('.uploadFiles button.upload');
            this.on('uploaded', function(){
                uploadIt(filesToUpload[i]);
            });
            var uploadIt = function() {
                if(filesToUpload.hasOwnProperty(i)) {
                    filesToUpload[i].click();
                    if(i+1 == filesToUpload.length) {
                        return;
                    } else {
                        i++;
                        // using global callback to loop on upload completion
                    }
                }
            }
            uploadIt();
        },
        uploadFile: function(blobOrFile, $row, callback) {
            
            var formData = new FormData();
            var xhr = new XMLHttpRequest();
            formData.append('files', blobOrFile);
            xhr.open('POST', '/api/files', true);
            //xhr.addEventListener('error', onError, false);
            //xhr.addEventListener('progress', onProgress, false);
            //xhr.addEventListener('readystatechange', onReady, false);
            
            xhr.onload = function(e) {
              //console.log('upload complete');
              var data = JSON.parse(e.target.response);
              
              if(data.hasOwnProperty('song')) {
                window.JukeBoxLibrary.songListView.collection.add(new SongModel(data.song));
              }
              
              if(callback) callback();
            };
            
            // Listen to the upload progress.
            var progressBar = $row.find('progress');
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                  progressBar.val((e.loaded / e.total) * 100);
                  progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
                }
            };
        
            xhr.send(formData);
        },
        appendFile: function(f, callback) {
            var self = window.UploadFrame;
            parseFile(f,function(tags){
                // TODO make this a backbone view.  this is the lazy jquery way
                var $localFile = $('<div class="localFile"></div>');
                var $actions = $('<span class="actions"></span> ');
                var $title = $('<span class="title"></span> ');
                var $artist = $('<span class="artist"></span> ');
                var $album = $('<span class="album"></span> ');
                var $year = $('<span class="year"></span> ');
                var $genre = $('<span class="genre"></span> ');
                
                var t2 = guessSong(f.webkitRelativePath || f.mozFullPath || f.name); 
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
                                
                var $remove = $('<button>x</button>').click(function(){
                    $localFile.remove();
                    return false;
                });
                
                var $playMedia = $('<button>▸</button>').click(function(){
                    if(!self.previewing) {
                        JukeBoxPreviewer.loadSong(f);
                        self.previewing = true;
                        JukeBoxPreviewer.$el.removeClass('hidden');
                        JukeBoxPlayer.$el.addClass('hidden');
                        JukeBoxPlayer.player.volume = 0;
                        JukeBoxPlayer.playerVolume = 0;
                        $(this).html('=');
                    } else {
                        self.previewing = false;
                        JukeBoxPreviewer.player.stop();
                        JukeBoxPreviewer.$el.addClass('hidden');
                        JukeBoxPlayer.$el.removeClass('hidden');
                        JukeBoxPlayer.player.volume = 100;
                        JukeBoxPlayer.playerVolume = 100;
                        $(this).html('▸');
                    }
                    return false;
                });
                
                var $uploadMedia = $('<button class="upload" title="upload">☁</button>').click(function(){
                    var $localFile = $(this).parents('.localFile');
                    $localFile.find('progress').show();
                    self.uploadFile(f, $localFile, function(){
                        window.UploadFrame.trigger('uploaded');
                        $localFile.remove();
                    });
                    $uploadMedia.remove();
                    return false;
                });
                $actions.append($remove);
                $actions.append($playMedia);
                $actions.append($uploadMedia);
                $('.uploadFiles').append($localFile);
                if(callback) callback();
            });
        },
        inputChange: function(files) {
            var self = window.UploadFrame;
            
              var queue = [];
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
                                      
              var process = function(){
                if(queue.length){
                  //console.log(queue);
                  var f = queue.shift();
                  
                  self.appendFile(f, function(){
                      process();
                  });
                  
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
            this.$upload.hide();
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.$div = $('<div></div>');
            this.uploadFrame = new UploadFrame({library:this});
            this.songListView = new SongListView({library:this});
            this.searchFrame = new SearchView({library:this});
            this.$upload = this.uploadFrame.render().$el;
            this.$uploadBtn = $('<button class="showUploadFrame">☁</button>');
            this.$div.append(this.searchFrame.render().el);
            this.$div.append(this.$uploadBtn);
            this.$div.append(this.$upload);
            this.$div.append(this.songListView.render().el);
            require(['id3v2.js'], function(){            });
            var self = this;
            setTimeout(function(){
            self.songListView.collection.load();
            }, 2200);
        },
        events: {
            "submit form": "submit",
            "click .showUploadFrame": "showUploadFrame"
        }, submit: function() {
            
            return false;
        }, showUploadFrame: function() {
            this.$upload.show();
            this.$uploadBtn.remove();
        }
    });
    var formatMsTime = function(ms) {
        var t = ms/1000;
        return Math.floor(t/60) +':'+ pad(Math.floor(t%60));
    }
    var MediaPlayerView = Backbone.View.extend({
        className: 'player',
        element: 'div',
        render: function() {
            this.$el.html('');
            
            if(this.options.previewer) {
                var $stopPreview = $('<div class="stopPreview" title="go back to the currently playing song in the room"><button>Stop Preview</button></div>');
                this.$player.find('.actions').html($stopPreview);
            }
            
            this.$el.append(this.$player); //
            if(this.song) {
                var str = '';
                if(this.song.title) {
                    str += this.song.title;
                }
                if(this.song.artist) {
                    str += ' - '+this.song.artist; //+' on '+this.song.album;
                }
                this.$el.find('.songInfo').html(str);
                window.document.title = str;
                var d = formatMsTime(this.song.duration*1000);
                this.$el.find('.albumName').html(this.song.album);
                this.$el.find('.duration').html(d);
                this.$el.find('.duration').attr('data-duration', this.song.duration);
                this.$el.find('.progress').attr('title', d);
            }
            if(this.songRatingListView) {
                this.$player.find('.ratings').html(this.songRatingListView.render().el);
            }
            this.renderSongInfo();
            
            this.setElement(this.$el);
            return this;
        },
        renderDuration: function() {
            var p = 0;
            var duration;
            if(this.player.duration) {
                duration = this.player.duration;
            } else if(this.song) {
                duration = (this.song.duration * 1000);
            }
            this.$el.find('.currentTime').html(formatMsTime(this.player.currentTime));
            if(duration) {
                var d = duration / 1000;
                var t = this.player.currentTime / 1000;
                p = (t / d) * 100;
                t = d - t;
                this.$el.find('meter').val(p);
                this.$el.find('.progress').html(' - '+Math.floor(t/60) +':'+ pad(Math.floor(t%60)));
            } else {
                var t = this.player.currentTime / 1000;
                this.$el.find('.progress').html(Math.floor(t/60) +':'+ pad(Math.floor(t%60)));
            }
            
            // pass this along to the ratings for hightlight this.song.duration
            this.songRatingListView.trigger('currentTime', this.player.currentTime);
        },
        renderSongInfo: function() {
            var self = this;
            var str = '';
            //console.log(this.metadata);
            this.$el.find('input[type="range"]').val(50);
            this.$el.find('.coverArt').html('');
            var title, artist, album;
            if(this.metadata) {
                title = this.metadata.title || this.metadata.Title || '';
                artist = this.metadata.artist || this.metadata.Artist || this.metadata["Album Artist"] || '';
                album = this.metadata.album || this.metadata.Album || '';
                
                this.$el.find('.albumName').html(album);
                
                str += title ? title + ' - ' : '';
                str += artist ? artist : '';
                //str += album ? ' on '+album : '';
                str += this.metadata.year ? ' '+this.metadata.year : '';
                if(str) {
                    this.$el.find('.songInfo').html(str);
                    window.document.title = str;
                    var cover = this.metadata.coverArt || this.metadata["Cover Art"] || '';
                    if(cover) {
                        if(!cover.toBlob) cover = cover.data
                        window.URL = window.URL || window.webkitURL;
                        var src = window.URL.createObjectURL(cover.toBlob());
                        this.$el.find('.coverArt').append('<img src="' + src + '" />');
                    } else {
                        
                    }
                }
            }
            if(true) {
                self.lastfminfo = {};
                if(this.song && this.song.title) {
                    title = this.song.title || title;
                    artist = this.song.artist || artist;
                    album = this.song.album || album;
                }
                
                var showLastFmImg = function(im) {
                    var largest = im.pop();
                    
                    if(largest.hasOwnProperty('#text')) {
                        var url = largest['#text'];
                        
                        if(self.$el.find('.coverArt img[src="'+url+'"]').length === 0) {
                            self.$el.find('.coverArt').append('<img src="'+url+'" />');
                        }
                    }
                }
                window.currentSongLastFmResults = function(lastfm) {
                    if(lastfm && lastfm.track && lastfm.track.album && lastfm.track.album.image) {
                        self.lastfminfo.track = lastfm.track;
                        showLastFmImg(lastfm.track.album.image);
                    }
                }
                window.currentSongLastFmAlbumResults = function(lastfm) {
                    if(lastfm && lastfm.album && lastfm.album.image) {
                        self.lastfminfo.album = lastfm.album;
                        showLastFmImg(lastfm.album.image);
                    }
                }
                this.currentSongLastFmUpdate(title, artist, 'currentSongLastFmResults');
                this.currentSongLastFmAlbum(album, artist, 'currentSongLastFmAlbumResults');
            }
        },
        currentSongLastFmUpdate: function(track, artist, cb) {
          if(!track || !artist) return false;
          if(!cb) cb = 'currentSongLastFmResults'
          var fm = document.createElement('script');
          fm.type = 'text/javascript'; fm.async = true;
          fm.src = 'http://ws.audioscrobbler.com/2.0/?format=json&method=track.getInfo&track='+track+'&artist='+artist+'&api_key=b2bf291c680b404f01f4562305b9aeef&callback='+cb;
          (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(fm);
        },
        currentSongLastFmAlbum: function(album, artist, cb) {
          if(!album || !artist) return false;
          if(!cb) cb = 'currentSongLastFmAlbumResults'
          var fm = document.createElement('script');
          fm.type = 'text/javascript'; fm.async = true;
          fm.src = 'http://ws.audioscrobbler.com/2.0/?format=json&method=album.getInfo&album='+album+'&artist='+artist+'&api_key=b2bf291c680b404f01f4562305b9aeef&callback='+cb;
          (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(fm);
        },
        initialize: function() {
            var self = this;
            this.$player = $('<div class="mediaPlayer"><meter min="0.0" max="100.0" value="0.1"></meter>\
<span class="time"><span class="currentTime"></span><span class="duration"></span> <span class="progress"></span></span>\
<button class="mute" title="Mute">♫</button>\
<button class="toggleVisual" title="Visualize">V</button>\
<input class="visualDetail" type="range" min="-1" max="600" step="1" title="visual detail" value="0">\
<span class="actions"></span>\
<div class="playerInfo"><span class="loading"></span><span class="songInfo"></span><span class="albumInfo"><span class="albumName"></span></span>\
<input class="rating" type="range" min="0" max="100" title="Rating" value="0" /><span class="ratings"></span>\
</div>\
<span class="coverArt"></span>\
<div class="visual"></div>\
</div>');
            this.preloads = {};
            this.songRatings = {};
        },
        events: {
            "click button.playPause": "playPause"
            , "click button.mute": "mute"
            , "click button.toggleVisual": "toggleVisual"
            , "click button.seek": "seek"
            , "mouseup input.rating": "rating"
            , "click .stopPreview": "stopPreview"
        },
        stopPreview: function() {
           JukeBoxPreviewer.player.stop();
           JukeBoxPreviewer.$el.addClass('hidden');
           JukeBoxPlayer.$el.removeClass('hidden');
           JukeBoxPlayer.player.volume = 100;
           JukeBoxPlayer.playerVolume = 100;
        },
        rating: function() {
            var self = this;
            //console.log(this.$el.find('.rating').val());
            
            if(!this.songRatings.hasOwnProperty(this.song.id)) {
                this.songRatings[this.song.id] = new SongRatingModel({}, {collection: this.songRatingListView.collection});
                this.songRatings[this.song.id].on("change", function(songr, options){
                    var isnoo = songr.isNew();
                    var s = songr.save(null, {silent: true, wait: true})
                        .done(function(s, typeStr, respStr) {
                            delete songr.changed.at;
                            delete songr.changed.id;
                            delete songr.changed.score;
                            delete songr.changed.user;
                            self.trigger('saved', songr);
                            self.songRatingListView.collection.add(songr);
                            self.songRatings[self.song.id].getView().showMsgForm();
                            self.songRatings[self.song.id].getView().render();
                            if(isnoo) {
                            } else {
                                //self.songRatings[self.song.id].getView().hideMsgForm();
                            }
                        });
                });
                var newSongr = {
                    song_id: this.song.id,
                    score: this.$el.find('.rating').val()
                };
                var ts = Math.floor(this.player.currentTime / 1000);
                if(ts) {
                    newSongr.ts = ts;
                }
                this.songRatings[this.song.id].set(newSongr, {wait: true});
            } else {
                this.songRatings[this.song.id].set({score: this.$el.find('.rating').val()}, {wait: true});
                this.songRatings[this.song.id].getView().render();
            }
        },
        mute: function() {
            if(this.player.volume == 0) {
                this.player.volume = 100;
            } else {
                this.player.volume = 0;
            }
            // persist volume between songs
            this.playerVolume = this.player.volume;
        },
        toggleVisual: function() {
            this.$player.find('.visual').toggle();
        },
        listenToPlayer: function(player) {
            var self = this;
            
            player.on('error', function(err){
                console.log(err);
            });
            //player.on('buffer', function(percent){});
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
            /*player.on('metadata', function(metadata){
                self.metadata = metadata;
                if(metadata) {
                    self.renderSongInfo();
                }
                album: "Haven"
                albumArtist: "Dark Tranquillity"
                artist: "Dark Tranquillity"
                comments: Object
                genre: "Metal"
                title: "Haven"
                trackNumber: "6"
                year: "2000"
            });*/
            //player.on('duration', function(msecs){        console.log(arguments);          });
            
            return player;
        },
        preloadSong: function(song) {
            var self = this;
           console.log('preloading');
           console.log(song);
           var path = '/api/files/'+song.filename;
           this.preloads = {}; // delete old refs
           this.preloads[path] = Player.fromURL(path);
           this.preloads[path].on('error', function(err){
               console.log(err);
               chat.roomsOpenView.systemErr(err);
           });
           this.preloads[path].on('progress', function(msecs){
               self.renderDuration();
           });
           
           // show loading in queue
           JukeBoxQueue.songsQueueList.$el.find('li:nth(1)').addClass('loading');
           
           this.preloads[path].on('buffer', function(percent){
               JukeBoxQueue.songsQueueList.$el.find('li:nth(1) meter').val(percent);
               JukeBoxQueue.songsQueueList.$el.find('li:nth(1) meter').html(Math.floor(percent)+'%');
           });
           this.preloads[path].preload();
        },
        loadSong: function(fileName, song, diff) {
            var self = this;
            var volume = 100;
            diff = diff || 0;
            if(this.currentSong) {
                volume = this.player.volume || volume;
                if(fileName == this.currentSong.filename) return;
                
                var loadAndUpdatePrevSongId = function(prevSongId) {
                
                    JukeBoxQueue.songsQueueList.collection.each(function(songq){
                        if(prevSongId && songq.get('song').id == prevSongId) {
                            var songpJson = songq.attributes;
                            songpJson.qAt = songpJson.at;
                            
                            JukeBoxQueue.songsPlayedList.collection.add(new SongpModel(songpJson));
                            JukeBoxQueue.songsQueueList.collection.remove(songq.id);
                        }
                    });
                    JukeBoxQueue.songsQueueList.collection.reset();
                    JukeBoxQueue.songsQueueList.collection.load(function(){
                    });
                }
                loadAndUpdatePrevSongId(self.currentSong.id);
            }
            
            if(song) {
                this.currentSong = song;
            }
            var player;
            
            self.$el.find('.loading').html('Loading...');
            //console.log(fileName)
            //console.log(this.preloads)
            if(typeof fileName == 'string') {
                
                if(false && fileName.indexOf('http') == 0) {
                    // let's try loading cross domain without ajax
                    var a = new Audio();
                    a.src = fileName;
                    a.load();
                    //a.play();
                    console.log(a);
                    window.audTest = a;
                    return;
                }
                
                if(this.preloads.hasOwnProperty(fileName)) {
                    player = this.preloads[fileName];
                    player.on('ready', function(){
                        console.log('preloaded song');
                    });
                } else {
                    player = Player.fromURL(fileName);
                    player.on('ready', function(){
                        self.$el.find('.loading').html('');
                        player.play();
                        
                        if(diff) {
                            // todo this later when it works
                            //player.device.seek(diff);
                        }
                        
                        console.log('visualize player');
                        self.visualizePlayer(player);
                    });
                    player.on('error', function(err){
                        console.log(err);
                        chat.roomsOpenView.systemErr(err);
                    });
                    player.on('buffer', function(percent){
                        JukeBoxQueue.songsQueueList.$el.find('li:nth(0) meter').val(percent);
                        JukeBoxQueue.songsQueueList.$el.find('li:nth(0) meter').html(percent+'%');
                        var p = Math.floor(percent);
                        if(p > 99) {
                            self.$el.find('.loading').html('');
                        } else {
                            self.$el.find('.loading').html('Loading... '+p+'% ');
                        }
                    });
                    player.on('progress', function(msecs){
                        self.renderDuration();
                    });
                }
            } else {
                
                // preview local file
                player = Player.fromFile(fileName);
                player.on('ready', function(){
                    self.$el.find('.loading').html('');
                    player.play();
                });
                player.on('error', function(err){
                    console.log(err);
                    chat.roomsOpenView.systemErr(err);
                });
                //player.on('buffer', function(percent){});
                player.on('progress', function(msecs){
                    //console.log(self.player.duration);
                    //console.log(self.player.currentTime);
                    //console.log(msecs);
                    //console.log('song played '+msecs);
                    self.renderDuration();
                });
                player.on('metadata', function(metadata){
                    self.metadata = metadata;
                    if(metadata) {
                        self.renderSongInfo();
                    }
                });
                //self.listenToPlayer(player);
                fileName = fileName.fileName;
            }
            
            if(this.hasOwnProperty('player')) {
                this.player.stop();
                delete this.player;
            }
            
            // keep a reference to our player
            this.player = player;
            
            // set the volume
            this.player.volume = (this.playerVolume || this.playerVolume === 0) ? this.playerVolume : 100;
            
            // render ratings for the song
            if(song) {
                this.song = song;
                this.songRatingListView = new SongRatingListView({song_id:this.song.id});
                this.render();
            }
            
            if(this.preloads.hasOwnProperty(fileName)) {
                player.on('ready', function(){ // in case its not loaded yet
                    self.$el.find('.loading').html('');
                    player.play();
                    self.visualizePlayer(player);
                    if(diff) {
                        player.device.seek(diff);
                    }
                });
                self.$el.find('.loading').html('');
                player.play();
                console.log('visualize player preloaded');
                self.visualizePlayer(player);
            } else {
                player.preload();
            }
        },
        visualizePlayer: function(player) {
            var self = this;
            var $v = this.$player.find('.visual');
            var w = $v.width(),
                h = $v.height(),
                z = d3.scale.category20(),
                i = 0;
            var b = 0;
            if(w == 0 || h == 0) {
                console.log('no width');
                setTimeout(function() {
                    self.visualizePlayer(player);
                }, 1000);
                return;
            }
            var prog = 0;
            $v.html('');
            var svg = d3.select($v[0]).append("svg:svg")
                .attr("width", w)
                .attr("height", h)
                .style("pointer-events", "all");
            self.cx = function() {
                if(prog) {
                    prog += w/10;
                    if(prog > w) {
                        prog = 1;
                    }
                    return prog;
                }
                if(self.leftRight) {
                    if(b++ % 2 == 0) {
                        return 0;
                    } else {
                        return w;
                    }
                }
                return w/2;
            }
            self.cy = function() {
                if(prog) {
                    if(prog > h) {
                        prog = 1;
                    }
                    return prog;
                }
                if(!self.upDownCenter) {
                    return h/2;
                } else if(self.upDownCenter == 1) {
                    return 0;
                } else if(self.upDownCenter == 2) {
                    return h;
                }
            }
            var r = w/1.3;
            var txDuration = (window.navigator.userAgent.indexOf('iPhone') === -1) ? 2200 : 1100;
            var $visualDetail = self.$player.find('input.visualDetail');
            function particle(mag, color) {
              var intensity = ($visualDetail.val() / 100) + 1; // float from 1 to x
              var strokeColor;
              console.log(intensity)
              if(!color) {
                  var rv = Math.floor(mag * 255) + 55;
                  strokeColor = 'rgb('+rv+','+rv+','+rv+')'; // a shade of gray
                  if(intensity < 1.6) return; // dont do off beats
              } else {
                  strokeColor = z(i++); // colors from d3
              }
              svg.append("svg:circle")
                  .attr("cx", self.cx())
                  .attr("cy", self.cy())
                  .attr("r", 1e-6)
                  .style("stroke", strokeColor)
                  .style("stroke-width", mag*100)
                  .style("stroke-opacity", 1)
                .transition()
                  .duration(txDuration * intensity)
                  .ease(Math.sqrt)
                  .attr("r", r)
                  .style("stroke-opacity", 1e-6)
                  .remove();
            }
            
            if(!player.device.device) {
                console.log('device not ready');
                return;
            }
            console.log(player);
            var dancerSource = player.device;
            var dancer = new Dancer();
            var kickOpts = {
              onKick: function ( mag ) {
                //console.log('onKick! '+mag);
                particle(mag*2, true);
              }
            }
            
            if(window.navigator.userAgent.indexOf('iPhone') === -1) {
                kickOpts.offKick = function ( mag ) {
                  //console.log('offKick '+mag);
                  particle(mag, false);
                }
            } else {
                particle(1, false);
            }
            particle(.5, true);
            
            var kick = dancer.createKick(kickOpts);
            
            var toggleLeftRight = function() {
                self.leftRight = !self.leftRight;
                self.upDownCenter = (b % 3);
                if(prog) prog = 0;
                else prog = (b % 4);
            }
            setInterval(function(){
                toggleLeftRight();
            }, 22000);
            //toggleLeftRight();
            
            kick.on();
            
            dancer.load(dancerSource);
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
            var searchStr = this.$search.val().trim();
            var regex = new RegExp(searchStr.replace(/\s+/g, '.*'), 'ig');
            for(var i = $('.songList .song'), l = i.length; l--;){
              if(regex.test(i[l].dataset.ss)){
                  $(i[l]).parent().removeClass('hidden');
              }else{
                  $(i[l]).parent().addClass('hidden');
              }
            }
            
            // also search the server
            this.options.library.songListView.collection.search(searchStr);
        }
    });
    
    var SongModel = Backbone.Model.extend({
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
                    var songqCollection = JukeBoxQueue.songsQueueList.collection;
                    var songq = new SongqModel({}, {collection: songqCollection});
                    songq.on("change", function(songq, options){
                        var s = songq.save(null, {silent: true, wait: true});
                        s.done(function(s, typeStr, respStr) {
                            self.trigger('saved', songq);
                            songqCollection.add(songq);
                        });
                    });
                    var newSongq = {
                        song: songModel.attributes,
                        room_id: roomId
                    };
                    songq.set(newSongq, {wait: true});
                });
            }
            return this[viewType];
        }
    });
    
    var SongCollection = Backbone.Collection.extend({
        model: SongModel,
        url: '/api/songs',
        initialize: function(docs, options) {
            var self = this;
        }, load: function(callback) {
            var self = this;
            this.reset();
            var limit = 4000;
            var skip = 0;
            var loadMore = function(limit) {
                skip = skip + limit;
                self.fetch({add:true, data: {sort: 'playCount', limit: limit, skip: skip}, complete: fetchComplete});
            }
            var fetchComplete = function(xresp){ 
                if(xresp.responseText && xresp.responseText.length > 0 && xresp.responseText !== '[]') {
                    setTimeout(function(){
                        //limit = limit + 500;
                        loadMore(limit);
                    }, 10000);
                }
            }
            this.fetch({add:true, data: {sort: 'playCount', limit: 100}});
        }, search: function(term) {
            var self = this;
            if(this.searching) return;
            this.searching = true;
            this.fetch({add:true, data: {ss: term, sort: 'playCount-', limit: 100}, complete: function(){
                self.searching = false;
            }});
        }, comparator: function(a,b) {
            return a.get('playCount') > b.get('playCount');
        }
    });
    
    var SongListView = Backbone.View.extend({
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
                $li.attr('data-rank', doc.get('playCount'));
                //self.$ul.prepend($li);
                
                if(self.$ul.children().length === 0) {
                    self.$ul.append($li);
                } else {
                    var inserted = false;
                    self.$ul.find('li').each(function(i,e){
                        if(!inserted && $(e).attr('data-rank') > doc.get('playCount')) {
                            $(e).before($li);
                            inserted = true;
                        }
                    });
                    if(!inserted) {
                        self.$ul.append($li);
                    }
                }
                
                
                doc.on('remove', function(){
                    $li.remove();
                    return false;
                });
            });
            //this.collection.load();
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
    
    var SongqModel = Backbone.Model.extend({
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
    
    var SongqCollection = Backbone.Collection.extend({
        model: SongqModel,
        url: '/api/songq',
        initialize: function(docs, options) {
            var self = this;
            this.fitler = {};
        }, load: function(callback) {
            var self = this;
            this.reset();
            
            this.dataFilter.sort = 'rank';
            
            var options = {data: this.dataFilter};
            options.add = true;
            
            if(callback) options.success = callback;
            this.fetch(options);
        }, comparator: function(a) {
            return a.get('rank');
        },
        addFilter: function(obj) {
            this.dataFilter = obj;
        }
    });
    
    var SongqListView = Backbone.View.extend({
        tag: 'div',
        className: 'songsQueueList',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$ul);
            this.$el.append(this.$skip);
            this.setElement(this.$el);
            return this;
        },
        sort: function() {
            var self = this;
            var prevRank = 0;
            var lis = this.$el.find('li');
            lis.each(function(i,e){
                var $e = $(e);
                var r = parseInt($e.attr('data-rank'), 10);
                if(i == 0) {
                    prevRank = r;
                } else {
                    if(r < prevRank) {
                        $(lis[i-1]).before(e);
                        self.sort();
                    }
                    prevRank = r;
                }
            });
            this.collection.each(function(m,i,c){
                m.getView().render();
            });
        },
        initialize: function(options) {
            this.$ul = $('<ul class="songs"></ul>');
            this.$skip = $('<button class="skip">☣</button>');
            var self = this;
            if(!this.collection) {
                this.collection = new SongqCollection();
                this.collection.list = this;
            }
            this.room_id = options.roomId;
            this.collection.on('reset', function() {
                self.$ul.html('');
                self.render();
            });
            this.collection.on('add', function(doc, col) {
                var $li = $('<li></li>');
                $li.attr('data-rank', doc.get('rank'));
                var view = doc.getView();
                $li.append(view.render().el);
                
                if(self.$ul.children().length === 0) {
                    self.$ul.append($li);
                } else {
                    var inserted = false;
                    self.$ul.find('li').each(function(i,e){
                        if(!inserted && $(e).attr('data-rank') > doc.get('rank')) {
                            $(e).before($li);
                            inserted = true;
                        }
                    });
                    if(!inserted) {
                        self.$ul.append($li);
                    }
                }
                
                doc.on('remove', function(){
                    $li.remove();
                    return false;
                });
            });
            this.collection.addFilter({room_id: options.roomId});
            this.collection.load();
            
            var insertOrUpdateSongQ = function(songq) {
                var model = self.collection.get(songq.id);
                if(!model) {
                    var model = new SongqModel(songq);
                    self.collection.add(model);
                } else {
                    var view = model.getView();
                    model.set(songq, {silent:true});
                    view.render();
                    self.sort();
                }
            }
            chatSocket.on('songq', function(songq) {
                if(_.isArray(songq)) {
                    for(var i in songq) {
                        insertOrUpdateSongQ(songq[i]);
                    }
                } else {
                    if(songq.hasOwnProperty('deleted_id')) {
                        self.collection.remove(songq.deleted_id);
                    } else {
                        insertOrUpdateSongQ(songq);
                    }
                }
            });
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
            console.log('skip song in room '+this.room_id);
            if(confirm("Are you sure that you want to skip the song in the room? "+this.room_id)) {
                chatSocket.emit('skip', {room_id: this.room_id});
            }
        }
    });
    
    var UserAvatar = Backbone.View.extend({
        tagName: 'span',
        className: 'user',
        render: function() {
            console.log(this.model);
            if(!this.model) return this;
            this.$el.html('');
            var $avatar = $('<img src="/jukebox/assets/img/icons/library.png" />');
            if(this.model && this.model.has('avatar')) {
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
            var hoverTitle = this.model.get('song').ss;
            
            this.$el.html('<span class="dj" title="'+this.model.get('dj').name+'"></span><span class="title">'+this.model.get('song').title+'</span> - <span class="artist">'+this.model.get('song').artist+'</span>');
            if(this.model.get('song').duration) {
                var strDur = formatSeconds(this.model.get('song').duration);
                this.$el.append('<span class="duration">'+strDur+'</span> ');
                hoverTitle += ' '+strDur;
            }
            this.$actions = $('<div class="actions"></div>');
            this.$actions.append('<button class="upAll" title="Move to top">▲</button>');
            this.$actions.append('<button class="upOne" title="Move up one spot">△</button>');
            this.$actions.append('<button class="downOne" title="Move down one spot">▽</button>');
            this.$actions.append('<button class="downAll" title="Move to bottom">▼</button>');
            this.$actions.append('<button class="remove" title="Remove from queue spot '+this.model.get('rank')+'">x</button>');
            this.$el.append(this.$actions);
            this.$el.attr('title', hoverTitle);
            this.$el.attr('data-id', this.model.get('id'));
            this.$el.find('.dj').append(this.userAvatar.render().el);
            this.setElement(this.$el);
            this.$el.attr('data-rank', this.model.get('rank'));
            this.$el.parent().attr('data-rank', this.model.get('rank'));
            
            this.$el.append('<meter min="0.0" max="100.0" value="0.1"></meter>');
            
            return this;
        },
        initialize: function() {
            var self = this;
            this.user = window.usersCollection.get(this.model.get('dj').id);
            this.userAvatar = new UserAvatar({model: this.user});
        },
        events: {
            "click .remove": "unqueueSong"
            , "click .upAll": "queueToTop"
            , "click .downAll": "queueToBottom"
            , "click .upOne": "queueUpOne"
            , "click .downOne": "queueDownOne"
        },
        queueToTop: function() {
            var self = this;
            self.model.collection.sort({silent: true});
            var topRank = parseInt(self.model.collection.at(0).get('rank'),10);
            var topModel = self.model.collection.at(0);
            topModel.save({rank: topRank-1}, {wait: true})
                .done(function(s, typeStr, respStr) {
                });
            
            var s = self.model.save({rank: topRank}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
        },
        queueToBottom: function() {
            var self = this;
            self.model.collection.sort({silent: true});
            var bottomRank = this.model.collection.last().get('rank') + 1;
            var s = this.model.save({rank: bottomRank}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
        },
        queueUpOne: function() {
            var self = this;
            self.model.collection.sort({silent: true});
            var r = self.model.get('rank');
            var higherRank = r - 1;
            var sibId = this.$el.parents('li').prev().find('.songq').attr('data-id');
            var swapModel = self.model.collection.get(sibId);
            var sm = swapModel.save({rank:r}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
            var s = self.model.save({rank: higherRank}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
        },
        queueDownOne: function() {
            var self = this;
            self.model.collection.sort({silent: true});
            var r = self.model.get('rank');
            var lowerRank = r + 1;
            var sibId = this.$el.parents('li').next().find('.songq').attr('data-id');
            var swapModel = self.model.collection.get(sibId);
            var sm = swapModel.save({rank:r}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
            var s = self.model.save({rank: lowerRank}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
        },
        unqueueSong: function() {
            this.model.destroy();
        }
    });
    
    
    var SongpModel = Backbone.Model.extend({
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
    
    var SongpCollection = Backbone.Collection.extend({
        model: SongpModel,
        url: '/api/songp',
        initialize: function(docs, options) {
            var self = this;
            this.fitler = {};
        }, load: function(callback) {
            var self = this;
            this.reset();
            this.dataFilter.limit = 15;
            this.dataFilter.sort = 'pAt-';
            var options = {data: this.dataFilter};
            options.add = true;
            
            if(callback) options.success = callback;
            this.fetch(options);
        }, comparator: function(a,b) {
            return a.get('pAt') < b.get('pAt');
        },
        addFilter: function(obj) {
            this.dataFilter = obj;
        }
    });
    
    var SongpListView = Backbone.View.extend({
        tag: 'div',
        className: 'songsPlayedList',
        render: function() {
            this.$el.html('');
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
                $li.attr('data-pAt', doc.get('pAt'));
                
                if(self.$ul.children().length === 0) {
                    self.$ul.append($li);
                } else {
                    var inserted = false;
                    self.$ul.find('li').each(function(i,e){
                        if(!inserted && $(e).attr('data-pAt') > doc.get('pAt')) {
                            $(e).before($li);
                            inserted = true;
                        }
                    });
                    if(!inserted) {
                        self.$ul.append($li);
                    }
                }
                
                doc.on('remove', function(){
                    $li.remove();
                    return false;
                });
            });
            this.collection.addFilter({room_id: options.roomId});
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
            
            jukeboxNav.go('Queue');
        }
    });
    
    var SongpRow = Backbone.View.extend({
        tag: 'span',
        className: 'songp',
        render: function() {
            if(this.model.has('song') && this.model.has('dj')) {
                this.$el.html('<span class="dj" title="'+this.model.get('dj').name+'"></span><span class="title">'+this.model.get('song').title+'</span> - <span class="artist">'+this.model.get('song').artist+'</span>');
                this.$el.find('.dj').append(this.userAvatar.render().el);
            }
            if(this.model.has('pAt')) {
                this.$el.append('<span class="pAt" title="'+this.model.get('pAt')+'">'+moment(this.model.get('pAt')).fromNow()+'</span>');
            }
            this.$el.attr('data-id', this.model.get('id'));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            if(this.model.get('dj')) {
                this.user = window.usersCollection.get(this.model.get('dj').id);
                this.userAvatar = new UserAvatar({model: this.user});
            }
        },
        events: {
        }
    });
    
    var formatSeconds = function(seconds) {
        var str = '';
        str = Math.floor(seconds/60) +':'+ pad(Math.floor(seconds%60));
        return str;
    }
    
    var SongRow = Backbone.View.extend({
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
            if(this.model.has('playCount')) {
                str += '<span class="playCount" title="last played '+moment(this.model.get('lastPlayedAt')).fromNow()+'">'+this.model.get('playCount')+' plays</span>';
            }
            if(this.model.has('lastPlayedAt')) {
                str += '<span class="lastPlayedAt" style="display:none;" title="'+this.model.get('lastPlayedAt')+'">'+moment(this.model.get('lastPlayedAt')).fromNow()+'</span>';
            }
            this.$actions = $('<div class="actions"></div>');
            this.$actions.html('<button class="delete" title="Delete Song">✘</button><button class="edit" title="Edit Song">✎</button><button class="download" title="Download '+this.model.get('filename')+'">▼</button><button class="play" title="Preview Song">▸</button><button class="queue" title="Queue Song">❥</button>');
            this.$el.html(str);
            this.$el.append(this.$actions);
            this.$el.attr('data-id', this.model.get('id'));
            this.$el.attr('data-ss', this.model.get('ss'));
            this.setElement(this.$el);
            return this;
        },
        renderForm: function() {
            this.$el.children().hide();
            this.$f = $('<form></form>');
            var $duration = $('<input type="text" placeholder="duration" name="duration" />');
            var $title = $('<input type="text" placeholder="title" name="title" />');
            var $artist = $('<input type="text" placeholder="artist" name="artist" />');
            var $album = $('<input type="text" placeholder="album" name="album" />');
            
            $title.val(this.model.get('title'));
            
            if(this.model.has('duration')) {
                $duration.val(this.model.get('duration'));
            }
            if(this.model.has('artist')) {
                $artist.val(this.model.get('artist'));
            }
            if(this.model.has('album')) {
                $album.val(this.model.get('album'));
            }
            
            this.$f.append($duration);
            this.$f.append($title);
            this.$f.append($artist);
            this.$f.append($album);
            this.$f.append('<input type="submit" value="save" /><button class="cancel">cancel</button>');
            
            this.$el.append(this.$f);
            
            $title.focus();
        },
        removeForm: function() {
            this.$f.remove();
            this.$el.children(':not(button)').show();
        },
        initialize: function() {
            var self = this;
        },
        events: {
            "click .queue": "queueSong"
            , "click .play": "playSong"
            , "click .edit": "editSong"
            , "click .delete": "deleteSong"
            , "click .download": "download"
            , "submit": "submit"
            , "click .cancel": "cancel"
        },
        download: function() {
            window.open('/api/files/'+this.model.get('filename'));
        },
        cancel: function() {
            this.removeForm();
            return false;
        },
        submit: function() {
            var self = this;
            var newObj = {};
            var sa = this.$f.serializeArray();
            for(var i in sa) {
                var field = sa[i].name;
                newObj[field] = sa[i].value;
            }
            var s = self.model.save(newObj, {silent: true, wait: true})
                .done(function(s, typeStr, respStr) {
                    delete self.model.changed.at;
                    delete self.model.changed.id;
                    delete self.model.changed.user;
                    self.trigger('saved', self.model);
                    self.render();
                });
            self.removeForm();
            
            return false;
        },
        editSong: function() {
            //formInPlace
            this.renderForm();
        },
        deleteSong: function() {
            if(confirm("Are you sure that you want to delete this song?")) {
                
                // delete the file as well
                var url = '/api/files/'+this.model.get('file_id');
                $.ajax({url: url, type: "DELETE"}).done(function(){
                });
                
                this.model.destroy();
            }
        },
        playSong: function() {
            // play song
            if(!this.previewing) {
                this.previewing = true;
                JukeBoxPreviewer.loadSong('/api/files/'+encodeURIComponent(this.model.get('filename')), this.model.attributes);
                JukeBoxPreviewer.$el.removeClass('hidden');
                JukeBoxPlayer.$el.addClass('hidden');
                if(JukeBoxPlayer.player) JukeBoxPlayer.player.volume = 0;
                JukeBoxPlayer.playerVolume = 0;
                this.$el.find('.play').html('=');
            } else {
                this.previewing = false;
                JukeBoxPreviewer.player.stop();
                JukeBoxPreviewer.$el.addClass('hidden');
                JukeBoxPlayer.$el.removeClass('hidden');
                JukeBoxPlayer.player.volume = 100;
                JukeBoxPlayer.playerVolume = 100;
                this.$el.find('.play').html('▸');
            }
        },
        queueSong: function() {
            this.$el.attr('data-queue', true);
            this.$el.siblings().removeAttr('data-queue');
            //console.log('queue to room id '+$('.chatroom[selected]').attr('data-id'))
            this.trigger('queue', this.model, $('.chatroom[selected]').attr('data-id'));
        }
    });
    
    var SongRatingModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var self = this;
            if(!this.hasOwnProperty('view')) {
                if(!options) options = {};
                options.model = this;
                this.view = new SongRatingRow(options);
            }
            return this.view;
        }
    });
    
    var SongRatingCollection = Backbone.Collection.extend({
        model: SongRatingModel,
        url: '/api/songr',
        initialize: function(docs, options) {
            var self = this;
        }, load: function(callback) {
            var self = this;
            this.dataFilter.sort = 'at-';
            var options = {data: this.dataFilter, add: true};
            if(callback) options.success = callback;
            this.reset();
            this.fetch(options);
        }, comparator: function(a,b) {
            return a.get('at') > b.get('at');
        },
        addFilter: function(obj) {
            this.dataFilter = obj;
        }
    });
    
    var SongRatingListView = Backbone.View.extend({
        tag: 'div',
        className: 'songRatingList',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            
            return this;
        },
        initialize: function(options) {
            this.$ul = $('<ul class="songs"></ul>');
            var self = this;
            if(!this.collection) {
                this.collection = new SongRatingCollection();
                if(options.song_id) {
                    this.collection.addFilter({song_id:options.song_id});
                }
            }
            this.collection.on('add', function(doc, col) {
                var $li = $('<li></li>');
                var view = doc.getView();
                $li.append(view.render().el);
                $li.attr('data-id', doc.get('id'));
                $li.attr('data-ts', doc.get('ts'));
                //self.$ul.prepend($li);
                
                if(self.$ul.children().length === 0) {
                    self.$ul.append($li);
                } else {
                    var inserted = false;
                    self.$ul.find('li').each(function(i,e){
                        if(!inserted && $(e).attr('data-ts') > doc.get('ts')) {
                            $(e).before($li);
                            inserted = true;
                        }
                    });
                    if(!inserted) {
                        self.$ul.append($li);
                    }
                }
                
                doc.on('remove', function(){
                    $li.remove();
                    return false;
                });
            });
            this.collection.load();
            var insertOrUpdateSongRating = function(songr) {
                
                if(songr.song_id !== options.song_id) return;
                
                var r = self.collection.get(songr.id);
                if(!r) {
                    var songRating = new SongRatingModel(songr);
                    self.collection.add(songRating);
                } else {
                    var view = r.getView();
                    if(!view.editing) {
                        r.set(songr, {silent:true});
                        view.render();
                    }
                }
            }
            chatSocket.on('songr', function(songr) {
                if(_.isArray(songr)) {
                    for(var i in songr) {
                        insertOrUpdateSongRating(songr[i]);
                    }
                } else {
                    setTimeout(function(){
                        insertOrUpdateSongRating(songr);
                    },1000);
                }
            });
            
            self.on('currentTime', function(t) {
                var ts = Math.floor(t/1000);
                
                self.$ul.find('li:not(.highlight)').each(function(i,e){
                    if(parseInt($(e).attr('data-ts'),10) < ts) {
                        $(e).addClass('highlight');
                    }
                });
            });
        },
        events: {
            "click li": "selectLi"
        },
        selectLi: function(el) {
            $(el.target).parent('li').attr('selected', true);
            $(el.target).parent('li').siblings().removeAttr('selected');
        }
    });
    
    var SongRatingRow = Backbone.View.extend({
        tag: 'span',
        className: 'songRating',
        render: function() {
            
            if(!this.user && this.model.has('dj')) {
                this.user = window.usersCollection.get(this.model.get('dj').id);
                this.userAvatar = new UserAvatar({model: this.user});
            }
            var ts = '';
            if(this.model.has('ts')) {
               ts = ' @ '+formatMsTime(this.model.get('ts') * 1000);
            }
            
            var score = this.model.get('score');
            var goodBad = (score < 50) ? 'bad' : 'good';
            var w = Math.abs(score - 50);
            this.$el.html('<span class="bar '+goodBad+'" style="width:'+w+'%"><span class="user"></span></span>');
            if(this.model.has('msg')) {
                this.$el.append('<span class="msg">'+this.model.get('msg')+'</span>');
            }
            this.$el.prepend(this.$f);
            this.$el.attr('data-id', this.model.get('id'));
            this.$el.attr('data-ts', this.model.get('ts'));
            if(this.userAvatar) {
                this.$el.find('.user').append(this.userAvatar.render().el);
            }
            this.setElement(this.$el);
            if(this.editing) {
                this.showMsgForm();
            }
            return this;
        },
        initialize: function() {
            var self = this;
            var formStyle = 'display:none';
            this.$f = $('<form data-id="'+this.model.get('id')+'" style="'+formStyle+'"><input type="text" placeholder="add a comment" name="msg" autocomplete="off" /><input type="submit" value="comment" /></form>');
            this.$msg = this.$f.find('input[name="msg"]');
        },
        events: {
            "submit": "submit"
        },
        submit: function(el) {
            var self = this;
            
            this.hideMsgForm();
            this.model.set({msg: this.$msg.val()}, {wait: true});
            this.render();
            
            return false;
        },
        clear: function() {
            this.$msg.val('');
            this.render();
            this.focus();
        },
        focus: function() {
            this.$msg.focus();
        },
        toggleForm: function() {
            if(this.editing) {
                this.hideMsgForm();
            } else {
                this.showMsgForm();
            }
        },
        showMsgForm: function() {
            this.$f.show();
            this.$f.removeAttr('style');
            this.focus();
            this.editing = true;
        },
        hideMsgForm: function() {
            this.$f.hide();
            this.editing = false;
        }
    });
    
    
    //
    // init
    //
    // - init authentication
    // - load required scripts
    //
    jukebox.init = function($el, callback) {
        var self = this;
        this.initAuth(function(loginStatus){
            var $app = $('<div id="app"></div>');
            $el.append($app);
            
            require(['aurora.js'], function() {
                require(['mp3.js'], function() { require(['flac.js'], function() { require(['alac.js'], function() { require(['aac.js'], function() {
                    require(['dancer.js'], function() {
                        require(['d3.v2.min.js'], function(d3) {
                            require(['moment.min.js'], function(){
                                self.view = new AppView({el: $app});
                                
                                self.view.render();
                                
                                if(callback) callback();
                            });
                        });
                    });
                }); }); }); });
            });
        });
    }
    
    //
    // initAuth
    //
    jukebox.initAuth = function(callback) {
        require(['houseAuth.js'], function(auth) {
            auth.get(function(err, loginStatus){
                var $profile = $('<div id="me"></div>');
                $('body').append($profile);
                if(err) {
                    
                } else if(loginStatus) {
                    callback(loginStatus);
                    
                    if(loginStatus && loginStatus.has('config')) {
                        window.config = loginStatus.get('config');
                    }
                    
                    if(loginStatus && loginStatus.has('user')) {
                        jukebox.user = loginStatus.user;
                        var profileView = loginStatus.getView();
                        $profile.html(profileView.render().el);
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
                                //callback(loginStatus);
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
