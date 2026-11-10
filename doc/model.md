# Model - Biomechanics Arm

This document describes what the simulation measures and how, in terms
appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

The simulation is the measuring instrument for a static-equilibrium lab. A rod
(the "forearm") pivots on a rotary motion sensor (the "elbow"). A brass cylinder
sits near the rod's far end, and a horizontal string from the rod's centre hole
to a force sensor (the "biceps") holds the rod at an angle. Students hold the arm
at about ten angles, record the string tension and the angle at each, and then
compare the torque of the string with the torque of the weights in a spreadsheet.

The simulation reports two quantities and nothing derived from them:

| Quantity | Sensor | Unit shown |
|---|---|---|
| String tension | Wireless Force Acceleration Sensor (PS-3202) | newtons, to 0.01 N |
| Arm angle | Wireless Rotary Motion Sensor (PS-3220) | degrees, to 0.1° |

It does not compute torque, percent error, the force at the pivot, or the angle
α above the horizontal that the handout asks students to work out from the
sensor angle.

## Readings

Each sensor sends 20 readings a second. The number on screen, and the value
stored when a point is recorded, is the average of the last ten readings (half a
second), so the arm must be held still for about half a second before recording.

- **Force** comes from the sensor's factory calibration.
- **Angle** is counted by the sensor's encoder, 2000 counts per turn (0.18° per
  count), starting from zero at the moment the sensor connects.

## Zero and Reverse direction

- **Zero** makes the present reading the new zero for that sensor. The handout's
  procedure is to unhook the string, let the rod hang straight down and still,
  and zero both sensors: the force then reads only the string tension, and the
  angle is measured from the hanging position.
- **Reverse direction** flips the sign of a reading without moving its zero. Use
  it if lifting the rod makes the angle go negative, or if pulling the string
  reads as a negative force. Which way is positive depends on which way round
  each sensor is mounted.

With the angle zeroed at hanging, horizontal is 90° and straight up is 180°, so
the arm's angle above the horizontal is the sensor angle minus 90°. The arm
diagram draws the zero direction as straight down.

## Recording, graph and export

*Record point* adds the present angle and tension to the table (up to 15 points).
The graph plots tension against angle; *Swap axes* plots angle against tension.
Both axes always include zero. A ring on the graph marks the live reading.
*Download CSV* saves the table, with one more decimal place than is displayed,
for analysis in a spreadsheet.

## Demo mode

Demo mode replaces the sensors with a simulated arm, moved by a slider, so the
sim can be shown or explored with no equipment. The simulated arm uses the
dimensions in the lab's sample data (rod 29.2 g, cylinder 75.3 g, string 0.165 m
and cylinder 0.300 m from the pivot, g = 9.8 m/s²) and ideal torque balance about
the pivot:

    T · L_T · sin α = (m_C · L_C + m_rod · L_T) · g · cos α

Below the horizontal the string is slack and the tension is zero. The simulated
force sensor reads 0.12 N with no load until it is zeroed, as a real one does,
and has a little noise. Real measurements differ from this ideal curve by friction
in the pivot, a string that is not quite horizontal, and the mass of the
thumbscrew, which is the point of the lab.

## Simplifications and limits

- The force sensor measures along its own axis; if the string is not in line
  with the sensor, the reading is low.
- The angle is relative, not absolute: the sensor does not know which way is
  down. Everything depends on zeroing with the rod hanging still.
- Averaging hides fast changes; this is a static lab.
