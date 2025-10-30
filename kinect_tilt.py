#!/usr/bin/env python3
"""
Kinect Tilt Control Utility
Standalone script to adjust Kinect V1 motor tilt angle

Usage:
  python3 kinect_tilt.py 15        # Tilt up 15 degrees
  python3 kinect_tilt.py -10       # Tilt down 10 degrees
  python3 kinect_tilt.py 0         # Return to neutral
"""

import sys
import time

try:
    import freenect
except ImportError:
    print("❌ ERROR: freenect module not found!")
    print("Please install: brew install libfreenect && pip3 install freenect")
    sys.exit(1)


def set_kinect_tilt(angle):
    """
    Set Kinect tilt angle using the async API.

    Args:
        angle: Tilt angle in degrees (-30 to +30)
    """
    # Clamp to Kinect V1 motor limits
    angle = max(-30, min(30, angle))

    print(f"🎮 Initializing Kinect...")

    try:
        # Initialize Kinect context
        ctx = freenect.init()
        if ctx is None:
            print("❌ Failed to initialize Kinect context")
            return False

        # Open device
        dev = freenect.open_device(ctx, 0)
        if dev is None:
            print("❌ Failed to open Kinect device")
            freenect.shutdown(ctx)
            return False

        print(f"✅ Kinect detected")
        print(f"🎚️  Setting tilt angle to {angle}°...")

        # Set tilt
        freenect.set_tilt_degs(dev, angle)

        # Wait for motor to finish
        print(f"⏳ Waiting for motor to complete...")
        time.sleep(2)

        # Get actual state
        state = freenect.get_tilt_state(dev)
        if state:
            actual_angle = freenect.get_tilt_degs(state)
            print(f"✅ Tilt set successfully!")
            print(f"   Requested: {angle}°")
            print(f"   Actual: {actual_angle}°")

        # Clean up
        freenect.close_device(dev)
        freenect.shutdown(ctx)

        return True

    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False


def main():
    """Main entry point"""

    print("=" * 60)
    print("🎚️  KINECT TILT CONTROL")
    print("=" * 60)

    # Parse angle from command line
    if len(sys.argv) != 2:
        print("\n❌ Usage: python3 kinect_tilt.py <angle>")
        print("\nExamples:")
        print("  python3 kinect_tilt.py 15      # Tilt up 15°")
        print("  python3 kinect_tilt.py -10     # Tilt down 10°")
        print("  python3 kinect_tilt.py 0       # Neutral position")
        print("\nAngle range: -30° (down) to +30° (up)")
        print("\n💡 Tips:")
        print("  - Tilt UP (+) if you see feet but not head")
        print("  - Tilt DOWN (-) if you see head but not feet")
        print("  - Use with full body capture guide for best results")
        sys.exit(1)

    try:
        angle = int(sys.argv[1])
    except ValueError:
        print(f"❌ ERROR: '{sys.argv[1]}' is not a valid angle")
        print("   Please provide an integer between -30 and +30")
        sys.exit(1)

    # Validate range
    if angle < -30 or angle > 30:
        print(f"⚠️  WARNING: Angle {angle}° is outside safe range")
        angle = max(-30, min(30, angle))
        print(f"   Clamping to {angle}°")

    # Set the tilt
    success = set_kinect_tilt(angle)

    if success:
        print("\n" + "=" * 60)
        print("✅ DONE!")
        print("=" * 60)
        print("\n💡 Your Kinect is now tilted. You can:")
        print("   1. Run this script again to adjust further")
        print("   2. Start/restart the Kinect server")
        print("   3. The tilt will persist until you change it\n")
        sys.exit(0)
    else:
        print("\n❌ Failed to set Kinect tilt")
        print("\nTroubleshooting:")
        print("  1. Make sure no other program is using the Kinect")
        print("  2. Check that the Kinect is properly connected")
        print("  3. Ensure you have permissions to access USB devices")
        sys.exit(1)


if __name__ == '__main__':
    main()
