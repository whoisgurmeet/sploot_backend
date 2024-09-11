require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Site is working!');
});
// MongoDB connection
const mongo_url =   process.env.MONGO_URI ? `${process.env.MONGO_URI}/leave_application` : 'mongodb://0.0.0.0:27017/leave_application'
console.log("mongo_url===>",mongo_url)
mongoose.connect(mongo_url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);

  process.exit(1); 
});