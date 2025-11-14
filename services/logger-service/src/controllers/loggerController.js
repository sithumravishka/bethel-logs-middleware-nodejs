// logger-service/src/controllers/loggerController.js

import grpc from '@grpc/grpc-js';
import { saveLog, fetchLogs, saveUserActivity, fetchUserActivityLogs } from '../db/loggerRepository.js';

/**
 * gRPC method: LogEvent
 * Accepts a log entry and stores it in Cassandra.
 */
export async function logEvent(call, callback) {
  const {
    did,
    traceId,
    serviceName,
    level,
    message,
    startTime,
    endTime
  } = call.request;

  if (!traceId || !level || !message) {
    console.warn('[Logger-Service] Invalid log request data:', call.request);
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      details: 'Missing required fields: traceId, level, message',
    });
  }

  console.log(`[Logger-Service] Received LogEvent (traceId=${traceId}, level=${level})`);

  try {
    await saveLog({
      did,
      traceId,
      serviceName,
      level,
      message,
      startTime,
      endTime,
    });

    callback(null, { acknowledged: true });
  } catch (err) {
    console.error('[Logger-Service] Error saving log:', err);
    return callback({
      code: grpc.status.INTERNAL,
      details: 'Failed to save log to Cassandra',
    });
  }
}

/**
 * gRPC method: GetLogs
 * Retrieves logs based on filters and cursor-based pagination.
 */
export async function getLogs(call, callback) {
  const {
    did,
    pageSize = 10,
    pagingState
  } = call.request;

  console.log(`[Logger-Service] Received GetLogs request (did=${did}, pageSize=${pageSize})`);

  try {
    const { traceGroups, nextPagingState } = await fetchLogs({ did, pageSize, pagingState });

    callback(null, {
      traceGroups,
      nextPagingState
    });
  } catch (err) {
    console.error('[Logger-Service] Error fetching logs:', err);
    return callback({
      code: grpc.status.INTERNAL,
      details: 'Failed to fetch logs from Cassandra',
    });
  }
}

/**
 * Handles a log request for user activity and computes the duration.
 * This function writes to a new table, "user_activity_records".
 */
export async function logUserActivity(call, callback) {
  const { did, traceId, level, message, duration } = call.request;

  // Validate required fields
  if (!traceId || !level || !message) {
    console.warn('[UserActivity-Service] Invalid log request data:', call.request);
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      details: 'Missing required fields: traceId, level, message',
    });
  }

  try {
    await saveUserActivity({
      did,
      traceId,
      level,
      message,
      duration,
    });

    callback(null, { acknowledged: true });
  } catch (err) {
    console.error('[UserActivity-Service] Error saving user activity:', err);
    return callback({
      code: grpc.status.INTERNAL,
      details: 'Failed to save user activity to Cassandra',
    });
  }
}

/**
 * gRPC method: GetLogs
 * Retrieves user activity logs based on filters and page number–based pagination.
 */
export async function getUserActivityLogs(call, callback) {
  const { did, pageSize, pageNumber } = call.request;
  console.log(`[UserActivity-Service] Received GetLogs request (did=${did}, pageSize=${pageSize}, pageNumber=${pageNumber})`);
  
  try {
    const { logs, pageNumber: currentPage, totalLogs } = await fetchUserActivityLogs({ did, pageSize, pageNumber });
    
    // Return the user activity logs and pagination details
    callback(null, {
      logs,
      pageNumber: currentPage,
      totalLogs
    });
  } catch (err) {
    console.error('[UserActivity-Service] Error fetching logs:', err);
    return callback({
      code: grpc.status.INTERNAL,
      details: 'Failed to fetch user activity logs from Cassandra',
    });
  }
}
