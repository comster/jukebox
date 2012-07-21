//
//
//
//
//
//
(function(){

    var windows = {};
    
    var Window = Backbone.Model.extend({
        initialize: function() {
        },
        getView: function(options) {
            
            if(!this.hasOwnProperty('view')) {
                options.model = this;
                this.view = new WindowView(options);
            }
            
            return this.view;
        }
    });
    
    var WindowCollection = Backbone.Collection.extend({
        model: Window,
        initialize: function() {
            var self = this;
        }
    });

    var WindowsList = Backbone.View.extend({
        render: function() {
            var self = this;
            
            //this.$el.html('');
            
            this.$el.append(this.$ul);
            
            this.$ul.html('');
            //this.collection.sort({silent:true});
            this.collection.each(function(doc){
                var view;
                view = doc.getView({list: self});
                
                //self.appendRow(view.render().el);
                self.$ul.append(view.render().el);
            });
            
            return this;
        },
        initialize: function() {
            var self = this;
            
            var $ul = this.$ul = $('<ul id="windows"></ul>');
            
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
    
    var WindowView = Backbone.View.extend({
        
        tagName: "li",
        
        className: "window",
    
        htmlTemplate: '<div>\
                            <div class="chrome"><span class="title"><%= title %></span><span class="close" title="Close"></span><span class="min" title="Min"></span><span class="max" title="Max"></span><span class="pop" title="Pop"></span><input type="text" value="<%= url %>" name="url" /></div>\
                        </div>',
        
        template: function(doc) {
            var template = $(_.template(this.htmlTemplate, doc));
            return template;
        },
        render: function() {
            var self = this;
            this.$iframe = $('<iframe src="'+this.model.get('url')+'"></iframe>');
            
            this.$iframe.on('load', function(){
                if(this.contentWindow.document.title) {
                    self.$el.find('.title').html(this.contentWindow.document.title);
                }
                if(this.contentWindow.location.href) {
                    self.$el.find('input').val(this.contentWindow.location.href);
                }
            });
            
            this.$el.html(this.template(this.model.toJSON()));
            
            this.$el.find('> div').append(this.$iframe);
            
            this.setElement(this.$el);
            this.$el.draggable({
               stop: function(event, ui) {
                   console.log(event.target)
               }, start: function(event, ui) {
                   self.$el.attr('selected', true);
                   self.$el.siblings().removeAttr('selected');
               }
            });
            this.$el.resizable();
            this.$el.css('position', 'absolute');
            
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click .close": "close",
          "click .min": "minimize",
          "click .max": "maximize",
          "click .pop": "popout",
          "click": "select",
          "change input": "go",
          "touchstart input": "touchstartstopprop"
        },
        go: function() {
            this.$iframe.attr('src', this.$el.find('input').val());
        },
        close: function() {
            this.remove();
        },
        popout: function() {
            this.remove();
            window.open(this.$el.find('input').val());
        },
        minimize: function() {
            this.$el.removeAttr('style');
            this.$el.addClass('minimized');
            this.$el.removeClass('maximized');
        },
        maximize: function() {
            this.$el.removeAttr('style');
            this.$el.addClass('maximized');
            this.$el.removeClass('minimized');
            this.$el.css('top', '0px');
            this.$el.css('left', '0px');
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            this.options.list.trigger('selected', this);
            this.$el.attr('selected', true);
            this.$el.siblings().removeAttr('selected');
            
            return false;
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    require(['jquery.ui.min.js'], function(){
        
    });

    windows.render = function(el) {
        if(!windows.hasOwnProperty('list')) {
            windows.col = new WindowCollection();
            windows.list = new WindowsList({el: el, collection: windows.col});
        }
        windows.list.render();
    }
    
    windows.openUrl = function(url, title) {
        if(!title) { title = 'Internet'; }
        windows.col.add({url: url, title: title});
    }
    
    if(define) {
        define(function () {
            return windows;
        });
    }
})();