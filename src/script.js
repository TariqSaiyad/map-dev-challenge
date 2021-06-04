import "./style.css";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as dat from "dat.gui";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { Octree } from "three/examples/jsm/math/Octree.js";
import { Capsule } from "three/examples/jsm/math/Capsule.js";
// import { AmmoPhysics, PhysicsLoader } from "@enable3d/ammo-physics";
// import Ammo from '@enable3d/ammo-physics'
const { Physics, ServerClock } = require("@enable3d/ammo-on-nodejs");
var _ammo = require("@enable3d/ammo-on-nodejs/ammo/ammo.js");

import { Terrain, props, MAP_NAME, p } from "./Terrain";
import { Clouds } from "./Clouds";
const canvas = document.querySelector("div.container");
const relHeightContainer = document.getElementById("relative-height");
const clock = new THREE.Clock();

let physics;
let camera, scene, renderer, gui, stats, pmremGenerator;
let controls, water, sun, sky, hemiLight;

let mainMesh;
let prevTime = performance.now();
let terrain = new Terrain();
let clouds;

let isFPS;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let raycaster, rayHelper;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const cloudUniforms = {
  iTime: { value: 0 },
  iResolution: { value: new THREE.Vector3() },
};
/// sky stuff
const params = {
  turbidity: 10,
  rayleigh: 4,
  mieCoefficient: 0.1,
  mieDirectionalG: 0.8,
  elevation: 12,
  azimuth: 90,
};

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! //
const worldOctree = new Octree();
const playerCollider = new Capsule(
  new THREE.Vector3(0, 35, 0),
  new THREE.Vector3(0, 1, 0),
  5
);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();
let playerOnFloor = false;
const speed = 70;

function playerCollitions() {
  const result = worldOctree.capsuleIntersect(playerCollider);
  playerOnFloor = false;
  if (result) {
    playerOnFloor = result.normal.y > 0;

    if (!playerOnFloor) {
      console.log("no floor");
      playerVelocity.addScaledVector(
        result.normal,
        -result.normal.dot(playerVelocity)
      );
    }

    playerCollider.translate(result.normal.multiplyScalar(result.depth));
  }
}

function updatePlayer(deltaTime) {
  const damping = Math.exp(-2 * deltaTime) - 1;
  playerVelocity.addScaledVector(playerVelocity, damping);

  if (!playerOnFloor) {
    playerVelocity.y += -150 * deltaTime;
  }

  const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
  playerCollider.translate(deltaPosition);

  playerCollitions();

  camera.position.copy(playerCollider.end);
}

function getForwardVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();

  return playerDirection;
}

function getSideVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();
  playerDirection.cross(camera.up);

  return playerDirection;
}

function controlsFn(deltaTime) {
  // if (playerOnFloor) {
  if (moveForward) {
    playerVelocity.add(getForwardVector().multiplyScalar(speed * deltaTime));
  }

  if (moveBackward) {
    playerVelocity.add(getForwardVector().multiplyScalar(-speed * deltaTime));
  }

  if (moveLeft) {
    playerVelocity.add(getSideVector().multiplyScalar(-speed * deltaTime));
  }

  if (moveRight) {
    playerVelocity.add(getSideVector().multiplyScalar(speed * deltaTime));
  }

  if (canJump) {
    playerVelocity.y = 150;
  }
  // }
}

_ammo().then((ammo) => {
  globalThis.Ammo = ammo;
  console.log("Ammo", new Ammo.btVector3(1, 2, 3).y() === 2);
  init();
  animate();
});

function updateControls() {
  isFPS = !isFPS;
  console.log(isFPS ? "FPS MODE" : "ORBIT MODE");
  createControls();
}

function init() {
  setupCallbacks();
  createRenderer();
  createScene();
  createCamera();
  createControls();

  createLights();

  // GROUND
  createGround();

  // console.log(physics);
  // const g = physics.add.ground({ y: 10, width: 400, height: 400, name: 'ground-1' },{ lambert: { color: 'cornflowerblue' }})
  // console.log('ground',g);

  // Add Sky
  initSky();

  function terrainChange() {
    // clean up
    if (terrain.model) {
      console.log(terrain.model);
      terrain.model.geometry.dispose();
      terrain.model.material.dispose();
      scene.children.forEach((child) =>
        child.name == MAP_NAME ? scene.remove(child) : null
      );
    }
    console.log(scene);
    terrain.generateTerrain(scene, mainMesh, physics, worldOctree);
  }
  terrainChange();

  gui.add(props, "water", 0.0, 1.0, 0.01).onChange(terrainChange);
  gui.add(props, "sand", 0.0, 1.0, 0.01).onChange(terrainChange);
  gui.add(props, "grass", 0.0, 1.0, 0.01).onChange(terrainChange);
  gui.add(props, "rock", 0.0, 1.0, 0.01).onChange(terrainChange);
  gui.add(props, "snow", 0.0, 1.0, 0.01).onChange(terrainChange);

  //STATS
  stats = new Stats();
  stats.add;
  canvas.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function setupCallbacks() {
  const onKeyDown = function (event) {
    switch (event.code) {
      case "KeyC":
        updateControls();
        break;
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "Space":
        // if (canJump === true) velocity.y += 350;
        canJump = true;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;
      case "Space":
        canJump = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
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

  sun = new THREE.Vector3();

  gui.add(params, "turbidity", 0.0, 20.0, 0.1).onChange(guiChanged);
  gui.add(params, "rayleigh", 0.0, 4, 0.001).onChange(guiChanged);
  gui.add(params, "mieCoefficient", 0.0, 0.1, 0.001).onChange(guiChanged);
  gui.add(params, "mieDirectionalG", 0.0, 1, 0.001).onChange(guiChanged);
  gui.add(params, "elevation", 0, 90, 0.1).onChange(guiChanged);
  gui.add(params, "azimuth", -180, 180, 0.1).onChange(guiChanged);

  guiChanged();
}

function createGround() {
  const waterGeometry = new THREE.PlaneBufferGeometry(10000, 10000);

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
  water.position.y = 17.5;
  // gui.add(water.position, 'y', -10,50,1).name('water height');
  water.receiveShadow = true;
  water.material.uniforms.size.value = 10;
  scene.add(water);
}

function createSky() {
  const vertexShader = document.getElementById("vertexShader").textContent;
  const fragmentShader = document.getElementById("fragmentShader").textContent;
  const uniforms = {
    topColor: { value: new THREE.Color(0x0077ff) },
    bottomColor: { value: new THREE.Color(0xffffff) },
    offset: { value: 33 },
    exponent: { value: 0.6 },
  };
  uniforms["topColor"].value.copy(hemiLight.color);

  // scene.fog.color.copy( uniforms[ "bottomColor" ].value );
  const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide,
  });

  sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
}

function createLights() {
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
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

function createControls() {
  if (controls) {
    controls.dispose();
  }
  if (isFPS) {
    controls = new PointerLockControls(camera, document.body);
    controls.lock();
  } else {
    controls = new OrbitControls(camera, canvas);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 40.0;
    // controls.maxDistance = 2000.0;
    controls.enableDamping = true;
  }
}

function createCamera() {
  /**
   * Camera
   */
  // Base camera
  let sWidth = window.innerWidth;
  let sHeight = window.innerHeight;
  let fov = 45;
  let ratio = sWidth / sHeight;
  let NEAR = 0.1;
  let FAR = 10000;

  camera = new THREE.PerspectiveCamera(fov, ratio, NEAR, FAR);
  camera.position.set(10, 200, 0);
  // camera.position.y = 10;
  camera.lookAt(scene.position);
  playerCollider.translate(camera.position);
  scene.add(camera);
}

function createScene() {
  scene = new THREE.Scene();
  clouds = new Clouds(50, scene);
  // physics
  physics = new Physics();
  physics.scene = scene;

  // const box = physics.add.box({
  //   width: 100,
  //   height: 100,
  //   depth: 100,
  //   name: "box",
  //   y: 550,
  // });
  // scene.add(box);
  console.log(physics);
  // physics.debug.enable();
  // scene.fog = new THREE.Fog(scene.background, 500, 5000);
}

function createRenderer() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  // renderer.physicallyCorrectLights = true;
  canvas.appendChild(renderer.domElement);
  pmremGenerator = new THREE.PMREMGenerator(renderer);

  gui = new dat.GUI();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  render();
  stats.update();
}

function render() {
  const time = performance.now();

  if (isFPS) {
    const deltaTime = Math.min(0.1, clock.getDelta());

    controlsFn(deltaTime);
    updatePlayer(deltaTime);
    relHeightContainer.innerHTML = `y: ${playerVelocity.y.toFixed(2)}`;
  }

  if (water) {
    water.material.uniforms["time"].value += 1.0 / 60.0;
  }

  // cloudUniforms.iResolution.value.set(512, 512, 1);
  // cloudUniforms.iTime.value = time / 3600;

  // params.azimuth += (10.0 / 60.0)%180;
  // console.log(sky.material.uniforms);
  // guiChanged();
  // physics.update(time * 1000);
  prevTime = time;

  renderer.render(scene, camera);
}
