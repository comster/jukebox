//
// # Chat App
//
(exports = module.exports = function(house){
    var app = {};
    
    app.config = require('./config/config.js').config;
    
    if(app.config.routes) {
        house.addRoutes(app.config.routes);
    }
    
    return app;
});
