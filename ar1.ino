#include <Keypad.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>

SoftwareSerial espSerial(11, 10);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// BUZZER
#define BUZZER_PIN 12

// KEYPAD
const byte ROWS = 4;
const byte COLS = 4;

char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};

byte rowPins[ROWS] = {2, 3, 4, 5};
byte colPins[COLS] = {6, 7, 8, 9};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

String correctPIN = "1234";
String input = "";
bool waitingFP = false;

// BUZZER FUNCTIONS
void beepCorrect() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
}

void beepWrong() {
  // Alarm style - ON 800ms OFF 200ms for 5 seconds
  unsigned long start = millis();
  while (millis() - start < 5000) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(800);
    digitalWrite(BUZZER_PIN, LOW);
    delay(200);
  }
}

void lcdMsg(String a, String b="") {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print(a);
  lcd.setCursor(0,1); lcd.print(b);
}

void setup() {
  Serial.begin(9600);
  espSerial.begin(9600);

  pinMode(BUZZER_PIN, OUTPUT);

  lcd.init();
  lcd.backlight();

  lcdMsg("SMART LOCK", "Enter PIN:# FP:A");
}

void loop() {

  // RECEIVE FROM ESP
  if (espSerial.available()) {
    String r = espSerial.readStringUntil('\n');
    r.trim();

    if (r == "FP_OK") {
      beepCorrect();
      lcdMsg("Fingerprint OK", "Unlocked");
      waitingFP = false;
      delay(1500);
    }
    else if (r == "FP_FAIL") {
      beepWrong();
      lcdMsg("FP Failed", "Try Again");
      waitingFP = false;
      delay(1500);
    }

    lcdMsg("SMART LOCK", "Enter PIN:# FP:A");
  }

  char key = keypad.getKey();
  if (!key) return;

  // CANCEL FINGERPRINT WITH *
  if (key == '*' && waitingFP) {
    waitingFP = false;
    input = "";
    lcdMsg("Cancelled", "");
    delay(500);
    lcdMsg("SMART LOCK", "Enter PIN:# FP:A");
    return;
  }

  if (waitingFP) return;

  // FINGERPRINT
  if (key == 'A') {
    beepCorrect();
    lcdMsg("Scan Finger", "Wait...");
    espSerial.println("FINGERPRINT");
    waitingFP = true;
    return;
  }

  // CONFIRM PIN
  if (key == '#') {

    if (input == correctPIN) {
      beepCorrect();
      lcdMsg("Access Granted", "Unlocked");

      espSerial.println("UNLOCK");

      delay(2000);

      espSerial.println("LOCK");

    } else {
      beepWrong();
      lcdMsg("Wrong PIN", "Access Denied");
      espSerial.println("WRONG");
      delay(1000);
    }

    input = "";
    lcdMsg("SMART LOCK", "Enter PIN:# FP:A");
    return;
  }

  // CLEAR INPUT
  if (key == '*') {
    input = "";
    lcdMsg("Cleared");
    delay(500);
    lcdMsg("SMART LOCK", "Enter PIN:# FP:A");
    return;
  }

  // INPUT
  input += key;

  String stars = "";
  for (int i = 0; i < input.length(); i++) stars += "*";

  lcdMsg("SMART LOCK", stars);
}