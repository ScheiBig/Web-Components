import { html } from "./utils.js";


const template = document.createElement('template')
template.innerHTML = html`
<style>
    #body {
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
        --angle: 0rad;
        height: 100%;
        width: 100%;
        transform: rotate(var(--angle));
        will-change: transform;
    }

    #knob[data-sticky] {
        transition: transform 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    #marker {
        background: #888;
        width: 2px;
        height: 8px;
        margin: 0 auto;
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
<div id="body" part="body">
    <div id="knob" part="knob">
        <slot>
            <div id="marker"></div>
        </slot>
    </div>
    <div id="shine" part="shine">
    </div>
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
 * also three `part`s are specified:
 * - `body` which is not-rotating, bottom part, 
 * - `knob` which is rotating part (slot is placed in it),
 * - `shine` which is not-rotating layer above `knob` (can be used to simulate light/shadow).
 * 
 */
export default class ComponentKnob extends HTMLElement {

    /** @type {HTMLDivElement} */
    #body;

    /** @type {HTMLDivElement} */
    #knob;

    /** @type {number} */
    #angle;

    /** @type {number} */
    #laps;

    static get observedAttributes() {
        return [
            "value", "from", "to", "min", "max", "lap", "positions", "sticky", "infinite", "onRotate"
        ]
    }

    get value() {
        return this.hasAttribute("value") ? parseFloat(this.getAttribute("value")) : this.min
    }
    set value(value) {
        this.setAttribute("value", parseFloat(value))
    }

    get from() {
        return this.hasAttribute("from") ? parseFloat(this.getAttribute("from")) : 0
    }
    set from(value) {
        this.setAttribute("from", parseFloat(value))
    }

    get to() {
        return this.hasAttribute("to") ? parseFloat(this.getAttribute("to")) : null
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
        return this.hasAttribute("lap") ? parseFloat(this.getAttribute("lap")) : (this.max - this.min)
    }
    set lap(value) {
        this.setAttribute("lap", parseFloat(value))
    }

    get positions() {
        return this.hasAttribute("positions")
            ? this.getAttribute("positions").split(",").map(v => parseFloat(v))
            : null
    }
    set positions(value) {
        this.setAttribute("positions", value.join(","))
    }

    get sticky() {
        return this.hasAttribute("sticky") && (
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

    get onRotate() {
        return this.hasAttribute("onRotate") && this.getAttribute("onRotate")
    }
    set onRotate(value) {
        this.setAttribute("onRotate")
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" })
        this.shadowRoot.appendChild(template.content.cloneNode(true))

        this.#body = this.shadowRoot.getElementById("body")
        this.#knob = this.shadowRoot.getElementById("knob")
    }

    connectedCallback() {

    }

    disconnectedCallback() {

    }

    attributeChangeCallback(name, prev, value) {
        this.#angle = (Math.PI * 2 * this.value % this.lap) / this.lap;
    }

    #mouseDownHandler() { }
    #mouseMoveHandler() { }
    #mouseUpHandler() { }

    #rotateBegin() { }
    #rotateChange() { }
    #rotateEnd() { }

    #render() { }
}

customElements.define("x-knob", ComponentKnob)
