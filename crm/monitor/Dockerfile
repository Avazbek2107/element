FROM alpine:3.20

RUN apk add --no-cache curl

COPY monitor.sh /monitor.sh
RUN chmod +x /monitor.sh

ENTRYPOINT ["/monitor.sh"]
