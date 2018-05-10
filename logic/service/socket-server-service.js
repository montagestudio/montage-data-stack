var RawDataService = require("montage/data/service/raw-data-service").RawDataService,
    Promise = require("montage/core/promise").Promise;

/**
 * Provides Socket to MainService
 *
 * @class
 * @extends external:RawDataService
 */
exports.SocketServerService = RawDataService.specialize(/** @lends SocketServerService.prototype */ {

    constructor: {
        value: function HttpServerService() {

        }
    }
});
