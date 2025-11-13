# API Gateway - Distributed Notification System

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <strong>Main entry point for the Distributed Notification System microservices architecture</strong>
</p>

## ��� Overview

The **API Gateway** is the central hub of the Distributed Notification System. It serves as:

- **Single Entry Point**: Routes all external client requests to appropriate microservices
- **Authentication Layer**: Validates JWT tokens and manages user authentication
- **Message Broker**: Handles asynchronous notification delivery through RabbitMQ
- **Caching Layer**: Uses Redis to cache notification data and improve performance
- **Rate Limiting**: Protects services from overload with intelligent rate limiting
- **Logging & Monitoring**: Comprehensive logging with Winston and correlation IDs

### Tech Stack

- **Framework**: NestJS with FastifyAdapter
- **Language**: TypeScript
- **Message Broker**: RabbitMQ (amqplib, amqp-connection-manager)
- **Cache**: Redis (via Keyv Redis adapter)
- **Authentication**: JWT (Passport.js)
- **Validation**: class-validator & class-transformer
- **Logging**: Winston with daily rotation
- **API Documentation**: Swagger/OpenAPI

## ���️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Clients                              │
│                  (Web, Mobile, Third-party)                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    API Gateway (Port 3000)
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    ┌───▼─────┐      ┌─────▼─────┐     ┌────▼──────┐
    │ RabbitMQ│      │   Redis   │     │  Logger   │
    │ (Queue) │      │ (Cache)   │     │  (Winston)│
    └─────────┘      └───────────┘     └───────────┘
        │                  │
        └──────────────────┼──────────────────┐─────────────────────────|
        │                  │                  │                         |
    ┌───▼──────┐   ┌──────▼──────┐   ┌──────▼────────┐                  |
    │ Email    │   │ Push        │   │ Template      │                  |
    │ Service  │   │ Service     │   │ Service       │                  |
    └──────────┘   └─────────────┘   └───────────────┘                  |
        │                  │                                            |
    ┌───▼──────┐   ┌──────▼──────┐                                      |
    │ SMTP     │   │ FCM/APNs    │                                      |
    │ Provider │   │ (External)  │                                      |
    └──────────┘   └─────────────┘                                      |
                                                                    ┌───▼──────┐
                                                                    │ User    │
                                                                    │ Service  │
                                                                    └──────────┘
```

### Module Structure

```json
src/
├── common/                 # Shared utilities & middleware
│   ├── controllers/       # Global controllers (root)
│   ├── filters/          # HTTP exception filters
│   ├── interceptors/     # Response/error interceptors
│   ├── utils/            # Case conversion utilities
│
├── config/               # Configuration management
│   ├── config.ts        # Environment config loader
│   └── config.schema.ts # Validation schema
├── modules/              # Feature modules
│   ├── auth/            # Authentication (JWT, Register, Login)
│   ├── notifications/   # Core notification processing
│   ├── users/           # User management & push tokens
│   ├── templates/       # Notification templates
│   ├── health/          # Health check endpoints
│   ├── redis/           # Redis connection pool
│   ├── rabbitmq/        # Message queue integration
│   └── logger/          # Centralized logging
├── app.module.ts        # Root module
└── main.ts              # Bootstrap & configuration
```

## ��� Quick Start

### Prerequisites

- Node.js 18+
- npm
- Redis instance (Upstash or local)
- RabbitMQ instance
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# See Configuration section below
``

### Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API Gateway will start on `http://localhost:3000` and Swagger docs will be available at `http://localhost:3000/docs`.

## ��� API Endpoints

All endpoints are prefixed with `/api/v1`. Access the interactive API documentation at `/docs` (Swagger UI).

### Authentication Endpoints

#### 1. Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
    "preferences": {
    "email": true,
    "push": true
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### 2. Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

---

### Notification Endpoints

#### 1. Send Notification

```http
POST /api/v1/notifications
Authorization: Bearer {jwt_token}
X-Request-Id: {optional-idempotency-key}
Content-Type: application/json

{
  "notification_type": "email",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "template_code": "email_verification",
  "variables": {
    "name": "John Doe",
    "link": "https://example.com/verify?token=abc123",
    "meta": {
      "verification_code": "123456"
    }
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440001",
  "priority": 1,
  "metadata": {
    "campaign_id": "camp_123",
    "source": "website"
  }
}
```

**Response (202 Accepted):**

```json
{
  "success": true,
  "message": "Notification accepted for processing",
  "data": {
    "notification_id": "550e8400-e29b-41d4-a716-446655440002",
    "status": "pending",
    "created_at": "2025-11-13T10:30:00Z"
  }
}
```

**Notification Types:**

- `email` - Send email notifications
- `push` - Send push notifications

#### 2. Get Notification Status

```http
GET /api/v1/notifications/status?notification_id=550e8400-e29b-41d4-a716-446655440002
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Status retrieved successfully",
  "data": {
    "notification_id": "550e8400-e29b-41d4-a716-446655440002",
    "status": "delivered",
    "created_at": "2025-11-13T10:30:00Z",
    "updated_at": "2025-11-13T10:35:00Z"
  }
}
```

#### 3. Get Notifications by Type (Paginated)

```http
GET /api/v1/email/status?page=1&limit=10
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Retrieved email notifications for current user",
  "data": [
    {
      "notification_id": "550e8400-e29b-41d4-a716-446655440002",
      "status": "delivered",
      "created_at": "2025-11-13T10:30:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "limit": 10,
    "page": 1,
    "total_pages": 3,
    "has_next": true,
    "has_previous": false
  }
}
```

#### 4. Update Notification Status (Service-to-Service)

```http
POST /api/v1/email/status
Content-Type: application/json

{
  "notification_id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "delivered",
}
```

**Status Values:**

- `pending` - Queued for delivery
- `processing` - Being processed
- `delivered` - Successfully delivered
- `failed` - Delivery failed
- `bounced` - Email bounced (invalid recipient)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Notification status updated to delivered",
  "data": {
    "notification_id": "550e8400-e29b-41d4-a716-446655440002",
    "status": "delivered",
    "timestamp": "2025-11-13T10:35:00Z"
  }
}
```

#### 5. TEST: Emit Status Update to Queue

Test endpoint to emit a status update to RabbitMQ. This simulates what consumer services (Email, Push) publish. The status listener will receive it from `status.queue` and update Redis cache automatically.

```http
POST /api/v1/test/emit-status-update
Content-Type: application/json

{
  "notification_id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "delivered",
  "timestamp": "2025-11-13T10:35:00Z"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Status update emitted to queue (check listener logs to verify callback executed)",
  "data": {
    "notification_id": "550e8400-e29b-41d4-a716-446655440002",
    "status": "delivered",
    "timestamp": "2025-11-13T10:35:00Z"
  }
}
```

**What Happens Behind the Scenes:**
1. Status update is published to RabbitMQ with routing key `status.update`
2. Exchange `notifications.direct` routes it to `status.queue`
3. Status listener (in `RabbitMQService`) consumes from `status.queue`
4. Callback function (in `NotificationService.onModuleInit()`) automatically fires
5. Callback retrieves existing notification status from Redis
6. Updates status from `queued` → new status (e.g., `delivered`)
7. Updates Redis cache with new status and `updated_at` timestamp
8. Message is acknowledged (removed from queue)

**Verify the Update:**
```http
GET /api/v1/notifications/status?notification_id=550e8400-e29b-41d4-a716-446655440002
Authorization: Bearer {jwt_token}
```

The response should show the updated status instead of `queued`.

---

### User Endpoints

#### 1. Get All Users

```http
GET /api/v1/users
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "name": "John Doe",
      "preferences": {
        "allow_emails": true,
        "allow_push": true
      }
    }
  ],
  "message": "Users fetched successfully"
}
```

#### 2. Get Current User

```http
GET /api/v1/users/me
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "message": "Current user fetched successfully"
}
```

#### 3. Update User

```http
PATCH /api/v1/users/{user_id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "John Smith",
  "preferences": { "allow_emails": false, "allow_push": true }
}
```

#### 4. Get Push Tokens

```http
GET /api/v1/users/{user_id}/push-tokens
Authorization: Bearer {jwt_token}
```

#### 5. Create Push Token

```http
POST /api/v1/users/{user_id}/push-tokens
Authorization: Bearer {jwt_token}
Content-Type: application/json

{ "token": "ExponentPushToken[...]" }
```

---

### Health Check for all microservices

```http
GET /api/v1/health
```

---

## Rate Limiting

The API Gateway enforces rate limiting to protect against abuse and ensure fair resource usage across all clients.

### Configuration

- **Limit**: 100 requests per 15 minutes per IP address
- **Response on limit exceeded**: HTTP 429 (Too Many Requests)
- **Scope**: Applied globally to all endpoints

### Rate Limit Headers

All responses include rate limit information in headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2024-01-15T10:30:00Z
```

### Rate Limited Response

When the rate limit is exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 45

{
  "success": false,
  "message": "Rate limit exceeded",
  "error": "Too many requests from this IP address",
  "meta": {
    "retryAfter": 45,
    "resetTime": "2024-01-15T10:30:00Z"
  }
}
```

