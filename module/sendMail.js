const { Resend } = require('resend'); // Mengimpor library Resend

// Fungsi 1: Mengirim Kode OTP via Resend
async function sendOTP(email, otp, config) {
    // Menginisialisasi klien Resend dengan API Key dari .vars.json
    const resend = new Resend(config.RESEND.API_KEY);

    try {
        // Melakukan pengiriman email
        const { data, error } = await resend.emails.send({
            // Sender address harus diverifikasi di dashboard Resend
            from: `WUZZSTORE <wuzzstoreservice@${config.RESEND.DOMAIN}>`,
            to: [email],
            subject: 'Kode OTP Verifikasi Anda',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Verifikasi Akun WUZZSTORE</h2>
                    <p>Gunakan kode di bawah ini untuk memverifikasi pendaftaran Anda:</p>
                    <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px; padding: 10px; background-color: #f2f2f2; border-radius: 5px;">
                        ${otp}
                    </p>
                    <p>Kode ini akan kedaluwarsa dalam 10 menit. Jangan bagikan kode ini dengan siapa pun.</p>
                </div>
            `,
        });

        // Jika Resend mengembalikan error (misal domain belum diverifikasi/limit habis)
        if (error) {
            throw new Error(error.message);
        }

        return data;

    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Gagal mengirim email OTP.');
    }
}

// Fungsi 2: Mengirim Link Reset Password via Resend
async function sendResetLinkEmail(email, token, config) {
    const resend = new Resend(config.RESEND.API_KEY);
    let resetLink;
    
    // Regex untuk mendeteksi apakah host berupa IP Address (Lingkungan Development)
    const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // Jika IP, gunakan protokol HTTP dan Port yang ditentukan
    // Jika Domain, gunakan protokol HTTPS
    if (ipRegex.test(config.DOMAIN)) {
        resetLink = `http://${config.DOMAIN}:${config.PORT || 3000}/reset-password?token=${token}`;
    } else {
        resetLink = `https://${config.DOMAIN}/reset-password?token=${token}`;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: `WUZZSTORE <wuzzstoreservice@${config.RESEND.DOMAIN}>`,
            to: [email],
            subject: 'Permintaan Reset Password',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Permintaan Reset Password</h2>
                    <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah ini untuk melanjutkan:</p>
                    <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; margin: 20px 0; font-size: 16px; color: white; background-color: #5c67f2; text-decoration: none; border-radius: 5px;">
                        Reset Password
                    </a>
                    <p>Jika Anda tidak meminta reset password, abaikan email ini. Link ini akan kedaluwarsa dalam 1 jam.</p>
                </div>
            `,
        });

        if (error) {
            throw new Error(error.message);
        }
        return data;
    } catch (error) {
        console.error('Error sending reset email:', error);
        throw new Error('Gagal mengirim email reset password.');
    }
}

// Fungsi 3: Verifikasi Logika OTP (Sama seperti di gmail.js)
function verifOTP(userOTP, session) {
    // Cek keberadaan sesi OTP
    if (!session.otp || !session.otpExpires) {
        return { success: false, message: 'Tidak ada permintaan OTP yang aktif. Silakan kirim ulang.' };
    }

    // Cek waktu kedaluwarsa
    if (Date.now() > session.otpExpires) {
        delete session.otp;
        delete session.otpExpires;
        return { success: false, message: 'Kode OTP telah kedaluwarsa. Silakan kirim ulang.' };
    }

    // Cek kesesuaian kode
    if (userOTP !== session.otp) {
        return { success: false, message: 'Kode OTP salah.' };
    }

    // Bersihkan sesi setelah sukses
    delete session.otp;
    delete session.otpExpires;

    return { success: true, message: 'OTP berhasil diverifikasi.' };
}

module.exports = { sendOTP, verifOTP, sendResetLinkEmail };
