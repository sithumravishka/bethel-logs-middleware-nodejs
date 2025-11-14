import { gql } from 'apollo-server';

export default gql`
  scalar Upload
  scalar Bytes
  scalar UInt
  scalar DateTime

  type UserRegistration {
    owner_did: String!
    claim: String!
    referralID: String!
  }

  type LogRecord {
    did: String
    traceId: String
    serviceName: String
    level: String
    message: String
    startTime: String
    endTime: String
    loggedAt: String
  }

  type TraceGroup {
    traceId: String
    logs: [LogRecord]
  }

  type GetLogsResponse {
    traceGroups: [TraceGroup]
    nextPagingState: String
  }

  """
  Single raw user-activity log row (one DB row).
  Used as nested records under a grouped log (traceId group).
  """
  type UserActivityLogRecord {
    did: String
    traceId: String
    level: String
    message: String
    duration: String
    loggedAt: String
  }

  """
  One logical log = one trace group.
  This corresponds to a single traceId, with representative fields
  and (optionally) the full list of underlying records.
  """
  type GetUserActivityLogsRecord {
    did: String
    traceId: String
    level: String
    message: String
    duration: String
    loggedAt: String
    records: [UserActivityLogRecord]  # all rows in this traceId group
  }

  type GetUserActivityLogsResponse {
    logs: [GetUserActivityLogsRecord]  # Each element = 1 trace group (1 logical log)
    pageNumber: Int                    # Current page number
    totalLogs: Int                     # Total number of trace groups available
  }

  type Query {
    getLogs(
      did: String
      pageSize: Int
      pagingState: String
    ): GetLogsResponse

    getUserActivityLogs(
      did: String
      level: String
      traceId: String
      fromLoggedAt: DateTime
      toLoggedAt: DateTime
      minDuration: UInt
      maxDuration: UInt
      message: String
      messageContains: String
      pageSize: Int
      pageNumber: Int
    ): GetUserActivityLogsResponse

    # NEW: only filter by level (no did required)
    getUserActivityLogsByLevel(
      level: String!
      pageSize: Int
      pageNumber: Int
      fromLoggedAt: DateTime
      toLoggedAt: DateTime
    ): GetUserActivityLogsResponse
  }

  type Mutation {
    createUserByDID(
      owner_did: String!
      referral_id: String
      mobile_device_type: String!
    ): UserRegistration
  }
`;
