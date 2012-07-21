//
// app
//
//
//
//
(function(){

    var app = {};
    
    app.init = function(callback) {
        require(['underscore.js'], function(){
            require(['backbone.js'], function(){
                require(['backbone-house.js'], function(){
                    require(['chat.js'], function(chat) {
                        require(['jukebox.js'], function(jukebox) {
                            console.log(jukebox)
                            require(['aurora.js'], function() {
                                require(['mp3.js'], function() {
                                    window.SelectAudio = function(files) {
                                        var file = files[0];
                                        if (file.type.match(/audio.*/)) {
                                            var player = Player.fromFile(file);
                                            player.play();
                                        }
                                    }
                                    $('body').append('<input type="file" onchange="SelectAudio(this.files)" />');
                                    
                                    window.testPlay = function() {
                                        var url = '/api/files/04%20Florida.mp3';
                                        var player = Player.fromURL(url);
                                        player.play();
                                    }
                                });
                            });
                            
                            require(['dancer.js'], function() {
                                var dancer = new Dancer( "/api/files/02%20Dashboard.mp3" ),
                                beat = dancer.createBeat({
                                  onBeat: function ( mag ) {
                                    console.log('Beat!');
                                  },
                                  offBeat: function ( mag ) {
                                    console.log('no beat :(');
                                  }
                                });
                                
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
                                
                                dancer.play();
                            });
                            if(callback) callback(chat, jukebox);
                        });
                    });
                });
            });
        });
    }
    
    if(define) {
        define(function () {
            return app;
        });
    }
})();