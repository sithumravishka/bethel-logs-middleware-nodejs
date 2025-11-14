// logger-service/src/db/loggerRepository.js

import cassandraClient from './index.js';

/**
 * Retrieves logs based on filters and cursor-based pagination.
 * Groups logs by traceId and returns one "TraceGroup" per traceId.
 *
 * @param {Object} params
 * @param {Object} [params.filters] - Custom filters
 * @param {string} [params.filters.did]
 * @param {string} [params.filters.traceId]
 * @param {string} [params.filters.serviceName]
 * @param {string} [params.filters.level]
 * @param {Date|string|number} [params.filters.fromLoggedAt] - logged_at >= this
 * @param {Date|string|number} [params.filters.toLoggedAt]   - logged_at <= this
 * @param {number} params.pageSize - Number of trace groups per page
 * @param {string} [params.pagingState] - Cursor for Cassandra pagination
 * @returns {Promise<{ traceGroups: Array, nextPagingState: string | null }>}
 */
export async function fetchLogs({ filters = {}, pageSize, pagingState }) {
  const {
    did,
    traceId,
    serviceName,
    level,
    fromLoggedAt,
    toLoggedAt,
  } = filters;

  let query = `
    SELECT did, trace_id, service_name, level, message,
           start_time, end_time, logged_at
    FROM log_records
  `.trim();

  const whereClauses = [];
  const queryParams = [];

  // NOTE: This assumes did and logged_at are part of the primary key / indexed.
  // Adjust for your real Cassandra schema.

  if (did) {
    whereClauses.push('did = ?');
    queryParams.push(did);
  }

  if (traceId) {
    whereClauses.push('trace_id = ?');
    queryParams.push(traceId);
  }

  if (serviceName) {
    whereClauses.push('service_name = ?');
    queryParams.push(serviceName);
  }

  if (level) {
    whereClauses.push('level = ?');
    queryParams.push(level);
  }

  if (fromLoggedAt) {
    whereClauses.push('logged_at >= ?');
    queryParams.push(new Date(fromLoggedAt));
  }

  if (toLoggedAt) {
    whereClauses.push('logged_at <= ?');
    queryParams.push(new Date(toLoggedAt));
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  // logged_at should be a clustering key for this ORDER BY to be valid.
  query += ' ORDER BY logged_at DESC';

  // If you are filtering on non-key columns, you may need:
  // query += ' ALLOW FILTERING';

  const queryOptions = {
    prepare: true,
    fetchSize: pageSize * 5, // fetch extra rows to form pageSize trace groups
  };

  if (pagingState) {
    queryOptions.pageState = pagingState;
  }

  try {
    const result = await cassandraClient.execute(query, queryParams, queryOptions);

    const rows = result.rows || [];
    const logs = rows.map(row => ({
      did: row.did,
      traceId: row.trace_id,
      serviceName: row.service_name,
      level: row.level,
      message: row.message,
      startTime: row.start_time ? row.start_time.toISOString() : null,
      endTime: row.end_time ? row.end_time.toISOString() : null,
      loggedAt: row.logged_at ? row.logged_at.toISOString() : null,
    }));

    // Group by traceId -> one TraceGroup per trace
    const groupsByTrace = new Map();

    for (const log of logs) {
      if (!log.traceId) continue;

      if (!groupsByTrace.has(log.traceId)) {
        groupsByTrace.set(log.traceId, {
          traceId: log.traceId,
          did: log.did || null,
          serviceName: log.serviceName || null,
          firstLoggedAt: log.loggedAt,
          lastLoggedAt: log.loggedAt,
          logs: [],
        });
      }

      const group = groupsByTrace.get(log.traceId);
      group.logs.push(log);

      // update summary timestamps
      if (!group.firstLoggedAt || (log.loggedAt && log.loggedAt < group.firstLoggedAt)) {
        group.firstLoggedAt = log.loggedAt;
      }
      if (!group.lastLoggedAt || (log.loggedAt && log.loggedAt > group.lastLoggedAt)) {
        group.lastLoggedAt = log.loggedAt;
      }
    }

    // Convert Map -> array, sort by lastLoggedAt desc (acts like a "single log")
    let allGroups = Array.from(groupsByTrace.values());
    allGroups.sort((a, b) => {
      if (!a.lastLoggedAt && !b.lastLoggedAt) return 0;
      if (!a.lastLoggedAt) return 1;
      if (!b.lastLoggedAt) return -1;
      return new Date(b.lastLoggedAt) - new Date(a.lastLoggedAt);
    });

    const traceGroups = allGroups.slice(0, pageSize);
    const nextPagingState = result.pageState || null;

    return {
      traceGroups,
      nextPagingState,
    };
  } catch (error) {
    console.error('[Logger-Service] Error fetching logs from Cassandra:', error);
    throw new Error('CASSANDRA_FETCH_ERROR');
  }
}


/**
 * Retrieves user activity logs, grouped by traceId, with flexible filters
 * and page-number–based pagination.
 *
 * Each traceId group is treated as ONE logical log entry for pagination.
 *
 * @param {Object} params
 * @param {string} [params.did]              - Filter by user identity
 * @param {string} [params.level]            - Filter by log level
 * @param {string} [params.traceId]          - Filter by traceId
 * @param {Date|string|number} [params.fromLoggedAt] - logged_at >= this
 * @param {Date|string|number} [params.toLoggedAt]   - logged_at <= this
 * @param {number} [params.minDuration]      - duration >= this
 * @param {number} [params.maxDuration]      - duration <= this
 * @param {string} [params.message]          - Exact message match (DB-level filter)
 * @param {string} [params.messageContains]  - Substring filter (in-memory)
 * @param {number} params.pageSize           - Number of TRACE GROUPS per page
 * @param {number} [params.pageNumber=1]     - Page number (starting at 1)
 *
 * @returns {Promise<{
 *   logs: Array<{
 *     did: string | null,
 *     traceId: string,
 *     level: string | null,
 *     message: string | null,
 *     duration: number | null,
 *     loggedAt: string | null,
 *     records: Array<{
 *       did: string | null,
 *       traceId: string,
 *       level: string | null,
 *       message: string | null,
 *       duration: number | null,
 *       loggedAt: string | null,
 *     }>
 *   }>,
 *   pageNumber: number,
 *   totalLogs: number,  // number of traceId groups
 * }>
 */

export async function fetchUserActivityLogs({
  did,
  level,
  traceId,
  fromLoggedAt,
  toLoggedAt,
  minDuration,
  maxDuration,
  message,
  messageContains,
  pageSize,
  pageNumber = 1,
}) {
  let query = `
    SELECT did, trace_id, level, message, duration, logged_at
    FROM user_activity_records
  `.trim();

  const whereClauses = [];
  const queryParams = [];

  // 🔐 ONLY use columns that are safe for Cassandra (likely primary key / clustering)
  // did is almost certainly the partition key, logged_at likely clustering.
  if (did) {
    whereClauses.push('did = ?');
    queryParams.push(did);
  }

  if (fromLoggedAt) {
    whereClauses.push('logged_at >= ?');
    queryParams.push(new Date(fromLoggedAt));
  }

  if (toLoggedAt) {
    whereClauses.push('logged_at <= ?');
    queryParams.push(new Date(toLoggedAt));
  }

  // ❌ DO NOT put level / traceId / duration / message into the CQL WHERE clause
  // unless you have proper indexes or changed the primary key.
  // We'll filter those in memory instead.

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY logged_at DESC';

  const queryOptions = {
    prepare: true,
  };

  try {
    const result = await cassandraClient.execute(query, queryParams, queryOptions);

    let rows = result.rows;

    // -----------------------------
    // In-memory filters (safe, flexible)
    // -----------------------------

    if (level) {
      rows = rows.filter((row) => row.level === level);
    }

    if (traceId) {
      rows = rows.filter((row) => row.trace_id === traceId);
    }

    if (typeof minDuration === 'number') {
      rows = rows.filter(
        (row) =>
          typeof row.duration === 'number' && row.duration >= minDuration
      );
    }

    if (typeof maxDuration === 'number') {
      rows = rows.filter(
        (row) =>
          typeof row.duration === 'number' && row.duration <= maxDuration
      );
    }

    if (message) {
      rows = rows.filter((row) => row.message === message);
    }

    if (messageContains) {
      const needle = messageContains.toLowerCase();
      rows = rows.filter(
        (row) =>
          typeof row.message === 'string' &&
          row.message.toLowerCase().includes(needle)
      );
    }

    // -----------------------------
    // Group by trace_id
    // -----------------------------

    const groups = new Map(); // traceId -> { rows: [], latestLoggedAt }

    for (const row of rows) {
      const tId = row.trace_id;
      if (!tId) continue;

      let group = groups.get(tId);
      if (!group) {
        group = { rows: [], latestLoggedAt: row.logged_at || null };
        groups.set(tId, group);
      }

      group.rows.push(row);

      if (
        row.logged_at &&
        (!group.latestLoggedAt || row.logged_at > group.latestLoggedAt)
      ) {
        group.latestLoggedAt = row.logged_at;
      }
    }

    let groupedLogs = Array.from(groups.entries()).map(([tId, group]) => {
      const sortedRows = group.rows
        .slice()
        .sort((a, b) => b.logged_at - a.logged_at); // newest first

      const first = sortedRows[0];

      return {
        did: first.did ?? null,
        traceId: tId,
        level: first.level ?? null,
        message: first.message ?? null,
        duration:
          typeof first.duration === 'number' ? first.duration : null,
        loggedAt: first.logged_at ? first.logged_at.toISOString() : null,
        records: sortedRows.map((r) => ({
          did: r.did ?? null,
          traceId: r.trace_id,
          level: r.level ?? null,
          message: r.message ?? null,
          duration:
            typeof r.duration === 'number' ? r.duration : null,
          loggedAt: r.logged_at ? r.logged_at.toISOString() : null,
        })),
      };
    });

    // Order groups by latestLoggedAt DESC
    groupedLogs.sort((a, b) => {
      const aTime = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
      const bTime = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
      return bTime - aTime;
    });

    const totalLogs = groupedLogs.length;
    const offset = (pageNumber - 1) * pageSize;
    const pagedLogs = groupedLogs.slice(offset, offset + pageSize);

    return {
      logs: pagedLogs,
      pageNumber,
      totalLogs,
    };
  } catch (error) {
    console.error(
      '[UserActivity-Service] Error fetching logs from Cassandra:',
      error
    );
    throw new Error('CASSANDRA_FETCH_ERROR');
  }
}

// src/db/loggerRepository.js

export async function fetchUserActivityLogsByLevel({
  level,
  fromLoggedAt,
  toLoggedAt,
  pageSize,
  pageNumber = 1,
}) {
  if (!level) {
    throw new Error('LEVEL_REQUIRED');
  }

  let query = `
    SELECT did, trace_id, level, message, duration, logged_at
    FROM user_activity_records
    WHERE level = ?
  `.trim();

  const queryParams = [level];

  if (fromLoggedAt) {
    query += ' AND logged_at >= ?';
    queryParams.push(new Date(fromLoggedAt));
  }

  if (toLoggedAt) {
    query += ' AND logged_at <= ?';
    queryParams.push(new Date(toLoggedAt));
  }

  // ⚠️ Required because this is not using the partition key.
  query += ' ALLOW FILTERING';

  const queryOptions = { prepare: true };

  try {
    const result = await cassandraClient.execute(query, queryParams, queryOptions);

    let rows = result.rows || [];

    // Sort by logged_at DESC in memory
    rows.sort((a, b) => {
      const at = a.logged_at ? a.logged_at.getTime() : 0;
      const bt = b.logged_at ? b.logged_at.getTime() : 0;
      return bt - at;
    });

    // Group by trace_id
    const groups = new Map();

    for (const row of rows) {
      const tId = row.trace_id;
      if (!tId) continue;

      let group = groups.get(tId);
      if (!group) {
        group = { rows: [], latestLoggedAt: row.logged_at || null };
        groups.set(tId, group);
      }

      group.rows.push(row);

      if (
        row.logged_at &&
        (!group.latestLoggedAt || row.logged_at > group.latestLoggedAt)
      ) {
        group.latestLoggedAt = row.logged_at;
      }
    }

    let groupedLogs = Array.from(groups.entries()).map(([tId, group]) => {
      const sortedRows = group.rows
        .slice()
        .sort((a, b) => b.logged_at - a.logged_at); // newest first

      const first = sortedRows[0];

      return {
        did: first.did ?? null,
        traceId: tId,
        level: first.level ?? null,
        message: first.message ?? null,
        duration:
          typeof first.duration === 'number' ? first.duration : null,
        loggedAt: first.logged_at ? first.logged_at.toISOString() : null,
        records: sortedRows.map((r) => ({
          did: r.did ?? null,
          traceId: r.trace_id,
          level: r.level ?? null,
          message: r.message ?? null,
          duration:
            typeof r.duration === 'number' ? r.duration : null,
          loggedAt: r.logged_at ? r.logged_at.toISOString() : null,
        })),
      };
    });

    // Sort groups again by latest loggedAt (defensive)
    groupedLogs.sort((a, b) => {
      const aTime = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
      const bTime = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
      return bTime - aTime;
    });

    const totalLogs = groupedLogs.length;
    const offset = (pageNumber - 1) * pageSize;
    const pagedLogs = groupedLogs.slice(offset, offset + pageSize);

    return {
      logs: pagedLogs,
      pageNumber,
      totalLogs,
    };
  } catch (error) {
    console.error(
      '[UserActivity-Service] Error fetching logs by level from Cassandra:',
      error
    );
    throw new Error('CASSANDRA_FETCH_ERROR');
  }
}

