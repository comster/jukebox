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