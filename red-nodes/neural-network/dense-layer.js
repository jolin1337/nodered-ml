const tf = require('@tensorflow/tfjs-node');
const models = require('./models')();

module.exports = function(RED) {
    // Add dense layer to model
    function DenseLayerNode(cfg) {
        RED.nodes.createNode(this, cfg);
        this.on('input', (msg) => {
            const model = models.getModel(msg.modelId);
            const msgConfig = msg.config || {};
            const { ...nodeConfig } = { ...cfg };
            const tfLayer = tf.layers.dense({
                ...nodeConfig,
                ...msgConfig
            })
            model.add(tfLayer);
            const { config, ...m } = { ...msg };
            this.send(m);
        });
    }
    RED.nodes.registerType("dense-layer", DenseLayerNode);
};

