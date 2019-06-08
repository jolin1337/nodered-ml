const tf = require('@tensorflow/tfjs-node');
const models = require('./models')();

module.exports = function(RED) {
    // Add dense layer to model
    function PredictNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', (msg) => {
            try {
                const model = models.getModel(msg.modelId);
                const predTensor = model.predict(tf.tensor2d([msg.payload], [1,4]));
                msg.payload = {
                    feature: msg.payload,
                    prediction: Array.from(predTensor.dataSync()),
                    class: predTensor.argMax(-1).dataSync()[0]
                };

                this.status({ fill: "green", shape: "dot", text: "Predicted " + msg.payload.toString() })
                this.send(msg);
            } catch(err) {
                this.status({ fill: "red", shape: "ring", text: "Error: " + err })
                msg.payload = err;
                this.send(msg);
            }
        });
    }
    RED.nodes.registerType("predict", PredictNode);
};

