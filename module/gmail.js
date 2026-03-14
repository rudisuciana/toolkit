const { google } = require('googleapis'); // Library resmi Google API
const pool = require('../database.js');   // Koneksi database
const axios = require('axios');           // Diperlukan untuk fungsi emailReceiver

// Fungsi Helper: Melakukan otentikasi OAuth2 ke Google
function getAuth(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN) {
  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );
  oAuth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN,
  });
  // Menginisialisasi service Gmail versi 1
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  return gmail;
};

// Fungsi Helper: Membuat format email raw (Base64URL Encoded)
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
  
  // Encode ke Base64 lalu ubah karakter agar URL-safe
  const base64Email = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return base64Email;
}

// Fungsi 1: Mengirim Kode OTP ke Email User
async function sendOTP(email, otp, config) {
  try {
    const auth = getAuth(config.GMAIL.CLIENT_ID, config.GMAIL.CLIENT_SECRET, config.GMAIL.REDIRECT_URI, config.GMAIL.SENDER);
    
    // Template HTML email
    const pesan = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Verifikasi Akun WUZZSTORE</h2>
        <p>Gunakan kode di bawah ini untuk memverifikasi pendaftaran Anda:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px; padding: 10px; background-color: #f2f2f2; border-radius: 5px;">
        ${otp}
        </p>
        <p>Kode ini akan kedaluwarsa dalam 10 menit. Jangan bagikan kode ini dengan siapa pun.</p>
      </div>
    `;
    
    const rawEmail = createRawEmail(email, 'Kode OTP Verifikasi Anda', pesan);
    
    // Kirim email via API
    const res = await auth.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawEmail,
      },
    });
    
    console.log('Email berhasil terkirim! Message ID:', res.data.id);
    return res.data;
  } catch (err) {
    console.error('Gagal mengirim email:', err.message);
    throw new Error('Gagal mengirim OTP');
  }
}

// Fungsi 2: Mengirim Link Reset Password
async function sendResetLinkEmail(email, token, config) {
  const auth = getAuth(config.GMAIL.CLIENT_ID, config.GMAIL.CLIENT_SECRET, config.GMAIL.REDIRECT_URI, config.GMAIL.SENDER);
  let resetLink;
  
  // Regex untuk mengecek apakah DOMAIN berupa IP Address
  const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // Jika menggunakan IP (Development), gunakan HTTP dan Port
  // Jika menggunakan Domain (Production), gunakan HTTPS
  if (ipRegex.test(config.DOMAIN)) {
     resetLink = `http://${config.DOMAIN}:${config.PORT || 3000}/reset-password?token=${token}`;
  } else {
    resetLink = `https://${config.DOMAIN}/reset-password?token=${token}`;
  }

  const pesan = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Permintaan Reset Password</h2>
      <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah ini untuk melanjutkan:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; margin: 20px 0; font-size: 16px; color: white; background-color: #5c67f2; text-decoration: none; border-radius: 5px;">
      Reset Password
      </a>
      <p>Jika Anda tidak meminta reset password, abaikan email ini. Link ini akan kedaluwarsa dalam 1 jam.</p>
    </div>
  `;
  try {
    const rawEmail = createRawEmail(email, 'Permintaan Reset Password', pesan);
    const res = await auth.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawEmail,
      },
    });
    return res.data;
  } catch (err) {
    console.log(`Gagal mengirim link reset password: ${err.message}`);
    throw new Error('Gagal mengirim link reset password');
  }
}

// Fungsi 3: Membaca Email Masuk (Untuk Deposit Otomatis via Bank Jago & Seabank)
async function emailReceiver(config) {
  const auth = getAuth(config.GMAIL.CLIENT_ID, config.GMAIL.CLIENT_SECRET, config.GMAIL.REDIRECT_URI, config.GMAIL.RECEIVER);
  try {
    // MODIFIED: List pesan yang belum dibaca dari noreply@jago.com ATAU alerts@seabank.co.id
    const listRes = await auth.users.messages.list({
      userId: 'me',
      q: 'is:unread (from:noreply@jago.com OR from:alerts@seabank.co.id)', 
      maxResults: 5,
    });
    
    const messages = listRes.data.messages;
    
    if (!messages || messages.length === 0) {
      console.log('Tidak ada email baru yang sesuai filter.');
      return;
    }
    
    // Loop setiap pesan yang ditemukan
    for (const message of messages) {
      // Ambil detail isi pesan
      const msgRes = await auth.users.messages.get({
        userId: 'me',
        id: message.id,
      });
      
      const headers = msgRes.data.payload.headers;
      // const subject = headers.find(h => h.name === 'Subject').value; // Opsional jika butuh subject
      // const from = headers.find(h => h.name === 'From').value;       // Opsional jika butuh pengirim
      const snippet = msgRes.data.snippet; // Cuplikan isi pesan (biasanya berisi nominal transfer)
      
      try {
        // Kirim data snippet ke Webhook lokal untuk diproses sistem deposit
        const resWebhook = await axios.post(`https://${config.DOMAIN}/webhook_topup`, {
          text: snippet
        });
        
        // Tandai pesan sebagai sudah dibaca (Hapus label UNREAD) agar tidak terproses ganda
        await auth.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          }
        });
      } catch (err) {
        throw new Error('Gagal mengirim pesan ke webhook');
      }
    }
  } catch (err) {
    throw new Error('Gagal membaca pesan');
  }
}

// Fungsi 4: Verifikasi Logika OTP
function verifOTP(userOTP, session) {
    // Cek apakah ada sesi OTP
    if (!session.otp || !session.otpExpires) {
        return { success: false, message: 'Tidak ada permintaan OTP yang aktif. Silakan kirim ulang.' };
    }

    // Cek kadaluwarsa (10 menit)
    if (Date.now() > session.otpExpires) {
        delete session.otp;
        delete session.otpExpires;
        return { success: false, message: 'Kode OTP telah kedaluwarsa. Silakan kirim ulang.' };
    }

    // Cek kecocokan kode
    if (userOTP !== session.otp) {
        return { success: false, message: 'Kode OTP salah.' };
    }

    // Hapus OTP dari sesi jika berhasil (One Time Use)
    delete session.otp;
    delete session.otpExpires;

    return { success: true, message: 'OTP berhasil diverifikasi.' };
}

module.exports = {
  sendOTP,
  verifOTP,
  sendResetLinkEmail,
  emailReceiver
}
