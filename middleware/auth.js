const jwt = require('jsonwebtoken')
const asyncHandler = require('./async')
const ErrorResponse = require('../utils/errorResponse')
const User = require('../models/User')

exports.protect = asyncHandler(async (req, res, next) => {
  let token = ""
  if (
    req.headers.authorization
  ) {
    token = req.headers.authorization
  } else if (
    req.headers.cookie &&
    req.headers.cookie.startsWith('token')
  ) {
    token = req.headers.cookie.split('=')[1]
  }
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401))
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = await User.findById(decoded.id)
    next()
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401))
  }
})

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      )
    }
    next()
  }
}
