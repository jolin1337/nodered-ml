const tf = require('@tensorflow/tfjs-node');
const models = require('./models')();
const fitModel = require('./fit-models.model.js');
module.exports = function(RED) {
    // Start the training
    function FitModelNode(cfg) {
        RED.nodes.createNode(this, cfg);
        const jobbs = {};

        function initTrainJob(id, node, config, msg) {
            node.status({ fill: "yellow", shape: "dot", text: "Training..." });
            const writer = new fitModel.createDatasetWriter(config);
            const reader = new fitModel.createDatasetReader(writer, config);
            let valWriter = null;
            let valReader = null;

            if (msg.topic === 'val' || msg.topic === 'train') {
                const valConfig = {
                    ...config,
                    batchesPerEpoch: config.testBatchesPerEpoch,
                    batchSize: config.testBatchSize,
                };
                valWriter = new fitModel.createDatasetWriter(valConfig);
                valReader = new fitModel.createDatasetReader(valWriter, valConfig);
                config.validationData =  tf.data.generator(() => valWriter);
                if (config.testBatchSize) {
                    config.validationData.batch(config.testBatchSize);
                    //config.validationBatches = config.testBatchesPerEpoch;
                }
            }
            const training = fitModel.createTraining(msg.modelId, tf.data.generator(() => writer).batch(config.trainBatchSize), config, {
                onEpochEnd: payload => onEpochEnd(node, msg, payload),
                onBatchEnd: payload => onBatchEnd(id, node, payload)
            }).then(info => finalizeTraining(id, node, msg, info))
              .catch(err => {
                console.error(err);
                jobbs[id] = undefined;
                msg.payload = err;
                node.status({ fill: "red", shape: "ring", text: "Error: " + err.toString() });
                node.send([null, msg]);
            });
            jobbs[id] = {
                training,
                reader,
                writer,
                valWriter,
                valReader
            }
        }

        function onEpochEnd(node, msg, payload) {
            msg.payload = payload;
            node.send([msg, null]);
        }
        function onBatchEnd(id, node, payload) {
            const { epoch, epochs, batch, batches, acc, val_acc } = payload;
            const status = `Training ${id} (epoch: ${epoch}/${epochs}, batch: ${batch}/${batches}, acc: ${parseInt(100 * acc)/100})`;
            console.log(status);
            node.status({
                fill: "yellow",
                shape: "dot",
                text: status
            });
        }

        function finalizeTraining(id, node, msg, info) {
            msg.payload = info;
            jobbs[id] = undefined;
            node.status({ fill: "green", shape: "dot", text: "Trained model " + msg.modelId });
            node.send([null, msg]);
        }

        this.on('input', (msg) => {
            const node = this;
            const config = {...cfg, ...msg.config};
            const id = msg.modelId;
            if (jobbs[id] === undefined) {
                initTrainJob(id, node, config, msg);
            }
            let reader = jobbs[id].reader;
            if (msg.topic === 'val') {
                reader = jobbs[id].valReader;
            }

            if (msg.eof) {
                reader.end(msg);
            } else {
                reader.input(msg);
            }
        });
    }
    RED.nodes.registerType("fit-model", FitModelNode);
};

