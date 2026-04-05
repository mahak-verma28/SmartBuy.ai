const crypto = require('crypto');

/**
 * Generates the AES encrypted auth_token required by django.prixhistory.com
 */
function generatePrixHistoryToken() {
  // Reconstructed secret key from pricehistoryapp.com JS bundles
  // "PaRr8" -> "8rRaP", "s7Xp?" -> "?pX7s", "%#5hf" -> "fh5#%", "324SXF" -> "FXS423", "5te%Gk" -> "kG%et5", "NeVxq" -> "qxVeN"
  const secret = "8rRaP" + "?pX7s" + "fh5#%" + "FXS423" + "kG%et5" + "qxVeN"; // Total length: 32 chars
  
  // The payload expected is the current UTC string
  const payload = new Date().toUTCString();
  
  // Initialization vector
  const iv = crypto.randomBytes(16);
  
  // AES-256-CBC encryption
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secret, 'utf8'), iv);
  
  let encrypted = cipher.update(payload, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Final token format: Base64 encode( IV + Ciphertext )
  const token = Buffer.concat([iv, encrypted]).toString('base64');
  return token;
}

module.exports = { generatePrixHistoryToken };
