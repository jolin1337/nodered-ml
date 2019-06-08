FROM nodered/node-red-docker

USER root:root
RUN apt-get update && apt-get install -y python3-venv python3-pip
RUN python3 -m pip install tensorflow
# ENTRYPOINT ["node", "$NODE_OPTIONS", "node_modules/node-red/red.js", "-v", "$FLOWS", "--userDir", "/user-data"]
