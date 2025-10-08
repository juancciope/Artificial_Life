# Xbox 360 Kinect V1 Setup Guide

This guide will help you set up the Xbox 360 Kinect V1 sensor with the Artificial Life simulation for shadow interaction.

## 🎯 Overview

The Kinect shadow feature creates an interactive experience where artificial lifeforms only appear visible where your body is detected by the Kinect depth sensor. Move your body and watch the lifeforms follow your silhouette!

## 📋 Requirements

- **Hardware**: Xbox 360 Kinect V1 sensor with USB adapter
- **Operating System**: macOS or Windows
- **Python**: Python 3.7 or higher
- **USB Port**: Available USB 2.0 or 3.0 port

---

## 🍎 macOS Installation

### Step 1: Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install libfreenect

```bash
brew install libfreenect
```

### Step 3: Install Python Dependencies

```bash
pip3 install websockets numpy freenect
```

### Step 4: Verify Installation

```bash
# Test if libfreenect can detect your Kinect
freenect-glview
```

You should see a window showing depth camera output if your Kinect is connected.

---

## 🪟 Windows Installation

### Step 1: Install Visual Studio Build Tools

1. Download **Visual Studio 2022 Build Tools** from: https://visualstudio.microsoft.com/downloads/
2. During installation, select "Desktop development with C++"

### Step 2: Install CMake

1. Download CMake from: https://cmake.org/download/
2. During installation, select "Add CMake to system PATH"

### Step 3: Build libfreenect from Source

```powershell
# Clone libfreenect repository
git clone https://github.com/OpenKinect/libfreenect.git
cd libfreenect

# Create build directory
mkdir build
cd build

# Generate build files
cmake .. -G "Visual Studio 17 2022" -A x64

# Build the project
cmake --build . --config Release

# Install (run as Administrator)
cmake --install . --config Release
```

### Step 4: Install Python Dependencies

```powershell
pip install websockets numpy
```

### Step 5: Install freenect Python Bindings

```powershell
cd libfreenect\wrappers\python
python setup.py install
```

### Step 6: Install Kinect Drivers

1. Download **Kinect for Windows SDK 1.8** from Microsoft
2. Install the SDK which includes the necessary USB drivers
3. Restart your computer

---

## 🚀 Running the Kinect Server

### Start the WebSocket Server

```bash
# From the artificial_life directory
python3 kinect_server.py
```

You should see output like:

```
🎮 Testing Kinect connection...
✅ Kinect detected! Depth image: (480, 640)

============================================================
🎮 KINECT SHADOW SERVER
============================================================
🌐 Server: ws://127.0.0.1:8181
📐 Grid: 50 x 28
📏 Depth threshold: 1200mm
🎯 Shadow detection: Objects closer than 1200mm
============================================================

💡 Connect your browser to this WebSocket server
   The artificial life simulation will receive shadow data
```

### Advanced Server Options

```bash
# Custom host and port
python3 kinect_server.py --host 0.0.0.0 --port 9000

# Custom depth threshold (in millimeters)
python3 kinect_server.py --threshold 1500

# Custom grid size (must match canvas)
python3 kinect_server.py --grid 60 32

# Combine options
python3 kinect_server.py --host 0.0.0.0 --port 9000 --threshold 1500 --grid 60 32
```

---

## 🌐 Running the Web Application

### Start the Web Server

In a **separate terminal**, start the web server:

```bash
# From the artificial_life directory
python3 -m http.server 3006
```

### Open in Browser

Navigate to: **http://localhost:3006**

---

## 🎮 Using the Kinect Controls

### 1. Connect to Kinect Server

1. In the sidebar, scroll to **📹 Kinect Shadow** section
2. Ensure **Server IP** is set to `127.0.0.1` (or your server IP)
3. Click **Connect Kinect** button
4. Status should change to **Connected** (green)

### 2. Adjust Shadow Settings

- **Depth Threshold**: Controls how close you need to be to create a shadow
  - Lower values (400-800mm): Must be very close
  - Medium values (1000-1500mm): Normal standing distance
  - Higher values (2000-3000mm): Detects from farther away

- **Invert Shadow**: Toggle to reverse the shadow effect
  - **OFF**: Lifeforms visible where your body is detected
  - **ON**: Lifeforms hidden where your body is detected

### 3. Monitor Stats

- **Frames**: Total frames received from Kinect
- **FPS**: Current frame rate (~30fps expected)
- **Shadow Cells**: Number of grid cells currently detecting your body

---

## 🔧 Troubleshooting

### Kinect Not Detected

**macOS**:
```bash
# Check if libfreenect is installed
brew list | grep libfreenect

# Check USB connection
system_profiler SPUSBDataType | grep Kinect
```

**Windows**:
- Verify Kinect SDK 1.8 is installed
- Check Device Manager for "Xbox NUI Camera" and "Xbox NUI Motor"
- Try different USB ports (USB 2.0 recommended)

### Connection Failed

1. Ensure the Kinect server is running (`python3 kinect_server.py`)
2. Check that nothing else is using port 8181
3. Try different port: `python3 kinect_server.py --port 9000`
4. Update server IP in the web UI to match

### Low FPS / Laggy

- Close other applications using the Kinect
- Reduce grid size: `python3 kinect_server.py --grid 40 22`
- Check USB connection (try different port)
- Ensure WebSocket server is running locally (not remote)

### Shadow Not Appearing

1. Check **Shadow Cells** stat - should be > 0 when you're in frame
2. Adjust **Depth Threshold** - try 1500mm
3. Ensure you're within Kinect's range (0.5m - 4m)
4. Try toggling **Invert Shadow** on/off
5. Verify **Audio Output** is enabled (lifeforms need to be spawned)

### Python Import Errors

```bash
# Reinstall dependencies
pip3 install --upgrade websockets numpy freenect

# If freenect fails, try:
pip3 install freenect --user
```

---

## 🎨 Creative Tips

### Best Shadow Effects

- **Standing Distance**: 1.5-2 meters from Kinect
- **Lighting**: Normal room lighting (not too dark)
- **Threshold**: Start at 1200mm, adjust based on your distance
- **Grid Size**: Default 50x28 works well, increase for higher detail

### Performance Modes

1. **Exhibition Mode + Kinect**: Creates stunning visual performances
2. **Dance Mode + Shadow**: Lifeforms dance within your silhouette
3. **Gravity + Shadow**: Watch lifeforms fall and collect in your shadow
4. **Inverted Shadow**: Create negative space effects

### Multi-Person Interaction

- Multiple people can create multiple shadows
- Kinect detects up to ~4m depth
- Closer bodies have priority in overlapping areas

---

## 📊 Technical Specifications

- **Kinect Resolution**: 640x480 depth image
- **Depth Range**: 400mm - 4000mm (usable: ~500mm - 3500mm)
- **Frame Rate**: ~30fps
- **WebSocket Protocol**: JSON messages with 2D boolean arrays
- **Grid Mapping**: Depth image downsampled to canvas grid dimensions
- **Network**: Local WebSocket on port 8181 (default)

---

## 🆘 Support

### Common Error Messages

**"freenect module not found"**:
- Reinstall: `pip3 install freenect`

**"Could not connect to Kinect"**:
- Check USB connection
- Verify drivers are installed (Windows)
- Try: `sudo freenect-glview` (macOS, may need permissions)

**"Address already in use"**:
- Port 8181 is occupied
- Use different port: `--port 9000`

### Getting Help

1. Check console logs in both terminal and browser
2. Verify Kinect LED is green (powered and connected)
3. Test Kinect with `freenect-glview` to isolate issues
4. Check firewall settings for WebSocket connections

---

## 🎉 You're Ready!

Start the Kinect server, connect via the browser, and enjoy creating interactive shadow-based artificial life experiences!

For more information, see the main project repository or contact the developer.
