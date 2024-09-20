FROM node:18.0-alpine
WORKDIR /app
COPY package.json consumer/ /app/
RUN npm install
RUN npm i -g nodemon
CMD [ "nodemon", "index.js" ]