// src/middleware/tokenBucket.js (ESM)
import crypto from 'crypto';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

export function awsTokenBucket({
  tableName,
  capacity = 100,
  refillPerSecond = 50 / 60,
  identify = (req) => req.get('x-api-key') || req.ip,
  prefix = 'tb',
  headerHints = true,
  maxRetries = 3,
  dynamoClient,
} = {}) {
  if (!tableName) throw new Error('tableName is required');
  if (capacity <= 0) throw new Error('capacity must be > 0');
  if (refillPerSecond <= 0) throw new Error('refillPerSecond must be > 0');

  const client = dynamoClient || new DynamoDBClient({});

  const nowMs = () => Date.now();

  async function getState(key) {
    const out = await client.send(new GetItemCommand({
      TableName: tableName,
      Key: { id: { S: key } },
      ConsistentRead: true,
    }));
    if (!out.Item) return null;
    return {
      tokens: Number(out.Item.tokens?.N ?? '0'),
      lastRefillTs: Number(out.Item.lastRefillTs?.N ?? '0'),
    };
  }

  function computeRefill(prevTokens, prevTs, now) {
    const elapsedSec = Math.max(0, (now - prevTs) / 1000);
    const refill = elapsedSec * refillPerSecond;
    return Math.min(capacity, prevTokens + refill);
  }

  function estimateResetSeconds(tokensFloat) {
    const deficit = 1 - tokensFloat;
    return deficit <= 0 ? 0 : Math.ceil(deficit / refillPerSecond);
  }

  async function createNewRecord(key, now) {
    await client.send(new PutItemCommand({
      TableName: tableName,
      Item: {
        id: { S: key },
        tokens: { N: String(Math.max(0, capacity - 1)) },
        lastRefillTs: { N: String(now) },
      },
      ConditionExpression: 'attribute_not_exists(id)',
    }));
    return { allowed: true, tokensAfter: Math.max(0, capacity - 1), lastRefillTs: now };
  }

  async function tryConsumeExisting(key, state, now) {
    const refilled = computeRefill(state.tokens, state.lastRefillTs, now);
    if (refilled < 1) {
      return {
        allowed: false,
        tokensFloat: refilled,
        resetSec: estimateResetSeconds(refilled),
        lastRefillTs: state.lastRefillTs,
      };
    }

    const newTokens = Math.max(0, refilled - 1);
    try {
      await client.send(new UpdateItemCommand({
        TableName: tableName,
        Key: { id: { S: key } },
        UpdateExpression: 'SET tokens = :newTokens, lastRefillTs = :now',
        ConditionExpression: 'tokens = :oldTokens AND lastRefillTs = :oldTs',
        ExpressionAttributeValues: {
          ':newTokens': { N: String(newTokens) },
          ':oldTokens': { N: String(state.tokens) },
          ':oldTs': { N: String(state.lastRefillTs) },
          ':now': { N: String(now) },
        },
      }));
      return { allowed: true, tokensAfter: newTokens, lastRefillTs: now };
    } catch (err) {
      if (err?.name === 'ConditionalCheckFailedException') {
        return { allowed: null, retryable: true };
      }
      throw err;
    }
  }

  return async function tokenBucket(req, res, next) {
    const rawId = String(identify(req) || 'anon');
    const idHash = crypto.createHash('sha1').update(rawId).digest('hex');
    const key = `${prefix}#${idHash}#c${capacity}#rps${refillPerSecond}`;

    let attempts = 0;
    while (attempts <= maxRetries) {
      attempts += 1;
      const now = nowMs();

      try {
        const state = await getState(key);
        if (!state) {
          try {
            const created = await createNewRecord(key, now);
            if (headerHints) {
              res.set('X-RateLimit-Policy', `token-bucket; cap=${capacity}; rps=${refillPerSecond}`);
              res.set('X-RateLimit-Remaining', String(Math.floor(created.tokensAfter)));
            }
            return next();
          } catch (err) {
            if (err?.name !== 'ConditionalCheckFailedException') throw err;
          }
        }

        const existing = state || await getState(key);
        const result = await tryConsumeExisting(key, existing, now);

        if (result.allowed === true) {
          if (headerHints) {
            res.set('X-RateLimit-Policy', `token-bucket; cap=${capacity}; rps=${refillPerSecond}`);
            res.set('X-RateLimit-Remaining', String(Math.floor(result.tokensAfter)));
          }
          return next();
        }

        if (result.retryable) {
          await new Promise((r) => setTimeout(r, Math.min(8, attempts) * 2));
          continue;
        }

        const retryAfter = result.resetSec ?? estimateResetSeconds(result.tokensFloat ?? 0);
        if (headerHints) {
          res.set('Retry-After', String(retryAfter));
          res.set('X-RateLimit-Policy', `token-bucket; cap=${capacity}; rps=${refillPerSecond}`);
          res.set('X-RateLimit-Remaining', '0');
        }
        return res.status(429).json({ error: 'Too Many Requests' });
      } catch (err) {
        return next(err);
      }
    }

    return res.status(503).json({ error: 'Rate limiter busy, try again' });
  };
}
