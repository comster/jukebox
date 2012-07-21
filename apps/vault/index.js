//
// # Clock App
//
// 
//
//
(exports = module.exports = function(house){
    var vaultApp = {};
    
    vaultApp.config = require('./config/config.js').config;
    
    if(vaultApp.config.routes) {
        house.addRoutes(vaultApp.config.routes);
    }
    
    return vaultApp;
});
