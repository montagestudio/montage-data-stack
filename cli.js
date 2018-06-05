#!/usr/bin/env node
// Example:
// node cli.js --fetchData '{ "root": { "prototype": "montage/data/model/data-query", "values": { "criteria": {}, "orderings": [], "prefetchExpressions": null, "typeModule": { "%": "data/descriptors/message.mjson" } } } }'
var program = require('commander');
 
var package = require('./package.json');
var program = require('commander');
 
program
  .version(package.version)
  .option('-f, --handleOperation [operation]', 'perform operation')
  .option('-f, --fetchData [query]', 'fetch data')
  .option('-s, --saveDataObject [object]', 'save data object')
  .option('-d, --deleteDataObject [object]', 'delete data object')
  .parse(process.argv);

// Load controller
var main = require('./main');

var command;
if (program.handleOperation) {
	command = main.handleOperation(program.handleOperation);
} else if (program.fetchData) {
	command = main.fetchData(program.fetchData);
} else if (program.saveDataObject) {
	command = main.saveDataObject(program.saveDataObject);
} else if (program.deleteDataObject) {
	command = main.deleteDataObject(program.deleteDataObject);
}

if (command) {
	command.then(function (result) {
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}).catch(function (err) {
		console.error(err.stack || err);
		process.exit(1);
	});	
} else {
	program.help();
}
