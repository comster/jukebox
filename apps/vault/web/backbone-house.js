window.houseApi = '/api';

var methodMap = {
  'create': 'POST',
  'update': 'PUT',
  'delete': 'DELETE',
  'read':   'GET'
};

var getValue = function(object, prop) {
  if (!(object && object[prop])) return null;
  return _.isFunction(object[prop]) ? object[prop]() : object[prop];
};

// TODO sync with offline storage

Backbone.sync = function(method, model, options) {
    //console.log('backbone.sync');
    //if(navigator && navigator.hasOwnProperty('onLine') && !navigator.onLine) {
    //    return;
    //}
    //console.log(arguments)
  var type = methodMap[method];
  
  // Default options, unless specified.
  options || (options = {});

  // Default JSON-request options.
  var params = {type: type, dataType: 'json'};

  // Ensure that we have a URL.
  //console.log(options);
  if (!options.url) {
    params.url = getValue(model, 'url') || urlError();
  }

  // Ensure that we have the appropriate request data.
  if (!options.data && model && (method == 'create' || method == 'update')) {
    params.contentType = 'application/json';
    params.data = JSON.stringify(model.toJSON());
  }
  
  if (params.type === 'PUT') {
      var changedAttr = model.changedAttributes();
      
      if(changedAttr) {
        params.data = JSON.stringify({"$set":changedAttr});
      } else if(model.pulls) {
          params.data = JSON.stringify({"$pull":model.pulls});
      } else if(model.pushes) {
          params.data = JSON.stringify({"$push":model.pushes});
      } else if(model.pushAlls) {
          params.data = JSON.stringify({"$pushAll":model.pushAlls});
      }
  }

  // Don't process data on a non-GET request.
  if (params.type !== 'GET' && !Backbone.emulateJSON) {
    params.processData = false;
  }
  params.xhrFields = {
     withCredentials: true
  }
  //console.log(params)
  //console.log(options)
  // Make the request, allowing the user to override any Ajax options.
  return $.ajax(_.extend(params, options));
};