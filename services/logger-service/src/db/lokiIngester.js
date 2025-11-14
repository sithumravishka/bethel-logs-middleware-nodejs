// lokiIngester.js
import axios from 'axios';
import schedule from 'node-schedule';
import cassandra from 'cassandra-driver';
import dotenv from 'dotenv';
dotenv.config();

/**
 * 1. Create a Cassandra client (same config as in your logger service).
 */
const cassandraClient = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_CONTACT_POINTS || '172.16.10.223'],
  localDataCenter: process.env.CASSANDRA_LOCAL_DATACENTER || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'logs',
  authProvider: new cassandra.auth.PlainTextAuthProvider(
    process.env.CASSANDRA_USERNAME || 'cassandra',
    process.env.CASSANDRA_PASSWORD || 'cassandra'
  ),
});

// Connect once at startup
await cassandraClient.connect();
console.log('[Loki Ingester] Connected to Cassandra');

/**
 * 2. Loki endpoint, e.g. http://localhost:3100/loki/api/v1/push
 *    (If you're using Docker Compose, might be 'http://loki:3100/loki/api/v1/push')
 */
const LOKI_URL = process.env.LOKI_URL || 'http://localhost:3100/loki/api/v1/push';

/**
 * 3. We need to track the "last timestamp" we’ve ingested
 *    so we don’t resend old logs. We can store that in memory,
 *    or in a small table, or on disk, etc.
 */
let lastLoggedAt = 0; // in epoch milliseconds

/**
 * 4. Query Cassandra for logs more recent than 'lastLoggedAt'.
 *    We'll do a simple poll approach: fetch logs where
 *      logged_at > lastLoggedAt
 *    and then update 'lastLoggedAt' accordingly.
 */
async function fetchNewLogs() {
  const query = `
    SELECT did, trace_id, service_name, level, message, start_time, end_time, logged_at
    FROM log_records
    WHERE logged_at > ?
    ALLOW FILTERING
  `;
  const params = [ new Date(lastLoggedAt) ];

  // Note: "ALLOW FILTERING" can be expensive. Ideally, you'd have a
  // table partitioned by day or by time. But for simplicity, we’ll do this.
  const result = await cassandraClient.execute(query, params, { prepare: true });
  return result.rows.map(row => ({
    did: row.did,
    traceId: row.trace_id,
    serviceName: row.service_name,
    level: row.level,
    message: row.message,
    startTime: row.start_time,
    endTime: row.end_time,
    loggedAt: row.logged_at,
  }));
}

/**
 * 5. Push logs to Loki in "batch" using the JSON push API:
 *    https://grafana.com/docs/loki/latest/api/#post-lokiapiv1push
 */
async function pushLogsToLoki(logs) {
  // The Loki push API wants "streams" with a set of labels
  // and an array of [timestamp, line].
  // Example structure:
  // {
  //   "streams": [
  //     {
  //       "stream": { "label1": "val1", "label2": "val2" },
  //       "values": [
  //          [ "unix_epoch_nanoseconds", "Log line text" ],
  //          ...
  //       ]
  //     }
  //   ]
  // }

  // We'll group logs by some label set (like level + serviceName),
  // or you can push them individually. For illustration, let's group
  // them by (serviceName, level).
  const streamsMap = {};

  for (const log of logs) {
    // Convert loggedAt to Loki-friendly nanosecond timestamp string
    const t = BigInt(log.loggedAt.getTime()) * 1000000n; // ms -> ns

    // Choose labels. Minimally you might have:
    // { service: log.serviceName, level: log.level }
    // but you can add did, traceId, etc., as you like.
    const streamKey = `service=${log.serviceName},level=${log.level}`;

    // The log line can include the message, traceId, did, etc. as text.
    const line = JSON.stringify({
      traceId: log.traceId,
      did: log.did,
      message: log.message,
      startTime: log.startTime ? log.startTime.toISOString() : null,
      endTime: log.endTime ? log.endTime.toISOString() : null,
    });

    // Initialize if needed
    if (!streamsMap[streamKey]) {
      streamsMap[streamKey] = {
        stream: {
          service: log.serviceName || 'unknown',
          level: log.level || 'INFO',
        },
        values: [],
      };
    }

    streamsMap[streamKey].values.push([
      t.toString(),  // string of nanoseconds
      line
    ]);
  }

  // Convert to array for Loki
  const streams = Object.values(streamsMap);

  if (streams.length === 0) {
    // No new logs, nothing to push.
    return;
  }

  const body = { streams };

  try {
    await axios.post(LOKI_URL, body);
  } catch (err) {
    console.error('[Loki Ingester] Error pushing logs to Loki:', err.message);
  }
}

/**
 * 6. Main ingestion job: fetch new logs, push them to Loki,
 *    and update lastLoggedAt so we only fetch truly new logs next time.
 */
async function ingestLogs() {
  try {
    const newLogs = await fetchNewLogs();
    if (newLogs.length === 0) {
      return; // No new logs
    }

    await pushLogsToLoki(newLogs);

    // Update lastLoggedAt to the newest log’s time
    const maxTime = Math.max(...newLogs.map(log => log.loggedAt.getTime()));
    lastLoggedAt = Math.max(lastLoggedAt, maxTime);
    console.log(`[Loki Ingester] Pushed ${newLogs.length} new logs to Loki`);
  } catch (err) {
    console.error('[Loki Ingester] Error in ingestLogs:', err);
  }
}

// Optional: load the lastLoggedAt from disk or config so we don’t re-ingest logs on restart
// For now, we start from 0 or a specific timestamp

/**
 * 7. Schedule a job to run every 15 seconds, or as you prefer.
 */
schedule.scheduleJob('*/15 * * * * *', async () => {
  await ingestLogs();
});

// or you can run it continuously if you prefer an infinite loop with sleeps

console.log('[Loki Ingester] Started ingestion job, polling Cassandra every 15s...');
