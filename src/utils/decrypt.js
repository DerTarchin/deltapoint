const CryptoJS = require('crypto-js')

export const decrypt = (message, passphrase) => {
  const encryptedHMAC = message.substring(0, 64),
        encryptedHTML = message.substring(64),
        decryptedHMAC = CryptoJS.HmacSHA256(encryptedHTML, CryptoJS.SHA256(passphrase).toString()).toString();

  if (decryptedHMAC !== encryptedHMAC) return;
  return JSON.parse(CryptoJS.AES.decrypt(encryptedHTML, passphrase).toString(CryptoJS.enc.Utf8));
}