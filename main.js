/* jshint node: true */
'use strict';

// [START main_body]
var Montage = require('montage');

const PATH = require("path");
const APP_PATH = process.env.APP_PATH || PATH.join(__dirname, ".");
const APP_MAIN = process.env.APP_MAIN || 'data/main-raw-data-worker.mjson';

// Get montage requie instance
var montageRequire;
function getMontageRequire() {
    // Next call will wait on same promise
    return montageRequire ? montageRequire : (montageRequire = Montage.loadPackage(APP_PATH, {
        mainPackageLocation: APP_PATH
    }));
}

// Get main service instance
var mainService;
function getMainService() {
    // Next call will wait on same promise
    return mainService ? mainService : (mainService = getMontageRequire().then(function (mr) {
        return mr.async('montage/core/serialization/deserializer/montage-deserializer').then(function (module) {
            var Deserializer = module.MontageDeserializer;
            return mr.async(APP_MAIN).then(function (descriptor) {
                var deserializer = new Deserializer().init(descriptor, mr);
                return deserializer.deserializeObject();
            }); 
        });
    }));
}

// Serialize Montage Object
function serialize(object) {
    return getMontageRequire().then(function (mr) {
        return mr.async('montage/core/serialization/serializer/montage-serializer').then(function (module) {
            // TODO allow serialize to return JSON Object not string
            return module.serialize(object, mr); 
        }).then(function (result) {
            // Preparse
            return JSON.parse(result);
        });
    });
}

// Deserialize Montage Object
function deserialize(data) {
    return getMontageRequire().then(function (mr) {
        return mr.async('montage/core/serialization/deserializer/montage-deserializer').then(function (module) {
            return module.deserialize(data, mr); 
        });
    });
}

// Deserialize data to query or object
// TODO wrap in operation or receive operation
function getOperationFromData(data, type) {
    return getMontageRequire().then(function (mr) {
        return mr.async('montage/data/service/data-operation').then(function (module) {
            var DataOperation = module.DataOperation;
            type = type || 'operation';
            return new Promise(function (resolve, reject) {
                // Falsy data should fail
                if (!data) {
                    reject('Missing Operation Data');
                    return;
                }

                // Handle bad JSON Operation and pre-decode for deserializer
                try {
                    // Resolve Data
                    resolve(deserialize(data));
                } catch (error) {
                    // Handle error
                    reject(error);
                }   
            }).then(function (montageObject) {
                return new Promise(function (resolve, reject) {
                    if (montageObject instanceof DataOperation) {
                        resolve(montageObject);
                    } else {
                        var operation = new DataOperation()
                        if (type === 'fetchData') {
                            var query = montageObject;
                            operation.type = DataOperation.Type.Read;
                            operation.dataType = query.type.objectDescriptorInstanceModule;
                            operation.criteria = query.criteria;
                            resolve(operation);
                        } else if (type === 'saveDataObject') {
                            // TODO check
                            var dataObject = operation;
                            operation.type = DataOperation.Type.Save;
                            operation.dataType = dataObject.type.objectDescriptorInstanceModule;
                            operation.data = dataObject.data;
                            resolve(operation);
                        } else if (type === 'deleteDataObject') {
                            // TODO check
                            var dataObject = operation;
                            operation.type = DataOperation.Type.Delete;
                            operation.dataType = dataObject.type.objectDescriptorInstanceModule;
                            operation.data = dataObject.data;
                            resolve(operation);
                        } else {
                            reject('Unknow Operation Data Type: ' + type);
                        } 
                    }     
                });
            });
        });
    });
}

// Serialize data to query result or object
// TODO wrap in operation or receive operation
function getDataOperationResponse(operation) {
    return serialize(operation);
}



function returnOperationTypeForOperation(incomingType, enumeration, error) {
    return error ? enumeration.failureTypeForType(incomingType) :
                   enumeration.completionTypeForType(incomingType);
}          

// Initialize Main Service.
console.time('MainService');
getMainService().then(function () {
    console.timeEnd('MainService');
    console.log("MainService Ready!");  
});


// Perform fetchData operation
exports.handleOperation = function (rawOperation) {
    var operation;
    // Decode operation prior to get main service
    return getOperationFromData(rawOperation).then(function (mappedOperation) {
        operation = mappedOperation;
        // Disptach Operation on main service
        return getMainService().then(function (mainService) {
            //console.log('mainService.fetchData', dataQuery);
            return mainService.handleOperation(operation).then(function (queryResult) {
                return getDataOperationResponse(queryResult, operation);
            });
        });
    });
};

// Perform fetchData operation
exports.fetchData = function (query) {
    // Decode operation prior to get main service
    return getOperationFromData(query, 'fetchData').then(function (dataQuery) {
        // Disptach Operation on main service
        return getMainService().then(function (mainService) {
            //console.log('mainService.fetchData', dataQuery);
            return mainService.handleOperation(dataQuery).then(function (queryResult) {
                return getDataOperationResponse(queryResult);
            });
        });
    });
};

// Perform deleteDataObject operation
exports.deleteDataObject = function (data) {
    // Decode operation prior to get main service
    return getOperationFromData(data, 'deleteDataObject').then(function (dataObject) {
        // Disptach Operation on main service
        return getMainService().then(function (mainService) {
            //console.log('mainService.deleteDataObject', dataObject);
            return mainService.handleOperation(dataObject).then(function (result) {
                return getDataOperationResponse(dataObject);
            });
        });
    });
};

// Perform saveDataObject operation
exports.saveDataObject = function (data) {
    // Decode operation prior to get main service
    return getOperationFromData(data, 'saveDataObject').then(function (dataObject) {
        // Disptach Operation on main service
        return getMainService().then(function (mainService) {
            //console.log('mainService.saveDataObject', dataObject);
            return mainService.handleOperation(dataObject).then(function (result) {
                return getDataOperationResponse(dataObject);
            });
        });
    });
};
