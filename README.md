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

## 📂 Logs

### 🛠️ System Logs
- Logs are saved in the filesystem
- Three levels: `info`, `error`, `warn`

<p align="center">
  <img width="1054" height="336" alt="System logs screenshot" src="https://github.com/user-attachments/assets/97accb96-d124-485b-8bbf-92c5856d9e30" />
</p>

---

### 🌐 HTTP Logs
- Logs are saved in the filesystem
- `debug` messages are **disabled in production mode**
- `debug` messages are **not saved** in the filesystem
- Four levels: `info`, `error`, `debug`, `warn`
- Set the `HTTP_LOGS` environment variable to `false` to disable logs on console

<p align="center">
  <img width="1565" height="204" alt="HTTP logs screenshot" src="https://github.com/user-attachments/assets/c5e4ffd7-0469-46c7-8d43-3d00f024172e" />
</p>

---

### ✅ Request Completed
When a request is completed, it's registered in the filesystem as follows:


```javascript
{
  message: 'Request completed',
  ip: '::ffff:192.168.65.1',
  method: 'POST',
  requestId: '40d86af4-dfd3-4b7b-8476-c8a74d48ec54',
  responseTime: 80.415644,
  statusCode: 200,
  url: '/api/users/login',
  level: 'info',
  timestamp: '2025-07-20T17:39:54.272Z'
}
```

## Api documentation
https://authtaskerdocs.apidog.io


