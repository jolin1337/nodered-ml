const models = require('./models')();

module.exports = function(RED) {
    // Saves a given model to disk
    function SaveModelNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', function(msg) {
            const filename = config.filename || msg.filename;
            const modelId = config.modelId || msg.modelId;

            models.saveModel(modelId, filename, msg.payload)
            .then(() => {
                this.status({ fill: 'green', shape: 'dot', text: 'Model saved: ' + filename });
                msg.filename = filename;
                this.send(msg);
            }).catch(e => {
                this.status({ fill: 'red', shape: 'ring', text: 'Error: ' + e });
            });
        });
    }
    RED.nodes.registerType("save-model", SaveModelNode);
};
