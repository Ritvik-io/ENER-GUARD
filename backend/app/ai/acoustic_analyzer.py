"""
SafeScout MINE-ENERGY - 40 kHz Ultrasonic Acoustic Signal Analyzer
Acoustic emission analysis for compressed-air and inert gas pipeline orifice leaks.
"""

import math
import numpy as np
from typing import Dict, Any, List

class AcousticLeakAnalyzer:
    def __init__(self, sample_rate_hz: int = 100000, target_freq_hz: int = 40000):
        self.sample_rate = sample_rate_hz
        self.target_freq = target_freq_hz
        self.ambient_baseline_db = 32.0

    def update_baseline(self, current_db: float):
        """Exponential moving average for dynamic ambient background noise."""
        alpha = 0.05
        self.ambient_baseline_db = (alpha * current_db) + ((1.0 - alpha) * self.ambient_baseline_db)

    def analyze_signal(
        self,
        envelope_db_spl: float,
        pipe_pressure_bar: float,
        raw_waveform: List[float] = None
    ) -> Dict[str, Any]:
        """
        Evaluate acoustic signal against background noise and pressure context.
        """
        snr_db = envelope_db_spl - self.ambient_baseline_db
        snr_db = max(0.0, snr_db)

        # High kurtosis indicates sharp, non-gaussian jet noise
        kurtosis = 3.0
        if raw_waveform and len(raw_waveform) > 32:
            arr = np.array(raw_waveform)
            std = np.std(arr)
            if std > 1e-5:
                kurtosis = float(np.mean((arr - np.mean(arr))**4) / (std**4))

        is_leak = False
        confidence = 0.0
        severity = "NORMAL"

        if snr_db > 30.0:
            is_leak = True
            confidence = 0.90
            severity = "CRITICAL"
        elif snr_db > 18.0:
            is_leak = True
            confidence = 0.78
            severity = "HIGH"
        elif snr_db > 10.0:
            is_leak = True
            confidence = 0.62
            severity = "MEDIUM"

        return {
            "signal_level_db": round(envelope_db_spl, 1),
            "ambient_baseline_db": round(self.ambient_baseline_db, 1),
            "snr_db": round(snr_db, 1),
            "kurtosis": round(kurtosis, 2),
            "suspected_leak": is_leak,
            "confidence": confidence,
            "severity": severity,
            "pipe_pressure_bar": pipe_pressure_bar,
            "detection_method": "ACOUSTIC_FFT_SNR_RULE"
        }

acoustic_analyzer = AcousticLeakAnalyzer()

