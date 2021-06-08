import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import Stats from "stats.js";
import { GUI } from "dat.gui";
import { map, setCol } from "./Helpers";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Clouds } from "./Clouds";
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
  MeshBVH,
  MeshBVHVisualizer,
} from "three-mesh-bvh";
import { Trees } from "./Trees";
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;

THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const SimplexNoise = require("simplex-noise");
const simplex = new SimplexNoise("myseed");
const info = document.getElementById("info");

const STATE = {
  chill: "CHILL",
  walk: "WALK",
  run: "RUN",
};

export const p = {
  water: 0.0,
  sand: 0.01,
  grass: 0.3,
  rock: 0.5,
  snow: 0.7,
};

const capsuleInfo = {
  radius: 0.5,
  segment: new THREE.Line3(
    new THREE.Vector3(),
    new THREE.Vector3(0, -1.0, 0.0)
  ),
};

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
  cameraZ: 0,
};
let camera, scene, renderer, gui, controls, stats, clock, pmremGenerator;
let water, sun, sky, clouds, dirLight;
let environment, collider, visualizer, player;

let places = [];

let mixer;
let animations = [];
let state = STATE.chill;
let playerIsOnGround = false;
let fwdPressed = false,
  bkdPressed = false,
  lftPressed = false,
  rgtPressed = false;
let playerVelocity = new THREE.Vector3();
let playerDirection = new THREE.Vector3(0, 1, 0);
let upVector = new THREE.Vector3(0, 1, 0);
let tempVector = new THREE.Vector3();
let tempVector2 = new THREE.Vector3();
let tempBox = new THREE.Box3();
let tempMat = new THREE.Matrix4();
let tempSegment = new THREE.Line3();

init();
render();

function init() {
  // renderer setup
  setupRenderer();
  setupCamera();

  setupMisc();

  setupGUI();

  setupCallbacks();

  createGround();

  initSky();

  setupLights();

  setupTerrain();

  setupPlayer();
}

function guiChanged() {
  const uniforms = sky.material.uniforms;
  uniforms["turbidity"].value = params.turbidity;
  uniforms["rayleigh"].value = params.rayleigh;
  uniforms["mieCoefficient"].value = params.mieCoefficient;
  uniforms["mieDirectionalG"].value = params.mieDirectionalG;

  const phi = THREE.MathUtils.degToRad(90 - params.elevation);
  const theta = THREE.MathUtils.degToRad(params.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);
  uniforms["sunPosition"].value.copy(sun);
  if (water) {
    water.material.uniforms["sunDirection"].value.copy(sun).normalize();
  }

  scene.environment = pmremGenerator.fromScene(sky).texture;
}

function initSky() {
  sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);
  clouds = new Clouds(30, scene);
  sun = new THREE.Vector3();

  const skyFolder = gui.addFolder("Environment");

  skyFolder
    .add(params, "enableWater")
    .onChange((v) => (water.visible = !water.visible));

  skyFolder
    .add(params, "enableSky")
    .onChange((v) => (sky.visible = !sky.visible));
  skyFolder
    .add(params, "enableLights")
    .onChange((v) => (dirLight.visible = !dirLight.visible));

  skyFolder
    .add(params, "enableClouds")
    .onChange((v) => (clouds.mesh.visible = !clouds.mesh.visible));

  skyFolder
    .add(params, "enableWireframe")
    .onChange(
      (v) =>
        (environment.children[0].material.wireframe =
          !environment.children[0].material.wireframe)
    );

  skyFolder.add(params, "turbidity", 0.0, 20.0, 0.1).onChange(guiChanged);
  skyFolder.add(params, "rayleigh", 0.0, 4, 0.001).onChange(guiChanged);
  skyFolder.add(params, "mieCoefficient", 0.0, 0.1, 0.001).onChange(guiChanged);
  skyFolder.add(params, "mieDirectionalG", 0.0, 1, 0.001).onChange(guiChanged);
  skyFolder.add(params, "elevation", 0, 90, 0.1).onChange(guiChanged);
  skyFolder.add(params, "azimuth", -180, 180, 0.1).onChange(guiChanged);

  const cameraFolder = gui.addFolder("Camera");
  cameraFolder.add(params, "cameraX", 0.0, 5000, 1).onChange(cameraChanged);
  cameraFolder.add(params, "cameraY", 0.0, 5000, 1).onChange(cameraChanged);
  cameraFolder.add(params, "cameraZ", 0.0, 5000, 1).onChange(cameraChanged);

  guiChanged();
}

function cameraChanged() {
  camera.position.x = params.cameraX;
  camera.position.y = params.cameraY;
  camera.position.z = params.cameraZ;
}

function setupRenderer() {
  // const bgColor = 0x263238 / 2;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // renderer.setClearColor(bgColor, 1);
  renderer.shadowMap.enabled = true;
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // renderer.gammaOutput = true;
  document.body.appendChild(renderer.domElement);

  // scene setup
  scene = new THREE.Scene();
  pmremGenerator = new THREE.PMREMGenerator(renderer);
}

function setupLights() {
  dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(0, 25, 0);
  dirLight.position.multiplyScalar(30);
  scene.add(dirLight);

  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 10000;
  dirLight.shadow.mapSize.height = 10000;

  const d = 10000;

  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;

  dirLight.shadow.camera.far = 10000;
  // dirLight.shadow.bias = - 1;

  // const dirLightHelper = new THREE.DirectionalLightHelper( dirLight, 100 );
  // scene.add( dirLightHelper );
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );
  camera.position.set(-31, -1468, -873);
  camera.far = 10000;
  camera.updateProjectionMatrix();
  window.camera = camera;

  // create an AudioListener and add it to the camera
  const listener = new THREE.AudioListener();
  listener.context.resume();
  camera.add(listener);

  // create a global audio source
  const sound = new THREE.Audio(listener);

  // load a sound and set it as the Audio object's buffer
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load("assets/images/ambient2.mp3", function (buffer) {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.5);
    sound.play();
  });
}

function createGround() {
  const waterGeometry = new THREE.PlaneBufferGeometry(5000, 5000);

  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      "/assets/images/waternormals.jpg",
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 8,
    fog: scene.fog !== undefined,
  });

  water.rotation.x = -Math.PI / 2;
  water.position.y = -27;
  water.receiveShadow = true;
  water.material.uniforms.size.value = 10;
  scene.add(water);
}

function setupMisc() {
  clock = new THREE.Clock();
  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 40.0;
  // controls.maxDistance = 10000.0;
  controls.enableDamping = true;
  // stats setup
  stats = new Stats();
  document.body.appendChild(stats.dom);
}

function setupPlayer() {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("three/examples/js/libs/draco/gltf/");

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.load(
    "assets/images/Fox.glb",
    function (gltf) {
      const model = gltf.scene.children[0];
      // model.position.set(0, -10, 0);
      model.scale.set(0.05, 0.05, 0.05);
      // scene.add(model);
      player = model;
      player.castShadow = true;
      player.receiveShadow = true;
      // player.material.shadowSide = 2;
      scene.add(player);
      console.log("player", player);

      reset();

      animations = gltf.animations;
      mixer = new THREE.AnimationMixer(model);
      mixer.clipAction(animations[0]).play();
    },
    undefined,
    function (e) {
      console.error(e);
    }
  );
}

function setupGUI() {
  gui = new GUI();
  const visFolder = gui.addFolder("Collision Detection");
  visFolder.add(params, "displayCollider");
  visFolder.add(params, "displayBVH");
  visFolder.add(params, "visualizeDepth", 1, 20, 1).onChange((v) => {
    visualizer.depth = v;
    visualizer.update();
  });

  const physicsFolder = gui.addFolder("Player");
  // physicsFolder.add(params, "physicsSteps", 0, 30, 1);
  physicsFolder.add(params, "gravity", -100, 100, 0.01).onChange((v) => {
    params.gravity = parseFloat(v);
  });
  physicsFolder.add(params, "playerSpeed", 1, 20);
  physicsFolder.add(params, "reset");
}

function setupCallbacks() {
  window.addEventListener(
    "resize",
    function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    false
  );

  window.addEventListener("keydown", function (e) {
    switch (e.code) {
      case "KeyC":
        params.firstPerson = !params.firstPerson;
        player.visible = !player.visible;

        if (!params.firstPerson) {
          camera.position
            .sub(controls.target)
            .normalize()
            .multiplyScalar(10)
            .add(controls.target);
        }
        break;
      case "KeyW":
      case "ArrowUp":
        fwdPressed = true;
        doWalk();
        break;
      case "KeyS":
      case "ArrowDown":
        bkdPressed = true;
        doWalk();
        break;
      case "KeyD":
      case "ArrowRight":
        rgtPressed = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        lftPressed = true;
        break;
      case "Space":
        if (playerIsOnGround) {
          playerVelocity.y = 50.0;
        }
        break;
    }
  });

  window.addEventListener("keyup", function (e) {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        fwdPressed = false;
        doChill();
        break;
      case "KeyS":
      case "ArrowDown":
        bkdPressed = false;
        doChill();
        break;
      case "KeyD":
      case "ArrowRight":
        rgtPressed = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        lftPressed = false;
        break;
    }
  });
}

function setupTerrain() {
  new GLTFLoader().load("assets/images/high.glb", (res) => loadThing(res));
}

function loadThing(res) {
  const gltfScene = res.scene;
  gltfScene.scale.setScalar(1000);

  const box = new THREE.Box3();
  box.setFromObject(gltfScene);
  box.getCenter(gltfScene.position).negate();
  gltfScene.updateMatrixWorld(true);

  // visual geometry setup
  const toMerge = {};
  gltfScene.traverse((o) => {
    if (o.isMesh) {
      o.geometry = o.geometry.toNonIndexed();
      let geo = o.geometry;
      let faces = geo.attributes.position.count;

      let colorBuffer = new THREE.BufferAttribute(
        new Float32Array(faces * 3),
        3
      );
      geo.setAttribute("color", colorBuffer);
      const cols = geo.attributes.color;
      const positions = geo.attributes.position;
      console.log(positions);
      let val = Math.random();

      for (let i = 0; i < cols.count; i += 3) {
        // get vertex of this triangle.
        let a = positions.getY(i);
        let b = positions.getY(i + 1);
        let c = positions.getY(i + 2);
        let placeV = new THREE.Vector3(
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i)
        );

        //assign colors based on the highest point of the face
        let max = Math.max(a, Math.max(b, c));
        // map value between 0-1.
        max = map(max, 0, 0.0493, 0, 1);
        val = Math.random();
        // val = map(val, -1, 1, 0, 1);
        // setCol(cols, i, max,max,max);
        // setCol(cols, i, 1,1,1);
        // blue
        if (max <= p.water) setCol(cols, i, 0.0, 0.3, 1.0);
        // blue
        else if (max <= p.sand) setCol(cols, i, 1.0, 0.8, 0.3);
        // yellow
        else if (max <= p.grass) {
          if (places.length < 70 && val > 0.995) {
            places.push(placeV);
          }
          setCol(cols, i, 0.44, 0.7, 0.18);
        }
        // green
        else if (max <= p.rock) setCol(cols, i, 0.3, 0.3, 0.3);
        // brown
        else setCol(cols, i, 0.92, 0.98, 0.98); // snow
      }

      o.geometry.computeFaceNormals();
      o.geometry.computeVertexNormals();

      const hex = o.material.color.getHex();
      toMerge[hex] = toMerge[hex] || [];
      toMerge[hex].push(o);
    }
  });

  environment = new THREE.Group();
  for (const hex in toMerge) {
    const arr = toMerge[hex];
    const visualGeometries = [];
    arr.forEach((mesh) => {
      const geom = mesh.geometry.clone();
      geom.applyMatrix4(mesh.matrixWorld);
      visualGeometries.push(geom);
    });

    if (visualGeometries.length) {
      const newGeom =
        BufferGeometryUtils.mergeBufferGeometries(visualGeometries);
      const newMesh = new THREE.Mesh(
        newGeom,
        new THREE.MeshStandardMaterial({
          // wireframe: true,
          vertexColors: THREE.VertexColors,
          // required for flat shading
          flatShading: true,
        })
      );
      newMesh.castShadow = true;
      newMesh.receiveShadow = true;
      // newMesh.material.shadowSide = 2;
      environment.add(newMesh);
    }
  }

  // collect all geometries to merge
  const geometries = [];
  environment.updateMatrixWorld(true);
  environment.traverse((c) => {
    if (c.geometry) {
      const cloned = c.geometry.clone();
      cloned.applyMatrix4(c.matrixWorld);
      for (const key in cloned.attributes) {
        if (key !== "position") {
          cloned.deleteAttribute(key);
        }
      }
      geometries.push(cloned);
    }
  });

  // create the merged geometry
  const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(
    geometries,
    false
  );
  mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, {
    lazyGeneration: false,
  });

  collider = new THREE.Mesh(mergedGeometry);
  collider.material.wireframe = true;
  collider.material.opacity = 0.5;
  collider.material.transparent = true;

  visualizer = new MeshBVHVisualizer(collider, params.visualizeDepth);
  scene.add(visualizer);
  scene.add(collider);
  scene.add(environment);

  console.log("env", environment);

  new Trees(places, scene, gui);
}

function reset() {
  playerVelocity.set(0, 0, 0);
  player.position.set(15.75, -3, 30);
  camera.position.sub(controls.target);
  controls.target.copy(player.position);
  camera.position.add(player.position);
  controls.update();
}

function updatePlayer(delta) {
  if (!player) return;
  window.playerVelocity = playerVelocity;

  playerVelocity.y += delta * params.gravity;
  player.position.addScaledVector(playerVelocity, delta);

  // move the player
  const angle = controls.getAzimuthalAngle();
  player.quaternion.setFromAxisAngle(playerDirection, angle + Math.PI);

  if (fwdPressed) {
    tempVector.set(0, 0, -1).applyAxisAngle(upVector, angle);
    player.position.addScaledVector(tempVector, params.playerSpeed * delta);
  }

  if (bkdPressed) {
    tempVector.set(0, 0, 1).applyAxisAngle(upVector, angle);
    player.position.addScaledVector(tempVector, params.playerSpeed * delta);
  }

  if (lftPressed) {
    tempVector.set(-1, 0, 0).applyAxisAngle(upVector, angle);
    player.position.addScaledVector(tempVector, params.playerSpeed * delta);
  }

  if (rgtPressed) {
    tempVector.set(1, 0, 0).applyAxisAngle(upVector, angle);
    player.position.addScaledVector(tempVector, params.playerSpeed * delta);
  }

  player.updateMatrixWorld();

  // adjust player position based on collisions
  // const capsuleInfo = player.capsuleInfo;

  tempBox.makeEmpty();
  tempMat.copy(collider.matrixWorld).invert();
  tempSegment.copy(capsuleInfo.segment);

  tempSegment.start.applyMatrix4(player.matrixWorld).applyMatrix4(tempMat);
  tempSegment.end.applyMatrix4(player.matrixWorld).applyMatrix4(tempMat);

  tempBox.expandByPoint(tempSegment.start);
  tempBox.expandByPoint(tempSegment.end);

  tempBox.min.addScalar(-capsuleInfo.radius);
  tempBox.max.addScalar(capsuleInfo.radius);
  collider.geometry.boundsTree.shapecast(
    collider,
    (box) => box.intersectsBox(tempBox),
    (tri) => {
      const triPoint = tempVector;
      const capsulePoint = tempVector2;

      const distance = tri.closestPointToSegment(
        tempSegment,
        triPoint,
        capsulePoint
      );
      if (distance < capsuleInfo.radius) {
        const depth = capsuleInfo.radius - distance;
        const direction = capsulePoint.sub(triPoint).normalize();
        // info.innerHTML = `x: ${triPoint.x.toFixed(2)} y: ${triPoint.y.toFixed(2)} z: ${triPoint.z.toFixed(2)}`
        tempSegment.start.addScaledVector(direction, depth);
        tempSegment.end.addScaledVector(direction, depth);
      }
    }
  );

  const newPosition = tempVector;
  newPosition.copy(tempSegment.start).applyMatrix4(collider.matrixWorld);

  const deltaVector = tempVector2;

  deltaVector.subVectors(newPosition, player.position);
  player.position.copy(newPosition);

  playerIsOnGround = deltaVector.y > Math.abs(delta * playerVelocity.y * 0.25);

  if (!playerIsOnGround) {
    deltaVector.normalize();
    playerVelocity.addScaledVector(
      deltaVector,
      -deltaVector.dot(playerVelocity)
    );
  } else {
    playerVelocity.set(0, 0, 0);
  }

  // adjust the camera
  camera.position.sub(controls.target);
  controls.target.copy(player.position);
  camera.position.add(player.position);

  if (player.position.y < -100) {
    reset();
  }
}

function doWalk() {
  if (state === STATE.walk) return;
  mixer.stopAllAction();
  mixer.clipAction(animations[1]).play();
  state = STATE.walk;
}

function doChill() {
  if (state === STATE.chill) return;
  mixer.stopAllAction();
  mixer.clipAction(animations[0]).play();
  state = STATE.chill;
}

function doRun() {
  if (state === STATE.run) return;
  mixer.stopAllAction();
  mixer.clipAction(animations[2]).play();
  state = STATE.run;
}

function render() {
  stats.update();
  requestAnimationFrame(render);

  const delta = Math.min(clock.getDelta(), 0.1);
  if (mixer) {
    mixer.update(delta);
  }
  if (params.firstPerson) {
    controls.maxPolarAngle = Math.PI;
    controls.minDistance = 1e-4;
    controls.maxDistance = 1e-4;
  } else {
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 1;
    controls.maxDistance = 2000;
  }

  if (collider) {
    collider.visible = params.displayCollider;
    visualizer.visible = params.displayBVH;

    const physicsSteps = params.physicsSteps;

    for (let i = 0; i < physicsSteps; i++) {
      updatePlayer(delta / physicsSteps);
    }
  }

  // TODO: limit the camera movement based on the collider
  // raycast in direction of camera and move it if it's further than the closest point

  controls.update();

  if (water) {
    water.material.uniforms["time"].value += 1.0 / 60.0;
  }

  if (clouds.mesh) {
    clouds.mesh.position.x += Math.sin(delta * 10);
  }

  // info.innerHTML = `x: ${camera.position.x.toFixed(2)} y: ${camera.position.y.toFixed(
  //   2
  // )} z: ${camera.position.z.toFixed(2)}`;

  renderer.render(scene, camera);
}
