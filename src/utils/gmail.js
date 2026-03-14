const { google } = require('googleapis');
const axios = require('axios');
const config = require('../config/env');
const logger = require('../config/logger');

function getAuth(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN) {
  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

function createRawEmail(destination, subject, message) {
  const emailLines = [
    `From: "WUZZSTORE" <me>`,
    `To: ${destination}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    message,
  ];
  const email = emailLines.join('\n');
  return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendOTP(email, otp) {
  try {
    const auth = getAuth(config.GMAIL.CLIENT_ID, config.GMAIL.CLIENT_SECRET, config.GMAIL.REDIRECT_URI, config.GMAIL.SENDER);
    const pesan = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Verifikasi Akun WUZZSTORE</h2>
        <p>Gunakan kode di bawah ini untuk memverifikasi pendaftaran Anda:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px; padding: 10px; background-color: #f2f2f2; border-radius: 5px;">${otp}</p>
        <p>Kode ini akan kedaluwarsa dalam 10 menit. Jangan bagikan kode ini dengan siapa pun.</p>
      </div>
    `;
    const rawEmail = createRawEmail(email, 'Kode OTP Verifikasi Anda', pesan);
    const res = await auth.users.messages.send({ userId: 'me', requestBody: { raw: rawEmail } });
    logger.info('Email OTP berhasil terkirim ke ' + email);
    return res.data;
  } catch (err) {
    logger.error('Gagal mengirim email OTP: ' + err.message);
    throw new Error('Gagal mengirim OTP');
  }
}

async function sendResetLinkEmail(email, token) {
  const auth = getAuth(config.GMAIL.CLIENT_ID, config.GMAIL.CLIENT_SECRET, config.GMAIL.REDIRECT_URI, config.GMAIL.SENDER);
  const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  let resetLink;
  if (ipRegex.test(config.DOMAIN)) {
    resetLink = `http://${config.DOMAIN}:${config.PORT}/reset-password?token=${token}`;
  } else {
    resetLink = `https://${config.DOMAIN}/reset-password?token=${token}`;
  }
  const pesan = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Permintaan Reset Password</h2>
      <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah ini untuk melanjutkan:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; margin: 20px 0; font-size: 16px; color: white; background-color: #5c67f2; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>Jika Anda tidak meminta reset password, abaikan email ini. Link ini akan kedaluwarsa dalam 1 jam.</p>
    </div>
  `;
  try {
    const rawEmail = createRawEmail(email, 'Permintaan Reset Password', pesan);
    const res = await auth.users.messages.send({ userId: 'me', requestBody: { raw: rawEmail } });
    return res.data;
  } catch (err) {
    logger.error('Gagal mengirim link reset password: ' + err.message);
    throw new Error('Gagal mengirim link reset password');
  }
}

async function emailReceiver() {
  const auth = getAuth(config.GMAIL.CLIENT_ID, config.GMAIL.CLIENT_SECRET, config.GMAIL.REDIRECT_URI, config.GMAIL.RECEIVER);
  try {
    const listRes = await auth.users.messages.list({
      userId: 'me',
      q: 'is:unread (from:noreply@jago.com OR from:alerts@seabank.co.id)',
      maxResults: 5,
    });
    const messages = listRes.data.messages;
    if (!messages || messages.length === 0) {
      logger.info('Tidak ada email baru yang sesuai filter.');
      return;
    }
    for (const message of messages) {
      const msgRes = await auth.users.messages.get({ userId: 'me', id: message.id });
      const snippet = msgRes.data.snippet;
      try {
        const protocol = config.DOMAIN.includes('localhost') ? 'http' : 'https';
        await axios.post(`${protocol}://${config.DOMAIN}/webhook_topup`, { text: snippet });
        await auth.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: { removeLabelIds: ['UNREAD'] },
        });
      } catch (err) {
        throw new Error('Gagal mengirim pesan ke webhook');
      }
    }
  } catch (err) {
    throw new Error('Gagal membaca pesan');
  }
}

function verifOTP(userOTP, session) {
  if (!session.otp || !session.otpExpires) {
    return { success: false, message: 'Tidak ada permintaan OTP yang aktif. Silakan kirim ulang.' };
  }
  if (Date.now() > session.otpExpires) {
    delete session.otp;
    delete session.otpExpires;
    return { success: false, message: 'Kode OTP telah kedaluwarsa. Silakan kirim ulang.' };
  }
  if (userOTP !== session.otp) {
    return { success: false, message: 'Kode OTP salah.' };
  }
  delete session.otp;
  delete session.otpExpires;
  return { success: true, message: 'OTP berhasil diverifikasi.' };
}

module.exports = { sendOTP, verifOTP, sendResetLinkEmail, emailReceiver };
