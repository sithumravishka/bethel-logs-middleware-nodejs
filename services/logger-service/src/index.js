// logger-service/src/server.js
import dotenv from 'dotenv';
dotenv.config();

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import path from 'path';
import { fileURLToPath } from 'url';
const protoLoader = require('@grpc/proto-loader');
const grpc = require('@grpc/grpc-js');

import { getLogs, getUserActivityLogs, getUserActivityLogsByLevel } from './controllers/loggerController.js';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load logger.proto
const LOGGER_PROTO_PATH = path.join(__dirname, '../../../common-protos', 'logger.proto');
const loggerPackageDef = protoLoader.loadSync(LOGGER_PROTO_PATH, {});
const loggerProto = grpc.loadPackageDefinition(loggerPackageDef).logger;

// 2. Create the gRPC server & map service methods
function main() {
  const server = new grpc.Server();

  server.addService(loggerProto.LoggerService.service, {
    GetLogs: getLogs,
    GetUserActivityLogs: getUserActivityLogs,
    GetUserActivityLogsByLevel: getUserActivityLogsByLevel
  });

  // 3. Bind & start the server
  const port = process.env.LOGGER_SERVICE_PORT || '50055';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('[Logger-Service] gRPC server error:', err);
      return;
    }
    server.start();
    console.log(`[Logger-Service] gRPC server running at 0.0.0.0:${boundPort}`);
  });
}

main();
