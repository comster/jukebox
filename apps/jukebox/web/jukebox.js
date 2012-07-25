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
            
            this.headerNavView.go('Player');
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.$appHeader = $('<header id="jukeHead"><center>Loading..</center></header>');
            this.$appFrames = $('<div id="frames"></div>');
            
            this.headerNavView = new HeaderNavView({el:this.$appHeader, "$frames": this.$appFrames});
            self.headerNavView.render();
            this.headerNavView.addView('Queue', new QueueView({el: $('<div id="queue"></div>')}));
            this.headerNavView.addView('Player', new MediaPlayerView({el: $('<div id="mediaPlayer"></div>')}));
            this.headerNavView.addView('Library', new LibraryView({el: $('<div id="library"></div>')}));
            require(['houseChat.js'], function(houseChat) {
                self.headerNavView.addView('Chat', new houseChat.AppView({el: $('<div id="chat"></div>')}));
            });
        },
        events: {
        }
    });
    
    var HeaderNavView = Backbone.View.extend({
        addView: function(viewName, view) {
            this.views[viewName] = view;
            window[viewName+"View"] = view;
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
        initialize: function() {
            var self = this;
            this.$div = $('<div>Queue</div>');
            
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
        //htmlTemplate: 'Upload Files <iframe src="upload.html"></iframe>',
        htmlTemplate: '<input type="file" webkitdirectory directory multiple mozdirectory onchange="fileChangeListener(this.files)"><div class="uploadFiles"></div>',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.append(this.$up);
            this.setElement(this.$el);
            this.$t = this.$el.find('table');
            return this;
        },
        initialize: function() {
            window.fileChangeListener = this.inputChange;
            this.$up = $(this.template({}));
            console.log(this.options);
        },
        events: {
            //"change input": "inputChange"
        },
        inputChange: function(files) {
            var self = this;
            function runSearch(query){
              var regex = new RegExp(query.trim().replace(/\s+/g, '.*'), 'ig');
              for(var i = this.$t.find('tr'), l = i.length; l--;){
                if(regex.test(i[l].innerHTML)){
                  i[l].className = 'visible'
                }else{
                  i[l].className = 'hidden';
                }
              }
            }
            
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
                  console.log(e);
                  console.log(e.target.response);
                  var data = JSON.parse(e.target.response);
                  
                  if(data.hasOwnProperty('song')) {
                    LibraryView.songListView.collection.add(new SongModel(data.song));
                  }
                  
                  $row.remove();
              };
            
              // Listen to the upload progress.
              var progressBar = $row.find('progress');
              xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                  progressBar.val((e.loaded / e.total) * 100);
                  //progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
                  console.log('upload '+progressBar.val());
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
                      
                      var $localFile = $('<div class="localFile"></div>');
                      var $actions = $('<div class="actions"></div>');
                      var $title = $('<div class="title"></div>');
                      var $artist = $('<div class="artist"></div>');
                      var $album = $('<div class="album"></div>');
                      var $year = $('<div class="year"></div>');
                      var $genre = $('<div class="genre"></div>');
                      
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
                      
                      var $playMedia = $('<button>play</button>').click(function(){
                          mediaPlayer.loadSong(f);
                          return false;
                      });
                      
                      var $uploadMedia = $('<button>upload</button>').click(function(){
                          var $localFile = $(this).parents('.localFile');
                          $localFile.find('progress').show();
                          uploadFile(f, $localFile);
                          $uploadMedia.remove();
                          return false;
                      });
                      
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
            this.searchFrame = new SearchView({library:this});
            this.songListView = new SongListView({library:this});
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
            this.$el.html('<meter min="0.0" max="100.0" value="0"></meter><span class="loading"></span><span class="songInfo"></span><span class="currentTime"></span><span class="duration"></span> <span class="progress"></span>'); //<button class="next">skip</button>
            if(this.song) {
                //this.$el.find('.songInfo').html(this.song.get('artist')+' - '+this.song.get('title'));
            }
            
            this.$el.append(this.$canvas);
            this.$el.append(this.$viz);
            
            this.setElement(this.$el);
            return this;
        },
        renderDuration: function() {
            var p = 0;
            if(this.player.duration) {
                var d = this.player.duration / 1000;
                var t = this.player.currentTime / 1000;
                p = (t / d) * 100;
                console.log(p);
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
            
            str += this.metadata.title ? this.metadata.title + ' - ' : '';
            str += this.metadata.artist ? this.metadata.artist : '';
            str += this.metadata.album ? ' on '+this.metadata.album : '';
            str += this.metadata.year ? ' '+this.metadata.year : '';
            console.log(str);
            this.$el.find('.songInfo').html(str);
        },
        initialize: function() {
            var self = this;
            this.$canvas = $('<canvas id="waveform" />');
            this.$viz = $('<div id="vizual"></div>');
            window.mediaPlayer = this;
        },
        events: {
            "click button.playPause": "playPause"
            , "click button.next": "next"
        },
        loadSong: function(fileName, song) {
            if(fileName == this.currentFileName) return;
            this.currentFileName = fileName;
            var self = this;
            var player;
            
            self.$el.find('.loading').html('Loading...');
            
            if(typeof fileName == 'string') {
                player = Player.fromURL(fileName);
            } else {
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
            console.log(fileName)
            
            player.on('error', function(err){
                console.log(err);
            });
            console.log(player)
            player.on('buffer', function(percent){
            });
            player.on('ready', function(){
                self.$el.find('.loading').html('');
                player.play();
            });
            player.on('progress', function(msecs){
                console.log(self.player.duration);
                console.log(self.player.currentTime);
                console.log(msecs);
                console.log('song played '+msecs);
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
                self.renderSongInfo();
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
                console.log(arguments);
            });
            
            this.visualizePlayer(player);
            
            player.preload();
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
        initialize: function() {
            this.$search = $('<input type="text" name="query" placeholder="search for tunes" />');
        },
        events: {
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
            var viewType = 'SongRow';
            if(options && options.hasOwnProperty('viewType')) {
                viewType = options.viewType;
            }
            if(!this.hasOwnProperty(viewType)) {
                if(!options) options = {};
                options.model = this;
                this[viewType] = new SongRow(options);
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
        //}, comparator: function(a,b) {
            //return a.get('name') > b.get('name');
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
    
    SongRow = Backbone.View.extend({
        tag: 'span',
        className: 'song',
        render: function() {
            this.$el.html('<button class="queue">Q</button><button class="play">Play</button><span class="artist">'+this.model.get('artist')+'</span><span class="title">'+this.model.get('title')+'</span>');
            this.$el.attr('data-id', this.model.get('id'));
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
            mediaPlayer.loadSong('/api/files/'+encodeURIComponent(this.model.get('filename')), this.model);
            window.socketSong($('.chatroom[selected]').attr('data-id'), '/api/files/'+encodeURIComponent(this.model.get('filename')));
        },
        queueSong: function() {
            this.$el.attr('data-queue', true);
            this.$el.siblings().removeAttr('data-queue');
        }
    });
    
    jukebox.init = function($el, callback) {
        var self = this;
        this.initAuth(function(){
            if($el) {
                var $app = $('<div id="app"></div>');
                $el.append($app);
                require(['aurora.js'], function() {
                    require(['mp3.js'], function() {
                        require(['dancer.js'], function() {
                        self.view = new AppView({el: $app});
                        
                        self.view.render();
                        
                        if(callback) callback();
                        });
                    });
                });
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
                            });
                        }
                    }
                }
                callback();
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
