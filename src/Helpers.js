/**
 * Maps a value to a new value in a range
 * @param {*} val value to map
 * @param {*} smin value lower bound
 * @param {*} smax value upper bound
 * @param {*} emin target lower bound
 * @param {*} emax target upper bound
 * @returns mapped value
 */
function map (val, smin, smax, emin, emax) {
  const t = (val - smin) / (smax - smin)
  return (emax - emin) * t + emin
}

/**
 * Cut off a geometry at a plane
 * @param {*} geo Buffer geometry to modify
 * @param {*} bottom cut off point
 */
const chopBottom = (geo, bottom) =>
  geo.vertices.forEach((v) => (v.y = Math.max(v.y, bottom)))

/**
 * Add some random noise to a geometry
 * @param {*} geo Buffer geometry to modify
 * @param {*} per jitter power
 */
const jitter = (geo, per) =>
  geo.vertices.forEach((v) => {
    v.x += map(Math.random(), 0, 1, -per, per)
    v.y += map(Math.random(), 0, 1, -per, per)
    v.z += map(Math.random(), 0, 1, -per, per)
  })

/**
   * Set color to the face at specified index.
   * @param {*} colors buffer attribute for color
   * @param {*} index starting index to set colors
   * @param {*} c1 red
   * @param {*} c2 green
   * @param {*} c3 blue
  */
function setCol (colors, index, c1, c2, c3) {
  colors.setXYZ(index + 0, c1, c2, c3)
  colors.setXYZ(index + 1, c1, c2, c3)
  colors.setXYZ(index + 2, c1, c2, c3)
}

export { map, setCol, chopBottom, jitter }
