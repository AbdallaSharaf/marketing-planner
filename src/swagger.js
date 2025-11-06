module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Marketing Planner API',
    version: '1.0.0',
    description: 'Minimal OpenAPI spec for the Marketing Planner backend',
  },
  servers: [{ url: 'http://localhost:5000/api/v1', description: 'Local' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: { 200: { description: 'Logged in' } },
      },
    },
  },
};
