// server.js
import express, { json } from 'express';
import authRoutes from './routes/loginrouter.js';
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(json());

// Simple route
app.get('/', (req, res) => {
  res.send('Hello, Express server is running!');
});


app.use('/api/auth', authRoutes);



// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
