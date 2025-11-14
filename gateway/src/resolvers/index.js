// gateway/src/resolvers/index.js
import { ApolloError } from "apollo-server-errors";

// Import your logger functions
import { getLogs, getUserActivityLogs, getUserActivityLogsByLevel } from "../services/logger-service.js";

/**
 * Extracts or generates a traceId from the Apollo context.
 * @param {Object} context - Apollo Server context
 * @returns {string} traceId
 */
function getTraceIdFromContext(context) {
  // Extract traceId from headers or generate a new one
  return context.req?.headers["x-trace-id"] || `trace-${Date.now()}`;
}

export const Query = {
  /**
   * Resolver for getLogs with cursor-based pagination & filters.
   */
  getLogs: async (
    _,
    {
      did,
      pageSize = 10,
      pagingState,
      traceId,
      serviceName,
      level,
      fromLoggedAt,
      toLoggedAt,
    },
    context
  ) => {
    try {
      // Call gRPC GetLogs (matches updated proto)
      const logsResponse = await getLogs({
        did,
        pageSize,
        pagingState: pagingState || "",
        traceId,
        serviceName,
        level,
        fromLoggedAt,
        toLoggedAt,
      });

      return logsResponse;
    } catch (error) {
      console.error("Error fetching logs:", error.message || error);
      throw new ApolloError("Failed to fetch logs.", "LOG_FETCH_FAILED");
    }
  },

  /**
   * Resolver for getUserActivityLogs
   * Supports:
   * - page number–based pagination
   * - full filtering
   * - traceId grouping (each trace group = 1 log)
   */
getUserActivityLogs: async (
  _,
  {
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
  },
  context
) => {
  console.log("\n==============================");
  console.log("[GraphQL] Incoming getUserActivityLogs Request");
  console.log("==============================");
  console.log("GraphQL Args:");
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
  console.log("==============================\n");

  try {
    console.log("[GraphQL] Calling gRPC getUserActivityLogs with payload:");
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

    console.log(JSON.stringify(requestPayload, null, 2));

    const logsResponse = await getUserActivityLogs(requestPayload);

    console.log("\n------------------------------");
    console.log("[GraphQL] gRPC Response Summary");
    console.log("------------------------------");

    console.log("Pagination:");
    console.log(JSON.stringify({
      pageNumber: logsResponse.pageNumber,
      totalLogs: logsResponse.totalLogs,
      pageSize: pageSize,
    }, null, 2));

    console.log(`Logs Returned: ${logsResponse.logs.length}`);

    console.log("\nPreview First 3 Logs:");
    console.log(JSON.stringify(
      logsResponse.logs.slice(0, 3).map(l => ({
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

    console.log("------------------------------\n");

    return logsResponse;
  } catch (error) {
    console.error("\n==============================");
    console.error("[GraphQL] ERROR in getUserActivityLogs");
    console.error("==============================");
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    console.error("==============================\n");

    throw new ApolloError('Failed to fetch logs.', 'LOG_FETCH_FAILED');
  }
},
/**
   * NEW: Resolver for getUserActivityLogsByLevel
   * Uses ONLY level (plus optional date range + pagination).
   * No DID required.
   */
  getUserActivityLogsByLevel: async (
    _,
    {
      level,
      pageSize,
      pageNumber,
      fromLoggedAt,
      toLoggedAt,
    },
    context
  ) => {
    console.log("\n==============================");
    console.log("[GraphQL] Incoming getUserActivityLogsByLevel Request");
    console.log("==============================");
    console.log("GraphQL Args:");
    console.log(
      JSON.stringify(
        {
          level,
          pageSize,
          pageNumber,
          fromLoggedAt,
          toLoggedAt,
        },
        null,
        2
      )
    );
    console.log("==============================\n");

    try {
      const requestPayload = {
        level,
        pageSize,
        pageNumber,
        fromLoggedAt,
        toLoggedAt,
      };

      console.log(
        "[GraphQL] Calling gRPC getUserActivityLogsByLevel with payload:"
      );
      console.log(JSON.stringify(requestPayload, null, 2));

      const logsResponse = await getUserActivityLogsByLevel(requestPayload);

      console.log("\n------------------------------");
      console.log("[GraphQL] gRPC Response Summary (ByLevel)");
      console.log("------------------------------");

      console.log(
        "Pagination:",
        JSON.stringify(
          {
            pageNumber: logsResponse.pageNumber,
            totalLogs: logsResponse.totalLogs,
            pageSize: pageSize,
          },
          null,
          2
        )
      );

      console.log(`Logs Returned: ${logsResponse.logs.length}`);

      console.log("\nPreview First 3 Logs:");
      console.log(
        JSON.stringify(
          logsResponse.logs.slice(0, 3).map((l) => ({
            did: l.did,
            traceId: l.traceId,
            level: l.level,
            message: l.message,
            duration: l.duration,
            loggedAt: l.loggedAt,
            recordsCount: l.records ? l.records.length : undefined,
          })),
          null,
          2
        )
      );

      console.log("------------------------------\n");

      return logsResponse;
    } catch (error) {
      console.error("\n==============================");
      console.error("[GraphQL] ERROR in getUserActivityLogsByLevel");
      console.error("==============================");
      console.error("Error message:", error.message);
      console.error("Full error:", error);
      console.error("==============================\n");

      throw new ApolloError(
        "Failed to fetch logs by level.",
        "LOG_BY_LEVEL_FETCH_FAILED"
      );
    }
  },
};

export const Mutation = {
  /**
   * Mutation to create a user by DID.
   */
  createUserByDID: async (
    _,
    { owner_did, referral_id, mobile_device_type },
    context
  ) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
    try {
      const owner = await createUserByDID(
        owner_did,
        referral_id,
        mobile_device_type
      );

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return owner;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.error("Error creating owner:", error.message);
      throw new ApolloError(
        `Error creating owner: ${error.message}`,
        "CREATE_OWNER_FAILED"
      );
    }
  },
};

export default { Query, Mutation };
