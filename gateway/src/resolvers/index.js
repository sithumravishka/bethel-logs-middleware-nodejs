// gateway/src/resolvers/index.js

import { 
  getUserById, 
  createUserByDID, 
  addUserOnChain, 
  getUserSignInBethel, 
  callBack, 
  verifyProof, 
  getCreateIdentity, 
  getUserClaim, 
  generateProof, 
  isUserRegistered,
  initiateEmailVerification,
  confirmEmailVerification,
  getEmailVerificationStatusGrpc,
  resendEmailVerificationGrpc,
  isUserAddedOnChain,
  updateUserProfileService,
  getPlanPrice,
  getUserProfileService,
  SaveUserSeedService,
  RecoveryUserSeedService,
  isUserExistsOnChain,
  updateProfilePicService,
  getSignInStatus,
  getBecxPrice,
  sendSupportEmail,
  getSecretKeyService,
  checkSeedExistsService,
  accountDeleteService,
  accountDeleteStatusService,
  AdminRegistration,
  AdminLogin,
  GetAllUsersCount,
  GetAllUsersCountFromTo,
  getEmailVerificationStatsService,
  getProfilesCountService,
  getProfilePicturesCountService,
  getAccountBackupsCountService,
  getDistinctReferralCountService,
  getTotalPointsService,
  getAllPointsService,
  RetriewStorageUsage,
  RetiewCurrentStorage,
  GetRegisteredDevicesByType,
  GetDocumentUploadedUsers,
  GetUsersDocumentUploadedByType,
  GetShareFilesCount,
  GetFreeTrialActivatedUserDetails,
  RetriveAllocationsPerPackage,
  GetFreetrialStatus,
  RetriveAllocationFlagsPerDid,
  RetrieveAllAllocationFlags,
  GetTotalFilesOfTheSystem,
  TotalPaidPlanActivatedUsers,
  TotalPlanActivatedUsers,
  ActivePackageCount
} from '../services/user-service.js';
import { getClaimById, shareClaim, getDocClaim } from '../services/claim-service.js';
import { uploadFilesToChunk, getCIDS, uploadDocumentsToChunk, updateDocuments, updateFileToChunk }  from '../services/chunk-service.js';
import { ApolloError } from 'apollo-server-errors';

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import your logger functions
import { logEvent, getLogs, logUserActivity, getUserActivityLogs } from '../services/logger-service.js';

import { updatePaidSpaceService } from "../services/polygonService.js"

import { uploadFileBatchOnchainService, uploadFileBatchOnchainDocService, getBatchFileService, updateFileVerifyStatusService, getTotalFilesCountSizeService, getAllBatchesService, getBatchFileDetailsService, deleteFileService, shareFileService, updateSharedFileVerifyStatusService, getAllSharedFilesService, getSharedFileService, activatePackageService, getCurrentPackageService , checkPackageActivateService, getFreePlanStatusService, getUsedSpaceService, checkPackageExpireService, checkPackageSpaceService, getActivatePackageDetailsService, useSpaceService, activateFreePlanStatusService, downloadFile, downloadBatch, getFileNames, getFileCliam, getShareCliam, getFileCliamByHash, getShareCliamByHash, getDocFileService, isDocumentUploadedService, updateDocumentByTypeService, extendPackageGracePeriodService, getDownloadQR, downloadCallBack, getDownloadStatus, getInvoiceListGrpc, getUserNetworkUsageGrpc, checkFileVerifyStatusService, deleteDocService, CreateShareLink, getShareDownloadQR, getShareDownloadStatus, shareDownloadCallBack, ActivateFreeTrial, CreateFolder, GetAllFoldersByUser, GetAllFilesByUser, GetAllBatchesWithFilePaths,
  DeleteFoldersById,
  DeleteFileInFolder,
  RenameFolder,
  GetFileVersionList,
  GetOldFile,
  GetFileVersionListReverse
} from '../services/upload-service.js'; 
import { addFilePoints, addLoginPoints, createReferralRewardsProfile, getGetReferredDIDS, getReferralPoints, getTopReferrals, getTotalPoints, getUserReferralID, getReferrerRefidFromDid, updateReferrer } from '../services/point-service.js';

import { extname } from 'node:path';

const ALLOWED_EXTS = new Set(['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt']);
const ALLOWED_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

/**
 * Extracts or generates a traceId from the Apollo context.
 * @param {Object} context - Apollo Server context
 * @returns {string} traceId
 */
function getTraceIdFromContext(context) {
  // Extract traceId from headers or generate a new one
  return context.req?.headers['x-trace-id'] || `trace-${Date.now()}`;
}

// Helper function to validate the DID.
function validateDid(did) {
  // Define the expected length: "did:bethel:main:" (16 characters) + UUID (36 characters) = 52 characters.
  const expectedLength = 52;
  if (did.length !== expectedLength) {
    return {
      valid: false,
      error: `Invalid DID length. Expected length: ${expectedLength} characters.`
    };
  }
  // Validate the DID format using a regex.
  const didPattern = /^did:bethel:main:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!didPattern.test(did)) {
    return {
      valid: false,
      error: 'Invalid DID format. Expected format: did:bethel:main:<uuid>'
    };
  }
  return { valid: true };
}

// Helper function to check if the user already exists on the blockchain.
async function checkUserExists(did, traceId) {
  try {
    console.log(`[Gateway] [${traceId}] Checking if user with DID ${did} exists on chain...`);
    const checkResult = await isUserExistsOnChain(did, traceId);
    if (checkResult === true || (checkResult && checkResult.isRegistered === true)) {
      return true;
    }
  } catch (error) {
    console.error(`[Gateway] [${traceId}] Error checking blockchain status:`, error.message);
    // Optionally, you can log the error or rethrow it if necessary.
  }
  return false;
}

function getHeadersFromContext(context) {

  const headers = context?.headers || {};

  // Use provided trace ID header or generate a new one
  const traceId = headers['x-trace-id'] || `trace-${Date.now()}`;
  
  // Validate x-device header
  if (!headers['x-device'] || headers['x-device'].trim() === "") {
    throw new ApolloError("Missing x-device header", "MISSING_X_DEVICE");
  }
  
  // Validate x-forwarded-for header or fallback using req.ip
  if ((!headers['x-forwarded-for'] || headers['x-forwarded-for'].trim() === "") &&
      (!context.req?.ip || context.req.ip.trim() === "")) {
    throw new ApolloError("Missing x-forwarded-for header and IP address is not available", "MISSING_X_FORWARDED_FOR");
  }
  
  const device = headers['x-device'];
  const forwardedFor = headers['x-forwarded-for'];
  
  return { traceId, device, forwardedFor };
}


function getAccessToken(context) {
  const headers = context?.headers || {};

  const authHeader = headers['authorization'] || headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApolloError("Missing or invalid Authorization header", "MISSING_AUTH_HEADER");
  }

  const token = authHeader.split(' ')[1];
  return token;
}

export const Query = {
  /**
   * Resolver for getUserById.
   */
  getUserById: async (_, { id }, context) => {
    // 1) Grab or generate a traceId
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // 2) Log the start of the request
      await logEvent({
        did: 'did:didOfUser', // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getUserById with id=${id}`,
        startTime,
      });

      // 3) Call the user-service
      const user = await getUserById(id);

      // 4) Log the successful completion with an endTime
      const endTime = new Date().toISOString();
      await logEvent({
        did: 'did:didOfUser', // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getUserById for id=${id}`,
        startTime,
        endTime,
      });

      return user;

    } catch (error) {
      // 5) Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did: 'did:didOfUser', // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getUserById (id=${id}): ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error fetching user:', error.message);
      return null; // Or handle the error as needed
    }
  },

  /**
   * Resolver for getClaimById.
   */
  getClaimById: async (_, { id }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTimeObj = new Date();
    const startTime = startTimeObj.toISOString();

    try {
      await logEvent({
        did: 'did:didOfClaim', // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getClaimById with id=${id}`,
        startTime,
      });

      const claim = await getClaimById(id);

      const endTimeObj = new Date();
      const endTime = endTimeObj.toISOString();
      const duration = endTimeObj.getTime() - startTimeObj.getTime();

      await logEvent({
        did: 'did:didOfClaim', // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getClaimById for id=${id}`,
        startTime,
        endTime,
      });

      await logUserActivity({
        did: 'did:didOfClaim', // Replace with actual DID if available
        traceId,
        level: 'info',
        message: `Claim details fetched successfully.`,
        duration,
      });

      return claim;
    } catch (error) {
      const endTimeObj = new Date();
      const endTime = endTimeObj.toISOString();

      await logEvent({
        did: 'did:didOfClaim', // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getClaimById (id=${id}): ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error fetching claim:', error.message);
      throw new ApolloError('Failed to fetch claim.', 'CLAIM_FETCH_FAILED');
    }
  },

  /**
   * Query to get email verification status by DID.
   */
  getEmailVerificationStatus: async (_, { did }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTimeObj = new Date();
    const startTime = startTimeObj.toISOString();
  
    try {
      // Call user-service via gRPC to get email verification status
      const grpcResponse = await getEmailVerificationStatusGrpc(did, traceId);
  
      const endTimeObj = new Date();
      const endTime = endTimeObj.toISOString();
      const duration = endTimeObj.getTime() - startTimeObj.getTime();
  
      // Log the successful event
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Fetched email verification status for did=${did}`,
        startTime,
        endTime,
      });
  
      // Log user activity with a user-friendly message and computed duration
      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your email verification status has been retrieved successfully.`,
        duration,
      });
  
      return grpcResponse;
    } catch (error) {
      const endTimeObj = new Date();
      const endTime = endTimeObj.toISOString();
  
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getEmailVerificationStatus: ${error.message}`,
        startTime,
        endTime,
      });
  
      console.error('Error fetching email verification status:', error.message);
      throw new ApolloError('Failed to fetch email verification status.', 'EMAIL_VERIFICATION_STATUS_FAILED');
    }
  },  

  /**
   * Resolver for getLogs with cursor-based pagination.
   */
  getLogs: async (_, { did, pageSize = 10, pagingState }, context) => {
    try {
      // Fetch logs from logger-service
      const logsResponse = await getLogs({ did, pageSize, pagingState });

      return logsResponse;
    } catch (error) {
      console.error('Error fetching logs:', error.message);
      throw new ApolloError('Failed to fetch logs.', 'LOG_FETCH_FAILED');
    }
  },

  /**
   * Resolver for getLogs with page number-based pagination.
   */
  getUserActivityLogs: async (_, { did, pageSize, pageNumber }, context) => {
    try {
      // Fetch logs from logger-service using page number-based pagination
      const logsResponse = await getUserActivityLogs({ did, pageSize, pageNumber });
      return logsResponse;
    } catch (error) {
      console.error('Error fetching logs:', error.message);
      throw new ApolloError('Failed to fetch logs.', 'LOG_FETCH_FAILED');
    }
  },


  /**
   * Resolver for getUserSignInBethel.
   */
  getUserSignInBethel: async (_, __, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();
  
    try {
      await logEvent({
        did: 'did:didOfUser', // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getUserSignInBethel`,
        startTime,
      });
  
      console.log("Test 1");
  
      const signIn = await getUserSignInBethel();
  
      const endTime = new Date().toISOString();
      await logEvent({
        did: 'did:didOfUser',
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed sign-in response.`,
        startTime,
        endTime,
      });
  
      return signIn;
    } catch (error) {
      const endTime = new Date().toISOString();
      await logEvent({
        did: 'did:didOfUser',
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in creating sign-in: ${error.message}`,
        startTime,
        endTime,
      });
  
      console.error('Error sign-in:', error.message);
      throw new ApolloError(`Error sign-in owner: ${error.message}`, 'SIGNIN_OWNER_FAILED');
    }
  },

  /**
   * Resolver for getCreateIdentity.
   */
  getCreateIdentity: async (_, __, context) => {
    try {
      const identity = await getCreateIdentity();
      return identity;

    } catch (error) {
      console.error('Error sign-in:', error.message);
      throw new ApolloError(`Error creating identity: ${error.message}`, 'SIGNIN_OWNER_FAILED');
    }
  },

  /**
   * Resolver for getUserClaim.
   */
    getUserClaim: async (_, { did }, context) => {
      // 1) Grab or generate a traceId
      const traceId = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();
  
      try {
        // 2) Log the start of the request
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Starting get user claim=${did}`,
          startTime,
        });
  
        // 3) Call the user-service
        const claim = await getUserClaim(did);
  
        // 4) Log the successful completion with an endTime
        const endTime = new Date().toISOString();
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Completed get user claim for id=${did}`,
          startTime,
          endTime,
        });
  
        return claim;
        
      } catch (error) {
        // 5) Log the error scenario
        const endTime = new Date().toISOString();
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'error',
          message: `Error in getUserById (id=${did}): ${error.message}`,
          startTime,
          endTime,
        });
  
        console.error('Error fetching user:', error.message);
        return null; // Or handle the error as needed
      }
    },

  /**
   * Resolver for isUserRegistered.
   */
    isUserRegistered:  async (_, { DID }, context) => {
      // 1) Grab or generate a traceId
      const traceId = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();
  
      try {
        // 2) Log the start of the request
        await logEvent({
          did: DID, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Starting check is user registered=${DID}`,
          startTime,
        });
  
        // 3) Call the user-service
        const isRegistered = await isUserRegistered(DID);
  
        // 4) Log the successful completion with an endTime
        const endTime = new Date().toISOString();
        await logEvent({
          did: DID, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Completed checking user is registered =${DID}`,
          startTime,
          endTime,
        });
  
        return isRegistered;
        
      } catch (error) {
        // 5) Log the error scenario
        const endTime = new Date().toISOString();
        await logEvent({
          did: DID, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'error',
          message: `Error in checking is user registered (did=${DID}): ${error.message}`,
          startTime,
          endTime,
        });
  
        console.error('Error checking is user registered:', error.message);
        return null; // Or handle the error as needed
      }
    },

/**
 * Query for checking if a user is added on the chain.
 */
/**
 * Query for checking if a user is added on the chain.
 */
/**
 * Query for checking if a user is added on the chain.
 */
isUserAddedOnChain: async (_, { did }, context) => {
  if (!did) {
    throw new Error("DID is required for isUserAddedOnChain");
  }
  const traceId = getTraceIdFromContext(context);

  try {
    console.log(`[Gateway] [${traceId}] Resolver received:`, { did });

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Starting check IsUserAddedOnChain with did=${did}`,
      startTime: new Date().toISOString(),
    });

    const result = await isUserAddedOnChain(did, traceId);

    if (result && result.isRegistered === true) {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed check for isUserAddedOnChain with did=${did}`,
        endTime: new Date().toISOString(),
      });

      return { isRegistered: true };
    }

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `User not added on chain for did=${did}`,
      endTime: new Date().toISOString(),
    });

    return { isRegistered: false };
  } catch (error) {
    console.error(`[Gateway] [${traceId}] Error in isUserAddedOnChain:`, error.message);

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Error in isUserAddedOnChain: ${error.message}`,
      endTime: new Date().toISOString(),
    });

    throw new Error(error.message || "Failed to check if user is added on chain");
  }
},

isUserExistsOnChain: async (_, { did }, context) => {
  if (!did) {
    throw new Error("DID is required for isUserExistsOnChain");
  }
  const traceId = getTraceIdFromContext(context);

  try {
    console.log(`[Gateway] [${traceId}] Resolver received:`, { did });

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Starting check IsUserAddedOnChain with did=${did}`,
      startTime: new Date().toISOString(),
    });

    const result = await isUserExistsOnChain(did, traceId);

    if (result && result.isRegistered === true) {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed check for isUserExistsOnChain with did=${did}`,
        endTime: new Date().toISOString(),
      });

      return { isRegistered: true };
    }

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `User not Exists on chain for did=${did}`,
      endTime: new Date().toISOString(),
    });

    return { isRegistered: false };
  } catch (error) {
    console.error(`[Gateway] [${traceId}] Error in isUserExistsOnChain:`, error.message);

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Error in isUserExistsOnChain: ${error.message}`,
      endTime: new Date().toISOString(),
    });

    throw new Error(error.message || "Failed to check if user is Exists on chain");
  }
},


  /**
   * Resolver for getBatchFile.
   */
  getBatchFile: async (_, { input }, context) => {
    const { owner_did, batchhash, filehash } = input;
    const traceId = getTraceIdFromContext(context);
    const startTimeObj = new Date();
    const startTime = startTimeObj.toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getBatchFile with owner_did=${owner_did}, batchhash=${batchhash}, filehash=${filehash}`,
        startTime,
      });

      // Call the service layer
      const result = await getBatchFileService({ owner_did, batchhash, filehash, traceId });

      const endTimeObj = new Date();
      const endTime = endTimeObj.toISOString();
      const duration = endTimeObj.getTime() - startTimeObj.getTime();

      // Log the successful completion
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getBatchFile with index=${result.index}`,
        startTime,
        endTime,
      });

      // Log user activity with a user-friendly message and computed duration
      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'info',
        message: `Batch file details retrieved successfully.`,
        duration,
      });

      return { index: result.index };
    } catch (error) {
      const endTimeObj = new Date();
      const endTime = endTimeObj.toISOString();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getBatchFile: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error fetching batch file index:', error.message);
      throw new ApolloError('Failed to fetch batch file index.', 'BATCH_FILE_FETCH_FAILED');
    }
  },


/**
 * Resolver for getDocFile.
 */
    getDocFile: async (_, { input }, context) => {
      const { owner_did, doc_type, doc_id } = input;
      const traceId = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();
  
      try {
        // Log the start of the request
        await logEvent({
          did: owner_did,
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Starting getDocFile with owner_did=${owner_did}, doc_type=${doc_type}`,
          startTime,
        });
  
        // Call the service layer (gRPC or direct blockchain query)
        const result = await getDocFileService({ owner_did, doc_type, doc_id, traceId });
  
        // Log successful completion
        const endTime = new Date().toISOString();
        await logEvent({
          did: owner_did,
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Completed getDocFile with merkletree_index=${result.merkletree_index}`,
          startTime,
          endTime,
        });
  
        return {
          owner_did: result.owner_did,
          filehash: result.filehash,
          merkletree_index: result.merkletree_index,
          doc_type: result.doc_type,
          doc_name: result.doc_name,
          doc_id: result.doc_id,
        };
      } catch (error) {
        const endTime = new Date().toISOString();
        await logEvent({
          did: owner_did,
          traceId,
          serviceName: 'gateway',
          level: 'error',
          message: `Error in getDocFile: ${error.message}`,
          startTime,
          endTime,
        });
        console.error('Error fetching document file:', error.message);
        throw new ApolloError('Failed to fetch document file.', 'DOC_FILE_FETCH_FAILED');
      }
    },


  /**
   * Resolver for getTotalFilesCountSize query.
   */
  getTotalFilesCountSize: async (_, { input }, context) => {
    const { did } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getTotalFilesCountSize for did=${did}`,
        startTime,
      });

      // Input Validation: Ensure did is provided
      if (!did || typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID. Must be a non-empty string.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await getTotalFilesCountSizeService({
        did,
        traceId,
      });

      // Check response structure
      // if (!response.ok || !response.ok.ok) {
      //   throw new ApolloError('getTotalFilesCountSize response is incomplete.', 'GET_TOTAL_FILES_COUNT_SIZE_INCOMPLETE');
      // }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getTotalFilesCountSize for did=${did}`,
        startTime,
        endTime,
      });

      return response;
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getTotalFilesCountSize: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error retrieving total files count and size:', error.message);
      throw new ApolloError('Failed to retrieve total files count and size.', 'GET_TOTAL_FILES_COUNT_SIZE_FAILED');
    }
  },

  /**
   * Resolver for getAllBatches.
   */
  getAllBatches: async (_, { input }, context) => {
    const { owner_did } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getAllBatches for owner_did=${owner_did}`,
        startTime,
      });

      // Call the upload-service
      const result = await getAllBatchesService({ owner_did, traceId });

      // Log the successful completion
      const endTime = new Date().toISOString();
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getAllBatches for owner_did=${owner_did}`,
        startTime,
        endTime,
      });

      return { batches: result.batches };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getAllBatches for owner_did=${owner_did}: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error fetching all batches:', error.message);
      throw new ApolloError('Failed to fetch all batches.', 'GET_ALL_BATCHES_FAILED');
    }
  },

  /**
   * Resolver for getBatchFileDetails.
   */
  getBatchFileDetails: async (_, { input }, context) => {
    const { owner_did, batchhash, filehash } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getBatchFileDetails for owner_did=${owner_did}, batchhash=${batchhash}, filehash=${filehash}`,
        startTime,
      });

      // Call the upload-service via gRPC
      const response = await getBatchFileDetailsService({
        owner_did,
        batchhash,
        filehash,
        traceId,
      });

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getBatchFileDetails for owner_did=${owner_did}, batchhash=${batchhash}, filehash=${filehash}`,
        startTime,
        endTime,
      });

      return { 
        success: response.success, 
        message: response.message, 
        markletree_index: response.markletree_index 
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getBatchFileDetails: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error fetching batch file details:', error.message);
      throw new ApolloError('Failed to fetch batch file details.', 'BATCH_FILE_DETAILS_FETCH_FAILED');
    }
  },

  /**
   * Resolver for getAllSharedFiles query.
   */
  getAllSharedFiles: async (_, { input }, context) => {
    const { did } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getAllSharedFiles for did=${did}`,
        startTime,
      });

      // Call the upload-service via gRPC
      const response = await getAllSharedFilesService({
        did,
        traceId,
      });

      if (!response.shared_files || response.shared_files.length === 0) {
        throw new ApolloError('No shared files found for the provided DID.', 'SHARED_FILES_NOT_FOUND');
      }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getAllSharedFiles for did=${did}, retrieved ${response.shared_files.length} shared files`,
        startTime,
        endTime,
      });

      return { 
        shared_files: response.shared_files 
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getAllSharedFiles: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error retrieving all shared files:', error.message);
      throw new ApolloError('Failed to retrieve shared files.', 'GET_ALL_SHARED_FILES_FAILED');
    }
  },

   /**
   * Resolver for getSharedFile query.
   */
  getSharedFile: async (_, { input }, context) => {
    const { did, batchhash, filehash } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getSharedFile for did=${did}, batchhash=${batchhash}, filehash=${filehash}`,
        startTime,
      });

      // Call the upload-service via gRPC
      const response = await getSharedFileService({
        did,
        batchhash,
        filehash,
        traceId,
      });

      if (response.merkletree_index === undefined || !response.filename) {
        throw new ApolloError('Shared file details are incomplete.', 'SHARED_FILE_INCOMPLETE');
      }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getSharedFile for did=${did}, batchhash=${batchhash}, filehash=${filehash}`,
        startTime,
        endTime,
      });

      return { 
        merkletree_index: response.merkletree_index, 
        filename: response.filename 
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getSharedFile: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error retrieving shared file:', error.message);
      throw new ApolloError('Failed to retrieve shared file.', 'GET_SHARED_FILE_FAILED');
    }
  },

  /**
   * Resolver for getCurrentPackage query.
   */
  getCurrentPackage: async (_, { input }, context) => {
    const { did } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getCurrentPackage for did=${did}`,
        startTime,
      });

      // Call the upload-service via gRPC
      const response = await getCurrentPackageService({
        did,
        traceId,
      });

      if (response.isActive === undefined || response.packageName === undefined || response.durationMonths === undefined) {
        throw new ApolloError('Current package details are incomplete.', 'GET_CURRENT_PACKAGE_INCOMPLETE');
      }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getCurrentPackage for did=${did}`,
        startTime,
        endTime,
      });

      return { 
        isActive: response.isActive, 
        packageName: response.packageName,
        durationMonths: response.durationMonths,
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getCurrentPackage: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error retrieving current package:', error.message);
      throw new ApolloError('Failed to retrieve current package.', 'GET_CURRENT_PACKAGE_FAILED');
    }
  },

  /**
   * Resolver for getFreePlanStatus query.
   */
  getFreePlanStatus: async (_, { input }, context) => {
    const { did } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getFreePlanStatus for did=${did}`,
        startTime,
      });

      // Input Validation: Ensure DID is provided and valid
      if (typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await getFreePlanStatusService({
        did,
        traceId,
      });

      if (response.Ok === undefined) {
        throw new ApolloError('Free plan status is incomplete.', 'GET_FREE_PLAN_STATUS_INCOMPLETE');
      }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getFreePlanStatus for did=${did}`,
        startTime,
        endTime,
      });

      return { 
        Ok: response.Ok 
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getFreePlanStatus: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error retrieving free plan status:', error.message);

      // Handle specific ApolloErrors
      if (error instanceof ApolloError) {
        throw error;
      }

      // Throw a generic ApolloError for unknown issues
      throw new ApolloError('Failed to retrieve free plan status.', 'GET_FREE_PLAN_STATUS_FAILED');
    }
  },
  
    getCIDS: async (_, { index, did }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();
  
    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting get cids for user : ${did}`,
        startTime,
      });
  
      // Call the upload-service via gRPC
      const response = await getCIDS({ index, did });
  
      // Extract the `cidList` array from response
      const cidList = response.cidList || [];  // Ensure it's an array
  
      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed get cids for user ${did}`,
        startTime,
        endTime,
      });
  
      return { cidList }; // Return array properly formatted
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in get cids: ${error.message}`,
        startTime,
        endTime,
      });
  
      console.error('Error retrieving cids :', error.message);
      throw new ApolloError('Failed to retrieve cids.', 'GET_CIDS_FAILED');
    }
  },
 
  /**
   * Resolver for getUsedSpace query.
   */
  getUsedSpace: async (_, { input }, context) => {
    const { did } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getUsedSpace for did=${did}`,
        startTime,
      });

      // Input Validation: Ensure DID is provided and valid
      if (typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await getUsedSpaceService({
        did,
        traceId,
      });

      if (response.Ok === undefined) {
        throw new ApolloError('Used space information is incomplete.', 'GET_USED_SPACE_INCOMPLETE');
      }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getUsedSpace for did=${did}`,
        startTime,
        endTime,
      });

      return { 
        Ok: response.Ok 
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getUsedSpace: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error retrieving used space:', error.message);

      // Handle specific ApolloErrors
      if (error instanceof ApolloError) {
        throw error;
      }

      // Throw a generic ApolloError for unknown issues
      throw new ApolloError('Failed to retrieve used space.', 'GET_USED_SPACE_FAILED');
    }
  },

  /**
   * Resolver for checkPackageActivate query.
   */
  checkPackageActivate: async (_, { input }, context) => {
    const { did } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting checkPackageActivate for did=${did}`,
        startTime,
      });

      // Input Validation: Ensure DID is provided and valid
      if (typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await checkPackageActivateService({
        did,
        traceId,
      });

      if (response.Ok === undefined) {
        throw new ApolloError('Package activation status is incomplete.', 'CHECK_PACKAGE_ACTIVATE_INCOMPLETE');
      }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed checkPackageActivate for did=${did}`,
        startTime,
        endTime,
      });

      return { 
        Ok: response.Ok 
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in checkPackageActivate: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error checking package activation:', error.message);

      // Handle specific ApolloErrors
      if (error instanceof ApolloError) {
        throw error;
      }

      // Throw a generic ApolloError for unknown issues
      throw new ApolloError('Failed to check package activation.', 'CHECK_PACKAGE_ACTIVATE_FAILED');
    }
  },

  /**
   * Resolver for checkPackageExpire query.
   */
  checkPackageExpire: async (_, { input }, context) => {
    const { did } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting checkPackageExpire for did=${did}`,
        startTime,
      });

      // Input Validation: Ensure DID is provided and valid
      if (typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await checkPackageExpireService({
        did,
        traceId,
      });

      if (response.Ok === undefined) {
        throw new ApolloError('Package expiration status is incomplete.', 'CHECK_PACKAGE_EXPIRE_INCOMPLETE');
      }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed checkPackageExpire for did=${did}`,
        startTime,
        endTime,
      });

      return { 
        Ok: response.Ok 
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in checkPackageExpire: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error checking package expiration:', error.message);

      // Handle specific ApolloErrors
      if (error instanceof ApolloError) {
        throw error;
      }

      // Throw a generic ApolloError for unknown issues
      throw new ApolloError('Failed to check package expiration.', 'CHECK_PACKAGE_EXPIRE_FAILED');
    }
  },

  /**
   * Resolver for getActivatePackageDetails query.
   */
  getActivatePackageDetails: async (_, { input }, context) => {
    const { did } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getActivatePackageDetails for did=${did}`,
        startTime,
      });

      // Input Validation: Ensure DID is provided and valid
      if (typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await getActivatePackageDetailsService({
        did,
        traceId,
      });

      if (!response.Ok || typeof response.Ok !== 'object') {
        throw new ApolloError('Activate package details are incomplete.', 'GET_ACTIVATE_PACKAGE_DETAILS_INCOMPLETE');
      }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getActivatePackageDetails for did=${did}`,
        startTime,
        endTime,
      });

      return { 
        Ok: response.Ok 
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getActivatePackageDetails: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error retrieving activate package details:', error.message);

      // Handle specific ApolloErrors
      if (error instanceof ApolloError) {
        throw error;
      }

      // Throw a generic ApolloError for unknown issues
      throw new ApolloError('Failed to retrieve activate package details.', 'GET_ACTIVATE_PACKAGE_DETAILS_FAILED');
    }
  },

  /**
   * Resolver for checkPackageSpace query.
   */
  checkPackageSpace: async (_, { input }, context) => {
    const { did } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting checkPackageSpace for did=${did}`,
        startTime,
      });

      // Input Validation: Ensure DID is provided and valid
      if (typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await checkPackageSpaceService({
        did,
        traceId,
      });

      if (response.Ok === undefined) {
        throw new ApolloError('Used space information is incomplete.', 'CHECK_PACKAGE_SPACE_INCOMPLETE');
      }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed checkPackageSpace for did=${did}`,
        startTime,
        endTime,
      });

      return { 
        Ok: response.Ok 
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in checkPackageSpace: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error retrieving used space:', error.message);

      // Handle specific ApolloErrors
      if (error instanceof ApolloError) {
        throw error;
      }

      // Throw a generic ApolloError for unknown issues
      throw new ApolloError('Failed to retrieve used space.', 'CHECK_PACKAGE_SPACE_FAILED');
    }
  },

  getUserProfile: async (_, { did }, context) => {
    try {
      console.log("[GraphQL Resolver] getUserProfile called with DID:", did);
      const traceId = getTraceIdFromContext(context);
      const response = await getUserProfileService({ did, traceId });

      // Normalize each field so that null is replaced by a default value
      const user = {
        id: response.user.did || '',
        did: response.user.did || '',
        email: response.user.email || '',
        firstName: response.user.first_name || '',
        lastName: response.user.last_name || '',
        country: response.user.country || '',
        phoneNumber: response.user.phone_number || '',
        countryCode: response.user.country_code || '',
        description: response.user.description || '',
        companyName: response.user.company_name || '',
        companyRegNo: response.user.company_reg_no || '',
        postalCode: response.user.postal_code || '',
        city: response.user.city || '',
        state: response.user.state || '',
        address_1: response.user.address_1 || '',
        address_2: response.user.address_2 || '',
        accountType: response.user.account_type || '',
        profileImage: response.user.profile_image
        ? Buffer.from(response.user.profile_image).toString('base64')
        : '',
        createdAt: response.user.created_at || ''
      };



      return user;
    } catch (error) {
      console.error('[GraphQL Resolver] Error retrieving user profile:', error);
      throw new ApolloError('Failed to retrieve user profile.', 'GET_USER_PROFILE_FAILED');
    }
  },

  getFileNames: async (_, { did, batchHash }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getFileNames for batch hash =${batchHash}`,
        startTime,
      });

      // Input Validation: Ensure DID is provided and valid
      if (typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await getFileNames({
        did,
        batchHash,
        traceId
      });

      console.log("Response : ", response)

      // if (response.Ok === undefined) {
      //   throw new ApolloError('Get files name information is incomplete.', 'GET_FILES_NAME_INCOMPLETE');
      // }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed get file names for did=${did}`,
        startTime,
        endTime,
      });

      return response;

    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in checkPackageSpace: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error retrieving used space:', error.message);

      // Handle specific ApolloErrors
      if (error instanceof ApolloError) {
        throw error;
      }

      // Throw a generic ApolloError for unknown issues
      throw new ApolloError('Failed to retrieve used space.', 'CHECK_PACKAGE_SPACE_FAILED');
    }
  },

  getPlanPrice: async (_, { did, plan, month, traceId }, context) => {
    // const traceId = getTraceIdFromContext(context);
    // const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      // await logEvent({
      //   did,
      //   traceId,
      //   serviceName: 'gateway',
      //   level: 'info',
      //   message: `Starting get plan price for did = ${did}`,
      //   startTime,
      // });

      // Input Validation: Ensure DID is provided and valid
      if (typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await getPlanPrice({did, plan, month, traceId});

      console.log("Response : ", response)

      // // Log the successful operation
      // const endTime = new Date().toISOString();
      // await logEvent({
      //   did,
      //   traceId,
      //   serviceName: 'gateway',
      //   level: 'info',
      //   message: `Completed get plan price for did = ${did}`,
      //   startTime,
      //   endTime,
      // });

      return response;

    } catch (error) {
      // Log the error scenario
      // const endTime = new Date().toISOString();
      // await logEvent({
      //   did,
      //   traceId,
      //   serviceName: 'gateway',
      //   level: 'error',
      //   message: `Error in get plan price : ${error.message}`,
      //   startTime,
      //   endTime,
      // });

      console.error('Error retrieving get plan price :', error.message);

      // Handle specific ApolloErrors
      // if (error instanceof ApolloError) {
      //   throw error;
      // }

      // Throw a generic ApolloError for unknown issues
      throw new ApolloError('Failed to get plan price.', 'GET_PLAN_PRICE_FAILED');
    }
  },


  getFileCliam: async (_, { did }, context) => {
    // const traceId = getTraceIdFromContext(context);
    // const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      // await logEvent({
      //   did,
      //   traceId,
      //   serviceName: 'gateway',
      //   level: 'info',
      //   message: `Starting get plan price for did = ${did}`,
      //   startTime,
      // });

      // Input Validation: Ensure DID is provided and valid
      if (typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await getFileCliam({did});

      console.log("Response : ", response)

      // // Log the successful operation
      // const endTime = new Date().toISOString();
      // await logEvent({
      //   did,
      //   traceId,
      //   serviceName: 'gateway',
      //   level: 'info',
      //   message: `Completed get plan price for did = ${did}`,
      //   startTime,
      //   endTime,
      // });

      return response;

    } catch (error) {
      // Log the error scenario
      // const endTime = new Date().toISOString();
      // await logEvent({
      //   did,
      //   traceId,
      //   serviceName: 'gateway',
      //   level: 'error',
      //   message: `Error in get plan price : ${error.message}`,
      //   startTime,
      //   endTime,
      // });

      console.error('Error retrieving get claims :', error.message);

      // Handle specific ApolloErrors
      // if (error instanceof ApolloError) {
      //   throw error;
      // }

      // Throw a generic ApolloError for unknown issues
      throw new ApolloError('Failed to get file claims.', 'GET_PLAN_PRICE_FAILED');
    }
  },


  getShareCliam: async (_, { did, batchhash}, context) => {
    // const traceId = getTraceIdFromContext(context);
    // const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      // await logEvent({
      //   did,
      //   traceId,
      //   serviceName: 'gateway',
      //   level: 'info',
      //   message: `Starting get plan price for did = ${did}`,
      //   startTime,
      // });

      // Input Validation: Ensure DID is provided and valid
      if (typeof did !== 'string' || did.trim() === '') {
        throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
      }

      // Call the upload-service via gRPC
      const response = await getShareCliam({did, batchhash});

      console.log("Response : ", response)

      // // Log the successful operation
      // const endTime = new Date().toISOString();
      // await logEvent({
      //   did,
      //   traceId,
      //   serviceName: 'gateway',
      //   level: 'info',
      //   message: `Completed get plan price for did = ${did}`,
      //   startTime,
      //   endTime,
      // });

      return response;

    } catch (error) {
      // Log the error scenario
      // const endTime = new Date().toISOString();
      // await logEvent({
      //   did,
      //   traceId,
      //   serviceName: 'gateway',
      //   level: 'error',
      //   message: `Error in get plan price : ${error.message}`,
      //   startTime,
      //   endTime,
      // });

      console.error('Error retrieving get claims :', error.message);

      // Handle specific ApolloErrors
      // if (error instanceof ApolloError) {
      //   throw error;
      // }

      // Throw a generic ApolloError for unknown issues
      throw new ApolloError('Failed to get file claims.', 'GET_PLAN_PRICE_FAILED');
    }
  },


    /**
   * Resolver for getFileCliamByHash.
   */
    getFileCliamByHash: async (_, { did, batchhash }, context) => {
      // 1) Grab or generate a traceId
      const traceId = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();
  
      try {
        // 2) Log the start of the request
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Starting get user file=${did}`,
          startTime,
        });
  
        // 3) Call the user-service
        const claim = await getFileCliamByHash(did, batchhash);
  
        // 4) Log the successful completion with an endTime
        const endTime = new Date().toISOString();
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Completed get file claim for id=${did}`,
          startTime,
          endTime,
        });
  
        return claim;
        
      } catch (error) {
        // 5) Log the error scenario
        const endTime = new Date().toISOString();
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'error',
          message: `Error in get file claim for (id=${did}): ${error.message}`,
          startTime,
          endTime,
        });
  
        console.error('Error fetching file claim:', error.message);
        return null; // Or handle the error as needed
      }
    },

    getShareCliamByHash: async (_, { did, batchhash }, context) => {
      // 1) Grab or generate a traceId
      const traceId = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();
  
      try {
        // 2) Log the start of the request
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Starting get share claim =${did}`,
          startTime,
        });
  
        // 3) Call the user-service
        const claim = await getShareCliamByHash(did, batchhash);
  
        // 4) Log the successful completion with an endTime
        const endTime = new Date().toISOString();
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Completed get share claim for id=${did}`,
          startTime,
          endTime,
        });
  
        return claim;
        
      } catch (error) {
        // 5) Log the error scenario
        const endTime = new Date().toISOString();
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'error',
          message: `Error in get share claim for (id=${did}): ${error.message}`,
          startTime,
          endTime,
        });
  
        console.error('Error fetching share claim:', error.message);
        return null; // Or handle the error as needed
      }
    },

        /**
   * Resolver for getFileCliamByHash.
   */
      getDocClaim: async (_, { did, batchhash, doctype }, context) => {
      // 1) Grab or generate a traceId
      const traceId = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();
  
      try {
        // 2) Log the start of the request
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Starting get user doc claim=${did}`,
          startTime,
        });
  
        // 3) Call the user-service
        const claim = await getDocClaim(did, batchhash, doctype);
  
        // 4) Log the successful completion with an endTime
        const endTime = new Date().toISOString();
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Completed get doc claim for did=${did}`,
          startTime,
          endTime,
        });
  
        return claim;
        
      } catch (error) {
        // 5) Log the error scenario
        const endTime = new Date().toISOString();
        await logEvent({
          did: did, // Replace with actual DID if available
          traceId,
          serviceName: 'gateway',
          level: 'error',
          message: `Error in get doc claim for (did=${did}): ${error.message}`,
          startTime,
          endTime,
        });
  
        console.error('Error fetching doc claim:', error.message);
        return null; // Or handle the error as needed
      }
    },


  /**
       * GraphQL resolver to recover a user seed.
       *
       * @param {Object} _ - Unused parent value.
       * @param {Object} args - GraphQL arguments containing the seed.
       * @param {string} args.seed - The seed provided by the user.
       * @param {Object} context - GraphQL context (used to extract traceId).
       * @returns {Promise<Object>} The recovery response containing the user's DID.
       * @throws {Error} When the recovery process fails.
       */
  RecoveryUserSeed: async (_, { seed }, context) => {
    // Validate that the seed is provided.
    if (!seed) {
      const errorMessage = 'Seed is required for recovery.';
      console.error(`[GraphQL] ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Extract traceId from context for logging and tracing.
    const traceId = getTraceIdFromContext(context);
    console.info(`[GraphQL] Received RecoveryUserSeed request. TraceId: ${traceId}`);

    try {
      // Call the gRPC service to recover the user seed.
      const recoveryResponse = await RecoveryUserSeedService(seed, traceId);
      return recoveryResponse;
    } catch (error) {
      console.error('[GraphQL] Error in RecoveryUserSeed resolver:', error.message);
      // Propagate error to the client; alternatively, return null if desired.
      throw new Error('Failed to recover user seed.');
    }
  },

  /**
   * Resolver for activateFreePlanStatus mutation.
   */
  IsDocumentUploaded: async (_, { input }, context) => {
    const { did, doc_type, doc_id } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting activateFreePlanStatus for did=${did}, doc_type=${doc_type}`,
        startTime,
      });


      // Call the upload-service via gRPC
      const response = await isDocumentUploadedService({
        did,
        doc_type,
        doc_id,
        traceId,
      });

      if (response.success === undefined || response.message === undefined) {
        throw new ApolloError('ActivateFreePlanStatus response is incomplete.', 'ACTIVATE_FREE_PLAN_STATUS_INCOMPLETE');
      }

      // Log the successful operation
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed activateFreePlanStatus for did=${did}, status=${doc_type}`,
        startTime,
        endTime,
      });

      return { 
        success: response.success, 
        message: response.message 
      };
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in activateFreePlanStatus: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error activating free plan status:', error.message);
      throw new ApolloError('Failed to activate free plan status.', 'ACTIVATE_FREE_PLAN_STATUS_FAILED');
    }
  },

  getSignInStatus: async (_, { sessionId }, context) => {
    try {
      console.log("[GraphQL Resolver] get sign-in status called with sessionID:", sessionId);
      const traceId = getTraceIdFromContext(context);
      const response = await getSignInStatus({ sessionId, traceId });
    
      return response;
    } catch (error) {
      console.error('[GraphQL Resolver] Error get sign-in status :', error);
      throw new ApolloError('Failed to get sign-in status.', 'GET_SIGNIN_STATUS_FAILED', { http: { status: 404 } });
    }
  },
  getTotalPoints: async (_, { did }, context) => {

    const startTime = new Date().toISOString();
    const traceId = getTraceIdFromContext(context);

    try {

      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting get total points for did=${did}`,
        startTime,
      });

      console.log("did", did);
      const response = await getTotalPoints({ did, traceId });
  
    
      return response;
    } catch (error) {

            // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in get total points: ${error.message}`,
        startTime,
        endTime,
      });
      console.error('Error get total points:', error.message);
      throw new ApolloError('Failed to get total points.', 'GET_TOTAL_POINTS_FAILED');
    }
  },

  getDownloadQR: async (_, { did, batchHash }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();
  
    try {
      await logEvent({
        did: did, // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getDownloadQR`,
        startTime,
      });
  
      console.log("Test 1");
  
      const signIn = await getDownloadQR({did, batchHash});
  
      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed download qr response.`,
        startTime,
        endTime,
      });
  
      return signIn;
    } catch (error) {

      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in creating download QR: ${error.message}`,
        startTime,
        endTime,
      });
  
      console.error('Error Download QR:', error.message);
      throw new ApolloError(`Error Download QR : ${error.message}`, 'DOWNLOAD_QR_FAILED');
    }
  },
  getDownloadStatus: async (_, { sessionId }, context) => {
    try {
      console.log("[GraphQL Resolver] get download status called with sessionID:", sessionId);
      const traceId = getTraceIdFromContext(context);
      const response = await getDownloadStatus({ sessionId, traceId });
    
      return response;
    } catch (error) {
      console.error('[GraphQL Resolver] Error get download status :', error);
      throw new ApolloError('Failed to get download status.', 'GET_DOWNLOAD_STATUS_FAILED', { http: { status: 404 } });
    }
  },
  getGetReferredDIDS: async (_, { did }, context) => {

    const startTime = new Date().toISOString();
    const traceId = getTraceIdFromContext(context);

    try {

      // Log the start of the request
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting Get Referred DIDS for did=${did}`,
        startTime,
      });

      console.log("did", did);
      const response = await getGetReferredDIDS({ did, traceId });
  
    
      return response;
    } catch (error) {

            // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in Get Referred DIDS: ${error.message}`,
        startTime,
        endTime,
      });
      console.error('Error Get Referred DIDS:', error.message);
      throw new ApolloError('Failed to Get Referred DIDS.', 'GET_REFERRED_DIDS_FAILED');
    }
  },


  /**
   * getInvoiceList Query
   * 
   * This calls the upload-service's GetInvoiceList RPC via gRPC
   * and returns the data in the format the GraphQL schema expects.
   */
  getInvoiceList: async (_, { did }, context) => {
    // If you have a function that extracts traceId from context:
    const traceId = context.req?.headers['x-trace-id'] || `trace-${Date.now()}`;

    try {
      // Call the gRPC method
      const invoiceList = await getInvoiceListGrpc({ did, traceId });
      // invoiceList is an array of invoice objects.

      // Return them in the shape { Ok: invoiceList }
      return {
        Ok: invoiceList,
      };
    } catch (error) {
      console.error(`[Gateway] [${traceId}] Error fetching invoice list:`, error);
      throw new Error(error.message || 'Failed to fetch invoice list');

     }
  },
    
  getReferralPoints: async (_, { referralId }, context) => {

    const startTime = new Date().toISOString();
    const traceId = getTraceIdFromContext(context);

    try {

      const response = await getReferralPoints({ referralId, traceId });
  
    
      return response;
    } catch (error) {

      console.error('ErrorGet Referral Points:', error.message);
      throw new ApolloError('Failed to Get Referral Points', 'GET_REFERRAL_POINTS_FAILED');
    }
  },
    
  getUserReferralID: async (_, { did }, context) => {

    const startTime = new Date().toISOString();
    const traceId = getTraceIdFromContext(context);

    try {

      const response = await getUserReferralID({ did, traceId });
      return response;

    } catch (error) {

      console.error('Error Get Referral ID:', error.message);

      throw new ApolloError('Failed to Get Referral ID', 'GET_USER_REFERRAL_FAILED');
    }
  },
    
  getBecxPrice: async (_, __, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();
  
    try {
      await logEvent({
        did: 'did:didOfUser', // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting get Becx Price`,
        startTime,
      });
  
      console.log("Test 1");
  
      const price = await getBecxPrice();
  
      const endTime = new Date().toISOString();
      await logEvent({
        did: 'did:didOfUser',
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed get Becx Price response.`,
        startTime,
        endTime,
      });
  
      return price;
    } catch (error) {
      const endTime = new Date().toISOString();
      await logEvent({
        did: 'did:didOfUser',
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in creating sign-in: ${error.message}`,
        startTime,
        endTime,
      });
  
      console.error('Error sign-in:', error.message);
      throw new ApolloError(`Error sign-in owner: ${error.message}`, 'SIGNIN_OWNER_FAILED');
    }
  },

  getUserNetworkUsage: async (_, { did }, context) => {
    // Extract or generate a traceId from the request headers or fallback
    const traceId = context.req?.headers['x-trace-id'] || `trace-${Date.now()}`;
  
    try {
      // Call your gRPC client method to fetch network usage data
      const usageData = await getUserNetworkUsageGrpc({ did, traceId });
      // usageData should already be in the shape { daily_usage: [...] }
      // If your gRPC returns something else, adjust accordingly
  
      return usageData; // e.g., { daily_usage: [...] }
    } catch (error) {
      console.error(`[Gateway] [${traceId}] Error fetching user network usage:`, error);
      throw new Error(error.message || 'Failed to fetch user network usage');
    }
  },  
  
  CheckFileVerifyStatus: async (_, { did, batch_hash }, context) => {
    const traceId = context.req?.headers['x-trace-id'] || `trace-${Date.now()}`;
    try {
      const verified = await checkFileVerifyStatusService({ did, batch_hash, traceId });

      console.log("verifiedverifiedverifiedverifiedverified", verified)
      return verified; // returns true or false
    } catch (error) {
      console.error(`[GraphQL] [${traceId}] Error in checkFileVerifyStatus:`, error);
      throw new ApolloError(error.message || 'Failed to check file verify status', 'CHECK_FILE_VERIFY_STATUS_FAILED');
    }
  }, 
  
  getTopReferrals: async (_, __, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();
  
    try {
      await logEvent({
        did: 'did:didOfUser', // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting get top referrals`,
        startTime,
      });
  
      console.log("Test 1");
  
      const topReferrals = await getTopReferrals({traceId});
  
      const endTime = new Date().toISOString();
      await logEvent({
        did: 'did:didOfUser',
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed getting top referrals.`,
        startTime,
        endTime,
      });
  
      return topReferrals;
    } catch (error) {
      const endTime = new Date().toISOString();
      await logEvent({
        did: 'did:didOfUser',
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in getting top referrals: ${error.message}`,
        startTime,
        endTime,
      });
  
      console.error('getting top referrals:', error.message);
      throw new ApolloError(`getting top referrals: ${error.message}`, 'GETTING_TOP_REFERRALS_FAILED');
    }
  },

  getReferrerRefidFromDid: async (_, { did }, context) => {

    const startTime = new Date().toISOString();
    const traceId = getTraceIdFromContext(context);

    try {

      const response = await getReferrerRefidFromDid({ did, traceId });
      return response;

    } catch (error) {

      console.error('Error Get Referral ID:', error.message);

      throw new ApolloError('Failed to Get Referral ID', 'GET_REFERRER_REFERRAL_ID_FAILED');
    }
  },

/**
 * Resolver for GetSecretKey mutation.
 */
GetSecretKey: async (_, { input }, context) => {
  const { did } = input;
  const traceId = getTraceIdFromContext(context);
  const startTime = new Date().toISOString();

  console.log("Starting GetSecretKey for did:", did);

  try {
    // Optionally log the start of the request here
    // await logEvent({ did, traceId, serviceName: 'gateway', level: 'info', message: `Starting GetSecretKey for did=${did}`, startTime });

    // Call the upload-service via gRPC
    const response = await getSecretKeyService(did, traceId);

    if (response.secret_key === undefined) {
      throw new ApolloError(
        'GetSecretKey response is incomplete.',
        'GET_SECRET_KEY_INCOMPLETE'
      );
    }

    // Optionally log the successful operation here
    const endTime = new Date().toISOString();
    // await logEvent({ did, traceId, serviceName: 'gateway', level: 'info', message: `Completed GetSecretKey for did=${did}`, startTime, endTime });

    return { 
      secret_key: response.secret_key 
    };
  } catch (error) {
    const endTime = new Date().toISOString();
    // Optionally log the error scenario here
    // await logEvent({ did, traceId, serviceName: 'gateway', level: 'error', message: `Error in GetSecretKey: ${error.message}`, startTime, endTime });

    console.error('Error getting secret key:', error.message);
    throw new ApolloError(
      'Failed to get secret key.',
      'GET_SECRET_KEY_FAILED'
    );
  }
},

CheckSeedExists: async (_, { input }, context) => {

    const { did } = input;
  if (!did) {
    throw new Error("DID is required for checkSeedExists");
  }
  const traceId = getTraceIdFromContext(context);

  try {
    console.log(`[Gateway] [${traceId}] Resolver received:`, { did });

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Starting check checkSeedExists with did=${did}`,
      startTime: new Date().toISOString(),
    });

    const result = await checkSeedExistsService(did, traceId);

    if (result && result === true) {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed check for checkSeedExists with did=${did}`,
        endTime: new Date().toISOString(),
      });

      return {
        success: result,
        message: "User seed already exists"
      };
    }

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Seed not Exists on chain for did=${did}`,
      endTime: new Date().toISOString(),
    });

    return {
        success: result,
        message: "User seed not exists in backup service"
    };
  } catch (error) {
    console.error(`[Gateway] [${traceId}] Error in checkSeedExists:`, error.message);

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Error in isUserExistsOnChain: ${error.message}`,
      endTime: new Date().toISOString(),
    });

    throw new Error(error.message || "Failed to check if user is Exists on chain");
  }
},

AccountDeleteStatus: async (_, { input }, context) => {
  const { did } = input;
  if (!did) {
    // Updated error message to reflect the account delete status check
    throw new Error("DID is required for account delete status check");
  }
  const traceId = getTraceIdFromContext(context);

  try {
    console.log(`[Gateway] [${traceId}] Resolver received account delete status check request:`, { did });

    // Log the start of the account delete status check
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Starting account delete status check for did=${did}`,
      startTime: new Date().toISOString(),
    });

    // Call the service that checks the account delete status
    const result = await accountDeleteStatusService(did, traceId);

    if (result === true) {
      // Log successful completion of the check
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed account delete status check for did=${did}`,
        endTime: new Date().toISOString(),
      });

      return {
        success: result,
        message: "User Account is active"
      };
    }

    // Log the case where the seed is not found
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Account delete status check: Seed not exists on chain for did=${did}`,
      endTime: new Date().toISOString(),
    });

    return {
      success: result,
      message: "User Account not exist"
    };
  } catch (error) {
    console.error(`[Gateway] [${traceId}] Error in account delete status check:`, error.message);

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Error in account delete status check: ${error.message}`,
      endTime: new Date().toISOString(),
    });

    throw new Error(error.message || "Failed to check account delete status");
  }
},
  getShareDownloadQR: async (_, { did, batchHash }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();
  
    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting getDownloadQR`,
        startTime,
      });
  
      console.log("Test 1");
  
      const signIn = await getShareDownloadQR({did, batchHash});
  
      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed download qr response.`,
        startTime,
        endTime,
      });
  
      return signIn;
    } catch (error) {

      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in creating download QR: ${error.message}`,
        startTime,
        endTime,
      });
  
      console.error('Error Download QR:', error.message);
      throw new ApolloError(`Error Download QR : ${error.message}`, 'DOWNLOAD_QR_FAILED');
    }
  },
  getShareDownloadStatus: async (_, { sessionId }, context) => {
    try {
      console.log("[GraphQL Resolver] get download status called with sessionID:", sessionId);
      const traceId = getTraceIdFromContext(context);
      const response = await getShareDownloadStatus({ sessionId, traceId });
    
      return response;
    } catch (error) {
      console.error('[GraphQL Resolver] Error get download status :', error);
      throw new ApolloError('Failed to get download status.', 'GET_DOWNLOAD_STATUS_FAILED', { http: { status: 404 } });
    }
  },


  /**
 * Resolver to fetch counts of users with verified vs. unverified emails.
 */
getEmailVerificationStats: async (_, __, context) => {
  // 1) Extract or generate a traceId for logging
  const traceId = getTraceIdFromContext(context);
  const startTime = new Date().toISOString();

  try {
    // 2) Log the start of the operation
    await logEvent({
      did: 'system',               // you can replace 'system' with a real DID if available
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Starting getEmailVerificationStats`,
      startTime,
    });

    // 3) Call the service layer to fetch counts
    //    (Assumes you have added getEmailVerificationStatsService in ../services/user-service.js)
    const { verifiedCount, unverifiedCount } = await getEmailVerificationStatsService(traceId);

    // 4) Log successful completion
    const endTime = new Date().toISOString();
    await logEvent({
      did: 'system',
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Completed getEmailVerificationStats: verified=${verifiedCount}, unverified=${unverifiedCount}`,
      startTime,
      endTime,
    });
    await logUserActivity({
      did: 'system',
      traceId,
      level: 'info',
      message: `Fetched email verification stats successfully.`,
      duration: new Date().getTime() - new Date(startTime).getTime(),
    });

    // 5) Return the counts in the shape defined by your GraphQL schema
    return { verifiedCount, unverifiedCount };

  } catch (error) {
    // 6) Log error scenario
    const endTime = new Date().toISOString();
    await logEvent({
      did: 'system',
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Error in getEmailVerificationStats: ${error.message}`,
      startTime,
      endTime,
    });

    console.error('Error fetching email verification stats:', error.message);
    throw new ApolloError('Failed to fetch email verification statistics.', 'EMAIL_STATS_FETCH_FAILED');
  }
},

getProfilesCount: async (_, __, context) => {
      const traceId   = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();
      try {
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'info', message: 'Starting getProfilesCount', startTime
        });

        const count = await getProfilesCountService(traceId);

        const endTime = new Date().toISOString();
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'info', message: `Completed getProfilesCount: count=${count}`,
          startTime, endTime
        });

        return count;
      } catch (error) {
        const endTime = new Date().toISOString();
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'error', message: `Error in getProfilesCount: ${error.message}`,
          startTime, endTime
        });

        throw new ApolloError('Failed to fetch profiles count.', 'COUNT_FETCH_FAILED');
      }
    },

    getProfilePicturesCount: async (_, __, context) => {
      const traceId   = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();
      try {
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'info', message: 'Starting getProfilePicturesCount', startTime
        });

        const count = await getProfilePicturesCountService(traceId);

        const endTime = new Date().toISOString();
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'info',
          message: `Completed getProfilePicturesCount: count=${count}`,
          startTime, endTime
        });

        return count;
      } catch (error) {
        const endTime = new Date().toISOString();
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'error',
          message: `Error in getProfilePicturesCount: ${error.message}`,
          startTime, endTime
        });
        console.error('Error fetching profile-pictures count:', error);
        throw new ApolloError(
          'Failed to fetch profile-pictures count.',
          'PICTURE_COUNT_FETCH_FAILED'
        );
      }
    },

    getAccountBackupsCount: async (_, __, context) => {
      const traceId   = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();
      try {
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'info', message: 'Starting getAccountBackupsCount', startTime
        });

        const count = await getAccountBackupsCountService(traceId);

        const endTime = new Date().toISOString();
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'info',
          message: `Completed getAccountBackupsCount: count=${count}`,
          startTime, endTime
        });

        return count;
      } catch (error) {
        const endTime = new Date().toISOString();
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'error',
          message: `Error in getAccountBackupsCount: ${error.message}`,
          startTime, endTime
        });
        console.error('Error fetching account backups count:', error);
        throw new ApolloError(
          'Failed to fetch account backups count.',
          'BACKUPS_COUNT_FETCH_FAILED'
        );
      }
    },

    distinctReferralCount: async (_, __, context) => {
      const traceId   = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();

      try {
        await logEvent({
          did: 'system',
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: 'Starting distinctReferralCount',
          startTime
        });

        const count = await getDistinctReferralCountService(traceId);

        const endTime = new Date().toISOString();
        await logEvent({
          did: 'system',
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Completed distinctReferralCount: count=${count}`,
          startTime,
          endTime
        });

        return count;
      } catch (error) {
        const endTime = new Date().toISOString();
        await logEvent({
          did: 'system',
          traceId,
          serviceName: 'gateway',
          level: 'error',
          message: `Error in distinctReferralCount: ${error.message}`,
          startTime,
          endTime
        });
        console.error('Error fetching distinct referral count:', error);
        throw new ApolloError(
          'Failed to fetch distinct referral count.',
          'DISTINCT_REFERRAL_COUNT_FAILED'
        );
      }
    },

    getTotalPointsAdmin: async (_, { did }, context) => {
      const traceId   = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();

      try {
        await logEvent({
          did:'system', traceId, serviceName:'gateway',
          level:'info', message:`Starting getTotalPoints for DID=${did}`, startTime
        });

        // This now returns { totalPoints: number }
        const result = await getTotalPointsService(did, traceId);

        const endTime = new Date().toISOString();
        await logEvent({
          did:'system', traceId, serviceName:'gateway',
          level:'info',
          message:`Completed getTotalPoints for DID=${did}: total=${result.totalPoints}`,
          startTime, endTime
        });

        return result;
      } catch (error) {
        const endTime = new Date().toISOString();
        await logEvent({
          did:'system', traceId, serviceName:'gateway',
          level:'error',
          message:`Error in getTotalPoints: ${error.message}`, startTime, endTime
        });
        console.error('Error fetching total points:', error);
        throw new ApolloError(
          'Failed to fetch total points.',
          'TOTAL_POINTS_FETCH_FAILED'
        );
      }
    },

    getAllPoints: async (_, __, context) => {
      const traceId   = getTraceIdFromContext(context);
      const startTime = new Date().toISOString();

      try {
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'info', message: 'Starting getAllPoints', startTime
        });

        const entries = await getAllPointsService(traceId);

        const endTime = new Date().toISOString();
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'info',
          message: `Completed getAllPoints: ${entries.length} entries`,
          startTime, endTime
        });

        return entries;
      } catch (error) {
        const endTime = new Date().toISOString();
        await logEvent({
          did: 'system', traceId, serviceName: 'gateway',
          level: 'error',
          message: `Error in getAllPoints: ${error.message}`,
          startTime, endTime
        });
        console.error('Error fetching all DID points:', error);
        throw new ApolloError(
          'Failed to fetch total points for all DIDs.',
          'ALL_POINTS_FETCH_FAILED'
        );
      }
    },

  RetriewStorageUsage: async (_, { did }, context) => {

    const startTime = new Date().toISOString();

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    console.log("Did ", did)
    console.log("Token ", token)
    console.log("device, forwardedFor ", device, forwardedFor)
  
    try {
      await logEvent({
        did: did, // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting retriew storage usage`,
        startTime,
      });
  
      const storage = await RetriewStorageUsage(did, token, device, forwardedFor);
  
      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed retriew storage usage.`,
        startTime,
        endTime,
      });
  
      console.log("Storage ::: ", storage.OkOuter)
      return storage;
    } catch (error) {

      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in retriew storage usage: ${error.message}`,
        startTime,
        endTime,
      });
  
      console.error('Error in retriew storage usage:', error.message);
      throw new ApolloError(`Error in retriew storage usage: ${error.message}`, 'RETRIEW_USAGE_FAILED');
    }
  },
  RetiewCurrentStorage: async (_, { did }, context) => {

    const startTime = new Date().toISOString();

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    console.log("Did ", did)
    console.log("Token ", token)
    console.log("device, forwardedFor ", device, forwardedFor)
  
    try {
      await logEvent({
        did: did, // Replace with actual DID if available
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting retrieve current storage usage`,
        startTime,
      });
  
      const storage = await RetiewCurrentStorage(did, token, device, forwardedFor);
  
      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed retrieve current storage usage.`,
        startTime,
        endTime,
      });
  
      console.log("Storage ::: ", storage)
      
      return storage;
    } catch (error) {

      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in retrieve current storage usage: ${error.message}`,
        startTime,
        endTime,
      });
  
      console.error('Error in retrieve current storage usage:', error.message);
      throw new ApolloError(`Error in retrieve current storage usage: ${error.message}`, 'RETRIEW_CURRENT_USAGE_FAILED');
    }
  },
  GetRegisteredDevicesByType: async (_, { did, devicetype }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    const startTime = new Date();

    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Request to get registered devices from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const count = await GetRegisteredDevicesByType(did, devicetype, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Devices count geting completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Get devices count successfully executed.`,
        duration,
      });

      return count;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in get devices count : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error get devices count.`,
        duration,
      });

      console.error('Error get devices count:', error.message);
      throw new ApolloError(`Error get devices count: ${error.message}`, 'GET_DEVICE_COUNT_FAILED');
    }
  },
  GetDocumentUploadedUsers: async (_, { did }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    const startTime = new Date();

    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Request to get document uploaded users from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const count = await GetDocumentUploadedUsers(did, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Document uploaded users count getting completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Get document uploaded users count successfully executed.`,
        duration,
      });

      return count;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in get document uploaded users : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in get document uploaded users.`,
        duration,
      });

      console.error('Error get document uploaded users:', error.message);
      throw new ApolloError(`Error get document uploaded users: ${error.message}`, 'GET_DOCUMENT_UPLOADED_USERS_COUNT_FAILED');
    }
  },
  GetUsersDocumentUploadedByType: async (_, { did, doctype }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    const startTime = new Date();

    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Request to get document uploaded users by type from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const count = await GetUsersDocumentUploadedByType(did, doctype, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Document uploaded users by type count getting completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Get document uploaded users count by type successfully executed.`,
        duration,
      });

      return count;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in get document uploaded users by type: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in get document uploaded users by type.`,
        duration,
      });

      console.error('Error get document uploaded users by type:', error.message);
      throw new ApolloError(`Error get document uploaded users by type: ${error.message}`, 'GET_DOCUMENT_UPLOADED_USERS_COUNT_BY_TYPE_FAILED');
    }
  },
  GetShareFilesCount: async (_, { did, sharetype }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    const startTime = new Date();

    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Request to get shared file count by type from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const count = await GetShareFilesCount(did, sharetype, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Get shared file count completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Get shared file count successfully executed.`,
        duration,
      });

      return count;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in get shared file count: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in get shared file count.`,
        duration,
      });

      console.error('Error get shared file count:', error.message);
      throw new ApolloError(`Error get shared file count:: ${error.message}`, 'GET_SHARED_FILE_COUNT_FAILED');
    }
  },
  GetFreeTrialActivatedUserDetails: async (_, { did }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    const startTime = new Date();

    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Request to get free trial activation details from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const count = await GetFreeTrialActivatedUserDetails(did, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Get free trial activation details completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Get free trial activation details successfully executed.`,
        duration,
      });

      return count;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in get free trial activation details: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in get free trial activation details.`,
        duration,
      });

      console.error('Error in get free trial activation details:', error.message);
      throw new ApolloError(`Error in get free trial activation details: ${error.message}`, 'GET__FAILED');
    }
  },
  RetriveAllocationsPerPackage: async (_, { did, packagetype }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    const startTime = new Date();

    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Request to get free trial activation details from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const count = await RetriveAllocationsPerPackage(did, packagetype, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Get free trial activation details completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Get free trial activation details successfully executed.`,
        duration,
      });

      return count;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in get free trial activation details: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in get free trial activation details.`,
        duration,
      });

      console.error('Error in get free trial activation details:', error.message);
      throw new ApolloError(`Error in get free trial activation details: ${error.message}`, 'GET__FAILED');
    }
  }, 
  GetFreetrialStatus: async (_, { did }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();
  
    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting Get Freetrial Status`,
        startTime,
      });
  
      console.log("Test 1");
  
      const status = await GetFreetrialStatus(did);
  
      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed Get Freetrial Status.`,
        startTime,
        endTime,
      });
  
      return status;
    } catch (error) {

      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in Get Free trial Status: ${error.message}`,
        startTime,
        endTime,
      });
  
      console.error('Error Get Free trial Status:', error.message);
      throw new ApolloError(`Error Get Free trial Status : ${error.message}`, 'GET_FREE_TRIAL_STATUS_FAILED');
    }
  },
  RetriveAllocationFlagsPerDid:async (_, { admindid, userdid }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    const startTime = new Date();

    try {
      await logEvent({
        did: admindid,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrive Allocation Flags Per Did from DID = ${admindid}`,
        startTime: startTime.toISOString(),
      });

      const grpcResp = await RetriveAllocationFlagsPerDid(admindid, userdid, token, device, forwardedFor);

      // if the RPC itself errored, you can optionally throw or return here…
      if (grpcResp.status !== "Success") {
        return {
          status:  grpcResp.status,
          message: grpcResp.message,
          data:    []   // fail‐fast with empty payload
        };
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: admindid,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrive Allocation Flags Per Did completed DID = ${admindid}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: admindid,
        traceId,
        level: 'info',
        message: `Retrive Allocation Flags Per Did successfully executed.`,
        duration,
      });

      return grpcResp;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: admindid,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in Retrive Allocation Flags Per Did details: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: admindid,
        traceId,
        level: 'error',
        message: `There was an error in Retrive Allocation Flags Per Did details.`,
        duration,
      });

      console.error('Error in Retrive Allocation Flags Per Did:', error.message);
      throw new ApolloError(`Error in Retrive Allocation Flags Per Did: ${error.message}`, 'RETRIEV_USER_PACKAGE_ALLOCATIONS');
    }
  },
  RetrieveAllAllocationFlags:async (_, { did }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve All Allocation Flags from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const grpcResp = await RetrieveAllAllocationFlags(did, token, device, forwardedFor);

      // if the RPC itself errored, you can optionally throw or return here…
      if (grpcResp.status !== "Success") {
        return {
          status:  grpcResp.status,
          message: grpcResp.message,
          data:    []   // fail‐fast with empty payload
        };
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve All Allocation Flags completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Retrieve All Allocation Flags successfully executed.`,
        duration,
      });

      return grpcResp;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: admindid,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in Retrieve All Allocation Flags details: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in Retrieve All Allocation Flags details.`,
        duration,
      });

      console.error('Error in Retrieve All Allocation Flags:', error.message);
      throw new ApolloError(`Error in Retrieve All Allocation Flags: ${error.message}`, 'RETRIEVE_ALL_ALLOCATION_FLAGS');
    }
  },
  GetAllFoldersByUser:async (_, { did }, context) => {

    const traceId = getTraceIdFromContext(context);

    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve All user folders from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const grpcResp = await GetAllFoldersByUser(did);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve All user folders completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Retrieve All user folders successfully executed.`,
        duration,
      });

      return grpcResp;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in Retrieve All user folders: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in Retrieve All user folders.`,
        duration,
      });

      console.error('Error in Retrieve All user folders:', error.message);
      throw new ApolloError(`Error in Retrieve All user folders: ${error.message}`, 'RETRIEVE_ALL_USER_FOLDERS_FAILED');
    }
  },
  GetAllFilesByUser:async (_, { did }, context) => {

    const traceId = getTraceIdFromContext(context);

    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve All user files from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const grpcResp = await GetAllFilesByUser(did);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve All user files completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Retrieve All user files successfully executed.`,
        duration,
      });

      return grpcResp;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in Retrieve All user files: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in Retrieve All user files.`,
        duration,
      });

      console.error('Error in Retrieve All user files:', error.message);
      throw new ApolloError(`Error in Retrieve All user files: ${error.message}`, 'RETRIEVE_ALL_USER_FILES_FAILED');
    }
  },
  // GetFullyMappedUserFolders:async (_, { did }, context) => {

  //   const traceId = getTraceIdFromContext(context);

  //   const startTime = new Date();

  //   try {
  //     await logEvent({
  //       did,
  //       traceId,
  //       serviceName: 'gateway',
  //       level: 'info',
  //       message: `Retrieve All user files and folders from DID = ${did}`,
  //       startTime: startTime.toISOString(),
  //     });

  //     const grpcResp = await GetAllFilesByUser(did);

  //     const endTime = new Date();
  //     const duration = endTime.getTime() - startTime.getTime();

  //     await logEvent({
  //       did,
  //       traceId,
  //       serviceName: 'gateway',
  //       level: 'info',
  //       message: `Retrieve All user files and folders completed DID = ${did}`,
  //       startTime: startTime.toISOString(),
  //       endTime: endTime.toISOString(),
  //     });

  //     await logUserActivity({
  //       did: did,
  //       traceId,
  //       level: 'info',
  //       message: `Retrieve All user files and folders successfully executed.`,
  //       duration,
  //     });

  //     return grpcResp;
  //   } catch (error) {
  //     const endTime = new Date();
  //     const duration = endTime.getTime() - startTime.getTime();

  //     await logEvent({
  //       did: did,
  //       traceId,
  //       serviceName: 'gateway',
  //       level: 'error',
  //       message: `Error in Retrieve All user files and folders: ${error.message}`,
  //       startTime: startTime.toISOString(),
  //       endTime: endTime.toISOString(),
  //     });

  //     await logUserActivity({
  //       did: did,
  //       traceId,
  //       level: 'error',
  //       message: `There was an error in Retrieve All user files and folders.`,
  //       duration,
  //     });

  //     console.error('Error in Retrieve All user files:', error.message);
  //     throw new ApolloError(`Error in Retrieve All user files and folders: ${error.message}`, 'RETRIEVE_ALL_USER_FILES_AND_FOLDERS_FAILED');
  //   }
  // }
  GetAllBatchesWithFilePaths: async (_, { did }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date().toISOString();

    try {
      // Log the start of the request
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting get all batches with file path for owner_did=${did}`,
        startTime,
      });

      // Call the upload-service
      const result = await GetAllBatchesWithFilePaths(did);

      // Log the successful completion
      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed get all batches with file path for owner_did=${did}`,
        startTime,
        endTime,
      });

      return result;
    } catch (error) {
      // Log the error scenario
      const endTime = new Date().toISOString();
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in get all batches with file path for owner_did=${did}: ${error.message}`,
        startTime,
        endTime,
      });

      console.error('Error in get all batches with file path:', error.message);
      throw new ApolloError('Failed to fetch all batches with file path.', 'GET_ALL_BATCHES_WITH_FILE_PATH_FAILED');
    }
  },
  GetTotalFilesOfTheSystem :async (_, { did }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    console.log("Did : ", did)

    const token = getAccessToken(context);

    console.log("Token : ", token);

    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve All Allocation Flags from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const grpcResp = await GetTotalFilesOfTheSystem(did, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve All files of the system completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Retrieve All files of the system successfully executed.`,
        duration,
      });

      return grpcResp;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in Retrieve All files of the system : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in Retrieve All files of the system.`,
        duration,
      });

      console.error('Error in Retrieve All files of the system:', error.message);
      throw new ApolloError(`Error in Retrieve All files of the system: ${error.message}`, 'RETRIEVE_ALL_FILES_IN_SYSTEM');
    }
  },
  TotalPlanActivatedUsers :async (_, { did }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    console.log("Did : ", did)

    const token = getAccessToken(context);

    console.log("Token : ", token);

    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve all free plans DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const grpcResp = await TotalPlanActivatedUsers(did, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve all free plans completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Retrieve all free plans successfully executed.`,
        duration,
      });

      return grpcResp;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in Retrieve all free plans : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in Retrieve all free plans.`,
        duration,
      });

      console.error('Error in Retrieve all free plans :', error.message);
      throw new ApolloError(`Error in Retrieve all free plans : ${error.message}`, 'RETRIEVE_ALL_FREE_PLANS');
    }
  },
  TotalPaidPlanActivatedUsers :async (_, { did }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    console.log("Did : ", did)

    const token = getAccessToken(context);

    console.log("Token : ", token);

    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve all paid plans DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const grpcResp = await TotalPaidPlanActivatedUsers(did, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve all paid plans completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Retrieve all paid plans successfully executed.`,
        duration,
      });

      return grpcResp;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in Retrieve all paid plans : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in Retrieve all paid plans.`,
        duration,
      });

      console.error('Error in Retrieve all paid plans :', error.message);
      throw new ApolloError(`Error in Retrieve all paid plans : ${error.message}`, 'RETRIEVE_ALL_PAID_PLANS');
    }
  },
  ActivePackageCount :async (_, { did }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    console.log("Did : ", did)

    const token = getAccessToken(context);

    console.log("Token : ", token);

    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve all active plans DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const grpcResp = await ActivePackageCount(did, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Retrieve all active plans completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Retrieve all active plans successfully executed.`,
        duration,
      });

      return grpcResp;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in Retrieve all active plans : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error in Retrieve all active plans.`,
        duration,
      });

      console.error('Error in Retrieve all active plans :', error.message);
      throw new ApolloError(`Error in Retrieve all active plans : ${error.message}`, 'RETRIEVE_ALL_ACTIVE_PLANS');
    }
  },
  
/**
 * Resolver for getFileVersionList query.
 */
GetFileVersionList: async (_parent, args, context) => {
  const { did, filehash } = args;
  const traceId = getTraceIdFromContext(context);
  const startTime = new Date().toISOString();

  console.log(`[Gateway] [${traceId}] [START] getFileVersionList resolver called`);
  console.log(`[Gateway] [${traceId}] [DEBUG] Args:`, args);

  try {
    console.log(`[Gateway] [${traceId}] [STEP] Logging start event...`);
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Starting getFileVersionList for did=${did}, filehash=${filehash}`,
      startTime
    });
    console.log(`[Gateway] [${traceId}] [DEBUG] Start event logged`);

    // validation
    console.log(`[Gateway] [${traceId}] [STEP] Validating DID...`);
    if (typeof did !== 'string' || did.trim() === '') {
      console.warn(`[Gateway] [${traceId}] Invalid DID:`, did);
      throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
    }
    console.log(`[Gateway] [${traceId}] [DEBUG] DID validation passed: ${did}`);

    // call service (note: service expects snake_case keys)
    console.log(`[Gateway] [${traceId}] [STEP] Calling downstream GetFileVersionList service...`);
    const response = await GetFileVersionList({
      did,
      file_hash: filehash ?? undefined,
      traceId,
    });
    console.log(`[Gateway] [${traceId}] [DEBUG] Service response:`, response);

    if (!response?.success) {
      console.warn(`[Gateway] [${traceId}] Service returned failure`, response);
      throw new ApolloError(
        response?.message || 'Failed to fetch file version list.',
        'GET_FILE_VERSION_LIST_FAILED'
      );
    }

    // ---- Normalize & validate upstream versions BEFORE returning ----
    console.log(`[Gateway] [${traceId}] [STEP] Normalizing upstream versions...`);
    const toNum = (x) => {
      if (x == null) return NaN;
      if (typeof x === 'number') return x;
      if (typeof x === 'string') {
        const n = Number(x);
        return Number.isNaN(n) ? NaN : n;
      }
      if (typeof x.toNumber === 'function') return x.toNumber();
      if (typeof x.toJSON === 'function') {
        const j = x.toJSON();
        return typeof j === 'number' ? j : Number(j);
      }
      return Number(x);
    };

    // use the GraphQL arg as a fallback when upstream leaves file_hash blank
    const argFilehashFallback =
      (typeof filehash === 'string' ? filehash.trim() : '') || undefined;

    const versionsArray = Array.isArray(response.versions) ? response.versions : [];
    console.log(`[Gateway] [${traceId}] [DEBUG] Raw upstream versions array:`, versionsArray);

    const normalized = versionsArray.map((e, i) => {
      const version = toNum(e.version ?? e.versionNo ?? e.ver ?? e.v);
      const upstreamHash = (e.filehash && e.filehash.trim()) 
  || (e.file_hash && e.file_hash.trim()) 
  || (e.hash && e.hash.trim()) 
  || '';

      const filehashNorm = upstreamHash || argFilehashFallback || ''; // fill from args if empty

      if (!Number.isFinite(version) || filehashNorm === '') {
        console.warn(
          `[Gateway] [${traceId}] Dropping invalid version entry #${i}`,
          { versionRaw: e.version, upstreamHash, argFilehashFallback }
        );
        return null;
      }

      console.log(`[Gateway] [${traceId}] [DEBUG] Normalized entry #${i}:`, { version, filehash: filehashNorm });
      return { version, filehash: filehashNorm };
    }).filter(Boolean);

    const validEntries = normalized;
    console.log(`[Gateway] [${traceId}] [DEBUG] Valid entries after normalization:`, validEntries);

    // If we can't salvage anything, return success with empty list (don’t throw)
    if (validEntries.length === 0) {
      console.warn(`[Gateway] [${traceId}] No usable version entries after normalization`);
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'warn',
        message: 'Upstream returned no usable version entries; returning empty list.',
        startTime,
        endTime: new Date().toISOString()
      });
      console.log(`[Gateway] [${traceId}] [END] Returning empty version list`);

      return {
        success: true,
        message: response.message || 'No version entries available for this file.',
        versions: []
      };
    }

    console.log(`[Gateway] [${traceId}] [STEP] Logging success event...`);
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Completed getFileVersionList for did=${did}`,
      startTime,
      endTime: new Date().toISOString()
    });
    console.log(`[Gateway] [${traceId}] [DEBUG] Success event logged`);

    console.log(`[Gateway] [${traceId}] [END] Returning validated entries`);
    // Return validated, schema-shaped data
    return {
      success: true,
      message: response.message,
      versions: validEntries
    };
  } catch (error) {
    console.error(`[Gateway] [${traceId}] Error in getFileVersionList:`, error);
    console.error(`[Gateway] [${traceId}] [DEBUG] Error stack:`, error.stack);

    console.log(`[Gateway] [${traceId}] [STEP] Logging error event...`);
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Error in getFileVersionList: ${error.message}`,
      startTime,
      endTime: new Date().toISOString()
    });
    console.log(`[Gateway] [${traceId}] [DEBUG] Error event logged`);

    if (error instanceof ApolloError) {
      console.log(`[Gateway] [${traceId}] [END] Rethrowing ApolloError`);
      throw error;
    }

    console.log(`[Gateway] [${traceId}] [END] Throwing wrapped ApolloError`);
    throw new ApolloError(
      error.message || 'Failed to get file version list.',
      'GET_FILE_VERSION_LIST_FAILED'
    );
  }
},


/**
 * Resolver for getOldFile query (no arg validation here).
 * */
GetOldFile: async (_parent, args, context) => {
  const { did, filehash } = args;
  let { version } = args; // may arrive as number or string (depending on schema/client)
  const traceId = getTraceIdFromContext(context);
  const startTime = new Date().toISOString();

  // ---- Local sanitize/validate version (clean message, no backslashes) ----
  const makeUserInputError = (msg, field = 'version') =>
    new ApolloError(msg, 'BAD_USER_INPUT', { field });

  const isIntegerString = (s) => typeof s === 'string' && /^[0-9]+$/.test(s);
  const toIntOrNaN = (x) => {
    if (typeof x === 'number') return Number.isFinite(x) ? x : NaN;
    if (isIntegerString(x)) return Number(x);
    return NaN;
  };

  // Coerce if it's a numeric string; otherwise validate strictly
  if (typeof version === 'string') {
    const n = toIntOrNaN(version);
    if (!Number.isInteger(n) || n < 1) {
      throw makeUserInputError('Invalid version: must be an integer (e.g., 1, 2, 3).');
    }
    version = n;
  } else if (!(typeof version === 'number' && Number.isInteger(version) && version >= 1)) {
    // If it’s not a number/int>=1, fail early with a clean message
    throw makeUserInputError('Invalid version: must be an integer (e.g., 1, 2, 3).');
  }

  try {
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Starting getOldFile for did=${did}, filehash=${filehash}, version=${version}`,
      startTime
    });

    // Call service (expects snake_case)
    const response = await GetOldFile({
      did,
      file_hash: filehash,
      version,   // already sanitized
      traceId,
    });

    if (!response?.success) {
      throw new ApolloError(
        response?.message || 'Failed to fetch old file.',
        'GET_OLD_FILE_FAILED'
      );
    }

    // ---- Normalize upstream index BEFORE returning ----
    const toNum = (x) => {
      if (x == null) return NaN;
      if (typeof x === 'number') return x;
      if (typeof x === 'string') {
        const n = Number(x);
        return Number.isNaN(n) ? NaN : n;
      }
      if (typeof x.toNumber === 'function') return x.toNumber();
      if (typeof x.toJSON === 'function') {
        const j = x.toJSON();
        return typeof j === 'number' ? j : Number(j);
      }
      return Number(x);
    };

    const idxRaw =
      response.index ??
      response.merkletree_index ??
      response.merkle_index ??
      (response.data && (response.data.index ?? response.data.merkletree_index));

    const index = toNum(idxRaw);

    if (!Number.isFinite(index)) {
      throw new ApolloError(
        'Received malformed old file index from upstream. Please try again later.',
        'GET_OLD_FILE_FAILED'
      );
    }

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Completed getOldFile for did=${did}`,
      startTime,
      endTime: new Date().toISOString()
    });

    return {
      success: true,
      message: response.message || 'Old file retrieved successfully',
      index
    };
  } catch (error) {
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Error in getOldFile: ${error.message}`,
      startTime,
      endTime: new Date().toISOString()
    });

    if (error instanceof ApolloError) throw error;

    throw new ApolloError(
      error.message || 'Failed to get old file.',
      'GET_OLD_FILE_FAILED'
    );
  }
},
/**
 * Resolver for getFileVersionList query.
 */
GetFileVersionListReverse: async (_parent, args, context) => {
  const { did, filehash } = args;
  const traceId = getTraceIdFromContext(context);
  const startTime = new Date().toISOString();

  console.log(`[Gateway] [${traceId}] [START] getFileVersionList resolver called`);
  console.log(`[Gateway] [${traceId}] [DEBUG] Args:`, args);

  try {
    console.log(`[Gateway] [${traceId}] [STEP] Logging start event...`);
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Starting getFileVersionList for did=${did}, filehash=${filehash}`,
      startTime
    });
    console.log(`[Gateway] [${traceId}] [DEBUG] Start event logged`);

    // validation
    console.log(`[Gateway] [${traceId}] [STEP] Validating DID...`);
    if (typeof did !== 'string' || did.trim() === '') {
      console.warn(`[Gateway] [${traceId}] Invalid DID:`, did);
      throw new ApolloError('Invalid DID provided.', 'INVALID_DID');
    }
    console.log(`[Gateway] [${traceId}] [DEBUG] DID validation passed: ${did}`);

    // call service (note: service expects snake_case keys)
    console.log(`[Gateway] [${traceId}] [STEP] Calling downstream GetFileVersionList service...`);
    const response = await GetFileVersionListReverse({
      did,
      file_hash: filehash ?? undefined,
      traceId,
    });
    console.log(`[Gateway] [${traceId}] [DEBUG] Service response:`, response);

    if (!response?.success) {
      console.warn(`[Gateway] [${traceId}] Service returned failure`, response);
      throw new ApolloError(
        response?.message || 'Failed to fetch file version list.',
        'GET_FILE_VERSION_LIST_FAILED'
      );
    }

    // ---- Normalize & validate upstream versions BEFORE returning ----
    console.log(`[Gateway] [${traceId}] [STEP] Normalizing upstream versions...`);
    const toNum = (x) => {
      if (x == null) return NaN;
      if (typeof x === 'number') return x;
      if (typeof x === 'string') {
        const n = Number(x);
        return Number.isNaN(n) ? NaN : n;
      }
      if (typeof x.toNumber === 'function') return x.toNumber();
      if (typeof x.toJSON === 'function') {
        const j = x.toJSON();
        return typeof j === 'number' ? j : Number(j);
      }
      return Number(x);
    };

    // use the GraphQL arg as a fallback when upstream leaves file_hash blank
    const argFilehashFallback =
      (typeof filehash === 'string' ? filehash.trim() : '') || undefined;

    const versionsArray = Array.isArray(response.versions) ? response.versions : [];
    console.log(`[Gateway] [${traceId}] [DEBUG] Raw upstream versions array:`, versionsArray);

    const normalized = versionsArray.map((e, i) => {
      const version = toNum(e.version ?? e.versionNo ?? e.ver ?? e.v);
      const upstreamHash = (e.filehash && e.filehash.trim()) 
  || (e.file_hash && e.file_hash.trim()) 
  || (e.hash && e.hash.trim()) 
  || '';

      const filehashNorm = upstreamHash || argFilehashFallback || ''; // fill from args if empty

      if (!Number.isFinite(version) || filehashNorm === '') {
        console.warn(
          `[Gateway] [${traceId}] Dropping invalid version entry #${i}`,
          { versionRaw: e.version, upstreamHash, argFilehashFallback }
        );
        return null;
      }

      console.log(`[Gateway] [${traceId}] [DEBUG] Normalized entry #${i}:`, { version, filehash: filehashNorm });
      return { version, filehash: filehashNorm };
    }).filter(Boolean);

    const validEntries = normalized;
    console.log(`[Gateway] [${traceId}] [DEBUG] Valid entries after normalization:`, validEntries);

    // If we can't salvage anything, return success with empty list (don’t throw)
    if (validEntries.length === 0) {
      console.warn(`[Gateway] [${traceId}] No usable version entries after normalization`);
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'warn',
        message: 'Upstream returned no usable version entries; returning empty list.',
        startTime,
        endTime: new Date().toISOString()
      });
      console.log(`[Gateway] [${traceId}] [END] Returning empty version list`);

      return {
        success: true,
        message: response.message || 'No version entries available for this file.',
        versions: []
      };
    }

    console.log(`[Gateway] [${traceId}] [STEP] Logging success event...`);
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Completed getFileVersionList for did=${did}`,
      startTime,
      endTime: new Date().toISOString()
    });
    console.log(`[Gateway] [${traceId}] [DEBUG] Success event logged`);

    console.log(`[Gateway] [${traceId}] [END] Returning validated entries`);
    // Return validated, schema-shaped data
    return {
      success: true,
      message: response.message,
      versions: validEntries
    };
  } catch (error) {
    console.error(`[Gateway] [${traceId}] Error in getFileVersionList:`, error);
    console.error(`[Gateway] [${traceId}] [DEBUG] Error stack:`, error.stack);

    console.log(`[Gateway] [${traceId}] [STEP] Logging error event...`);
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Error in getFileVersionList: ${error.message}`,
      startTime,
      endTime: new Date().toISOString()
    });
    console.log(`[Gateway] [${traceId}] [DEBUG] Error event logged`);

    if (error instanceof ApolloError) {
      console.log(`[Gateway] [${traceId}] [END] Rethrowing ApolloError`);
      throw error;
    }

    console.log(`[Gateway] [${traceId}] [END] Throwing wrapped ApolloError`);
    throw new ApolloError(
      error.message || 'Failed to get file version list.',
      'GET_FILE_VERSION_LIST_FAILED'
    );
  }
}
};


export const Mutation = {
  /**
   * Mutation to create a user by DID.
   */
  createUserByDID: async (_, { owner_did, referral_id, mobile_device_type }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
    try {
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting createUserByDID for owner_did=${owner_did}`,
        startTime: startTime.toISOString(),
      });

      const owner = await createUserByDID(owner_did, referral_id, mobile_device_type);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed createUserByDID for owner_did=${owner_did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'info',
        message: `Your account has been created successfully.`,
        duration,
      });

      return owner;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in createUserByDID: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'error',
        message: `There was an error creating your account.`,
        duration,
      });

      console.error('Error creating owner:', error.message);
      throw new ApolloError(`Error creating owner: ${error.message}`, 'CREATE_OWNER_FAILED');
    }
  },

  /**
   * Mutation to create a user claim.
   */
  createUserClaim: async (_, { owner_did }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
    try {
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting createUserClaim for owner_did=${owner_did}`,
        startTime: startTime.toISOString(),
      });

      const claim = await createUserClaim(owner_did);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed createUserClaim for owner_did=${owner_did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'info',
        message: `Your claim has been created successfully.`,
        duration,
      });

      return claim;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in createUserClaim: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'error',
        message: `There was an error creating your claim.`,
        duration,
      });

      console.error('Error creating owner claim:', error.message);
      throw new ApolloError(`Error creating owner claim: ${error.message}`, 'CREATE_OWNER_CLAIM_FAILED');
    }
  },

  /**
   * Mutation to add a user on the chain.
   */
  addChainUser: async (_, { did }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
  
    // Validate the DID.
    const validationResult = validateDid(did);
    if (!validationResult.valid) {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: validationResult.error,
        endTime: new Date().toISOString(),
      });
      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: validationResult.error,
        duration: new Date().getTime() - startTime.getTime(),
      });
      return {
        success: false,
        message: validationResult.error,
      };
    }
  
    // Check if the user exists on the blockchain.
    try {
      const userExists = await checkUserExists(did, traceId);
      if (userExists) {
        const alreadyAddedMessage = `User with DID ${did} already exists on the blockchain.`;
        await logEvent({
          did,
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: alreadyAddedMessage,
          endTime: new Date().toISOString(),
        });
        await logUserActivity({
          did,
          traceId,
          level: 'info',
          message: alreadyAddedMessage,
          duration: new Date().getTime() - startTime.getTime(),
        });
        return {
          success: true,
          message: alreadyAddedMessage,
        };
      }
    } catch (error) {
      console.error(`[Gateway] [${traceId}] Error checking blockchain status:`, error.message);
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error checking if user is already added on the blockchain: ${error.message}`,
        endTime: new Date().toISOString(),
      });
      // Optionally, you can decide to return or continue with registration.
    }
  
    // Proceed with blockchain user registration if the user does not exist.
    try {
      console.log(`[Gateway] [${traceId}] Resolver received:`, { did });
      await logEvent({
        did: did || 'unknown',
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Initiating blockchain user registration for did=${did}`,
        startTime: startTime.toISOString(),
      });
  
      const result = await addUserOnChain(did, traceId);
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
  
      if (result.success) {
        await logEvent({
          did,
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Blockchain registration completed successfully for user with did=${did}`,
          endTime: endTime.toISOString(),
        });
        await logUserActivity({
          did,
          traceId,
          level: 'info',
          message: `You have been registered on the blockchain successfully.`,
          duration,
        });
        return {
          success: true,
          message: 'User added to the blockchain successfully',
        };
      } else {
        await logEvent({
          did,
          traceId,
          serviceName: 'gateway',
          level: 'error',
          message: `Blockchain registration failed for user with did=${did}: ${result.error}`,
          endTime: endTime.toISOString(),
        });
        await logUserActivity({
          did,
          traceId,
          level: 'error',
          message: `There was an error adding your account to the blockchain.`,
          duration,
        });
        return {
          success: false,
          message: result.error || 'An error occurred during blockchain registration. Please try again.',
        };
      }
    } catch (error) {
      console.error(`[Gateway] [${traceId}] Error during blockchain registration:`, error.message);
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
  
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error during blockchain registration: ${error.message}`,
        endTime: endTime.toISOString(),
      });
      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error adding your account to the blockchain.`,
        duration,
      });
      return {
        success: false,
        message: error.message,
      };
    }
  },  

  /**
   * Mutation to upload a batch of files on-chain.
   */
  uploadFileBatchOnchain: async (_, { owner_did, batch_hash, files_count, files, batch_size }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
    try {
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting uploadFileBatchOnchain for batch_hash=${batch_hash}`,
        startTime: startTime.toISOString(),
      });

      const response = await uploadFileBatchOnchainService({
        owner_did,
        batch_hash,
        files_count: Number(files_count),
        files,
        batch_size: Number(batch_size),
        traceId,
      });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed uploadFileBatchOnchain for batch_hash=${batch_hash}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'info',
        message: `Your file batch has been uploaded on-chain successfully.`,
        duration,
      });

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      const endTime = new Date();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in uploadFileBatchOnchain: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      console.error('Error uploading file batch:', error.message);
      throw new ApolloError(`Error uploading file batch: ${error.message}`, 'UPLOAD_FILE_BATCH_FAILED');
    }
  },

  /**
   * Mutation to upload a batch of file documents on-chain.
   */
  uploadFileBatchOnchainDoc: async (_, { owner_did, filehash, merkletree_index, doc_type, doc_name, doc_id }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
    console.log('GraphQL Request Params:', owner_did, filehash, merkletree_index, doc_type, doc_name, doc_id);
    try {
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting uploadFileBatchOnchain for doc_type=${doc_type}`,
        startTime: startTime.toISOString(),
      });

      const response = await uploadFileBatchOnchainDocService({
        owner_did,
        filehash,
        merkletree_index,
        doc_type,
        doc_name,
        doc_id,
        traceId,
      });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed uploadFileBatchOnchain for doc_type=${doc_type}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'info',
        message: `Your document batch has been uploaded on-chain successfully.`,
        duration,
      });

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      const endTime = new Date();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in uploadFileBatchOnchainDoc: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      console.error('Error uploading file batch:', error.message);
      throw new ApolloError(`Error uploading file batch: ${error.message}`, 'UPLOAD_FILE_BATCH_FAILED');
    }
  },

  /**
   * Mutation to update file verification status.
   */
  updateFileVerifyStatus: async (_, { owner_did, batch_hash }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
    try {
      console.log(`[Gateway] [${traceId}] Resolver received:`, { owner_did, batch_hash });

      if (!owner_did) throw new Error('owner_did is required');
      if (!batch_hash) throw new Error('batch_hash is required');

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting updateFileVerifyStatus with did=${owner_did}`,
        startTime: startTime.toISOString(),
      });

      const result = await updateFileVerifyStatusService({ owner_did, batch_hash, traceId });
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      if (result.success) {
        await logEvent({
          did: owner_did,
          traceId,
          serviceName: 'gateway',
          level: 'info',
          message: `Completed updateFileVerifyStatus for did=${owner_did}`,
          endTime: endTime.toISOString(),
        });

        await logUserActivity({
          did: owner_did,
          traceId,
          level: 'info',
          message: `File verification status updated successfully on chain.`,
          duration,
        });

        return {
          success: true,
          message: 'File verification status updated successfully on chain',
        };
      } else {
        await logEvent({
          did: owner_did,
          traceId,
          serviceName: 'gateway',
          level: 'error',
          message: `Failed to updateFileVerifyStatus: ${result.error}`,
          endTime: endTime.toISOString(),
        });

        await logUserActivity({
          did: owner_did,
          traceId,
          level: 'error',
          message: `There was an error updating your file verification status.`,
          duration,
        });

        return {
          success: false,
          message: result.error || 'Unknown error during on-chain status update',
        };
      }
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error calling updateFileVerifyStatus: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'error',
        message: `There was an error updating your file verification status.`,
        duration,
      });

      console.error(`[Gateway] [${traceId}] Error calling updateFileVerifyStatus:`, error.message);

      return {
        success: false,
        message: error.message,
      };
    }
  },

  /**
   * Mutation to handle callback from Bethel.
   */
  callBack: async (_, { DID, ProofID, SessionID }) => {
    try {
      const bethelCallBackResponse = await callBack(DID, ProofID, SessionID);
      return bethelCallBackResponse;
    } catch (error) {
      console.error('Error handling callback:', error.message);
      throw new ApolloError(`Error handling callback: ${error.message}`, 'CALLBACK_FAILED');
    }
  },

  /**
   * Mutation to verify a proof.
   */
  verifyProof: async (_, { DID, ProofID }) => {
    try {
      const verifyProofResponse = await verifyProof(DID, ProofID);
      console.log("Resolver proof:", verifyProofResponse);
      return verifyProofResponse;
    } catch (error) {
      console.error('Error verifying proof:', error.message);
      throw new ApolloError(`Error verifying proof: ${error.message}`, 'VERIFY_PROOF_FAILED');
    }
  },

  /**
   * Mutation to generate a proof.
   */
  generateProof: async (_, { DID, Claim }) => {
    try {
      const generateProofResponse = await generateProof(DID, Claim);
      console.log("Generate Proof response:", generateProofResponse);
      return generateProofResponse;
    } catch (error) {
      console.error('Error generating proof:', error.message);
      throw new ApolloError(`Error generating proof: ${error.message}`, 'GENERATE_PROOF_FAILED');
    }
  },

  /**
   * Mutation to upload files.
   */
  uploadFiles: async (_, { files, did, doctype, dockname, docid, path }, context) => {

    if (!files || files.length === 0) {
      throw new ApolloError('No files received');
    }
    if (did.length !== 52) {
      throw new ApolloError('Invalid DID length');
    }

    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting uploadFiles for did=${did}`,
        startTime: startTime.toISOString(),
      });

      const uploadResults = [];
      for (const uploadedFilePromise of files) {
        const uploadedFile = (await uploadedFilePromise).file;
        if (!uploadedFile) {
          throw new ApolloError('One or more files are missing');
        }

        const { createReadStream, filename } = uploadedFile;
        console.log('Processing file:', filename);

        const fileBuffer = await new Promise((resolve, reject) => {
          const chunks = [];
          createReadStream()
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => resolve(Buffer.concat(chunks)))
            .on('error', reject);
        });

        console.log(`File ${filename} processed successfully!`);

        uploadResults.push({
          did,
          pic: filename,
          fileBuffer,
        });
      }

      const createFileClaimResponse = await uploadFilesToChunk(uploadResults, did, doctype, dockname, docid, path);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed uploadFiles for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your files have been uploaded successfully.`,
        duration,
      });

      return createFileClaimResponse;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in uploadFiles: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error uploading your files.`,
        duration,
      });

      console.error('Error uploading files:', error.message);
      throw new ApolloError(`Error uploading files: ${error.message}`, 'UPLOAD_FILES_FAILED');
    }
  },

  /**
   * Mutation to initiate email verification.
   */
  saveEmailVerify: async (_, { input }, context) => {
    const { did, userEmail } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      if (!did || !userEmail) {
        throw new ApolloError('DID and userEmail are required.', 'VALIDATION_ERROR');
      }

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting saveEmailVerify for userEmail=${userEmail}`,
        startTime: startTime.toISOString(),
      });

      const grpcResponse = await initiateEmailVerification(did, userEmail, traceId);

      if (!grpcResponse.success) {
        throw new ApolloError(grpcResponse.message, 'EMAIL_VERIFICATION_FAILED');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Email verification initiated for userEmail=${userEmail}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `An email verification request has been initiated successfully.`,
        duration,
      });

      return grpcResponse;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in saveEmailVerify: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error initiating email verification.`,
        duration,
      });

      console.error('Error in saveEmailVerify:', error.message);
      throw new ApolloError('Failed to send verification email.', 'EMAIL_VERIFICATION_FAILED');
    }
  },

 /**
   * Mutation to confirm email verification using a token.
   */
 confirmEmailVerification: async (_, { token }, context) => {
  const traceId = getTraceIdFromContext(context);
  const startTime = new Date().toISOString();

  try {
    // 1. Call user-service via gRPC to confirm email verification
    const grpcResponse = await confirmEmailVerification(token, traceId);

    if (!grpcResponse.success) {
      throw new ApolloError(grpcResponse.message, 'EMAIL_VERIFICATION_FAILED');
    }


    return grpcResponse;
  } catch (error) {

    console.error('Error in confirmEmailVerification:', error.message);
    throw new ApolloError('Failed to confirm email verification.', 'EMAIL_VERIFICATION_FAILED');
  }
},

  /**
   * Mutation to resend email verification.
   */
  resendEmailVerification: async (_, { did }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting resendEmailVerification for did=${did}`,
        startTime: startTime.toISOString(),
      });

      const grpcResponse = await resendEmailVerificationGrpc(did, traceId);

      if (!grpcResponse.success) {
        throw new ApolloError(grpcResponse.message, 'EMAIL_VERIFICATION_FAILED');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Resent email verification for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Email verification has been resent successfully.`,
        duration,
      });

      return grpcResponse;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in resendEmailVerification: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error resending email verification.`,
        duration,
      });

      console.error('Error in resendEmailVerification:', error.message);
      throw new ApolloError('Failed to resend verification email.', 'EMAIL_VERIFICATION_FAILED');
    }
  },

  /**
   * Resolver for deleteFile mutation.
   */
  deleteFile: async (_, { input }, context) => {
    const { owner_did, batchhash, filehash } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting deleteFile for owner_did=${owner_did}, batchhash=${batchhash}, filehash=${filehash}`,
        startTime: startTime.toISOString(),
      });

      const response = await deleteFileService({
        owner_did,
        batchhash,
        filehash,
        traceId,
      });

      if (!response.success) {
        throw new ApolloError(response.message, 'DELETE_FILE_FAILED');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed deleteFile for owner_did=${owner_did}, batchhash=${batchhash}, filehash=${filehash}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'info',
        message: `File deleted successfully.`,
        duration,
      });

      return { 
        success: response.success, 
        message: response.message 
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in deleteFile: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'error',
        message: `There was an error deleting your file.`,
        duration,
      });

      console.error('Error deleting file:', error.message);
      throw new ApolloError('Failed to delete file.', 'DELETE_FILE_FAILED');
    }
  },

  /**
   * Resolver for deleteDoc mutation.
   */
  deleteDoc: async (_, { input }, context) => {
    const { owner_did, doc_type, doc_id } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting deleteDoc for owner_did=${owner_did}, doc_type=${doc_type}, doc_id=${doc_id}`,
        startTime: startTime.toISOString(),
      });

      const response = await deleteDocService({
        owner_did,
        doc_type,
        doc_id,
        traceId,
      });

      if (!response.success) {
        throw new ApolloError(response.message, 'DELETE_DOC_FAILED');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed deleteDoc for owner_did=${owner_did}, doc_type=${doc_type}, doc_id=${doc_id}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'info',
        message: `Document deleted successfully.`,
        duration,
      });

      return { 
        success: response.success, 
        message: response.message 
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in deleteDoc: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'error',
        message: `There was an error deleting your document.`,
        duration,
      });

      console.error('Error deleting file:', error.message);
      throw new ApolloError('Failed to delete file.', 'DELETE_DOC_FAILED');
    }
  },

  /**
   * Resolver for shareFile mutation.
   */
  shareFile: async (_, { input }, context) => {
    const { owner_did, shared_did, batchhash, filehash, filename } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting shareFile for owner_did=${owner_did}, shared_did=${shared_did}`,
        startTime: startTime.toISOString(),
      });

      const response = await shareFileService({
        owner_did,
        shared_did,
        batchhash,
        filehash,
        filename,
        traceId,
      });

      if (!response.success) {
        throw new ApolloError(response.message, 'SHARE_FILE_FAILED');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed shareFile for owner_did=${owner_did}, shared_did=${shared_did}, batchhash=${batchhash}, filehash=${filehash}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'info',
        message: `File shared successfully.`,
        duration,
      });

      return { 
        success: response.success, 
        message: response.message 
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: owner_did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in shareFile: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: owner_did,
        traceId,
        level: 'error',
        message: `There was an error sharing your file.`,
        duration,
      });

      console.error('Error sharing file:', error.message);
      throw new ApolloError('Failed to share file.', 'SHARE_FILE_FAILED');
    }
  },

  /**
   * Resolver for updateSharedFileVerifyStatus mutation.
   */
  updateSharedFileVerifyStatus: async (_, { input }, context) => {
    const { did, batchhash, filehash } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting updateSharedFileVerifyStatus for did=${did}`,
        startTime: startTime.toISOString(),
      });

      const response = await updateSharedFileVerifyStatusService({
        did,
        batchhash,
        filehash,
        traceId,
      });

      if (!response.success) {
        throw new ApolloError(response.message, 'UPDATE_SHARED_FILE_VERIFY_STATUS_FAILED');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed updateSharedFileVerifyStatus for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Shared file verification status updated successfully.`,
        duration,
      });

      return { 
        success: response.success, 
        message: response.message 
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in updateSharedFileVerifyStatus: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error updating the shared file verify status.`,
        duration,
      });

      console.error('Error updating shared file verify status:', error.message);
      throw new ApolloError('Failed to update shared file verify status.', 'UPDATE_SHARED_FILE_VERIFY_STATUS_FAILED');
    }
  },

  /**
   * Resolver for activatePackage mutation.
   */
  activatePackage: async (_, { input }, context) => {

    console.log("Input :: ", input);

    const { did, package_name, space, duration, paid_address, payment_method, referral_id, inapp_transactionid, app_key, type } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
  
    // Validate the DID.
    const validationResult = validateDid(did);
    if (!validationResult.valid) {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: validationResult.error,
        endTime: new Date().toISOString(),
      });
      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: validationResult.error,
        duration: new Date().getTime() - startTime.getTime(),
      });
      return {
        success: false,
        message: validationResult.error,
      };
    }
  
    // Check if the user exists on the blockchain.
    try {
      const userExists = await checkUserExists(did, traceId);
      if (!userExists) {
        const notExistMessage = `User with DID ${did} does not exist on the blockchain. Please register first.`;
        await logEvent({
          did,
          traceId,
          serviceName: 'gateway',
          level: 'error',
          message: notExistMessage,
          endTime: new Date().toISOString(),
        });
        await logUserActivity({
          did,
          traceId,
          level: 'error',
          message: notExistMessage,
          duration: new Date().getTime() - startTime.getTime(),
        });
        return {
          success: false,
          message: notExistMessage,
        };
      }
    } catch (error) {
      console.error(`[Gateway] [${traceId}] Error checking blockchain status:`, error.message);
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error checking if user exists on the blockchain: ${error.message}`,
        endTime: new Date().toISOString(),
      });
      // Optionally, you can decide to return here.
      return {
        success: false,
        message: `Error checking blockchain status: ${error.message}`,
      };
    }
  
    // Proceed with package activation if the user exists.
    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting activatePackage for did=${did}, package_name=${package_name}`,
        startTime: startTime.toISOString(),
      });
  
      const validPackageNames = ['Basic', 'Primary', 'Starter', 'Advance', 'StarterPro', 'AdvancePro', 'Enterprise'];
      if (!validPackageNames.includes(package_name)) {
        throw new ApolloError(
          `Invalid package name. Must be one of: ${validPackageNames.join(', ')}`,
          'INVALID_PACKAGE_NAME'
        );
      }
  
      const response = await activatePackageService({
        did,
        package_name,
        space,
        duration,
        paid_address,
        payment_method,
        referral_id,
        inapp_transactionid,
        app_key,
        type,
        traceId,
      });
  
      if (typeof response?.success === 'undefined' || typeof response?.message === 'undefined') {
        throw new ApolloError('Package activation response is incomplete.', 'ACTIVATE_PACKAGE_INCOMPLETE');
      }
  
      const endTime = new Date();
      const elapsed = endTime.getTime() - startTime.getTime();
  
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed activatePackage for did=${did}, package_name=${package_name}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
  
      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your package has been activated successfully.`,
        duration: elapsed,
      });
  
      return { success: response.success, message: response.message };
    } catch (error) {
      const endTime = new Date();
      const elapsed = endTime.getTime() - startTime.getTime();
  
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in activatePackage: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
  
      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error activating your package.`,
        duration: elapsed,
      });
  
      console.error('Error activating package:', error);
  
      if (typeof error.code === 'number' && error.details) {
        throw new ApolloError(error.details, 'GRPC_ACTIVATE_PACKAGE_FAILED', {
          grpcCode: error.code
        });
      } else {
        throw new ApolloError(error.message || 'Failed to activate package.', 'ACTIVATE_PACKAGE_FAILED');
      }
    }
  },  

  /**
   * Resolver for useSpace mutation.
   */
  useSpace: async (_, { input }, context) => {
    const { did, batch_size } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting useSpace for did=${did}, batch_size=${batch_size}`,
        startTime: startTime.toISOString(),
      });

      if (!Number.isInteger(batch_size) || batch_size <= 0) {
        throw new ApolloError('Invalid batch_size. Must be a positive integer.', 'INVALID_BATCH_SIZE');
      }

      const response = await useSpaceService({
        did,
        batch_size,
        traceId,
      });

      if (typeof response?.success === 'undefined' || typeof response?.message === 'undefined') {
        throw new ApolloError('UseSpace response is incomplete.', 'USE_SPACE_INCOMPLETE');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed useSpace for did=${did}, batch_size=${batch_size}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Space usage updated successfully.`,
        duration,
      });

      return { success: response.success, message: response.message };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in useSpace: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error updating space usage.`,
        duration,
      });

      console.error('Error allocating space:', error);

      if (typeof error.code === 'number' && error.details) {
        throw new ApolloError(error.details, 'GRPC_USE_SPACE_FAILED', {
          grpcCode: error.code
        });
      } else {
        throw new ApolloError(error.message || 'Failed to allocate space.', 'USE_SPACE_FAILED');
      }
    }
  },

  /**
   * Resolver for activateFreePlanStatus mutation.
   */
  activateFreePlanStatus: async (_, { input }, context) => {
    const { did, status } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting activateFreePlanStatus for did=${did}, status=${status}`,
        startTime: startTime.toISOString(),
      });

      if (typeof status !== 'boolean') {
        throw new ApolloError('Invalid status. Must be a boolean.', 'INVALID_STATUS');
      }

      const response = await activateFreePlanStatusService({
        did,
        status,
        traceId,
      });

      if (response.success === undefined || response.message === undefined) {
        throw new ApolloError('ActivateFreePlanStatus response is incomplete.', 'ACTIVATE_FREE_PLAN_STATUS_INCOMPLETE');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed activateFreePlanStatus for did=${did}, status=${status}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Free plan status activated successfully.`,
        duration,
      });

      return { 
        success: response.success, 
        message: response.message 
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in activateFreePlanStatus: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error activating free plan status.`,
        duration,
      });

      console.error('Error activating free plan status:', error.message);
      throw new ApolloError('Failed to activate free plan status.', 'ACTIVATE_FREE_PLAN_STATUS_FAILED');
    }
  },

  /**
   * Mutation to update user profile.
   */
  updateUserProfile: async (_, { input }, context) => {
  const { did, updates } = input;
  const traceId = getTraceIdFromContext(context);
  const startTime = new Date();

  console.debug(`[Gateway] Received updateUserProfile request`);
  console.debug(`[Gateway] TraceID=${traceId}`);
  console.debug(`[Gateway] DID=${did}`);
  console.debug(`[Gateway] Updates:`, JSON.stringify(updates, null, 2));

  try {
    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Starting updateUserProfile for DID=${did}`,
      startTime: startTime.toISOString(),
    });

    // Basic input validation
    if (!did || typeof did !== 'string' || did.trim() === '') {
      console.warn(`[Gateway] Invalid DID received:`, did);
      throw new ApolloError('Invalid DID. Must be a non-empty string.', 'INVALID_DID');
    }

    if (!updates || typeof updates !== 'object') {
      console.warn(`[Gateway] Invalid updates object received:`, updates);
      throw new ApolloError('Invalid updates. Must be an object containing fields to update.', 'INVALID_UPDATES');
    }
            // ✅ Only country_code validation
      if (updates.country_code != null) {
        const trimmed = String(updates.country_code).trim();

        // Allow empty string explicitly
        if (trimmed === '') {
          // Treat as "no country code" and skip validation
        } else if (!/^\+\d{1,4}$/.test(trimmed)) {
          console.warn('[Gateway] Invalid country_code received:', updates.country_code);
          return {
            success: false,
            message: 'Invalid country_code. Must start with + and contain 1–4 digits (e.g., +1, +44, +358).',
            user: null,
            code: 'INVALID_COUNTRY_CODE',
          };
        }}

    console.debug(`[Gateway] Forwarding request to updateUserProfileService...`);
    const response = await updateUserProfileService({
      did,
      updates,
      traceId,
    });

    console.debug(`[Gateway] Raw service response:`, JSON.stringify(response, null, 2));

    if (typeof response.success !== 'boolean' || typeof response.message !== 'string') {
      console.error(`[Gateway] Incomplete response from updateUserProfileService`);
      throw new ApolloError('updateUserProfile response is incomplete.', 'UPDATE_USER_PROFILE_INCOMPLETE');
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'info',
      message: `Completed updateUserProfile for DID=${did}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });

    await logUserActivity({
      did,
      traceId,
      level: 'info',
      message: `Your profile has been updated successfully.`,
      duration,
    });

    console.debug(`[Gateway] Successfully completed updateUserProfile for DID=${did} in ${duration}ms`);

    return { success: response.success, message: response.message };
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    await logEvent({
      did,
      traceId,
      serviceName: 'gateway',
      level: 'error',
      message: `Error in updateUserProfile: ${error.message}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });

    await logUserActivity({
      did,
      traceId,
      level: 'error',
      message: `There was an error updating your profile.`,
      duration,
    });

    console.error(`[Gateway] Error updating user profile for DID=${did}`, {
      traceId,
      error: error.message,
      stack: error.stack,
    });

    throw new ApolloError('Failed to update user profile.', 'UPDATE_USER_PROFILE_FAILED');
  }
},


  /**
   * Mutation to download a single file.
   */
  downloadFile: async (_, { batchHash, fileHash, fileName, did, cids }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting downloadFile for did=${did}, fileName=${fileName}`,
        startTime: startTime.toISOString(),
      });

      const response = await downloadFile({
        batchHash, 
        fileHash, 
        fileName, 
        did, 
        cids,
      });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed downloadFile for did=${did}, fileName=${fileName}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `File downloaded successfully.`,
        duration,
      });

      return response;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in downloadFile: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error downloading your file.`,
        duration,
      });

      console.error('Error downloading file:', error.message);
      throw new ApolloError('Failed to download file.', 'FILE_DOWNLOAD_FAILED');
    }
  },

  /**
   * Mutation to download a batch of files.
   */
  downloadBatch: async (_, { input }, context) => {
    const { batchHash, odid, batchData } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      // If you want logging, do similarly here
      const response = await downloadBatch({ batchHash, odid, batchData });

      // Compute duration etc. if you want to log user activity
      return response;
    } catch (error) {
      console.error('Error downloading batch:', error.message);
      throw new ApolloError('Failed to download batch.', 'BATCH_DOWNLOAD_FAILED');
    }
  },

  /**
   * Mutation to share a claim.
   */
  shareClaim: async (_, { owner_did, shared_did, batchhash, filehash, filename }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      const response = await shareClaim({ owner_did, shared_did, batchhash, filehash, filename });

      // Optionally do the same pattern of logging events and user activity
      return response;
    } catch (error) {
      console.error('Error sharing claim:', error.message);
      throw new ApolloError('Failed to share claim.', 'SHARE_CLAIM_FAILED');
    }
  },

  /**
   * Mutation to update paid space (Polygon).
   */
  updatePaidSpace: async (_, { input }, context) => {
    const { _package, _did, _duration } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      const receipt = await updatePaidSpaceService({ _package, _did, _duration, traceId });
      const receiptString = JSON.stringify(receipt);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Optionally log event, user activity
      return {
        success: true,
        message: 'Updated paid space successfully',
        receipt: receiptString,
      };
    } catch (error) {
      console.error('Error in updatePaidSpace resolver:', error.message);
      throw new ApolloError('Failed to update paid space', 'CONTRACT_CALL_ERROR');
    }
  },

  /**
   * Mutation to add file points.
   */
  addFilePoints: async (_, { did, file_count }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting addFilePoints for did=${did}`,
        startTime: startTime.toISOString(),
      });

      const response = await addFilePoints(did, file_count);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed addFilePoints for did=${did}, file_count=${file_count}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `File points have been added successfully.`,
        duration,
      });

      return response;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in addFilePoints: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error adding file points.`,
        duration,
      });

      console.error('Error in addFilePoints resolver:', error.message);
      throw new ApolloError('Failed to add file points', 'FILE_POINT_ERROR');
    }
  },

  /**
   * Mutation to add login points.
   */
  addLoginPoints: async (_, { did }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting addLoginPoints for did=${did}`,
        startTime: startTime.toISOString(),
      });

      const response = await addLoginPoints({ did, traceId });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed addLoginPoints for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Login points added successfully.`,
        duration,
      });

      return response;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in addLoginPoints: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error adding login points.`,
        duration,
      });

      console.error('Error adding login points:', error.message);
      throw new ApolloError('Failed to add login points.', 'ADD_LOGIN_POINTS_FAILED');
    }
  },

  /**
   * Mutation to upload documents.
   */
  uploadDocuments: async (_, { files, did, doctype }, context) => {
    if (!files || files.length === 0) {
      throw new ApolloError('No files received');
    }
    if (did.length !== 52) {
      throw new ApolloError('Invalid DID length');
    }

    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      const uploadResults = [];

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting uploadDocuments for did=${did}`,
        startTime: startTime.toISOString(),
      });

      for (const uploadedFilePromise of files) {
        const uploadedFile = (await uploadedFilePromise).file;
        if (!uploadedFile) {
          throw new ApolloError('One or more files are missing');
        }

        const { createReadStream, filename } = uploadedFile;
        console.log('Processing file:', filename);

        const fileBuffer = await new Promise((resolve, reject) => {
          const chunks = [];
          createReadStream()
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => resolve(Buffer.concat(chunks)))
            .on('error', reject);
        });

        console.log(`File ${filename} processed successfully!`);

        uploadResults.push({
          did,
          pic: filename,
          fileBuffer,
        });
      }

      const createFileClaimResponse = await uploadDocumentsToChunk(uploadResults, did, doctype);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed uploadDocuments for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your documents have been uploaded successfully.`,
        duration,
      });

      return createFileClaimResponse;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in uploadDocuments: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error uploading your documents.`,
        duration,
      });

      console.error('Error uploading documents:', error.message);
      throw new ApolloError('Failed to upload documents.', 'UPLOAD_DOCUMENTS_FAILED');
    }
  },

  /**
   * Mutation to save a user seed.
   */
  SaveUserSeed: async (_, { input }, context) => {
    const { did, wallet, seed } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting SaveUserSeed for did=${did}`,
        startTime: startTime.toISOString(),
      });

      const response = await SaveUserSeedService({ did, wallet, seed });

      if (typeof response?.success === 'undefined' || typeof response?.message === 'undefined') {
        throw new ApolloError('SaveUserSeed response is incomplete.', 'SaveUserSeed_INCOMPLETE');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed SaveUserSeed for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your seed has been saved successfully.`,
        duration,
      });

      return { success: response.success, message: response.message };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in SaveUserSeed: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error saving your seed.`,
        duration,
      });

      console.error('Error SaveUserSeed:', error);

      if (typeof error.code === 'number' && error.details) {
        throw new ApolloError(error.details, 'GRPC_SaveUserSeed_FAILED', {
          grpcCode: error.code
        });
      } else {
        throw new ApolloError(error.message || 'Failed to SaveUserSeed.', 'SaveUserSeed_FAILED');
      }
    }
  },

  /**
   * Mutation to update user profile picture.
   */
  updateUserProfilePic: async (_, { did, file }, context) => {
    try {
      console.log('Resolver input DID:', did);
      if (!Array.isArray(file) || file.length === 0) {
        throw new ApolloError('No file received');
      }

      const uploadObj = file[0];
      const { createReadStream, filename } = uploadObj.file;
      console.log('Processing profile picture:', filename);

      const stream = createReadStream();
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const imageBuffer = Buffer.concat(chunks);
      console.log(`File ${filename} processed successfully!`);

      const traceId = getTraceIdFromContext(context);
      const startTime = new Date();

      const response = await updateProfilePicService({ did, imageBuffer, traceId });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed updateUserProfilePic for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your profile picture has been updated successfully.`,
        duration,
      });

      const profileImageBase64 = response.profile_image
        ? Buffer.from(response.profile_image).toString('base64')
        : null;

      return {
        success: response.success,
        message: response.message,
        profile_image: profileImageBase64,
      };
    } catch (error) {
      console.error('GraphQL updateUserProfilePic error:', error);
      throw new ApolloError('Failed to update profile picture', 'UPDATE_PROFILE_PIC_FAILED');
    }
  },

  /**
   * Mutation to update document by type.
   */
  UpdateDocumentByType: async (_, { input }, context) => {
    const { did, newFilehash, newMerkletreeIndex, docType, docName, docId } = input;
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      const response = await updateDocumentByTypeService({
        did,
        newFilehash,
        newMerkletreeIndex,
        docType,
        docName,
        docId,
        traceId,
      });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed UpdateDocumentByType for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your document has been updated successfully.`,
        duration,
      });

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      console.error('Error updating document:', error.message);
      throw new ApolloError(`Error updating document: ${error.message}`, 'UPDATE_DOCUMENT_FAILED');
    }
  },

  /**
   * Callback for download events.
   */
  downloadCallBack: async (_, { DID, ProofID, SessionID }) => {
    try {
      const downloadCallBackResponse = await downloadCallBack(DID, ProofID, SessionID);
      return downloadCallBackResponse;
    } catch (error) {
      console.error('Error handling download callback:', error.message);
      throw new ApolloError(`Error handling download callback: ${error.message}`, 'DOWNLOAD_CALLBACK_FAILED');
    }
  },

  /**
   * Mutation to create a referral rewards profile.
   */
  createReferralRewardsProfile: async (_, { did, email }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting createReferralRewardsProfile for did=${did}`,
        startTime: startTime.toISOString(),
      });

      const response = await createReferralRewardsProfile({ did, email, traceId });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed createReferralRewardsProfile for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your referral profile has been created successfully.`,
        duration,
      });

      return response;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in createReferralRewardsProfile: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error creating your referral profile.`,
        duration,
      });

      console.error('Error create referral profile:', error.message);
      throw new ApolloError('Failed to create referral profile.', 'CREATE_REFERRAL_PROFILE_FAILED');
    }
  },

  /**
   * Mutation to extend package grace period.
   */
  extendPackageGracePeriod: async (_, { input }, context) => {
    const { did } = input;
    const traceId = context.req?.headers['x-trace-id'] || `trace-${Date.now()}`;
    // For brevity, you can do the same pattern of logging here if you wish
    try {
      const response = await extendPackageGracePeriodService({ did, traceId });
      return {
        success: response.success,
        message: response.message
      };
    } catch (error) {
      console.error(`[Gateway] [${traceId}] Error in extendPackageGracePeriod:`, error);
      throw new Error(error.message || 'Failed to extend package grace period.');
    }
  },

  /**
   * Mutation to update documents.
   */
  updateDocuments: async (_, { files, did, docname, doctype, docid, path }, context) => {
    if (!files || files.length === 0) {
      throw new ApolloError('No files received');
    }
    if (did.length !== 52) {
      throw new ApolloError('Invalid DID length');
    }

    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting updateDocuments for did=${did}`,
        startTime: startTime.toISOString(),
      });

      const uploadResults = [];
      for (const uploadedFilePromise of files) {
        const uploadedFile = (await uploadedFilePromise).file;
        if (!uploadedFile) {
          throw new ApolloError('One or more files are missing');
        }

        const { createReadStream, filename } = uploadedFile;
        console.log('Processing file:', filename);

        const fileBuffer = await new Promise((resolve, reject) => {
          const chunks = [];
          createReadStream()
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => resolve(Buffer.concat(chunks)))
            .on('error', reject);
        });

        console.log(`File ${filename} processed successfully!`);
        uploadResults.push({ did, pic: filename, fileBuffer });
      }

      const createFileClaimResponse = await updateDocuments(uploadResults, did, docname, doctype, docid, path);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed updateDocuments for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your documents have been updated successfully.`,
        duration,
      });

      return createFileClaimResponse;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in updateDocuments: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error updating your documents.`,
        duration,
      });

      console.error('Error updating documents:', error.message);
      throw new ApolloError('Failed to update documents.', 'UPDATE_DOCUMENTS_FAILED');
    }
  },

  /**
   * Mutation to send support email.
   */
  sendSupportEmail: async (_, { name, email, phone, subject, body }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did: email,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting sending support email=${email}`,
        startTime: startTime.toISOString(),
      });

      const response = await sendSupportEmail({ name, email, phone, subject, body });

      if (typeof response?.success === 'undefined' || typeof response?.message === 'undefined') {
        throw new ApolloError('SendSupportEmail response is incomplete.', 'SEND_SUPPORT_EMAIL_INCOMPLETE');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: email,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed sending support email for email=${email}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: email,
        traceId,
        level: 'info',
        message: `Your support email has been sent successfully.`,
        duration,
      });

      return response;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: email,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in sending support email: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: email,
        traceId,
        level: 'error',
        message: `There was an error sending your support email.`,
        duration,
      });

      console.error('Error in sending support email:', error);

      if (typeof error.code === 'number' && error.details) {
        throw new ApolloError(error.details, 'SEND_SUPPORT_EMAIL_FAILED', {
          grpcCode: error.code
        });
      } else {
        throw new ApolloError(error.message || 'Failed to send support email.', 'SEND_SUPPORT_EMAIL_FAILED');
      }
    }
  },

  /**
   * Mutation to update referrer.
   */
  updateReferrer: async (_, { did, referralID }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting updateReferrer for did=${did}`,
        startTime: startTime.toISOString(),
      });

      const response = await updateReferrer({ did, referralID, traceId });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed updateReferrer for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your referral information has been updated successfully.`,
        duration,
      });

      return response;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in updating referrer: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error updating your referral information.`,
        duration,
      });

      console.error('Error in updating referrer:', error);

      if (typeof error.code === 'number' && error.details) {
        throw new ApolloError(error.details, 'UPDATE_REFERRAL', {
          grpcCode: error.code
        });
      } else {
        throw new ApolloError(error.message || 'Failed to update referrer.', 'UPDATING_REFERRER_FAILED');
      }
    }
  },

  /**
   * Mutation to save a account delete.
  */
  AccountDelete: async (_, { did }, context) => {
    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did: typeof did === 'object' ? JSON.stringify(did) : did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting AccountDelete for did=${typeof did === 'object' ? JSON.stringify(did) : did}`,
        startTime: startTime.toISOString(),
      });

      // accountDeleteService now expects an object with did and traceId if needed.
      const response = await accountDeleteService({ did, traceId });

      if (
        typeof response?.success === 'undefined' ||
        typeof response?.message === 'undefined'
      ) {
        throw new ApolloError('AccountDelete response is incomplete.', 'AccountDelete_INCOMPLETE');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: typeof did === 'object' ? JSON.stringify(did) : did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed AccountDelete for did=${typeof did === 'object' ? JSON.stringify(did) : did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: typeof did === 'object' ? JSON.stringify(did) : did,
        traceId,
        level: 'info',
        message: 'Your account has been deleted successfully.',
        duration,
      });

      return { success: response.success, message: response.message };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: typeof did === 'object' ? JSON.stringify(did) : did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in AccountDelete: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: typeof did === 'object' ? JSON.stringify(did) : did,
        traceId,
        level: 'error',
        message: 'There was an error deleting your account.',
        duration,
      });

      console.error('Error AccountDelete:', error);

      if (typeof error.code === 'number' && error.details) {
        throw new ApolloError(error.details, 'GRPC_AccountDelete_FAILED', {
          grpcCode: error.code,
        });
      } else {
        throw new ApolloError(error.message || 'Failed to AccountDelete.', 'AccountDelete_FAILED');
      }
    }
  },
  CreateShareLink: async (_, { did, cid, expiresInMinutes, fileName }, context) => {

    console.log({ did, cid, expiresInMinutes, fileName })

    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting create link for share=${did}`,
        startTime: startTime.toISOString(),
      });

      const link = await CreateShareLink(did, cid, expiresInMinutes, fileName);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed creating sharable link for owner_did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Your sharable link has been created successfully.`,
        duration,
      });

      return link;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in creating sharable link : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error creating your sharable link.`,
        duration,
      });

      console.error('Error creating sharable link:', error.message);
      throw new ApolloError(`Error creating sharable link: ${error.message}`, 'CREATE_SHARE_LINK_FAILED');
    }
  },
  shareDownloadCallBack: async (_, { DID, ProofID, SessionID }) => {
    try {
      const downloadCallBackResponse = await shareDownloadCallBack(DID, ProofID, SessionID);
      return downloadCallBackResponse;
    } catch (error) {
      console.error('Error handling download callback:', error.message);
      throw new ApolloError(`Error handling download callback: ${error.message}`, 'DOWNLOAD_CALLBACK_FAILED');
    }
  },
  AdminRegistration: async (_, { did, password }, context) => {

    console.log("Did for admin registration : ", did);

    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Admin registration starting DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const registered = await AdminRegistration(did, password);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Admin registration completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Admin profile has been created successfully.`,
        duration,
      });

      return registered;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in registering admin : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error registering admin.`,
        duration,
      });

      console.error('Error registering admin:', error.message);
      throw new ApolloError(`Error registering admin: ${error.message}`, 'ADMIN_REGISTRATION_FAILED');
    }
  },
  AdminLogin: async (_, { did, password }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const startTime = new Date();
    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Admin login starting DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const logged = await AdminLogin(did, password, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Admin login completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Admin logged successfully.`,
        duration,
      });

      return logged;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in login admin : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error login admin.`,
        duration,
      });

      console.error('Error login admin:', error.message);
      throw new ApolloError(`Error login admin: ${error.message}`, 'ADMIN_LOGIN_FAILED');
    }
  },
  GetAllUsersCount: async (_, { did }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    const startTime = new Date();
    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Request to get all users count from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const count = await GetAllUsersCount(did, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Users count geting completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Get all users successfully executed.`,
        duration,
      });

      return count;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in login admin : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error login admin.`,
        duration,
      });

      console.error('Error login admin:', error.message);
      throw new ApolloError(`Error login admin: ${error.message}`, 'ADMIN_LOGIN_FAILED');
    }
  },
  GetAllUsersCountFromTo: async (_, { did, from, to }, context) => {

    const { traceId , device, forwardedFor} = getHeadersFromContext(context);

    const token = getAccessToken(context);

    const startTime = new Date();
    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Request to get all users count from DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const count = await GetAllUsersCountFromTo(did, from, to, token, device, forwardedFor);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Users count geting completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Get all users successfully executed.`,
        duration,
      });

      return count;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in login admin : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error login admin.`,
        duration,
      });

      console.error('Error login admin:', error.message);
      throw new ApolloError(`Error login admin: ${error.message}`, 'ADMIN_LOGIN_FAILED');
    }
  },
  ActivateFreeTrial: async (_, { did }, context) => {

    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();
    try {
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Activate free trial starting DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      const freeTrial = await ActivateFreeTrial(did);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Activate free-trial completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Free trial activated successfully.`,
        duration,
      });

      return freeTrial;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error activating free trial : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error Error activating free trial.`,
        duration,
      });

      console.error('Error Error activating free trial:', error.message);
      throw new ApolloError(`Error Error activating free trial: ${error.message}`, 'FREE_TRIAL_ACTIVATION_FAILED');
    }
  },
  /**
   * GraphQL resolver for creating a folder.
   *
   * @param {Object} _ - Parent resolver (unused).
   * @param {Object} args - The arguments containing did, parent, and name.
   * @param {string} args.did - The Decentralized Identifier of the user creating the folder.
   * @param {string} args.parent - The ID of the parent folder. Null or empty for root.
   * @param {string} args.name - The name of the folder to create.
   * @param {Object} context - GraphQL context containing request metadata.
   * @returns {Object} The created folder details.
   * @throws {ApolloError} If folder creation fails.
   */
  CreateFolder: async (_, { did, parent, name }, context) => {
    // Extract traceId for distributed tracing and logging correlation
    const traceId = getTraceIdFromContext(context);
    
    // Record the start time for duration calculation
    const startTime = new Date();

    try {
      // Log the start of folder creation event for observability
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Create folder starting DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      // Call the CreateFolder service to create the folder
      const createdFolder = await CreateFolder(did, parent, name);

      // Record end time after folder creation
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Log successful completion of folder creation
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Create folder completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // Record user activity for audit and analytics
      await logUserActivity({
        did: did,
        traceId,
        level: 'info',
        message: `Folder created successfully.`,
        duration,
      });

      // Return the created folder details as the GraphQL resolver response
      return createdFolder;

    } catch (error) {
      // Capture end time and duration in case of error
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Log the error event for observability and incident analysis
      await logEvent({
        did: did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error creating folder : ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // Record failed user activity for audit and analytics
      await logUserActivity({
        did: did,
        traceId,
        level: 'error',
        message: `There was an error creating folder.`,
        duration,
      });

      // Log error to console for immediate developer visibility
      console.error('Error creating folder:', error.message);

      // Throw an ApolloError with a specific code to inform the client of failure
      throw new ApolloError(`Error creating folder: ${error.message}`, 'FOLDER_CREATION_FAILED');
    }
  },
  /**
   * GraphQL resolver for deleting a folder and its descendants.
   *
   * @param {undefined} _        - Unused root value
   * @param {Object} args
   * @param {string} args.did    - The user's DID
   * @param {number} args.id     - The ID of the folder to delete
   * @param {Object} context     - GraphQL context (contains tracing, auth info, etc.)
   * @returns {Promise<Object>}  - Details of the deleted folder
   * @throws {ApolloError}       - 'FOLDER_DELETION_FAILED' if deletion fails
   */
  DeleteFoldersById: async (_, { did, folder_id }, context) => {
    // 1. Extract a trace ID from the context for distributed tracing
    const traceId = getTraceIdFromContext(context);
    
    // 2. Record when the operation started (for duration metrics)
    const startTime = new Date();

    try {
      // 3. Log the start of the delete-folder operation
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Delete folder starting DID = ${did}`,
        startTime: startTime.toISOString(),
      });

      // 4. Invoke the service layer to perform the actual deletion
      const deletedFolder = await DeleteFoldersById(did, folder_id);

      // 5. Calculate how long the operation took
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 6. Log successful completion of the delete operation
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Delete folder completed DID = ${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // 7. Record user activity for auditing and analytics
      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: 'Folder deleted successfully.',
        duration,
      });

      // 8. Return the result back to the GraphQL client
      return deletedFolder;

    } catch (error) {
      // 9. On error, capture the end time and duration
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 10. Log an error event for observability and troubleshooting
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error deleting folder: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // 11. Record failed user activity for audit trails
      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: 'There was an error deleting folder.',
        duration,
      });

      // 12. Output the error to the console for immediate visibility
      console.error('Error deleting folder:', error.message);

      // 13. Throw a structured ApolloError so the client knows deletion failed
      throw new ApolloError(
        `Error deleting folder: ${error.message}`,
        'FOLDER_DELETION_FAILED'
      );
    }
  },
  /**
   * GraphQL resolver: delete a specific file within a folder.
   *
   * Deletes the file identified by `file_id` that resides in the folder
   * identified by `folder_id`, on behalf of the user `did`. Emits structured
   * logs and audit events, including timing metadata, for observability.
   *
   * @param {*} _ - Unused root value (GraphQL resolver signature)
   * @param {Object} args - Resolver arguments
   * @param {string} args.did - The requesting user's DID
   * @param {number} args.folder_id - ID of the folder that contains the file
   * @param {number} args.file_hash - ID of the file to delete
   * @param {Object} context - GraphQL context (auth, tracing, etc.)
   * @returns {Promise<Object>} - Deletion result (e.g., deleted file metadata or acknowledgment)
   * @throws {ApolloError} - 'FILE_DELETION_FAILED' if deletion fails
   */
  DeleteFileInFolder: async (_, { did, folder_id, file_hash }, context) => {

    // Validate inputs early for clear, actionable errors.
    if (!did || did.length !== 52) {
      throw new ApolloError(!did ? 'DID is required.' : 'Invalid DID.');
    }
    if (folder_id === undefined || folder_id === null || folder_id === "") {
      throw new ApolloError('Folder ID is required.');
    }
    if (file_hash === undefined || file_hash === null || file_hash === "") {
      throw new ApolloError('File hash is required.');
    }
    // 1) Pull a trace ID from context for distributed tracing/correlation.
    const traceId = getTraceIdFromContext(context);

    // 2) Capture start time for duration metrics.
    const startTime = new Date();

    try {
      // 3) Log the start of the operation (structured, traceable).
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Deleting file ${file_hash} in folder ${folder_id} (did=${did})`,
        startTime: startTime.toISOString(),
      });

      // 4) Perform the deletion in the service layer.
      //    NOTE: Ensure the service signature accepts (did, folder_id, file_id).
      const deleteResult = await DeleteFileInFolder(did, folder_id, file_hash);

      // 5) Compute elapsed time.
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 6) Log successful completion with timing for observability.
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Deleted file ${file_hash} in folder ${folder_id} (did=${did})`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // 7) Record user activity (audit trail / analytics).
      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: 'File deleted successfully.',
        duration,
      });

      // 8) Return the service result to the client.
      return deleteResult;

    } catch (error) {
      // 9) On failure, still capture timing.
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 10) Emit an error log with trace data and timing.
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Failed to delete file ${file_hash} in folder ${folder_id}: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // 11) Audit the failed attempt.
      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: 'Error deleting file inside a folder.',
        duration,
      });

      // 12) Surface the error locally for quick diagnostics.
      console.error('Error deleting file inside a folder:', error.message);

      // 13) Throw a structured ApolloError with a stable error code.
      throw new ApolloError(
        `Error deleting file inside a folder: ${error.message}`,
        'FILE_DELETION_FAILED'
      );
    }
  },
  /**
   * GraphQL resolver: RenameFolder
   *
   * Renames an existing folder for a given owner DID and records observability signals.
   * Validates inputs (including folder name rules) before delegating to the service
   * `RenameFolder(did, folder_id, new_name)` which performs the transactional rename
   * and path cascade.
   *
   * Folder name rules enforced here:
   *  - Must not be empty or whitespace-only
   *  - Must not be "." or ".."
   *  - Must not contain "/" (single path segment only)
   *  - Must not contain control characters (ASCII < 0x20)
   *  - Max length 128 characters (adjust if needed)
   *
   * Observability:
   *  - Uses traceId from context for correlation
   *  - Logs start/success/failure with timestamps
   *  - Audits user activity with elapsed duration
   *
   * Returns the service result (renamed folder metadata) or `null` if not found.
   *
   * Known service-layer errors that may bubble up:
   *  - "INVALID_NAME"        → service-side validation rejected the name
   *  - "NAME_CONFLICT"       → sibling folder with same name exists
   *  - "CANNOT_RENAME_ROOT"  → attempting to rename root sentinel (if applicable)
   *
   * @param {_} _ - Unused GraphQL parent
   * @param {{ did: string; folder_id: number|string; new_name: string }} args
   * @param {object} context - Apollo context (carries tracing info)
   * @returns {Promise<object|null>} Renamed folder payload from service or `null`
   * @throws {ApolloError} On validation failure or unexpected errors (code: 'FOLDER_RENAME_FAILED')
   */
  RenameFolder: async (_, { did, folder_id, new_name }, context) => {
    // --- helper: normalize & validate folder name ---
    const normalizeAndValidateFolderName = (value) => {
      const name = String(value ?? '').trim();

      if (!name) {
        throw new ApolloError('New name is required.');
      }
      if (name === '.' || name === '..') {
        throw new ApolloError('Invalid folder name: reserved names not allowed.');
      }
      if (name.includes('/')) {
        throw new ApolloError('Invalid folder name: slashes ("/") are not allowed.');
      }
      // Disallow ASCII control chars
      if (!/^[^\x00-\x1F]+$/.test(name)) {
        throw new ApolloError('Invalid folder name: contains control characters.');
      }
      if (name.length > 128) {
        throw new ApolloError('Invalid folder name: too long (max 128 characters).');
      }
      return name;
    };

    // Basic input validation
    if (!did || did.length !== 52) {
      throw new ApolloError(!did ? 'DID is required.' : 'Invalid DID.');
    }
    if (folder_id === undefined || folder_id === null || folder_id === '') {
      throw new ApolloError('Folder ID is required.');
    }

    // Validate & normalize the new name
    const safeName = normalizeAndValidateFolderName(new_name);

    // 1) Pull a trace ID from context for distributed tracing/correlation.
    const traceId = getTraceIdFromContext(context);

    // 2) Capture start time for duration metrics.
    const startTime = new Date();

    try {
      // 3) Log the start of the operation (structured, traceable).
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Rename folder ${folder_id} (did=${did}) -> "${safeName}"`,
        startTime: startTime.toISOString(),
      });

      // 4) Perform the rename in the service layer.
      //    NOTE: Ensure the service signature accepts (did, folder_id, new_name).
      const renameResult = await RenameFolder(did, folder_id, safeName);

      // 5) Compute elapsed time.
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 6) Log successful completion with timing for observability.
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Renamed folder ${folder_id} (did=${did}) to "${safeName}" successfully`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // 7) Record user activity (audit trail / analytics).
      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Folder ${folder_id} renamed to "${safeName}"`,
        duration,
      });

      // 8) Return the service result to the client.
      return renameResult;

    } catch (error) {
      // 9) On failure, still capture timing.
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 10) Emit an error log with trace data and timing.
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Failed to rename folder ${folder_id} (did=${did}, new_name="${safeName}"): ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // 11) Audit the failed attempt.
      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `Error renaming folder ${folder_id} to "${safeName}"`,
        duration,
      });

      // 12) Surface the error locally for quick diagnostics.
      console.error('Error renaming folder:', error);

      // 13) Throw a structured ApolloError with a stable error code.
      throw new ApolloError(
        `Error renaming folder: ${error.message}`,
        'FOLDER_RENAME_FAILED'
      );
    }
  },
    /**
   * Mutation to upload files.
   */
  updateFile: async (_, { files, did, doctype, dockname, docid, path, prefilehash, prebatchhash}, context) => {

    // helper: null/undefined/"  " -> empty
    const isBlank = (v) => v == null || (typeof v === 'string' && v.trim() === '');

    if (!Array.isArray(files) || files.length === 0) {
      throw new ApolloError('No files received');
    }

    if (!files.length > 1){
      throw new ApolloError('Cannot update multiple files.');
    }

    if (did.length !== 52) {
      throw new ApolloError('Invalid DID length');
    }

    if (prefilehash.length == 0){
      throw new ApolloError('Please give previous file hash');
    }

    if (prebatchhash.length == 0){
      throw new ApolloError('Please give previous batch hash');
    }


    const traceId = getTraceIdFromContext(context);
    const startTime = new Date();

    try {
      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Starting update File for did=${did}`,
        startTime: startTime.toISOString(),
      });

      const uploadResults = [];
      for (const uploadedFilePromise of files) {
        const uploadedFile = (await uploadedFilePromise).file;
        if (!uploadedFile) {
          throw new ApolloError('File is missing');
        }

        const { createReadStream, filename, mimetype } = uploadedFile;
        console.log('Processing file:', filename);


        // ---- File type guard (extension + MIME when present) ----
        const ext = extname(filename ?? '').toLowerCase();
        const extOK = ALLOWED_EXTS.has(ext);
        const mimeOK = mimetype ? ALLOWED_MIMES.has(String(mimetype).toLowerCase()) : false;

        if (!extOK && !mimeOK) {
          throw new ApolloError(
            'Unsupported file type. Allowed: .doc, .docx, .ppt, .pptx, .xls, .xlsx, .txt'
          );
        }
        // ---------------------------------------------------------

        const fileBuffer = await new Promise((resolve, reject) => {
          const chunks = [];
          createReadStream()
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => resolve(Buffer.concat(chunks)))
            .on('error', reject);
        });

        console.log(`File ${filename} processed successfully!`);

        uploadResults.push({
          did,
          pic: filename,
          fileBuffer,
        });
      }

      const createFileClaimResponse = await updateFileToChunk(uploadResults, did, doctype, dockname, docid, path, prefilehash, prebatchhash);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'info',
        message: `Completed uploadFiles for did=${did}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'info',
        message: `Your files have been uploaded successfully.`,
        duration,
      });

      return createFileClaimResponse;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await logEvent({
        did,
        traceId,
        serviceName: 'gateway',
        level: 'error',
        message: `Error in uploadFiles: ${error.message}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      await logUserActivity({
        did,
        traceId,
        level: 'error',
        message: `There was an error uploading your files.`,
        duration,
      });

      console.error('Error uploading files:', error.message);
      throw new ApolloError(`Error uploading files: ${error.message}`, 'UPLOAD_FILES_FAILED');
    }
  },
};

export default { Query, Mutation };