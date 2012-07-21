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