import "./style.css";
import * as THREE from "three";

import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as dat from "dat.gui";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
// import { AmmoPhysics, PhysicsLoader } from "@enable3d/ammo-physics";
// import Ammo from '@enable3d/ammo-physics'
const { Physics, ServerClock } = require("@enable3d/ammo-on-nodejs");

var _ammo = require("@enable3d/ammo-on-nodejs/ammo/ammo.js");

import { Terrain, props, MAP_NAME, p } from "./Terrain";
import { Clouds } from "./Clouds";
const canvas = document.querySelector("div.container");
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
let raycaster;
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

// PhysicsLoader("./ammo", () => {

// });

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
  // Add Sky
  initSky();

  var skyGeo = new THREE.SphereGeometry(100000, 25, 25);
  var skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      iTime: { value: 1.0 },
      iResolution: { value: new THREE.Vector2() },
    },
    vertexShader: document.getElementById("vertexShader"),
    fragmentShader: document.getElementById("fragmentShader"),
  });
  var skyMesh = new THREE.Mesh(skyGeo, skyMaterial);
  // sky.material.side = THREE.BackSide;
  // scene.add(skyMesh);
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
    terrain.generateTerrain(scene, mainMesh);
    if (terrain.model) {
      physics.add.existing(terrain.model, { shape: "convex" });
    }
  }
  terrainChange();

  gui.add(props, "water", 0.0, 1.0, 0.01).onChange(terrainChange);
  gui.add(props, "sand", 0.0, 1.0, 0.01).onChange(terrainChange);
  gui.add(props, "grass", 0.0, 1.0, 0.01).onChange(terrainChange);
  gui.add(props, "rock", 0.0, 1.0, 0.01).onChange(terrainChange);
  gui.add(props, "snow", 0.0, 1.0, 0.01).onChange(terrainChange);

  // scene.add(new THREE.ArrowHelper(raycaster.ray.direction, raycaster.ray.origin, 100, 0xff0000) );

  //STATS
  stats = new Stats();
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
        if (canJump === true) velocity.y += 350;
        canJump = false;
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
    }
  };

  // const instructions = document.getElementById("instructions");
  // instructions.addEventListener(
  //   "click",
  //   () => {
  //     instructions.style.display = "none";
  //     blocker.style.display = "none";
  //   },
  //   false
  // );

  // controls.addEventListener("lock", function () {
  //   instructions.style.display = "none";
  //   blocker.style.display = "none";
  // });
  // controls.addEventListener("unlock", function () {
  //   blocker.style.display = "block";
  //   instructions.style.display = "";
  // });
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
  // const groundGeo = new THREE.PlaneGeometry(10000, 10000);
  // const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  // groundMat.color.setHSL(0.095, 1, 0.75);

  // const ground = new THREE.Mesh(groundGeo, groundMat);
  // ground.position.y = -33;
  // ground.rotation.x = -Math.PI / 2;
  // // ground.receiveShadow = true;
  // // scene.add(ground);

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
  // hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  // hemiLight.color.setHSL(0.6, 1, 0.6);
  // hemiLight.groundColor.setHSL(0.095, 1, 0.75);
  // hemiLight.position.set(0, 5000, 0);
  // scene.add(hemiLight);
  // const hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 10);
  // scene.add(hemiLightHelper);

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

    // let instructions = document.getElementById("instructions");
    // instructions.addEventListener(
    //   "click",
    //    () => {},
    //   false
    // );

    // controls.addEventListener("lock", function () {
    //   instructions.style.display = "none";
    //   blocker.style.display = "none";
    // });
    // controls.addEventListener("unlock", function () {
    //   blocker.style.display = "block";
    //   instructions.style.display = "";
    // });
    scene.add(controls.getObject());

    raycaster = new THREE.Raycaster(
      controls.getObject().position,
      new THREE.Vector3(0, -1, 0),
      0,
      50
    );
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
  camera.position.set(0, 900, 0);
  // camera.position.y = 10;
  camera.lookAt(scene.position);
  scene.add(camera);
}

function createScene() {
  scene = new THREE.Scene();
  clouds = new Clouds(100, scene);
  // physics
  physics = new Physics();
  physics.scene = scene;
  const box = physics.add.box({
    width: 100,
    height: 100,
    depth: 100,
    name: "box",
    y: 550,
  });
  scene.add(box);
  console.log(physics);
  // physics.debug.enable(true);
  // scene.background = new THREE.Color().setHSL(0.6, 0, 1);
  // scene.fog = new THREE.Fog(scene.background, 50, 500);
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
  if (controls.isLocked === true) {
    raycaster.ray.origin.copy(controls.getObject().position);
    // raycaster.set(controls.getObject().position, direction) //set the position and direction

    // raycaster.ray.origin.y = 10;

    const intersections = raycaster.intersectObjects([terrain.model]);
    const onObject = intersections.length > 0;

    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    if (onObject === true) {
      const pointHeight = intersections[0].point.y;
      const relativeHeight = controls.getObject().position.y - pointHeight;
      // console.log(relativeHeight);

      // velocity.y = Math.max(0, velocity.y);
      // let v = new THREE.Vector3(0, relativeHeight, 0).normalize();
      // controls.getObject().position.y =intersections[0].point.add(new THREE.Vector3( 0, 70, 0 )).y ;
      // v = velocity.add(v).normalize()
      // controls.getObject().position.y += v.y * delta;

      // Flatten velocity
      velocity.y = 0;

      // // Measure the rotation from global "up" vector to the surface normal
      // let up = new THREE.Vector3(0, 1, 0);
      // let normal = new THREE.Vector3().copy(rayResult.hitNormalWorld);
      // let q = new THREE.Quaternion().setFromUnitVectors(up, normal);

      // // Rotate an identity matrix
      // let matrix = new THREE.Matrix4().makeRotationFromQuaternion(q);

      // // Apply the matrix to appropriately rotate the velocity vector
      // newVelocity.applyMatrix4(matrix);

      // // Apply velocity
      // this.velocity.copy(newVelocity);
      canJump = true;
    }

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += velocity.y * delta; // new behavior

    if (controls.getObject().position.y <= 0) {
      velocity.y = 0;
      controls.getObject().position.y = 0;

      canJump = true;
    }
  }

  // mesh.position.y = Math.sin(time) * 20 + 5;
  // mesh.rotation.x = time * 0.5;
  // mesh.rotation.z = time * 0.51;

  // clouds.forEach((cloud) => {
  //   cloud.position.x=Math.sin(time) *THREE.Noise
  //   cloud.position.z=Math.cos(time) *Math.random()
  // });

  if (water) {
    water.material.uniforms["time"].value += 1.0 / 60.0;
  }

  // cloudUniforms.iResolution.value.set(512, 512, 1);
  // cloudUniforms.iTime.value = time / 3600;

  // params.azimuth += (10.0 / 60.0)%180;
  // console.log(sky.material.uniforms);
  // guiChanged();
  physics.update(time * 1000);

  prevTime = time;

  renderer.render(scene, camera);
}
