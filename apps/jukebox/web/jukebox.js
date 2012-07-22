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
    
    var LibraryView = Backbone.View.extend({
        className: 'library',
        element: 'div',
        render: function() {
            this.$el.html('library');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            
        },
        events: {
        }
    });
    
    var MediaPlayerView = Backbone.View.extend({
        className: 'player',
        element: 'div',
        render: function() {
            this.$el.html('player <button class="playPause">Play</button><button class="next">next</button>');
            this.setElement(this.$el);
            return this;
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
                
                window.testLoader = function() {
                    self.loadSong('/api/files/02%20Dashboard.mp3');
                }
                self.loadSong('/api/files/01%20March%20into%20the%20Sea.mp3');
                
            });
        },
        events: {
            "click button.playPause": "playPause"
            , "click button.next": "next"
        },
        loadSong: function(fileName) {
            var self = this;
            var dancer = new Dancer(fileName);
            dancer.bind('loaded', function(){
                console.log('loaded');
                self.$el.find('.playPause').html('Stop');
                
                if(self.dancers.length > 1) {
                    var prevDancer = self.dancers.shift();
                    prevDancer.stop();
                }
                
                dancer.play();
                var duration = dancer.audioAdapter.buffer.duration;
                var interval = setInterval(function(){
                    var currentTime = dancer.getTime();
                    if(currentTime > duration) {
                        clearTimeout(interval);
                    }
                }, 1000);
            });
            window.dancer = dancer;
            
            // Waveform test
            $('body').append('<canvas id="waveform" />');
            var canvas = document.getElementById('waveform');
            dancer.waveform( canvas, { strokeStyle: '#ff0077' });
            
            self.$el.find('.playPause').html('Loading');
            this.dancers.push(dancer);
        },
        next: function() {
            this.loadSong('/api/files/02%20Dashboard.mp3');
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
    
    jukebox.init = function($el, callback) {
        var self = this;
        if($el) {
            self.view = new AppView({el: $el});
            self.view.render();
        }
    }
    
    if(define) {
        define(function () {
            return jukebox;
        });
    }
})();
