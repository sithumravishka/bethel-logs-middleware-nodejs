// gateway/src/services/logger-service.js

import { loadPackageDefinition, credentials } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const loggerProtoPath = join(__dirname, '..', '..', '..', 'common-protos', 'logger.proto');

// Load the logger proto
const loggerPackageDef = loadSync(loggerProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
});
const loggerGrpcObj = loadPackageDefinition(loggerPackageDef).logger;

// Create client instance pointing to the logger-service
const loggerClient = new loggerGrpcObj.LoggerService(
  `logger-service:${process.env.LOGGER_SERVICE_PORT || '50055'}`,
  credentials.createInsecure()
);

/**
 * Retrieves logs from the logger-service with cursor-based pagination.
 * @param {Object} params
 * @param {string} [params.did]
 * @param {number} params.pageSize
 * @param {string} [params.pagingState]
 * @returns {Promise<{ traceGroups: Array, nextPagingState: string }>}
 */
export function getLogs({ did, pageSize, pagingState }) {
  return new Promise((resolve, reject) => {
    loggerClient.GetLogs(
      { did, pageSize, pagingState },
      (err, response) => {
        if (err) {
          console.error('[Gateway] Failed to get logs:', err.message);
          return reject(err);
        }
        resolve(response);
      }
    );
  });
}

// src/clients/loggerClient.js (or wherever this lives)

export function getUserActivityLogs({
  did,
  pageSize,
  pageNumber,
  level,
  traceId,
  fromLoggedAt,
  toLoggedAt,
  minDuration,
  maxDuration,
  message,
  messageContains,
}) {
  return new Promise((resolve, reject) => {
    const requestPayload = {
      did,
      pageSize,
      pageNumber,
      level,
      traceId,
      fromLoggedAt,
      toLoggedAt,
      minDuration,
      maxDuration,
      message,
      messageContains,
    };

    // Optional: strip out undefined so gRPC doesn't see them at all
    Object.keys(requestPayload).forEach((key) => {
      if (requestPayload[key] === undefined) {
        delete requestPayload[key];
      }
    });

    console.log("\n[Gateway] Calling LoggerService.GetUserActivityLogs with:");
    console.log(JSON.stringify(requestPayload, null, 2));

    loggerClient.GetUserActivityLogs(requestPayload, (err, response) => {
      if (err) {
        console.error('[Gateway] Failed to get user activity logs:', err.message || err);
        return reject(err);
      }

      console.log("[Gateway] Received GetUserActivityLogs response summary:", {
        pageNumber: response.pageNumber,
        totalLogs: response.totalLogs,
        logsReturned: response.logs ? response.logs.length : 0,
      });

      resolve(response);
    });
  });
}

export function getUserActivityLogsByLevel({
  level,
  pageSize,
  pageNumber,
  fromLoggedAt,
  toLoggedAt,
}) {
  return new Promise((resolve, reject) => {
    const requestPayload = {
      level,
      pageSize,
      pageNumber,
      fromLoggedAt,
      toLoggedAt,
    };

    console.log("\n[Gateway] Calling LoggerService.GetUserActivityLogsByLevel with:");
    console.log(JSON.stringify(requestPayload, null, 2));

    loggerClient.GetUserActivityLogsByLevel(requestPayload, (err, response) => {
      if (err) {
        console.error('[Gateway] Failed to get user activity logs by level:', err.message || err);
        return reject(err);
      }

      console.log("[Gateway] GetUserActivityLogsByLevel response summary:", {
        pageNumber: response.pageNumber,
        totalLogs: response.totalLogs,
        logsReturned: response.logs ? response.logs.length : 0,
      });

      resolve(response);
    });
  });
}
