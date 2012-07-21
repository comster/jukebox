//
//
//
//
//
//
(function(){

    var applications = {};
    
    applications.init = function(callback) {
        require(['underscore.js'], function(){
            require(['backbone.js'], function(){
                require(['applications.js'], function(apps) {
                    if(callback) callback(apps);
                });
                
            });
        });
    }
    
    if(define) {
        define(function () {
            return applications;
        });
    }
})();