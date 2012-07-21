//
//
//
//
//
//
(function(){

    var desktop = {};

    desktop.init = function(callback) {
        require(['underscore.js'], function(){
            require(['backbone.js'], function(){
                //require(['house-backbone.js'], function(){
                require(['windows.js'], function(windows){
                    desktop.windows = windows;
                    windows.render($('body'));
                    
                    $('header').append('<clock format="text"></clock>');
                    require(['../clock/clock.js'], function(clock){
                        clock.startClocks($('clock'));
                    });
                    
                    require(['nav.js'], function(nav){
                        desktop.nav = nav;
                        nav.render($('nav'));
                        
                        //
                        // Example of simple model we generate on the fly to build our nav
                        //
                        // nav.col.add({a:"Wikipedia", href:"http://Wikipedia.com", imgSrc: "http://Wikipedia.com/favicon.ico"});
                        // nav.col.add({a:"home", href:"/", imgSrc: "/favicon.ico"});
                        //
                        require(['../applications/applications.js'], function(apps){
                            apps.init();
                            apps.col.bind("add", function(doc) {
                                nav.col.add({a: doc.get("name"), href: doc.get("url"), imgSrc: doc.get("icon")});
                            });
                            apps.col.load();
                        });
                        
                        nav.list.on('selected', function(navRow){
                            desktop.windows.openUrl(navRow.model.get('href'), navRow.model.get('a'))
                        });
                        
                        if(callback) {
                            callback();
                        }
                    });
                });
            });
        });
    }
    
    if(define) {
        define(function () {
            return desktop;
        });
    }
})();