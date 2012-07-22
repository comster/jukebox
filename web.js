var housejs = require('house');

var config = require(__dirname+'/config/config.js').config;
config.webPort = process.env.PORT || config.webPort;
var house = new housejs(config);

house.useApps(__dirname+'/apps');

house.start();

