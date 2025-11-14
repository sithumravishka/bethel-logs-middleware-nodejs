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

function serialize_logger_GetUserActivityByLevelRequest(arg) {
  if (!(arg instanceof logger_pb.GetUserActivityByLevelRequest)) {
    throw new Error('Expected argument of type logger.GetUserActivityByLevelRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_logger_GetUserActivityByLevelRequest(buffer_arg) {
  return logger_pb.GetUserActivityByLevelRequest.deserializeBinary(new Uint8Array(buffer_arg));
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


// The Logger service definition.
var LoggerServiceService = exports.LoggerServiceService = {
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
  getUserActivityLogsByLevel: {
    path: '/logger.LoggerService/GetUserActivityLogsByLevel',
    requestStream: false,
    responseStream: false,
    requestType: logger_pb.GetUserActivityByLevelRequest,
    responseType: logger_pb.GetUserActivityResponse,
    requestSerialize: serialize_logger_GetUserActivityByLevelRequest,
    requestDeserialize: deserialize_logger_GetUserActivityByLevelRequest,
    responseSerialize: serialize_logger_GetUserActivityResponse,
    responseDeserialize: deserialize_logger_GetUserActivityResponse,
  },
};

exports.LoggerServiceClient = grpc.makeGenericClientConstructor(LoggerServiceService);
