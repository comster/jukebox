//
//
//
//
//
//
(function(){

    var nav = {};
    
    var NavItem = Backbone.Model.extend({
        initialize: function() {
        },
        getRow: function(options) {
            
            if(!this.hasOwnProperty('row')) {
                options.model = this;
                this.row = new NavRow(options);
            }
            
            return this.row;
        }
    });
    
    var NavCollection = Backbone.Collection.extend({
        model: NavItem,
        initialize: function() {
            var self = this;
        }
    });

    var NavList = Backbone.View.extend({
        render: function() {
            var self = this;
            
            //this.$el.html('');
            
            this.$el.append(this.$ul);
            
            this.$ul.html('');
            //this.collection.sort({silent:true});
            this.collection.each(function(doc){
                var view;
                view = doc.getRow({list: self});
                
                //self.appendRow(view.render().el);
                self.$ul.append(view.render().el);
            });
            
            return this;
        },
        initialize: function() {
            var self = this;
            
            var $ul = this.$ul = $('<ul></ul>');
            
            this.collection.bind("add", function(doc) {
                var view;
                view = doc.getRow({list: self});
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
    
    var NavRow = Backbone.View.extend({
        
        tagName: "li",
        
        className: "navRow",
    
        htmlTemplate: '<span class="navLink">\
                            <%= imgHtml %>\
                            <a href="<%= href %>"><%= a %></a>\
                        </span>',
        
        template: function(doc) {
            doc.imgHtml = '';
            if(doc.imgSrc) {
                doc.imgHtml = '<img src="'+doc.imgSrc+'" />';
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
          "click": "select",
          "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            this.options.list.trigger('selected', this);
            return false;
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    


    nav.render = function(el) {
        if(!nav.hasOwnProperty('list')) {
            nav.col = new NavCollection();
            nav.list = new NavList({el: el, collection: nav.col});
        }
        nav.list.render();
    }
    
    if(define) {
        define(function () {
            return nav;
        });
    }
})();