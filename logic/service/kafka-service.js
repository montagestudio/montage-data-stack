/* jshint node: true */
var RawDataWorker = require("montage/data/service/raw-data-worker").RawDataWorker,
    Promise = require("montage/core/promise").Promise;

var kafka = require('kafka-node');
var Producer = kafka.Producer;
var Consumer = kafka.Consumer;
var KeyedMessage = kafka.KeyedMessage;
var Client = kafka.Client;
var HighLevelConsumer = kafka.HighLevelConsumer;
var Offset = kafka.Offset;

/**
 * Provides Kafka Message interface
 *
 * @class
 * @extends external:RawDataService
 */
exports.KafkaService = RawDataWorker.specialize( /** @lends KafkaService.prototype */ {

    options: {
        value: {
            url: '',
            producer: {
                // Default Partition
                partition: 0,
                // Configuration for when to consider a message as acknowledged, default 1
                requireAcks: 1,
                // The amount of time in milliseconds to wait for all acks before considered, default 100ms
                ackTimeoutMs: 100,
                // Partitioner type (default = 0, random = 1, cyclic = 2, keyed = 3, custom = 4), default 0
                partitionerType: 2
            },
            offet: {
                maxNum: 2
            },
            consumer: {
                // Default Partition
                partition: 0,
                //consumer group id, default `kafka-node-group`
                groupId: 'kafka-node-group',
                // Auto commit config
                autoCommit: true,
                autoCommitIntervalMs: 5000,
                // The max wait time is the maximum amount of time in milliseconds to block waiting if insufficient data is available at the time the request is issued, default 100ms
                fetchMaxWaitMs: 100,
                // This is the minimum number of bytes of messages that must be available to give a response, default 1 byte
                fetchMinBytes: 1,
                // The maximum bytes to include in the message set for this partition. This helps bound the size of the response.
                fetchMaxBytes: 1024 * 1024,
                // If set true, consumer will fetch message from the given offset in the payloads
                fromOffset: false,
                // If set to 'buffer', values will be returned as raw buffer objects.
                encoding: 'utf8',
                keyEncoding: 'utf8'
            }
        }
    },

    constructor: {
        value: function KafkaService() {
            console.log('Hello KafkaService');

        }
    },
    //
    // Kafka Mapping
    //

    _getTopicForOperation: {
        value: function(type, dataType) {
            return new Promise(function(resolve, reject) {
                resolve(type + dataType);
            });
        }
    },

    _getOperationForTopic: {
        value: function(operation) {
            return new Promise(function(resolve, reject) {
                resolve(type + dataType);
            });
        }
    },


    _produceDataOperation: {
        value: function(type, data, dataType, partition, attributes) {
            //return Promise.reject('Not Implemented');
            // TOTO produce operation
            var self = this;
            return self._getTopicForOperation(type, dataType).then(function(topic) {
                return self.produceMessage(topic, data, partition, attributes);
            });
        }
    },

    _getTopicForOperation: {
        value: function(type, service) {

            return new Promise(function(resolve, reject) {
            }
        }
    },

    handleOperation: {
        value: function (operation) {
            var self = this;

            return this.super(operation).then(function () {

                // TODO operation
                // Operation.Read to Operation.ReadUpdate
                var resultOperation = {};

                return self._getOperationForTopic(resultOperation).then(function(topic) {
                    return self.produceMessage(topic, resultOperation, partition, attributes);
                });  
            });
        }
    },

    _consumeOperations: {
        // optionals: partition,maxNum
        value: function(type, dataType, partition, maxNum) {

            // return Promise.reject('Not Implemented');
            // operations = operation.Type + descriptor.Type = topics
            var self = this;
            return self._getTopicForOperation(type, dataType).then(function(topic) {
                return self.consumeTopic(topic, partition, {
                    // TODO dispatch on rootService
                    onMessage: function (topic, message) {
                        // TODO operation
                        return self.handleOperation(operation).then(function () {

                        }).catch(function (err) {
                            // return self.produceMessage(topic, resultOperation, partition, attributes);
                        });   
                    }
                }, maxNum);
            });
        }
    },

    _getClient: {
        value: function() {
            var self = this,
                url = self.options.url;
            return self._client || (self._client = new Promise(function(resolve, reject) {
                try {
                    resolve(new Client(url));
                } catch (err) {
                    reject(err);
                    // Allow retry on failure but wait for existing client.
                    self._client = null;
                }
            }));
        }
    },

    _getProducer: {
        value: function() {
            var self = this,
                producerOptions = self.options.producer;

            return self._producer || (self._producer = self._getClient().then(function(client) {
                return new Promise(function(resolve, reject) {
                    try {
                        // TODO check ProducerStream
                        var producer = new Producer(client, producerOptions);

                        producer.on('ready', function() {
                            resolve(producer);
                        });

                        producer.on('error', function() {
                            reject(producer);
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
            }));
        }
    },

    _consumersTopicsMap: {
        value: null,
    },

    _createConsumer: {
        // topics [{ topic: topic, partition: 1 }, { topic: topic, partition: 0 }]
        value: function(topics) {
            var self = this,
                consumerOptions = self.options.consumer;
            return self._getClient().then(function(client) {
                return new HighLevelConsumer(client, topics, consumerOptions);
            });
        }
    },


    _getConsumer: {
        // topics [{ topic: topic, partition: 1 }, { topic: topic, partition: 0 }]
        value: function(topics) {
            var self = this,
                topicsKey = JSON.stringify(topics),
                consumersTopicsMap = self._consumersTopicsMap || (self._consumersTopicsMap = new Map());

            // TODO allow single comsumber for all topics
            // via ConsumerGroupStream

            if (consumersTopicsMap.has(topicsKey)) {
                return consumersTopicsMap.get(topicsKey);
            } else {
                var consumer = self._createConsumer(topics);
                consumersTopicsMap.set(topicsKey, consumer);
                return consumer;
            }

        }
    },

    _getOffset: {
        value: function() {
            var self = this;
            return self._offset || (self._offset = new Promise(function() {
                return self._getClient().then(function(client) {
                    return new Offset(client);
                });
            }));
        }
    },


    log: {
        value: function() {
            return console.call(console, arguments);
        }
    },

    consumeTopic: {
        // topic topic1, partition 0
        // optionals: partition, events, maxNum
        value: function(topic, partition, events, maxNum) {
            var self = this,
                log = self.log,
                options = self.options;

            partition = partition || options.consumer.partition;
            maxNum = maxNum || options.offer.maxNum;

            var onMessage = events.onMessage || function(message) {
                    log('onMessage', topic, message);
                },
                onError = events.onError || function(topic, err) {
                    log('onError', topic, err);
                },
                onTopicOffsetChange = options.onTopicOffsetChange || function(topic, offset) {
                    log('onTopicOffsetChange', topic, offset);
                };

            return self._getConsumer().then(function(consumer) {
                return self._getOffset().then(function(offset) {
                    return new Promise(function(resolve, reject) {

                        consumer.on('message', function(message) {
                            onMessage(topic, message);
                        });

                        consumer.on('error', function(err) {
                            onError(topic, err);
                        });

                        // If consumer get `offsetOutOfRange` event, fetch data from the smallest(oldest) offset
                        consumer.on('offsetOutOfRange', function(topic) {
                            topic.maxNum = maxNum;
                            offset.fetch([topic], function(err, offsets) {
                                if (err) {
                                    onError(err, null);
                                } else {
                                    // Update offet
                                    var min = Math.min.apply(null, offsets[topic.topic][topic.partition]);
                                    consumer.setOffset(topic.topic, topic.partition, min);
                                    onTopicOffsetChange(topic, min);
                                }
                            });
                        });
                    });
                });
            });
        }
    },

    produceKeyMessage: {
        // optionals: partition, attributes
        value: function(topic, key, message, partition, attributes) {
            var self = this;
            return self.produceMessage(topic, new KeyedMessage(key, message), partition, attributes);
        }
    },

    produceMessage: {
        // optionals: partition, attributes
        value: function(topic, message, partition, attributes) {
            var self = this,
                options = self.options;
            partition = partition || options.producer.partition;
            attributes = attributes || options.producer.attributes;
            var messages = [message];
            return self.produceMessages(topic, messages, partition, attributes);
        }
    },

    produceMessages: {
        // optionals: partition, attributes
        value: function(topic, messages, partition, attributes) {
            var self = this,
                options = self.options;
            partition = partition || options.producer.partition;
            attributes = attributes || options.producer.attributes;
            return self._getProducer().then(function(producer) {
                return new Promise(function(resolve, reject) {
                    producer.send([{
                        topic: topic,
                        partition: partition,
                        attributes: attributes,
                        messages: messages
                    }], function(err, result) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                });
            });
        }
    },
});