//
//
//
(function(){

    var vault = {};
    
    vault.init = function(el, callback) {
        var self = this;

        require(['restExplorer.js'], function(rest) {
            if(el) {
                var $explorer = $('<div id="explorer"></div>');
                el.append($explorer);
                
                self.explorer = new rest.Explorer({el: $explorer});
                self.explorer.render();
            }
            
            if(callback) callback();
        });
    }
    
    if(define) {
        define(function () {
            return vault;
        });
    }
})();
