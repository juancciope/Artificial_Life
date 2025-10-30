# Tilt Control Fix Summary

## Problem

When implementing motorized tilt control for the Kinect, the Python server was crashing with a segmentation fault (SIGSEGV) whenever the browser connected. The crash occurred in libusb's threading/mutex code.

### Error Details

```
Exception Type: EXC_BAD_ACCESS (SIGSEGV)
Exception Codes: KERN_INVALID_ADDRESS
Crashed Thread: com.apple.main-thread
Thread 0: pthread_mutex_lock + 12
         libusb_get_device_list + 264
         freenect_open_device + 60
```

## Root Cause

The crash was caused by trying to use **two conflicting libfreenect APIs in the same process**:

1. **Sync API**: `freenect.sync_get_depth()` - Used for depth capture
   - Manages its own internal device context
   - Simple and stable for streaming depth data

2. **Async API**: `freenect.init()` + `freenect.open_device()` - Needed for motor control
   - Requires manual device context management
   - Necessary for tilt control

When both were active simultaneously, they created competing device contexts which caused threading conflicts in the libusb layer.

## Solution: Standalone Tilt Script

Instead of integrating tilt control into the main server, I created a **standalone tilt utility** that can be run separately.

### New File: `kinect_tilt.py`

A simple command-line tool to adjust Kinect angle:

```bash
# Usage
python3 kinect_tilt.py 15      # Tilt up 15 degrees
python3 kinect_tilt.py -10     # Tilt down 10 degrees
python3 kinect_tilt.py 0       # Return to neutral
```

**How it works:**
1. Opens exclusive connection to Kinect
2. Uses async API to control motor
3. Sets tilt angle
4. Closes connection
5. Angle persists after script exits

**Important**: Must be run **before** starting the Kinect server, or while server is stopped.

## Changes Made

### 1. `kinect_server.py`

**Removed conflicting device initialization:**
```python
# BEFORE (caused crash):
self.ctx = freenect.init()
self.dev = freenect.open_device(self.ctx, 0)

# AFTER (stable):
# No device context initialization
# Server prints: "⚠️  Motor control not available with sync API"
```

**Updated initialization:**
- Removed `self.dev` and `self.ctx` attributes
- Still handles tilt commands but returns error message
- Added helpful message pointing to standalone script

### 2. `kinect_tilt.py` (NEW)

New standalone utility with:
- Command-line interface for angle adjustment
- Full error handling and validation
- Angle range enforcement (-30° to +30°)
- Motor completion wait time
- Verification of tilt state
- Helpful usage examples

### 3. `index.html`

**Replaced tilt slider with instructions:**
```html
<!-- BEFORE: Interactive slider -->
<input type="range" id="kinectTilt" min="-30" max="30" value="0">

<!-- AFTER: Static instructions -->
<div>
  Stop the server and run:<br>
  <code>python3 kinect_tilt.py 15</code>
</div>
```

### 4. `alife.js`

**Removed event handler for tilt slider:**
```javascript
// REMOVED:
document.getElementById('kinectTilt').addEventListener('input', (e) => {
    const tilt = e.target.value;
    document.getElementById('tiltValue').textContent = tilt + '°';
    if (this.kinectController) {
        this.kinectController.setTilt(tilt);
    }
});
```

### 5. `kinect-controller.js`

**No changes needed:**
- `setTilt()` method remains but won't do anything
- Server will reject tilt commands with error message
- Kept for potential future async API implementation

### 6. Documentation Updates

**Updated `FULL_BODY_CAPTURE_GUIDE.md`:**
- Changed "Browser Tilt Control" to "Standalone Tilt Script"
- Added usage instructions
- Updated troubleshooting section
- Emphasized server must be stopped first

**Created `KINECT_README.md`:**
- Comprehensive setup guide
- Tilt script usage
- Full troubleshooting section
- Technical architecture details
- Event setup checklist

**Created `TILT_FIX_SUMMARY.md`:**
- This document

## Usage Workflow

### Full Body Setup Process

1. **Stop server** (if running): `Ctrl+C`

2. **Adjust tilt**:
   ```bash
   python3 kinect_tilt.py 15    # Tilt up if head cut off
   python3 kinect_tilt.py -10   # Tilt down if feet cut off
   ```

3. **Start server**:
   ```bash
   python3 kinect_server.py
   ```

4. **Connect in browser**: http://localhost:3000

5. **Enable Kinect mode** and test

6. **Repeat if needed**: Stop server → adjust tilt → restart

### Why This Works

- **No conflicts**: Only one process accesses Kinect at a time
- **Persistent**: Tilt angle remains after script exits
- **Simple**: Clear command-line interface
- **Stable**: Main server continues using stable sync API
- **Flexible**: Can adjust tilt at any time between sessions

## Trade-offs

### Pros
✅ No crashes - completely stable
✅ Simple and reliable
✅ Clear separation of concerns
✅ Easy to use and understand
✅ No code complexity in main server
✅ Angle persists across server restarts

### Cons
❌ Not real-time - requires server restart
❌ Can't adjust from browser UI
❌ Requires terminal access
❌ Extra step in workflow

## Alternative Solutions Considered

### 1. Switch Entire Server to Async API
**Rejected because:**
- Would require complete rewrite of depth capture
- More complex code
- Async API is harder to work with
- Sync API is more stable for streaming

### 2. Separate Tilt Server Process
**Rejected because:**
- Overcomplicated for simple tilt control
- Would need IPC or additional WebSocket server
- More things that could break

### 3. Manual Physical Tilt Only
**Rejected because:**
- Less convenient
- Harder to fine-tune angle
- Can't adjust remotely

## Testing

To test the fix:

1. **Test standalone tilt script:**
   ```bash
   python3 kinect_tilt.py 10
   # Should hear motor sound
   # Should show: "✅ Tilt set successfully!"
   ```

2. **Test server stability:**
   ```bash
   python3 kinect_server.py
   # Should start without crashes
   # Connect from browser
   # Should receive shadow data without issues
   ```

3. **Test full workflow:**
   ```bash
   # Adjust tilt
   python3 kinect_tilt.py 15

   # Start server
   python3 kinect_server.py

   # In browser: connect and enable Kinect mode
   # Verify full body is captured

   # If not, stop server and adjust again
   ```

## Conclusion

The segmentation fault was caused by conflicting device contexts in libfreenect. The solution is a **standalone tilt utility** that runs separately from the main server, providing stable motor control without threading conflicts.

This approach prioritizes **reliability over convenience**, which is appropriate for an event/installation setup where the tilt angle typically only needs to be set once at the beginning.

---

**Files Modified:**
- ✏️ `kinect_server.py` - Removed device context initialization
- ➕ `kinect_tilt.py` - New standalone utility
- ✏️ `index.html` - Replaced slider with instructions
- ✏️ `alife.js` - Removed event handler
- ✏️ `FULL_BODY_CAPTURE_GUIDE.md` - Updated tilt section
- ➕ `KINECT_README.md` - New comprehensive guide
- ➕ `TILT_FIX_SUMMARY.md` - This document

**Status**: ✅ Crash fixed, stable standalone solution implemented
