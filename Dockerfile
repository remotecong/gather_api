FROM node:13.12.0-stretch-slim
WORKDIR /code/
COPY package.json yarn.lock ./
RUN yarn
COPY . .
EXPOSE 3000
CMD yarn start

