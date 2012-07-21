// # API Endpoint APPS
//
(exports = module.exports = function(house){
    
    
    var handleReq = function(req, res, next) {
        if(req.fields) {
            res.data(req.fields);
        } else {
            if(req.method == 'GET') {
                if(req.url.length > 1 && req.url.indexOf('/') === 0) {
                    
                    var id = req.url.substr(req.url.indexOf('/')+1);
                    if(id.indexOf('/') !== -1) {
                        id = id.substr(0, id.indexOf('/'));
                    }
                    
                    res.data(house.apps[id]);
                } else {
                    res.data(house.appsList);
                }
            } else {
                next();
            }
        }
    };
    return handleReq;
});

