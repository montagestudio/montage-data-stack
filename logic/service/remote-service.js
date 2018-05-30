var Montage = require("montage").Montage,
    HttpService = require("montage/data/service/http-service").HttpService,
    ObjectDescriptor = require("montage/core/meta/object-descriptor").ObjectDescriptor,
    RawDataService = require("montage/data/service/raw-data-service").RawDataService,
    DataOperation = require("montage/data/service/data-operation").DataOperation,
    Promise = require("montage/core/promise").Promise;

var serialize = require("montage/core/serialization/serializer/montage-serializer").serialize;
var deserialize = require("montage/core/serialization/deserializer/montage-deserializer").deserialize;
var io = require('socket.io-client/dist/socket.io');

/**
 * Provides AbstractRemoteService
 *
 * @class
 * @extends external:AbstractRemoteService
 */
exports.AbstractRemoteService = {

   _serialize: {
        value: function (dataObject) {
            // debugger;
            var self = this,
                objectJSON = serialize(dataObject, require);
            return self._deserialize(objectJSON).then(function () {
                //console.log('_serialize', objectJSON, dataObject);
                return objectJSON;
            });
        }
    },

    _deserialize: {
        value: function (objectJSON) {
            
            return deserialize(objectJSON, require).then(function (dataObject) {
                //console.log('_deserialize', objectJSON, dataObject);
                return dataObject;
            }).catch(function (e) {
                console.log(objectJSON);
                console.warn(e);
                debugger;
            });
        }
    },

    //==========================================================================
    // Entry points
    //==========================================================================

    _performOperation: {
        value: function (action, data, service) {
            return Promise.reject('Not Implemented');
        }
    },

    // Get and query
    fetchRawData: {
        value: function (stream) {
            var self = this,
                query = stream.query,
                operation = new DataOperation(),
                context = query.criteria.parameters || {};
            
            // if (query.type.name === "Feature" || query.type.name === "GeometryType") {
            //     console.log(query.type.name, context, context.layer && context.layer.geometryType && context.layer.geometryType.mapRawGeometry);
            //     debugger;
            // }
            
            
            operation.context = context;
            operation.dataType = query.type.objectDescriptorInstanceModule;
            operation.criteria = query.criteria;
            operation.type = DataOperation.Type.Read;

            var id = operation.dataType.id.split("/").pop();

            return self._performOperation(operation).then(function (remoteData) {
                var parameters = operation.criteria && operation.criteria.parameters;
                
                self.addRawData(stream, remoteData, operation.context);
                self.rawDataDone(stream);
            }); 
        }
    },

    // Create and update
    saveRawData: {
        value: function (rawData, object) {
            var self = this,
                type = self.objectDescriptorForObject(object),
                operation = new DataOperation(),
                rawKeys = Object.keys(rawData);
        
            operation.dataType = type.objectDescriptorInstanceModule;
            operation.data = rawData;
            operation.type = this.rootService.createdDataObjects.has(object) ? DataOperation.Type.Create : DataOperation.Type.Update;
            
            if (!rawKeys.length) {
                operation.data = object;
            }
            return self._performOperation(operation).then(function (remoteObject) {

                if (rawKeys.length) {
                    return self._mapRawDataToObject(remoteObject, object);
                } else {
                    return self.nullPromise;
                }
                
            });
        }
    },

    // Delete
    deleteRawData: {
        value: function (rawData, object) {
            var self = this,
                type = self.objectDescriptorForObject(object),
                operation = new DataOperation();

            operation.dataType = type.objectDescriptorInstanceModule;
            operation.data = rawData;
            operation.type = DataOperation.Type.Delete;

            return self._performOperation(operation);
        }
    }
};

/*
 * Provides RemoteService and  HttpRemoteService
 *
 * @class
 * @extends external:RemoteService
 */
exports.HttpRemoteService = HttpService.specialize(exports.AbstractRemoteService).specialize(/** @lends RemoteService.prototype */ {

    _baseUrl: {
        value: '/api/data/operation'
    },

    constructor: {
        value: function HttpRemoteService() {
            // TODO opts
            HttpService.constructor.call(this);
        }
    },

    _performOperation: {
        value: function (operation) {
            var body, url, headers, 
                self = this;
            
            url = self._baseUrl;

            headers = {
                "Content-Type": "application/json"
            };
            var id = operation.dataType.id.split("/").pop();
            
            
            return self._serialize(operation).then(function (operationJSON) {
                body = JSON.stringify({
                    operation: operationJSON
                });
                // if (id === "feature.mjson") {
                //     console.log(JSON.parse(operationJSON));
                //     debugger;
                // }
                return self.fetchHttpRawData(url, headers, body, false);
            }).then(function (response) {
                if (id === "feature.mjson" || id === "geometry-type.mjson") {
                    console.log(id, operation.context, response);
                    debugger;
                }
                return self._deserialize(response);
            }).then(function (returnOperation) {
                if (id === "feature.mjson" || id === "geometry-type.mjson") {
                    console.log(id, operation.context, returnOperation);
                    debugger;
                }
                return returnOperation.data;
            });
        }  
    } 
});

/*
 * Provides WebSocketRemoteService
 *
 * @class
 * @extends external:WebSocketRemoteService
 */
exports.WebSocketRemoteService = RawDataService.specialize(exports.AbstractRemoteService).specialize(/** @lends WebSocketRemoteService.prototype */ {

    _baseUrl: {
        value: ''
    },

    _socket: {
        value: null
    },

    _socketOptions: {
        value: {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax : 5000,
            reconnectionAttempts: Infinity
        }
    },

    constructor: {
        value: function WebSocketRemoteService() {
            this._getSocket();
        }
    },

    _getSocket: {
        value: function () { 
            var self = this;
            return self._socket ? self._socket : (self._socket = new Promise(function (resolve, reject) {  
                // Setup
                var socket = io.connect(self._baseUrl, self._socketOptions);
                socket.on('connect', function() {
                    // TODO
                    //console.log('worked...');
                });
                socket.on('disconnect', function() {
                    // TODO
                    //console.log('disconnected...');
                });

                socket.on('fetchData', function() {
                    // TODO
                    // dispatch result ? on main root service
                });

                socket.on('saveDataObject', function() {
                    // TODO
                    // dispatch on main root service
                });

                socket.on('deleteDataObject', function() {
                    // TODO
                    // dispatch on main root service
                });

                resolve(socket);
            }));
        }
    },

    _performOperation: {
        value: function (action, data) {
            var self = this;
            return self._getSocket().then(function (socket) {
                return new Promise(function (resolve, reject) {  
                    socket.emit(action, data, function(res) {
                        // TODO handle error reject     
                        resolve(res);
                    }); 
                });
            });
        }
    }
});

/*
 * Provides WorkerRemoteService
 *
 * @class
 * @extends external:WorkerRemoteService
 */
exports.WorkerRemoteService = RawDataService.specialize(exports.AbstractRemoteService).specialize(/** @lends WorkerRemoteService.prototype */ {

    constructor: {
        value: function WorkerRemoteService() {
            this._getWorker();
        }
    },

    _getWorker: function () {

    },

    _performOperation: function () {

    }
});

exports.RemoteService = exports.HttpRemoteService;
//exports.RemoteService = exports.WebSocketRemoteService;
