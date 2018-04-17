const PATH = require("path");
const APP_PATH = process.env.APP_PATH || PATH.join(__dirname, ".");

var Montage = require('montage');

// TODO
// In progress - Load Service/Model/Mapping programaticly 
// Next - Load Via main.mjson

var montageRequire;
function getMontageRequire() {
    // Once only
    if (montageRequire) {
        return Promise.resolve(montageRequire);
    }

    return Montage.loadPackage(APP_PATH, {
        mainPackageLocation: APP_PATH
    }).then(function (require) {
        return (montageRequire = require);
    });
}

var mainService;
function getMainService() {
    return getMontageRequire().then(function (mr) {

        // Once only
        if (mainService) {
            return Promise.resolve(mainService);
        }
        
        return mr.async('montage/core/serialization/deserializer/montage-deserializer').then(function (module) {
            var Deserializer = module.MontageDeserializer;
            return mr.async('data/main.mjson').then(function (descriptor) {
                var deserializer = new Deserializer().init(descriptor, mr);
                return deserializer.deserializeObject();
            }); 
        });
    });
}

function serialize(object) {
    return getMontageRequire().then(function (mr) {
        return mr.async('montage/core/serialization/serializer/montage-serializer').then(function (module) {
            return module.serialize(object, mr); 
        });
    });
}

function deserialize(data) {
    return getMontageRequire().then(function (mr) {
        return mr.async('montage/core/serialization/deserializer/montage-deserializer').then(function (module) {
            return module.deserialize(data, mr); 
        });
    });
}

function createDataQueryFromParams(queryParam) {
    return getMontageRequire().then(function (mr) {
        return mr.async("montage/data/service/data-selector").then(function (module) {
            var DataSelector = module.DataSelector;
            return mr.async("montage/core/criteria").then(function (module) {
                var Criteria = module.Criteria;
                return mr.async("logic/model/message-model").then(function (module) {
                    console.log('ok')
                    // A Default Query
                    var dataType = module["Message"];
                    var dataExpression = "";
                    var dataParameters = queryParam;

                    var dataCriteria = new Criteria().initWithExpression(dataExpression, dataParameters);
                    var dataQuery  = DataSelector.withTypeAndCriteria(dataType, dataCriteria);
                    //return dataQuery;
                    return serialize(dataQuery).then(function (queryJson) {
                        console.log('createDataQueryFromParams (serialized)', queryJson);
                        return dataQuery;
                    }).catch(function (err) {
                        console.log(err)
                    });
                });
            });
        }); 
    });
}

function getDataOperationFromData(queryJson) {
    return getMontageRequire().then(function (mr) {
        return mr.async("montage/data/service/data-selector").then(function (module) {
            var DataSelector = module.DataSelector;
            return mr.async("montage/core/criteria").then(function (module) {
                var Criteria = module.Criteria;
                console.log('getDataOperationFromData (serialized)', queryJson);
                return deserialize(queryJson);
            });
        }); 
    });
}

function getDataOperationFromRequest(request) {
    var queryParam = request && (request.query.query || request.params.query);
    console.log('getDataOperationFromRequest', queryParam);
    return queryParam ? 
        getDataOperationFromData(queryParam) : 
            createDataQueryFromParams(request);
}

function getDataOperationResponse(response, queryResult) {
    return serialize(queryResult).then(function (queryJson) {
        console.log('getDataOperationResponse (serialized)', queryJson);
        return queryJson;
    });
}

exports.fetchData = function (req, res) {
    return getDataOperationFromRequest(req).then(function (dataQuery) {
        return getMainService().then(function (mainService) {
            return mainService.fetchData(dataQuery).then(function (queryResult) {
                return getDataOperationResponse(res, queryResult);
            });
        });
    });
};

exports.deleteDataObject = function (req, res) {
    return getDataOperationFromRequest(req).then(function (dataObject) {
        return getMainService().then(function (mainService) {
            return mainService.deleteDataObject(dataObject).then(function (result) {
                return getDataOperationResponse(res, result);
            });
        });
    });
};

exports.saveDataObject = function (req, res) {
    return getDataOperationFromRequest(req).then(function (dataObject) {
        return getMainService().then(function (mainService) {
            return mainService.saveDataObject(dataObject).then(function (result) {
                return getDataOperationResponse(res, result);
            });
        });
    });
};