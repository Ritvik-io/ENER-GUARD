"""
Unit Tests for LDROBOT LD19 Binary Serial Parser
"""

import struct
from backend.app.hardware.ld19_lidar import LD19PacketParser, compute_crc8

def test_crc8_computation():
    # Test vector for CRC8
    test_bytes = bytes([0x54, 0x2C, 0x00, 0x00])
    crc = compute_crc8(test_bytes)
    assert isinstance(crc, int)
    assert 0 <= crc <= 255

def test_valid_ld19_packet_parsing():
    parser = LD19PacketParser()
    
    # Construct a synthetic valid 47-byte packet
    # Header: 0x54, VerLen: 0x2C
    # Speed: 3600 (600 RPM -> 3600 deg/s)
    # Start angle: 1000 (10.00 deg)
    # 12 points: distance 1500 mm (1.5m), intensity 200
    # End angle: 1800 (18.00 deg)
    # Timestamp: 1234
    packet_body = bytearray([0x54, 0x2C])
    packet_body.extend(struct.pack('<HH', 3600, 1000))
    for _ in range(12):
        packet_body.extend(struct.pack('<HB', 1500, 200))
    packet_body.extend(struct.pack('<HH', 1800, 1234))
    
    # Compute CRC8 over first 46 bytes and append
    crc = compute_crc8(packet_body)
    packet_body.append(crc)
    
    assert len(packet_body) == 47
    
    # Feed to parser
    scans = parser.feed_bytes(bytes(packet_body))
    # Should have accumulated 12 points
    assert len(parser.current_scan_points) == 12
    pt0 = parser.current_scan_points[0]
    assert pt0["distance_m"] == 1.5
    assert pt0["angle_deg"] == 10.0

