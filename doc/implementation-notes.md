# Implementation notes - Biomechanics Arm

For developers. The educator-facing description is [model.md](./model.md).

## Layers

    PascoProtocol.ts          pure: commands, decoders, USB envelope
            │
    TPascoTransport           write(service, characteristic, bytes) + a packet listener
      ├─ BluetoothPascoTransport   Web Bluetooth
      └─ UsbPascoTransport         WebUSB
            │
    PascoSensorDevice         set-up, streaming, acknowledgements; one SensorSpec per model
    DemoSensorDevice          simulated arm (demo mode, tests, fuzz)
            │  TSensorDevice: connect(), start(period, onSample), disconnect()
    SensorChannel             averaging, zero, reverse, connection state
            │
    LabModel                  two channels, recorded points

Nothing above `TSensorDevice` knows which wire is in use, and nothing above
`SensorChannel` knows there is a wire at all.

The sim does not use the `pasco-ble` library (OpenPhysics/pascoTS). That library
has no USB transport and no periodic-sampling API, and CartCollisions had to pin
it and reach into private fields to stream. The sensor ids and calibration
constants here were taken from its `src/datasheets.ts`.

## PASCO protocol

A device has a device service (id 0) and one sensor service per channel
(id = channel + 1). Over Bluetooth, service `s` and characteristic `c` are the
GATT UUID `4a5c000s-000c-0000-0000-5c1e741f1c00`. Characteristics: 2 send
command, 3 receive, 4 stream data, 5 stream acknowledgement.

| Step | Service | Bytes |
|---|---|---|
| Keepalive | device | `00` |
| Rotary start (PS-3220 only) | device | `37 01 00` |
| Stop any running sampler | device | `07` |
| Set sample period | each sensor | `01`, period in µs (u32 LE), `00 00` |
| Start sampling | device | `06`, then period in ms (u16 LE) once per channel |
| Streamed data (from device) | sensor | sequence (< 0x20), then samples |
| Acknowledge, every 8 packets per service | sensor, characteristic 5 | `00 00 00 00`, sequence |

Every channel that samples must be acknowledged or the device stops sending.
The PS-3202 has three channels (force, acceleration, gyroscope); the sim starts
all three and decodes only force.

| Sensor | Interface | Channel → sensor | Sample | Conversion |
|---|---|---|---|---|
| PS-3202 | 1028 | 0 → 2023 | unsigned 16-bit | line through (32768, 0 N) and (5000, 50 N) |
| PS-3220 | 1041 | 0 → 2047 | signed 16-bit count change | running sum × 2π / 2000 rad |

The sampling commands are the ones MotionSensor (PS-3219) and CartCollisions
(Smart Cart) use with real hardware. The Smart Cart experience is why the rotary
sensor is streamed, not polled: a one-shot read of a PASCO encoder does not
return a live count.

## Hardware status

**Nothing under `src/common/hardware/` has been run against a real PS-3202 or
PS-3220 yet.** It is assembled from protocol details proven on other PASCO
sensors and from the pascoTS datasheets. The unit tests check the code against
that understanding, not against the sensors. Expect to adjust details on first
contact; `?showDiagnostics` shows, under each panel, the count of data packets,
the count of other packets and the bytes of the last data packet, which is what
is needed to see where it goes wrong.

Things to confirm on hardware, in order:

1. Bluetooth: the picker lists the sensors (name prefixes `Force Accel` and
   `Rotary Motion`), and readings arrive.
2. Force: sign and scale against a known weight (a 100 g mass should read 0.98 N).
3. Angle: one full turn reads 360°.
4. That the stream keeps running past a few seconds (acknowledgements work).

## USB

`UsbPascoTransport` is adapted from MotionSensor's `UsbMotionSensor`. On the
PS-3219 the device is a vendor-class USB device (vendor id 0x0945) with one bulk
IN and one bulk OUT endpoint; the PASCO packets are the Bluetooth ones behind a
two-byte `[service, characteristic]` header; and the bridge stays silent until a
vendor control transfer (request 0xfb, index 0x3500) enables it.

Whether the PS-3202 and PS-3220 behave the same is not known. PASCO's wireless
sensors are not uniform over USB: the Wireless Geiger Counter (PS-3238) is a HID
device with a different framing (see RadioactivityAndStatistics). So before
relying on USB:

1. `npm start`, open `/scripts/probe/usb-probe.html`, plug in one sensor.
2. Press *1. WebUSB*. If the sensor appears, the page logs its descriptors,
   wakes the bridge and can start a stream; packets logged as `IN 01 04 …` mean
   the transport should work as written.
3. If the WebUSB picker is empty, press *2. WebHID*. If the sensor appears
   there, it needs a HID transport (a third `TPascoTransport`), and the logged
   reports say what its framing is.

The sim offers the USB button wherever WebUSB exists. On Windows, WebUSB can
only claim a device whose interface is bound to WinUSB; if Windows binds another
driver, `open()` fails with an access error, which the panel shows.

## View

- The ScreenView and everything in it live for the whole sim, so view nodes do
  not implement `dispose()`. The models do, and are in the leak suite.
- Sensor samples arrive outside the animation frame and set Properties directly;
  at 20 Hz per sensor this is cheap, and `step()` has nothing to do.
- Connect listeners are synchronous up to `requestDevice()` so the click still
  counts as a user gesture.
- The data table has a fixed number of rows (`MAX_POINTS`) that are shown or
  hidden, so the layout never moves and the delete buttons keep stable places in
  the traversal order.
- The graph's axes are recomputed from the points only, not from the live
  reading, so the axes do not jump while the arm moves; the live marker is
  clipped to the plot.

## Query parameters

| Parameter | Effect |
|---|---|
| `?demo` | Start with demo mode on (also a preference) |
| `?samplePeriod=50` | Sensor sample period in ms (5 to 1000) |
| `?showDiagnostics` | Packet counts and raw bytes under each panel; USB bring-up log in the console |
