const tf = require('@tensorflow/tfjs-node');
const models = require('./models')();

module.exports = function(RED) {
    // Add dense layer to model
    function PredictNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', (msg) => {
            try {
                const model = models.getModel(msg.modelId);
                const shape = [1];
                let val = msg.payload;
                while(val.length > 0) {
                    shape.push(val.length);
                    val = val[0];
                }
                const predTensor = model.predict(tf.tensor([msg.payload], shape));
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

