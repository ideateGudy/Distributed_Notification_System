# API Gateway - Distributed Notification System

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <strong>Main entry point for the Distributed Notification System microservices architecture</strong>
</p>

## ��� Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Request/Response Format](#requestresponse-format)
- [Error Handling](#error-handling)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

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
    └──────────┘   └─────────────┘
                                                                ┌───▼──────┐
                                                                │ User    │
                                                                │ Service  │
                                                                └──────────┘
```

### Module Structure

```
src/
├── common/                 # Shared utilities & middleware
│   ├── controllers/       # Global controllers (root)
│   ├── filters/          # HTTP exception filters
│   ├── interceptors/     # Response/error interceptors
│   ├── middleware/       # Correlation ID middleware
│   └── utils/            # Case conversion utilities
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
- npm or yarn
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
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database & Cache
REDIS_URL=redis://:password@host:port/db
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Message Queue
RABBITMQ_URI=amqp://user:password@host:5672
RABBITMQ_EXCHANGE=notifications

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h

# Services (for inter-service communication)
USER_SERVICE_URL=http://user-service:3001
TEMPLATE_SERVICE_URL=http://template-service:3002
EMAIL_SERVICE_URL=http://email-service:3003
PUSH_SERVICE_URL=http://push-service:3004

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
```

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
  "timestamp": "2025-11-13T10:35:00Z"
}
```

**Status Values:**

- `pending` - Queued for delivery
- `processing` - Being processed
- `delivered` - Successfully delivered
- `failed` - Delivery failed

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Notification status updated to delivered",
  "data": {
    "notification_id": "550e8400-e29b-41d4-a716-446655440002",
    "status": "delivered",
    "updated_at": "2025-11-13T10:35:00Z"
  }
}
```

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

### Health Check

```http
GET /api/v1/health
```

---

## ��� Authentication

Uses JWT tokens. Get a token by logging in:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Use token in Authorization header:

```bash
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/v1/users/me
```

## ��� Request/Response Format

### Standard Response

```json
{
  "success": true,
  "message": "Success message",
  "data": { },
  "meta": { }
}
```

### Pagination

```http
GET /api/v1/email/status?page=1&limit=20
```

Meta includes: `total`, `limit`, `page`, `total_pages`, `has_next`, `has_previous`

## ⚠️ Error Handling

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE"
}
```

### HTTP Status Codes

- 200: OK
- 201: Created
- 202: Accepted (async)
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Server Error

## ⚙️ Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Environment (development/production) |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRATION` | Token expiration time |
| `REDIS_URL` | Redis connection string |
| `RABBITMQ_URI` | RabbitMQ connection URI |
| `USER_SERVICE_URL` | User service endpoint |
| `TEMPLATE_SERVICE_URL` | Template service endpoint |
| `EMAIL_SERVICE_URL` | Email service endpoint |
| `PUSH_SERVICE_URL` | Push service endpoint |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) |

## ���️ Development

### Quick Start

```bash
npm install
npm run start:dev
```

### Available Commands

```bash
npm run build          # Build TypeScript
npm run start          # Start production
npm run start:dev      # Start with hot reload
npm run start:debug    # Start with debugger
npm run lint           # Run ESLint
npm run format         # Format with Prettier
npm run test           # Run tests
npm run test:e2e       # Run e2e tests
npm run test:cov       # Coverage report
```

## ��� Deployment

### Docker Build

```bash
docker build -t api-gateway:latest .
docker run -p 3000:3000 \
  -e JWT_SECRET=secret \
  -e REDIS_URL=redis://... \
  -e RABBITMQ_URI=amqp://... \
  api-gateway:latest
```

### Production Checklist

- ✅ Set `NODE_ENV=production`
- ✅ Configure all environment variables
- ✅ Set strong `JWT_SECRET`
- ✅ Enable Redis persistence
- ✅ Configure RabbitMQ for high availability
- ✅ Set up monitoring and logging

## ��� API Documentation

Access interactive Swagger UI at: **`http://localhost:3000/docs`**

Features:

- Live endpoint testing
- Request/response examples
- Parameter documentation
- Error descriptions
- Authentication setup

## ��� Contributing

### Code Standards

- TypeScript strict mode
- Prettier formatting
- ESLint linting
- snake_case for APIs
- camelCase for code

### Commit Format

```
type(scope): description

feat(auth): add oauth
fix(notifications): fix duplicate
docs(api): update examples
```

## ��� License

Part of the Distributed Notification System. See root LICENSE file.

---

**Last Updated**: November 2025  
**Maintained by**: HNG Development Team
