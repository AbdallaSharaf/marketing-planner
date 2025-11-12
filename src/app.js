const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { apiVersion } = require('./src/config');
const authRoutes = require('./src/routes/auth');
const clientRoutes = require('./src/routes/clients');
const servicesRoutes = require('./src/routes/services');
const packagesRoutes = require('./src/routes/packages');
const campaignsRoutes = require('./src/routes/campaigns');
const quotationsRoutes = require('./src/routes/quotations');
const contractsRoutes = require('./src/routes/contracts');
const reportsRoutes = require('./src/routes/reports');
const branchesRoutes = require('./src/routes/branches');
const segmentsRoutes = require('./src/routes/segments');
const competitorsRoutes = require('./src/routes/competitors');
const socialLinksRoutes = require('./src/routes/socialLinks');
const swotsRoutes = require('./src/routes/swots');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/swagger');
const usersRoutes = require('./src/routes/users');
const auditRoutes = require('./src/routes/audit');
const dashboardRoutes = require('./src/routes/dashboard');
const analyticsRoutes = require('./src/routes/analytics');
const uploadsRoutes = require('./src/routes/uploads');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Middlewares
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));

// Rate limiting
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(generalLimiter);

// Routes
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/clients`, clientRoutes);
app.use(`/api/${apiVersion}/services`, servicesRoutes);
app.use(`/api/${apiVersion}/packages`, packagesRoutes);
app.use(`/api/${apiVersion}/campaigns`, campaignsRoutes);
app.use(`/api/${apiVersion}/quotations`, quotationsRoutes);
app.use(`/api/${apiVersion}/contracts`, contractsRoutes);
app.use(`/api/${apiVersion}/reports`, reportsRoutes);
// nested client routes
app.use(`/api/${apiVersion}/clients/:clientId/branches`, branchesRoutes);
app.use(`/api/${apiVersion}/clients/:clientId/segments`, segmentsRoutes);
app.use(`/api/${apiVersion}/clients/:clientId/competitors`, competitorsRoutes);
app.use(`/api/${apiVersion}/clients/:clientId/social-links`, socialLinksRoutes);
app.use(`/api/${apiVersion}/clients/:clientId/swot`, swotsRoutes);

app.use(`/api/${apiVersion}/users`, usersRoutes);
app.use(`/api/${apiVersion}/audit`, auditRoutes);
app.use(`/api/${apiVersion}/dashboard`, dashboardRoutes);
app.use(`/api/${apiVersion}/analytics`, analyticsRoutes);
app.use(`/api/${apiVersion}/uploads`, uploadsRoutes);

// Swagger UI
if (process.env.SWAGGER_ENABLED !== 'false') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

module.exports = app;
