//
//
//
//
//
//
(function(){

    var clock = {};

    clock.init = function(callback) {
        require(['underscore.js'], function(){
            require(['backbone.js'], function(){
                $('body').append('<div class="clock"></div>');
                require(['clock.js'], function(clock) {
                    clock.startClocks($('.clock'));
                });
                
            });
        });
    }
    
    if(define) {
        define(function () {
            return clock;
        });
    }
})();