const tf = require('@tensorflow/tfjs-node');
const models = require('./models')();

module.exports = function(RED) {
    // Create a sequential model
    function SequentialModelNode(config) {
        this.context().global.set('tf', tf);
        this.context().global.set('getLayerConfigs', (modelId) => {
            const model = models.getModel(modelId);
            const nrOfLayers = model.layers.length;
            const cfgs = [model.input.sourceLayer.getConfig()];
            for (let i = 0; i < nrOfLayers; i++) {
                cfgs.push(model.getLayer(undefined, i).getConfig());
            }
            return cfgs;
        });
        this.context().global.set('getLayerWeights', (modelId, trainableOnly) => {
            const model = models.getModel(modelId);
            const nrOfLayers = model.layers.length;
            const weights = [model.input.sourceLayer.getWeights()];
            for (let i = 0; i < nrOfLayers; i++) {
                const layer = model.getLayer(undefined, i);
                weights.push(layer.getWeights(trainableOnly).map(tensor => tensor.dataSync()));
            }
            return weights;
        });
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
