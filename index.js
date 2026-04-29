const mqtt = require("mqtt");
const admin = require("firebase-admin");
require("dotenv").config();

// ================= FIREBASE =================
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();

// ================= MQTT =================
const client = mqtt.connect(`mqtts://${process.env.MQTT_HOST}`, {
  port: 8883,
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS
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