# ✅ TaskFlow API

A production-ready **REST API** built with Node.js + Express, featuring JWT authentication, role-based access control, and full CRUD for task management. Includes a clean frontend UI and Swagger documentation.

---

## 📁 Project Structure

```
taskflow-api/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Entry point
│   │   ├── config/
│   │   │   ├── database.js         # SQLite schema + connection
│   │   │   └── swagger.js          # OpenAPI 3.0 spec
│   │   ├── controllers/
│   │   │   ├── authController.js   # register, login, refresh, logout, me
│   │   │   ├── taskController.js   # CRUD + stats + pagination
│   │   │   └── adminController.js  # User management (admin only)
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verify + authorize()
│   │   │   ├── validate.js         # express-validator handler
│   │   │   └── errorHandler.js     # Global error + 404
│   │   ├── models/                 # (schema defined in database.js)
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── taskRoutes.js
│   │   │   └── adminRoutes.js
│   │   ├── utils/
│   │   │   ├── jwt.js              # Token helpers
│   │   │   ├── response.js         # HTTP response helpers
│   │   │   └── seed.js             # DB seeder
│   │   └── validators/
│   │       ├── authValidator.js
│   │       └── taskValidator.js
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── index.html                  # Login / Register
│   ├── dashboard.html              # Protected dashboard
│   ├── css/dashboard.css
│   └── js/
│       ├── config.js               # API base URL + fetch wrapper
│       ├── auth.js                 # Login/register logic
│       └── dashboard.js            # Task CRUD + admin panel
├── docker-compose.yml
└── README.md


Note: node_modules is not included in this repository. Run npm install inside the backend folder to install all dependencies before starting the server.


## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+ and npm
- Git

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/taskflow-api.git
cd taskflow-api/backend

npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set your JWT secret:
```
JWT_SECRET=your_very_long_random_secret_key_here_minimum_32_chars
```

### 3. Seed the database

```bash
node src/utils/seed.js
```

This creates two accounts:
| Role  | Email                  | Password     |
|-------|------------------------|--------------|
| Admin | admin@taskflow.dev     | Admin@1234   |
| User  | demo@taskflow.dev      | Demo@1234    |

### 4. Start the backend

```bash
npm run dev        # development (nodemon auto-reload)
# or
npm start          # production
```

The API starts on **http://localhost:5000**

### 5. Open the frontend

Open `frontend/index.html` in your browser using:
- VS Code **Live Server** extension (right-click → Open with Live Server), or
- Any static file server:

```bash
cd ../frontend
npx serve .        # serves at http://localhost:3000
```

Or just double-click `frontend/index.html` (note: CORS must allow `null` origin for file:// – easier with Live Server).

---

## 🐳 Docker Deployment

```bash
# From the project root
cp backend/.env.example backend/.env   # Edit JWT_SECRET first!

docker-compose up --build -d
```

API available at **http://localhost:5000**

---

## 📚 API Documentation

Swagger UI auto-generated docs:

**http://localhost:5000/api/docs**

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Flow

```
1. POST /auth/register   →  { user, tokens }
2. POST /auth/login      →  { user, tokens }
3. Use: Authorization: Bearer <accessToken>
4. POST /auth/refresh    →  { tokens }   (when access token expires)
5. POST /auth/logout     →  revoke refresh token
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint              | Auth | Description                   |
|--------|-----------------------|------|-------------------------------|
| POST   | /auth/register        | —    | Create new account            |
| POST   | /auth/login           | —    | Login, get tokens             |
| POST   | /auth/refresh         | —    | Rotate tokens                 |
| POST   | /auth/logout          | —    | Revoke refresh token          |
| POST   | /auth/logout-all      | ✅   | Revoke all sessions           |
| GET    | /auth/me              | ✅   | Get own profile               |
| PATCH  | /auth/me              | ✅   | Update name/password          |

### Tasks (authenticated)
| Method | Endpoint              | Auth | Description                   |
|--------|-----------------------|------|-------------------------------|
| GET    | /tasks                | ✅   | List tasks (paginated)        |
| POST   | /tasks                | ✅   | Create task                   |
| GET    | /tasks/stats          | ✅   | Count by status               |
| GET    | /tasks/:id            | ✅   | Get single task               |
| PATCH  | /tasks/:id            | ✅   | Update task (partial)         |
| DELETE | /tasks/:id            | ✅   | Delete task                   |

**Task query params:** `?status=todo&priority=high&search=text&page=1&limit=20&sort=created_at&order=desc`

### Admin (admin role required)
| Method | Endpoint              | Auth  | Description                  |
|--------|-----------------------|-------|------------------------------|
| GET    | /admin/stats          | Admin | Platform dashboard stats     |
| GET    | /admin/users          | Admin | List all users               |
| GET    | /admin/users/:id      | Admin | User + their task stats      |
| PATCH  | /admin/users/:id      | Admin | Update role/status           |
| DELETE | /admin/users/:id      | Admin | Delete user (cascades tasks) |

---

## 🗄️ Database Schema

```sql
users (
  id UUID PK, name, email UNIQUE, password (bcrypt),
  role CHECK(user|admin), is_active, created_at, updated_at
)

tasks (
  id UUID PK, title, description, 
  status CHECK(todo|in_progress|done),
  priority CHECK(low|medium|high),
  due_date, user_id FK → users, created_at, updated_at
)

refresh_tokens (
  id UUID PK, user_id FK → users, token UNIQUE,
  expires_at, created_at
)
```

---

## 🔐 Security Practices

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs, 12 salt rounds |
| JWT access tokens | Short-lived (7d), HS256 |
| Refresh tokens | Opaque UUID, DB-persisted, rotated on use |
| Input validation | express-validator on all user inputs |
| SQL injection | Parameterized queries (better-sqlite3) |
| Rate limiting | express-rate-limit (100 req/15min; 20 for auth) |
| CORS | Configurable via env |
| Security headers | helmet.js |
| Role enforcement | Middleware on every protected route |
| XSS | Input escaping in validators |

---

## 📈 Scalability Notes

This project is structured to scale in the following ways:

**Horizontal scaling**
- The API is stateless — JWT tokens allow multiple instances without shared sessions
- SQLite is ideal for single-server; swap `database.js` for a Postgres/MySQL adapter for multi-instance

**Caching**
- Add Redis (e.g. `ioredis`) to cache task lists and stats with a short TTL
- Use a cache-aside pattern: check Redis → miss → query DB → populate cache

**Microservices path**
- Auth service, Task service, and Notification service are natural splits
- The route/controller/validator pattern already enforces module boundaries
- Add an API Gateway (e.g. Kong or custom Express router) to unify endpoints

**Database**
- Migrate to PostgreSQL via `pg` + connection pooling for production workloads
- Add read replicas for reporting/stats queries
- Index columns: `user_id`, `status`, `priority` are already indexed

**Load balancing**
- Deploy N instances behind NGINX or AWS ALB
- Use sticky sessions only if needed (not needed here — JWTs are self-contained)

**Deployment**
- Docker Compose for single-server
- Kubernetes for container orchestration at scale
- CI/CD: GitHub Actions → Docker build → push to ECR → deploy to ECS/K8s

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js 4
- **Database**: SQLite (better-sqlite3) — swap-ready for PostgreSQL
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Validation**: express-validator
- **Docs**: Swagger UI (swagger-jsdoc + swagger-ui-express)
- **Security**: helmet, express-rate-limit, cors
- **Frontend**: Vanilla JS + HTML/CSS (no build step needed)
