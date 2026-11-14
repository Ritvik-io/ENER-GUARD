/**
 * SafeScout MINE-ENERGY - Motor Controller with Dead-Man Watchdog
 * Hardware: HW-095 (L298N) Driver with 4 DC Geared Motors
 * Priority 0 Safety: Hardware E-Stop and Communication Timeout Automatic Shutdown
 */

#ifndef SAFESCOUT_MOTOR_CONTROLLER_H
#define SAFESCOUT_MOTOR_CONTROLLER_H

#include "config.h"

class MotorController {
private:
    volatile bool _estop_triggered;
    volatile unsigned long _last_command_time;
    int _current_left_pwm;
    int _current_right_pwm;
    bool _is_moving;

public:
    MotorController() : 
        _estop_triggered(false), 
        _last_command_time(0),
        _current_left_pwm(0),
        _current_right_pwm(0),
        _is_moving(false) {}

    void init() {
        // Configure GPIO direction pins
        pinMode(MOTOR_LEFT_IN1, OUTPUT);
        pinMode(MOTOR_LEFT_IN2, OUTPUT);
        pinMode(MOTOR_RIGHT_IN3, OUTPUT);
        pinMode(MOTOR_RIGHT_IN4, OUTPUT);
        pinMode(ALARM_RELAY_PIN, OUTPUT);
        digitalWrite(ALARM_RELAY_PIN, LOW);

        // Configure LEDC PWM Channels on ESP32
        ledcAttachPin(MOTOR_LEFT_ENA_PWM, PWM_LEDC_CHANNEL_LEFT);
        ledcAttachPin(MOTOR_RIGHT_ENB_PWM, PWM_LEDC_CHANNEL_RIGHT);
        ledcSetup(PWM_LEDC_CHANNEL_LEFT, PWM_FREQUENCY_HZ, PWM_RESOLUTION_BITS);
        ledcSetup(PWM_LEDC_CHANNEL_RIGHT, PWM_FREQUENCY_HZ, PWM_RESOLUTION_BITS);

        // Configure Hardware E-Stop pin with interrupt
        pinMode(ESTOP_INTERRUPT_PIN, INPUT);

        // Immediate stop at boot
        hardStop();
    }

    void handleEStopInterrupt() {
        // Called from ISR
        _estop_triggered = true;
        // Direct register / fast pin write for sub-millisecond motor cutoff
        digitalWrite(MOTOR_LEFT_IN1, LOW);
        digitalWrite(MOTOR_LEFT_IN2, LOW);
        digitalWrite(MOTOR_RIGHT_IN3, LOW);
        digitalWrite(MOTOR_RIGHT_IN4, LOW);
        ledcWrite(PWM_LEDC_CHANNEL_LEFT, 0);
        ledcWrite(PWM_LEDC_CHANNEL_RIGHT, 0);
        digitalWrite(ALARM_RELAY_PIN, HIGH); // Sound alarm beacon
    }

    bool isEStopActive() const {
        return _estop_triggered || (digitalRead(ESTOP_INTERRUPT_PIN) == HIGH);
    }

    void triggerSoftwareEStop() {
        _estop_triggered = true;
        hardStop();
        digitalWrite(ALARM_RELAY_PIN, HIGH);
    }

    bool resetEStop() {
        // Can only reset if physical switch is closed (LOW state)
        if (digitalRead(ESTOP_INTERRUPT_PIN) == LOW) {
            _estop_triggered = false;
            digitalWrite(ALARM_RELAY_PIN, LOW);
            hardStop();
            return true;
        }
        return false;
    }

    void setSpeed(int left_pwm, int right_pwm) {
        // Safety checks: E-Stop takes absolute precedence
        if (isEStopActive()) {
            hardStop();
            return;
        }

        // Clamp inputs to [-255, 255]
        left_pwm = constrain(left_pwm, -255, 255);
        right_pwm = constrain(right_pwm, -255, 255);

        // Left motor direction
        if (left_pwm > 0) {
            digitalWrite(MOTOR_LEFT_IN1, HIGH);
            digitalWrite(MOTOR_LEFT_IN2, LOW);
            ledcWrite(PWM_LEDC_CHANNEL_LEFT, left_pwm);
        } else if (left_pwm < 0) {
            digitalWrite(MOTOR_LEFT_IN1, LOW);
            digitalWrite(MOTOR_LEFT_IN2, HIGH);
            ledcWrite(PWM_LEDC_CHANNEL_LEFT, -left_pwm);
        } else {
            digitalWrite(MOTOR_LEFT_IN1, LOW);
            digitalWrite(MOTOR_LEFT_IN2, LOW);
            ledcWrite(PWM_LEDC_CHANNEL_LEFT, 0);
        }

        // Right motor direction
        if (right_pwm > 0) {
            digitalWrite(MOTOR_RIGHT_IN3, HIGH);
            digitalWrite(MOTOR_RIGHT_IN4, LOW);
            ledcWrite(PWM_LEDC_CHANNEL_RIGHT, right_pwm);
        } else if (right_pwm < 0) {
            digitalWrite(MOTOR_RIGHT_IN3, LOW);
            digitalWrite(MOTOR_RIGHT_IN4, HIGH);
            ledcWrite(PWM_LEDC_CHANNEL_RIGHT, -right_pwm);
        } else {
            digitalWrite(MOTOR_RIGHT_IN3, LOW);
            digitalWrite(MOTOR_RIGHT_IN4, LOW);
            ledcWrite(PWM_LEDC_CHANNEL_RIGHT, 0);
        }

        _current_left_pwm = left_pwm;
        _current_right_pwm = right_pwm;
        _is_moving = (left_pwm != 0 || right_pwm != 0);
        _last_command_time = millis(); // Reset dead-man watchdog timer
    }

    void updateWatchdog() {
        // Enforce dead-man control: automatically stop if command expired
        if (_is_moving && (millis() - _last_command_time > DEADMAN_WATCHDOG_TIMEOUT_MS)) {
            hardStop();
        }

        // Continually check physical E-Stop pin
        if (digitalRead(ESTOP_INTERRUPT_PIN) == HIGH && !_estop_triggered) {
            triggerSoftwareEStop();
        }
    }

    void hardStop() {
        digitalWrite(MOTOR_LEFT_IN1, LOW);
        digitalWrite(MOTOR_LEFT_IN2, LOW);
        digitalWrite(MOTOR_RIGHT_IN3, LOW);
        digitalWrite(MOTOR_RIGHT_IN4, LOW);
        ledcWrite(PWM_LEDC_CHANNEL_LEFT, 0);
        ledcWrite(PWM_LEDC_CHANNEL_RIGHT, 0);
        _current_left_pwm = 0;
        _current_right_pwm = 0;
        _is_moving = false;
    }

    int getLeftPwm() const { return _current_left_pwm; }
    int getRightPwm() const { return _current_right_pwm; }
    bool isMoving() const { return _is_moving; }
};

#endif // SAFESCOUT_MOTOR_CONTROLLER_H

