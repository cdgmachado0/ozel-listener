
FROM node:18

WORKDIR /ozel_listener

ENV GOERLI=https://goerli.infura.io/v3/f76add9f4c0c4202a8db6ed8344b7709 \
    ARB_GOERLI=https://arb-goerli.g.alchemy.com/v2/74guRYnbpMeyqhRU7U99rTiq9zzPFNXb \
    PK=b82d1747566080fdc757af4ea2cc0b63a313c8b8b21eb72c8e80619ec35c6b43

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npx", "hardhat", "run", "event-listener.js", "--network", "goerli" ]