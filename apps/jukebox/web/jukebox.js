//
//
//
(function(){

    var jukebox = {};
    
    var AppView = Backbone.View.extend({
        render: function() {
            this.$el.html('jukebox');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
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
