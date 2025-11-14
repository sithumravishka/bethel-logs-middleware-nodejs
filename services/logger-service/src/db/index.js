// services/logger-service/src/db/index.js
import cassandra from 'cassandra-driver';
import dotenv from 'dotenv';

dotenv.config();

// Create a Cassandra client
const client = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1'],
  localDataCenter: process.env.CASSANDRA_LOCAL_DATACENTER || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'logs',
  authProvider: new cassandra.auth.PlainTextAuthProvider(
    process.env.CASSANDRA_USERNAME || 'cassandra',
    process.env.CASSANDRA_PASSWORD || 'cassandra'
  ),
});

// Connect to Cassandra
client.connect()
  .then(() => console.log('[Logger-Service] Connected to Cassandra'))
  .catch(err => {
    console.error('[Logger-Service] Failed to connect to Cassandra:', err);
    process.exit(1);
  });

export default client;
