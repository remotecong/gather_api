FROM node:alpine3.11
RUN yarn global add nodemon && \
      apk -U --no-progress update && \
      apk -U --no-progress add tor
WORKDIR /code/
COPY package.json yarn.lock ./
RUN yarn
COPY . .
EXPOSE 3000
ENV NODE_ENV production
CMD yarn start
