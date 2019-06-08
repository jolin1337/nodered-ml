const models = require('./models')();

module.exports = function(RED) {
    // Lists models in memory
    function ListModelsNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', function(msg) {
            msg.payload = models.getModelIds();
            this.send(msg);
        });
    }
    RED.nodes.registerType("list-models", ListModelsNode);
};
