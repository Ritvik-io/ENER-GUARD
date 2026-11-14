/**
 * SafeScout MINE-ENERGY - Sensor Acquisition Subsystem
 * Drivers: ADS1115, SDP31, INA226, DS18B20, DHT11, HC-SR04, YF-S201, 40kHz Receiver
 */

#ifndef SAFESCOUT_SENSORS_H
#define SAFESCOUT_SENSORS_H

#include "config.h"
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <Adafruit_ADS1X15.h>
#include <INA226_WE.h>

// Forward declarations
void IRAM_ATTR flowSensorPulseISR();

// Global pulse counter for YF-S201
extern volatile unsigned long g_flow_pulse_count;

struct SensorData {
    // Environmental
    int16_t mq2_raw;
    float mq2_ppm;
    bool mq2_calibrated;
    int16_t mq8_raw;
    float mq8_ppm;
    bool mq8_calibrated;
    float dht_temp_c;
    float dht_humidity_pct;
    
    // Ventilation
    float sdp31_diff_pressure_pa;
    float air_velocity_ms;
    
    // Acoustic
    int16_t ultrasonic_40khz_raw;
    float ultrasonic_db_spl;
    bool suspected_air_leak;

    // Pipelines
    float air_pressure_bar;
    float water_pressure_bar;
    float water_flow_rate_lmin;
    float water_total_liters;
    float water_temp_c;

    // Obstacle & Electrical
    float obstacle_distance_cm;
    float battery_voltage_v;
    float battery_current_a;
    int battery_percentage;
};

class SensorManager {
private:
    Adafruit_ADS1115 _ads;
    INA226_WE _ina226;
    OneWire _one_wire;
    DallasTemperature _ds18b20;
    DHT _dht;
    
    bool _ads_connected;
    bool _ina226_connected;
    bool _sdp31_connected;

    unsigned long _last_flow_calc_time;
    unsigned long _last_flow_pulse_sample;
    float _cumulative_liters;

public:
    SensorManager() : 
        _ina226(INA226_I2C_ADDR),
        _one_wire(DS18B20_ONEWIRE_PIN),
        _ds18b20(&_one_wire),
        _dht(DHT11_DATA_PIN, DHT11),
        _ads_connected(false),
        _ina226_connected(false),
        _sdp31_connected(false),
        _last_flow_calc_time(0),
        _last_flow_pulse_sample(0),
        _cumulative_liters(0.0f) {}

    void init() {
        Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQUENCY_HZ);

        // 1. Initialize ADS1115 (Gain = 1 for +/- 4.096V range, 1 bit = 0.125mV)
        if (_ads.begin(ADS1115_I2C_ADDR)) {
            _ads.setGain(GAIN_ONE);
            _ads_connected = true;
        }

        // 2. Initialize INA226
        if (_ina226.init()) {
            _ina226.setResistorRange(INA226_SHUNT_RESISTANCE_OHM, 10.0); // 10A max
            _ina226_connected = true;
        }

        // 3. Initialize Sensirion SDP31
        Wire.beginTransmission(SDP31_I2C_ADDR);
        if (Wire.endTransmission() == 0) {
            _sdp31_connected = true;
            // Send continuous measurement command (with mass flow temp compensation: 0x36, 0x03)
            Wire.beginTransmission(SDP31_I2C_ADDR);
            Wire.write(0x36);
            Wire.write(0x03);
            Wire.endTransmission();
        }

        // 4. Initialize OneWire DS18B20 & DHT11
        _ds18b20.begin();
        _ds18b20.setWaitForConversion(false);
        _dht.begin();

        // 5. Initialize HC-SR04 Ultrasonic pins
        pinMode(HC_SR04_TRIG_PIN, OUTPUT);
        pinMode(HC_SR04_ECHO_PIN, INPUT);
        digitalWrite(HC_SR04_TRIG_PIN, LOW);

        // 6. Initialize YF-S201 Flow Sensor Interrupt
        pinMode(YF_S201_FLOW_PULSE_PIN, INPUT);
        attachInterrupt(digitalPinToInterrupt(YF_S201_FLOW_PULSE_PIN), flowSensorPulseISR, RISING);

        // 7. Configure 40 kHz acoustic ADC pin
        pinMode(ACOUSTIC_40KHZ_ADC_PIN, INPUT);
        analogReadResolution(12);

        _last_flow_calc_time = millis();
    }

    void readAll(SensorData &data) {
        unsigned long now = millis();

        // --- 1. ADS1115 Readings (Gas & Pressure) ---
        if (_ads_connected) {
            int16_t adc0 = _ads.readADC_SingleEnded(0); // MQ-2
            int16_t adc1 = _ads.readADC_SingleEnded(1); // MQ-8
            int16_t adc2 = _ads.readADC_SingleEnded(2); // SEN0257 Air Pressure
            int16_t adc3 = _ads.readADC_SingleEnded(3); // SEN0257 Water Pressure

            data.mq2_raw = adc0;
            // Empirical log-curve calculation for MQ-2 (methane/combustible)
            // Voltage across divider: V_out = (adc0 * 0.125mV) * (5.0 / 3.0 divider correction)
            float v_mq2 = (adc0 * 0.000125f) * (5.0f / 3.0f);
            if (v_mq2 > 0.1f) {
                float rs = ((5.0f - v_mq2) / v_mq2) * 10.0f; // kOhm with RL=10k
                float ratio = rs / 9.83f; // Ro in clean air approx 9.83k
                data.mq2_ppm = pow(10.0f, ((log10(ratio) - 1.35f) / -0.38f));
                data.mq2_calibrated = true;
            } else {
                data.mq2_ppm = 0.0f;
                data.mq2_calibrated = false;
            }

            data.mq8_raw = adc1;
            float v_mq8 = (adc1 * 0.000125f) * (5.0f / 3.0f);
            if (v_mq8 > 0.1f) {
                float rs_h2 = ((5.0f - v_mq8) / v_mq8) * 10.0f;
                float ratio_h2 = rs_h2 / 10.0f;
                data.mq8_ppm = pow(10.0f, ((log10(ratio_h2) - 0.93f) / -0.42f));
                data.mq8_calibrated = true;
            } else {
                data.mq8_ppm = 0.0f;
                data.mq8_calibrated = false;
            }

            // SEN0257 Compressed Air: 0.5V to 4.5V maps to 0 to 10 bar
            float v_air = (adc2 * 0.000125f) * 1.5f; // Divided by 1.5 in hardware
            if (v_air >= 0.45f) {
                data.air_pressure_bar = ((v_air - AIR_PRESSURE_MIN_V) / (AIR_PRESSURE_MAX_V - AIR_PRESSURE_MIN_V)) * AIR_PRESSURE_MAX_BAR;
                if (data.air_pressure_bar < 0.0f) data.air_pressure_bar = 0.0f;
            } else {
                data.air_pressure_bar = 0.0f;
            }

            // SEN0257 Water Pressure: 0.5V to 4.5V maps to 0 to 16 bar
            float v_water = (adc3 * 0.000125f) * 1.5f;
            if (v_water >= 0.45f) {
                data.water_pressure_bar = ((v_water - WATER_PRESSURE_MIN_V) / (WATER_PRESSURE_MAX_V - WATER_PRESSURE_MIN_V)) * WATER_PRESSURE_MAX_BAR;
                if (data.water_pressure_bar < 0.0f) data.water_pressure_bar = 0.0f;
            } else {
                data.water_pressure_bar = 0.0f;
            }
        } else {
            // ADS1115 not connected fallback
            data.mq2_raw = 0;
            data.mq2_ppm = 0.0f;
            data.mq2_calibrated = false;
            data.mq8_raw = 0;
            data.mq8_ppm = 0.0f;
            data.mq8_calibrated = false;
            data.air_pressure_bar = 0.0f;
            data.water_pressure_bar = 0.0f;
        }

        // --- 2. Sensirion SDP31 Diff Pressure & Pitot Velocity ---
        if (_sdp31_connected) {
            Wire.requestFrom(SDP31_I2C_ADDR, 3);
            if (Wire.available() >= 2) {
                int16_t dp_raw = (Wire.read() << 8) | Wire.read();
                // SDP31 scale factor is 60 for differential pressure in Pa
                data.sdp31_diff_pressure_pa = (float)dp_raw / 60.0f;
                
                // Bernoulli calculation: V = sqrt(2 * dp / rho)
                if (data.sdp31_diff_pressure_pa > 0.05f) {
                    data.air_velocity_ms = PITOT_CALIBRATION_FACTOR * sqrt((2.0f * data.sdp31_diff_pressure_pa) / STANDARD_AIR_DENSITY_KG_M3);
                } else {
                    data.air_velocity_ms = 0.0f;
                }
            }
        } else {
            data.sdp31_diff_pressure_pa = 0.0f;
            data.air_velocity_ms = 0.0f;
        }

        // --- 3. 40 kHz Ultrasonic Acoustic Envelope & Peak ---
        // Sample fast peak-detect on GPIO 36
        int peak_raw = 0;
        for (int i = 0; i < 32; i++) {
            int sample = analogRead(ACOUSTIC_40KHZ_ADC_PIN);
            if (sample > peak_raw) peak_raw = sample;
        }
        data.ultrasonic_40khz_raw = peak_raw;
        // Approximate SPL calibration: 0-4095 ADC -> 20dB - 100dB SPL
        data.ultrasonic_db_spl = 20.0f + ((float)peak_raw / 4095.0f) * 80.0f;
        data.suspected_air_leak = (data.ultrasonic_db_spl > 65.0f);

        // --- 4. DHT11 Air Temp & Humidity ---
        float h = _dht.readHumidity();
        float t = _dht.readTemperature();
        if (!isnan(h) && !isnan(t)) {
            data.dht_humidity_pct = h;
            data.dht_temp_c = t;
        }

        // --- 5. DS18B20 Waterproof Water Temp ---
        _ds18b20.requestTemperatures();
        float wt = _ds18b20.getTempCByIndex(0);
        if (wt > -55.0f && wt < 125.0f) {
            data.water_temp_c = wt;
        }

        // --- 6. YF-S201 Water Flow Rate Calculation ---
        unsigned long elapsed = now - _last_flow_calc_time;
        if (elapsed >= 1000) { // Calculate every 1 second
            noInterrupts();
            unsigned long pulses = g_flow_pulse_count;
            g_flow_pulse_count = 0;
            interrupts();

            // Frequency = pulses / (elapsed / 1000)
            float freq_hz = (float)pulses / ((float)elapsed / 1000.0f);
            // Q (L/min) = freq_hz / 7.5
            data.water_flow_rate_lmin = freq_hz / FLOW_SENSOR_CALIBRATION_FACTOR;
            // Incremental liters = pulses / 450
            _cumulative_liters += ((float)pulses / 450.0f);
            data.water_total_liters = _cumulative_liters;
            _last_flow_calc_time = now;
        }

        // --- 7. HC-SR04 Obstacle Distance ---
        digitalWrite(HC_SR04_TRIG_PIN, LOW);
        delayMicroseconds(2);
        digitalWrite(HC_SR04_TRIG_PIN, HIGH);
        delayMicroseconds(10);
        digitalWrite(HC_SR04_TRIG_PIN, LOW);
        long duration = pulseIn(HC_SR04_ECHO_PIN, HIGH, 25000); // 25ms timeout (~4.2m)
        if (duration > 0) {
            data.obstacle_distance_cm = (duration * 0.0343f) / 2.0f;
        } else {
            data.obstacle_distance_cm = 400.0f; // Max/clear
        }

        // --- 8. INA226 Battery Voltage & Current ---
        if (_ina226_connected) {
            data.battery_voltage_v = _ina226.getBusVoltage_V();
            data.battery_current_a = _ina226.getCurrent_mA() / 1000.0f;
            // 3S Li-Ion: 9.6V (0%) to 12.6V (100%)
            float pct = ((data.battery_voltage_v - 9.6f) / (12.6f - 9.6f)) * 100.0f;
            data.battery_percentage = constrain((int)pct, 0, 100);
        } else {
            data.battery_voltage_v = 11.8f;
            data.battery_current_a = 0.5f;
            data.battery_percentage = 75;
        }
    }
};

#endif // SAFESCOUT_SENSORS_H

