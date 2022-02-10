const asyncHandler = require('../middleware/async')
const ErrorResponse = require('../utils/errorResponse')
const User = require('../models/User')

/**
 * @api {get} /api/v1/users Get all users
 * @apiGroup Users
 * @apiDescription 获取所有用户列表
 * @apiPermission Private/Admin
 * @apiHeader {String} authorization 有效token值.
 */
exports.getUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults)
})
/**
 * @api {get} /api/v1/users/:id  Get single user
 * @apiGroup Users
 * @apiDescription 通过id查询用户
 * @apiPermission Private/Admin
 * @apiHeader {String} authorization 有效token值.
 * @apiParam  {String} id user id number
 */
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)

  if (!user)
    return next(new ErrorResponse(`No user with that id of ${req.params.id}`))

  res.status(200).json({ success: true, data: user })
})

/**
 * @api {post} /api/v1/users Create user
 * @apiGroup Users
 * @apiDescription 创建用户
 * @apiPermission Private/Admin
 * @apiHeader {String} authorization 有效token值.
 * @apiBody {String} name 用户名
 * @apiBody {String} email 邮箱
 * @apiBody {String{5..12}} password 密码
 * @apiBody {String=admin,user} role 身份 admin or user
 */
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body)

  res.status(201).json({ success: true, data: user })
})
/**
 * @api {put} /api/v1/users/:id  Update user
 * @apiGroup Users
 * @apiDescription 通过id更新指定用户密码
 * @apiPermission Private/Admin
 * @apiHeader {String} authorization 有效token值.
 * @apiParam  {String} id user id number
 * @apiBody {String} password 新密码
 */
exports.updateUser = asyncHandler(async (req, res, next) => {
  req.body.password = ''
  delete req.body.password

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })

  if (!user)
    return next(new ErrorResponse(`No user with that id of ${req.params.id}`))

  res.status(200).json({ success: true, data: user })
})
/**
 * @api {delete} /api/v1/users/:id  Delete user
 * @apiGroup Users
 * @apiDescription 通过id删除指定用户
 * @apiPermission Private/Admin
 * @apiHeader {String} authorization 有效token值.
 * @apiParam  {String} id user id number
 */
// @desc    Delete user
// @route   DELETE /api/v1/auth/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)

  if (!user)
    return next(new ErrorResponse(`No user with that id of ${req.params.id}`))

  await User.findByIdAndDelete(req.params.id)

  res.status(200).json({ success: true, data: {} })
})
