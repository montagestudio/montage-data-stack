/* jshint node: true */

var host = process.env.KAFKA_TEST_HOST || '127.0.0.1';
var kafka = require('kafka-node');
var Client = kafka.Client;
var uuid = require('uuid');
var should = require('should');
var FakeZookeeper = require('./../../helpers/mockZookeeper');
var FakeSocket = require('./../../helpers/mockSocket');
var InvalidConfigError = require('kafka-node/lib/errors/InvalidConfigError');
var proxyquire = require('proxyquire').noCallThru();
var sinon = require('sinon');
var retry = require('retry');
const _ = require('lodash');
const async = require('async');
const BufferList = require('bl');

describe('Kafka-Client Server', function () {
  var client = null;

  describe('handleReceivedData', function () {
    var socket;

    beforeEach(function () {
      socket = {
        buffer: new BufferList()
      };
    });

    it('should always consume entire response even if handlers are missing', function () {
      const fakeClient = {
        unqueueCallback: sinon.stub().returns(null)
      };

      sinon.spy(socket.buffer, 'consume');
      sinon.stub(socket.buffer, 'readUInt32BE').onFirstCall().returns(0);
      sinon.stub(socket.buffer, 'shallowSlice').returns({
        readUInt32BE: sinon.stub().returns(25)
      });

      socket.buffer.append(Uint8Array.from([0, 0, 0, 0]));
      Client.prototype.handleReceivedData.call(fakeClient, socket);
      sinon.assert.calledOnce(socket.buffer.shallowSlice);
      sinon.assert.calledOnce(socket.buffer.consume);
      sinon.assert.calledOnce(fakeClient.unqueueCallback);
      should(socket.waiting).be.empty;
    });

    it('should consume entire response if handlers are missing and set waiting to false for longpolling sockets', function () {
      const fakeClient = {
        unqueueCallback: sinon.stub().returns(null)
      };

      sinon.spy(socket.buffer, 'consume');
      sinon.stub(socket.buffer, 'readUInt32BE').onFirstCall().returns(0);
      sinon.stub(socket.buffer, 'shallowSlice').returns({
        readUInt32BE: sinon.stub().returns(25)
      });

      socket.longpolling = true;
      socket.waiting = true;

      socket.buffer.append(Uint8Array.from([0, 0, 0, 0]));
      Client.prototype.handleReceivedData.call(fakeClient, socket);
      sinon.assert.calledOnce(socket.buffer.shallowSlice);
      sinon.assert.calledOnce(socket.buffer.consume);
      sinon.assert.calledOnce(fakeClient.unqueueCallback);
      socket.waiting.should.be.false;
    });

    it('should early return when buffer is beyond offset', function () {
      socket.buffer.append(Uint8Array.from([0, 0, 0]));

      const readSpy = sinon.spy(socket.buffer, 'readUInt32BE');
      Client.prototype.handleReceivedData.call({}, socket);
      sinon.assert.notCalled(readSpy);
    });

    it('should early return when buffer is empty', function () {
      const readSpy = sinon.spy(socket.buffer, 'readUInt32BE');
      Client.prototype.handleReceivedData.call({}, socket);
      sinon.assert.notCalled(readSpy);
    });
  });

  describe('Kafka cluster not using deprecated host and port configs', function () {
    var zk, Client, brokers;

    before(function () {
      zk = new FakeZookeeper();

      Client = proxyquire('kafka-node/lib/client', {
        './zookeeper': {
          Zookeeper: function () {
            return zk;
          }
        },
        tls: {
          connect: function () {
            return new FakeSocket();
          }
        }
      });
    });

    function verifyBroker (brokerProfiles, expectedBrokers) {
      Object.keys(brokerProfiles).length.should.eql(expectedBrokers.length);
      expectedBrokers.forEach(function (broker) {
        var addr = broker.host + ':' + broker.port;
        should(brokerProfiles).have.property(addr);
        brokerProfiles[addr].should.have.property('host').and.be.exactly(broker.host);
        brokerProfiles[addr].should.have.property('port').and.be.exactly(broker.port);
      });
    }

    it('should setup brokerProfiles using kafka listners for SSL', function () {
      brokers = {
        '1001': {
          endpoints: ['SSL://127.0.0.1:9093'],
          host: null,
          version: 2,
          port: -1
        },
        '1002': {
          endpoints: ['SSL://127.0.0.2:9093'],
          host: null,
          version: 2,
          port: -1
        }
      };

      var clientId = 'kafka-node-client-' + uuid.v4();
      client = new Client(host, clientId, undefined, undefined, { rejectUnauthorized: false });

      zk.emit('init', brokers);

      verifyBroker(client.brokerProfiles, [
        {
          host: '127.0.0.1',
          port: '9093'
        },
        {
          host: '127.0.0.2',
          port: '9093'
        }
      ]);
    });

    it('should setup brokerProfiles using kafka listners for PLAINTEXT', function () {
      brokers = {
        '1001': {
          endpoints: ['PLAINTEXT://127.0.0.1:9092'],
          host: null,
          version: 2,
          port: -1
        },
        '1002': {
          endpoints: ['PLAINTEXT://127.0.0.2:9092'],
          host: null,
          version: 2,
          port: -1
        }
      };

      var clientId = 'kafka-node-client-' + uuid.v4();
      client = new Client(host, clientId);

      zk.emit('init', brokers);

      verifyBroker(client.brokerProfiles, [
        {
          host: '127.0.0.1',
          port: '9092'
        },
        {
          host: '127.0.0.2',
          port: '9092'
        }
      ]);
    });

    it('should emit an error when kafka is SSL only and user expected PLAINTEXT protocol', function (done) {
      brokers = {
        '1001': {
          endpoints: ['SSL://127.0.0.1:9092'],
          host: null,
          version: 2,
          port: -1
        },
        '1002': {
          endpoints: ['SSL://127.0.0.2:9092'],
          host: null,
          version: 2,
          port: -1
        }
      };

      var clientId = 'kafka-node-client-' + uuid.v4();
      client = new Client(host, clientId);
      client.on('error', function (error) {
        error.message.should.be.eql('No kafka endpoint found for broker: 1001 with protocol PLAINTEXT');
        done();
      });

      zk.emit('init', brokers);
    });

    it('should emit an error when kafka is PLAINTEXT only and user expected SSL protocol', function (done) {
      brokers = {
        '1001': {
          endpoints: ['PLAINTEXT://127.0.0.1:9092'],
          host: null,
          version: 2,
          port: -1
        },
        '1002': {
          endpoints: ['PLAINTEXT://127.0.0.2:9092'],
          host: null,
          version: 2,
          port: -1
        }
      };

      var clientId = 'kafka-node-client-' + uuid.v4();
      client = new Client(host, clientId, undefined, undefined, { rejectUnauthorized: false });
      client.on('error', function (error) {
        error.message.should.be.eql('No kafka endpoint found for broker: 1001 with protocol SSL');
        done();
      });

      zk.emit('init', brokers);
    });
  });

  describe('on brokersChanged', function () {
    var zk, Client, brokers;

    before(function () {
      zk = new FakeZookeeper();

      Client = proxyquire('kafka-node/lib/client', {
        './zookeeper': {
          Zookeeper: function () {
            return zk;
          }
        },
        tls: {
          connect: function () {
            return new FakeSocket();
          }
        }
      });
    });

    beforeEach(function () {
      brokers = {
        '1001': {
          endpoints: ['PLAINTEXT://127.0.0.1:9092', 'SSL://127.0.0.1:9093'],
          host: '127.0.0.1',
          version: 2,
          port: 9092
        },
        '1002': {
          endpoints: ['PLAINTEXT://127.0.0.2:9092', 'SSL://127.0.0.2:9093'],
          host: '127.0.0.2',
          version: 2,
          port: 9092
        }
      };
    });

    describe('refreshBrokers', function () {
      var client;

      beforeEach(function () {
        var clientId = 'kafka-node-client-' + uuid.v4();
        client = new Client(host, clientId, undefined, undefined, { rejectUnauthorized: false });
      });

      it('should delete and close dead brokers when SSL is enabled', function () {
        var fakeSocket = new FakeSocket();
        sinon.spy(fakeSocket, 'end');
        sinon.stub(client, 'createBroker').returns({ socket: fakeSocket });
        zk.emit('init', brokers);

        delete brokers['1001'];
        var broker1001 = '127.0.0.1:9093';
        client.ssl.should.be.true;
        client.brokers.should.have.property(broker1001);
        var deadBroker = client.brokers[broker1001];
        deadBroker.socket.should.not.have.property('closing');
        var closeBrokersSpy = sinon.spy(client, 'closeBrokers');

        zk.emit('brokersChanged', brokers);

        client.brokers.should.not.have.property(broker1001);
        sinon.assert.called(closeBrokersSpy);
        deadBroker.socket.closing.should.be.true;
        sinon.assert.calledOnce(deadBroker.socket.end);
      });

      it('should close the dead broker without triggering a reconnect on dead broker', function () {
        var clock = sinon.useFakeTimers();
        client.on('error', function () {}); // we expect an error catch it

        zk.emit('init', brokers);
        delete brokers['1001'];

        var broker1001 = '127.0.0.1:9093';
        client.ssl.should.be.true;
        client.brokers.should.have.property(broker1001);
        var deadBroker = client.brokers[broker1001];
        deadBroker.socket.should.not.have.property('closing');
        var closeBrokersSpy = sinon.spy(client, 'closeBrokers');

        deadBroker.socket.emit('error', new Error('Socket was fakely disconnected'));
        deadBroker.socket.end();
        clock.tick(500);
        zk.emit('brokersChanged', brokers);

        clock.tick(500); // var reconnectBroker run

        client.brokers.should.not.have.property(broker1001);
        sinon.assert.called(closeBrokersSpy);
        clock.restore();
      });
    });

    it('should keep brokerProfiles in sync with broker changes', function () {
      var clientId = 'kafka-node-client-' + uuid.v4();
      client = new Client(host, clientId, undefined, undefined, { rejectUnauthorized: false });

      sinon.spy(client, 'setupBrokerProfiles');
      sinon.stub(client, 'createBroker').returns({
        socket: {
          unref: function () {},
          destroy: function () {},
          close: function () {},
          end: function () {}
        }
      });

      zk.emit('init', brokers);
      client.brokerMetadata.should.have.property('1001');
      delete brokers['1001'];
      zk.emit('brokersChanged', brokers);
      client.brokerMetadata.should.not.have.property('1001');
      sinon.assert.calledTwice(client.setupBrokerProfiles);
    });
  });

  describe('Discover Group Coordinator', function () {
    beforeEach(function (done) {
      client = new Client(host);
      client.once('connect', done);
    });

    afterEach(function (done) {
      client.close(done);
    });

    it('#sendGroupCoordinatorRequest', function (done) {
      var operation = retry.operation();
      operation.attempt(function () {
        client.sendGroupCoordinatorRequest('ExampleTopic', function (error, response) {
          if (operation.retry(error)) {
            return;
          }
          should(error).be.null;
          response.coordinatorPort.should.be.eql(9092);
          response.coordinatorHost.should.be.eql(host);
          done();
        });
      });
    });
  });
});