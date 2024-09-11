const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const partnerRoutes = require('./routes/partnerRoutes');
const leaveRoutes = require('./routes/leaveRoutes');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Routes
app.use('/api/partners', partnerRoutes);
app.use('/api/leaves', leaveRoutes);



module.exports = app;
