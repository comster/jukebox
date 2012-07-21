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
                        if(callback) callback(chat);
                    });
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