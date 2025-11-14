// logger-service/src/db/loggerRepository.js

import cassandraClient from './index.js';

/**
 * Inserts a log record into Cassandra.
 * @param {Object} logData
 * @param {string} logData.did
 * @param {string} logData.traceId
 * @param {string} logData.serviceName
 * @param {string} logData.level
 * @param {string} logData.message
 * @param {Date|string|number} [logData.startTime]
 * @param {Date|string|number} [logData.endTime]
 * @returns {Promise<void>}
 */
export async function saveLog(logData) {
  const {
    did,
    traceId,
    serviceName,
    level,
    message,
    startTime,
    endTime
  } = logData;

  // Convert times to JavaScript Date if they are strings or timestamps
  const startTimeObj = startTime ? new Date(startTime) : null;
  const endTimeObj   = endTime   ? new Date(endTime)   : null;
  const now          = new Date(); // Use as "logged_at"

  const query = `
    INSERT INTO log_records (did, trace_id, service_name, level, message, start_time, end_time, logged_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    did,
    traceId,
    serviceName,
    level,
    message,
    startTimeObj,
    endTimeObj,
    now
  ];

  try {
    await cassandraClient.execute(query, params, { prepare: true });
  } catch (error) {
    console.error('[Logger-Service] Error inserting log into Cassandra:', error);
    throw new Error('CASSANDRA_INSERT_ERROR');
  }
}

/**
 * Retrieves logs based on filters and cursor-based pagination.
 * Groups logs by traceId.
 * @param {Object} params
 * @param {string} [params.did] - Filter by user identity
 * @param {number} params.pageSize - Number of logs per page
 * @param {string} [params.pagingState] - Cursor for pagination
 * @returns {Promise<{ traceGroups: Array, nextPagingState: string }>}
 */
export async function fetchLogs({ did, pageSize, pagingState }) {
  // Base query
  let query = 'SELECT did, trace_id, service_name, level, message, start_time, end_time, logged_at FROM log_records';
  const queryParams = [];
  const queryOptions = {
    prepare: true,
    fetchSize: pageSize
  };

  if (did) {
    query += ' WHERE did = ?';
    queryParams.push(did);
  }

  query += ' ORDER BY logged_at DESC';

  if (pagingState) {
    queryOptions.pagingState = pagingState;
  }

  try {
    const result = await cassandraClient.execute(query, queryParams, queryOptions);

    // Map the results to LogRecord objects
    const logs = result.rows.map(row => ({
      did: row.did,
      traceId: row.trace_id,
      serviceName: row.service_name,
      level: row.level,
      message: row.message,
      startTime: row.start_time ? row.start_time.toISOString() : null,
      endTime: row.end_time ? row.end_time.toISOString() : null,
      loggedAt: row.logged_at ? row.logged_at.toISOString() : null,
    }));

    // Group logs by traceId
    const traceGroupsMap = logs.reduce((acc, log) => {
      if (!acc[log.traceId]) {
        acc[log.traceId] = {
          traceId: log.traceId,
          logs: [],
        };
      }
      acc[log.traceId].logs.push(log);
      return acc;
    }, {});

    const traceGroups = Object.values(traceGroupsMap);

    // Determine the nextPagingState
    const nextPagingState = result.pageState;

    return {
      traceGroups,
      nextPagingState
    };
  } catch (error) {
    console.error('[Logger-Service] Error fetching logs from Cassandra:', error);
    throw new Error('CASSANDRA_FETCH_ERROR');
  }
}


/**
 * Inserts a user activity record into the "user_activity_records" table in Cassandra.
 * @param {Object} activityData
 * @param {string} activityData.did
 * @param {string} activityData.traceId
 * @param {string} activityData.level
 * @param {string} activityData.message
 * @param {number|null} activityData.duration Duration in milliseconds
 * @returns {Promise<void>}
 */
export async function saveUserActivity(activityData) {
  const { did, traceId, level, message, duration } = activityData;
  const now = new Date(); // used as "logged_at"

  const query = `
    INSERT INTO user_activity_records (did, trace_id, level, message, duration, logged_at, log_id)
    VALUES (?, ?, ?, ?, ?, ?, now())
  `;

  const params = [did, traceId, level, message, duration, now];

  try {
    await cassandraClient.execute(query, params, { prepare: true });
  } catch (error) {
    console.error('[UserActivity-Service] Error inserting user activity into Cassandra:', error);
    throw new Error('CASSANDRA_INSERT_ERROR');
  }
}

/**
 * Retrieves all user activity logs related to the specified DID (or all logs if no DID is provided)
 * with page number–based pagination.
 * @param {Object} params
 * @param {string} [params.did] - Filter by user identity
 * @param {number} params.pageSize - Number of logs per page
 * @param {number} [params.pageNumber=1] - Page number (starting at 1)
 * @returns {Promise<{ logs: Array, pageNumber: number, totalLogs: number }>}
 */
export async function fetchUserActivityLogs({ did, pageSize, pageNumber = 1 }) {
  // Base query for the user_activity_records table
  let query = 'SELECT did, trace_id, level, message, duration, logged_at FROM user_activity_records';
  const queryParams = [];
  const queryOptions = {
    prepare: true
  };

  if (did) {
    query += ' WHERE did = ?';
    queryParams.push(did);
  }

  query += ' ORDER BY logged_at DESC';

  try {
    const result = await cassandraClient.execute(query, queryParams, queryOptions);

    // Map the result rows to log objects (returning all logs, not grouping by traceId)
    const logs = result.rows.map(row => ({
      did: row.did,
      traceId: row.trace_id,
      level: row.level,
      message: row.message,
      duration: row.duration,
      loggedAt: row.logged_at ? row.logged_at.toISOString() : null,
    }));

    const totalLogs = logs.length;
    const offset = (pageNumber - 1) * pageSize;
    const pagedLogs = logs.slice(offset, offset + pageSize);

    return {
      logs: pagedLogs,
      pageNumber,
      totalLogs
    };
  } catch (error) {
    console.error('[UserActivity-Service] Error fetching logs from Cassandra:', error);
    throw new Error('CASSANDRA_FETCH_ERROR');
  }
}
