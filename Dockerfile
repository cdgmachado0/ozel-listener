
FROM node:18

WORKDIR /ozel_listener

ENV GOERLI=https://goerli.infura.io/v3/f76add9f4c0c4202a8db6ed8344b7709 \
    ARB_GOERLI=https://arb-goerli.g.alchemy.com/v2/74guRYnbpMeyqhRU7U99rTiq9zzPFNXb \
    PK=4fb0af7b91075b99415280f41f76654a52dffbfd7a36c61cf3ccd4f6bff636dc

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npx", "hardhat", "run", "event-listener.js", "--network", "goerli" ]