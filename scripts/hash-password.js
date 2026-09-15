// Usage: node scripts/hash-password.js "your-password"
// Prints a bcrypt hash to put in EA_LOGIN_PASSWORD_HASH in .env
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.js <password>");
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  // Next.js expands $VAR in .env files, so print the .env-safe escaped form
  // (every "$" doubled to "\$") alongside the raw hash.
  console.log("Raw hash:", hash);
  console.log('Paste into .env as:');
  console.log(`EA_LOGIN_PASSWORD_HASH="${hash.replace(/\$/g, "\\$")}"`);
});
