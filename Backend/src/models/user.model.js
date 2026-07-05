const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: [true, "Username already taken"],
    },
    email: {
        type: String,
        required: true,
        unique: [true, "Email already taken"],
    },
    password: {
        type: String,
        required: true,
        minlength: [8, "Password must be at least 8 characters long"],
    },
})

const UserModel = mongoose.model('Users', userSchema);

module.exports = UserModel;

        