//
// Vault
//
//
//
//
(function(){

    var vault = {};
    
    vault.init = function(callback) {
        require(['underscore.js'], function(){
            require(['backbone.js'], function(){
                require(['backbone-house.js'], function(){
                    require(['houseAuth.js'], function(auth) {
                        auth.get(function(err, loginStatus){
                            var $profile = $('<div id="me"></div>');
                            $('body').append($profile);
                            if(err) {
                                
                            } else if(loginStatus) {
                                console.log(loginStatus.attributes)
                                if(loginStatus && loginStatus.has('user')) {
                                    var profileView = loginStatus.getView();
                                    $profile.html(profileView.render().el);
                                } else {
                                    if(!vault.hasOwnProperty('$loginPrompt')) {
                                        var $auth = $('<div></div>');
                                        vault.$loginPrompt = $('<div class="lightbox"></div>');
                                        var $close = $('<p class="close"><a href="#" title="close"></a></p>').click(function(){
                                            vault.$loginPrompt.hide();
                                            return false;
                                        });
                                        vault.$loginPrompt.hide();
                                        $('body').append(vault.$loginPrompt.append($auth).append($close));
                                    }
                                    
                                    var $loginButton = $('<button>login</button>').click(function(){
                                        promptLogin();
                                    });
                                    $profile.html($loginButton);
                                    
                                    var promptLogin = function() {
                                        vault.$loginPrompt.show();
                                        auth.prompt($auth).authorized(function(loginStatus){
                                            vault.$loginPrompt.hide();
                                            console.log(loginStatus)
                                            var profileView = loginStatus.getView();
                                            $profile.html(profileView.render().el);
                                        });
                                    }
                                }
                            }
                        });
                    });
                    require(['vault.js'], function(apps) {
                        if(callback) callback(apps);
                    });
                });
            });
        });
    }
    
    if(define) {
        define(function () {
            return vault;
        });
    }
})();