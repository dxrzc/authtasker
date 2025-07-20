# Authtasker
Backend application designed to manage user authentication, authorization and task management. Built with NodeJS, Typescript and Express.  

## 🚀 Features
### 🔒 Authentication/Authorization
- **Bearer token authentication** with short-lived session tokens and long-lived refresh tokens.
- **Refresh token limiting**: restrict users to a max number of active sessions
- **Session token blacklisting** using Redis
- **Role-based access** (`readonly`, `editor`, `admin`)
- **Email validation for role upgrade** (`readonly`->`editor`)
- **Secure password hashing**

### ⚡ Caching
- **Revalidation caching**: on-demand data re-check with Redis + DB fallback
- **Pagination caching** using Redis with hard TTL

### 🐳 Docker
- **Dockerized** environment for development
- **Dockerfile** image for production and development

### 🔑 Secrets
- **Sensitive secrets** (JWT keys, DB URIs, credentials) are securely loaded via Docker secrets

### 🧪 Testing
- **Unit, integration** and **e2e** tests

### 🛡 Security
- **Administrator user creation** when the server is started
- **Input sanitization and validation** using `class-validator`
- **API rate limiting** to prevent abuse

### 📊 Monitoring & Maintenance
- **Health endpoint** (restricted to `admin` users)
- **Logging and monitoring** of HTTP requests and system events

## 📜 Scripts

| Command            | Description                                      |
|--------------------|--------------------------------------------------|
| `npm run dev`      | Starts the development server with Docker Compose using `.env.dev` |
| `npm run test:unit`| Runs unit tests using Jest                       |
| `npm run test:int` | Runs integration tests with environment setup    |
| `npm run build`    | Builds the project using `tsc` with `tsconfig.build.json` |
| `npm start`        | Runs the built app in production using `dotenvx` and `.env.prod` |

## Logs
#### System logs
- Logs are saved in filesystem
- Three levels: info, error, warn

![Image](https://github.com/user-attachments/assets/7766983d-b9bc-4791-8709-9e6de809ddd2)

#### Http logs
- Logs are saved in filesystem
- Debug messages are disabled in production mode.
- Debug messages are not saved in filesystem
- Four levels: info, error, debug, warn
- Set HTTP_LOGS env to false to disable these logs

![Image](https://github.com/user-attachments/assets/b928b138-0481-4884-b6a2-3a7c53daff86)

#### Request completed
When a request is completed is registered in filesystem as follows

![Image](https://github.com/user-attachments/assets/7c37f338-5820-4eb6-8210-d503ca0c0d99)

## Api documentation
https://authtaskerdocs.apidog.io


