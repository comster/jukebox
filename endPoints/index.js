// # API Enpoints
//
// Configure the API endpoints that you want enabled here
//
(exports = module.exports = function(house){
    var endpoints = [];
    
    // TODO fix this with config
    var mongoDs = house.dataSources.mongo;
    
    var updateEndPointsList = function(endpoints) {
        house.api.endPointsList = [];
        for(var i in endpoints) {
            for(var name in endpoints[i]) {
                house.api.endPointsList.push({name: name, id: name});
            }
        }
    }
    
    // Authentication 
    var authConfig = {
        ds: mongoDs,
        collection: 'users'
    }
    if(house.config.hasOwnProperty('twitter')) {
        authConfig.twitter = {
            key: house.config.twitter.key,
            secret: house.config.twitter.secret,
            urls: {
                callback: house.config.twitter.callback,
                requestToken: "https://api.twitter.com/oauth/request_token",
                accessToken: "https://api.twitter.com/oauth/access_token",
                authorize: "https://api.twitter.com/oauth/authorize",
                endPoint: house.config.twitter.endPoint
            }
        }
    }
    endpoints.push({"auth": require('./auth')(house, authConfig)});
    
    // Users
    endpoints.push({"users": require('./users')(house, {
        ds: mongoDs,
        collection: 'users'
    })});
    
    // A simple endpoint to serve information about applications
    endpoints.push({"apps": require('./apps')(house)});
    
    // File system 
    endpoints.push({"fs": require('./fs')(house, {
        ds: house.dataSources.fileSystem, 
        path: process.cwd()
    })});
    
    //
    // ## Mongo Collections
    //
    // Information about the collections
    //
    endpoints.push({"collections": require('./collections')(house, {ds: mongoDs})});
    
    //
    // Mongo GridFs
    //
    endpoints.push({"files": require('./files')(house, {ds: mongoDs, collection: "f"})});
    
    //
    // Chat
    //
    endpoints.push({"chat": require('./chat')(house, {
        ds: mongoDs,
        roomsCollection: "rooms",
        messagesCollection: "msgs"
    })});
    
    //
    // Music
    //
    endpoints.push({"songs": require('./songs')(house, {ds: mongoDs, collection: "songs"})});
    endpoints.push({"artists": require('./songs')(house, {ds: mongoDs, collection: "artists"})});
    endpoints.push({"albums": require('./songs')(house, {ds: mongoDs, collection: "albums"})});
    
    updateEndPointsList(endpoints);
    
    return endpoints;
});

// TODO allow dynamic configuration of endpoints
