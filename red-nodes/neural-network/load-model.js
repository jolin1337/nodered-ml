const models = require('./models')();

module.exports = function(RED) {
    // Reads a model from distk
    function LoadModelNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', function(msg) {
            const filename = config.filename || msg.filename;
            const modelId = config.modelId || msg.modelId ||  msg._msgid;
            models.loadModel(filename).then(({ model, customData }) => {
                models.addModel(modelId, model);
                msg.modelId = modelId;
                msg.payload = customData[0];
                msg.filename = filename;
                this.status({ fill: 'green', shape: 'dot', text: 'Model loaded: ' + filename });
                this.send(msg);
            }).catch(e => {
                const model = models.getModel(modelId);
                if (model) {
                    msg.modelId = modelId;
                    this.status({ fill: 'green', shape: 'dot', text: 'Found model in memory: ' + modelId });
                    this.send(msg);
                } else {
                    this.status({ fill: 'red', shape: 'ring', text: 'Error: ' + e });
                }
            });
        });
    }
    RED.nodes.registerType("load-model", LoadModelNode);
};
