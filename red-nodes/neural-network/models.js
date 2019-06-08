global.fetch = require('node-fetch'); // Enable remote storage of model
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const models = {};

module.exports = () => {
    function mkdirp (path) {
        if (path[0] != '/') path = './' + path;
        return path.split('/').reduce(function(prev, curr, i) {
            const newPath = prev + '/' + curr;
            if(fs.existsSync(newPath) === false) {
                fs.mkdirSync(newPath);
            }
            return newPath;
        });
    }
    return {
        getModelIds() {
            return Object.keys(models);
        },
        addModel (id, model) {
            models[id] = model;
            return model;
        },
        getModel (id) {
            return models[id];
        },
        saveModel (id, filename, ...additionalData) {
            let fn = filename;
            if (fn.indexOf('://') === -1) {
                fn = 'file://' + fn;
            }
            if (fn.startsWith('file://')) {
                mkdirp(fn.split('://')[1]);
                fs.writeFileSync(fn.split('://')[1] + '/customdata.json', JSON.stringify(additionalData));
            } else if(fn.startsWith('http://') || fn.startsWith('https://')) {
                // fetch(fn)
                // TODO: Store data on server
            } else {
                return Promise.reject();
            }
            return models[id].save(fn + '/model');
        },
        loadModel(filename) {
            let fn = filename || '';
            console.log(fn);
            if (fn.indexOf('://') === -1) {
                fn = 'file://' + fn;
            }
            let customData = null;
            if (fn && fs.existsSync(fn.split('://')[1] + '/customdata.json')) {
                customData = JSON.parse(fs.readFileSync(fn.split('://')[1] + '/customdata.json'));
            }
            return tf.loadLayersModel(fn + '/model/model.json') .then((model) => {
                return {
                    model,
                    customData
                }
            });
        }
    };
};
