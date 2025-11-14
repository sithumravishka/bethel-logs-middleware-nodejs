// gateway/src/middleware/traceIdMiddleware.js

export function traceIdMiddleware(req, res, next) {
    // Extract traceId from headers or generate a new one
    req.traceId = req.headers['x-trace-id'] || `trace-${Date.now()}`;
    next();
  }
  