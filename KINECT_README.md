# Kinect Shadow Interaction Setup

Complete guide for setting up Kinect V1 shadow interaction with the Artificial Life simulation.

## Overview

This system allows people to interact with the artificial life simulation using their body shadows captured by a Microsoft Kinect V1 sensor. The Kinect detects depth information, converts it to a shadow mask, and streams it to the browser-based simulation via WebSocket.

## Prerequisites

### Hardware
- Microsoft Kinect V1 (Xbox 360 Kinect with power adapter)
- USB connection to computer
- Recommended: Tripod or mount for positioning Kinect

### Software
- Python 3.x
- libfreenect (Kinect driver)
- Python packages: `websockets`, `numpy`, `freenect`

## Installation

### macOS

```bash
# Install libfreenect
brew install libfreenect

# Install Python dependencies
pip3 install websockets numpy freenect
```

### Verify Installation

```bash
# Test Kinect connection
python3 -c "import freenect; print('Kinect detected:', freenect.sync_get_depth()[0].shape)"
```

## Quick Start

### 1. Position Your Kinect

For full body capture:
- **Distance**: 8-10 feet from where people will stand
- **Height**: 3-4 feet off the ground (chest level)
- **Clear line of sight** with no obstacles

### 2. Adjust Kinect Tilt (Optional)

Before starting the server, adjust the Kinect angle:

```bash
# Tilt up 15 degrees (if head is cut off)
python3 kinect_tilt.py 15

# Tilt down 10 degrees (if feet are cut off)
python3 kinect_tilt.py -10

# Return to neutral
python3 kinect_tilt.py 0
```

The tilt angle will persist after you start the server.

### 3. Start the Kinect Server

```bash
python3 kinect_server.py
```

Default settings:
- Host: `127.0.0.1`
- Port: `8181`
- Grid: `160x120`
- Depth threshold: `1200mm`

### 4. Start the Web Application

```bash
python3 -m http.server 3000
```

### 5. Connect in Browser

1. Open: http://localhost:3000
2. Click "Connect to Kinect"
3. Enable "Kinect Mode"
4. Have someone stand in front of the Kinect
5. Adjust settings as needed

## Command Line Options

### Kinect Server

```bash
# Custom port
python3 kinect_server.py --port 9000

# Custom host (for remote access)
python3 kinect_server.py --host 0.0.0.0

# Custom depth threshold
python3 kinect_server.py --threshold 1500

# Custom grid size
python3 kinect_server.py --grid 60 32

# Combine options
python3 kinect_server.py --host 0.0.0.0 --port 9000 --threshold 1200
```

### Kinect Tilt Script

```bash
# Syntax
python3 kinect_tilt.py <angle>

# Examples
python3 kinect_tilt.py 20      # Tilt up 20°
python3 kinect_tilt.py -15     # Tilt down 15°
python3 kinect_tilt.py 0       # Neutral position

# Angle range: -30° to +30°
```

**Important**: Stop the Kinect server before adjusting tilt!

## Browser Controls

### Connection Settings
- **Connect to Kinect**: Establish WebSocket connection
- **Disconnect**: Close connection
- **Status**: Shows connection state

### Shadow Settings
- **Enable Kinect Mode**: Toggle shadow interaction on/off
- **Visualization Style**:
  - Edge Only: Clean outline
  - Heatmap: Shows density/depth
  - Contour: Enhanced outline
  - Overlay: Shows lifeforms inside shadow
- **Depth Threshold**: Distance to detect person (400-3000mm)
  - Lower = detect closer objects only
  - Higher = detect objects further away
- **Invert Shadow**: Reverse shadow behavior

### Display
- **Toggle Fullscreen**: Expand canvas to fullscreen (press ESC to exit)

### Stats
- **Frames**: Total frames received
- **FPS**: Current frame rate
- **Shadow Cells**: Number of cells detecting person

## Full Body Capture Guide

If you can't see the whole person (head or feet cut off), see the comprehensive guide:

**[FULL_BODY_CAPTURE_GUIDE.md](FULL_BODY_CAPTURE_GUIDE.md)**

Quick tips:
1. **Move Kinect further away** (8-10 feet minimum)
2. **Mount at chest height** (3-4 feet)
3. **Use tilt control** to adjust angle
4. **Check field of view** - Kinect V1 has 43° vertical FOV

## Troubleshooting

### Kinect Not Detected

```bash
# Check if Kinect is connected
lsusb | grep Kinect  # Linux
system_profiler SPUSBDataType | grep Xbox  # macOS

# Verify libfreenect installation
brew list libfreenect  # macOS

# Test Kinect manually
python3 -c "import freenect; print(freenect.sync_get_depth()[0].shape)"
```

### Connection Failed

- Check server is running: `python3 kinect_server.py`
- Verify port is correct (default: 8181)
- Check firewall settings
- Try `127.0.0.1` instead of `localhost`

### Poor Shadow Detection

1. **Increase depth threshold** (1500-2000mm) if detecting background
2. **Decrease depth threshold** (800-1000mm) for closer detection
3. **Improve lighting** - Kinect's IR works better with ambient light
4. **Remove IR interference** - avoid direct sunlight, mirrors, glossy surfaces
5. **Check Kinect angle** - should point at standing area

### Kinect Tilt Not Working

1. **Stop the server first** - tilt script needs exclusive access
2. **Check power** - Kinect needs power adapter (not just USB)
3. **Wait for motor** - takes 2-3 seconds to complete
4. **Reduce angle** - try smaller increments (5° or 10°)
5. **Test manually**:
   ```bash
   python3 -c "import freenect; ctx=freenect.init(); dev=freenect.open_device(ctx,0); freenect.set_tilt_degs(dev,10)"
   ```

### Server Crashes

- Make sure only ONE program is using the Kinect
- Don't run multiple Kinect servers on same device
- Check USB connection and power
- Try unplugging and reconnecting Kinect

### Low Frame Rate

- Normal: ~30 FPS
- If lower:
  - Reduce grid size: `--grid 60 32`
  - Close other programs
  - Check CPU usage
  - Ensure good USB connection (USB 2.0 required)

## Technical Details

### System Architecture

```
Kinect Hardware
     ↓
libfreenect (Driver)
     ↓
kinect_server.py (Python WebSocket Server)
     ↓ ws://localhost:8181
kinect-controller.js (JavaScript Client)
     ↓
alife.js (Simulation Engine)
     ↓
HTML5 Canvas (Display)
```

### WebSocket Protocol

**Client → Server (Configuration):**
```json
{
  "threshold": 1500,           // Depth threshold in mm
  "grid_size": {
    "width": 160,
    "height": 120
  }
}
```

**Server → Client (Shadow Data):**
```json
{
  "type": "shadow_mask",
  "data": [[true, false, ...], ...],  // 2D boolean array
  "metadata": {
    "grid_width": 160,
    "grid_height": 120,
    "threshold": 1200,
    "shadow_cells": 234,
    "frame": 1234
  }
}
```

### Kinect V1 Specifications

- **Depth Range**: 0.5m - 4.5m (1.6ft - 15ft)
- **Optimal Range**: 1.8m - 3.5m (6ft - 12ft)
- **Field of View**: 57° horizontal × 43° vertical
- **Depth Resolution**: 640×480 @ 30fps
- **Motor Range**: -30° to +30° tilt
- **Interfaces**: USB 2.0 + proprietary power

### Grid Mapping

The 640×480 Kinect depth image is downsampled to match the simulation grid:

1. Divide depth image into grid regions
2. Calculate average depth per region
3. Create boolean mask (person detected if depth < threshold)
4. Stream mask to browser at ~30fps

## File Reference

### Core Files

- **kinect_server.py** - WebSocket server that interfaces with Kinect
- **kinect_tilt.py** - Standalone script to adjust Kinect angle
- **kinect-controller.js** - Browser WebSocket client
- **alife.js** - Main simulation engine with shadow integration
- **index.html** - Web UI with Kinect controls

### Documentation

- **KINECT_README.md** - This file
- **FULL_BODY_CAPTURE_GUIDE.md** - Detailed full body capture guide
- **CHROME_EXTENSION_QUICK_START.md** - Native messaging integration

## Advanced Usage

### Remote Access

Allow connections from other devices on your network:

```bash
# Start server on all interfaces
python3 kinect_server.py --host 0.0.0.0 --port 8181

# In browser, connect to:
# ws://<your-ip-address>:8181
```

### Custom Grid Sizes

Match different canvas dimensions:

```bash
# For a 60x32 grid
python3 kinect_server.py --grid 60 32

# For a 200x150 high-res grid
python3 kinect_server.py --grid 200 150
```

### Multiple Displays

Run the web server on different ports:

```bash
# Terminal 1: Kinect server
python3 kinect_server.py --port 8181

# Terminal 2: Web server 1
cd /path/to/project && python3 -m http.server 3000

# Terminal 3: Web server 2
cd /path/to/project && python3 -m http.server 3001

# Both browsers can connect to same Kinect server
```

## Event Setup Guide

For parties/installations like Nashville Scares 2025:

### Physical Setup

```
Stage/Wall (projection surface)
━━━━━━━━━━━━━━━━━━━━━━━━━━

    [Interaction Zone]
    ▓ 12 feet wide ▓
    ▓  8 feet deep ▓

    ═══════════════════
         Barrier

    [Kinect] ← 4 ft high
      |
    ──┴──
    Tripod

    ←─── 10 feet ───→
```

### Pre-Event Checklist

- [ ] Test Kinect connection
- [ ] Adjust tilt for average height people
- [ ] Mark floor where people should stand
- [ ] Test with different height people
- [ ] Set depth threshold for room
- [ ] Configure fullscreen mode
- [ ] Test USB cable length
- [ ] Have backup power adapter
- [ ] Print quick reference card

### During Event

- Monitor shadow display
- Adjust threshold if needed
- Can restart server if issues occur
- Tilt can be adjusted between sessions (requires server restart)

## Support

### Resources

- [libfreenect GitHub](https://github.com/OpenKinect/libfreenect)
- [Full Body Capture Guide](FULL_BODY_CAPTURE_GUIDE.md)
- [Original Project Blog](https://314reactor.com/2017/10/16/artificial-life-project/)

### Common Issues

See the Troubleshooting section above or consult:
- **FULL_BODY_CAPTURE_GUIDE.md** for positioning issues
- Server console output for connection diagnostics
- Browser console (F12) for WebSocket errors

---

**Nashville Scares 2025 🎃**
*The Seventh Seal - Full Body Shadow Interaction*
