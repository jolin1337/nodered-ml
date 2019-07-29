const tf = require('@tensorflow/tfjs-node');
const models = require('./models')();

module.exports = function(RED) {
    // Create a sequential model
    function SequentialModelNode(config) {
        this.context().global.set('tf', tf);
        this.context().global.set('addLayer', (modelId, layer) => {
            models.getModel(modelId).add(layer);
            return {
                modelId
            }
        });
        RED.nodes.createNode(this, config);
        this.on('input', function(msg) {
            const model = tf.sequential();
            const modelId = msg.modelId || config.modelId || msg._msgid;
            models.addModel(modelId, model);
            msg.modelId = modelId;
            this.send(msg);
        });
    }
    RED.nodes.registerType("sequential-network", SequentialModelNode);
};
