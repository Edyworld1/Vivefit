const mongoose = require('mongoose');

// Este es el "molde" para guardar usuarios (Actualizado para Seguridad Doble Factor)
const UserSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Aquí guardaremos la contraseña cifrada
    
    // 🔐 --- POLÍTICA DE PRIVACIDAD Y CODIFICACIÓN SEGURA ---
    // Guardará el código temporal de 6 dígitos enviado por correo
    codigoMFA: { 
        type: String, 
        default: null 
    },
    // Almacena la fecha exacta en que expira el código para que no sea eterno
    mfaExpiracion: { 
        type: Date, 
        default: null 
    }
});

module.exports = mongoose.model('User', UserSchema);
