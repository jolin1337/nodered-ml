FROM nodered/node-red-docker
#FROM nvidia/cuda:9.0-base

USER root:root
RUN apt-get update && apt-get install -y python3-venv python3-pip
#RUN curl -L http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1810/x86_64/cuda-repo-ubuntu1810_10.1.168-1_amd64.deb && \
#    dpkg -i cuda-repo-ubuntu1810_10.1.168-1_amd64.deb && \
#	apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1810/x86_64/7fa2af80.pub && \
#	apt-get update && apt-get install cuda
RUN mkdir /user-data
RUN npm install @tensorflow/tfjs-node
RUN ln -s /user-data/datasets /usr/src/node-red/datasets
# ENTRYPOINT ["node", "$NODE_OPTIONS", "node_modules/node-red/red.js", "-v", "$FLOWS", "--userDir", "/user-data"]
