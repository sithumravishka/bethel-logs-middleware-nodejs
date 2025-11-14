// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var logger_pb = require('./logger_pb.js');

function serialize_logger_GetLogsRequest(arg) {
  if (!(arg instanceof logger_pb.GetLogsRequest)) {
    throw new Error('Expected argument of type logger.GetLogsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_logger_GetLogsRequest(buffer_arg) {
  return logger_pb.GetLogsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_logger_GetLogsResponse(arg) {
  if (!(arg instanceof logger_pb.GetLogsResponse)) {
    throw new Error('Expected argument of type logger.GetLogsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_logger_GetLogsResponse(buffer_arg) {
  return logger_pb.GetLogsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_logger_GetUserActivityRequest(arg) {
  if (!(arg instanceof logger_pb.GetUserActivityRequest)) {
    throw new Error('Expected argument of type logger.GetUserActivityRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_logger_GetUserActivityRequest(buffer_arg) {
  return logger_pb.GetUserActivityRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_logger_GetUserActivityResponse(arg) {
  if (!(arg instanceof logger_pb.GetUserActivityResponse)) {
    throw new Error('Expected argument of type logger.GetUserActivityResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_logger_GetUserActivityResponse(buffer_arg) {
  return logger_pb.GetUserActivityResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_logger_LogRequest(arg) {
  if (!(arg instanceof logger_pb.LogRequest)) {
    throw new Error('Expected argument of type logger.LogRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_logger_LogRequest(buffer_arg) {
  return logger_pb.LogRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_logger_LogResponse(arg) {
  if (!(arg instanceof logger_pb.LogResponse)) {
    throw new Error('Expected argument of type logger.LogResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_logger_LogResponse(buffer_arg) {
  return logger_pb.LogResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_logger_UserActivityLogRequest(arg) {
  if (!(arg instanceof logger_pb.UserActivityLogRequest)) {
    throw new Error('Expected argument of type logger.UserActivityLogRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_logger_UserActivityLogRequest(buffer_arg) {
  return logger_pb.UserActivityLogRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


// The Logger service definition.
var LoggerServiceService = exports.LoggerServiceService = {
  // Logs an event into the system.
logEvent: {
    path: '/logger.LoggerService/LogEvent',
    requestStream: false,
    responseStream: false,
    requestType: logger_pb.LogRequest,
    responseType: logger_pb.LogResponse,
    requestSerialize: serialize_logger_LogRequest,
    requestDeserialize: deserialize_logger_LogRequest,
    responseSerialize: serialize_logger_LogResponse,
    responseDeserialize: deserialize_logger_LogResponse,
  },
  // Retrieves logs with filtering and cursor-based pagination.
getLogs: {
    path: '/logger.LoggerService/GetLogs',
    requestStream: false,
    responseStream: false,
    requestType: logger_pb.GetLogsRequest,
    responseType: logger_pb.GetLogsResponse,
    requestSerialize: serialize_logger_GetLogsRequest,
    requestDeserialize: deserialize_logger_GetLogsRequest,
    responseSerialize: serialize_logger_GetLogsResponse,
    responseDeserialize: deserialize_logger_GetLogsResponse,
  },
  // Logs a user activity event into the system.
logUserActivity: {
    path: '/logger.LoggerService/LogUserActivity',
    requestStream: false,
    responseStream: false,
    requestType: logger_pb.UserActivityLogRequest,
    responseType: logger_pb.LogResponse,
    requestSerialize: serialize_logger_UserActivityLogRequest,
    requestDeserialize: deserialize_logger_UserActivityLogRequest,
    responseSerialize: serialize_logger_LogResponse,
    responseDeserialize: deserialize_logger_LogResponse,
  },
  // Retrieves user activity logs with filtering and page number-based pagination.
getUserActivityLogs: {
    path: '/logger.LoggerService/GetUserActivityLogs',
    requestStream: false,
    responseStream: false,
    requestType: logger_pb.GetUserActivityRequest,
    responseType: logger_pb.GetUserActivityResponse,
    requestSerialize: serialize_logger_GetUserActivityRequest,
    requestDeserialize: deserialize_logger_GetUserActivityRequest,
    responseSerialize: serialize_logger_GetUserActivityResponse,
    responseDeserialize: deserialize_logger_GetUserActivityResponse,
  },
};

exports.LoggerServiceClient = grpc.makeGenericClientConstructor(LoggerServiceService);
