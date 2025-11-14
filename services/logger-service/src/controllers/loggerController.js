// logger-service/src/controllers/loggerController.js

import grpc from '@grpc/grpc-js';
import {
  fetchLogs,
  fetchUserActivityLogs,
  fetchUserActivityLogsByLevel,
} from '../db/loggerRepository.js';


/**
 * gRPC method: GetLogs
 * Retrieves logs based on filters and cursor-based pagination,
 * grouped by traceId (so each trace is treated like one "log block").
 */
export async function getLogs(call, callback) {
  const {
    did,
    pageSize = 10,
    pagingState,
    traceId,
    serviceName,
    level,
    fromLoggedAt,
    toLoggedAt,
  } = call.request;

  console.log(
    `[Logger-Service] Received GetLogs request (did=${did}, traceId=${traceId}, serviceName=${serviceName}, level=${level}, pageSize=${pageSize})`
  );

  try {
    const { traceGroups, nextPagingState } = await fetchLogs({
      pageSize,
      pagingState,
      filters: {
        did,
        traceId,
        serviceName,
        level,
        fromLoggedAt,
        toLoggedAt,
      },
    });

    // traceGroups already matches the protobuf TraceGroup structure
    callback(null, {
      traceGroups,
      nextPagingState,
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
 * gRPC method: GetUserActivityLogs
 * Retrieves user activity logs based on filters and page number–based pagination.
 *
 * NOTE:
 * - Pagination is based on TRACE GROUPS (traceId), not raw DB rows.
 * - Each element in `logs` represents one trace group.
 */
export async function getUserActivityLogs(call, callback) {
  const {
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
  } = call.request;

  console.log("\n======================");
  console.log("[UserActivity-Service] Incoming GetUserActivityLogs Request");
  console.log("======================");
  console.log("Request Payload:");
  console.log(JSON.stringify({
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
    messageContains
  }, null, 2));
  console.log("======================\n");

  try {
    const response = await fetchUserActivityLogs({
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
    });

    const { logs, pageNumber: currentPage, totalLogs } = response;

    console.log("\n----------------------");
    console.log("[UserActivity-Service] fetchUserActivityLogs Response Summary");
    console.log("----------------------");

    console.log("Returned Pagination:");
    console.log(JSON.stringify({
      pageNumber: currentPage,
      totalLogs,
      pageSize
    }, null, 2));

    console.log(`Logs Returned: ${logs.length}`);

    console.log("\nPreview First 3 Logs:");
    console.log(JSON.stringify(
      logs.slice(0, 3).map(l => ({
        did: l.did,
        traceId: l.traceId,
        level: l.level,
        message: l.message,
        duration: l.duration,
        loggedAt: l.loggedAt,
        recordsCount: l.records ? l.records.length : undefined
      })),
      null,
      2
    ));

    console.log("----------------------\n");

    callback(null, {
      logs,
      pageNumber: currentPage,
      totalLogs,
    });

  } catch (err) {
    console.error("\n======================");
    console.error("[UserActivity-Service] ERROR in GetUserActivityLogs");
    console.error("======================");
    console.error("Error message:", err.message);
    console.error("Full error:", err);
    console.error("======================\n");

    return callback({
      code: grpc.status.INTERNAL,
      details: 'Failed to fetch user activity logs from Cassandra',
    });
  }
}

export async function getUserActivityLogsByLevel(call, callback) {
  const {
    level,
    pageSize,
    pageNumber,
    fromLoggedAt,
    toLoggedAt,
  } = call.request;

  console.log("\n=====================");
  console.log("[UserActivity-Service] Incoming GetUserActivityLogsByLevel Request");
  console.log("=====================");
  console.log("Request Payload:");
  console.log(JSON.stringify({
    level,
    pageSize,
    pageNumber,
    fromLoggedAt,
    toLoggedAt,
  }, null, 2));
  console.log("=====================\n");

  try {
    const { logs, pageNumber: currentPage, totalLogs } =
      await fetchUserActivityLogsByLevel({
        level,
        pageSize,
        pageNumber,
        fromLoggedAt,
        toLoggedAt,
      });

    console.log("[UserActivity-Service] GetUserActivityLogsByLevel Response Summary:", {
      pageNumber: currentPage,
      totalLogs,
      logsReturned: logs.length,
    });

    callback(null, {
      logs,
      pageNumber: currentPage,
      totalLogs,
    });
  } catch (err) {
    console.error('[UserActivity-Service] Error fetching logs by level:', err);
    return callback({
      code: grpc.status.INTERNAL,
      details: 'Failed to fetch user activity logs by level from Cassandra',
    });
  }
}

