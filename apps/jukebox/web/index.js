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