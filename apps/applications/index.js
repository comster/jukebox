//
// # Clock App
//
// 
//
//
(exports = module.exports = function(house){
    var applicationsApp = {};
    
    applicationsApp.config = require('./config/config.js').config;
    
    if(applicationsApp.config.routes) {
        house.addRoutes(applicationsApp.config.routes);
    }
    
    return applicationsApp;
});
