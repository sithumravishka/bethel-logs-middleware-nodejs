import { gql } from 'apollo-server';

export default gql`
  scalar Upload
  scalar Bytes
  scalar UInt
  scalar DateTime

  type Owner {
    owner_did: String!
    owner_email: String
    first_name: String
    last_name: String
    country: String
    phone_number: String
    company_name: String
    company_regno: String
    city: String
    postal_code: String
    country_code: String
    description: String
    state: String
    address_line1: String
    address_line2: String
    profile_image: String
    account_type: String
    account_status: String
    claim: String
    referralID: String
  }

  type UserRegistration {
    owner_did: String!
    claim: String!
    referralID: String!
  }

  type Claim {
    owner_did: String!
    claim: String
    referralID: String
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
  

  type GetUserActivityLogsRecord {
  did: String
  traceId: String
  level: String
  message: String
  duration: String
  loggedAt: String
}

type GetUserActivityLogsResponse {
  logs: [GetUserActivityLogsRecord]       # Flat list of log records
  pageNumber: Int         # Current page number
  totalLogs: Int          # Total number of logs available
}


  type AddUserChainResponse {
    success: Boolean
    message: String
  }

  type UploadFileBatchChainResponse {
    success: Boolean
    message: String
  }

  type UploadFileBatchOnchainDocResponse {
  success: Boolean
  message: String
}

  input File {
    filehash: String!
    merkletree_index: Int!
}

  type UserSignInBethelResponse {
    SessionID: String
  }

  type CreateIdentityResponse{
    DID: String
  }

  type CallBackBethelUserRequest {
    DID: String!
    ProofID: String!
    SessionID: String!
  }

  type BethelCallBackResponse{
    id: String!
  }

  type VerifyProofResponse{
    verified: Boolean
  }

  type  GetUserClaimResponse {
    claimData: String
  }

  type  GetFileClaimResponse {
    claim: String
  }

  type GetDocClaimResponse{
    claim: String
  }

  type  GetShareClaimResponse {
    claim: String
  }

  type GenerateProofResponse {
    proof: String
  }

  type IsUserRegisteredResponse{
   isRegistered: Boolean
  }


  type CreateFileClaimResponse{
   ownerDid : String
   claim : String
   fileCount : Int
  }

  type UpdateFileResponse{
   ownerDid : String
   message : String
  }

# New Type Definitions for Email Verification
type EmailVerify {
    id: ID!
    did: String!
    userEmail: String!
    token: String!
    isVerified: Boolean!
    createdAt: String!
    expiresAt: String!
  }

  input SaveEmailVerifyInput {
    did: String!
    userEmail: String!
  }

  type SaveEmailVerifyResponse {
    success: Boolean!
    message: String!
    emailVerify: EmailVerify
  }

  type ConfirmEmailVerificationResponse {
    success: Boolean!
    message: String!
  }

  type GetEmailVerificationStatusResponse {
    isVerified: Boolean!
    userEmail: String
  }

  type ResendEmailVerificationResponse {
    success: Boolean!
    message: String!
    emailVerify: EmailVerify
  }

  type IsUserAddedOnChainResponse{
   isRegistered: Boolean
  }

  type IsUserExistsOnChainResponse{
   isRegistered: Boolean
  }

  type GetBatchFileResponse {
  index: Int!
}

input GetBatchFileInput {
  owner_did: String!
  batchhash: String!
  filehash: String!
}

type GetDocFileResponse {
  owner_did: String!
  filehash: String,
  merkletree_index: Int!
  doc_type: String!
  doc_name: String!
  doc_id: String!
}

input GetDocFileInput {
  owner_did: String!
  doc_type: String!
  doc_id: String!
}

type UpdateFileVerifyResponse {
  success: Boolean!
  message: String!
}

type OkResponse {
  ok: OkInner!
}

type GetTotalFilesCountSizeResponse {
  count: Int!
  size: Int!
}

input GetTotalFilesCountSizeInput {
  did: String!
}


type BatchInfo {
  ownerDid: String!
  batchhash: String!
  filesCount: Int!
  batchSize: Int!
  verified: Boolean!
  fileHashes: [String!]!
  deletedFilesCount: Int!
}

type GetAllBatchesResponse {
  batches: [BatchInfo!]!
}

input GetAllBatchesInput {
  owner_did: String!
}


type GetBatchFileDetailsResponse {
  success: Boolean!
  message: String!
  markletree_index: [Int!]!
}

input GetBatchFileDetailsInput {
  owner_did: String!
  batchhash: String!
  filehash: String!
}

type DeleteFileResponse {
  success: Boolean!
  message: String!
}

input DeleteFileInput {
  owner_did: String!
  batchhash: String!
  filehash: String!
}

type ShareFileResponse {
  success: Boolean!
  message: String!
}

input ShareFileInput {
  owner_did: String!
  shared_did: String!
  batchhash: String!
  filehash: String!
  filename: String!
}

type UpdateSharedFileVerifyStatusResponse {
  success: Boolean!
  message: String!
}

input UpdateSharedFileVerifyStatusInput {
  did: String!
  batchhash: String!
  filehash: String!
}

type SharedFile {
  owner_did: String!
  shared_did: String!
  batchhash: String!
  filehash: String!
  filename: String!
  merkletree_index: Int!
  verified: Boolean!
}

type GetAllSharedFilesResponse {
  shared_files: [SharedFile!]!
}

input GetAllSharedFilesInput {
  did: String!
}

type GetSharedFileResponse {
  merkletree_index: Int!
  filename: String!
}

input GetSharedFileInput {
  did: String!
  batchhash: String!
  filehash: String!
}

type ActivatePackageResponse {
  success: Boolean!
  message: String!
}

input ActivatePackageInput {
  did: String!
  package_name: String!
  space: Int!
  duration: Int!
  paid_address: String!
  payment_method: String!
  inapp_transactionid: String!
  app_key: String!
  type: String!
}

type GetCurrentPackageResponse {
  isActive: Boolean!
  packageName: String!
  durationMonths: String!
}

type GetCIDSResponse{
  cidList: [String!]!
}

input GetCurrentPackageInput {
  did: String!
}

type GetFreePlanStatusResponse {
  Ok: Boolean!
}

input GetFreePlanStatusInput {
  did: String!
}

type GetUsedSpaceResponse {
  Ok: String!
}

input GetUsedSpaceInput {
  did: String!
}

type CheckPackageActivateResponse {
  Ok: Boolean!
}

input CheckPackageActivateInput {
  did: String!
}

type CheckPackageExpireResponse {
  Ok: Boolean!
}

input CheckPackageExpireInput {
  did: String!
}

type CheckPackageSpaceResponse {
  Ok: String!
}

input CheckPackageSpaceInput {
  did: String!
}

type ActivatePackageDetails {
  did: String!
  packageName: String!
  space: String!
  createTime: String!
  expireTime: String!
  duration: String!
  usedSpace: String!
  paidAddress: String
  graceExtended: Boolean!
  paymentMethod: String!
  invoiceNo: String!
  inAppTransactionId: String
}

type GetActivatePackageDetailsResponse {
  Ok: ActivatePackageDetails!
}

input GetActivatePackageDetailsInput {
  did: String!
}

type UseSpaceResponse {
  success: Boolean!
  message: String!
}

input UseSpaceInput {
  did: String!
  batch_size: Int!
}

type ActivateFreePlanStatusResponse {
  success: Boolean!
  message: String!
}

input ActivateFreePlanStatusInput {
  did: String!
  status: Boolean!
}

input UserProfileInput {
  email: String
  first_name: String
  last_name: String
  country: String
  phone_number: String
  country_code: String
  description: String
  company_name: String
  company_reg_no: String
  postal_code: String
  city: String
  state: String
  address_1: String
  address_2: String
  account_type: String
}

type UpdateUserProfileResponse {
  success: Boolean!
  message: String!
}

input UpdateUserProfileInput {
  did: String!
  updates: UserProfileInput!
 }
 
type DownloadResponse{
  DID: String!
  URL: String!
}


# Type representing individual BatchData items
type BatchData {
  fileName: String!
  fileHash: String!
  cids: [String!]!
}

# Type representing the entire Batch
type Batch {
  batchHash: String!
  odid: String!
  batchData: [BatchData!]!
}

type CreateShareClaimResponse{
  success: Boolean!
  message: String!
}

# Input type for creating BatchData
input BatchDataInput {
  fileName: String!
  fileHash: String!
  cids: [String!]!
}

# Input type for creating a Batch
input BatchInput {
  batchHash: String!
  odid: String!
  batchData: [BatchDataInput!]!
}

type User {
  id: ID!         # mapped from did
  did: String!
  email: String
  firstName: String
  lastName: String
  country: String
  phoneNumber: String
  countryCode: String
  description: String
  companyName: String
  companyRegNo: String
  postalCode: String
  city: String
  state: String
  address_1: String
  address_2: String
  accountType: String
  profileImage: Bytes
  createdAt: String
}

input UpdatePaidSpaceInput {
  _package: Int!          # Enum value as an integer (uint8)
  _did: String!
  _duration: String!       # Using String for uint256; you may also use Int if appropriate
}

type UpdatePaidSpaceResponse {
  success: Boolean!
  message: String!
  receipt: String            # We'll return the transaction receipt as a string
}


type FileNameData {
  fileHash: String!  # Corresponds to the Protobuf field 'string filePath = 1;'
  fileName: String!  # Corresponds to the Protobuf field 'string fileName = 2;'
  fileType: String!
}

# Represents an array (or list) of file data records.
type FileNameArray {
  fileNameData: [FileNameData!]!  # A non-null list of non-null FileNameData objects.
}

type FileClaimData {
  hash: String!  # Corresponds to the Protobuf field 'string filePath = 1;'
  claim: String!  # Corresponds to the Protobuf field 'string fileName = 2;'
}

# Represents an array (or list) of file data records.
type FileClaimArray {
  fileClaimData: [FileClaimData!]!  # A non-null list of non-null FileNameData objects.
}


type ShareClaimData {
  hash: String!  # Corresponds to the Protobuf field 'string filePath = 1;'
  claim: String!  # Corresponds to the Protobuf field 'string fileName = 2;'
}

# Represents an array (or list) of file data records.
type ShareClaimArray {
  claim: String!  # A non-null list of non-null FileNameData objects.
}


type GetPlanPriceResponse {
  price: Float
}

type ResponseFilePoints{
  did: String!
  total_points: Int!
  added_points: Int!
}

type AddLoginPointsResponse{
  did: String!
  login_count: Int!
  success: Boolean!
}

type SaveUserSeedResponse {
  success: Boolean!
  message: String!
}

input SaveUserSeedInput {
  did: String!
  wallet: String!
  seed: String!
}

type RecoveryUserSeedResponse {
  did: String!
  wallet: String!
}

input RecoveryUserSeedInput {
  seed: String!
}

type IsDocumentUploadedResponse {
  success: Boolean!
  message: String!
}

input IsDocumentUploadedInput {
  did: String!
  doc_type: String!
  doc_id: String
}

type UpdateProfileImageResponse {
  success: Boolean!
  message: String!
  profile_image: Bytes
}

type StatusResponse {
  Response: String!
}

type GetTotalPointResponse{
  totalPoints: Int!
}

input UpdateDocumentByTypeInput {
  did: String!
  newFilehash: String!
  newMerkletreeIndex: Int!
  docType: String!
  docName: String!
  docId: String!
}

type UpdateDocumentByTypeResponse {
  success: Boolean!
  message: String!
}


input ExtendPackageGracePeriodInput {
  did: String!
}

type ExtendPackageGracePeriodResponse {
  success: Boolean!
  message: String!
  }

type DownloadQRResponse{
  Did: String!
  Hash: String!
  SessionID: String!
}

type ShareDownloadQRResponse{
  Did: String!
  Hash: String!
  SessionID: String!
}


type ShareDownloadQRResponse{
  Did: String!
  Hash: String!
  SessionID: String!
}


type DownloadCallBackResponse{
    id: String!
}

type ReferralRewardsResponse{
  did: String!
  referralId: String!
}

type ReferredData {
  referredDid: String!
  addedPoints: Int!
  createdAt: String!
}

type GetReferredDIDSResponse {
  referrerData: [ReferredData!]!
}

type GetReferralPointsResponse{
  points: Int!
}

type GetReferralIDResponse{
  referralId: String!
}

type GetBecxPriceResponse{
  price: String!
}

type Invoice {
  did: String!
  packageName: String!
  space: String!
  createTime: String!
  expireTime: String!
  duration: String!
  usedSpace: String!
  paidAddress: String!
  graceExtended: Boolean!
  paymentMethod: String!
  invoiceNo: String!
  inappTransactionid: String!
}

type GetInvoiceListResponse {
  Ok: [Invoice!]!
}

type DailyUsage {
  day: String!
  daily_usage: Float!
}

type GetUserNetworkUsageResponse {
  daily_usage: [DailyUsage!]!
}

type TopReferral {
  referralID: String!
  totalPoint: Int!
}

type GetTopReferralsResponse {
  topReferrals: [TopReferral!]!
}

type SupportEmailResponse{
  success: Boolean!
  message: String!
}

type DeleteDocResponse {
  success: Boolean!
  message: String!
}

input DeleteDocInput {
  owner_did: String!
  doc_type: String!
  doc_id: String!
}

type GetReferrerRefidFromDidResponse{
  referralID: String!
}

type UpdateReferrerResponse{
  did: String!
  referralID: String!
}

input SecretKeyInput{
  did: String!
}

type SecretKeyResponse{
  secret_key: String!
}

input CheckSeedExistsInput{
  did: String!
}

type CheckSeedExistsResponse{
  success: Boolean!
  message: String!
}

input AccountDeleteInput{
  did: String!
}

type AccountDeleteResponse{
  success: Boolean!
  message: String!
}

input AccountDeleteStatusInput{
  did: String!
}

type AccountDeleteStatusResponse{
  success: Boolean!
  message: String!
}

type ShareLinkResponse {
  downloadLink: String!
  expiresAt: String!
}

type AccountRegistrationResponse{
  success: Boolean!
  message: String!
  did: String!
}

type AdminLoginResponse{
  accessToken: String!
  refreshToken: String!
}

type GetAllUsersResponse{
  status: Boolean!
  message: String!
  count: String!
}

type EmailVerificationStats {
  verifiedCount: Int!
  unverifiedCount: Int!
}

type GetTotalPointResponse {
  totalPoints: Int!
}

type DidPoints {
  did: String!
  total: Int!
}

  
type RetriewStorageUsageResponse{
  status: Boolean!
}

type StorageStats {
  totalallocatedstorge: UInt!
  totaldeallocatedstorage: UInt!
  usedstorage: UInt!
}

type OkInner {
  freetrial: StorageStats!
  basic: StorageStats!
  primary: StorageStats!
  starter: StorageStats!
  advance: StorageStats!
  starterpro: StorageStats!
  advancepro: StorageStats!
  totalstorage: UInt!
}

type OkOuter {
  OkInner: OkInner!
}

type RetriewCurrentStorageResponse {
  currentstorage: UInt!
}

type ActivateFreeTrialResponse {
  status: Boolean!
  message: String!
}

type GetDevicesByTypeResponse{
  type: String!
  count: UInt!
}

type GetDocumentUploadedUsersResponse{
  did: String!
  count: UInt!
  message: String!
}

type GetUsersDocumentUploadedByTypeResponse{
  did: String!
  doctype: String!
  count: UInt!
  dids: [String!]!
  message: String!
}

type GetShareFilesCountResponse{
  did: String!
  sharetype: String!
  count: UInt!
  dids: [String!]!
  message: String!
}

type GetFreeTrialActivatedUserDetailsResponse{
  did: String!
  plan: String!
  message: String!
}

type PackageEvent {
  did: ID!                    # e.g. "did:bethel:main:…"
  package: String!            # e.g. "StarterPro"
  active: Boolean!            # true or false
  create_time: String!       # non‐null
  expire_time: String!       # non‐null
  deactivation_time: String  # null if not deactivated
}

type RetriveAllocationsPerPackageResponse{
  status: String!
  message: String!
  events: [PackageEvent!]!
}

type GetFreetrialStatusResponse{
  status: Boolean!
}

type Package {
  did: ID!              
  package: String!       
  active: Boolean!       
  create_time: String! 
  expire_time: String!  
  deactivation_time: String
}

type DataEntry {
  did: ID!
  packages: [Package!]!
}

type RetriveAllocationFlagsPerDidResponse{
  status: String!
  message: String!
  data: [Package!]!
}

type RetrieveAllAllocationFlagsResponse{
  status: String!
  message: String!
  data: [DataEntry!]!
}

type Folder{
  id: Int!
  name: String!
  path: String!
  parent_id: Int!
}

type CreateFolderResponse{
  success: Boolean!
  failed: Boolean!
  message: String!
  folder: Folder!
}

type GetAllFoldersByUserResponse{
  success: Boolean!
  failed: Boolean!
  message: String!
  did: String!
  folders: [Folder]!
}

type Files{
  folder_id: Int!
  batchhash: String!
  filehash: String!
  path: String!
  name: String!
}

type GetAllFilesByUserResponse{
  success: Boolean!
  failed: Boolean!
  message: String!
  did: String!
  files: [Files]!
}

###########################################################

type Filee {
  folder_id: ID!
  path: String!
  name: String!
}

type Folderr {
  id: ID!
  name: String!
  path: String!
  parent_id: ID!
  children: [Folder]  # recursive self-reference for subfolders
  files: [Filee]
}

type GetUserFoldersResponse {
  success: Boolean!
  failed: Boolean!
  message: String!
  did: String!
  folders: [Folderr]
}

type BatchInfoWithPathMapped {
  ownerDid: String!
  batchhash: String!
  filesCount: Int!
  batchSize: Int!
  verified: Boolean!
  path: String
  fileHashes: [String!]!
  deletedFilesCount: Int!
}

type GetAllBatchesWithFilePathsResponse{
  success: Boolean!
  message: String!
  batches: [BatchInfoWithPathMapped!]!
}

###########################################################

type DeleteFoldersByIdResponse{
  success: Boolean!
  message: String!
}

type GetTotalFilesOfTheSystemResponse{
  success: Boolean!
  message: String!
  count: Int!
}

type TotalPlanActivatedUsersResponse{
  success: Boolean!
  message: String!
  free: Int!
  paid: Int!
}

type TotalPaidPlanActivatedUsersResponse{
  success: Boolean!
  message: String!
  count: Int!
}

type ActivePackageCountResponse{
  success: Boolean!
  message: String!
  count: Int!
}

type DeleteFileInFolderResponse{
  success: Boolean!
  message: String!
}

type RenameFolderResponse{
  success: Boolean!
  message: String!
}

type FileVersionEntry {
  version: Int!
  filehash: String!
}

type GetFileVersionListResponse {
  success: Boolean!
  message: String!
  versions: [FileVersionEntry!]!
}

type GetOldFileResponse {
  success: Boolean!
  message: String!
  index: Int
}

  type Query {
    getUserById(id: ID!): User
    getClaimById(id: ID!): Claim
    getLogs(did: String, pageSize: Int, pagingState: String): GetLogsResponse
    getUserActivityLogs(did: String, pageSize: Int, pageNumber: Int): GetUserActivityLogsResponse
    getUserSignInBethel: UserSignInBethelResponse
    getCreateIdentity: CreateIdentityResponse
    getUserClaim(did: String!): GetUserClaimResponse
    isUserRegistered(DID: String): IsUserRegisteredResponse
    IsDocumentUploaded(input: IsDocumentUploadedInput!): IsDocumentUploadedResponse!

    GetFileVersionList(did: String!, filehash: String): GetFileVersionListResponse
    GetFileVersionListReverse(did: String!, filehash: String): GetFileVersionListResponse
    GetOldFile(did: String!, filehash: String!, version: Int!): GetOldFileResponse


    getEmailVerificationStats: EmailVerificationStats!
    getProfilesCount: Int!
    getProfilePicturesCount: Int!
    getAccountBackupsCount: Int!
    distinctReferralCount: Int!
    getTotalPointsAdmin(did: String!): GetTotalPointResponse!
    getAllPoints: [DidPoints!]!

    # Moved getEmailVerificationStatus to Query
    getEmailVerificationStatus(did: String!): GetEmailVerificationStatusResponse!

    getUserNetworkUsage(did: String!): GetUserNetworkUsageResponse!
    CheckFileVerifyStatus(did: String!, batch_hash: String!): Boolean!

    # Onchain Request
    isUserAddedOnChain(did: String): IsUserAddedOnChainResponse
    isUserExistsOnChain(did: String): IsUserExistsOnChainResponse
    getBatchFile(input: GetBatchFileInput!): GetBatchFileResponse!
    getDocFile(input: GetDocFileInput!): GetDocFileResponse!
    getTotalFilesCountSize(input: GetTotalFilesCountSizeInput!): GetTotalFilesCountSizeResponse!
    getAllBatches(input: GetAllBatchesInput!): GetAllBatchesResponse!
    getBatchFileDetails(input: GetBatchFileDetailsInput!): GetBatchFileDetailsResponse!
    getAllSharedFiles(input: GetAllSharedFilesInput!): GetAllSharedFilesResponse!
    getSharedFile(input: GetSharedFileInput!): GetSharedFileResponse!

    RecoveryUserSeed(seed: String!): RecoveryUserSeedResponse!

    GetSecretKey(input: SecretKeyInput!): SecretKeyResponse!

    CheckSeedExists(input: CheckSeedExistsInput!): CheckSeedExistsResponse!

    AccountDeleteStatus(input: AccountDeleteStatusInput!): AccountDeleteStatusResponse!

    # Onchain Package Details
    getCurrentPackage(input: GetCurrentPackageInput!): GetCurrentPackageResponse!
    getFreePlanStatus(input: GetFreePlanStatusInput!): GetFreePlanStatusResponse!
    getUsedSpace(input: GetUsedSpaceInput!): GetUsedSpaceResponse!
    checkPackageActivate(input: CheckPackageActivateInput!): CheckPackageActivateResponse!
    checkPackageExpire(input: CheckPackageExpireInput!): CheckPackageExpireResponse!
    checkPackageSpace(input: CheckPackageSpaceInput!): CheckPackageSpaceResponse!
    getActivatePackageDetails(input: GetActivatePackageDetailsInput!): GetActivatePackageDetailsResponse!
    getInvoiceList(did: String!): GetInvoiceListResponse!

    # Get cid list
    getCIDS(index: Int!, did: String!): GetCIDSResponse!
    
    getUserProfile(did: String!): User
    getFileNames(did: String!, batchHash: String!): FileNameArray!
    getPlanPrice(did: String!, plan: String!, month: Int!): GetPlanPriceResponse!
    getFileCliam(did: String!): FileClaimArray!
    getShareCliam(did: String!, batchhash: String!): ShareClaimArray!
    getFileCliamByHash(did: String!, batchhash: String!): GetFileClaimResponse!
    getShareCliamByHash(did: String!, batchhash: String!): GetFileClaimResponse!
    getDocClaim(did: String!, batchhash: String!, doctype: String!): GetDocClaimResponse!
    getSignInStatus(sessionId: String!): StatusResponse!
    getTotalPoints(did: String!): GetTotalPointResponse!

    getDownloadQR(did: String!, batchHash: String!): DownloadQRResponse!
    getDownloadStatus(sessionId: String!): StatusResponse!
    getGetReferredDIDS(did: String!): GetReferredDIDSResponse!
    getReferralPoints(referralId: String!): GetReferralPointsResponse!
    getUserReferralID(did: String!): GetReferralIDResponse!
    getBecxPrice: GetBecxPriceResponse!
    getTopReferrals: GetTopReferralsResponse!
    getReferrerRefidFromDid(did: String!): GetReferrerRefidFromDidResponse!

    getShareDownloadQR(did: String!, batchHash: String!): ShareDownloadQRResponse!
    getShareDownloadStatus(sessionId: String!): StatusResponse!
    RetriewStorageUsage(did: String!): OkOuter!
    RetiewCurrentStorage(did: String!): RetriewCurrentStorageResponse!
    GetRegisteredDevicesByType(did: String!, devicetype: String!): GetDevicesByTypeResponse!
    GetDocumentUploadedUsers(did: String!): GetDocumentUploadedUsersResponse!
    GetUsersDocumentUploadedByType(did: String!, doctype: String!): GetUsersDocumentUploadedByTypeResponse!
    GetShareFilesCount(did: String!, sharetype: String!): GetShareFilesCountResponse!
    GetFreeTrialActivatedUserDetails(did: String!): GetFreeTrialActivatedUserDetailsResponse!
    RetriveAllocationsPerPackage(did: String!, packagetype: String!): RetriveAllocationsPerPackageResponse!
    GetFreetrialStatus(did: String!): GetFreetrialStatusResponse!
    RetriveAllocationFlagsPerDid(admindid: String!, userdid: String!): RetriveAllocationFlagsPerDidResponse!
    RetrieveAllAllocationFlags(did: String!): RetrieveAllAllocationFlagsResponse!
    GetAllFoldersByUser(did: String!): GetAllFoldersByUserResponse!
    GetAllFilesByUser(did: String!): GetAllFilesByUserResponse!
    # GetFullyMappedUserFolders(did: String!): GetUserFoldersResponse!
    GetAllBatchesWithFilePaths(did: String!): GetAllBatchesWithFilePathsResponse!
    GetTotalFilesOfTheSystem(did: String!): GetTotalFilesOfTheSystemResponse!
    TotalPlanActivatedUsers(did: String!): TotalPlanActivatedUsersResponse!
    TotalPaidPlanActivatedUsers(did: String!): TotalPaidPlanActivatedUsersResponse!
    ActivePackageCount(did: String!): ActivePackageCountResponse!
  }



  type Mutation {
    createUserByDID(owner_did: String!, referral_id: String, mobile_device_type: String!): UserRegistration
    createUserClaim(owner_did: String!): Owner

    addChainUser(did: String!): AddUserChainResponse
    updateUserProfile(input: UpdateUserProfileInput!): UpdateUserProfileResponse!
    AccountDelete(did: String!): AccountDeleteResponse!

    uploadFileBatchOnchain(
      owner_did: String!
      batch_hash: String!
      files_count: Int!
      files: [File!]!
      batch_size: Int!
    ): UploadFileBatchChainResponse

    uploadFileBatchOnchainDoc(
    owner_did: String!
    filehash: String!
    merkletree_index: Int!
    doc_type: String!
    doc_name: String!
    doc_id: String!
    ): UploadFileBatchOnchainDocResponse

    updateFileVerifyStatus(
      owner_did: String!
      batch_hash: String!
    ): UpdateFileVerifyResponse



    deleteFile(input: DeleteFileInput!): DeleteFileResponse!
    deleteDoc(input: DeleteDocInput!): DeleteDocResponse!

    shareFile(input: ShareFileInput!): ShareFileResponse!
    updateSharedFileVerifyStatus(input: UpdateSharedFileVerifyStatusInput!): UpdateSharedFileVerifyStatusResponse!

    callBack(DID: String!, ProofID: String!, SessionID: String!): BethelCallBackResponse
    verifyProof(DID: String!, ProofID: String!): VerifyProofResponse
    generateProof(DID: String!, Claim: String!): GenerateProofResponse
    uploadFiles(files: [Upload!]!, did: String!, doctype: String, dockname: String, docid: String, path: String): CreateFileClaimResponse!
    UpdateDocumentByType(input: UpdateDocumentByTypeInput!): UpdateDocumentByTypeResponse!

    # Package Details
    activatePackage(input: ActivatePackageInput!): ActivatePackageResponse!
    useSpace(input: UseSpaceInput!): UseSpaceResponse!
    activateFreePlanStatus(input: ActivateFreePlanStatusInput!): ActivateFreePlanStatusResponse!
    updatePaidSpace(input: UpdatePaidSpaceInput!): UpdatePaidSpaceResponse!

    # User Seed
    SaveUserSeed(input: SaveUserSeedInput!): SaveUserSeedResponse!

    # Email Verification Mutations
    saveEmailVerify(input: SaveEmailVerifyInput!): SaveEmailVerifyResponse!
    confirmEmailVerification(token: String!): ConfirmEmailVerificationResponse!
    resendEmailVerification(did: String!): ResendEmailVerificationResponse!

    # Download
    downloadFile(batchHash: String!, fileHash: String!, fileName: String!, did: String!, cids:[String!]!): DownloadResponse!
    downloadBatch(input: BatchInput!): DownloadResponse!
    shareClaim(owner_did: String!, shared_did: String!, batchhash: String!, filehash: String!, filename: String!): CreateShareClaimResponse!
    addFilePoints(did: String!, file_count: Int!): ResponseFilePoints!
    addLoginPoints(did: String!): AddLoginPointsResponse!
    uploadDocuments(files: [Upload!]!, did: String!, doctype: String): CreateFileClaimResponse!

    updateUserProfilePic(did: String!, file: [Upload!]): UpdateProfileImageResponse!

    extendPackageGracePeriod(input: ExtendPackageGracePeriodInput!): ExtendPackageGracePeriodResponse!
    downloadCallBack(DID: String!, ProofID: String!, SessionID: String!): DownloadCallBackResponse
    createReferralRewardsProfile(did: String!, email: String!): ReferralRewardsResponse!
    updateDocuments(files: [Upload!]!, did: String!, docname: String!, doctype: String!, docid: String!, path: String!): CreateFileClaimResponse!
    sendSupportEmail(name: String!, email: String!, phone: String!, subject: String!, body: String!): SupportEmailResponse!
    updateReferrer(did: String!, referralID: String!): UpdateReferrerResponse!
    CreateShareLink(did: String!, cid: String!, expiresInMinutes: Int!, fileName: String!): ShareLinkResponse!
    shareDownloadCallBack(DID: String!, ProofID: String!, SessionID: String!): DownloadCallBackResponse
    AdminRegistration(did: String!, password: String!): AccountRegistrationResponse!
    AdminLogin(did: String!, password: String!): AdminLoginResponse!
    GetAllUsersCount(did: String!): GetAllUsersResponse!
    GetAllUsersCountFromTo(did: String!, from: String!, to: String): GetAllUsersResponse!
    ActivateFreeTrial(did: String!): ActivateFreeTrialResponse!
    CreateFolder(did: String!, parent: String, name: String!): CreateFolderResponse!
    DeleteFoldersById(did: String!, folder_id: String!): DeleteFoldersByIdResponse!
    DeleteFileInFolder(did: String!, folder_id: String!, file_hash: String!): DeleteFileInFolderResponse!
    RenameFolder(did: String!, folder_id: Int!, new_name: String!): RenameFolderResponse!
    updateFile(files: [Upload!]!, did: String!, doctype: String, dockname: String, docid: String, path: String, prefilehash: String!, prebatchhash: String!): UpdateFileResponse!
   }
`;
