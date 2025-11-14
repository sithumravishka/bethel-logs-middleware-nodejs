# GraphQL API Documentation

## Overview
This GraphQL API provides access to package management, user analytics, and system file operations. All operations require proper authentication and accept a decentralized identifier (DID) as a parameter.

## Authentication
All requests must include the following headers:
- **Authorization**: `Bearer {token}`
- **x-device**: Device identifier (e.g., `MSI`)
- **x-forwarded-for**: Client IP address (e.g., `192.168.1.48`)

## Base URL
```
https://test.bethel.network/api/v1
```

## Data Types

### DID (Decentralized Identifier)
* **Format**: `did:bethel:main:{uuid}`.

* **Example**: `did:bethel:main:5aac1da3-da22-4093-aeec-e86b4436dc23`

* **Validation**: Must follow the exact pattern with a valid UUID

* **Length**: 52 characters

---

## Operations

### 1. ActivePackageCount

Retrieves the count of active packages for a given DID.

#### Query
```graphql
query ActivePackageCount($did: String!) {
  ActivePackageCount(did: $did) {
    success
    message
    count
  }
}
```

#### Parameters
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `did`     | String | Yes      | Decentralized identifier following the format `did:bethel:main:{uuid}` |

#### Response
```json
{
  "data": {
    "ActivePackageCount": {
      "success": true,
      "message": "Retrieve active package count successful.",
      "count": 1
    }
  }
}
```

#### Response Fields
| Field     | Type    | Description |
|-----------|---------|-------------|
| `success` | Boolean | Indicates if the operation was successful |
| `message` | String  | Human-readable status message |
| `count`   | Integer | Number of active packages |

#### Example Request
```bash
curl -X POST https://test.bethel.network/api/v1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-device: MSI" \
  -H "x-forwarded-for: 192.168.1.48" \
  -d '{
    "query": "query ActivePackageCount($did: String!) { ActivePackageCount(did: $did) { success message count } }",
    "variables": {
      "did": "did:bethel:main:5aac1da3-da22-4093-aeec-e86b4436dc23"
    }
  }'
```

---

### 2. TotalPlanActivatedUsers

Retrieves the total count of activated users by plan type (free and paid).

#### Query
```graphql
query TotalPlanActivatedUsers($did: String!) {
  TotalPlanActivatedUsers(did: $did) {
    success
    message
    free
    paid
  }
}
```

#### Parameters
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `did`     | String | Yes      | Decentralized identifier following the format `did:bethel:main:{uuid}` |

#### Response
```json
{
  "data": {
    "TotalPlanActivatedUsers": {
      "success": true,
      "message": "Retrieve all plan count getting successful.",
      "free": 1,
      "paid": 1
    }
  }
}
```

#### Response Fields
| Field     | Type    | Description |
|-----------|---------|-------------|
| `success` | Boolean | Indicates if the operation was successful |
| `message` | String  | Human-readable status message |
| `free`    | Integer | Number of users on free plans |
| `paid`    | Integer | Number of users on paid plans |

#### Example Request
```bash
curl -X POST https://test.bethel.network/api/v1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-device: MSI" \
  -H "x-forwarded-for: 192.168.1.48" \
  -d '{
    "query": "query TotalPlanActivatedUsers($did: String!) { TotalPlanActivatedUsers(did: $did) { success message free paid } }",
    "variables": {
      "did": "did:bethel:main:5aac1da3-da22-4093-aeec-e86b4436dc23"
    }
  }'
```

---

### 3. GetTotalFilesOfTheSystem

Retrieves the total count of files in the system. **Note**: This operation may return success=false even when providing valid data.

#### Query
```graphql
query GetTotalFilesOfTheSystem($did: String!) {
  GetTotalFilesOfTheSystem(did: $did) {
    success
    message
    count
  }
}
```

#### Parameters
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `did`     | String | Yes      | Decentralized identifier following the format `did:bethel:main:{uuid}` |

#### Response
```json
{
  "data": {
    "GetTotalFilesOfTheSystem": {
      "success": false,
      "message": "Retrieve All files of the system successfully.",
      "count": 979
    }
  }
}
```

#### Response Fields
| Field     | Type    | Description |
|-----------|---------|-------------|
| `success` | Boolean | Operation status (may be false even for successful data retrieval) |
| `message` | String  | Human-readable status message |
| `count`   | Integer | Total number of files in the system |

#### Example Request
```bash
curl -X POST https://test.bethel.network/api/v1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-device: MSI" \
  -H "x-forwarded-for: 192.168.1.48" \
  -d '{
    "query": "query GetTotalFilesOfTheSystem($did: String!) { GetTotalFilesOfTheSystem(did: $did) { success message count } }",
    "variables": {
      "did": "did:bethel:main:5aac1da3-da22-4093-aeec-e86b4436dc23"
    }
  }'
```

---

## Validation Rules

### DID Parameter Validation
The `did` parameter must conform to the following specification:

- **Pattern**: `did:bethel:main:{uuid}`
- **Length**: Exactly 57 characters
- **Format**: 
  - Prefix: `did:bethel:main:` (16 characters)
  - UUID: Standard UUID format with hyphens (36 characters)
  - Total: 52 characters
- **Example**: `did:bethel:main:5aac1da3-da22-4093-aeec-e86b4436dc23`

#### Invalid DID Examples
```
❌ did:bethel:main:invalid-uuid
❌ did:bethel:test:5aac1da3-da22-4093-aeec-e86b4436dc23
❌ bethel:main:5aac1da3-da22-4093-aeec-e86b4436dc23
❌ did:bethel:main:5aac1da3da224093aeece86b4436dc23
```

#### Valid DID Example
```
✅ did:bethel:main:5aac1da3-da22-4093-aeec-e86b4436dc23
```

---

## Error Handling

### Common Error Responses

#### Missing Headers

```json
{
  "errors": [
    {
      "message": "Missing or invalid Authorization header"
    }
  ],
  "data": null
}
```
```json
{
  "errors": [
    {
      "message": "Missing x-device header"
    }
  ],
  "data": null
}
```

```json
{
  "errors": [
    {
      "message": "Missing x-forwarded-for header and IP address is not available"
    }
  ],
  "data": null
}
```