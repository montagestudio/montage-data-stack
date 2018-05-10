
var APP_TEST_URL = null;

if (typeof process !== 'undefined') {
  APP_TEST_URL = process.env.APP_TEST_URL;
}

// Default value
APP_TEST_URL = APP_TEST_URL || 'http://localhost:8080';

describe('Message HTTP API', () => {
  beforeEach((done) => {
     done();        
  });
  describe('/GET message', () => {
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

        chai.request(APP_TEST_URL)
            .get('/api/data?query=' + encodeURIComponent(JSON.stringify(query)))
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body).to.be.a('object');
                expect(res.body).to.have.property('root');
                expect(res.body.root).to.be.a('object');
                expect(res.body.root).to.have.property('value');
                expect(res.body).to.have.property('message');
                expect(res.body.message).to.be.a('object');
                expect(res.body.message).to.have.property('prototype');
                expect(res.body.message).to.have.property('prototype');
                expect(res.body.message).to.have.property('values');
                done();
            });
      });
  });
  /*
  * Test the /POST route
  */
  describe('/POST message', () => {
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
        chai.request(APP_TEST_URL)
            .post('/api/data/save')
            .send({
              data: message
            })
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body).to.be.a('object');
                expect(res.body).to.have.property('root');
                expect(res.body.root).to.be.a('object');
                expect(res.body.root).to.have.property('values');
                done();
            });
      });
  });
  /*
  * Test the /POST route
  */
  describe('/DELETE message', () => {
      it('it should DELETE a message', (done) => {
        var message = {
          "root": {
            "prototype": "logic/model/message-model[Message]",
            "values": {
              "id": 46,
              "subject": "RE: You've got mail",
              "text": "Add missing text",
              "created": 1525106537546,
              "updated": 1525106537567,
              "identifier": null
            }
          }
        };
        chai.request(APP_TEST_URL)
            .post('/api/data/delete')
            .send({
              data: message
            })
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                done();
            });
      });
  });
});