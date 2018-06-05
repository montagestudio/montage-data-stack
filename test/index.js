/* jshint node: true */
process.env.NODE_ENV = 'test';

var chai = require('chai');
var chaiHttp = require('chai-http');
var io = require('socket.io-client');

// Configure Test ENV
chai.use(chaiHttp);
// Export Global
global.chai = chai;
global.should = chai.should();
global.expect = chai.expect;
global.io = io;

// Import Specs
require('./spec/api/message-service-spec');
require('./spec/api/message-service-ws-spec');
require('./spec/api/kafka-client-spec.js');
