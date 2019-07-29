const tf = require('@tensorflow/tfjs-node');
const models = require('./models')();

function msgToFeature(msg, cfg) {
    return {
        topic: msg.topic,
        value: {
            xs: tf.tensor([cfg.xs.map(x => msg.payload[x])]),
            ys: tf.tensor([cfg.ys.map(y => msg.payload[y])]),
            rxs: (cfg.xs.map(x => msg.payload[x])),
            rys: (cfg.ys.map(y => msg.payload[y]))
        }
    };
}

function createTraining(modelId, trainDataset, config, callbacks) {
    let epoch = 1;
    let batch = 0;
    const model = models.getModel(modelId);
    return model.fitDataset(trainDataset, {
        ...config,
        callbacks: {
            onBatchEnd: (b, logs) => {
                if (typeof callbacks.onBatchEnd !== 'function') return;
                batch++;
                const epochs = config.epochs;
                const batches = config.batchesPerEpoch;
                callbacks.onBatchEnd({
                    epoch,
                    epochs,
                    batch,
                    batches,
                    acc: logs.acc,
                    val_acc: logs.val_acc
                });
            },
            onEpochEnd: (e, logs) => {
                if (typeof callbacks.onEpochEnd !== 'function') return;
                const epochs = config.epochs;
                const batches = config.batchesPerEpoch;
                console.log("Epoch", e + 1);
                epoch++;
                batch = 0;;
                callbacks.onEpochEnd({
                    epoch,
                    epochs,
                    batch,
                    batches,
                    acc: logs.acc,
                    val_acc: logs.val_acc
                });
            }
        }
    });
}

function createDatasetWriter(cfg) {
    let sampleCount = 0;
    let epochCount = 0;
    this._pipes = [];
    this.next = () => new Promise((resolve, reject) => {
            // console.log("Waiting for more data...");
            const writeSlot = {
                write: (ds) => {
                    const totalInstances = cfg.batchSize * cfg.batchesPerEpoch;
                    /*if (sampleCount / totalInstances >= cfg.epochs) {
                        console.warn(`Warning: More data than expected for ${cfg.batchesPerEpoch} batches and ${cfg.epochs} epochs`);
                        return resolve({ done: true });
                    }*/
                    ds.done = sampleCount > 0 && sampleCount % totalInstances === totalInstances-1;
                    sampleCount++;
                    ds.done && console.log(sampleCount + '/' + totalInstances, " samples processed", ds.topic, ds.done, epochCount);
                    if (ds.done) {
                        // sampleCount = 0;
                        epochCount++;
                    }
                    return resolve(ds);
                }
            };
            this._pipes.map(p => p(writeSlot));
        });
    this.pipe = (reader) => {
        this._pipes.push(reader);
    };
}

function createDatasetReader(writer, cfg) {
    this._msgs = [];
    this._promises = [];
    let ended = false;

    const consumeQueue = () => {
        while (this._msgs.length > 0 && this._promises.length > 0) {
            const writeSlot = this._promises.splice(0, 1)[0];
            const msg = this._msgs.splice(0, 1)[0];
            writeSlot.write(msg);
        }
    };

    this.input = (msg) => {
        this._msgs.push(msgToFeature(msg, cfg));
        consumeQueue();
    };
    this.end = (msg) => {
        const feature = msgToFeature(msg, cfg);
        // feature.done = true;
        ended = true;
        this._msgs.push(feature);
        consumeQueue();
    };
    writer.pipe(writeSlot => {
        this._promises.push(writeSlot);
        consumeQueue();
    });
}

module.exports = {
    createTraining,
    createDatasetReader,
    createDatasetWriter
};
