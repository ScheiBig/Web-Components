# Knob

[`<demo />`]()

This component represents a knob, that provides interaction via rotation.

Knob operates, by being rotated using mouse - when you press and hold left mouse button,  
the knob will rotate in a way, that knob marker points to cursor position. Current value can be
tracked directly via `value` property, or reactively via `rotate` event. Knob assumes, that you
rotate clockwise from `min` to `max` value.

### Knob can operate in nine different ways, as configured using its properties - knob behavior can be separated into two classes:

1. **What device is being simulated.**\
   Knob can be placed either on encoder (infinite rotation mode) which can rotate infinitely,
   or on potentiometer (bound rotation mode) - either less-than or single turn, or multi-turn.

   1.1. In **"encoder mode"**, knob can rotate freely, without start and end positions. In this mode,
        `value` will be set between `min` and `max`, wrapping from one extreme to the other when
        passing `from` angle.

   1.2. In **"multi turn potentiometer mode"**, knob can achieve only set amount 
        of movement - `value`s from `min` to `max`, and stopping rotation past those points. 
        Knob can achieve multiple turns, which correlates with `lap` property, that describes 
        "by how much `value` changes each full rotation of the knob".

   1.3. In **"single turn potentiometer mode"**, knob can only rotate between angles `from` and `to`.
        In this mode, either full rotation can be achieved (`from === to`), or only part of it.

2. **What "type" of device is being simulated.**\
   Knob can either be placed on analog device, that can rotate freely, discrete device which only
   can achieve certain angles, on digital one, which while rotating like analog one, can still 
   only achieve one of positions, that it will snap to.

   2.1. As **"analog type"**, knob can rotate into any possible position, and so `value` can be any 
        real (float) number between `min` and `max`.

   2.2. As **"discrete type"**, knob can only achieve values, that are passed to `positions` property
        (attribute is comma-separated list of possible positions, while field is array of those), 
        so rotation of knob happens only on boundaries between any two neighboring positions.

   2.3. As **"digital type"**, knob can still rotate like analog device when being held onto (while
        mouse is pressed), but when you let go of it, it will snap back to the nearest position.
        In this type, underlying `value` behaves exactly like in discrete type, smooth rotation
        is only visual.

### For every knob mode/type, you can specify these properties:
- `from` - starting angle in degrees, in range [0, 360); defaults to 0
- `min` - minimal number that `value` can achieve; defaults to 0
- `value` - current value that knob represents; defaults to `min`
- `max` - maximal number that `value` can achieve; defaults to 360

Keep in mind, that you must abide by contract: `min` <= `value` <= `max` - otherwise Error 
will be thrown.

#### Additional properties define exactly what behavior knob will provide, in this priority:

##### For modes:
- `infinite` - if attribute is present, or property set to true, knob will always behave in 
  "encoder mode" - properties `lap` and `to` will be ignored even if present; 
  defaults to `null` (not truthy).
- `to` - if `infinite` attribute is missing / set to false, and `to` is set, then knob will
  always behave in "single turn potentiometer mode" - property `lap` will be ignored;
  defaults to `null`.
- `lap` - if `infinite` is missing / false and `to` is missing (`null`/`undefined`), then 
  knob will always behave in "single turn potentiometer mode"; defaults to `mix - min`.

##### For types:
- `positions` - attribute, if set, must be set to comma-delimited list of unique values, while
  field will be represented as array of those values, in such case knob will operate either as 
  "discrete type" or "digital type", depending on `sticky` property; defaults to `null`.
- `sticky` - attribute, if present / field set to true, will specify "digital type", while
  otherwise, knob will be of "discrete type"; defaults to `null` (not truthy), and will 
  be ignored if `positions` is missing.

When `positions` attribute is missing, knob is of `analog type`.

---

As Component, `<x-knob>` provides one `slot`, that replaces knob marker (wiper) if filled;
also two `part`s are specified on top of `:host`:
- `:host` which is not-rotating, bottom part, 
- `part=knob` which is rotating part (slot is placed in it),
- `part=shine` which is not-rotating layer above `knob` (can be used to simulate light/shadow).

