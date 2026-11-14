"""
SafeScout MINE-ENERGY - LDROBOT LD19 360° LiDAR Driver
Hardware: LDROBOT LD19 TOF LiDAR (UART 230400 Baud)
Packet: 47 bytes per packet, 12 distance/intensity points, CRC8 validation
"""

import math
import struct
import time
from typing import List, Dict, Optional, Tuple

# Precomputed CRC8 table for polynomial 0x4D (used by LDROBOT LD19/LD06)
CRC8_TABLE = [
    0x00, 0x4d, 0x9a, 0xd7, 0x79, 0x34, 0xe3, 0xae, 0xf2, 0xbf, 0x68, 0x25, 0x8b, 0xc6, 0x11, 0x5c,
    0xa9, 0xe4, 0x33, 0x7e, 0xd0, 0x9d, 0x4a, 0x07, 0x5b, 0x16, 0xc1, 0x8c, 0x22, 0x6f, 0xb8, 0xf5,
    0x1f, 0x52, 0x85, 0xc8, 0x66, 0x2b, 0xfc, 0xb1, 0xed, 0xa0, 0x77, 0x3a, 0x94, 0xd9, 0x0e, 0x43,
    0xb6, 0xfb, 0x2c, 0x61, 0xcf, 0x82, 0x55, 0x18, 0x44, 0x09, 0xde, 0x93, 0x3d, 0x70, 0xa7, 0xea,
    0x3e, 0x73, 0xa4, 0xe9, 0x47, 0x0a, 0xdd, 0x90, 0xcc, 0x81, 0x56, 0x1b, 0xb5, 0xf8, 0x2f, 0x62,
    0x97, 0xda, 0x0d, 0x40, 0xee, 0xa3, 0x74, 0x39, 0x65, 0x28, 0xff, 0xb2, 0x1c, 0x51, 0x86, 0xcb,
    0x21, 0x6c, 0xbb, 0xf6, 0x58, 0x15, 0xc2, 0x8f, 0xd3, 0x9e, 0x49, 0x04, 0xaa, 0xe7, 0x30, 0x7d,
    0x88, 0xc5, 0x12, 0x5f, 0xf1, 0xbc, 0x6b, 0x26, 0x7a, 0x37, 0xe0, 0xad, 0x03, 0x4e, 0x99, 0xd4,
    0x7c, 0x31, 0xe6, 0xab, 0x05, 0x48, 0x9f, 0xd2, 0x8e, 0xc3, 0x14, 0x59, 0xf7, 0xba, 0x6d, 0x20,
    0xd5, 0x98, 0x4f, 0x02, 0xac, 0xe1, 0x36, 0x7b, 0x27, 0x6a, 0xbd, 0xf0, 0x5e, 0x13, 0xc4, 0x89,
    0x63, 0x2e, 0xf9, 0xb4, 0x1a, 0x57, 0x80, 0xcd, 0x91, 0xdc, 0x0b, 0x46, 0xe8, 0xa5, 0x72, 0x3f,
    0xca, 0x87, 0x50, 0x1d, 0xb3, 0xfe, 0x29, 0x64, 0x38, 0x75, 0xa2, 0xef, 0x41, 0x0c, 0xdb, 0x96,
    0x42, 0x0f, 0xd8, 0x95, 0x3b, 0x76, 0xa1, 0xec, 0xb0, 0xfd, 0x2a, 0x67, 0xc9, 0x84, 0x53, 0x1e,
    0xeb, 0xa6, 0x71, 0x3c, 0x92, 0xdf, 0x08, 0x45, 0x19, 0x54, 0x83, 0xce, 0x60, 0x2d, 0xfa, 0xb7,
    0x5d, 0x10, 0xc7, 0x8a, 0x24, 0x69, 0xbe, 0xf3, 0xaf, 0xe2, 0x35, 0x78, 0xd6, 0x9b, 0x4c, 0x01,
    0xf4, 0xb9, 0x6e, 0x23, 0x8d, 0xc0, 0x17, 0x5a, 0x06, 0x4b, 0x9c, 0xd1, 0x7f, 0x32, 0xe5, 0xa8
]

def compute_crc8(data: bytes) -> int:
    crc = 0
    for byte in data:
        crc = CRC8_TABLE[(crc ^ byte) & 0xFF]
    return crc

class LD19PacketParser:
    """Parses raw binary byte streams from LDROBOT LD19 into structured scans."""
    
    HEADER = 0x54
    VER_LEN = 0x2C
    PACKET_SIZE = 47

    def __init__(self):
        self.buffer = bytearray()
        self.current_scan_points: List[Dict[str, float]] = []
        self.last_angle_deg = 0.0
        self.last_scan: Optional[Dict] = None

    def feed_bytes(self, chunk: bytes) -> List[Dict]:
        """Feed incoming serial bytes; returns completed 360-degree scans."""
        self.buffer.extend(chunk)
        completed_scans = []

        while len(self.buffer) >= self.PACKET_SIZE:
            # Find packet start
            if self.buffer[0] != self.HEADER or self.buffer[1] != self.VER_LEN:
                # Discard 1 byte and realign
                self.buffer.pop(0)
                continue

            packet_data = self.buffer[:self.PACKET_SIZE]
            expected_crc = packet_data[46]
            calc_crc = compute_crc8(packet_data[:46])

            if calc_crc != expected_crc:
                # CRC mismatch, drop header and hunt next
                self.buffer.pop(0)
                continue

            # Valid packet parsed: consume from buffer
            del self.buffer[:self.PACKET_SIZE]
            
            # Parse packet fields
            speed_dps, start_angle_raw = struct.unpack_from('<HH', packet_data, 2)
            end_angle_raw = struct.unpack_from('<H', packet_data, 42)[0]
            timestamp_ms = struct.unpack_from('<H', packet_data, 44)[0]

            start_angle_deg = start_angle_raw / 100.0
            end_angle_deg = end_angle_raw / 100.0

            # Compute angular step across 12 points
            diff_angle = end_angle_deg - start_angle_deg
            if diff_angle < 0:
                diff_angle += 360.0
            angle_step = diff_angle / 11.0 if diff_angle > 0 else 0.0

            # Parse 12 points
            for i in range(12):
                offset = 6 + (i * 3)
                dist_mm, intensity = struct.unpack_from('<HB', packet_data, offset)
                
                # Interpolate angle for point
                pt_angle = (start_angle_deg + (i * angle_step)) % 360.0
                dist_m = dist_mm / 1000.0

                # Valid detection filter (0.05m to 12.0m for LD19)
                if 0.05 <= dist_m <= 12.0:
                    rad = math.radians(pt_angle)
                    x = dist_m * math.cos(rad)
                    y = dist_m * math.sin(rad)
                    self.current_scan_points.append({
                        "angle_deg": round(pt_angle, 2),
                        "distance_m": round(dist_m, 3),
                        "intensity": intensity,
                        "x": round(x, 3),
                        "y": round(y, 3)
                    })

            # Check for 360° scan completion (wrap-around from ~350° to ~10°)
            if start_angle_deg < self.last_angle_deg and (self.last_angle_deg - start_angle_deg) > 200.0:
                if len(self.current_scan_points) >= 100:
                    scan_summary = {
                        "timestamp": time.time(),
                        "sensor": "LDROBOT_LD19",
                        "speed_rpm": round(speed_dps / 6.0, 1),
                        "point_count": len(self.current_scan_points),
                        "points": self.current_scan_points
                    }
                    completed_scans.append(scan_summary)
                    self.last_scan = scan_summary
                self.current_scan_points = []

            self.last_angle_deg = start_angle_deg

        return completed_scans
