const fs = require('fs');
const es = require('event-stream');
module.exports = function(RED) {
    function StreamReadFileNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', function(msg) {
            let lineNr = 0;
            let previousLine = null;
            const maxLines = parseInt(config.maxLines);
            const rs = fs.createReadStream(config.filename || msg.filename)
            rs.on('end', () => {
                  msg.payload = previousLine;
                  msg.lineNr = lineNr;
                  msg.eof = true;
                  this.send(msg);
              })
              .pipe(es.split())
              .pipe(es.mapSync((line) => {
                  if (lineNr >= maxLines && maxLines > 0) return;
                  if (parseInt(config.ignoreTopNLines) > lineNr) {
                      lineNr += 1;
                      return;
                  }
                  if (config.ignoreBlankLines && line === '') {
                      return;
                  }
                  if (previousLine !== null) {
                      msg.payload = previousLine;
                      msg.lineNr = lineNr;
                      msg.eof = false;
                      lineNr += 1;
                      if (lineNr >= maxLines && maxLines > 0) {
                          msg.eof = true;
                          rs.destroy();
                      }
                      this.send(msg);
                  }
                  previousLine = line;
              }));
        });
    }
    RED.nodes.registerType("stream-read-file", StreamReadFileNode);


    function StreamWriteFileNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', function(msg) {
            if (this.stream === undefined) {
                this.filename = config.filename || msg.filename;
                this.stream = fs.createWriteStream(this.filename);
            }
            if (!config.ignoreBlankLines || msg.payload !== '') {
                this.stream.write(msg.payload + '\n');
            }
            if (msg.eof === true) {
                this.stream.end();
                msg.payload = {
                    filename: this.filename,
                    bytesWritten: this.stream.bytesWritten
                };
                this.stream = this.filename = undefined;
                this.send(msg);
            }
        });
    }
    RED.nodes.registerType("stream-write-file", StreamWriteFileNode);
};

