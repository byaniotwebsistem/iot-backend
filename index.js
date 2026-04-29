const mqtt = require("mqtt");
const admin = require("firebase-admin");
const express = require("express");
require("dotenv").config();

// ================= VALIDACIÓN DE VARIABLES =================
if (!process.env.FIREBASE_KEY) {
  console.error("❌ ERROR: FIREBASE_KEY no definido");
  process.exit(1);
}

if (!process.env.MQTT_HOST || !process.env.MQTT_USER || !process.env.MQTT_PASS) {
  console.error("❌ ERROR: Datos MQTT incompletos");
  process.exit(1);
}

// ================= FIREBASE =================
let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
} catch (error) {
  console.error("❌ ERROR parseando FIREBASE_KEY:", error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();

// ================= MQTT =================
const client = mqtt.connect(`mqtts://${process.env.MQTT_HOST}`, {
  port: 8883,
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  reconnectPeriod: 5000 // reconexión automática
});

// ---------------- CONEXIÓN ----------------
client.on("connect", () => {
  console.log("✅ MQTT conectado");

  client.subscribe("casa/#", (err) => {
    if (err) console.log("❌ Error al suscribirse:", err);
    else console.log("📡 Suscrito a casa/#");
  });
});

// ---------------- ERRORES MQTT ----------------
client.on("error", (err) => {
  console.log("❌ Error MQTT:", err.message);
});

// ---------------- RECONEXIÓN ----------------
client.on("reconnect", () => {
  console.log("🔄 Reintentando conexión MQTT...");
});

// ---------------- MQTT → FIREBASE ----------------
client.on("message", (topic, message) => {
  try {
    const value = message.toString();

    console.log("📩 MQTT:", topic, value);

    db.ref(topic).set(Number(value));
  } catch (error) {
    console.log("❌ Error procesando mensaje:", error);
  }
});

// ---------------- FIREBASE → MQTT ----------------
db.ref("casa").on("child_changed", snapshot => {
  const key = snapshot.key;
  const value = snapshot.val();

  console.log("🔁 Firebase → MQTT:", key, value);

  client.publish(`casa/${key}`, String(value));
});

// ================= SERVIDOR WEB (RENDER) =================
const app = express();

app.get("/", (req, res) => {
  res.send("🚀 IoT Backend activo 24/7");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🌐 Servidor corriendo en puerto", PORT);
});
