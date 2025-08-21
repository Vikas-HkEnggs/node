import dotenv from 'dotenv';

logger.info(`Starting server in ${process.env.NODE_ENV} mode`);

// Load the appropriate .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: envFile });

import app from './src/app.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'production'} mode🌍🌍✨✨`);
});
