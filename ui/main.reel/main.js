var Component = require("montage/ui/component").Component;
var DataQuery = require("montage/data/model/data-query").DataQuery;
var Criteria = require("montage/core/criteria").Criteria;

var serialize = require("montage/core/serialization/serializer/montage-serializer").serialize;
var deserialize = require('montage/core/serialization/deserializer/montage-deserializer').deserialize;

//var mainService = require("data/main.mjson").montageObject;
var mainService = require("data/main-remote.mjson").montageObject;
//var mainService = require("data/service/remote-service.mjson").montageObject;

var Message = require("data/descriptors/message.mjson").montageObject;
var Person = require("data/descriptors/person.mjson").montageObject;

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

            // myMsg from service
            var dataType = Message;
            var dataSubType = Person;

            // myMsg from service with criteria
            var dataExpression = "";
            var dataParameters = {};
            var dataCriteria = new Criteria().initWithExpression(dataExpression, dataParameters);
            var dataQuery  = DataQuery.withTypeAndCriteria(dataType, dataCriteria);


            // Test via serialize then deserialize
            // TODO Cause Can't fetch data of unknown type - undefined/undefined
            // Comment to bypass this
            // DEBUG
            //var queryMjson = serialize(dataQuery, require);
            //dataQuery = deserialize(queryMjson, require);
            //console.log(queryMjson);
            // DEBUG

            mainService.fetchData(dataQuery).then(function (res) {
                assert('fetchData:withTypeAndCriteria', res.length === 1, res);

                mainService.fetchData(dataType).then(function (res) {
                    assert('fetchData:withType', res.length === 1, res[0]);

                    // TODO
                    // Remote support READ only for now.
                    //return;

                    // Create reply
                    var myMsg = mainService.createDataObject(dataType);
                    myMsg.subject = "RE: You've got mail";
                    mainService.saveDataObject(myMsg).then(function () {
                        
                        assert('saveDataObject.created', typeof myMsg.created !== 'undefined', myMsg);
                        assert('saveDataObject.updated', typeof myMsg.updated === 'undefined', myMsg);
                        myMsg.text = "Add missing text";

                        // myMsg is updated
                        mainService.saveDataObject(myMsg).then(function () {
                            assert('saveDataObject.text', typeof myMsg.text !== 'undefined', myMsg);
                            assert('saveDataObject.updated', typeof myMsg.updated !== 'undefined', myMsg);

                            // myMsg from service
                            mainService.fetchData(dataType).then(function (res) {
                            
                                assert('fetchData', res.length == 2, res);

                                // myMsg is deleted
                                mainService.deleteDataObject(myMsg).then(function () {
                                    
                                    // myMsg from service with criteria
                                    var dataExpression = "";
                                    var dataParameters = {
                                        id: myMsg.id
                                    };
                                    var dataCriteria = new Criteria().initWithExpression(dataExpression, dataParameters);
                                    var dataQuery  = DataQuery.withTypeAndCriteria(dataType, dataCriteria);

                                    //var query = serialize(dataQuery, require);
                                    //console.log(query);
                                    
                                    mainService.fetchData(dataQuery).then(function (res) {
                                        assert('fetchData:withTypeAndCriteria', res.length === 0, res);

                                        // myMsg from service
                                        mainService.fetchData(dataType).then(function (res) {
                                            assert('fetchData:withType', res.length === 1, res);
                                        });
                                    });
                                });
                            });
                        }); 
                    }); 
                });
            }); 
        }
    }
});

