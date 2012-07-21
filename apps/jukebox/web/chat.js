//
//
//
(function(){

    var chat = {};
    
    chat.initAuth = function(callback) {
        require(['houseAuth.js'], function(auth) {
            auth.get(function(err, loginStatus){
                var $profile = $('<div id="me"></div>');
                $('body').append($profile);
                if(err) {
                    
                } else if(loginStatus) {
                    if(loginStatus && loginStatus.has('user')) {
                        var profileView = loginStatus.getView();
                        $profile.html(profileView.render().el);
                    } else {
                        if(!chat.hasOwnProperty('$loginPrompt')) {
                            var $auth = $('<div></div>');
                            chat.$loginPrompt = $('<div class="lightbox"></div>');
                            var $close = $('<p class="close"><a href="#" title="close"></a></p>').click(function(){
                                chat.$loginPrompt.hide();
                                return false;
                            });
                            chat.$loginPrompt.hide();
                            $('body').append(chat.$loginPrompt.append($auth).append($close));
                        }
                        
                        var $loginButton = $('<button>login</button>').click(function(){
                            promptLogin();
                        });
                        $profile.html($loginButton);
                        
                        var promptLogin = function() {
                            chat.$loginPrompt.show();
                            auth.prompt($auth).authorized(function(loginStatus){
                                chat.$loginPrompt.hide();
                                console.log(loginStatus)
                                var profileView = loginStatus.getView();
                                $profile.html(profileView.render().el);
                            });
                        }
                    }
                }
                callback();
            });
        });
    }
    
    chat.init = function($el, callback) {
        var self = this;
        this.initAuth(function(){
            require(['houseChat.js'], function(houseChat) {
                if($el) {
                    var $chat = $('<div id="chat"></div>');
                    $el.append($chat);
                    
                    self.view = new houseChat.AppView({el: $chat});
                    self.view.render();
                }
                
                if(callback) callback();
            });
        });
    }
    
    if(define) {
        define(function () {
            return chat;
        });
    }
})();
