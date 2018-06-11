var APP_TEST_URL = null;

if (typeof process !== 'undefined') {
  APP_TEST_URL = process.env.APP_TEST_URL;
}

// Default value
APP_TEST_URL = APP_TEST_URL || 'http://localhost:8080';

describe('Message WS API', () => {
    var socket;
    beforeEach(function(done) {
        // Setup
        socket = io.connect(APP_TEST_URL, {
            'reconnection delay': 0,
            'reopen delay': 0,
            'force new connection': true
        });
        socket.on('connect', function() {
            //console.log('worked...');
            done();
        });
        socket.on('disconnect', function() {
            //console.log('disconnected...');
        });
    });
    afterEach(function(done) {
        // Cleanup
        if(socket.connected) {
            //console.log('disconnecting...');
            socket.disconnect();
        } else {
            // There will not be a connection unless you have done() in beforeEach, socket.on('connect'...)
            console.log('no connection to break...');
        }
        done();
    });
    describe('Data Operation', function () {
      it('it should POST an Operation', (done) => {
            // TODO
            var operation = {
              "root": {
                "prototype": "logic/model/message-model[Message]",
                "values": {
                  "subject": "RE: You've got mail",
                  "identifier": null
                }
              }
            };
            socket.emit('operation', operation, function(res) {     
                expect(res).to.be.a('object');
                expect(res).to.have.property('root');
                expect(res.root).to.be.a('object');
                expect(res.root).to.have.property('values');
                done();
            });
        });
    });
    describe('Data Query and Object', function () {
      describe('fetchData', () => {
          it('it should GET all the messages', (done) => {
              var query = {
                "root": {
                  "prototype": "montage/data/model/data-query",
                  "values": {
                    "criteria": {},
                    "orderings": [],
                    "prefetchExpressions": null,
                    "typeModule": {
                      "%": "data/descriptors/message.mjson"
                    }
                  }
                }
              };
              socket.emit('fetchData', query, function(res) {     
                  expect(res).to.be.a('object');
                  expect(res).to.have.property('root');
                  expect(res.root).to.be.a('object');
                  expect(res.root).to.have.property('value');
                  done();
              });
          });
      });
      describe('saveDataObject', () => {
          it('it should POST a message', (done) => {
              var message = {
                "root": {
                  "prototype": "logic/model/message-model[Message]",
                  "values": {
                    "subject": "RE: You've got mail",
                    "identifier": null
                  }
                }
              };
              socket.emit('saveDataObject', message, function(res) {     
                  expect(res).to.be.a('object');
                  expect(res).to.have.property('root');
                  expect(res.root).to.be.a('object');
                  expect(res.root).to.have.property('values');
                  done();
              });
          });
      });
      describe('deleteDataObject', () => {
          it('it should DELETE a message', (done) => {
              var message = {
                "root": {
                  "prototype": "logic/model/message-model[Message]",
                  "values": {
                    "id": 43,
                    "subject": "RE: You've got mail",
                    "text": "Add missing text",
                    "created": 1525106537546,
                    "updated": 1525106537567,
                    "identifier": null
                  }
                }
              };
              socket.emit('deleteDataObject', message, function(res) {  
                  expect(res).to.be.a('object');
                  expect(res).to.have.property('root');
                  expect(res.root).to.be.a('object');
                  expect(res.root).to.have.property('values');
                  done();
              });
          });
      });
    });
});