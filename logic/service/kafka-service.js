/* jshint node: true */
var RawDataService = require("montage/data/service/raw-data-service").RawDataService,
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
exports.KafkaService = RawDataService.specialize( /** @lends KafkaService.prototype */ {

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


        }
    },

    //
    // Legacy Montage Data Mapping
    //

    // Get and query
    fetchRawData: {
        value: function(stream) {
            var self = this,
                action = 'fetchData',
                query = stream.query,
                service = self.referenceServiceForType(query.type);

            return self._serialize(service).then(function(serviceJSON) {
                return self._serialize(query).then(function(queryJSON) {
                    return self._performOperation(action, queryJSON, serviceJSON).then(function(remoteDataJson) {
                        return self._deserialize(remoteDataJson).then(function(remoteData) {
                            stream.addData(remoteData);
                            stream.dataDone();
                        });
                    });
                });
            });
        }
    },

    // Create and update
    saveRawData: {
        value: function(rawData, object) {
            var self = this,
                action = 'saveDataObject',
                type = self.objectDescriptorForObject(object),
                service = self.referenceServiceForType(type);

            return self._serialize(service).then(function(serviceJSON) {
                return self._serialize(object).then(function(dataObjectJSON) {
                    return self._performOperation(action, dataObjectJSON, serviceJSON).then(function(remoteObjectJSON) {
                        return self._deserialize(remoteObjectJSON).then(function(remoteObject) {
                            return self._mapRawDataToObject(remoteObject, object);
                        });
                    });
                });
            });
        }
    },

    // Delete
    deleteRawData: {
        value: function(rawData, object) {
            var self = this,
                action = 'deleteDataObject',
                type = self.objectDescriptorForObject(object),
                service = self.referenceServiceForType(type);

            return self._serialize(service).then(function(serviceJSON) {
                return self._serialize(object).then(function(dataObjectJSON) {
                    return self._performOperation(action, dataObjectJSON, serviceJSON);
                });
            });
        }
    },

    //
    // Kafka Mapping
    //

    _getTopicForOperation: {
        value: function(type, service) {
            return new Promise(function(resolve, reject) {

                // Cast type to montage object serailization
                // TODO check with Thomas
                type = (typeof type === 'string' ? type : type.type);
                    service = (typeof service === 'string' ? service : service.root.prototype);

                resolve(type + service);
            });
        }
    },

    _performOperation: {
        value: function(type, data, service, partition, attributes) {
            //return Promise.reject('Not Implemented');
            // TOTO produce operation
            var self = this;
            return self._getTopicForOperation(type, service).then(function(topic) {
                return self.produceMessage(topic, data, partition, attributes);
            });
        }
    },

    _consumeOperations: {
        // optionals: partition,maxNum
        value: function(type, service, partition, maxNum) {

            // return Promise.reject('Not Implemented');
            // operations = operation.Type + descriptor.Type = topics
            var self = this;
            return self._getTopicForOperation(type, service).then(function(topic) {
                return self.consumeTopic(topic, partition, {
                    // TODO dispatch on rootService
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