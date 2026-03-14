function crc16ccitt(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) > 0) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function generateDynamicQris(baseQrisString, amount) {
  let payload = baseQrisString.substring(0, baseQrisString.length - 8);
  const cleanedPayload = payload.replace(/54\d{2,}\d*/g, '');
  const amountStr = String(Math.round(amount));
  const amountLength = amountStr.length.toString().padStart(2, '0');
  const amountTag = `54${amountLength}${amountStr}`;
  const stringForCrc = cleanedPayload + amountTag;
  const newCrc = crc16ccitt(stringForCrc + '6304');
  return `${stringForCrc}6304${newCrc}`;
}

module.exports = { generateDynamicQris };
