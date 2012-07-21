// Applications!
//
//
(function(){

    var applications = {};
    
    
    var App = Backbone.Model.extend({
        initialize: function() {
        },
        getView: function(options) {
            if(!this.hasOwnProperty('view')) {
                options.model = this;
                this.view = new AppView(options);
            }
            return this.view;
        }
    });
    
    var AppCollection = Backbone.Collection.extend({
        model: App,
        url: '/api/apps',
        initialize: function() {
            var self = this;
        },
        load: function(success) {
            var self = this;
            
            this.fetch({add: true, success: function(collection, response){
                    if(success) {
                        success();
                    }
                },
                error: function(collection, response){
                }
            });
        },
    });
    
    var AppList = Backbone.View.extend({
        render: function() {
            var self = this;
            
            //this.$el.html('');
            this.$el.append(this.$ul);
            this.$ul.html('');
            //this.collection.sort({silent:true});
            this.collection.each(function(doc){
                var view;
                view = doc.getView({list: self});
                self.$ul.append(view.render().el);
            });
            
            return this;
        },
        initialize: function() {
            var self = this;
            
            var $ul = this.$ul = $('<ul></ul>');
            
            this.collection.bind("add", function(doc) {
                var view;
                view = doc.getView({list: self});
                self.appendRow(view);
            });
            
            this.collection.on('reset', function(){
                self.render();
            });
        },
        appendRow: function(row) {
            if(this.$ul.children().length === 0) {
                this.$ul.prepend(row.render().el);
            } else {
                var i = this.collection.indexOf(row);
                if(i >= 0) {
                    this.$ul.children().eq(i).before(row.render().el);
                } else {
                    this.$ul.prepend(row.render().el);
                }
            }
        }
    });
    
    var AppView = Backbone.View.extend({
        
        tagName: "li",
        
        className: "app",
    
        htmlTemplate: '<span class="icon">\
                            <a href="<%= url %>">\
                                <img src="<%= iconSrc %>" />\
                                <%= name %>\
                            </a>\
                        </span>',
        
        template: function(doc) {
            doc.iconSrc = '';
            if(doc.iosicon) {
                doc.iconSrc = doc.iosicon;
            } else if(doc.favicon) {
                doc.iconSrc = doc.favicon;
            }
            var template = $(_.template(this.htmlTemplate, doc));
            return template;
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            
            this.setElement(this.$el);
            
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click a": "go",
          "click": "select",
          "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            this.options.list.trigger('selected', this);
            //return false;
        },
        go: function() {
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    
    applications.init = function(el) {
        this.col = new AppCollection();
        if(el && !this.hasOwnProperty('list')) {
            this.list = new AppList({el: el, collection: this.col});
            this.list.render();
        }
    }
    
    if(define) {
        define(function () {
            return applications;
        });
    }
})();
