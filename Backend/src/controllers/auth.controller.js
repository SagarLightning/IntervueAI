const UserModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const tokenBlacklistModel = require('../models/blacklist.model');

/**
 * @name registerController
 * @description Register a new user. expects username, email and password in the request body.
 * @access Public
 */

async function registerUserController(req, res) {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    const isUserAlreadyExists = await UserModel.findOne({
        $or: [{ username }, { email }]
    });
    if (isUserAlreadyExists) {
        return res.status(400).json({ message: 'User already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ username, email, password: hash });
    const token = jwt.sign({ id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    )
    res.cookie('token', token)
    res.status(201).json({ message: 'User created successfully', user: { username: user.username, email: user.email } });
}


/**
 * @name loginController
 * @description Login a user. expects email and password in the request body.
 * @access Public
 * 
 * */

async function loginUserController(req, res) {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    )
    res.cookie('token', token)
    res.status(200).json({ message: 'Login successful', user: { id: user._id, username: user.username, email: user.email } });
}


/**
 * @name logoutController
 * @description Logout a user.
 * @access Public
 * 
 * */

async function logoutUserController(req, res) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(400).json({ message: 'No token provided, already logged out?' });
    }

    await tokenBlacklistModel.create({ token });
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout successful' });
}


/**
 * @name getMeController
 * @description Get current logged in user data
 * @access Private
 */

async function getMeController(req, res) {
    const user = await UserModel.findById(req.user.id)
    res.status(200).json({
        message: "User details fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

module.exports = { registerUserController, loginUserController, logoutUserController, getMeController };