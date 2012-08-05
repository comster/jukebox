//
// # Mongodb GridFs API Endpoint
//
var ObjectID = mongo.ObjectID;
var spawn = require('child_process').spawn;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var filesRoot = options.collection;
    var col = filesRoot+'.files';
    
    var getExifDataFromPath = function(filePath) {
        var self = this;
       var exif = spawn('/usr/bin/exiftool', [filePath]);
       var exifOut = '';
       exif.stdout.on('data', function (data) {
         //console.log('stdout: ' + data);
         exifOut += data.toString();
       });
    
       exif.stderr.on('data', function (data) {
         console.log('stderr: ' + data);
         console.dir(data);
       });
    
       exif.on('close', function (code) {
         //console.log('exiftool process exited with code ' + code);
         if(code == 0){ // good
           var exifObject = {};
           exifOut = exifOut.split('\n');
           exifOut.forEach(function(e, i){
             var tmp = e.split(': ');
             exifObject[tmp[0].trim()] = tmp[1];
           });
           //console.log(exifObject);
           if(self.hasOwnProperty('resultCb')) {
               self.resultCb(exifObject);
           }
         }
       });
           
        return {
            "result": function(callback){
                self.resultCb = callback;
            }
        }
    }
    
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
        file_name.substr(0,file_name.lastIndexOf('.')).replace('.','')+file_name.substr(file_name.lastIndexOf('.'));
        
        var mime_type = file.type;
        
        var uploadFileGridStore = new mongo.GridStore(ds.db, file_name, "w", {
            content_type: mime_type,
            metadata: metadata,
            root: filesRoot
        });
        uploadFileGridStore.writeFile(file.path, function(err, gridFile){
            //console.log('uploadFileGridStore.writeFile');
            //console.log(gridFile);
            callback(err, gridFile);
        });
    }
    
    var getReadableGridStore = function(filename) {
        var gs = new mongo.GridStore(ds.db, filename, "r", {'root': filesRoot});
        return gs;
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        //console.log(req.headers)
        //console.log(req.method)
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
            
            //console.log(path);
            if(path === '' || path === '/') {
                findQuery(query);
            } else {
                var filename = decodeURIComponent(path.substr(1));
                //console.log(filename);
                //console.log('mongo.GridStore.exist');
                mongo.GridStore.exist(ds.db, filename, filesRoot, function(err, result) {
                    if(result) {
                        
                        getReadableGridStore(filename).open(function(err, gs){
                            var resCode = 200;
                            var offset = 0;
                            var etag = '"'+gs.length+'-'+gs.uploadDate+'"';
                            var contentType = gs.contentType;
                            var headerFields = {
                                'Content-Type': contentType
                                , 'Date': gs.uploadDate
                            	//, 'ETag': etag
                            };
                            
                            if(req.method == 'HEAD') {
                                //console.log('HEAD');
                                headerFields["Content-Length"] = gs.length;
                                headerFields["Accept-Ranges"] = 'bytes';
                                gs.close(function(){
                                    //house.log.debug('gridstore closed');
                                    res.writeHead(200, headerFields);
                                    res.end('');
                                });
                                return;
                            }
                            
                            if(req.headers['if-none-match'] == etag){
                              resCode = 304;
                              headerFields['Content-Length'] = 0;
                              gs.close(function(){
                                  res.writeHead(resCode, headerFields);
                                  res.end();
                              });
                              return;
                            }
                            
                            var contentLen = gs.length;
                            var bytStr = 'bytes=';
                            var chunkSize = 4096
                            , lengthRemaining = gs.length;
                            //console.log('req.headers.range.substr(0,bytStr.length)');
                            if(req.headers.range && req.headers.range.substr(0,bytStr.length) == bytStr) {
                                //console.log('range '+req.headers.range);
                            	var rangeString = '';
                                var bytSelection = req.headers.range.substr(bytStr.length);
                            	var bytDashPos = bytSelection.indexOf('-');
                            	var bytPreDash = bytSelection.substr(0, bytDashPos);
                            	var bytEndDash = bytSelection.substr(bytDashPos+1);
                            	resCode = 206;
                            	if(bytPreDash == '0') {
                            		if(bytEndDash) {
                            			contentLen = parseInt(bytEndDash);
                                        rangeString = bytPreDash + '-' + bytEndDash+1;
                            		} else {
                            		    rangeString = '0-' + (gs.length-1).toString();
                            		}
                            	} else if(bytEndDash != '' && bytPreDash != '') {
                            		contentLen = parseInt(bytEndDash) - parseInt(bytPreDash);
                            		offset = parseInt(bytPreDash);
                            		rangeString = bytPreDash + '-' + bytEndDash;
                                    //console.log(offset);
                            	} else if(bytEndDash == '' && bytPreDash != '') {
                                    // ex, 1234-
                            		contentLen = contentLen - parseInt(bytPreDash);
                            		offset = parseInt(bytPreDash) - 1;
                            		rangeString = bytPreDash + '-' + (gs.length - 1).toString();
                            	}
                            	headerFields["Content-Range"] = 'bytes ' + rangeString+'/'+gs.length; // needs to always be the full content length? // req.headers.range; //bytSelection; // should include bytes= ???
                                headerFields["Vary"] = "Accept-Encoding";
                            	lengthRemaining = contentLen;
                            }
                            
                            house.log.debug(resCode+' '+filename+' as: '+gs.contentType+' with length: ' + contentLen, resCode);
                            headerFields["Content-Length"] = contentLen;
                            //headerFields["Accept-Ranges"] = 'bytes'; // enables scrubbing in chrome
                            
                        	//house.log.debug(headerFields);
                            res.writeHead(resCode, headerFields);
                            
                            if(lengthRemaining < chunkSize) {
                              chunkSize = lengthRemaining;
                            }
                            
                            var gridStoreReadChunk = function(gs) {
                                var readAndSend = function(chunk) {
                                  gs.read(chunk, function(err, data) {
                                	if(err) {
                                	  house.log.err('file read err: '+filename);
                                	  house.log.err(err);
                                      gs.close(function(){
                                          //house.log.debug('gridstore closed');
                                          res.end();
                                      });
                                      return;
                                	}
                                		
                                      res.write(data, 'binary');
                                      lengthRemaining = lengthRemaining - chunk;
                                      
                                      if(lengthRemaining < chunkSize) {
                                        chunkSize = lengthRemaining;
                                      }
                                    
                                    
                                    if(lengthRemaining > 0) {
                                      readAndSend(chunkSize);
                                    } else {
                                      // close the gridstore
                                      gs.close(function(){
                                          //house.log.debug('gridstore closed');
                                          res.end();
                                      });
                                    }
                                  }); // read
                                }
                                if(chunkSize > 0) {
                                  readAndSend(chunkSize);
                                }
                            }
                            if(offset != 0) {
                                //house.log.debug('gridstore seek '+offset);
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
                           //console.log(filename)
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
                            if(err) {
                                console.log('file upload err');
                                console.log(err);
                            } else {
                                if(data.contentType.indexOf('audio') === 0) {
                                    console.log('proces audio upload');
                                    
                                    getExifDataFromPath(file.path).result(function(exif){
                                        console.log('metadata');
                                        console.log(exif);
                                    
                                        var newSong = {
                                            file_id: data._id,
                                            filename: data.filename,
                                            ss: ''
                                        }
                                        if(exif.Title) {
                                            newSong.title = exif.Title;
                                            newSong.ss += exif.Title;
                                        }
                                        if(exif.Album) {
                                            newSong.album = exif.Album;
                                            newSong.ss += ' '+exif.Album;
                                        }
                                        if(exif.Artist) {
                                            newSong.artist = exif.Artist;
                                            newSong.ss += ' '+exif.Artist;
                                        }
                                        if(exif.Year) {
                                            newSong.year = exif.Year;
                                        }
                                        if(exif.Genre) {
                                            newSong.genre = exif.Genre;
                                        }
                                        if(exif.Duration) {
                                            newSong.duration = exif.Duration;
                                            var iof = newSong.duration.indexOf(' (approx)');
                                            if(iof !== -1) {
                                                newSong.duration = newSong.duration.substr(0,iof);
                                            }
                                            var dArr = newSong.duration.split(':');
                                            var mins = parseInt(dArr[0], 10);
                                            var secs = parseInt(dArr[1], 10);
                                            
                                            newSong.duration = (mins * 60) + secs;
                                        }
                                        // picture
                                        // track
                                        // lyrics
                                        
                                        ds.insert('songs', newSong, function(err, songData) {
                                            //console.log('new song!');
                                            res.data({song: songData, file: data});
                                            
                                            fs.unlink(file.path, function(){
                                                console.log('file unlinked from tmp');
                                            });
                                        });
                                    });
                                    
                                } else {
                                    console.log('done upload');
                                    res.data({file:data});
                                }
                            }
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
            //console.log(req.headers)
            //console.log('HEAD');
            res.data({});
        } else if(req.method == 'OPTIONS') {
            //console.log('OPTIONS');
        } else {
            if(req.method) {
                //console.log('bad method '+req.method);
            } else {
                //console.log('NO method!');
            }
        }
    }
    return handleReq;
});
