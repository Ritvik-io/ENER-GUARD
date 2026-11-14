"""
SafeScout MINE-ENERGY - 2D Probabilistic Occupancy Grid SLAM Engine
Implements real 2D log-odds mapping with Bresenham ray-casting, scan integration, and robot pose tracking.
"""

import math
import numpy as np
import time
from typing import Dict, List, Tuple, Optional

class OccupancyGridSLAM:
    """
    Real 2D Occupancy Grid Mapping.
    Grid cells store log-odds values:
      L_t = L_{t-1} + log_odds_inverse_sensor_model - L_0
    """
    def __init__(
        self,
        grid_width_m: float = 20.0,
        grid_height_m: float = 20.0,
        resolution_m: float = 0.05, # 5 cm per cell
        l_occ: float = 0.85,
        l_free: float = -0.40,
        l_max: float = 5.0,
        l_min: float = -5.0
    ):
        self.resolution = resolution_m
        self.width_cells = int(grid_width_m / resolution_m)
        self.height_cells = int(grid_height_m / resolution_m)
        
        # Center origin
        self.origin_x_cells = self.width_cells // 2
        self.origin_y_cells = self.height_cells // 2

        # Log-odds grid (0 = 50% unknown probability)
        self.grid = np.zeros((self.height_cells, self.width_cells), dtype=np.float32)
        
        self.l_occ = l_occ
        self.l_free = l_free
        self.l_max = l_max
        self.l_min = l_min

        # Robot Pose: x (m), y (m), theta (radians)
        self.pose_x = 0.0
        self.pose_y = 0.0
        self.pose_theta = 0.0
        self.trajectory: List[Tuple[float, float]] = [(0.0, 0.0)]
        self.inspection_markers: List[Dict] = []
        self.last_update_time = time.time()

    def update_pose(self, x: float, y: float, theta_rad: float):
        """Update robot pose and append to path trajectory."""
        self.pose_x = x
        self.pose_y = y
        self.pose_theta = theta_rad
        
        # Only add to trajectory if moved > 5cm
        if not self.trajectory or math.hypot(x - self.trajectory[-1][0], y - self.trajectory[-1][1]) > 0.05:
            self.trajectory.append((round(x, 3), round(y, 3)))
            if len(self.trajectory) > 2000:
                self.trajectory.pop(0)

    def world_to_grid(self, wx: float, wy: float) -> Tuple[int, int]:
        gx = int(wx / self.resolution) + self.origin_x_cells
        gy = int(wy / self.resolution) + self.origin_y_cells
        return gx, gy

    def grid_to_world(self, gx: int, gy: int) -> Tuple[float, float]:
        wx = (gx - self.origin_x_cells) * self.resolution
        wy = (gy - self.origin_y_cells) * self.resolution
        return wx, wy

    def _bresenham(self, x0: int, y0: int, x1: int, y1: int) -> List[Tuple[int, int]]:
        """Bresenham line algorithm for ray-casting free space."""
        points = []
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        x, y = x0, y0
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1

        if dx > dy:
            err = dx / 2.0
            while x != x1:
                points.append((x, y))
                err -= dy
                if err < 0:
                    y += sy
                    err += dx
                x += sx
        else:
            err = dy / 2.0
            while y != y1:
                points.append((x, y))
                err -= dx
                if err < 0:
                    x += sx
                    err += dy
                y += sy

        return points

    def process_scan(self, point_cloud: List[Dict[str, float]], robot_x: float, robot_y: float, heading_deg: float):
        """
        Integrate 360-degree LiDAR scan into 2D occupancy grid.
        Ray casts free space and marks endpoint as occupied.
        """
        theta_rad = math.radians(heading_deg)
        self.update_pose(robot_x, robot_y, theta_rad)

        start_gx, start_gy = self.world_to_grid(robot_x, robot_y)
        if not (0 <= start_gx < self.width_cells and 0 <= start_gy < self.height_cells):
            return

        cos_t = math.cos(theta_rad)
        sin_t = math.sin(theta_rad)

        for pt in point_cloud:
            d = pt.get("distance_m", 0.0)
            if d < 0.1 or d > 10.0:
                continue

            # Local point in robot frame
            lx = pt.get("x", 0.0)
            ly = pt.get("y", 0.0)

            # Transform into world coordinate frame
            wx = robot_x + (lx * cos_t - ly * sin_t)
            wy = robot_y + (lx * sin_t + ly * cos_t)

            end_gx, end_gy = self.world_to_grid(wx, wy)

            if 0 <= end_gx < self.width_cells and 0 <= end_gy < self.height_cells:
                # 1. Raycast free cells along line of sight
                ray_cells = self._bresenham(start_gx, start_gy, end_gx, end_gy)
                for rx, ry in ray_cells:
                    if 0 <= rx < self.width_cells and 0 <= ry < self.height_cells:
                        self.grid[ry, rx] = max(self.l_min, self.grid[ry, rx] + self.l_free)

                # 2. Update endpoint as occupied
                self.grid[end_gy, end_gx] = min(self.l_max, self.grid[end_gy, end_gx] + self.l_occ)

        self.last_update_time = time.time()

    def add_inspection_marker(self, marker_dict: Dict):
        """Tag an inspection defect location on the map."""
        self.inspection_markers.append(marker_dict)

    def get_map_state(self) -> Dict:
        """
        Produce a compact map state representation for WebSocket transmission.
        Subsamples grid to 100x100 for lightweight web streaming.
        0 = Unknown (gray), 100 = Free (white), 255 = Occupied (dark obstacle).
        """
        # Convert log-odds to probability: P = 1 - 1 / (1 + exp(L))
        prob = 1.0 - (1.0 / (1.0 + np.exp(self.grid)))
        
        # Subsample grid for UI display: 400x400 downsampled by factor of 4 -> 100x100
        subsampled = prob[::4, ::4]
        
        # Quantize to 8-bit image: 128 = unknown, 255 = free, 0 = occupied obstacle
        uint8_map = np.full(subsampled.shape, 128, dtype=np.uint8)
        uint8_map[subsampled > 0.65] = 0    # Obstacle (Black)
        uint8_map[subsampled < 0.35] = 255  # Free space (White)

        return {
            "resolution_m": self.resolution * 4.0,
            "width": int(subsampled.shape[1]),
            "height": int(subsampled.shape[0]),
            "robot_pose": {
                "x": round(self.pose_x, 3),
                "y": round(self.pose_y, 3),
                "heading_deg": round(math.degrees(self.pose_theta), 1)
            },
            "trajectory": self.trajectory[-200:], # Last 200 points
            "inspection_markers": self.inspection_markers,
            "timestamp": self.last_update_time
        }

    def clear_map(self):
        """Reset SLAM map and trajectory."""
        self.grid.fill(0.0)
        self.trajectory = [(self.pose_x, self.pose_y)]
        self.inspection_markers.clear()

slam_engine = OccupancyGridSLAM()

