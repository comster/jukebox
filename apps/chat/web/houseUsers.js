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
        model: rest.Model,
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

    rest.SearchInput = Backbone.View.extend({
        render: function() {
            this.$el.append(this.$input);
            this.$el.append(this.$open);
            this.$el.append(this.$put);
            this.$el.append(this.$post);
            this.$el.append(this.$del);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.$input = $('<input type="text" name="query" value="/" />');
            this.$open = $('<button class="get" title="get">GET</button>');
            this.$put = $('<button class="put" title="put">PUT</button>');
            this.$post = $('<button class="post" title="post">POST</button>');
            this.$del = $('<button class="delete" title="delete">DELETE</button>');
        },
        events: {
            "click .get": "open",
            "click .put": "put",
            "click .post": "post",
            "click .delete": "delete"
        },
        open: function() {
            var url = this.$input.val();
            var newwindow=window.open(url,'resource','');
        },
        getCollection: function() {
            var url = this.$input.val();
            var b = this.options.explorer.collection.baseUrl;
            url = url.substr(url.indexOf(b)+b.length);
            var c;
            
            c = this.options.explorer.getCollection(url);
            
            return c;
        },
        put: function() {
            var url = this.$input.val();
            this.trigger('put', url);
        },
        post: function() {
            var url = this.$input.val();
            this.trigger('post', url);
        },
        "delete": function() {
            if(confirm("Are you sure that you want to delete this resource?")) {
                var url = this.$input.val();
                $.ajax({url: url, type: "DELETE"}).done(function(){
                    alert('deleted');
                });
            }
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
        
    rest.View = Backbone.View.extend({
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