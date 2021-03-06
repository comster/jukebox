//
// # File System API Endpoint
//
(exports = module.exports = function(house, options){
    // This endpoint requires a data source
    var ds = options.ds;
    var basePath = options.path;
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        if(req.method == 'GET') {
            ds.find(basePath, path, function(err, data){
                if(err) {
                    if(err === 301) {
                        house.utils.response.redirect(res, req.urlOrig+data);
                    } else {
                        house.log.err(err);
                    }
                } else if(data) {
                    res.data(data);
                } else {
                    house.log.err(new Error('no data from fs find'));
                }
            });
        } else if(req.method == 'POST') {
            house.log.debug('post');
            console.log(basePath+path)
            console.log(req.fields)
            ds.insert(basePath+path, req.fields, function(err, data){
                if(err) {
                    house.log.err(err);
                    res.end('error');
                } else {
                    res.data(data);
                }
            });
        } else if(req.method == 'PUT') {
            var editData = '';
            if(req.fields.hasOwnProperty('$set')) {
                req.fields = req.fields.$set;
            }
            if(req.fields.hasOwnProperty('data')) {
                editData = req.fields.data;
                
                if(req.fields.hasOwnProperty('mime') && req.fields.mime.indexOf('text') !== 0) {
                    editData = new Buffer(editData, 'base64');
                }
            }
            ds.update(basePath, path, editData, function(err, data){
                if(err) {
                    house.log.err(err);
                    res.end('error');
                } else {
                    res.data(data);
                }
            });
        } else if(req.method == 'DELETE') {
            ds.remove(basePath, path, function(err, data){
                if(err) {
                    house.log.err(err);
                    res.end('error');
                } else {
                    res.data(data);
                }
            });
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});
