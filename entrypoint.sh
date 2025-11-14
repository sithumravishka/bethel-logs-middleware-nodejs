#!/bin/sh
# entrypoint.sh

echo "Starting logger service..."
# This assumes your package.json "start" script launches your logger service (e.g. server.js)
npm start &

echo "Starting Loki Ingester..."
# Assuming your lokiIngester.js is located in the src folder
node src/lokiIngester.js &

# Wait for either process to exit (if one fails, the container will exit)
wait -n

# Exit with status of whichever process exited first
exit $?
