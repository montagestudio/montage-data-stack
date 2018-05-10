var RawDataService = require("montage/data/service/raw-data-service").RawDataService,
    Promise = require("montage/core/promise").Promise;

/**
 * Provides Http to MainService
 *
 * @class
 * @extends external:RawDataService
 */
exports.HttpServerService = RawDataService.specialize(/** @lends HttpServerService.prototype */ {

    constructor: {
        value: function HttpServerService() {

        }
    }
});
