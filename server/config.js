const path = require('path');
const port = Number(process.env.PORT || 3000);
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const apiBaseUrl = (process.env.API_BASE_URL || publicBaseUrl || 'http://localhost:' + port).replace(/\/$/, '');
const dataDir = process.env.AGENTBRIDGE_DATA_DIR || path.join(__dirname, 'data');
const localOrigins = ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:8091', 'http://localhost:8092'];
const corsOrigins = (process.env.CORS_ORIGINS || localOrigins.join(',')).split(',').map(value => value.trim()).filter(Boolean);
module.exports = { port, publicBaseUrl, apiBaseUrl, dataDir, corsOrigins, webmcpOriginTrialToken: process.env.WEBMCP_ORIGIN_TRIAL_TOKEN || '', demoResetEnabled: process.env.DEMO_RESET_ENABLED !== 'false', autoSeedDemo: process.env.AUTO_SEED_DEMO === 'true' };
