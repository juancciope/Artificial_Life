# Full Body Capture Guide for Kinect V1

## Problem: Head or Feet Getting Cut Off?

The Kinect V1 has a **limited vertical field of view (43°)**. When people stand too close, their head or feet get cut off. This guide shows you how to capture the full body.

## 🎯 Quick Solutions

### Solution 1: Move Kinect Further Away (BEST)

**Distance matters more than anything else!**

```
❌ Too Close (3-4 feet):
    👤 [Head cut off]
    ▓▓
    ▓▓
    [Kinect]

✅ Optimal (6-10 feet):
    👤 [Full body visible!]
    ▓▓
    ▓▓
    ▓▓
    ▓▓
        [Kinect]
```

**Recommended Distances:**
- **Minimum:** 3-4 feet (partial body only)
- **Good:** 6-8 feet (full body for most people)
- **Ideal:** 8-12 feet (full body + margin for movement)
- **Maximum:** 15 feet (Kinect V1 limit)

### Solution 2: Use the Standalone Tilt Script! 🎚️

**You can now tilt the Kinect using a simple command-line tool!**

**Before starting the Kinect server**, run:

```bash
python3 kinect_tilt.py 15      # Tilt up 15 degrees
python3 kinect_tilt.py -10     # Tilt down 10 degrees
python3 kinect_tilt.py 0       # Return to neutral
```

**Important**: The Kinect server must NOT be running when you adjust tilt. The tilt angle will persist after you start the server.

**When to Tilt UP (+10° to +20°):**
- Kinect on the floor
- Seeing feet but missing head
- Want to capture more ceiling/upper space

**When to Tilt DOWN (-10° to -20°):**
- Kinect mounted high (chest/head level)
- Seeing head but missing feet
- Want to capture more floor space

**Neutral (0°):**
- Kinect at waist/chest height (~3-4 feet)
- Person standing 8-10 feet away

### Solution 3: Optimal Physical Positioning

**Best Setup for Full Body:**

```
Side View:

    [Person]  ← 6 ft tall
    ╔══════╗
    ║ HEAD ║  ← Capture from head...
    ║ ▓▓▓▓ ║
    ║ BODY ║
    ║ ▓▓▓▓ ║
    ║ LEGS ║  ← ...down to feet
    ╚══════╝

    ────────  ← 3-4 ft high
    [Kinect]  ← Tilt: 0° to -5°
      |
    ──┴──
    Stand

    ←─ 8-10 feet ─→
```

**Mounting Height:**
- **Floor level:** Tilt UP +15° to +25°
- **Chest level (3-4 ft):** Tilt NEUTRAL or slightly down -5°
- **Head level (5-6 ft):** Tilt DOWN -10° to -20°

## 🎮 Step-by-Step Setup

### Step 1: Position Your Kinect

1. **Choose a location** 8-10 feet from where people will stand
2. **Mount at chest height** (3-4 feet) if possible
3. **Point straight at the standing area**
4. **Clear the space** - no obstacles between Kinect and people

### Step 2: Start the Server

```bash
python3 kinect_server.py
```

### Step 3: Connect and Adjust in Browser

1. Open http://localhost:3000
2. Connect to Kinect
3. Enable Kinect mode
4. **Have someone stand in view**

### Step 4: Use Tilt Control to Frame Full Body

1. Look at the shadow on screen
2. If **head is cut off**: Move tilt slider **UP** (positive)
3. If **feet are cut off**: Move tilt slider **DOWN** (negative)
4. Adjust until you see **full body from head to toes**

### Step 5: Fine-Tune Other Settings

**Depth Threshold:**
- Increase (1500-2000mm) if picking up background
- Decrease (800-1000mm) for closer detection

**Visualization Style:**
- Try "Heatmap" to see body density
- Try "Contour" to see body outline clearly

## 📐 Kinect V1 Technical Specs

**Field of View:**
- Horizontal: 57° (wider)
- Vertical: 43° (narrower) ← This causes the problem!

**Depth Range:**
- Minimum: ~0.5 meters (1.6 feet)
- Maximum: ~4.5 meters (15 feet)
- Optimal: 1.8 - 3.5 meters (6-12 feet)

**Coverage at Different Distances:**

| Distance | Width Coverage | Height Coverage |
|----------|----------------|-----------------|
| 3 feet   | 3.0 ft        | 2.3 ft ❌ (cuts body) |
| 6 feet   | 6.0 ft        | 4.6 ft ✅ (captures ~6ft person) |
| 8 feet   | 8.0 ft        | 6.1 ft ✅ (full body + margin) |
| 10 feet  | 10.0 ft       | 7.6 ft ✅ (great!) |
| 12 feet  | 12.0 ft       | 9.2 ft ✅ (best!) |

## 🎪 Setup for Nashville Scares Party

**Scenario:** Multiple people interacting with their shadows

**Recommended Setup:**

```
Stage/Wall (backdrop)
━━━━━━━━━━━━━━━━━━━━━

    [Interaction Zone]
    ▓▓ 12 feet wide ▓▓
    ▓▓  8 feet deep ▓▓

    ═══════════════════
         Barrier

    [Kinect] ← 4 ft high, tilt down -5°
      |
    ──┴──
    Tripod

    ←─── 10 feet ───→
```

**Why this works:**
- **10 feet distance** = Captures full 6ft+ person with margin
- **4 ft mounting height** = Centered on body
- **-5° tilt** = Compensates for slight upward angle
- **Wide coverage** = 10-12 ft wide at that distance

## 🔧 Troubleshooting

### Problem: Still Cutting Head/Feet After Adjusting Distance

**Solution:**
1. Check tilt angle - adjust +/-5° more
2. Move Kinect further back
3. Have person stand further from Kinect
4. Check ceiling height (low ceilings limit upward tilt)

### Problem: Person Too Small on Screen

**Solution:**
- Move Kinect closer (but not under 6 feet!)
- Increase depth threshold to capture more area
- This is a trade-off between full body capture and size

### Problem: Kinect Tilt Not Responding

**Using the standalone tilt script:**

1. **Stop the Kinect server** (Ctrl+C if running)
2. **Run the tilt script:**
   ```bash
   python3 kinect_tilt.py 15
   ```
3. **Wait for confirmation:**
   - You should hear the motor sound
   - Script shows: `✅ Tilt set successfully!`
4. **Start the server again:**
   ```bash
   python3 kinect_server.py
   ```

**If still not working:**
1. Check Kinect has power (not just USB, needs power adapter)
2. Ensure no other programs are using the Kinect
3. Try a smaller angle first (like 5° or 10°)
4. Make sure libfreenect is installed: `brew list libfreenect`

### Problem: Shadow Detection Poor at Distance

**Solutions:**
1. Reduce depth threshold (1000-1200mm)
2. Use brighter area (Kinect's IR works better with ambient light)
3. Remove IR-reflective surfaces (mirrors, glossy floors)
4. Check for IR interference (sunlight, other IR devices)

## 💡 Pro Tips

### For Best Results:

1. **Test before the event:**
   - Have different height people test (5ft - 6.5ft)
   - Find the tilt angle that works for everyone
   - Mark the floor where people should stand

2. **Use markers:**
   - Tape on floor showing optimal standing position
   - "Stand here for best shadow" sign

3. **Adjust for shorter/taller people:**
   - Tilt UP slightly for shorter people
   - Tilt DOWN slightly for taller people
   - Or find a middle ground that captures most people

4. **Monitor during event:**
   - Watch the shadow display
   - Adjust tilt if people's heads/feet get cut
   - Can adjust in real-time without stopping!

### Optimal Settings Combination:

```
Distance: 8-10 feet
Height: 3-4 feet off ground
Tilt: -5° to +5° (adjust per person)
Depth Threshold: 1200mm
Visualization: Heatmap or Contour (shows body clearly)
```

## 📸 Visual References

### Good Full Body Capture:
```
┌─────────────────┐
│     🎩 HEAD     │ ← Top of canvas
│                 │
│      ╔═╗        │
│      ║█║        │ ← Full torso visible
│      ╚═╝        │
│      │ │        │
│      │ │        │
│     👞 👞       │ ← Feet visible
└─────────────────┘ ← Bottom of canvas
```

### Bad - Head Cut Off:
```
┌─────────────────┐
│      ▀▀▀▀       │ ← Head missing!
│      ╔═╗        │
│      ║█║        │
│      ╚═╝        │
│      │ │        │
│     👞 👞       │
└─────────────────┘
```

### Bad - Feet Cut Off:
```
┌─────────────────┐
│     🎩 HEAD     │
│      ╔═╗        │
│      ║█║        │
│      ╚═╝        │
│      │ │        │
│      ▄ ▄        │ ← Feet missing!
└─────────────────┘
```

## 🎯 Quick Reference Card

Print and tape near the Kinect:

```
╔═══════════════════════════════════╗
║   KINECT FULL BODY SETUP CARD    ║
╠═══════════════════════════════════╣
║                                   ║
║  DISTANCE: 8-10 feet              ║
║  HEIGHT: 3-4 feet from floor      ║
║  TILT: Adjust in browser          ║
║                                   ║
║  IF HEAD CUT: Tilt UP (+)         ║
║  IF FEET CUT: Tilt DOWN (-)       ║
║                                   ║
║  Browser: localhost:3000          ║
║  Shadow Settings > Kinect Tilt    ║
║                                   ║
╚═══════════════════════════════════╝
```

---

**Nashville Scares 2025 🎃**
*The Seventh Seal - Full Body Shadow Interaction*
