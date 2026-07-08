require('dotenv').config();
const http = require('http');
const { createApp } = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

async function main() {
  await connectDB(process.env.MONGO_URI);

  const app = createApp(CLIENT_ORIGIN);
  const httpServer = http.createServer(app);
  initSocket(httpServer, CLIENT_ORIGIN);

  httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
