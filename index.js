const express = require('express');
const cors = require('cors');
require('dotenv').config();

const formRoutes = require('./routes/formRoutes');

const app = express();
const port = process.env.PORT;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://uktourism-eta.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.get('/api/test', (req, res) => {
    res.status(200).send("Welcome to the UKTOURISM")
})

app.use('/api/form', formRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
