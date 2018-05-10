#!/usr/bin/env node
/* jshint node: true */

var kafka = require('kafka-node');
var HighLevelConsumer = kafka.HighLevelConsumer;
var Client = kafka.Client;
var Consumer = kafka.Consumer;
var Offset = kafka.Offset;

var package = require('./../package.json');
var program = require('commander');
 
program
  .version(package.version)
  .option('-s, --start [topic]', 'start consumer for given topic', 'topic1')
  .option('-url, --url [url]', 'url with port (e.g localhost:2181)  ', 'localhost:2181')
  .option('-p, --partition [partition]', 'partition', 0)
  .parse(process.argv);

var url = program.url;
var topic = program.start;
var partition = 0;

var client = new Client(url);
var topics = [{ topic: topic, partition: 1 }, { topic: topic, partition: 0 }];
var options = { autoCommit: true, fetchMaxWaitMs: 1000, fetchMaxBytes: 1024 * 1024 };

var consumer = new HighLevelConsumer(client, topics, options);

// TODO fix 
// error { BrokerNotAvailableError: Could not find the leader
// var consumer = new Consumer(client, topics, options);

var offset = new Offset(client);

consumer.on('message', function (message) {
  console.log(message);
});

consumer.on('error', function (err) {
  console.log('error', err);
});

// If consumer get `offsetOutOfRange` event, fetch data from the smallest(oldest) offset
consumer.on('offsetOutOfRange', function (topic) {
  topic.maxNum = 2;
  offset.fetch([topic], function (err, offsets) {
    if (err) {
      return console.error(err);
    }
    var min = Math.min.apply(null, offsets[topic.topic][topic.partition]);
    consumer.setOffset(topic.topic, topic.partition, min);
  });
});