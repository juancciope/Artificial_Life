#!/usr/bin/env python3
"""
Kinect WebSocket Server for Artificial Life Shadow Interaction
Supports Xbox 360 Kinect V1 on macOS and Windows
Requires: libfreenect, websockets, numpy
"""

import sys
import asyncio
import json
import numpy as np

try:
    import freenect
except ImportError:
    print("❌ ERROR: freenect module not found!")
    print("Please install libfreenect and Python bindings:")
    print("  macOS: brew install libfreenect")
    print("  Windows: Build libfreenect from source")
    print("  Then: pip3 install freenect")
    sys.exit(1)

try:
    import websockets
except ImportError:
    print("❌ ERROR: websockets module not found!")
    print("Please install: pip3 install websockets")
    sys.exit(1)


class KinectShadowServer:
    """
    WebSocket server that streams Kinect depth data as a shadow mask grid
    matching the artificial life simulation canvas dimensions.
    """

    def __init__(self, grid_width=160, grid_height=120, depth_threshold=1200):
        """
        Initialize the Kinect shadow server.

        Args:
            grid_width: Number of grid cells horizontally (must match canvas)
            grid_height: Number of grid cells vertically (must match canvas)
            depth_threshold: Distance in mm to detect person (closer = shadow)
        """
        self.grid_width = grid_width
        self.grid_height = grid_height
        self.depth_threshold = depth_threshold
        self.clients = set()
        self.is_running = True

        # Test Kinect connection
        print("🎮 Testing Kinect connection...")
        try:
            test_depth, _ = freenect.sync_get_depth()
            print(f"✅ Kinect detected! Depth image: {test_depth.shape}")
        except Exception as e:
            print(f"❌ ERROR: Could not connect to Kinect!")
            print(f"   {str(e)}")
            print("\nMake sure:")
            print("  1. Kinect is plugged into USB")
            print("  2. libfreenect is installed correctly")
            print("  3. You have permissions to access USB devices")
            sys.exit(1)

    def get_shadow_mask(self):
        """
        Get depth data from Kinect and convert to shadow mask grid.

        Returns:
            2D list of booleans representing shadow mask
            True = person detected (create shadow), False = no person
        """
        try:
            # Get depth image from Kinect (640x480, 11-bit depth values)
            depth, _ = freenect.sync_get_depth()

            # Convert 640x480 depth image to grid matching canvas
            mask = []
            depth_height, depth_width = depth.shape

            for gy in range(self.grid_height):
                row = []
                for gx in range(self.grid_width):
                    # Map grid cell to depth image region
                    dx1 = int(gx * depth_width / self.grid_width)
                    dx2 = int((gx + 1) * depth_width / self.grid_width)
                    dy1 = int(gy * depth_height / self.grid_height)
                    dy2 = int((gy + 1) * depth_height / self.grid_height)

                    # Get average depth for this grid cell
                    region = depth[dy1:dy2, dx1:dx2]
                    avg_depth = np.mean(region)

                    # Person detected if depth is close and valid
                    # Kinect depth range: ~500mm - 4000mm
                    is_shadow = bool(avg_depth < self.depth_threshold and avg_depth > 400)
                    row.append(is_shadow)

                mask.append(row)

            return mask

        except Exception as e:
            print(f"⚠️  Error getting depth data: {e}")
            # Return empty mask on error
            return [[False] * self.grid_width for _ in range(self.grid_height)]

    async def handle_client(self, websocket):
        """
        Handle WebSocket client connections.

        Args:
            websocket: WebSocket connection
        """
        self.clients.add(websocket)
        client_id = id(websocket)
        print(f"✅ Client {client_id} connected. Total clients: {len(self.clients)}")

        try:
            async for message in websocket:
                # Handle messages from client
                try:
                    data = json.loads(message)

                    if 'threshold' in data:
                        self.depth_threshold = int(data['threshold'])
                        print(f"📏 Depth threshold updated: {self.depth_threshold}mm")

                    if 'grid_size' in data:
                        self.grid_width = data['grid_size']['width']
                        self.grid_height = data['grid_size']['height']
                        print(f"📐 Grid size updated: {self.grid_width}x{self.grid_height}")

                except json.JSONDecodeError:
                    print(f"⚠️  Invalid JSON from client: {message}")

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.remove(websocket)
            print(f"❌ Client {client_id} disconnected. Total clients: {len(self.clients)}")

    async def broadcast_shadow_data(self):
        """
        Continuously capture depth data and broadcast to all clients.
        Runs at ~30fps.
        """
        frame_count = 0

        while self.is_running:
            if self.clients:
                # Get shadow mask from Kinect
                mask = self.get_shadow_mask()

                # Count active shadow cells for debugging
                shadow_count = sum(sum(row) for row in mask)

                # Create message
                message = json.dumps({
                    'type': 'shadow_mask',
                    'data': mask,
                    'metadata': {
                        'grid_width': self.grid_width,
                        'grid_height': self.grid_height,
                        'threshold': self.depth_threshold,
                        'shadow_cells': shadow_count,
                        'frame': frame_count
                    }
                })

                # Broadcast to all connected clients
                if self.clients:
                    await asyncio.gather(
                        *[client.send(message) for client in self.clients],
                        return_exceptions=True
                    )

                frame_count += 1
                if frame_count % 30 == 0:  # Log every second
                    print(f"📡 Frame {frame_count}: {shadow_count} shadow cells | {len(self.clients)} clients")

            # Run at ~30fps
            await asyncio.sleep(0.033)

    async def start(self, host='127.0.0.1', port=8181):
        """
        Start the WebSocket server.

        Args:
            host: Server host address
            port: Server port
        """
        print("\n" + "="*60)
        print("🎮 KINECT SHADOW SERVER")
        print("="*60)
        print(f"🌐 Server: ws://{host}:{port}")
        print(f"📐 Grid: {self.grid_width} x {self.grid_height}")
        print(f"📏 Depth threshold: {self.depth_threshold}mm")
        print(f"🎯 Shadow detection: Objects closer than {self.depth_threshold}mm")
        print("="*60)
        print("\n💡 Connect your browser to this WebSocket server")
        print("   The artificial life simulation will receive shadow data\n")

        # Start WebSocket server and broadcast loop concurrently
        async with websockets.serve(self.handle_client, host, port):
            await self.broadcast_shadow_data()


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Kinect Shadow WebSocket Server for Artificial Life',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 kinect_server.py
  python3 kinect_server.py --host 0.0.0.0 --port 9000
  python3 kinect_server.py --threshold 1500 --grid 60 32
        """
    )

    parser.add_argument('--host', default='127.0.0.1',
                        help='WebSocket server host (default: 127.0.0.1)')
    parser.add_argument('--port', type=int, default=8181,
                        help='WebSocket server port (default: 8181)')
    parser.add_argument('--threshold', type=int, default=1200,
                        help='Depth threshold in mm (default: 1200)')
    parser.add_argument('--grid', type=int, nargs=2, metavar=('WIDTH', 'HEIGHT'),
                        default=[160, 120],
                        help='Grid dimensions (default: 50 28)')

    args = parser.parse_args()

    # Create and start server
    server = KinectShadowServer(
        grid_width=args.grid[0],
        grid_height=args.grid[1],
        depth_threshold=args.threshold
    )

    try:
        asyncio.run(server.start(host=args.host, port=args.port))
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        sys.exit(0)


if __name__ == '__main__':
    main()
