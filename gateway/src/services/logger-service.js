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
 * Sends a log event to the logger-service.
 * @param {Object} logData
 * @param {string} logData.did
 * @param {string} logData.traceId
 * @param {string} logData.serviceName
 * @param {string} logData.level - e.g. 'info', 'error', etc.
 * @param {string} logData.message
 * @param {string} [logData.startTime]
 * @param {string} [logData.endTime]
 * @returns {Promise<void>}
 */
export function logEvent({ did, traceId, serviceName, level, message, startTime, endTime }) {
  return new Promise((resolve, reject) => {
    loggerClient.LogEvent(
      { did, traceId, serviceName, level, message, startTime, endTime },
      (err, response) => {
        if (err) {
          console.error('[Gateway] Failed to log event:', err.message);
          return reject(err);
        }
        resolve(response);
      }
    );
  });
}

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

/**
 * Sends a user activity log event to the logger-service.
 * @param {Object} logData
 * @param {string} logData.did
 * @param {string} logData.traceId
 * @param {string} logData.level - e.g. 'info', 'error', etc.
 * @param {string} logData.message
 * @param {number} logData.duration - Duration in milliseconds
 * @returns {Promise<void>}
 */
export function logUserActivity({ did, traceId, level, message, duration }) {
  return new Promise((resolve, reject) => {
    loggerClient.LogUserActivity(
      { did, traceId, level, message, duration },
      (err, response) => {
        if (err) {
          console.error('[Gateway] Failed to log user activity:', err.message);
          return reject(err);
        }
        resolve(response);
      }
    );
  });
}

export function getUserActivityLogs({ did, pageSize, pageNumber }) {
  return new Promise((resolve, reject) => {
    loggerClient.GetUserActivityLogs({ did, pageSize, pageNumber }, (err, response) => {
      if (err) {
        console.error('[Gateway] Failed to get user activity logs:', err.message);
        return reject(err);
      }
      resolve(response);
    });
  });
}



export const logEventWithTrace = async (logData, traceId) => {
    return await logEvent({
      ...logData,
      traceId,
    });
  };

export const logUserActivityWithTrace = async (logData, traceId) => {
    return await logUserActivity({
      ...logData,
      traceId,
    });
  };

