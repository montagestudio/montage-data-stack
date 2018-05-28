var RawDataWorker = require("montage/data/service/raw-data-worker").RawDataWorker,
    Configuration = require("contour-framework/logic/model/descriptors/configuration.mjson").montageObject,
    Layer = require("contour-framework/logic/model/descriptors/layer.mjson").montageObject,
    MapService = require("contour-framework/logic/model/descriptors/map-service.mjson").montageObject,
    DataOperation = require("montage/data/service/data-operation").DataOperation,
    Criteria = require("montage/core/criteria").Criteria,
    Promise = require("montage/core/promise").Promise;

/**
 * Provides Http to MainService
 *
 * @class
 * @extends external:RawDataWorker
 */
exports.ContourRawDataWorker = RawDataWorker.specialize(/** @lends HttpServerService.prototype */ {

    _configurationPromise: {
        get: function () {
            if (!this.__configurationPromise) {
                var operation = new DataOperation();
                operation.dataType = Configuration;
                operation.type = DataOperation.Type.Read;
                operation.criteria = new Criteria().initWithExpression("", {
                    deploymentURL: "https://testdisasteralert.pdc.org/disasteralert",
                    configurationOnly: true
                });
                this.__configurationPromise = this.handleOperation(operation).then(function (data) {
                    return data[0];
                });
            }
            return this.__configurationPromise;
        }
    },


    handleOperation: {
        value: function (operation) {
            var self = this,
                objectDescriptor, service;

            return self._objectDescriptorForOperation(operation).then(function (descriptor) {
                objectDescriptor = descriptor;
                return self._serviceForObjectDescriptor(descriptor);
            }).then(function (service) {
                var handlerName = self._handlerNameForOperationType(operation.type);
                if (!service) {
                    // console.log(operation, self, objectDescriptor);
                    throw new Error("No service available to handle operation with type (" + (objectDescriptor && objectDescriptor.name) + ")");
                }
                if (objectDescriptor === Layer) {
                    var test = 1;
                }
                if (objectDescriptor === Configuration) {
                return self[handlerName](operation, service, objectDescriptor);
                } else {
                    return self._configurationPromise.then(function (configuration) {
                        return self[handlerName](operation, service, objectDescriptor).then(function (endResult) {
                            var parameters = operation.criteria && operation.criteria.parameters;
                            if (objectDescriptor === Layer && parameters && parameters.mapService) {
                                console.log(endResult);
                                
                            }
                            return endResult;
                        });
                    }).catch(function (e) {
                        var myE = e;
                        console.warn(e);
                    });
                }
            });
        }
    },
});
