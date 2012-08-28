//
// Auth
//
(function(){
    var auth = this;
    
    auth.apiUrl = houseApi+'/auth';
    
    //
    // Auth Get
    //
    // Use backbone to get our current user session data
    //
    auth.get = function(callback) {
        this.collection.bind("add", function(doc) {
            callback(null, doc);
        });
        this.collection.load();
    }
    
    var users = {};
    
    //
    // User AvatarView
    //
    // Renders an image of the user
    //
    users.AvatarView = Backbone.View.extend({
        tagName: 'span',
        render: function() {
            var self = this;
            if(this.model.has('avatar')) {
                this.$el.html('<img src="/api/files/'+this.model.get('avatar')+'" />');
            } else {
                this.$el.html('<img src="/jukebox/assets/img/stylistica-icons-set/png/64x64/user.png" />');
            }
            return this;
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    //
    // User Model
    //
    // getAvatarView helper method to get a view for this data
    //
    users.Model = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getAvatarView: function(options) {
            if(!options) options = {};
            if(!this.hasOwnProperty('view')) {
                options.model = this;
                this.view = new users.AvatarView(options);
            }
            return this.view;
        }
    });
    
    //
    // User Collection
    //
    users.Collection = Backbone.Collection.extend({
        model: users.Model,
        url: houseApi+"/users",
        initialize: function() {
            var self = this;
        }, load: function(callback) {
            var self = this;
            this.reset();
            this.fetch({add:true, success: function(){
                self.trigger('loaded', self.url);
                if(callback) callback();
            }, complete: function(xhr){
            }});
        }
    });
    
    // Global reference to our users collection
    window.usersCollection = new users.Collection();
    window.usersCollection.load();
    
    //
    // Prompt
    //
    // Helper method to authorize the user
    //
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
                var s = model.save(null, {silent: true});
                s.done(function(s, typeStr, respStr) {
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
        htmlTemplate: '<span>Welcome!</span><form id="houseAuth"><input type="text" name="name" placeholder="username" value="<%= name %>" autocomplete="off" /><input type="password" name="pass" placeholder="password" /><input type="submit" name="Join" value="Join" /><span class="msg"></span></form>',
        template: function(doc) {
            doc.name = this.model.get('name');
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html(this.template({}));
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
            var name = this.$el.find('input[name="name"]').val();
            var pass = this.$el.find('input[name="pass"]').val();
            if(pass.length < 6) {
                alert('longer password required');
            } else if(name.length < 4) {
                alert('name must be longer');
            } else {
                this.model.set({
                    name: name,
                    pass: pass
                });
            }
            return false;
        },
        focus: function() {
            this.$el.find('input').first().focus();
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    var avatarFileChangeListener = function(){
        
    }
    auth.UploadAvatarView = Backbone.View.extend({
        render: function() {
            var self = this;
            this.$input = $('<input type="file" multiple accept="image/*">');
            this.$input.on('change', function(e){
                self.inputChange(e.target.files);
            });
            this.$el.html('');
            this.$el.append(this.$input);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
        },
        remove: function() {
          $(this.el).remove();
        },
        updateAvatar: function(filename) {
            var self = this;
            this.model.set({avatar: filename});
            this.model.save(null, {silent: true, wait: true})
            .done(function(){
                console.log('saved avatar '+filename);
                self.model.getAvatarView().render();
                self.trigger('updated', filename);
            });
        },
        inputChange: function(files) {
            var self = this;
            
            function uploadFile(blobOrFile, options) {
                
                var callback = options.complete;
                var progress = options.progress;
                
                var formData = new FormData();
                var xhr = new XMLHttpRequest();
                             
                var onReady = function(e) {
                 // ready state
                };
                
                var onError = function(err) {
                  // something went wrong with upload
                };
                
                formData.append('files', blobOrFile);
                xhr.open('POST', '/api/files', true);
                xhr.addEventListener('error', onError, false);
                //xhr.addEventListener('progress', onProgress, false);
                xhr.addEventListener('readystatechange', onReady, false);
                
              xhr.onload = function(e) {
                  console.log('upload complete');
                  var data = JSON.parse(e.target.response);
                  callback(data);
              };
            
              // Listen to the upload progress.
              xhr.upload.onprogress = function(e) {
                if (e.lengthComputable && progress) {
                  progress((e.loaded / e.total) * 100);
                }
              };
            
                xhr.send(formData);
            }
              var queue = [];
              for(var i = 0; i < files.length; i++){
                var file = files[i];
                var path = file.webkitRelativePath || file.mozFullPath || file.name;
                if (path.indexOf('.AppleDouble') != -1) {
                 // Meta-data folder on Apple file systems, skip
                continue;
                }         
                var size = file.size || file.fileSize || 4096;
                if(size < 4095) { 
                // Most probably not a real MP3
                continue;
                }
            
                  queue.push(file);
              }
                                      
              var process = function(){
                if(queue.length){
                  console.log(queue);
                  var f = queue.shift();
                      
                      // TODO make this a backbone view
                      
                      var $localFile = $('<div class="localFile"></div>');
                      $localFile.append('<progress min="0" max="100" value="0" style="display:none;">0% complete</progress>');
                      
                      self.$el.append($localFile);
                      
                    $localFile.find('progress').show();
                    uploadFile(f, {complete: function(data){
                        $localFile.remove();
                        self.updateAvatar(data.file.filename);
                    }, progress: function(percent){
                        self.$el.find('progress').val(percent);
                    }});
                    process();
                  var lq = queue.length;
                  setTimeout(function(){
                    if(queue.length == lq){
                      process();
                    }
                  },300);
                }
              }
              process();
        }
    });

    //
    // View
    //
    // Current user profile view with actions to log out
    //
    auth.View = Backbone.View.extend({
        tagName: "span",
        className: "profile",
        htmlTemplate: '<span class="user">\
                        <span class="name"><%= name %></span>\
                       <button class="logout" title="Log off">logout</button>\
                        <span class="avatar"></span>\
                        </span>',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            
            if(this.userModel) {
                this.$el.find('.avatar').append(this.userModel.getAvatarView().render().el);
            }
            
            return this;
        },
        initialize: function() {
            var self = this;
            this.$upload = $('<div class="upload"></div>');
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.userModel = userModel = window.usersCollection.get(this.model.get('user'));
            if(!this.userModel) {
                window.usersCollection.load(function(){
                    self.userModel = userModel = window.usersCollection.get(self.model.get('user'));
                    self.render();
                });
            }
        },
        events: {
            "click .logout": "logout",
            "click .avatar": "uploadAvatar"
        },
        uploadAvatar: function() {
            this.$el.append(this.$upload);
            
            var uploadView = new auth.UploadAvatarView({el:this.$upload, model: this.userModel});
            uploadView.render();
        },
        logout: function() {
            if(confirm("Are you sure that you want to log off?")) {
                this.model.destroy();
                function deleteAllCookies() {
                    var cookies = document.cookie.split(";");
                
                    for (var i = 0; i < cookies.length; i++) {
                        var cookie = cookies[i];
                        var eqPos = cookie.indexOf("=");
                        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
                    }
                }
                deleteAllCookies();
                setTimeout(function(){
                    window.location.reload();
                }, 500);
            }
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    // if we have require define this as a module
    if(define) {
        define(function () {
            return auth;
        });
    }
})();



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