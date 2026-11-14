/**
 * SafeScout MINE-ENERGY - ESP32 Rover Controller Configuration
 * Hardware: ESP32 DevKit V1
 * Verified, Conflict-Free Pin Assignments & Calibration Constants
 */

#ifndef SAFESCOUT_CONFIG_H
#define SAFESCOUT_CONFIG_H

#include <Arduino.h>

// ==========================================
// 1. I2C Bus Pins & Device Addresses
// ==========================================
#define I2C_SDA_PIN                 21
#define I2C_SCL_PIN                 22
#define I2C_FREQUENCY_HZ            400000 // 400 kHz Fast-Mode

#define SDP31_I2C_ADDR              0x21   // Sensirion SDP31 Diff Pressure
#define INA226_I2C_ADDR             0x40   // TI INA226 Voltage/Current
#define ADS1115_I2C_ADDR            0x48   // TI ADS1115 16-bit 4-Ch ADC

// ==========================================
// 2. Direct Digital & Interrupt Pins
// ==========================================
#define ESTOP_INTERRUPT_PIN         34     // Input-only, NC to GND, pull-up to 3.3V
#define ALARM_RELAY_PIN             23     // Output, active HIGH for siren & beacon
#define DHT11_DATA_PIN              15     // Ambient temperature & humidity
#define DS18B20_ONEWIRE_PIN         4      // Pipeline waterproof temperature
#define HC_SR04_TRIG_PIN            5      // Ultrasonic trigger output
#define HC_SR04_ECHO_PIN            18     // Ultrasonic echo input (via 1k/2k divider)
#define YF_S201_FLOW_PULSE_PIN      19     // Flow meter pulse interrupt (via 1k/2k divider)

// ==========================================
// 3. Analog Input (ESP32 ADC1 Only)
// ==========================================
#define ACOUSTIC_40KHZ_ADC_PIN      36     // VP (ADC1_CH0) for 40 kHz acoustic envelope

// ==========================================
// 4. L298N Motor Driver Pins & PWM Channels
// ==========================================
#define MOTOR_LEFT_IN1              13
#define MOTOR_LEFT_IN2              12
#define MOTOR_RIGHT_IN3             14
#define MOTOR_RIGHT_IN4             27
#define MOTOR_LEFT_ENA_PWM          25
#define MOTOR_RIGHT_ENB_PWM         26

#define PWM_LEDC_CHANNEL_LEFT       0
#define PWM_LEDC_CHANNEL_RIGHT      1
#define PWM_FREQUENCY_HZ            5000
#define PWM_RESOLUTION_BITS         8      // 0 - 255 duty cycle

// ==========================================
// 5. Safety & Dead-Man Watchdog Constants
// ==========================================
#define DEADMAN_WATCHDOG_TIMEOUT_MS 500    // Motors stop if no command within 500ms
#define TELEMETRY_INTERVAL_MS       100    // 10 Hz telemetry publish rate
#define SERIAL_BAUD_RATE            115200

// ==========================================
// 6. Calibration & Physical Constants
// ==========================================
// YF-S201: Approx 450 pulses per liter (7.5 * Q L/min)
#define FLOW_SENSOR_CALIBRATION_FACTOR 7.5f

// INA226 Current Shunt Resistor (0.002 Ohm for 10A peak)
#define INA226_SHUNT_RESISTANCE_OHM 0.002f

// Standard air density at 20 deg C, 101.325 kPa (kg/m3)
#define STANDARD_AIR_DENSITY_KG_M3  1.204f

// Pitot tube calibration factor (flow coefficient)
#define PITOT_CALIBRATION_FACTOR    1.00f

// DFRobot SEN0257 Pressure Transmitters (0.5V to 4.5V output)
// Range: Air = 0-1.0 MPa (0-10 bar); Water = 0-1.6 MPa (0-16 bar)
#define AIR_PRESSURE_MIN_V          0.50f
#define AIR_PRESSURE_MAX_V          4.50f
#define AIR_PRESSURE_MAX_BAR        10.0f

#define WATER_PRESSURE_MIN_V        0.50f
#define WATER_PRESSURE_MAX_V        4.50f
#define WATER_PRESSURE_MAX_BAR      16.0f

// Gas Sensor Alarm Thresholds (PPM)
#define MQ2_METHANE_WARNING_PPM     1000.0f
#define MQ2_METHANE_CRITICAL_PPM    2500.0f
#define MQ8_HYDROGEN_WARNING_PPM    400.0f
#define MQ8_HYDROGEN_CRITICAL_PPM   1000.0f

#endif // SAFESCOUT_CONFIG_H

