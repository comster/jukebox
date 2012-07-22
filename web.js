var housejs = require('house');

var config = require(__dirname+'/config/config.js').config;

    var house = new housejs(config);

    house.useApps(__dirname+'/apps');

    house.start();

