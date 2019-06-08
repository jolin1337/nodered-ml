const tf = require('@tensorflow/tfjs-node');
const models = require('./models')();

module.exports = function(RED) {
    // Add dense layer to model
    function DenseLayerNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', (msg) => {
            const model = models.getModel(msg.modelId);
            const msgConfig = msg.config || {};
            const { ...nodeConfig } = { ...config };
            const tfLayer = tf.layers.dense({
                ...nodeConfig,
                ...msgConfig
            })
            model.add(tfLayer);
            this.send(msg);
        });
    }
    RED.nodes.registerType("dense-layer", DenseLayerNode);
};

