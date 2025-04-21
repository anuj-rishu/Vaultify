const handleError = (res, err) => {
  console.error('Error handling:', err);
  
  
  if (err.message && err.message.includes('403')) {
    return res.status(403).json({
      error: 'Access denied. You might not have permission to view this resource.',
      message: err.message,
      status: 403
    });
  }
  
  if (err && (err.message.includes('invalid response format') || 
      err.message.includes('invalid token format'))) {
    return res.status(401).json({
      tokenInvalid: true,
      error: 'Session expired or invalid',
      status: 401
    });
  }
  
  return res.status(500).json({
    error: err.message || 'Internal server error',
    status: 500
  });
};

module.exports = { handleError };