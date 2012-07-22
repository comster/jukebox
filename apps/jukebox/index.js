//
// # Jukebox App
//
(exports = module.exports = function(house){
    var app = {};
    
    app.config = require('./config/config.js').config;
    
    if(app.config.routes) {
        house.addRoutes(app.config.routes);
    }
    
    house.io.configure(function () { 
      house.io.set("transports", ["xhr-polling"]); 
      house.io.set("polling duration", 10); 
    });
    
    return app;
});
