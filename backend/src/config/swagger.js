const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskFlow API',
      version: '1.0.0',
      description: `
## TaskFlow – Scalable REST API with JWT Auth & RBAC

A production-ready API featuring:
- **JWT authentication** with access + refresh tokens
- **Role-based access control** (user / admin)
- **Full CRUD** for task management
- **Input validation** & sanitization
- **Rate limiting** & security headers

### Authentication
Most endpoints require a Bearer token in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <your_access_token>
\`\`\`
      `,
      contact: { name: 'TaskFlow Support', email: 'support@taskflow.dev' },
      license: { name: 'MIT' },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter the access token received from /api/v1/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors:  { type: 'array', items: { type: 'object' } },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
        UserPublic: {
          type: 'object',
          properties: {
            id:         { type: 'string', format: 'uuid' },
            name:       { type: 'string' },
            email:      { type: 'string', format: 'email' },
            role:       { type: 'string', enum: ['user', 'admin'] },
            is_active:  { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            title:       { type: 'string' },
            description: { type: 'string', nullable: true },
            status:      { type: 'string', enum: ['todo', 'in_progress', 'done'] },
            priority:    { type: 'string', enum: ['low', 'medium', 'high'] },
            due_date:    { type: 'string', format: 'date', nullable: true },
            user_id:     { type: 'string', format: 'uuid' },
            created_at:  { type: 'string', format: 'date-time' },
            updated_at:  { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth',  description: 'Registration, login, logout, token refresh' },
      { name: 'Tasks', description: 'CRUD operations on tasks' },
      { name: 'Admin', description: 'Admin-only user management' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
