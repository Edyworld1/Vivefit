const mongoose = require('mongoose');

// Este es el "molde" para guardar usuarios
const UserSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true } // Aquí guardaremos la contraseña cifrada
});

module.exports = mongoose.model('User', UserSchema);