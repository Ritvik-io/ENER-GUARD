/**
 * SafeScout MINE-ENERGY - ESP32 Rover Main Firmware
 * Platform: ESP32 DevKit V1
 * Communication: Serial UART (115200) to Raspberry Pi 5
 * Features: Non-blocking sensor polling, dead-man watchdog, hardware E-Stop ISR
 */

#include <Arduino.h>
#include <ArduinoJson.h>
#include "config.h"
#include "motor_controller.h"
#include "sensors.h"

// Global flow counter updated in ISR
volatile unsigned long g_flow_pulse_count = 0;

void IRAM_ATTR flowSensorPulseISR() {
    g_flow_pulse_count++;
}

// Controller instances
MotorController motorController;
SensorManager sensorManager;
SensorData currentSensorData;

// Telemetry & Heartbeat Timers
unsigned long lastTelemetryTime = 0;
unsigned long heartbeatCounter = 0;
String inputCommandBuffer = "";

// E-Stop Hardware Interrupt
void IRAM_ATTR estopISR() {
    motorController.handleEStopInterrupt();
}

void setup() {
    // 1. Initialize Serial Port for Raspberry Pi Communication
    Serial.begin(SERIAL_BAUD_RATE);
    while (!Serial && millis() < 1000); // Short wait for serial port

    Serial.println();
    Serial.println("{\"msg\":\"SafeScout MINE-ENERGY ESP32 Booting\",\"ver\":\"2.1.0\"}");

    // 2. Initialize Motor Controller & Safety Interlocks
    motorController.init();
    attachInterrupt(digitalPinToInterrupt(ESTOP_INTERRUPT_PIN), estopISR, CHANGE);

    // 3. Initialize Sensor Subsystem
    sensorManager.init();

    // 4. Initial telemetry burst
    sensorManager.readAll(currentSensorData);
    Serial.println("{\"msg\":\"Hardware Init Complete\",\"status\":\"READY\"}");
}

void processIncomingCommand(const String &jsonStr) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, jsonStr);
    if (error) return;

    const char* cmd = doc["cmd"] | "";

    // A. Movement Command (Dead-Man Watchdog Protected)
    if (strcmp(cmd, "MOVE") == 0) {
        int left_pwm = doc["left_pwm"] | 0;
        int right_pwm = doc["right_pwm"] | 0;
        motorController.setSpeed(left_pwm, right_pwm);
    }
    // B. Emergency Stop Command
    else if (strcmp(cmd, "ESTOP") == 0) {
        motorController.triggerSoftwareEStop();
    }
    // C. Reset Emergency Stop Command
    else if (strcmp(cmd, "RESET_ESTOP") == 0) {
        if (motorController.resetEStop()) {
            Serial.println("{\"event\":\"ESTOP_RESET_SUCCESS\"}");
        } else {
            Serial.println("{\"event\":\"ESTOP_RESET_FAILED_PHYSICAL_TRIGGERED\"}");
        }
    }
    // D. Manual Alarm Beacon Trigger
    else if (strcmp(cmd, "SET_ALARM") == 0) {
        bool state = doc["relay_state"] | false;
        digitalWrite(ALARM_RELAY_PIN, state ? HIGH : LOW);
    }
    // E. Ping / Heartbeat
    else if (strcmp(cmd, "PING") == 0) {
        Serial.println("{\"pong\":true,\"timestamp\":millis()}");
    }
}

void sendTelemetry() {
    StaticJsonDocument<1024> doc;

    doc["version"] = "2.1.0";
    doc["device_id"] = "safescout_esp32_01";
    doc["timestamp"] = millis();
    doc["heartbeat"] = ++heartbeatCounter;

    // Status
    JsonObject status = doc.createNestedObject("status");
    status["online"] = true;
    status["mode"] = motorController.isMoving() ? "active" : "idle";
    status["emergency_stop"] = motorController.isEStopActive();
    status["battery_voltage_v"] = serialized(String(currentSensorData.battery_voltage_v, 2));
    status["battery_current_a"] = serialized(String(currentSensorData.battery_current_a, 2));
    status["battery_percentage"] = currentSensorData.battery_percentage;
    status["temperature_mcu_c"] = serialized(String(temperatureRead(), 1));
    status["watchdog_ok"] = true;

    // Environmental Gas & Air
    JsonObject env = doc.createNestedObject("environmental");
    env["mq2_raw_adc"] = currentSensorData.mq2_raw;
    env["mq2_ppm_combustible"] = serialized(String(currentSensorData.mq2_ppm, 1));
    env["mq2_calibrated"] = currentSensorData.mq2_calibrated;
    env["mq8_raw_adc"] = currentSensorData.mq8_raw;
    env["mq8_ppm_hydrogen"] = serialized(String(currentSensorData.mq8_ppm, 1));
    env["mq8_calibrated"] = currentSensorData.mq8_calibrated;
    env["dht11_temp_c"] = serialized(String(currentSensorData.dht_temp_c, 1));
    env["dht11_humidity_pct"] = serialized(String(currentSensorData.dht_humidity_pct, 1));
    if (currentSensorData.mq2_ppm > MQ2_METHANE_CRITICAL_PPM || currentSensorData.mq8_ppm > MQ8_HYDROGEN_CRITICAL_PPM) {
        env["gas_alarm_state"] = "CRITICAL";
        digitalWrite(ALARM_RELAY_PIN, HIGH);
    } else if (currentSensorData.mq2_ppm > MQ2_METHANE_WARNING_PPM || currentSensorData.mq8_ppm > MQ8_HYDROGEN_WARNING_PPM) {
        env["gas_alarm_state"] = "WARNING";
    } else {
        env["gas_alarm_state"] = "NORMAL";
    }

    // Ventilation Pitot-Static
    JsonObject vent = doc.createNestedObject("ventilation");
    vent["sdp31_diff_pressure_pa"] = serialized(String(currentSensorData.sdp31_diff_pressure_pa, 2));
    vent["airway_temp_c"] = serialized(String(currentSensorData.dht_temp_c, 1));
    vent["calculated_air_velocity_ms"] = serialized(String(currentSensorData.air_velocity_ms, 2));
    vent["pitot_clogged_warning"] = (currentSensorData.sdp31_diff_pressure_pa < -20.0f);

    // Acoustic Ultrasonic 40kHz
    JsonObject acoustic = doc.createNestedObject("acoustic_ultrasonic");
    acoustic["ultrasonic_40khz_raw"] = currentSensorData.ultrasonic_40khz_raw;
    acoustic["ultrasonic_db_spl"] = serialized(String(currentSensorData.ultrasonic_db_spl, 1));
    acoustic["suspected_leak"] = currentSensorData.suspected_air_leak;

    // Pipelines (Air & Water)
    JsonObject pipes = doc.createNestedObject("pipelines");
    pipes["compressed_air_pressure_bar"] = serialized(String(currentSensorData.air_pressure_bar, 2));
    pipes["water_pipeline_pressure_bar"] = serialized(String(currentSensorData.water_pressure_bar, 2));
    pipes["water_flow_rate_lmin"] = serialized(String(currentSensorData.water_flow_rate_lmin, 2));
    pipes["water_cumulative_liters"] = serialized(String(currentSensorData.water_total_liters, 2));
    pipes["water_temp_c"] = serialized(String(currentSensorData.water_temp_c, 1));

    // Navigation & Obstacle Sensors
    JsonObject nav = doc.createNestedObject("navigation_sensors");
    nav["hc_sr04_distance_cm"] = serialized(String(currentSensorData.obstacle_distance_cm, 1));
    nav["left_pwm"] = motorController.getLeftPwm();
    nav["right_pwm"] = motorController.getRightPwm();

    // Serialize to Serial
    serializeJson(doc, Serial);
    Serial.println();
}

void loop() {
    unsigned long now = millis();

    // 1. Maintain Dead-Man Watchdog
    motorController.updateWatchdog();

    // 2. Read Incoming Commands from Serial Port
    while (Serial.available() > 0) {
        char inChar = (char)Serial.read();
        if (inChar == '\n' || inChar == '\r') {
            if (inputCommandBuffer.length() > 0) {
                processIncomingCommand(inputCommandBuffer);
                inputCommandBuffer = "";
            }
        } else {
            inputCommandBuffer += inChar;
            if (inputCommandBuffer.length() > 300) {
                inputCommandBuffer = ""; // Overflow guard
            }
        }
    }

    // 3. Periodic Sensor Polling and Telemetry Streaming at 10 Hz
    if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
        lastTelemetryTime = now;
        sensorManager.readAll(currentSensorData);
        sendTelemetry();
    }
}

