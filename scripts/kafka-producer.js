#!/usr/bin/env node
/* jshint node: true */

var kafka = require('kafka-node');
var Producer = kafka.Producer;
var KeyedMessage = kafka.KeyedMessage;
var Client = kafka.Client;

var package = require('./../package.json');
var program = require('commander');
 
program
  .version(package.version)
  .option('-s, --start [topic]', 'start consumer for given topic', 'topic1')
  .option('-u, --url [url]', 'url with port (e.g localhost:2181)  ', 'localhost:2181')
  .option('-k, --key [key]', 'key', 'keyed')
  .option('-m, --message [message]', 'message', 'a keyed message')
  .option('-a, --attributes [attributes]', 'attributes', 0)
  .option('-p, --partition [partition]', 'partition', 0)
  .parse(process.argv);

var url = program.url;
var topic = program.start;
var partition = program.partition;
var attributes = program.attributes;

var key = program.key;
var message = program.message;
var keyedMessage = new KeyedMessage(key, message);

var client = new Client(url);
var producer = new Producer(client, { 
	requireAcks: 1 
});

producer.on('ready', function () {
  producer.send([
    { 
		topic: topic, 
		partition: partition, 
		messages: [
			message, 
			keyedMessage
		], 
		attributes: attributes
	}
  ], function (err, result) {
    console.log(err || result);
    process.exit(err ? 1 : 0);
  });
});

producer.on('error', function (err) {
  console.log('error', err);
});