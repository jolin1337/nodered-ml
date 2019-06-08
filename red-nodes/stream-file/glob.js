const glob = require('glob');
module.exports = function(RED) {
    function GlobNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', function(msg) {
            const pattern = config.pattern || msg.payload.pattern;
            msg.payload = glob.sync(pattern);
            this.send(msg);
        });
    }
    RED.nodes.registerType("glob", GlobNode);
};
