import { html } from "../util/utils.js";


const template = document.createElement('template')
template.innerHTML = html`
<style>
    :host {
        display: inline-block;
        background: #eee;
        border: 1px solid #888;
        border-radius: 50% 50%;
        height: 32px;
        width: 32px;
        min-height: 32px;
        min-width: 32px;
        position: relative;
    }

    #knob {
        --root: 0deg;
        --angle: 0deg;
        height: 100%;
        width: 100%;
        border-radius: 50%;
        transform: rotate(calc(var(--angle) + var( --root)));
        will-change: transform;
    }

    #knob.rotating {
        background: #0001;
    }

    :host([positions]:not([sticky])) #knob.rotating {
        transition: transform 0.25s cubic-bezier(0.45, 0.9, 0.9, 1.20);
    }

    :host([positions])  #knob.syncing {
        transition: transform 0.25s cubic-bezier(0.45, 0.9, 0.9, 1.20);
    }

    #marker {
        background: #888;
        width: 2px;
        border-radius: 2px;
        height: 25%;
        margin: 0 auto;
        transform: translateY(4px);
    }

    #shine {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        border-radius: 50% 50%;
        background: linear-gradient(135deg,
            rgba(255,255,255,0.5) 0%,
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.2) 100%
        );
    }
</style>
<div id="knob" part="knob">
    <slot>
        <div id="marker"></div>
    </slot>
</div>
<div id="shine" part="shine">
</div>
`


/**
 * This component represents a knob, that provides interaction via rotation.
 * 
 * Knob operates, by being rotated using mouse - when you press and hold left mouse button,  
 * the knob will rotate in a way, that knob marker points to cursor position. Current value can be
 * tracked directly via `value` property, or reactively via `rotate` event. Knob assumes, that you
 * rotate clockwise from `min` to `max` value.
 * 
 * Knob can operate in nine different ways, as configured using its properties - knob behavior can
 * be separated into two classes:
 * 
 * 1. What device is being simulated.\
 *    Knob can be placed either on encoder (infinite rotation mode) which can rotate infinitely,
 *    or on potentiometer (bound rotation mode) - either less-than or single turn, or multi-turn.
 *
 *    1.1. In "encoder mode", knob can rotate freely, without start and end positions. In this mode,
 *         `value` will be set between `min` and `max`, wrapping from one extreme to the other when
 *         passing `from` angle.
 * 
 *    1.2. In "multi turn potentiometer mode", knob can achieve only set amount 
 *         of movement - `value`s from `min` to `max`, and stopping rotation past those points. 
 *         Knob can achieve multiple turns, which correlates with `lap` property, that describes 
 *         "by how much `value` changes each full rotation of the knob".
 *
 *    1.3. In "single turn potentiometer mode", knob can only rotate between angles `from` and to`.
 *         In this mode, either full rotation can be achieved (`from === to`), or only part of it.
 * 
 * 2. What "type" of device is being simulated.\
 *    Knob can either be placed on analog device, that can rotate freely, discrete device which only
 *    can achieve certain angles, on digital one, which while rotating like analog one, can still 
 *    only achieve one of positions, that it will snap to.
 * 
 *    2.1. As "analog type", knob can rotate into any possible position, and so `value` can be any 
 *         real (float) number between `min` and `max`.
 * 
 *    2.2. As "discrete type", knob can only achieve values, that are passed to `positions` property
 *         (attribute is comma-separated list of possible positions, while field is array of those), 
 *         so rotation of knob happens only on boundaries between any two neighboring positions.
 * 
 *    2.3. As "digital type", knob can still rotate like analog device when being held onto (while
 *         mouse is pressed), but when you let go of it, it will snap back to the nearest position.
 *         In this type, underlying `value` behaves exactly like in discrete type, smooth rotation
 *         is only visual.
 * 
 * For every knob mode/type, you can specify these properties:
 * - `from` - starting angle in degrees, in range [0, 360); defaults to 0
 * - `min` - minimal number that `value` can achieve; defaults to 0
 * - `value` - current value that knob represents; defaults to `min`
 * - `max` - maximal number that `value` can achieve; defaults to 360
 * 
 * Keep in mind, that you must abide by contract: `min` <= `value` <= `max` - otherwise Error 
 * will be thrown.
 * 
 * Additional properties define exactly what behavior knob will provide, in this priority:
 * 
 * For modes:
 * - `infinite` - if attribute is present, or property set to true, knob will always behave in 
 *   "encoder mode" - properties `lap` and `to` will be ignored even if present; 
 *   defaults to `null` (not truthy).
 * - `to` - if `infinite` attribute is missing / set to false, and `to` is set, then knob will
 *   always behave in "single turn potentiometer mode" - property `lap` will be ignored;
 *   defaults to `null`.
 * - `lap` - if `infinite` is missing / false and `to` is missing (`null`/`undefined`), then 
 *   knob will always behave in "single turn potentiometer mode"; defaults to `mix - min`.
 * 
 * For types:
 * - `positions` - attribute, if set, must be set to comma-delimited list of unique values, while
 *   field will be represented as array of those values, in such case knob will operate either as 
 *   "discrete type" or "digital type", depending on `sticky` property; defaults to `null`.
 * - `sticky` - attribute, if present / field set to true, will specify "digital type", while
 *   otherwise, knob will be of "discrete type"; defaults to `null` (not truthy), and will 
 *   be ignored if `positions` is missing.
 * 
 * When `positions` attribute is missing, knob is of `analog type`.
 *
 * ---
 * 
 * As Component, `<x-knob>` provides one `slot`, that replaces knob marker (wiper) if filled;
 * also two `part`s are specified on top of `:host`:
 * - `:host` which is not-rotating, bottom part, 
 * - `part=knob` which is rotating part (slot is placed in it),
 * - `part=shine` which is not-rotating layer above `knob` (can be used to simulate light/shadow).
 * 
 */
export default class ComponentKnob extends HTMLElement {

    /** @type {HTMLDivElement} */ #body

    /** @type {HTMLDivElement} */ #knob

    /** @type {number} */ #value

    /** @type {number} */ #prevAngle

    /** @type {{x: number, y: number}} */ #cursor

    /** @type {boolean} */ #isRotating = false

    #windowContextMenuHandler

    static get observedAttributes() {
        return [
            "value", "from", "to", "min", "max", "lap", "positions", "sticky", "infinite", "onrotate"
        ]
    }

    get value() {
        return this.hasAttribute("value") ? parseFloat(this.getAttribute("value")) : this.min
    }
    set value(value) {
        this.setAttribute("value", parseFloat(value))
    }

    get from() {
        let value = parseFloat(this.getAttribute("from"))
        if (value === 360) { value = 0 }
        return this.hasAttribute("from") ? value : 0
    }
    set from(value) {
        this.setAttribute("from", parseFloat(value))
    }

    get to() {
        let value = parseFloat(this.getAttribute("to"))
        if (value === 0) { value = 360 }
        return (this.hasAttribute("to") && this.infinite === false)
            ? value : null
    }
    set to(value) {
        this.setAttribute("to", value != null ? parseFloat(value) : null)
    }

    get min() {
        return this.hasAttribute("min") ? parseFloat(this.getAttribute("min")) : 0
    }
    set min(value) {
        this.setAttribute("min", parseFloat(value))
    }

    get max() {
        return this.hasAttribute("max") ? parseFloat(this.getAttribute("max")) : 360
    }
    set max(value) {
        this.setAttribute("max", parseFloat(value))
    }

    get lap() {
        let value = this.max - this.min
        if (this.to != null && !this.infinite) {
            // We are in single-turn mode - lap is ignored so we map it to angle range
            /** @type {number} */ let angle
            switch (true) {
                case this.from === 0 && this.to === 360:
                case this.from === this.to:
                    // Already mapped to one full rotation
                    angle = 360
                    break
                case this.from < this.to:
                    // Less than half of rotation - simple mapping
                    angle = this.to - this.from
                    break
                case this.to < this.from:
                    // More than half of rotation - treat `to` like its on next one
                    angle = this.to + 360 - this.from
                    break
            }
            value /= angle / 360
        }

        return (this.hasAttribute("lap") && this.infinite === false && this.to == null)
            ? parseFloat(this.getAttribute("lap")) : value
    }
    set lap(value) {
        this.setAttribute("lap", parseFloat(value))
    }

    get positions() {
        return this.hasAttribute("positions")
            ? this.getAttribute("positions")
                .split(",")
                .map(v => parseFloat(v))
            : null
    }
    set positions(value) {
        this.setAttribute("positions", value.join(","))
    }

    get sticky() {
        return (this.hasAttribute("sticky") && this.positions != null)
            && (
                this.getAttribute("sticky") === "true"
                || this.getAttribute("sticky") === ""
            )
    }
    set sticky(value) {
        if (value) { this.setAttribute("sticky") }
        else { this.removeAttribute("sticky") }
    }

    get infinite() {
        return this.hasAttribute("infinite") && (
            this.getAttribute("infinite") === "true"
            || this.getAttribute("infinite") === ""
        )
    }
    set infinite(value) {
        if (value) { this.setAttribute("infinite") }
        else { this.removeAttribute("infinite") }
    }

    get onrotate() {
        return this.hasAttribute("onrotate") && this.getAttribute("onrotate")
    }
    set onrotate(value) {
        this.setAttribute("onrotate")
    }


    get #location() {
        const r = this.getBoundingClientRect()
        return ({
            x: r.left + (r.width / 2),
            y: r.top + (r.height / 2)
        })
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" })
        this.shadowRoot.appendChild(template.content.cloneNode(true))

        this.#body = this.shadowRoot.getElementById("body")
        this.#knob = this.shadowRoot.getElementById("knob")

        this.rotateBegin = this.rotateBegin.bind(this)
        this.rotateChange = this.rotateChange.bind(this)
        this.rotateEnd = this.rotateEnd.bind(this)
        this.mouseDownHandler = this.mouseDownHandler.bind(this)
        this.mouseMoveHandler = this.mouseMoveHandler.bind(this)
        this.mouseUpHandler = this.mouseUpHandler.bind(this)
        this.syncValueAngle = this.syncValueAngle.bind(this)

    }


    /**
     * Lifecycle hook for handling installation of component
     * 
     * Syncs initial value and installs events
     */
    connectedCallback() {
        this.#value = this.value
        this.#knob.style.setProperty("--root", this.from + "deg")
        this.syncValueAngle()

        this.addEventListener("mousedown", this.mouseDownHandler)
    }

    /**
     * Lifecycle hook for handling removal of component
     * 
     * Removes events
     */
    disconnectedCallback() {
        this.removeEventListener("mousedown", this.mouseDownHandler)
    }

    /**
     * Lifecycle hook for handling change of attribute
     * @param {string} name - Name used to represent attribute
     * @param {string | null} prev - Previous value of attribute
     * @param {string | null} value - New value that attribute changed to
     */
    attributeChangedCallback(name, prev, value) {

        if (name === "positions" && value != null) {
            let values = value.split(",").map(v => parseFloat(v))
            let uniqueValues = values.filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b)

            if (values.length !== uniqueValues.length) {
                throw new Error(`positions [${value}] do not contain unique values`)
            }

            if (values.length < 2) {
                throw new Error(`positions [${value}] cannot contain less than two values`)
            }

            let arrEq = values.map((v, i) => v === uniqueValues[ i ])
                .reduce((p, c) => p && c)

            if (!arrEq || values.findIndex(v => isNaN(v)) !== -1) {
                throw new Error(`positions [${value}] is not ordered list of numbers`)
            }

            if (this.min > values.at(0) || values.at(-1) > this.max) {
                throw new Error(`positions [${value}] contain values `
                    + `outside of bounds '${this.min}'..'${this.max}'`)
            }
        }

        if (name === "min" || name === "max") {
            if (this.min > this.max) {
                throw new Error(`value '${value}' is outside of `
                    + `bounds '${this.min}'..'${this.max}'`)
            }
        }

        if (name === "from" || name === "to") {
            if (0 > this.from || this.from > 360
                || 0 > this.to || this.to > 360) {
                throw new Error(`angles from ('${this.from}') and to ('${this.to}')`
                    + `must be in bounds '0' .. '360'`)
            }

            if (name === "from") {
                this.#knob.style.setProperty("--root", this.from + "deg")
            }
        }

        if (name === "value" && !this.#isRotating) {
            this.#value = this.value
            this.syncValueAngle()
        }
    }

    /**
     * Event handler for beginning Left-Click on knob
     * @param {MouseEvent} e 
     */
    mouseDownHandler(e) {
        e.preventDefault()
        if (e.button != 0) { return; }
        this.#cursor = {
            x: e.clientX,
            y: e.clientY
        }
        this.rotateBegin()
        document.addEventListener("mousemove", this.mouseMoveHandler)
        document.addEventListener("mouseup", this.mouseUpHandler)
    }
    /**
     * Event handler for moving cursor while holding knob
     * @param {MouseEvent} e 
     */
    mouseMoveHandler(e) {
        e.preventDefault()
        if (e.button != 0) { return; }
        this.#cursor = {
            x: e.clientX,
            y: e.clientY
        }
        this.rotateChange()
    }
    /**
     * Event handler for letting go of knob
     * @param {MouseEvent} e 
     */
    mouseUpHandler(e) {
        e.preventDefault()
        if (e.button != 0) { return; }
        document.removeEventListener("mousemove", this.mouseMoveHandler)
        document.removeEventListener("mouseup", this.mouseUpHandler)
        this.rotateEnd()
    }

    /**
     * Sets up rotation of knob
     */
    rotateBegin() {
        // Remove contextmenu handler to safe location - menu can interfere with rotation handling,
        //   so install handler that ignores such request
        this.#windowContextMenuHandler = window.oncontextmenu
        window.oncontextmenu = () => false

        // Set initial angle of line drawn between cursor and middle of knob, to "north"
        const loc = this.#location
        const cur = this.#cursor
        this.#prevAngle = mod(Math.atan2(
            loc.y - cur.y,
            loc.x - cur.x,
        ) + (3 / 4 * PI2), PI2) * 360 / PI2

        // Indicate rotation (sets up animations and disables handling value change in lifecycle
        //   hook - otherwise infinite recursion is inevitable)
        this.#isRotating = true
        this.#knob.classList.add("rotating")
    }

    /**
     * Handles rotation of knob
     */
    rotateChange() {
        // Get current angle - this and previous angle acquisition gets angle as clockwise with
        //   value 0 on "north"
        const loc = this.#location
        const cur = this.#cursor
        let angle = mod(Math.atan2(
            loc.y - cur.y,
            loc.x - cur.x,
        ) + (3 / 4 * PI2), PI2) * 360 / PI2

        let prevAngle = this.#prevAngle

        // Calculate change in angle with relation to previous tick
        //   From that calculate change in value
        /** @type {number} */ let deltaValue
        if (prevAngle > 270 && angle < 90) {
            // Wrap clock-wise - next angle treat as over 360
            let deltaAngle = angle + 360 - prevAngle
            deltaValue = deltaAngle / 360 * this.lap
        } else if (prevAngle < 90 && angle > 270) {
            // Wrap counter clock-wise - previous angle treat as over 360
            let deltaAngle = angle - prevAngle - 360
            deltaValue = deltaAngle / 360 * this.lap
        } else {
            // Normal turn - nothing
            let deltaAngle = angle - prevAngle
            deltaValue = deltaAngle / 360 * this.lap
        }
        this.#value += deltaValue

        // Potentiometers are not allowed to move internal value out of bounds
        if (!this.infinite) {
            this.#value = winsorize(this.min, this.#value, this.max)
            if (this.positions) {
                // Non analog - sync external value, will move to position later
                this.value = this.#value
            }
        }

        if (!this.positions) {
            // Analog device - sync internal value immediately
            this.value = this.#value
            if (this.infinite) {
                // Encoder - move value to within bounds
                this.value = mod(this.value - this.min, this.lap) + this.min
            }
        } else {
            // Non-analog device - move value to nearest position

            const pos = this.positions.slice()
            if (this.infinite) {
                // Encoder - move set value to within bounds
                this.value = mod(this.#value - this.min, this.lap) + this.min
                // Add dummy positions for outside of bounds - they represent additional positions
                //   on same angles as first and last position, but on next / previous rotation
                pos.unshift(this.lap - this.positions.at(-1))
                pos.push(this.lap + this.positions.at(0))
            }
            // Find nearest position and move external value to it
            const nearestPosition = pos
                .map(v => [ Math.abs(v - this.value), v ])
                .sort((a, b) => a[ 0 ] - b[ 0 ])[ 0 ][ 1 ]
            this.value = nearestPosition
        }

        // Issue synchronization of visual rotation with value and cache current angle for next tick
        this.syncValueAngle()
        this.#prevAngle = angle

        // Create and dispatch event
        // TODO -> don't dispatch, if discrete (and maybe digital) knob didn't change position
        const e = new ComponentKnob.KnobValueChangeEvent(this.value)
        if (this.onrotate !== null && this.onrotate !== false) {
            let f = eval(this.onrotate)
            if (typeof f === "function") { f(e) }
        }
        this.dispatchEvent(e)
    }

    /**
     * Finalizes rotation of knob
     */
    async rotateEnd() {
        // Restore contextmenu listener
        window.oncontextmenu = this.#windowContextMenuHandler
        // Signal that rotation isn't taking place anymore
        this.#isRotating = false
        this.#knob.classList.remove("rotating")

        // Non-analog devices might need angle and value correction
        if (this.positions) {

            // Sticky knobs have to move to position after letting go of knob
            if (this.sticky) {

                // Install async event listener, that waits for end of rotation transition
                const transitionFinished = new Promise(res => {
                    /** @type {function(TransitionEvent): void} */
                    const handler = e => {
                        if (e.target !== this.#knob || e.propertyName !== "transform") { return }
                        this.#knob.removeEventListener("transitionend", handler)
                        this.#knob.classList.remove("syncing")
                        res()
                    }
                    this.#knob.addEventListener("transitionend", handler)
                })
                // Add class that transitions angle rotation
                this.#knob.classList.add("syncing")

                // Calculate and set angle to nearest position
                let val = this.#value
                if (this.infinite) {
                    const offset = mod(this.#value - this.min, this.lap) + this.min
                    const overflow = this.#value - offset
                    val = overflow + this.value
                } else {
                    val = this.value
                }
                const rotAngle = (val - this.min) / this.lap * 360
                this.#knob.style.setProperty("--angle", rotAngle + "deg")

                // Wait for end of transition before proceeding
                await transitionFinished
            }

            // Encoders need to return into bound values
            if (this.infinite) {
                let angle = parseFloat(this.#knob.style.getPropertyValue("--angle").slice(0, -3))
                this.#knob.style.setProperty("--angle", mod(angle, 360) + "deg")
                // External value will be already proper one - sync internal
                this.#value = this.value
            }
        }
    }



    syncValueAngle() {
        if (!this.positions) {
            // Analog type
            const rotAngle = (this.value - this.min) / this.lap * 360
            this.#knob.style.setProperty("--angle", rotAngle + "deg")
        } else {
            // Non-analog type - base angle off #value, sync will perform after dropping knob
            console.log("-----", this.value, this.#value.toFixed(3))
            let val = this.#value
            if (!this.sticky) {
                if (this.infinite) {
                    // const overflow = this.#value - this.#value % this.lap
                    const offset = mod(this.#value - this.min, this.lap) + this.min
                    const overflow = this.#value - offset
                    val = overflow + this.value
                } else {
                    val = this.value
                }
            }

            const rotAngle = (val - this.min) / this.lap * 360
            this.#knob.style.setProperty("--angle", rotAngle + "deg")


            console.log(rotAngle.toFixed(2) + "deg", val.toFixed(2) + "int", this.value, this.#value.toFixed(3))
        }
    }

    static get KnobValueChangeEvent() {
        return class extends Event {

            /** @type{number} */ value

            /**
             * @param {number} value 
             */
            constructor(value) {
                super("knobValueChange", { bubbles: true })
                this.value = value
            }
        }
    }
}

customElements.define("x-knob", ComponentKnob)

const PI2 = Math.PI * 2

/**
 * 
 * @param {number} min 
 * @param {number} val 
 * @param {number} max 
 * @returns {number}
 */
function winsorize(min, val, max) {
    return Math.min(
        Math.max(
            min,
            val
        ),
        max
    )
}

/**
 * @param {number} n 
 * @param {number} d 
 * @returns {number}
 */
function mod(n, d) {
    return ((n % d) + d) % d
}
