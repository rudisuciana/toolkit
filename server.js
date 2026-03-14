const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const config = require('./src/config/env');
const pool = require('./src/config/database');
const logger = require('./src/config/logger');
const { authRoutes, paymentRoutes, serviceRoutes, profileRoutes, historyRoutes, adminRoutes, webhookRoutes } = require('./src/routes');

const app = express();
const PORT = config.PORT;

const sessionStore = new MySQLStore({}, pool);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: config.SECRET.JWT || 'fallback-secret-key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use('/api', authRoutes);
app.use('/api', paymentRoutes);
app.use('/api', serviceRoutes);
app.use('/api', profileRoutes);
app.use('/api', historyRoutes);
app.use('/api', adminRoutes);
app.use('/', webhookRoutes);

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  logger.info(`Server WUZZSTORE berjalan di http://localhost:${PORT}`);
});
