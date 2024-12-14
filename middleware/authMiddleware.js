function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.user) { // Checks if session or user is not present
    return res.status(401).json({
      message: 'You must be logged in to access this resource.' // Sends an error if not authenticated
    });
  }

  next(); // If authenticated, proceed to the next middleware/route handler
}

module.exports = isAuthenticated; // Exports the middleware function
