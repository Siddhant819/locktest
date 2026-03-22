/*
 * SmartLock ESP32-CAM Controller
 * ================================
 * Hardware: ESP32-CAM (AI-Thinker module)
 * Features:
 *   - WiFi connection to backend API
 *   - Solenoid lock relay control (GPIO 12)
 *   - 4x4 Keypad PIN input
 *   - Fingerprint sensor (R307 / AS608) via UART
 *   - Buzzer alarm on failed access (GPIO 13)
 *   - Periodic lock status polling
 *   - Access log reporting
 *
 * Libraries required:
 *   - Keypad (by Mark Stanley)
 *   - Adafruit Fingerprint Sensor Library
 *   - ArduinoJson
 *   - HTTPClient (built-in ESP32)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Keypad.h>
#include <Adafruit_Fingerprint.h>

// ─── WiFi Configuration ──────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ─── Backend API Configuration ───────────────────────────────────────────────
// Replace with your server IP or domain (no trailing slash)
const char* BACKEND_URL   = "http://192.168.1.100:5000";
const char* DEVICE_NAME   = "ESP32-CAM-01";

// ─── Pin Definitions ─────────────────────────────────────────────────────────
#define RELAY_PIN         12   // Relay IN pin (active LOW on most relay modules)
#define BUZZER_PIN        13   // Buzzer
#define LED_FLASH_PIN      4   // On-board flash LED (GPIO 4 on AI-Thinker)

// Fingerprint sensor connected to UART2 (GPIO 16 RX, GPIO 17 TX)
HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

// ─── Keypad Configuration ────────────────────────────────────────────────────
const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {32, 33, 25, 26};
byte colPins[COLS] = {27, 14, 2,  15};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ─── PIN Configuration ───────────────────────────────────────────────────────
const String VALID_PIN = "1234";   // Change to your PIN
String enteredPin = "";

// ─── Timing ──────────────────────────────────────────────────────────────────
unsigned long lastStatusCheck = 0;
const unsigned long STATUS_INTERVAL = 5000;   // Poll every 5 seconds

bool currentLockState = true;  // true = locked

// ─── Setup ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  mySerial.begin(57600, SERIAL_8N1, 16, 17);

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_FLASH_PIN, OUTPUT);

  // Start locked
  setLock(true);

  Serial.println("SmartLock ESP32-CAM booting...");

  connectWiFi();
  initFingerprint();

  Serial.println("System ready.");
}

// ─── Main Loop ───────────────────────────────────────────────────────────────
void loop() {
  // 1. Handle keypad input
  handleKeypad();

  // 2. Handle fingerprint scan
  handleFingerprint();

  // 3. Periodic lock status check from backend
  if (millis() - lastStatusCheck > STATUS_INTERVAL) {
    lastStatusCheck = millis();
    checkLockStatus();
  }
}

// ─── WiFi ────────────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
    flashLED(3);
  } else {
    Serial.println("\nWiFi connection failed. Running offline.");
  }
}

// ─── Lock Control ────────────────────────────────────────────────────────────
void setLock(bool locked) {
  currentLockState = locked;
  // Relay active LOW: LOW = relay ON = solenoid energized (unlocked)
  // Invert for solenoid: unlocked = relay activated = LOW
  digitalWrite(RELAY_PIN, locked ? HIGH : LOW);
  Serial.printf("Lock state: %s\n", locked ? "LOCKED" : "UNLOCKED");
}

// ─── Buzzer ──────────────────────────────────────────────────────────────────
void beepSuccess() {
  tone(BUZZER_PIN, 1000, 200);
  delay(300);
  tone(BUZZER_PIN, 1500, 200);
  delay(300);
  noTone(BUZZER_PIN);
}

void beepFail() {
  for (int i = 0; i < 3; i++) {
    tone(BUZZER_PIN, 400, 150);
    delay(200);
    noTone(BUZZER_PIN);
    delay(100);
  }
}

// ─── LED Flash ───────────────────────────────────────────────────────────────
void flashLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_FLASH_PIN, HIGH);
    delay(100);
    digitalWrite(LED_FLASH_PIN, LOW);
    delay(100);
  }
}

// ─── Keypad Handler ──────────────────────────────────────────────────────────
void handleKeypad() {
  char key = keypad.getKey();
  if (!key) return;

  Serial.printf("Key pressed: %c\n", key);

  if (key == '#') {
    // Submit PIN
    if (enteredPin == VALID_PIN) {
      Serial.println("PIN correct!");
      grantAccess("PIN", DEVICE_NAME);
    } else {
      Serial.println("PIN incorrect!");
      denyAccess("PIN", DEVICE_NAME);
    }
    enteredPin = "";
  } else if (key == '*') {
    enteredPin = "";
    Serial.println("PIN cleared");
  } else {
    enteredPin += key;
    if (enteredPin.length() > 8) enteredPin = "";  // safety limit
  }
}

// ─── Fingerprint Handler ─────────────────────────────────────────────────────
void initFingerprint() {
  if (finger.verifyPassword()) {
    Serial.println("Fingerprint sensor found!");
    finger.getTemplateCount();
    Serial.printf("Sensor has %d templates\n", finger.templateCount);
  } else {
    Serial.println("Fingerprint sensor not found (sensor may not be connected)");
  }
}

void handleFingerprint() {
  if (!finger.verifyPassword()) return;

  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return;

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.printf("Fingerprint match found! ID: %d, Confidence: %d\n",
                  finger.fingerID, finger.confidence);
    String user = "Fingerprint-ID-" + String(finger.fingerID);
    grantAccess("FINGERPRINT", user);
  } else {
    Serial.println("Fingerprint not found");
    denyAccess("FINGERPRINT", DEVICE_NAME);
  }
}

// ─── Access Control ──────────────────────────────────────────────────────────
void grantAccess(const char* method, const String& user) {
  setLock(false);  // Unlock
  beepSuccess();
  flashLED(2);
  sendAccessLog(user, method, "success", "Access granted");

  // Auto-lock after 5 seconds
  delay(5000);
  setLock(true);
  sendAccessLog(user, "web", "success", "Auto-locked after 5 seconds");
}

void denyAccess(const char* method, const String& user) {
  beepFail();
  flashLED(5);
  sendAccessLog(user, method, "failed", "Access denied - invalid credentials");
  captureAndSendImage();  // Optional: capture snapshot on failed attempt
}

// ─── Backend Communication ───────────────────────────────────────────────────
void checkLockStatus() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/lock/status";
  http.begin(url);
  http.setTimeout(5000);

  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    DynamicJsonDocument doc(256);
    if (deserializeJson(doc, body) == DeserializationError::Ok) {
      bool newState = doc["isLocked"].as<bool>();
      if (newState != currentLockState) {
        Serial.printf("Lock state changed via web: %s\n", newState ? "LOCKED" : "UNLOCKED");
        setLock(newState);
        if (!newState) {
          beepSuccess();
          // Auto-lock after 5 seconds if unlocked remotely
          delay(5000);
          setLock(true);
          sendAccessLog("web", "web", "success", "Auto-locked after remote unlock");
        }
      }
    }
  }
  http.end();
}

void sendAccessLog(const String& user, const char* method, const char* status, const char* details) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/access-log";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  DynamicJsonDocument doc(512);
  doc["user"]    = user;
  doc["method"]  = method;
  doc["status"]  = status;
  doc["details"] = details;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("Access log sent: HTTP %d\n", code);
  http.end();
}

void captureAndSendImage() {
  // Placeholder for face detection / snapshot
  // Implement using ESP32-CAM camera library if needed
  Serial.println("Image capture placeholder (implement with ESP32-CAM camera)");
}
