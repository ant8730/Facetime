# Password-protected Private Call website

Mobile-first website for one-to-one audio/video calls, with a server-checked shared password, login rate limiting, HTTP-only session cookie, room codes, mute, camera toggle, flip camera, and end-call controls.

## Deploy
1. Use a Node.js 20+ host that supports a long-running web service (for example, Render or Railway). Keep the source repository private.
2. Set start command to `npm start`.
3. Set environment variables in the host dashboard: `SITE_PASSWORD` (unique, 12+ characters), `SESSION_SECRET` (random, 32+ characters), and `NODE_ENV=production`.
4. Recommended: create a MongoDB Atlas database and set `MONGODB_URI` so sessions persist across restarts.
5. Enable HTTPS, deploy, then open the site in Safari on iPhone and Chrome on Android.
6. Both people enter the same site password, then the same room code (4–12 letters/numbers), and press Start camera.

## Important limitations
This is a starter project, not a security audit or production-certified calling service. It uses a public STUN server only; some networks require a TURN relay for reliable calls. Configure TURN before relying on it. Never put TURN secrets in public client code. Anyone with the shared password can enter the site; room codes are not identity verification. Calls require HTTPS on a public host. A participant can still record a call. Without `MONGODB_URI`, sessions use Express's in-memory store, suitable only for testing. Test on real iPhone and Android devices before relying on it.
