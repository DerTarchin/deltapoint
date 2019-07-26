const CryptoJS = require('crypto-js')

export const decrypt = (message, passphrase) => {
  const encryptedHMAC = message.substring(0, 64),
        encryptedHTML = message.substring(64),
        decryptedHMAC = CryptoJS.HmacSHA256(encryptedHTML, CryptoJS.SHA256(passphrase).toString()).toString();

  if (decryptedHMAC !== encryptedHMAC) return; // incorrect pass

  const keySize = 256/32, 
        iterations = 1000,
        salt = CryptoJS.enc.Hex.parse(encryptedHTML.substr(0, 32)),
        iv = CryptoJS.enc.Hex.parse(encryptedHTML.substr(32, 32)),
        encrypted = encryptedHTML.substring(64),
        key = CryptoJS.PBKDF2(passphrase, salt, { keySize, iterations });

  return JSON.parse(CryptoJS.AES.decrypt(encrypted, key, {
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
  }).toString(CryptoJS.enc.Utf8));
}