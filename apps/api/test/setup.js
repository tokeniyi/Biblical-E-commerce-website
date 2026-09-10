// Jest setup — runs before every test file. Loads .env.test so that modules
// that read process.env at import time (e.g. JwtStrategy reading AUTH_SECRET)
// see the same shared secret apps/web/auth.ts uses in dev/test.
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.test") });