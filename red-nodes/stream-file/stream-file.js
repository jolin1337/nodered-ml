const fs = require('fs');
const es = require('event-stream');
module.exports = function(RED) {
    function StreamReadFileNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', function(msg) {
            let lineNr = 0;
            let previousLine = null;
            const maxLines = parseInt(config.maxLines || msg.maxLines);
            const ignoreTopNLines = parseInt(config.ignoreTopNLines || msg.ignoreTopNLines);
            const ignoreBlankLines = config.ignoreBlankLines || msg.ignoreBlankLines;
            const rs = fs.createReadStream(config.filename || msg.filename);
            rs.on('end', () => {
                  msg.payload = previousLine;
                  msg.lineNr = lineNr;
                  msg.eof = true;
                  this.send(msg);
              })
              .pipe(es.split())
              .pipe(es.mapSync((line) => {
                  if (lineNr >= maxLines && maxLines > 0) {
                      return;
                  }
                  if (parseInt(ignoreTopNLines) > lineNr) {
                      lineNr += 1;
                      return;
                  }
                  if (ignoreBlankLines && line === '') {
                      return;
                  }
                  if (previousLine !== null) {
                      msg.payload = previousLine;
                      msg.lineNr = lineNr;
                      msg.eof = false;
                      lineNr += 1;
                      if (lineNr >= maxLines && maxLines > 0) {
                          msg.eof = true;
                          rs.unpipe();
                          rs.destroy();
                      }
                      this.send({ ...msg });
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
                this.lineNr = 0;
                this.msg = msg;
            }
            this.lineNr += 1;
            if (parseInt(config.ignoreTopNLines) > this.lineNr - 1) {
                return;
            }
            if (!config.ignoreBlankLines || msg.payload !== '') {
                this.stream.write(msg.payload + '\n');
            }
            if (msg.eof === true) {
                this.stream.end();
                this.msg.payload = {
                    filename: this.filename,
                    lines: this.lineNr,
                    bytesWritten: this.stream.bytesWritten
                };
                this.msg.eof = true;
                this.msg.filename = this.filename;
                this.send({ ...this.msg });
                this.msg = this.lineNr = this.stream = this.filename = undefined;
            }
        });
    }
    RED.nodes.registerType("stream-write-file", StreamWriteFileNode);
};

