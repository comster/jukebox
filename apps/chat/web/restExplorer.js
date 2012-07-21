//
//
//
//
//
//
(function(){
    var rest = {};
    rest.Model = Backbone.Model.extend({
        initialize: function() {
            var self = this;
            this.on("change", function(model, options){
                model.save(null, {silent: true});
            });
        },
        getView: function(options) {
            if(this.has('id')) {
                var id = this.get('id');
                var iOfId = this.collection.url.indexOf(id);
                if(iOfId !== -1 && this.collection.url.length>0 && (iOfId + id.length === this.collection.url.length)) {
                    console.log(this.collection.url.indexOf(id))
                    console.log(this.collection.url.length)
                    if(!this.hasOwnProperty('view')) {
                        options.model = this;
                        this.view = new rest.ResourceView(options);
                        this.view.model.collection.url = this.view.model.collection.url.substr(0, this.view.model.collection.url.indexOf(this.view.model.id));
                        console.log(this.view.model.id)
                        console.log(this.view.model.collection.url)
                    }
                    return this.view;
                }
            }
            if(this.has('data')) {
                if(!this.hasOwnProperty('view')) {
                    options.model = this;
                    this.view = new rest.ResourceView(options);
                    
                    this.view.model.collection.url = this.view.model.collection.url.substr(0, this.view.model.collection.url.indexOf(this.view.model.id));
                    console.log(this.view.model.id)
                    console.log(this.view.model.collection.url)
                }
                return this.view;
            } else {
                if(!this.hasOwnProperty('row')) {
                    options.model = this;
                    this.row = new rest.Row(options);
                }
                return this.row;
            }
        },
        url: function() {
          var base = this.collection.url;
          if(this.hasOwnProperty('urlRoot')) base = this.urlRoot;
          if (this.isNew()) return base;
          return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id;
        }
    });
    
    rest.Collection = Backbone.Collection.extend({
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

    rest.Explorer = Backbone.View.extend({
        tagName: "div",
        className: "explorer",
        render: function() {
            this.$el.append(this.$e);
            this.$el.append(this.$resources);
            this.setElement(this.$el);
            this.list.render();
            this.searchInput.render();
            return this;
        },
        initialize: function() {
            var self = this;
            self.collections = {};
            self.lists = {};

            this.$e = $('<span class="picker"></span>');
            this.$resources = $('<ul class="resources"><li class="views"></li></ul>');
            this.$lists = $('<span class="lists"></span>');
            
            var $search = $('<span class="search"></span>');
            this.$e.append($search);
            var $list = $('<span class="list" data-id="/" selected></span>');
            this.$lists.append($list);
            this.$e.append(this.$lists);
            
            var uploadF = new rest.UploadFrame();
            this.$e.append(uploadF.render().el);

            self.collection = this.getCollection('/');
            self.collection.load();
            self.searchInput = new rest.SearchInput({el: $search, explorer: self});
            
            self.list = new rest.List({el: $list, collection: self.collection});
            
            self.searchInput.on('post', function(url) {
                var b = self.collection.baseUrl;
                url = url.substr(url.indexOf(b)+b.length);
                                
                var newModel = new rest.Model({}, {collection: self.getCollection(url)});
                var postView = new rest.ResourceView({model: newModel});
                
                self.trigger('viewResource', postView);
            });
            
            self.searchInput.on('put', function(url) {
                var b = self.collection.baseUrl;
                url = url.substr(url.indexOf(b)+b.length);
                console.log(self.collections)
                var iSlash = url.lastIndexOf('/');
                if(iSlash !== -1) {
                    if(iSlash === url.length-1) {
                        url = url.substr(0, url.length-1);
                        iSlash = url.lastIndexOf('/');
                    }
                    var modelId = url.substr(iSlash+1);
                    url = url.substr(0, iSlash+1);
                }
                console.log(url);
                console.log(modelId);
                var col = self.getCollection(url);
                console.log(col)
                var existingModel = col.get(modelId);
                console.log(existingModel)
                
                if(!existingModel) return;
                
                var postView = new rest.ResourceView({model: existingModel});
                
                self.trigger('viewResource', postView);
            });
            
            self.lists['/'] = self.list;
            
            self.list.on('select', function(selection){
                self.go(self.collection.urlFilter+'/'+selection.model.get('id'));
            });
            
            self.collection.on('loaded', function(url) {
                self.searchInput.$input.val(window.location.origin+self.collection.url);
            });
            
            self.on('viewResource', function(view) {
                console.log(view)
                var $views = self.$resources.find('.views');
                var e = view.render().el;
                var $viewHandle = $(e).find('.resourceId').clone();
                
                var selectView = function() {
                    $(e).attr('selected', true);
                    $(e).siblings().removeAttr('selected');
                    $viewHandle.attr('selected', true);
                    $viewHandle.siblings().removeAttr('selected');
                }
                
                $viewHandle.click(function(){
                    selectView();
                });
                $views.append($viewHandle);
                
                view.on('remove', function(){
                    $viewHandle.remove();
                });
                
                if($views.children().length < 2) {
                    $views.hide();
                } else {
                    $views.show();
                }
                self.$resources.append(e);
                selectView();
            });
        },
        getCollection: function(id) {
            var self = this;
            if(!this.collections.hasOwnProperty(id)) {
                
                if(id.substr(-1) === '/') {
                    var testId = id.substr(0, id.length-1);
                    if(this.collections.hasOwnProperty(testId)) {
                        return this.collections[testId];
                    }
                }
                
                this.collections[id] = new rest.Collection();
                this.collections[id].on('loaded', function(url) {
                    self.searchInput.$input.val(window.location.origin+self.collections[id].url);
                });
                this.collections[id].filterUrl(id);
                
                var $list = $('<span class="list loading" data-id="'+id+'"></span>');
                this.$lists.append($list);
                var list = new rest.List({el: $list, collection: self.collections[id]});
                
                list.on('select', function(selection){
                    var s = (self.collections[id].urlFilter.substr(-1) !== '/' && selection.model.get('id').substr(0,1) !== '/') ? '/' : '';
                    self.go(self.collections[id].urlFilter+s+selection.model.get('id'));
                });
                
                list.on('parent', function(idd){
                    var f = self.collections[id].urlFilter;
                    self.go(f.substr(0, f.lastIndexOf('/')));
                });
                
                list.on('edit', function(model){
                    console.log(model.get('data'))
                });
                
                list.on('view', function(view){
                    self.trigger('viewResource', view);
                });
                
                list.render();
                
                this.lists[id] = list;
            }
            return this.collections[id];
        },
        go: function(id) {
            var self = this;
            var col = this.getCollection(id);
            
            this.collections[id].load();
            
            for(var i in this.lists) {
                this.lists[i].$el.removeAttr('selected');
            }
            this.lists[id].$el.attr('selected', true);
        }
    });

    rest.List = Backbone.View.extend({
        render: function() {
            var self = this;
            //this.$el.html('');
            this.$ul.find('.row').remove();
            this.$el.append(this.$ul);
            return this;
        },
        initialize: function() {
            var self = this;
            
            var parent = this.$el.data('id');
            
            
            var $ul = this.$ul = $('<ul></ul>');
            
            if(parent && parent !== '/') {
                parent = parent.substr(0, parent.lastIndexOf('/')+1);
                var $nav = $('<li class="parent" data-id="'+parent+'">'+parent+'</li><li class="self" data-id="'+this.$el.data('id')+'">'+this.$el.data('id')+'</li>');
                $ul.append($nav);
            }
            this.collection.bind("add", function(doc) {
                var v = doc.getView({list: self});
                v.on('edit', function(model){
                    self.trigger('edit', model);
                });
                if(v instanceof rest.ResourceView) {
                    self.trigger('view', v);
                } else {
                    self.appendRow(v);
                }
                self.$el.removeClass('loading');
            });
            
            this.collection.on('reset', function(){
                self.render();
            });
        },
        events: {
            "click .parent": "parent",
            "click .self": "refresh"
        },
        refresh: function(e) {
            this.trigger('refresh', $(e.target).data('id'));
        },
        parent: function(e) {
            this.trigger('parent', $(e.target).data('id'));
        },
        appendRow: function(row) {
            if(this.$ul.children().length === 0) {
                this.$ul.append(row.render().el);
            } else {
                var i = this.collection.indexOf(row);
                if(i >= 0) {
                    this.$ul.children().eq(i).before(row.render().el);
                } else {
                    this.$ul.append(row.render().el);
                }
            }
        }
    });
    
    rest.ResourceView = Backbone.View.extend({
        tagName: "li",
        className: "view",
        htmlTemplate: '<span title="<%= _title %>" class="resourceId"><%= _id %></span>\
                        <span class="actions" style="display:none">\
                           <a class="view" href="">View</a>\
                           <a class="edit" href="">Edit</a>\
                           <a class="delete" href="">Delete</a>\
                           <a class="download" href="">Download</a>\
                           <a class="share" href="">Share</a>\
                           <a class="close" href="">Close</a>\
                        </span>',
        template: function(doc) {
            doc._id = doc.id || this.model.collection.url;
            doc._title = doc.fileName || '';
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            this.setElement(this.$el);
            
            if(this.editorView) {
                this.$el.append(this.editorView.render().el);
            }
            
            return this;
        },
        initialize: function() {
            if(this.model) {
                this.model.bind('change', this.render, this);
                this.model.bind('destroy', this.remove, this);
                var mime = this.model.has('mime') ? this.model.get('mime') : this.model.get('contentType');
                if(mime) {
                    if(mime.indexOf('text') === 0) {
                        this.editorView = new rest.TextEditorView({model: this.model});
                    } else if(mime.indexOf('image') === 0) {
                        this.editorView = new rest.ImageEditorView({model: this.model});
                    } else if(mime.indexOf('audio') === 0) {
                        this.editorView = new rest.AudioEditorView({model: this.model});
                    } else if(mime.indexOf('video') === 0) {
                        this.editorView = new rest.VideoEditorView({model: this.model});
                    } else if(mime.indexOf('application/x-empty') === 0) {
                        this.editorView = new rest.TextEditorView({model: this.model});
                    }
                } else {
                    this.editorView = new rest.ParamsEditorView({model: this.model});
                }
            }
        },
        events: {
          "contextmenu .resourceId": "actionsMenu",
          "click .edit": "edit",
          "click .share": "share",
          "click .view": "view",
          "click .download": "download",
          "click .delete": "delete",
          "click .close": "close",
          "touchstart input": "touchstartstopprop"
        },
        close: function() {
            this.remove();
            return false;
        },
        "delete": function() {
            if(confirm("Are you sure that you want to delete this?")) {
                this.model.destroy({success: function(model, response) {
                    
                }});
            }
            return false;
        },
        actionsMenu: function() {
            this.$el.find('.actions').toggle();
            
            return false;
        },
        download: function() {
            console.log(this.model.get('mime'));
            console.log(this.model.get('data'));
            return false;
        },
        share: function() {
            var url = window.location.origin + this.model.collection.url;
            var intent = new window.WebKitIntent('http://webintents.org/share', 'text/uri-list', [url]);
            
            window.navigator.webkitStartActivity(intent, function(data){
                console.log(arguments);
            });
            
            return false;
        },
        edit: function() {
            var self = this;
            //var onSuccess = function(data) {     var logo = document.getElementById("wilogo");    if(data instanceof Blob || data.constructor.name === "Blob") {      logo.src = webkitURL.createObjectURL(data);    }    else {      logo.src = data;    }  };  var onError = function(data) { /* boooo */ };  window.navigator.webkitStartActivity(intent, onSuccess, onError);}
            
            var intent = new window.WebKitIntent('http://webintents.org/edit', this.model.get('mime'), this.editorView.getDataUrl());
            
            window.navigator.webkitStartActivity(intent, function(data){
                self.editorView.setEditorValue(data);
            }, function(){
            });
            
            return false;
        },
        view: function() {
            this.$el.find('.viewer').siblings().hide();
            this.$el.find('.viewer').show();
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            //this.options.list.trigger('select', this);
            return false;
        },
        remove: function() {
            this.trigger('remove');
            $(this.el).remove();
        }
    });
    
    rest.TextEditorView = Backbone.View.extend({
        tagName: "span",
        className: "editor",
        htmlTemplate: '<button class="save">save</button>\
                       <textarea><%= data %>\</textarea>\
                        ',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            console.log(this.model)
            this.$el.html(this.template(this.model.toJSON()));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click button.save": "save"
        },
        getEditorValue: function() {
            return this.$el.find('textarea').val();
        },
        save: function() {
            var val = this.getEditorValue();
            
            console.log(val);
            
            this.model.set({data: val});
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    rest.ParamsEditorView = Backbone.View.extend({
        tagName: "span",
        className: "editor",
        htmlTemplate: '<span class="params"></span><br />\
                        <button class="add" title="add a parameter">+</button>\
                        <button class="save">save</button>\
                        ',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        appendParamValueInput: function(k,v) {
            var $inputs = $('<span class="field"></span>');
            this.$el.find('.params').append($inputs);
            var $inpKey = $('<input type="text" name="param" placeholder="parameter" />');
            $inputs.append($inpKey);
            var $inpVal = $('<input type="text" name="value" placeholder="value" />');
            $inputs.append($inpVal);
            
            if(k) {
                $inpKey.val(k);
            }
            if(v) {
                $inpVal.val(v);
                $inpVal.attr('data-typeof', typeof(v));
            }
            
            var dz = new rest.DropZone();
            $inputs.append(dz.render().el).append('<br />');
            
            $inpKey.focus();
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            
            console.log(this.model.attributes);
            for(var k in this.model.attributes) {
                this.appendParamValueInput(k, this.model.attributes[k]);
            }
            
            this.appendParamValueInput();
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click button.save": "save",
          "click button.add": "add"
        },
        add: function(){
            this.appendParamValueInput();
        },
        save: function() {
            var self = this;
            var obj = {};
            var inputs = this.$el.find('.params span.field');
            inputs.each(function(i,e){
                var $e = $(e);
                var $v = $e.find('input[name="value"]');
                var strVal = $v.val();
                if(!strVal || strVal === '') {
                } else {
                    console.log($v.attr('data-typeof'))
                    if($v.attr('data-typeof') && $v.attr('data-typeof') !== 'string') {
                        strVal = JSON.parse(strVal);
                    }
                    obj[$e.find('input[name="param"]').val()] = strVal;
                }
                if(i === inputs.length-1) {
                    self.model.set(obj);
                    self.render();
                }
            });
            //
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    rest.ImageEditorView = Backbone.View.extend({
        tagName: "span",
        className: "editor",
        htmlTemplate: '<img class="image" />\
                        <button class="save">save</button>\
                        ',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.find('img.image').attr('src', 'data:'+this.model.get('mime')+';base64,'+this.model.get('data'));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click button.save": "save"
        },
        save: function() {
            var self = this;
            var obj = {};
            obj.data = this.getDataUrl();
            
            var b = obj.data.split(';base64,');
            
            obj.mime = b[0];
            obj.data = b[1];
            
            console.log(obj)
            self.model.set(obj);
        },
        remove: function() {
          $(this.el).remove();
        },
        getDataUrl: function(){
            var $img = this.$el.find('img.image');
            var $canvas = $('<canvas height="'+$img.height()+'" width="'+$img.width()+'" />');
            var canvas = $canvas[0];
            var context = canvas.getContext("2d");
            //this.$el.append($canvas);
            context.drawImage($img[0], 0, 0);
            
            return canvas.toDataURL(this.model.get('mime'));
        },
        setEditorValue: function(data) {
            if(data.indexOf(';base64,') !== -1) {
                this.$el.find('img.image').attr('src', data);
            }
        }
    });
    
    rest.AudioEditorView = Backbone.View.extend({
        tagName: "span",
        className: "editor audio",
        htmlTemplate: '<audio class="audio" controls />\
                        <button class="save">save</button>\
                        ',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            var $audio = this.$el.find('audio.audio');
            
            if(this.model.has('mime')) {
                $audio.attr('src', 'data:'+this.model.get('mime')+';base64,'+this.model.get('data'));
            } else if(this.model.has('contentType')) {
                console.log(this.model.collection.url);
                $audio.attr('src', this.model.collection.url+this.model.get('filename'));
            }
            //$audio[0].play();
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click button.save": "save"
        },
        save: function() {
            var self = this;
            var obj = {};
            var inputs = this.$el.find('.params span');
            inputs.each(function(i,e){
                var $e = $(e);
                obj[$e.find('input[name="param"]').val()] = $e.find('input[name="value"]').val();
                
                console.log(obj);
                if(i === inputs.length-1) {
                    self.model.set(obj);
                }
            });
            //
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    rest.VideoEditorView = Backbone.View.extend({
        tagName: "span",
        className: "editor video",
        htmlTemplate: '<video class="video" />\
                        <button class="save">save</button>\
                        ',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.find('video.video').attr('src', 'data:'+this.model.get('mime')+';base64,'+this.model.get('data'));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click button.save": "save"
        },
        save: function() {
            var self = this;
            var obj = {};
            var inputs = this.$el.find('.params span');
            inputs.each(function(i,e){
                var $e = $(e);
                obj[$e.find('input[name="param"]').val()] = $e.find('input[name="value"]').val();
                
                console.log(obj);
                if(i === inputs.length-1) {
                    self.model.set(obj);
                }
            });
            //
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    rest.DropZone = Backbone.View.extend({
        tagName: "span",
        className: "dropZone",
        htmlTemplate: '<span class="msg">Drop a file here</span>\
                        <span class="droppedFiles"></span>\
                        ',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.html(this.template({}));
            this.setElement(this.$el);
            
            this.$el[0].addEventListener('drop', this.drop, false);
            
            return this;
        },
        initialize: function() {
            return; // TODO
            document.body.onpaste = function(e) {
              var items = e.clipboardData.items;
              for (var i = 0; i < items.length; ++i) {
                if (items[i].kind == 'file' && items[i].type == 'image/png') {
                  var blob = items[i].getAsFile();
            
                  var img = document.createElement('img');
                  img.src = window.URL.createObjectURL(blob);
            
                  document.body.appendChild(img);
                }
              }
            };
        },
        events: {
            "dragenter": "dragenter",
            "dragover": "dragover",
            "dragleave": "dragleave"
        },
        dragenter: function(e){
            e.stopPropagation();
            e.preventDefault();
            this.$el.addClass('dropping');
        },
        dragover: function(e){
            e.stopPropagation();
            e.preventDefault();
        },
        dragleave: function(e){
            e.stopPropagation();
            e.preventDefault();
        },
        drop: function(e){
            e.stopPropagation();
            e.preventDefault();
            
            var $t = $(e.currentTarget);
            $t.removeClass('dropping');
            
            var files = e.dataTransfer.files;
            console.log(files)
            
            for(var i in files) {
                var file = files[i];
                if(typeof file !== 'object') return;
                var ft = file["type"];
                var $file;
                
                if(ft.match('audio/')) {
                    $file = $('<audio controls></audio>');
                    $file.attr('src', window.webkitURL.createObjectURL(file));
                } else if(ft.match('video/')) {
                    
                } else if(ft.match('image/')) {
                    $file = $('<img />');
                    $file.attr('src', window.webkitURL.createObjectURL(file));
                } else if(ft.match('text/')) {
                    
                }
                
                var fr = new FileReader();
                fr.onload = function (oFREvent) {
                  var baseData = oFREvent.target.result;
                  baseData = baseData.split(';base64,');
                  var baseMime = baseData[0];
                  var baseData = baseData[1];
                  
                  // TODO make this emmit an event
                  
                  $t.parent('span').find('input[name="value"]').val(baseData);
                }
                  
                fr.readAsDataURL(file);
                
                $t.find('.droppedFiles').append($file);
            }
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    rest.UploadFrame = Backbone.View.extend({
        tagName: "span",
        className: "uploadFrame",
        htmlTemplate: '<iframe src="upload.html"></iframe>',
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
        
    rest.Row = Backbone.View.extend({
        tagName: "li",
        className: "row",
        htmlTemplate: '<span class="classy">\
                       <%= name %>\
                        </span>',
        template: function(doc) {
            if(!doc.name) {
                if(doc.filename) {
                    doc.name = doc.filename;
                } else  {
                    doc.name = doc.id;
                }
            }
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
            return rest;
        });
    }
})();