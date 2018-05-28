var Component = require("montage/ui/component").Component;
var DataQuery = require("montage/data/model/data-query").DataQuery;
var Criteria = require("montage/core/criteria").Criteria;

var serialize = require("montage/core/serialization/serializer/montage-serializer").serialize;
var deserialize = require('montage/core/serialization/deserializer/montage-deserializer').deserialize;

//var mainService = require("data/main.mjson").montageObject;
// var mainService = require("data/main-remote.mjson").montageObject;
// var mainService = require("data/service/remote-service.mjson").montageObject;
var mainService = require("data/service/remote-service-contour.mjson").montageObject;

var SentinelContourController = require("contour-framework/logic/controller/sentinel-contour-controller").SentinelContourController;

// var Message = require("data/descriptors/message.mjson").montageObject;
// var Person = require("data/descriptors/person.mjson").montageObject;
var Feature = require("contour-framework/logic/model/descriptors/feature.mjson").montageObject;
var Layer = require("contour-framework/logic/model/descriptors/layer.mjson").montageObject;
var MapService = require("contour-framework/logic/model/descriptors/map-service.mjson").montageObject;
var Configuration = require("contour-framework/logic/model/descriptors/configuration.mjson").montageObject;

function assert(msg, assertion, debug) {
    if (assertion) {
        console.info(msg, 'ok', debug);
    } else {
        console.error(msg, 'error', debug);
    }
}

/**
 * @class Main
 * @extends Component
 */
exports.Main = Component.specialize(/** @lends Main# */ {

    


    constructor: {
        value: function Main() {
            this.super();
            var self = this;
            self.application.delegate = new SentinelContourController();
            self.application.delegate.initialize(mainService).then(function () {
                self._run();
            });
            
        }
    },

    _enableDefaultLayers: {
        value: function () {
            var background = null,
                layers, layer, i, n;

            layers = this.application.delegate.configuration.layers["default"];
            console.log("DefaultLayers", layers);
            layers[3].isEnabled = true; //Enable hazard layer
            
            // for (i = 0; (i < 1 && (layer = layers[i])); ++i) {
            //     console.log(layer);
            //     debugger;
            //     layer.isEnabled = true;
            //     background = background || layer.isBackground && layer;
            // }

            // if (!background) {
            //     layers = this.application.delegate.configuration.layers.all;
            //     for (i = 0; (layer = layers[i]) && !background; i++) {
            //         background = background || layer.isBackground && layer;
            //     }
            //     background.isEnabled = true;
            // }

        }
    },

    _run: {
        value: function () {
            var self = this,
                service = self.application.delegate.service;
            // myMsg from service
            var dataType = MapService;
            // var dataSubType = Person;

            // myMsg from service with criteria
            this._enableDefaultLayers();
            console.log("FetchedConfiguration....", self.application.delegate.layers);
        }
        
    }
});

