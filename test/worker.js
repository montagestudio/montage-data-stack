/* globals self, importScripts, console, mocha:true */

importScripts('./../node_modules/mocha/mocha.js');
importScripts('./../node_modules/chai/chai.js');
importScripts('./../node_modules/chai-http/dist/chai-http.js');
importScripts('./../node_modules/socket.io-client/dist/socket.io.js');

// Configure Test ENV
chai.use(chaiHttp);
// Export Global
global = eval("this"); // jshint ignore:line
global.chai = chai;
global.should = chai.should();
global.expect = chai.expect;
global.io = io;

// Confiture Mocha
function MyReporter(runner) {
  var passes = 0;
  var failures = 0;

  runner.on('pass', function(test){
    passes++;
    console.info('pass: %s', test.fullTitle());
  });

  runner.on('fail', function(test, err){
    failures++;
    console.error('fail: %s -- error: %s', test.fullTitle(), err.message);
  });

  runner.on('end', function(){
    console.log('end: %d/%d', passes, passes + failures);
  });
}

mocha.setup({
  allowUncaught: true,
  ui: 'bdd',
  slow: 150,
  timeout: 15000,
  bail: false,
  reporter: MyReporter,
  ignoreLeaks: false
});

// Import Specs
//importScripts('./spec/api/message-service-spec.js');
//importScripts('./spec/api/message-service-ws-spec.js');
importScripts('./spec/client/worker-service.js');

// Run tests
mocha.run();

