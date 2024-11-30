FROM node:18

RUN mkdir -p /app
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY index.js /app/index.js
EXPOSE 9080

# esp cam url
ENV BASE_URL="http://192.168.2.12"
# esp cam config
ENV CONFIG="?var=framesize&val=9"
# listen on port
ENV LISTEN_PORT="9080"
# listen on hostname
ENV LISTEN_HOSTNAME="0.0.0.0"

CMD ["node", "/app/index.js"]
