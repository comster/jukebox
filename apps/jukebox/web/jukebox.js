//
//
//
(function(){

    var jukebox = {};
    
    var AppView = Backbone.View.extend({
        render: function() {
            this.$el.html('jukebox');
            
            this.$el.append(this.libraryView.render().el);
            this.$el.append(this.playerView.render().el);
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.libraryView = new LibraryView({});
            this.playerView = new MediaPlayerView({});
        },
        events: {
        }
    });
    
    var UploadFrame = Backbone.View.extend({
        tagName: "span",
        className: "uploadFrame",
        htmlTemplate: 'Upload Files <iframe src="upload.html"></iframe>',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html(this.template({}));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var LibraryView = Backbone.View.extend({
        className: 'library',
        element: 'div',
        render: function() {
            this.$el.html('library');
            this.$el.append(this.uploadFrame.render().el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.uploadFrame = new UploadFrame();
        },
        events: {
        }
    });
    
    var MediaPlayerView = Backbone.View.extend({
        className: 'player',
        element: 'div',
        render: function() {
            this.$el.html('<span class="progress"></span><span class="currentTime"></span><span class="duration"></span><button class="next">skip</button>');
            this.setElement(this.$el);
            return this;
        },
        renderDuration: function() {
            console.log(this.duration)
            var t = this.duration - this.currentTime;
            if(t) {
                this.$el.find('.progress').html('-'+Math.floor(t/60) +':'+ pad(Math.floor(t%60)));
            }
        },
        initialize: function() {
            var self = this;
            this.dancers = [];
            require(['dancer.js'], function() {
                Dancer.addPlugin( 'waveform', function( canvasEl, options ) {
                  options = options || {};
                  var
                    ctx     = canvasEl.getContext( '2d' ),
                    h       = canvasEl.height,
                    w       = canvasEl.width,
                    width   = options.width || ( Dancer.isSupported() === 'flash' ? 2 : 1 ),
                    spacing = options.spacing || 0,
                    count   = options.count || 1024;
                
                  ctx.lineWidth   = options.strokeWidth || 1;
                  ctx.strokeStyle = options.strokeStyle || "white";
                
                  this.bind( 'update', function() {
                    var waveform = this.getWaveform();
                    ctx.clearRect( 0, 0, w, h );
                    ctx.beginPath();
                    ctx.moveTo( 0, h / 2 );
                    for ( var i = 0, l = waveform.length; i < l && i < count; i++ ) {
                      ctx.lineTo( i * ( spacing + width ), ( h / 2 ) + waveform[ i ] * ( h / 2 ));
                    }
                    ctx.stroke();
                    ctx.closePath();
                  });
                
                  return this;
                });
                Dancer.addPlugin( 'fft', function( canvasEl, options ) {
                  options = options || {};
                  var
                    ctx     = canvasEl.getContext( '2d' ),
                    h       = canvasEl.height,
                    w       = canvasEl.width,
                    width   = options.width || 1,
                    spacing = options.spacing || 0,
                    count   = options.count || 512;
                
                  ctx.fillStyle = options.fillStyle || "white";
                
                  this.bind( 'update', function() {
                    var spectrum = this.getSpectrum();
                    ctx.clearRect( 0, 0, w, h );
                    for ( var i = 0, l = spectrum.length; i < l && i < count; i++ ) {
                      ctx.fillRect( i * ( spacing + width ), h, width, -spectrum[ i ] * h );
                    }
                  });
                
                  return this;
                });
                
                self.loadSong('/api/files/03%20Hearing%20Damage%20-%20Thom%20Yorke.mp3');
                
            });
        },
        events: {
            "click button.playPause": "playPause"
            , "click button.next": "next"
        },
        loadSong: function(fileName) {
            var self = this;
            var dancer = new Dancer(fileName);
            
            var beat = dancer.createBeat({
                onBeat: function ( mag ) {
                  particle(mag); //pass in mag
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
              //object.y = this.getFrequency( 400 );
            }).onceAt( 120, function() {
              // After 120s, we'll turn the beat off as another object's y position is still being mapped from the previous "after" method
              beat.off();
            });
            
            dancer.bind('loaded', function(){
                console.log('loaded');
                self.$el.find('.playPause').html('Stop');
                
                if(self.dancers.length > 1) {
                    var prevDancer = self.dancers.shift();
                    prevDancer.stop();
                }
                
                dancer.play();
                self.duration = dancer.audioAdapter.buffer.duration;
                var interval = setInterval(function(){
                    self.currentTime = dancer.getTime();
                    if(self.currentTime > self.duration) {
                        clearTimeout(interval);
                    }
                    self.renderDuration();
                }, 1000);
                self.renderDuration();
            });
            window.dancer = dancer;
            
            var w = 960,
                h = 500,
               z = d3.scale.category20c(),
               i = 0;

            var svg = d3.select("body").append("svg:svg")
               .attr("width", w)
               .attr("height", h)
               //.style("pointer-events", "all")
               //.on("mousemove", particle);
            
            function particle() {
             //var m = d3.svg.mouse(this);
            
             svg.append("svg:circle")
                 .attr("cx", Math.random()*w)
                 .attr("cy", Math.random()*h)
                 .attr("r", 1e-6) //radius
                 .style("stroke", z(++i))
                 .style("stroke-opacity", 1)
               .transition()
                 .duration(2000)
                 .ease(Math.sqrt)
                 .attr("r", 100)
                 .style("stroke-opacity", 1e-6)
                 .remove();
            }
            
            // Waveform test
            $('body').append('<canvas id="waveform" />');
            var canvas = document.getElementById('waveform');
            dancer.waveform( canvas, { strokeStyle: '#ff0077' });
            
            self.$el.find('.playPause').html('Loading');
            this.dancer = dancer;
            this.dancers.push(dancer);
        },
        next: function() {
            this.loadSong('/api/files/06%20Sleep%20Ft.%20Young%20Buck,%20Chamillionaire.m4a');
        },
        playPause: function() {
            if(this.dancer.isPlaying()) {
                this.dancer.stop();
            } else {
                this.dancer.play();
            }
        },
        stop: function() {
            this.dancer.stop();
            this.$el.find('.playPause').html('Play');
        },
        play: function() {
            this.dancer.play();
            this.$el.find('.playPause').html('Pause');
        }
    });
    
    var SearchView = Backbone.View.extend({
        className: 'search',
        element: 'div',
        render: function() {
            this.$el.html('search');
            
            this.$el.append(this.$search);
            
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
            this.$el.html('library');
            this.$el.append(this.uploadFrame.render().el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.uploadFrame = new UploadFrame();
        },
        events: {
        }
    });
    
    jukebox.init = function($el, callback) {
        var self = this;
        this.initAuth(function(){
            require(['houseChat.js'], function(houseChat) {
                if($el) {
                    var $app = $('<div id="app"></div>');
                    $el.append($app);
                    
                    self.view = new AppView({el: $el});
                    self.view.render();
                }
                
                if(callback) callback();
            });
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
                                console.log(loginStatus)
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
