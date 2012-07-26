//
//
//
//
//
//
(function(){
    var auth = this;
    
    auth.apiUrl = houseApi+'/auth';
    
    auth.get = function(callback) {
        this.collection.bind("add", function(doc) {
            callback(null, doc);
        });
        this.collection.load();
        return;
        $.ajax({
            url: auth.apiUrl,
            dataType: 'json',
            success: callback,
            xhrFields: {
               withCredentials: true
            }
        });
    }
    /*
    auth.post = function(data,callback) {
        $.ajax({
          type: "POST",
          url: auth.apiUrl,
          data: data,
          success: function(json) {
            callback(json);
          },
          xhrFields: {
             withCredentials: true
          }
        });
    }
    
    auth.register = function(newUser,callback) {
        auth.post(newUser, callback);
    }
    
    auth.login = function(myUser,callback) {
        auth.post(myUser, callback);
    }
    
    auth.logout = function(callback) {
        $.ajax({
          type: "DELETE",
          url: auth.apiUrl,
          success: function(json) {
            callback(json);
          },
          xhrFields: {
             withCredentials: true
          }
        });
    }
    */
    auth.prompt = function($el, callback) {
        var thisPrompt = this;
        this.user = new this.Model({}, {collection: this.collection});
        this.authView = new this.LoginForm({model: this.user})
        
        this.user.on('login', function(){
            if(callback) callback();
            if(thisPrompt.hasOwnProperty('onAuthCb')) {
                thisPrompt.onAuthCb(thisPrompt.user);
            }
        });

        $el.html(authView.render().el);
        
        this.authView.focus();
        
        return {
            "authorized": function(callback){
                thisPrompt.onAuthCb = callback;
            }
        };
    }
        
    auth.Model = Backbone.Model.extend({
        initialize: function() {
            var self = this;
            this.on("change", function(model, options){
                var s = model.save(null, {silent: true})
                .done(function(s, typeStr, respStr) {
                    self.trigger('login');
                })
                .fail(function(s, typeStr, respStr) {
                    if(s.status === 403) {
                        self.trigger('badPass', 'bad password');
                    }
                })
            });
            this.on('error', function(originalModel,resp,options){
                //console.log(arguments);
            });
        },
        getView: function(options) {
            if(!this.hasOwnProperty('view')) {
                if(!options) options = {};
                options.model = this;
                this.view = new auth.View(options);
            }
            return this.view;
        }
    });
    
    auth.Collection = Backbone.Collection.extend({
        model: auth.Model,
        url: auth.apiUrl,
        initialize: function() {
            var self = this;
        }, load: function(callback) {
            var self = this;
            this.reset();
            this.fetch({add:true, success: function(){
                    self.trigger('loaded', self.url);
                    if(callback) callback();
                }, complete: function(xhr){
                }
            });
        }
    });
    this.collection = new this.Collection();
    
    auth.LoginForm = Backbone.View.extend({
        tagName: "div",
        className: "authentication",
        htmlTemplate: '<span>Welcome!</span><form id="houseAuth"><input type="text" name="name" placeholder="username" value="<%= name %>" /><input type="password" name="pass" placeholder="password" /><input type="submit" name="Join" value="Join" /><span class="msg"></span></form>',
        template: function(doc) {
            doc.name = this.model.get('name');
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html(this.template({}));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.model.on('badPass', function(msg){
                self.model.set({'pass': ''}, {silent: true});
                self.render();
                self.$el.find('input[name="pass"]').focus();
                self.$el.find('.msg').html('Bad password');
            });
        },
        events: {
            "submit form": "submit"
        },
        submit: function() {
            this.model.set({
                name: this.$el.find('input[name="name"]').val(),
                pass: this.$el.find('input[name="pass"]').val()
            });
            return false;
        },
        focus: function() {
            this.$el.find('input').first().focus();
        },
        remove: function() {
          $(this.el).remove();
        }
    });
        
    auth.View = Backbone.View.extend({
        tagName: "span",
        className: "profile",
        htmlTemplate: '<span class="user">\
                       <%= name %>\
                       <button class="logout" title="Log out">✌</button>\
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
            "click .logout": "logout"
        },
        logout: function() {
            this.model.destroy();
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    
    
    if(define) {
        define(function () {
            return auth;
        });
    }
})();