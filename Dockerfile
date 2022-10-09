
FROM node:18

WORKDIR /ozel_listener

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npx", "hardhat", "run", "event-listener.js", "--network", "goerli" ]