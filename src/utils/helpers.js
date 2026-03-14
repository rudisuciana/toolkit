function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function cekNomorXl(nomor) {
  if (!nomor) return false;
  const prefixXl = ['817', '818', '819', '859', '877', '878', '838', '831', '832', '833'];
  const nomorLokal = ubahKe0(String(nomor));
  if (!nomorLokal.startsWith('08')) return false;
  const prefix = nomorLokal.substring(1, 4);
  const isPrefixValid = prefixXl.includes(prefix);
  const isLengthValid = nomorLokal.length >= 11 && nomorLokal.length <= 13;
  return isPrefixValid && isLengthValid;
}

function ubahKe62(nomor) {
  const cleaned = String(nomor).replace(/[\s+-]/g, '');
  if (cleaned.startsWith('0')) return '62' + cleaned.substring(1);
  return cleaned;
}

function ubahKe0(nomor) {
  const cleaned = String(nomor).replace(/[\s+-]/g, '');
  if (cleaned.startsWith('62')) return '0' + cleaned.substring(2);
  return cleaned;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskString(str) {
  if (!str || str.length <= 4) return str;
  const lastFour = str.slice(-4);
  const maskedPart = '*'.repeat(str.length - 4);
  return maskedPart + lastFour;
}

module.exports = { generateRandomString, cekNomorXl, ubahKe62, ubahKe0, generateOTP, maskString };
