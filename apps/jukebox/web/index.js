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
                    require(['jukebox.js'], function(jukebox) {
                        if(callback) callback(jukebox);
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