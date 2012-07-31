//
//
//
//
//
//
(function(){
    var users = this;
    
    users.Model = Backbone.Model.extend({
        initialize: function() {
            var self = this;
            this.on("change", function(model, options){
                console.log(model.changedAttributes())
                console.log(options)
                model.save(null, {silent: true});
            });
        },
        getView: function(options) {
            if(!this.hasOwnProperty('view')) {
                options.model = this;
                this.row = new users.View(options);
            }
            return this.row;
        },
        url: function() {
          var base = this.collection.url;
          if(this.hasOwnProperty('urlRoot')) base = this.urlRoot;
          if (this.isNew()) return base;
          return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id;
        }
    });
    
    users.Collection = Backbone.Collection.extend({
        model: users.Model,
        url: houseApi+"/",
        initialize: function() {
            var self = this;
            this.baseUrl = houseApi;
            this.urlFilter = '';
        }, load: function(callback) {
            var self = this;
            this.url = this.baseUrl + this.urlFilter;
            this.reset();
            this.fetch({add:true, success: function(){
                self.trigger('loaded', self.url);
                if(callback) callback();
            }, complete: function(xhr){
            }});
        }, filterUrl: function(url) {
            this.urlFilter = url;
        }, comparator: function(a,b) {
            return a.get('name') > b.get('name');
        }
    });

    users.LoginForm = Backbone.View.extend({
        tagName: "span",
        className: "login",
        htmlTemplate: '<form><input type="text" name="username" /><input type="password" name="password" /><button>Login</button></form>',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html(this.template({}));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
        },
        remove: function() {
          $(this.el).remove();
        }
    });
        
    users.View = Backbone.View.extend({
        tagName: "li",
        className: "userView",
        htmlTemplate: '<span class="classy">\
                       <%= name %>\
                        </span>',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
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
            this.options.list.trigger('select', this);
            return false;
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    if(define) {
        define(function () {
            return users;
        });
    }
})();