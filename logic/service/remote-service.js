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
                operation = new DataOperation();
            
            operation.dataType = query.type.objectDescriptorInstanceModule;
            operation.criteria = query.criteria;
            operation.type = DataOperation.Type.Read;

            
            return self._performOperation(operation).then(function (remoteDataJson) {
                return self._deserialize(remoteDataJson).then(function (remoteData) {
                    stream.addData(remoteData);
                    stream.dataDone();
                });
            }); 
        }
    },

    // Create and update
    saveRawData: {
        value: function (rawData, object) {
            var self = this,
                type = self.objectDescriptorForObject(object),
                operation = new DataOperation();
        
            operation.dataType = type.objectDescriptorInstanceModule;
            operation.data = rawData;
            operation.type = this.rootService.createdDataObjects.has(object) ? DataOperation.Type.Create : DataOperation.Type.Update;
            return self._performOperation(operation).then(function (remoteObjectJSON) {
                return self._deserialize(remoteObjectJSON).then(function (remoteObject) {
                    return self._mapRawDataToObject(remoteObject, object);
                });
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
        value: '/api/operation'
    },

    constructor: {
        value: function HttpRemoteService() {
            // TODO opts
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
            return self._serialize(operation).then(function (operationJSON) {
                body = JSON.stringify({
                    operation: operationJSON
                });
                return self.fetchHttpRawData(url, headers, body, false);
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
