const models = require('./models')();

module.exports = function(RED) {
    // Determine the loss, metrics and optimizer for the model
    function CompileModelNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', function(msg) {
            const model = models.getModel(msg.modelId);
            const msgConfig = msg.config || {};
            const { name, ...nodeConfig } = { ...config };
            model.compile({
                ...nodeConfig,
                ...msgConfig
            });
            return this.send(msg);
        });
    }
    RED.nodes.registerType("compile-model", CompileModelNode);
};
