//
// # Clock App
//
// 
//
//
(exports = module.exports = function(house){
    var clockApp = {};
    
    clockApp.config = require('./config/config.js').config;
    
    if(clockApp.config.routes) {
        house.addRoutes(clockApp.config.routes);
    }
    
    return clockApp;
});
