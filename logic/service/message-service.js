var HttpService = require("montage/data/service/http-service").HttpService,
    Promise = require("montage/core/promise").Promise;
    
function ObjectToMap(obj) {
    const map = new Map();
    Object.keys(obj).forEach(function(key) {
        map.set(key, obj[key]);
    });
    return map;
}

function MapToArray(array) {
    return Array.from(STORE, function(key, value) {
        return  value;   
    });
}

function MaxMapItemPropertyValue(array, prop) {
    return MapToArray(array).reduce(function (prev, curr) {
        return curr ? Math.max(prev[prop], curr[prop]) : prev[prop];
    })[prop];
}

var STORE = ObjectToMap({
    42: {
        "id": 42,
        "subject": "You've got mail",
        "text": "Hello World!",
        "created": Date.now()
    }
});

var AUTO_INCREMENT_ID = MaxMapItemPropertyValue(STORE, 'id');

var dataStore = {
    all: function () {
        return Promise.resolve(Array.from(STORE));
    },
    filterBy: function (prop, value) {
        return Promise.resolve(Array.from(STORE).filter(function (rawDataEntry) {
            return rawDataEntry[prop] === value;
        }));
    },
    save: function (value) {

        // Update rawData
        if (!value.id) {
            AUTO_INCREMENT_ID++;
            value.id = AUTO_INCREMENT_ID;
            value.created = Date.now();
        } else {
            value.updated = Date.now();
        }
        
        return Promise.resolve(STORE.set(value.id, value)).then(function () {
            return value;
        });
    },
    get: function (key) {
        return Promise.resolve(STORE.get(key));  
    },
    delete: function (key) {
        return Promise.resolve(STORE.delete(key));   
    }
};

var Message = require('logic/model/message-model');

/**
 * Provides Message
 *
 * @class
 * @extends external:HttpService
 */
exports.MessageService = HttpService.specialize(/** @lends MessageService.prototype */ {

    // TODO
    // Cause Can\'t fetch data of unknown type
    // Need to me module not object
    /*
    types: {
        value: [Message]
    },
    */

    //==========================================================================
    // Entry points
    //==========================================================================

    // Get and query
    fetchRawData: {
        value: function (stream) {
            var self = this,
                query = stream.query,
                criteria = query.criteria,
                parameters = criteria.parameters;

            if (parameters && parameters.id) {
                return dataStore.filterBy('id', parameters.id).then(function (rawData) {
                    self.addRawData(stream, rawData);
                    self.rawDataDone(stream); 
                });
            } else {
                return dataStore.all().then(function (rawData) {
                    self.addRawData(stream, rawData);
                    self.rawDataDone(stream);
                });
            }
        }
    },

    // Create and update
    saveRawData: {
        value: function (rawData, object) {
            var self = this;
            // Update store
            return dataStore.save(rawData).then(function (rawData) {
                return object ? self._mapRawDataToObject(rawData, object) : rawData;
            });
        }
    },

    // Delete
    deleteRawData: {
        value: function (rawData, object) {
            return dataStore.delete(rawData.id);
        }
    }
});
