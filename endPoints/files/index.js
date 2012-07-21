//
// # Mongodb GridFs API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var filesRoot = options.collection;
    var col = filesRoot+'.files';
    
    var getUniqueFileName = function(name) {
        
    }
    
    var importFileToGrid = function(file, metadata, callback) {
        var self = this;
        
        if (typeof metadata == "function") {
            callback = metadata;
            metadata = {};
        } else {
            metadata = metadata || {};
        }
        
        var file_name = decodeURIComponent(file.name);
        var mime_type = file.type;
        
        var uploadFileGridStore = new mongo.GridStore(ds.db, file_name, "w", {
            content_type: mime_type,
            metadata: metadata,
            root: filesRoot
        });
        uploadFileGridStore.writeFile(file.path, function(err, gridFile){
            console.log('uploadFileGridStore.writeFile');
            console.log(gridFile);
            callback(err, gridFile);
        });
    }
    
    var getReadableGridStore = function(filename) {
        var gs = new mongo.GridStore(ds.db, filename, "r", {'root': filesRoot});
        return gs;
    }
    
    var handleReq = function(req, res, next) {
        var path = req.url;
        
        var findQuery = function(query, callback) {
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    res.data(data);
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        if(req.method == 'GET' || req.method == 'HEAD') {
            var query = {};
            
            console.log(path);
            if(path === '' || path === '/') {
                findQuery(query);
            } else {
                var filename = decodeURIComponent(path.substr(1));
                mongo.GridStore.exist(ds.db, filename, filesRoot, function(err, result) {
                    if(result) {
                        getReadableGridStore(filename).open(function(err, gs){
                            var resCode = 200;
                            var offset = 0;
                            var etag = '"'+gs.length+'-'+gs.uploadDate+'"';
                            var headerFields = {
                                'Content-Type': gs.contentType
                                , 'Date': gs.uploadDate
                            	, 'ETag': etag
                            };
                            
                            if(req.headers['if-none-match'] == etag){
                              resCode = 304;
                              headerFields['Content-Length'] = 0;
                              res.writeHead(resCode, headerFields);
                              res.end();
                              return;
                            }
                            
                            var contentLen = gs.length;
                            var bytStr = 'bytes=';
                            var chunkSize = 1024
                            , lengthRemaining = gs.length;
                            
                            if(req.headers.range && req.headers.range.substr(0,bytStr.length) == bytStr) {
                                house.log.debug('range '+req.headers.range);
                            	var rangeString = '';
                                var bytSelection = req.headers.range.substr(bytStr.length);
                            	var bytDashPos = bytSelection.indexOf('-');
                            	var bytPreDash = bytSelection.substr(0, bytDashPos);
                            	var bytEndDash = bytSelection.substr(bytDashPos+1);
                            	resCode = 206;
                            	if(bytPreDash == '0') {
                            		if(bytEndDash) {
                            			contentLen = parseInt(bytEndDash)+1;
                                        rangeString = bytPreDash + '-' + bytEndDash;
                                        console.log('range string---------------------');
                                        console.log(contentLen);
                                        console.log('range string---------------------');
                            		} else {
                            		    rangeString = '0-' + (gs.length-1).toString();
                            		}
                            	} else if(bytEndDash != '' && bytPreDash != '') {
                            		contentLen = parseInt(bytEndDash) - parseInt(bytPreDash) + 1;
                            		offset = parseInt(bytPreDash);
                            		rangeString = bytPreDash + '-' + bytEndDash;
                            	} else if(bytEndDash == '' && bytPreDash != '') {
                                    // ex, 1234-
                            		contentLen = contentLen - parseInt(bytPreDash);
                            		offset = parseInt(bytPreDash) - 1;
                            		rangeString = bytPreDash + '-' + (gs.length - 1).toString();
                            	}
                            	headerFields["Content-Range"] = 'bytes=' + rangeString+'/'+gs.length; // needs to always be the full content length? // req.headers.range; //bytSelection; // should include bytes= ???
                            	lengthRemaining = contentLen;
                            }
                            
                            house.log.debug(resCode+' '+filename+' as: '+gs.contentType+' with length: ' + contentLen, resCode);
                            headerFields["Content-Length"] = contentLen;
                            //headerFields["Accept-Ranges"] = 'bytes'; // enables scrubbing in chrome
                            
                        	house.log.debug(headerFields);
                            res.writeHead(resCode, headerFields);
                            
                            if(lengthRemaining < chunkSize) {
                              chunkSize = lengthRemaining;
                            }
                            
                            var gridStoreReadChunk = function(gs) {
                                var readAndSend = function(chunk) {
                                    console.log('chunk');
                                    console.log(chunk);
                                  gs.read(chunk, function(err, data) {
                                	if(err) {
                                	  house.log.err('file read err: '+filename);
                                	  house.log.err(err);
                                      gs.close(function(){
                                          house.log.debug('gridstore closed');
                                      });
                                      res.end();
                                      return;
                                	} else {
                                		
                                      res.write(data, 'binary');
                                      lengthRemaining = lengthRemaining - chunk;
                                      
                                      if(lengthRemaining < chunkSize) {
                                        chunkSize = lengthRemaining;
                                      }
                                    }
                                    
                                    if(lengthRemaining <= 1) {
                                      // close the gridstore
                                      gs.close(function(){
                                          house.log.debug('gridstore closed');
                                      });
                                      res.end();
                                    } else {
                                        console.log(chunkSize);
                                      readAndSend(chunkSize);
                                    }
                                  }); // read
                                }
                                if(chunkSize > 0) {
                                  readAndSend(chunkSize);
                                }
                            }
                            if(offset != 0) {
                                 gs.seek(offset, function(err, gs) {
                                 	if(err) {
                                 		house.log.err('err');
                                 	}
                                 	gridStoreReadChunk(gs);
                                 });
                            } else {
                                 gridStoreReadChunk(gs);
                            }
                        });
                        
                    } else {
                       if(err) {
                           house.log.err(err);
                           res.end('error');
                       } else {
                           
                           findQuery({_id:docId = new ObjectID(filename)});
                           //res.end('file does not exist');
                       }
                    }
                });
            }
            
        } else if(req.method == 'POST') {
            house.log.debug('post to files (upload)');
            if(path == '') {
                if(req.files) {
                    for(var i in req.files) {
                        var file = req.files[i];
                        importFileToGrid(file, {}, function(err, data){
                            console.log('done upload');
                            res.data(data);
                        });
                    }
                }
            }
        } else if(req.method == 'PUT') {
            var query = {};
            if(docId) {
                query._id = docId;
            
                ds.update(col, query, req.fields, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        house.log.debug(data);
                        res.data({});
                    }
                });
            }
        } else if(req.method == 'DELETE') {
            var query = {};
            if(docId) {
                query._id = docId;
                ds.remove(col, query, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        res.data(data);
                    }
                });
                
            }
        } else if(req.method == 'HEAD') {
            console.log(req.headers)
            console.log('HEAD');
            res.data({});
        } else if(req.method == 'OPTIONS') {
            console.log('OPTIONS');
        } else {
            if(req.method) {
                console.log('bad method '+req.method);
            } else {
                console.log('NO method!');
            }
        }
    }
    return handleReq;
});
