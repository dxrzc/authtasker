# Authtasker
Backend API for user authentication and task management with session-based auth, role authorization and caching.

## Overview
Authtasker is a backend service that allows users to authenticate securely and manage tasks with priorities and statuses.
This project focuses on authentication flows, authorization, and backend fundamentals, rather than UI or frontend concerns.

## Tech Stack
- Node.js
- Express
- MongoDB
- Redis
- Docker
- Kubernetes (local deployment)

## Core Features
- User authentication with short-lived session tokens and refresh tokens.
- Session management with refresh token limits.
- Role-based authorization (readonly, editor, admin).
- Email-based flows (verification and password recovery).
- Task management with status and priority.
- Redis caching and rate limiting.
- Secure password handling and input validation.
- Logging and error handling.

## API Documentation
The full API documentation is available via Swagger at the `/api-docs` endpoint when running the application locally.

##  Architecture & Design.
- A session-based authentication model with short-lived access tokens and refresh tokens is used to enable secure and controllable sessions.
- Authentication logic is kept explicit at the application level to simplify session invalidation and authorization.
- Role-based authorization controls access to protected resources.
- Redis is used for caching and rate limiting.
- Docker is used to ensure consistent environments.
- Kubernetes is included only for local experimentation.

## How to run locally
```bash
git clone https://github.com/dxrzc/authtasker.git
cd authtasker
npm run dev
```
> [!NOTE]
> Docker must be running locally, as the project relies on Docker Compose.

## Testing
The project includes:
- Unit tests.
- Integration tests.

Tests are executed automatically in the CI pipeline.

## Local Kubernetes Deployment (Optional)

This project includes a basic Kubernetes setup intended for **local experimentation**.
It is **not required** to run the application.

### Requirements
- Docker
- kubectl
- minikube

### Steps

```bash
minikube start --nodes 2
minikube addons enable storage-provisioner-rancher

docker build --target production -t authtasker:prod .
minikube image load authtasker:prod

kubectl apply -k k8s/overlays/dev
kubectl port-forward service/authtasker-svc 3001:3000
```
The API will be available at: `http://localhost:3001`.

## What I’d improve next

- Add end-to-end (e2e) tests to cover critical user flows.
- Implement CI pipelines to build and publish Docker images automatically.
