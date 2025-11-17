const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/studentsdata');
const userSchema = new mongoose.Schema({
    name: String,
    roll: Number,
    email: String,
    mobile: Number,
});
const User = mongoose.model('User', userSchema);
module.exports = User;