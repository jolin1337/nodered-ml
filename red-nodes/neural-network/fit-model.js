const tf = require('@tensorflow/tfjs-node');
const models = require('./models')();

module.exports = function(RED) {
    // Start the training
    function FitModelNode(config) {
        RED.nodes.createNode(this, config);
        function msgToDataset(node, msg) {
            const done = !!msg.eof;
            return {
                done: done || false,
                topic: msg.topic,
                value: {
                    xs: tf.tensor([config.xs.map(x => msg.payload[x])]),
                    ys: tf.tensor([config.ys.map(y => msg.payload[y])]),
                    rxs: (config.xs.map(x => msg.payload[x])),
                    rys: (config.ys.map(y => msg.payload[y]))
                }
            }
        }
        function useValSet(msg) {
            return msg.topic === 'train' || msg.topic === 'val';
        }
        this.on('input', (msg) => {
            if (this.index !== undefined) {
                this.index++;
                let ds = msgToDataset(this, msg)
                this.payloads.push(ds);
                if (this.promise) {
                    const dsIdx = this.payloads.findIndex((ds) => ds.topic === this.promise.topic || !useValSet(ds));
                    const ds = this.payloads.splice(dsIdx, 1)[0];
                    this.promise(ds);
                    this.promise = undefined;
                }
                return;
            }
            const model = models.getModel(msg.modelId);
            const msgConfig = msg.config || {};
            const { name, batchSize, ...nodeConfig } = { ...config };
            const streamedDataset = (topic) => {
                return () => ({
                    next: () => {
                        if (this.payloads === undefined) {
                            console.log("Too much!!");
                            return Promise.resolve({ done: true });
                        }
                        let dsIdx = this.payloads.findIndex((ds) => !ds.done && (ds.topic === topic || !useValSet(ds)));
                        if (dsIdx >= 0) {
                            const ds = this.payloads.splice(dsIdx, 1)[0];
                            return Promise.resolve(ds);
                        }
                        dsIdx = this.payloads.findIndex((ds) => ds.topic === topic || !useValSet(ds));
                        if (dsIdx >= 0) {
                            const ds = this.payloads.splice(dsIdx, 1)[0];
                            if (this.payloads.length === 0) {
                                console.log("Done, cleaning")
                                this.payloads = this.index = undefined;
                            }
                            return Promise.resolve(ds);
                        }
                        return new Promise((resolve, reject) => {
                            console.log("Waiting for more data...");
                            this.promise = (...args) => {
                                if (this.payloads.length === 0) {
                                    console.log("Done, cleaning")
                                    this.payloads = this.index = undefined;
                                }
                                return resolve(...args)
                            };
                            this.promise.topic = topic;
                        });
                    }
                });
            };
            const batches = 5;
            let epoch = 0;
            const trainDataset = tf.data.generator(streamedDataset('train')).batch(batchSize);
            if (useValSet(msg)) {
                nodeConfig.validationData =  tf.data.generator(streamedDataset('val'));
                // nodeConfig.validationBatches = nodeConfig.batchesPerEpoch;
            }
            this.payloads = [msgToDataset(this, msg)];
            this.index = 0;

            this.status({ fill: "yellow", shape: "dot", text: "Training..." });
            model.fitDataset(trainDataset, {
                ...nodeConfig,
                ...msgConfig,
                callbacks: {
                    onBatchEnd: (batch, logs) => {
                        this.status({ fill: "yellow", shape: "dot", text: "Training (epoch: " + epoch + "/" + nodeConfig.epochs + ", acc: " + logs.acc + ")" })
                    },
                    onEpochEnd: (e, logs) => {
                        epoch = e;
                    }
                }
            }).then(info => {
                msg.payload = info;
                this.payloads = this.index = undefined;
                this.status({ fill: "green", shape: "dot", text: "Trained model " + msg.modelId });
                this.send(msg);
            }).catch(err => {
                console.error(err);
                msg.payload = err;
                this.status({ fill: "red", shape: "ring", text: "Error: " + err.toString() });
                this.send(msg);
            });
        });
    }
    RED.nodes.registerType("fit-model", FitModelNode);
};
