
# DISTRIBUTED NOTIFICATION SYSTEM
# Gateway Monorepo

This repository serves as the central gateway for managing distributed notification, rendering, and communication services within the system. It provides a unified interface for routing API requests, managing templates, and dispatching messages through various channels such as email, queue, and SMS.


# HNG BACKEND Stage 4 GROUP PROJECT CONTRIBUTORS

## ideategudy Contribution 

## Obianuju Contribution 

## Wilsonide Contribution 

## Promise Eguh Contribution 
- *** Email Server Live URL ***:https://hng-be-stage-4-emailserver.onrender.com
- *** Email Server DOC URL ***:https://hng-be-stage-4-emailserver.onrender.com/docs
- *** Templates Server Live URL ***:https://hng-be-stage-4-production.up.railway.app
- *** Templates Server DOC URL ***:https://hng-be-stage-4-production.up.railway.app/docs
- *** Email Server Repository URL ***:https://github.com/Avan-Kel/HNG-BE-STAGE-4-emailServer.git
- *** Templates Server Repository URL ***:https://github.com/Avan-Kel/HNG-BE-STAGE-4.git

# Overview

- The Gateway Monorepo ties together multiple microservices that handle:
- Template Management – CRUD operations for notification templates.
- Rendering Engine – Dynamically renders message templates using variable data.
- Notification Dispatcher – Publishes and routes notifications via RabbitMQ or other message queues.
- Email Gateway – Handles SMTP-based email delivery.
- Queue Gateway – Pushes notifications into worker queues for background processing.

Each module is built to work independently but communicates via well-defined APIs and message queues.

# Tech Stack

- FastAPI – Core API framework
- Typescript 
- PostgreSQL – Template and metadata storage
- SQLAlchemy – ORM for database interactions
- RabbitMQ – Message queue for async notification delivery
- Pydantic – Schema validation
- Docker – Containerized service environment
- Swagger UI – Built-in API documentation