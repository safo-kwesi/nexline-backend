/**
 * Simple header-based admin guard.
 * Frontend sends:  x-admin-pw: <password>
 * We compare against ADMIN_PASSWORD env var.
 */
function adminAuth(req, res, next) {
  const pw = req.headers['x-admin-pw'];

  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorised.' });
  }

  next();
}

module.exports = adminAuth;
