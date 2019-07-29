const glob = require('glob');
module.exports = function(RED) {
    function GlobNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', function(msg) {
            const pattern = config.pattern || msg.payload.pattern;
            const matches = glob.sync(pattern);
            if (!config.oneMsgPerMatch) {
                msg.payload = matches;
                this.send(msg);
            } else {
                Array.from(matches).forEach((match, i) => {
                    this.send({
                        ...msg,
                        payload: match,
                        eof: matches.length === i + 1
                    })
                });
            }
        });
    }
    RED.nodes.registerType("glob", GlobNode);
};
