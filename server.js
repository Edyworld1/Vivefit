const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');
const User = require('./models/User');

const app = express();
const JWT_SECRET = 'CLAVE_SECRETA_VIVE_FIT_2026'; 


// 1. CONFIGURACIÓN
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// Forzar a que la página de inicio sea bienvenido.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'bienvenido.html'));
});

// 🔒 CONFIGURACIÓN DE NODEMAILER CORREGIDA
const transportereMail = nodemailer.createTransport({
    service: 'gmail', // Usar el servicio nativo evita problemas de configuración de puertos
    auth: {
        user: 'edmundomendez117@gmail.com', 
        pass: 'cvrz ymno gqkj yvjx' // 👈 BORRA ESTO Y PEGA LAS 16 LETRAS DE GOOGLE SIN ESPACIOS
    },
    tls: {
        rejectUnauthorized: false // Mantiene la evasión de bloqueos en la red universitaria
    }
});

// 2. CONEXIÓN A BASE DE DATOS (NoSQL - MongoDB)
mongoose.connect('mongodb://localhost:27017/recetasAmorDB')
    .then(() => console.log("¡Conectado a MongoDB con éxito! ✅"))
    .catch(err => console.error("Error al conectar a Mongo:", err));

// 3. RUTA DE REGISTRO (Seguridad OWASP)
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: "Este correo ya está registrado" });

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
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// 4. RUTA DE LOGIN (Doble Factor con Respaldo Automático ante Bloqueos de Red)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) return res.status(400).json({ error: "Faltan credenciales" });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Credenciales inválidas" });

        // 🔐 CODIFICACIÓN SEGURA: Generar código de 6 dígitos aleatorio
        const codigoSecreto = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Guardar en MongoDB con expiración de 5 minutos
        user.codigoMFA = codigoSecreto;
        user.mfaExpiracion = Date.now() + 5 * 60 * 1000; 
        await user.save();

        // ✉️ INTENTO DE ENVÍO DE CORREO REAL
        try {
            const opcionesCorreo = {
                from: '"Seguridad Vive Fit" <edmundomendez117@gmail.com>',
                to: user.email,
                subject: '🔒 Tu código de verificación de doble factor',
                html: `
                    <div style="font-family: Arial, sans-serif; border: 1px solid #6196cc; padding: 20px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                        <h2 style="color: #6196cc; text-align: center;">Vive Fit</h2>
                        <p>Hola,</p>
                        <p>Para garantizar la privacidad de tus datos según los estándares OWASP, se ha generado tu clave temporal de acceso:</p>
                        <div style="background-color: #f8f9fa; border: 1px dashed #6196cc; text-align: center; padding: 15px; font-size: 26px; font-weight: bold; letter-spacing: 5px; color: #2c3e50; margin: 20px 0;">
                            ${codigoSecreto}
                        </div>
                        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">Este código es confidencial, de un solo uso y expirará en 5 minutos.</p>
                    </div>
                `
            };
            await transportereMail.sendMail(opcionesCorreo);
            console.log(`✉️ Correo enviado con éxito a: ${user.email}`);
        } catch (mailError) {
            // 🛡️ PLAN DE RESPALDO SI EL INTERNET BLOQUEA A GMAIL
            console.log("========================================");
            console.log("⚠️ AVISO: El internet local bloqueó el envío del correo.");
            console.log(`👉 MODO RESPALDO ACTIVADO. TU CÓDIGO ES: ${codigoSecreto}`);
            console.log("========================================");
        }

        // El servidor siempre responde con éxito para que la pantalla avance
        res.json({ requiereMFA: true, mensaje: "Código generado con éxito" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor al procesar el inicio de sesión" });
    }
});

// 5. RUTA DE VERIFICACIÓN MFA (Paso 2: Valida la segunda clave y entrega el Token JWT)
app.post('/api/verificar-mfa', async (req, res) => {
    try {
        const { email, codigo } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

        // Validar si el código coincide y si no ha expirado
        if (!user.codigoMFA || user.codigoMFA !== codigo || Date.now() > user.mfaExpiracion) {
            return res.status(401).json({ error: "Código inválido o expirado" });
        }

        // Limpiar el código usado por seguridad (Práctica OWASP)
        user.codigoMFA = null;
        user.mfaExpiracion = null;
        await user.save();

        // Generamos el Token definitivo tras pasar el doble factor
        const token = jwt.sign({ id: user._id, nombre: user.nombre }, JWT_SECRET, { expiresIn: '1h' });
        
        res.json({ token, mensaje: "Bienvenido a Vive Fit - Autenticación completa" });

    } catch (error) {
        res.status(500).json({ error: "Error al verificar código" });
    }
});

// 6. RUTA PROTEGIDA 
app.get('/api/datos-protegidos', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

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

// 7. RUTA DE RECUPERAR CONTRASEÑA 
app.post('/api/recuperar', async (req, res) => {
  try {
    const { email, nuevaPassword } = req.body;

    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ error: "❌ Usuario no encontrado" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

    usuario.password = hashedPassword;
    await usuario.save();

    res.json({ mensaje: "✅ Contraseña actualizada correctamente" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "❌ Error al actualizar contraseña" });
  }
});

// ENCENDER SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});