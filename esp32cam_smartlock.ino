#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>
#include <ESP_Mail_Client.h>
#include <HardwareSerial.h>
#include <Adafruit_Fingerprint.h>

// ───── WIFI ─────
const char* ssid = "sbm16_wnepal_2";
const char* password = "kin@chaiyo";

// ───── EMAIL ─────
#define AUTHOR_EMAIL    "hp.infotechns2025@gmail.com"
#define AUTHOR_PASSWORD "uktq xaek wleu mrtt"
#define RECIPIENT_EMAIL "hp.infotechns2025@gmail.com"

SMTPSession smtp;

// ───── PINS ─────
#define RELAY_PIN     13
#define VIBRATION_PIN 12

// ───── FINGERPRINT ─────
HardwareSerial fpSerial(2);
Adafruit_Fingerprint finger(&fpSerial);

// ───── SERVER ─────
WebServer server(80);

// ───── STATE ─────
unsigned long lastVibration = 0;
#define VIB_COOLDOWN 8000

// ───── LOCK SYSTEM ─────
void lockDoor() {
  digitalWrite(RELAY_PIN, HIGH); // LOCK
}

void unlockDoor() {
  digitalWrite(RELAY_PIN, LOW);  // UNLOCK
  delay(2000);                  // FAST unlock
  lockDoor();
}

// ───── EMAIL WITH PHOTO ─────
void sendPhoto(String subject) {

  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) return;

  SMTP_Message msg;

  msg.sender.name = "Smart Lock";
  msg.sender.email = AUTHOR_EMAIL;
  msg.subject = subject;
  msg.addRecipient("Owner", RECIPIENT_EMAIL);

  msg.text.content = "Security Alert from Smart Lock";

  SMTP_Attachment att;
  att.descr.filename = "alert.jpg";
  att.descr.mime = "image/jpeg";
  att.blob.data = fb->buf;
  att.blob.size = fb->len;

  msg.addAttachment(att);

  ESP_Mail_Session session;
  session.server.host_name = "smtp.gmail.com";
  session.server.port = 465;
  session.login.email = AUTHOR_EMAIL;
  session.login.password = AUTHOR_PASSWORD;

  smtp.connect(&session);
  MailClient.sendMail(&smtp, &msg);

  esp_camera_fb_return(fb);
}

// ───── FINGERPRINT SCAN ─────
int scanFingerprint() {

  unsigned long start = millis();

  while (millis() - start < 10000) {  // wait 10 sec
    if (finger.getImage() == FINGERPRINT_OK) {
      if (finger.image2Tz() == FINGERPRINT_OK) {
        if (finger.fingerSearch() == FINGERPRINT_OK) {
          return 1;
        }
      }
    }
    delay(50);
  }

  return 0;
}

// ───── CAMERA INIT ─────
void startCamera() {

  camera_config_t c;

  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;

  c.pin_d0 = 5;
  c.pin_d1 = 18;
  c.pin_d2 = 19;
  c.pin_d3 = 21;
  c.pin_d4 = 36;
  c.pin_d5 = 39;
  c.pin_d6 = 34;
  c.pin_d7 = 35;

  c.pin_xclk = 0;
  c.pin_pclk = 22;
  c.pin_vsync = 25;
  c.pin_href = 23;

  c.pin_sscb_sda = 26;
  c.pin_sscb_scl = 27;

  c.pin_pwdn = 32;
  c.pin_reset = -1;

  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;

  c.frame_size = FRAMESIZE_QVGA;
  c.jpeg_quality = 10;
  c.fb_count = 1;

  esp_camera_init(&c);
}

// ───── STREAM SERVER ─────
void startServer() {

  server.on("/", []() {
    server.send(200, "text/html",
      "<h2>ESP32 CAM</h2><img src='/stream'>");
  });

  server.on("/stream", []() {

    WiFiClient client = server.client();

    client.print(
      "HTTP/1.1 200 OK\r\n"
      "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n"
    );

    while (client.connected()) {

      camera_fb_t * fb = esp_camera_fb_get();
      if (!fb) continue;

      client.printf(
        "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n",
        fb->len
      );

      client.write(fb->buf, fb->len);
      client.print("\r\n");

      esp_camera_fb_return(fb);

      delay(30);
    }
  });

  server.begin();
}

// ───── SETUP ─────
void setup() {

  Serial.begin(9600);

  // Relay
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // LOCK at startup

  // Vibration
  pinMode(VIBRATION_PIN, INPUT);

  // Fingerprint
  fpSerial.begin(57600, SERIAL_8N1, 14, 15);
  finger.begin(57600);

  if (finger.verifyPassword()) {
    Serial.println("FP READY");
  } else {
    Serial.println("FP ERROR");
  }

  // WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(300);

  Serial.print("STREAM: http://");
  Serial.println(WiFi.localIP());

  // Start camera + server
  startCamera();
  startServer();
}

// ───── LOOP ─────
void loop() {

  server.handleClient();

  // ─── SERIAL COMMANDS FROM ARDUINO ───
  if (Serial.available()) {

    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "UNLOCK") {
      unlockDoor();
    }

    else if (cmd == "LOCK") {
      lockDoor();
    }

    else if (cmd == "WRONG") {
      sendPhoto("Wrong PIN Attempt!");
    }

    else if (cmd == "FINGERPRINT") {

      int result = scanFingerprint();

      if (result == 1) {
        Serial.println("FP_OK");
        unlockDoor();
      } else {
        Serial.println("FP_FAIL");
        sendPhoto("Fingerprint Failed!");
      }
    }
  }

  // ─── VIBRATION DETECTION ───
  if (digitalRead(VIBRATION_PIN) == HIGH) {

    if (millis() - lastVibration > VIB_COOLDOWN) {

      lastVibration = millis();

      sendPhoto("Vibration Alert!");
    }
  }
}