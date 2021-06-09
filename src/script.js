import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import Stats from 'stats.js'
import { GUI } from 'dat.gui'
import { map, setCol } from './Helpers'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Clouds } from './Clouds'
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
  MeshBVH,
  MeshBVHVisualizer
} from 'three-mesh-bvh'
import { Trees } from './Trees'
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree

THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

// const info = document.getElementById('info')

const STATE = {
  chill: 'CHILL',
  walk: 'WALK',
  run: 'RUN'
}

export const p = {
  water: 0.0,
  sand: 0.01,
  grass: 0.3,
  rock: 0.5,
  snow: 0.7
}

const capsuleInfo = {
  radius: 0.5,
  segment: new THREE.Line3(
    new THREE.Vector3(),
    new THREE.Vector3(0, -1.0, 0.0)
  )
}

const params = {
  firstPerson: false,

  displayCollider: false,
  displayBVH: false,
  visualizeDepth: 10,
  gravity: -15,
  playerSpeed: 25,
  physicsSteps: 5,

  reset: reset,

  turbidity: 10,
  rayleigh: 4,
  mieCoefficient: 0.1,
  mieDirectionalG: 0.8,
  elevation: 12,
  azimuth: 90,

  enableWater: true,
  enableSky: true,
  enableLights: true,
  enableClouds: true,
  enableWireframe: false,
  // enableTexture: true,
  cameraX: 0,
  cameraY: 100,
  cameraZ: 0
}

var renderer
let camera, scene, gui, controls, stats, clock, pmremGenerator
let water, sun, sky, clouds, dirLight, trees
let environment, collider, visualizer, player

const places = []

let mixer
let animations = []
let state = STATE.chill
let playerIsOnGround = false
let fwdPressed = false
let bkdPressed = false
let lftPressed = false
let rgtPressed = false
const playerVelocity = new THREE.Vector3()
const playerDirection = new THREE.Vector3(0, 1, 0)
const upVector = new THREE.Vector3(0, 1, 0)
const tempVector = new THREE.Vector3()
const tempVector2 = new THREE.Vector3()
const tempBox = new THREE.Box3()
const tempMat = new THREE.Matrix4()
const tempSegment = new THREE.Line3()

// start here
init()
render()

/**
 * Setup all rendering objects here. Order is important
 */
function init () {
  setupRenderer()
  setupCamera()
  setupMisc()
  setupGUI()
  setupCallbacks()
  createWater()
  createSky()
  createLights()
  createTerrain()
  createPlayer()
}

/**
 * Called when skyparams are changed. Updated atmosphere + sun.
 */
function skyChanged () {
  const uniforms = sky.material.uniforms
  uniforms.turbidity.value = params.turbidity
  uniforms.rayleigh.value = params.rayleigh
  uniforms.mieCoefficient.value = params.mieCoefficient
  uniforms.mieDirectionalG.value = params.mieDirectionalG

  const phi = THREE.MathUtils.degToRad(90 - params.elevation)
  const theta = THREE.MathUtils.degToRad(params.azimuth)

  sun.setFromSphericalCoords(1, phi, theta)
  uniforms.sunPosition.value.copy(sun)
  if (water) {
    water.material.uniforms.sunDirection.value.copy(sun).normalize()
  }
  scene.environment = pmremGenerator.fromScene(sky).texture
}

/**
 * Craete sky and clouds + sun vector.
 * Also adds GUI controls to change sky, camera parameters
 */
function createSky () {
  sky = new Sky()
  sky.scale.setScalar(10000)
  scene.add(sky)
  clouds = new Clouds(30, scene)
  sun = new THREE.Vector3()

  const skyFolder = gui.addFolder('Environment')

  skyFolder
    .add(params, 'enableWater')
    .onChange((v) => (water.visible = !water.visible))

  skyFolder
    .add(params, 'enableSky')
    .onChange((v) => (sky.visible = !sky.visible))
  skyFolder
    .add(params, 'enableLights')
    .onChange((v) => (dirLight.visible = !dirLight.visible))

  skyFolder
    .add(params, 'enableClouds')
    .onChange((v) => (clouds.mesh.visible = !clouds.mesh.visible))

  skyFolder
    .add(params, 'enableWireframe')
    .onChange(
      (v) =>
        (environment.children[0].material.wireframe =
        !environment.children[0].material.wireframe)
    )

  skyFolder.add(params, 'turbidity', 0.0, 20.0, 0.1).onChange(skyChanged)
  skyFolder.add(params, 'rayleigh', 0.0, 4, 0.001).onChange(skyChanged)
  skyFolder.add(params, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(skyChanged)
  skyFolder.add(params, 'mieDirectionalG', 0.0, 1, 0.001).onChange(skyChanged)
  skyFolder.add(params, 'elevation', 0, 90, 0.1).onChange(skyChanged)
  skyFolder.add(params, 'azimuth', -180, 180, 0.1).onChange(skyChanged)

  const cameraFolder = gui.addFolder('Camera')
  cameraFolder.add(params, 'cameraX', 0.0, 5000, 1).onChange(cameraChanged)
  cameraFolder.add(params, 'cameraY', 0.0, 5000, 1).onChange(cameraChanged)
  cameraFolder.add(params, 'cameraZ', 0.0, 5000, 1).onChange(cameraChanged)

  skyChanged()
}

/**
 * Callback to handle camera position change from the GUI.
 */
function cameraChanged () {
  camera.position.x = params.cameraX
  camera.position.y = params.cameraY
  camera.position.z = params.cameraZ
}

/**
 * Creates renderer + scene object
 */
function setupRenderer () {
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  document.body.appendChild(renderer.domElement)

  // scene setup
  scene = new THREE.Scene()
  pmremGenerator = new THREE.PMREMGenerator(renderer)
}

/**
 * Adds light to scene. Used to cast shadows on clouds.
 */
function createLights () {
  const d = 10000

  dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
  dirLight.color.setHSL(0.1, 1, 0.95)
  dirLight.position.set(0, 25, 0)
  dirLight.position.multiplyScalar(30)
  dirLight.castShadow = true

  dirLight.shadow.mapSize.width = d
  dirLight.shadow.mapSize.height = d

  dirLight.shadow.camera.left = -d
  dirLight.shadow.camera.right = d
  dirLight.shadow.camera.top = d
  dirLight.shadow.camera.bottom = -d
  dirLight.shadow.camera.far = d

  scene.add(dirLight)
}

/**
 * Creates camera object, with starting parameters.
 * Also adds ambient sounds to the camera object here.
 */
function setupCamera () {
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  )
  camera.position.set(-31, -1468, -873)
  camera.far = 10000
  camera.updateProjectionMatrix()
  window.camera = camera

  // create an AudioListener and add it to the camera
  const listener = new THREE.AudioListener()
  // Need this line in the case of page refresh.
  listener.context.resume()
  camera.add(listener)

  // create a global audio source
  const sound = new THREE.Audio(listener)

  // load a sound and set it as the Audio object's buffer
  const audioLoader = new THREE.AudioLoader()
  audioLoader.load('assets/images/ambient2.mp3', function (buffer) {
    sound.setBuffer(buffer)
    sound.setLoop(true)
    sound.setVolume(0.5)
    sound.play()
  })
}

/**
 * Create water plane with its shader.
 */
function createWater () {
  const waterGeometry = new THREE.PlaneBufferGeometry(5000, 5000)

  // uses water normals for '3D' waves + sun direction for 'shadows'
  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      'assets/images/waternormals.jpg',
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      }
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 8,
    fog: scene.fog !== undefined
  })

  water.rotation.x = -Math.PI / 2
  water.position.y = -27
  water.receiveShadow = true
  water.material.uniforms.size.value = 10

  scene.add(water)
}

/**
 * Little things, clock, controls, stats.
 */
function setupMisc () {
  clock = new THREE.Clock()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.maxPolarAngle = Math.PI * 0.495
  controls.minDistance = 40.0
  controls.enableDamping = true

  stats = new Stats()
  document.body.appendChild(stats.dom)
}

/**
 * Player object with collision detection.
 */
function createPlayer () {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('three/examples/js/libs/draco/gltf/')

  // load fox model from assets and add to scene.
  const loader = new GLTFLoader()
  loader.setDRACOLoader(dracoLoader)
  loader.load(
    'assets/images/Fox.glb',
    function (gltf) {
      const model = gltf.scene.children[0]
      model.scale.set(0.05, 0.05, 0.05)
      player = model
      player.castShadow = true
      player.receiveShadow = true

      scene.add(player)
      console.log('player', player)

      reset()

      // start animations here.
      animations = gltf.animations
      mixer = new THREE.AnimationMixer(model)
      mixer.clipAction(animations[0]).play()
    },
    undefined,
    (e) => console.error(e)
  )
}

/**
 * Setup GUI controls, adding some misc controls.
 */
function setupGUI () {
  gui = new GUI()

  const visFolder = gui.addFolder('Collision Detection')
  visFolder.add(params, 'displayCollider')
  visFolder.add(params, 'displayBVH')
  visFolder.add(params, 'visualizeDepth', 1, 20, 1).onChange((v) => {
    visualizer.depth = v
    visualizer.update()
  })

  const physicsFolder = gui.addFolder('Player')
  physicsFolder.add(params, 'gravity', -100, 100, 0.01).onChange((v) => { params.gravity = parseFloat(v) })
  physicsFolder.add(params, 'playerSpeed', 1, 20)
  physicsFolder.add(params, 'reset')
}

/**
 * Create callbacks for screen resize, key controls.
 */
function setupCallbacks () {
  window.addEventListener(
    'resize',
    () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    },
    false
  )

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyC':
        params.firstPerson = !params.firstPerson
        player.visible = !player.visible
        if (!params.firstPerson) {
          camera.position
            .sub(controls.target)
            .normalize()
            .multiplyScalar(10)
            .add(controls.target)
        }
        break
      case 'KeyW':
      case 'ArrowUp':
        fwdPressed = true
        doWalk()
        break
      case 'KeyS':
      case 'ArrowDown':
        bkdPressed = true
        doWalk()
        break
      case 'KeyD':
      case 'ArrowRight':
        rgtPressed = true
        break
      case 'KeyA':
      case 'ArrowLeft':
        lftPressed = true
        break
      case 'Space':
        if (playerIsOnGround) {
          playerVelocity.y = 50.0
        }
        break
    }
  })

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        fwdPressed = false
        doChill()
        break
      case 'KeyS':
      case 'ArrowDown':
        bkdPressed = false
        doChill()
        break
      case 'KeyD':
      case 'ArrowRight':
        rgtPressed = false
        break
      case 'KeyA':
      case 'ArrowLeft':
        lftPressed = false
        break
    }
  })
}

/**
 * Terrain rendering starts here.
 */
function createTerrain () {
  new GLTFLoader().load('assets/images/high.glb', (res) => loadThing(res))
}

/**
 * Create terrain from the model, do face coloring here.
 * @param {*} res The gltf object data.
 */
function loadThing (res) {
  const gltfScene = res.scene
  gltfScene.scale.setScalar(1000)

  const box = new THREE.Box3()
  box.setFromObject(gltfScene)
  box.getCenter(gltfScene.position).negate()
  gltfScene.updateMatrixWorld(true)

  // visual geometry setup. Access each triangle face here.
  const toMerge = {}
  gltfScene.traverse((o) => colorTerrain(o, toMerge))

  environment = new THREE.Group()
  for (const hex in toMerge) {
    const arr = toMerge[hex]
    const visualGeometries = []
    arr.forEach((mesh) => {
      const geom = mesh.geometry.clone()
      geom.applyMatrix4(mesh.matrixWorld)
      visualGeometries.push(geom)
    })

    if (visualGeometries.length) {
      const newGeom =
        BufferGeometryUtils.mergeBufferGeometries(visualGeometries)
      const newMesh = new THREE.Mesh(
        newGeom,
        new THREE.MeshStandardMaterial({
          // wireframe: true,
          vertexColors: THREE.VertexColors,
          // required for flat shading
          flatShading: true
        })
      )
      newMesh.castShadow = true
      newMesh.receiveShadow = true
      // newMesh.material.shadowSide = 2;
      environment.add(newMesh)
    }
  }

  // collect all geometries to merge
  const geometries = []
  environment.updateMatrixWorld(true)
  environment.traverse((c) => {
    if (c.geometry) {
      const cloned = c.geometry.clone()
      cloned.applyMatrix4(c.matrixWorld)
      for (const key in cloned.attributes) {
        if (key !== 'position') {
          cloned.deleteAttribute(key)
        }
      }
      geometries.push(cloned)
    }
  })

  // create the merged geometry
  const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(
    geometries,
    false
  )
  mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, {
    lazyGeneration: false
  })

  collider = new THREE.Mesh(mergedGeometry)
  collider.material.wireframe = true
  collider.material.opacity = 0.5
  collider.material.transparent = true

  visualizer = new MeshBVHVisualizer(collider, params.visualizeDepth)
  scene.add(visualizer)
  scene.add(collider)
  scene.add(environment)

  trees = new Trees(places, scene, gui)
  console.log('Number of trees: ', trees.num)
}

function colorTerrain (o, toMerge) {
  if (o.isMesh) {
    // convert to non indexed, so vertices are not shared.
    // important to make flat shading possible.
    o.geometry = o.geometry.toNonIndexed()

    const geo = o.geometry
    const faces = geo.attributes.position.count

    // create buffer to store colors.
    // 3 colors (value between 0-1) for each face
    // so 3 x numFaces color values are needed.
    const colorBuffer = new THREE.BufferAttribute(new Float32Array(faces * 3), 3)
    geo.setAttribute('color', colorBuffer)
    const cols = geo.attributes.color
    const positions = geo.attributes.position

    let val = Math.random()

    // deal with 3 colors each iteration.
    for (let i = 0; i < cols.count; i += 3) {
      // get height of each vertex of this face (i, i+1, i+2).
      const a = positions.getY(i)
      const b = positions.getY(i + 1)
      const c = positions.getY(i + 2)

      // assign colors based on the highest point of the face
      let max = Math.max(a, Math.max(b, c))
      // map value between 0-1.
      max = map(max, 0, 0.0493, 0, 1)
      val = Math.random()

      // set colors here.
      if (max <= p.water) setCol(cols, i, 0.0, 0.3, 1.0) // blue
      else if (max <= p.sand) setCol(cols, i, 1.0, 0.8, 0.3) // yellow
      else if (max <= p.grass) {
        if (places.length < 70 && val > 0.995) {
          // get world position of this point on the terrain.
          // add to list to place tress later.
          places.push(new THREE.Vector3(
            positions.getX(i),
            positions.getY(i),
            positions.getZ(i)
          ))
        }
        setCol(cols, i, 0.44, 0.7, 0.18) // green
      } else if (max <= p.rock) setCol(cols, i, 0.3, 0.3, 0.3) // gray
      else setCol(cols, i, 0.92, 0.98, 0.98) // white
    }

    o.geometry.computeFaceNormals()
    o.geometry.computeVertexNormals()

    const hex = o.material.color.getHex()
    toMerge[hex] = toMerge[hex] || []
    toMerge[hex].push(o)
  }
}

/**
 * Set player position back to default.
 * Update camera + controls accordingly.
 */
function reset () {
  playerVelocity.set(0, 0, 0)
  player.position.set(15.75, -3, 30)
  camera.position.sub(controls.target)
  controls.target.copy(player.position)
  camera.position.add(player.position)
  controls.update()
}

/**
 * Calculate player positions each frame.
 * @param {*} delta time between last frame and this one.
 */
function updatePlayer (delta) {
  if (!player) return
  window.playerVelocity = playerVelocity

  // gravity calculations.
  playerVelocity.y += delta * params.gravity
  player.position.addScaledVector(playerVelocity, delta)

  // move the player
  const angle = controls.getAzimuthalAngle()
  player.quaternion.setFromAxisAngle(playerDirection, angle + Math.PI)

  if (fwdPressed) {
    tempVector.set(0, 0, -1).applyAxisAngle(upVector, angle)
    player.position.addScaledVector(tempVector, params.playerSpeed * delta)
  }

  if (bkdPressed) {
    tempVector.set(0, 0, 1).applyAxisAngle(upVector, angle)
    player.position.addScaledVector(tempVector, params.playerSpeed * delta)
  }

  if (lftPressed) {
    tempVector.set(-1, 0, 0).applyAxisAngle(upVector, angle)
    player.position.addScaledVector(tempVector, params.playerSpeed * delta)
  }

  if (rgtPressed) {
    tempVector.set(1, 0, 0).applyAxisAngle(upVector, angle)
    player.position.addScaledVector(tempVector, params.playerSpeed * delta)
  }

  player.updateMatrixWorld()

  // adjust player position based on collisions
  tempBox.makeEmpty()
  tempMat.copy(collider.matrixWorld).invert()
  tempSegment.copy(capsuleInfo.segment)

  tempSegment.start.applyMatrix4(player.matrixWorld).applyMatrix4(tempMat)
  tempSegment.end.applyMatrix4(player.matrixWorld).applyMatrix4(tempMat)

  tempBox.expandByPoint(tempSegment.start)
  tempBox.expandByPoint(tempSegment.end)

  tempBox.min.addScalar(-capsuleInfo.radius)
  tempBox.max.addScalar(capsuleInfo.radius)
  collider.geometry.boundsTree.shapecast(
    collider,
    (box) => box.intersectsBox(tempBox),
    (tri) => {
      const triPoint = tempVector
      const capsulePoint = tempVector2

      const distance = tri.closestPointToSegment(
        tempSegment,
        triPoint,
        capsulePoint
      )
      if (distance < capsuleInfo.radius) {
        const depth = capsuleInfo.radius - distance
        const direction = capsulePoint.sub(triPoint).normalize()
        // info.innerHTML = `x: ${triPoint.x.toFixed(2)} y: ${triPoint.y.toFixed(2)} z: ${triPoint.z.toFixed(2)}`
        tempSegment.start.addScaledVector(direction, depth)
        tempSegment.end.addScaledVector(direction, depth)
      }
    }
  )

  const newPos = tempVector
  newPos.copy(tempSegment.start).applyMatrix4(collider.matrixWorld)

  const deltaVector = tempVector2
  deltaVector.subVectors(newPos, player.position)
  player.position.copy(newPos)

  playerIsOnGround = deltaVector.y > Math.abs(delta * playerVelocity.y * 0.25)

  if (!playerIsOnGround) {
    deltaVector.normalize()
    playerVelocity.addScaledVector(
      deltaVector,
      -deltaVector.dot(playerVelocity)
    )
  } else {
    playerVelocity.set(0, 0, 0)
  }

  // adjust the camera
  camera.position.sub(controls.target)
  controls.target.copy(player.position)
  camera.position.add(player.position)

  // if you fall off the edge of the earth.
  if (player.position.y < -100) {
    reset()
  }
}

/**
 * walking animation stuff.
 */
function doWalk () {
  if (state === STATE.walk) return
  mixer.stopAllAction()
  mixer.clipAction(animations[1]).play()
  state = STATE.walk
}

/**
 * chilling animation stuff.
 */
function doChill () {
  if (state === STATE.chill) return
  mixer.stopAllAction()
  mixer.clipAction(animations[0]).play()
  state = STATE.chill
}

/**
 * Render function called each frame.
 * Deals with updating stats and states.
 */
function render () {
  stats.update()
  // eslint-disable-next-line no-undef
  requestAnimationFrame(render)

  const delta = Math.min(clock.getDelta(), 0.1)

  // update animation.
  if (mixer) {
    mixer.update(delta)
  }

  // update camera when perspective is changed.
  if (params.firstPerson) {
    controls.maxPolarAngle = Math.PI
    controls.minDistance = 1e-4
    controls.maxDistance = 1e-4
  } else {
    controls.maxPolarAngle = Math.PI / 2
    controls.minDistance = 1
    controls.maxDistance = 2000
  }

  // update collision visualisation and player pos.
  if (collider) {
    collider.visible = params.displayCollider
    visualizer.visible = params.displayBVH

    const physicsSteps = params.physicsSteps
    // update player possibly multiple times each frame.
    for (let i = 0; i < physicsSteps; i++) {
      updatePlayer(delta / physicsSteps)
    }
  }

  controls.update()

  // update water shader uniforms.
  if (water) {
    water.material.uniforms.time.value += 1.0 / 60.0
  }

  // update clouds position.
  if (clouds.mesh) {
    clouds.mesh.position.x += Math.sin(delta * 10)
  }

  // push scene + camera info to the renderer and draw on screen.
  renderer.render(scene, camera)
}
