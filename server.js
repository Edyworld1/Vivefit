const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('./models/User');

const app = express();
const JWT_SECRET = 'CLAVE_SECRETA_VIVE_FIT_2026'; // Clave para los tokens

// 1. CONFIGURACIÓN
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// 2. CONEXIÓN A BASE DE DATOS (NoSQL - MongoDB)
mongoose.connect('mongodb://localhost:27017/recetasAmorDB')
    .then(() => console.log("¡Conectado a MongoDB con éxito! ✅"))
    .catch(err => console.error("Error al conectar a Mongo:", err));

// 3. RUTA DE REGISTRO (Seguridad OWASP)
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        // --- VALIDACIÓN DE ENTRADAS (Requisito OWASP) ---
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: "Este correo ya está registrado" });

        // --- HASH SEGURO DE CONTRASEÑA (Bcrypt) ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            nombre,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ mensaje: "Usuario registrado correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error interno del servidor" }); // No exponemos detalles sensibles
    }
});

// 4. RUTA DE LOGIN (Validación y JWT)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validación básica
        if (!email || !password) return res.status(400).json({ error: "Faltan credenciales" });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

        // --- COMPARACIÓN DE HASH ---
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Credenciales inválidas" });

        // --- GENERACIÓN DE TOKEN (JWT) ---
        const token = jwt.sign({ id: user._id, nombre: user.nombre }, JWT_SECRET, { expiresIn: '1h' });
        
        res.json({ token, mensaje: "Bienvenido a Vive Fit" });

    } catch (error) {
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 5. RUTA PROTEGIDA (Consulta de información protegida - REQUISITO TAREA)
// Esta ruta simula datos que solo un usuario logueado puede ver
app.get('/api/datos-protegidos', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (!token) return res.status(401).json({ error: "Acceso denegado. Se requiere token." });

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        res.json({ 
            mensaje: "Has accedido a información protegida", 
            usuarioId: verificado.id,
            datos: "Tu plan de dieta personalizado está listo." 
        });
    } catch (error) {
        res.status(403).json({ error: "Token inválido o expirado" });
    }
});


// ✅ RUTA DE REGISTRO
app.post('/api/register', async (req, res) => {
   // tu código de registro
});


// 🔥 👉 AQUÍ PEGA LO DE RECUPERAR
app.post('/api/recuperar', async (req, res) => {
  try {
    const { email, nuevaPassword } = req.body;

    const usuario = await User.findOne({ email });

    if (!usuario) {
      return res.json({ error: "❌ Usuario no encontrado" });
    }

    const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

usuario.password = hashedPassword;

    await usuario.save();

    res.json({ mensaje: "✅ Contraseña actualizada correctamente" });

  } catch (error) {
    console.log(error);
    res.json({ error: "❌ Error al actualizar contraseña" });
  }
});


// ENCENDER SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en: http://localhost:${PORT}`);
});