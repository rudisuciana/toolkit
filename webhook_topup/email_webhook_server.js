require('dotenv').config();

const { google } = require('googleapis');
const axios = require('axios');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const REDIRECT_URI = "http://localhost:3000/oauth2callback";
const INTERVAL_CEK = parseInt(process.env.INTERVAL_CEK_MS) || 10000;
const EMAIL_FILTER = 'is:unread (from:noreply@jago.com OR from:alerts@seabank.co.id)';

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !WEBHOOK_URL) {
  console.error('FATAL ERROR: Variabel lingkungan tidak lengkap.');
  console.error('Pastikan GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, dan WEBHOOK_URL ada di file .env');
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

function getEmailBody(payload) {
  const result = { plain: '', html: '' };
  
  const decodeBase64 = (data) => {
    if (!data) return '';
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf8');
  };

  const findBodyParts = (parts) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && !result.plain) {
        if (part.body && part.body.data) result.plain = decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/html' && !result.html) {
        if (part.body && part.body.data) result.html = decodeBase64(part.body.data);
      } else if (part.parts) {
        findBodyParts(part.parts);
      }
    }
  };

  if (payload.parts) {
    findBodyParts(payload.parts);
  } else if (payload.body && payload.body.data) {
    if (payload.mimeType === 'text/plain') {
      result.plain = decodeBase64(payload.body.data);
    } else if (payload.mimeType === 'text/html') {
      result.html = decodeBase64(payload.body.data);
    }
  }

  if (result.html && !result.plain) {
    result.plain = result.html.replace(/<[^>]*>?/gm, ''); 
  }

  return result;
}

async function sendWebhookNotification(subject, snippet, bodyObject) {
  const payload = { text: bodyObject.plain };

  console.log(`   -> Mengirim webhook ke ${WEBHOOK_URL}...`);
  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    console.log(`   -> Webhook terkirim. Status: ${response.status}`);
  } catch (err) {
    console.error(`   -> GAGAL mengirim webhook: ${err.message}`);
    if (err.response) {
      console.error(`   -> Respon Server Panel: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
    } else {
      console.error('   -> Server panel tidak merespon atau error jaringan.');
    }
  }
}

async function checkAndProcessEmails() {
  console.log(`Mengecek email (${EMAIL_FILTER})...`);
  
  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: EMAIL_FILTER,
      maxResults: 10,
    });

    const messages = listRes.data.messages;

    if (!messages || messages.length === 0) {
      console.log('Tidak ada email baru yang sesuai filter.');
      return;
    }

    console.log(`DITEMUKAN ${messages.length} email baru, memproses...`);

    for (const message of messages) {
      try {
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        });

        const payload = msgRes.data.payload;
        const subjectHeader = payload.headers.find(h => h.name.toLowerCase() === 'subject');
        const subject = subjectHeader ? subjectHeader.value : '(Tanpa Subjek)';
        const snippet = msgRes.data.snippet;
        const emailBody = getEmailBody(payload);

        console.log(`[Email Ditemukan] Subjek: ${subject}`);
        
        await sendWebhookNotification(subject, snippet, emailBody);
        
        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: { removeLabelIds: ['UNREAD'] },
        });
        console.log(`   -> Email ${message.id} telah ditandai sebagai "sudah diproses".`);

      } catch (emailErr) {
        console.error(`Gagal memproses email ID: ${message.id}`, emailErr.message);
      }
    }

  } catch (err) {
    console.error('Error saat siklus pengecekan email:', err.message);
    if (err.response && err.response.data.error === 'invalid_grant') {
      console.error('FATAL: Refresh token tidak valid atau dicabut. Hentikan bot.');
      process.exit(1);
    }
  }
}

console.log('=================================');
console.log('   Gmail Webhook Bot Dimulai');
console.log('=================================');
console.log(`Target Webhook     : ${WEBHOOK_URL}`);
console.log(`Interval Pengecekan: ${INTERVAL_CEK / 1000} detik`);
console.log(`Filter Email       : ${EMAIL_FILTER}`);

const runCheckLoop = async () => {
  await checkAndProcessEmails();
  setTimeout(runCheckLoop, INTERVAL_CEK); 
};

runCheckLoop();
