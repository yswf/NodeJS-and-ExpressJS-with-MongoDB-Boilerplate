const crypto = require('crypto')
const asyncHandler = require('../middleware/async')
const ErrorResponse = require('../utils/errorResponse')
const sendEmail = require('../utils/sendEmail')

const User = require('../models/User')

/**
 * @api {post} /api/v1/auth/register Register User
 * @apiGroup Auth
 * @apiDescription 注册用户
 *
 * @apiBody {String} name 用户名
 * @apiBody {String} email 邮箱
 * @apiBody {String{5..12}} password 密码
 * @apiBody {String=admin,user} role 身份 admin or user
 * @apiParamExample {json} request-example
 * {
 *   "name": "Fan Wang",
 *   "email": "fan_wang@wistron.com",
 *  "password": "test",
 * "role": "admin"
 * }
 * @apiSuccess {String} token 该用户token
 * @apiSuccessExample  {json} success-example
 * {
 *   "success": true,
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.*eyJpZCI6IjYyMDM3OTc4NGM0NDkwMzZlNGJlZGIwNyIsImlhdCI6MTY0NDM5NDg3MiwiZXhwIjoxNjQ2OTg2ODcyfQ.Hb_VQGov9JlE6Fd748d8r3WoLM5flBETX-XVnCZLL-A"
 * }
 * @apiError {String} error 错误信息
 * @apiErrorExample  {json} error-example
 * {
 *   "success": false,
 *  "error": [
 *      {
 *           "field": "role",
 *          "message": "`` is not a valid enum value for path `role`."
 *       },
 *       {
 *           "field": "email",
 *           "message": "email already exists."
 *       }
 *   ]
 *}
 */
exports.register = asyncHandler(async (req, res, next) => {
  let { name, email, password, role } = req.body

  email = email.toLowerCase()

  user = await User.create({
    name,
    email,
    password,
    role
  })

  sendTokenResponse(user, 200, res)
})

/**
 * @api {post} /api/v1/auth/login Login User
 * @apiGroup Auth
 * @apiDescription 登陆用户
 *
 * @apiBody {String} email 邮箱
 * @apiBody {String{5..12}} password 密码
 */
exports.login = asyncHandler(async (req, res, next) => {
  let { email, password } = req.body

  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400))
  }

  email = email.toLowerCase()

  const user = await User.findOne({ email }).select('+password')

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 400))
  }

  const isMatch = await user.matchPassword(password)

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 400))
  }

  sendTokenResponse(user, 200, res)
})

/**
 * @api {post} /api/v1/auth/logout Log User Out
 * @apiGroup Auth
 * @apiDescription 注销登陆
 * @apiHeader {String} authorization 有效token值.
 */
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  })

  res.status(200).json({ success: true, data: {} })
})

/**
 * @api {post} /api/v1/auth/me Get current logged in user
 * @apiGroup Auth
 * @apiDescription 当前用户信息
 * @apiHeader {String} authorization 有效token值.
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = req.user

  res.status(200).json({ success: true, data: user })
})
/**
 * @api {put} /api/v1/auth/updatedetails Update user details
 * @apiGroup Auth
 * @apiDescription 修改用户信息
 *
 * @apiHeader {String} authorization 有效token值.
 * @apiBody {String} name 用户名
 * @apiBody {String} email 邮箱
 */
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email.toLowerCase()
  }
  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
    context: 'query'
  })

  res.status(200).json({ success: true, data: user })
})
/**
 * @api {put} /api/v1/auth/updatepassword Update password
 * @apiGroup Auth
 * @apiDescription 更改密码
 * @apiHeader {String} authorization 有效token值.
 * @apiBody {String} currentPassword 旧密码
 * @apiBody {String} newPassword 新密码
 */
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password')

  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401))
  }

  user.password = req.body.newPassword
  await user.save()

  sendTokenResponse(user, 200, res)
})
/**
 * @api {post} /api/v1/auth/forgotpassword  Forgot password
 * @apiGroup Auth
 * @apiDescription 找回密码
 * @apiBody {String} email 邮箱
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() })

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404))
  }

  const resetToken = user.getResetPasswordToken()

  await user.save({ validateBeforeSave: false })

  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/auth/resetpassword/${resetToken}`

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message
    })
    res.status(200).json({ success: true, data: 'Email sent' })
  } catch (err) {
    console.log(err)
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save({ validateBeforeSave: false })

    return next(new ErrorResponse('Email could not be sent', 500))
  }
})
/**
 * @api {put} /api/v1/auth/resetpassword/:resettoken Update cookies
 * @apiGroup Auth
 * @apiDescription 更改token
 * @apiHeader {String} authorization 有效token值.
 * @apiParam  {String} resettoken token
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex')

  console.log(resetPasswordToken)

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  })

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400))
  }

  // Set new password
  user.password = req.body.password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()

  sendTokenResponse(user, 200, res)
})

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken()

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  }

  if (process.env.NODE_ENV === 'production') {
    options.secure = true
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({ success: true, token })
}
