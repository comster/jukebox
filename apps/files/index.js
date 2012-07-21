//
// # Files App
//
// 
//
//
(exports = module.exports = function(house){
    var filesApp = {};
    
    filesApp.config = require('./config/config.js').config;
    
    if(filesApp.config.routes) {
        house.addRoutes(filesApp.config.routes);
    }
    
    return filesApp;
});
