// import "./style.css";
// import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import * as dat from "dat.gui";
// import { Sky } from "three/examples/jsm/objects/Sky.js";
// import { Water } from "three/examples/jsm/objects/Water.js";

// let sky, camera, renderer, sun, water;
// // Debug
// const gui = new dat.GUI();

// // Canvas
// const canvas = document.querySelector("canvas.webgl");

// // Scene
// const scene = new THREE.Scene();

// // Objects
// // const geometry = new THREE.TorusGeometry(0.7, 0.2, 16, 100);
// // Materials
// // const material = new THREE.MeshBasicMaterial();
// // material.color = new THREE.Color(0xff0000);
// // Mesh
// // const sphere = new THREE.Mesh(geometry, material);
// // scene.add(sphere);
// // Lights
// // const pointLight = new THREE.PointLight(0xffffff, 0.1)
// // pointLight.position.x = 2
// // pointLight.position.y = 3
// // pointLight.position.z = 4
// // scene.add(pointLight)

// function initSky() {
//   // Add Sky
//   sky = new Sky();
//   sky.scale.setScalar(10000);
//   scene.add(sky);

//   sun = new THREE.Vector3();

//   // Water

//   const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

//   water = new Water(waterGeometry, {
//     textureWidth: 512,
//     textureHeight: 512,
//     waterNormals: new THREE.TextureLoader().load(
//       "/assets/images/waternormals.jpg",
//       function (texture) {
//         texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
//       }
//     ),
//     sunDirection: new THREE.Vector3(),
//     sunColor: 0xffffff,
//     waterColor: 0x001e0f,
//     distortionScale: 3.7,
//     fog: scene.fog !== undefined,
//   });

//   water.rotation.x = -Math.PI / 2;

//   scene.add(water);

//   /// GUI

//   const effectController = {
//     turbidity: 10,
//     rayleigh: 3,
//     mieCoefficient: 0.005,
//     mieDirectionalG: 0.7,
//     elevation: 2,
//     azimuth: 180,
//     exposure: 0.5,
//   };

//   function guiChanged() {
//     const uniforms = sky.material.uniforms;
//     uniforms["turbidity"].value = effectController.turbidity;
//     uniforms["rayleigh"].value = effectController.rayleigh;
//     uniforms["mieCoefficient"].value = effectController.mieCoefficient;
//     uniforms["mieDirectionalG"].value = effectController.mieDirectionalG;

//     const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
//     const theta = THREE.MathUtils.degToRad(effectController.azimuth);

//     sun.setFromSphericalCoords(1, phi, theta);

//     uniforms["sunPosition"].value.copy(sun);

//     renderer.render(scene, camera);
//   }

//   gui.add(effectController, "turbidity", 0.0, 20.0, 0.1).onChange(guiChanged);
//   gui.add(effectController, "rayleigh", 0.0, 4, 0.001).onChange(guiChanged);
//   gui
//     .add(effectController, "mieCoefficient", 0.0, 0.1, 0.001)
//     .onChange(guiChanged);
//   gui
//     .add(effectController, "mieDirectionalG", 0.0, 1, 0.001)
//     .onChange(guiChanged);
//   gui.add(effectController, "elevation", 0, 90, 0.1).onChange(guiChanged);
//   gui.add(effectController, "azimuth", -180, 180, 0.1).onChange(guiChanged);
//   guiChanged();

//   const parameters = {
//     elevation: 2,
//     azimuth: 180
// };

//   const pmremGenerator = new THREE.PMREMGenerator( renderer );

//   function updateSun() {

//       const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
//       const theta = THREE.MathUtils.degToRad( parameters.azimuth );

//       sun.setFromSphericalCoords( 1, phi, theta );

//       sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
//       water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

//       scene.environment = pmremGenerator.fromScene( sky ).texture;

//   }

//   updateSun();

// }

// // LIGHT
// var light = new THREE.PointLight(0xffffff);
// light.position.set(100, 250, 100);
// scene.add(light);
// // FLOOR
// var floorTexture = new THREE.TextureLoader().load(
//   "/assets/images/checkerboard.jpg"
// );
// floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
// floorTexture.repeat.set(10, 10);
// var floorMaterial = new THREE.MeshBasicMaterial({
//   map: floorTexture,
//   side: THREE.DoubleSide,
// });
// var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
// var floor = new THREE.Mesh(floorGeometry, floorMaterial);
// floor.position.y = -0.5;
// floor.rotation.x = Math.PI / 2;
// // scene.add(floor);
// // SKYBOX
// var skyBoxGeometry = new THREE.BoxGeometry(10000, 10000, 10000);
// var skyBoxMaterial = new THREE.MeshBasicMaterial({
//   color: 0x9999ff,
//   side: THREE.BackSide,
// });
// var skyBox = new THREE.Mesh(skyBoxGeometry, skyBoxMaterial);
// // scene.add(skyBox);

// // texture used to generate "bumpiness"
// var bumpTexture = new THREE.TextureLoader().load(
//   "/assets/images/nz-height-map.jpg"
// );
// bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping;
// // magnitude of normal displacement
// var bumpScale = 100.0;

// var oceanTexture = new THREE.TextureLoader().load(
//   "/assets/images/dirt-512.jpg"
// );
// oceanTexture.wrapS = oceanTexture.wrapT = THREE.RepeatWrapping;

// var sandyTexture = new THREE.TextureLoader().load(
//   "/assets/images/sand-512.jpg"
// );
// sandyTexture.wrapS = sandyTexture.wrapT = THREE.RepeatWrapping;

// var grassTexture = new THREE.TextureLoader().load(
//   "/assets/images/grass-512.jpg"
// );
// grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;

// var rockyTexture = new THREE.TextureLoader().load(
//   "/assets/images/rock-512.jpg"
// );
// rockyTexture.wrapS = rockyTexture.wrapT = THREE.RepeatWrapping;

// var snowyTexture = new THREE.TextureLoader().load(
//   "/assets/images/snow-512.jpg"
// );
// snowyTexture.wrapS = snowyTexture.wrapT = THREE.RepeatWrapping;

// // use "this." to create global object
// let customUniforms = {
//   bumpTexture: { type: "t", value: bumpTexture },
//   bumpScale: { type: "f", value: bumpScale },
//   oceanTexture: { type: "t", value: oceanTexture },
//   sandyTexture: { type: "t", value: sandyTexture },
//   grassTexture: { type: "t", value: grassTexture },
//   rockyTexture: { type: "t", value: rockyTexture },
//   snowyTexture: { type: "t", value: snowyTexture },
// };

// // create custom material from the shader code above
// //   that is within specially labelled script tags
// var customMaterial = new THREE.ShaderMaterial({
//   uniforms: customUniforms,
//   vertexShader: document.getElementById("vertexShader").textContent,
//   fragmentShader: document.getElementById("fragmentShader").textContent,
//   //   may need to remove
//   side: THREE.DoubleSide,
// });

// var planeGeo = new THREE.PlaneGeometry(1000, 1000, 100, 100);
// var plane = new THREE.Mesh(planeGeo, customMaterial);
// plane.rotation.x = -Math.PI / 2;
// // plane.position.y = -100;
// // scene.add(plane);

// // var waterGeo = new THREE.PlaneGeometry(1000, 1000, 1, 1);
// // var waterTex = new THREE.TextureLoader().load("/assets/images/water512.jpg");
// // waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
// // waterTex.repeat.set(5, 5);
// // var waterMat = new THREE.MeshBasicMaterial({
// //   map: waterTex,
// //   transparent: true,
// //   opacity: 0.4,
// // });
// // var water = new THREE.Mesh(planeGeo, waterMat);
// // water.rotation.x = -Math.PI / 2;
// // water.position.y = 5;
// // scene.add(water);

// /**
//  * Sizes
//  */
// const sizes = {
//   width: window.innerWidth,
//   height: window.innerHeight,
// };

// window.addEventListener("resize", () => {
//   // Update sizes
//   sizes.width = window.innerWidth;
//   sizes.height = window.innerHeight;

//   // Update camera
//   camera.aspect = sizes.width / sizes.height;
//   camera.updateProjectionMatrix();

//   // Update renderer
//   renderer.setSize(sizes.width, sizes.height);
//   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// });

// /**
//  * Camera
//  */
// // Base camera
// var SCREEN_WIDTH = window.innerWidth,
//   SCREEN_HEIGHT = window.innerHeight;
// var VIEW_ANGLE = 45,
//   ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,
//   NEAR = 0.1,
//   FAR = 20000;

// camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
// camera.position.set(0, 1000, 400);
// camera.lookAt(scene.position);
// scene.add(camera);

// // Controls
// const controls = new OrbitControls(camera, canvas);
// controls.enableDamping = true;

// /**
//  * Renderer
//  */
// renderer = new THREE.WebGLRenderer({
//   canvas: canvas,
// });
// renderer.setSize(sizes.width, sizes.height);
// renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// renderer.toneMappingExposure = 0.5;

// const helper = new THREE.GridHelper(10000, 2, 0xffffff, 0xffffff);
// // scene.add(helper);

// initSky();

// /**
//  * Animate
//  */

// const clock = new THREE.Clock();

// const tick = () => {
//   const elapsedTime = clock.getElapsedTime();

//   // Update objects
//   //   sphere.rotation.y = 0.5 * elapsedTime;

//   // Update Orbital Controls
//   controls.update();
//   water.material.uniforms[ 'time' ].value += 1.0 / 60.0;

//   // Render
//   renderer.render(scene, camera);

//   // Call tick again on the next frame
//   window.requestAnimationFrame(tick);
// };

// tick();

import "./style.css";
// import * as THREE from "three/build/three.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
const canvas = document.querySelector("div.container");

let stats;
let camera, scene, renderer;
let controls, water, sun, mesh;

init();
animate();

function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // renderer.toneMapping = THREE.LinearToneMapping;
  canvas.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  var xS = 63, yS = 63;
  // let terrainScene = THREE.Terrain({
  //     easing: THREE.Terrain.Linear,
  //     frequency: 2.5,
  //     heightmap: THREE.Terrain.Worley,
  //     material: new THREE.MeshBasicMaterial({color: 0x5566aa}),
  //     maxHeight: 100,
  //     minHeight: -100,
  //     steps: 1,
  //     useBufferGeometry: false,
  //     xSegments: xS,
  //     xSize: 1024,
  //     ySegments: yS,
  //     ySize: 1024,
  // });
  // Assuming you already have your global scene, add the terrain to it
  // scene.add(terrainScene);
  /**
   * Camera
   */
  // Base camera
  var SCREEN_WIDTH = window.innerWidth,
    SCREEN_HEIGHT = window.innerHeight;
  var VIEW_ANGLE = 45,
    ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,
    NEAR = 0.1,
    FAR = 20000;

  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  camera.position.set(0, 1000, 400);
  camera.lookAt(scene.position);
  scene.add(camera);

  // Controls
  controls = new OrbitControls(camera, canvas);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 40.0;
				controls.maxDistance = 2000.0;
  controls.enableDamping = true;
  //

  sun = new THREE.Vector3();

  // Water

  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

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
    distortionScale: 3.7,
    fog: scene.fog !== undefined,
  });

  water.rotation.x = -Math.PI / 2;

  scene.add(water);

  var aMeshMirror = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(10000, 10000, 10, 10),
    water.material
  );
  // aMeshMirror.add(water);
  aMeshMirror.rotation.x = -Math.PI * 0.5;
  // scene.add(aMeshMirror);

  // Skybox

  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms["turbidity"].value = 10;
  skyUniforms["rayleigh"].value = 2;

  const parameters = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms["sunPosition"].value.copy(sun);
    water.material.uniforms["sunDirection"].value.copy(sun).normalize();

    scene.environment = pmremGenerator.fromScene(sky).texture;
  }

  updateSun();

  //

  const geometry = new THREE.BoxGeometry(30, 30, 30);
  const material = new THREE.MeshStandardMaterial({ roughness: 0 });

  mesh = new THREE.Mesh(geometry, material);
  // scene.add(mesh);

  // texture used to generate "bumpiness"
  var bumpTexture = new THREE.TextureLoader().load(
    "/assets/images/nz-height-map.jpg"
  );
  bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping;
  // magnitude of normal displacement
  var bumpScale = 100.0;

  var oceanTexture = new THREE.TextureLoader().load(
    "/assets/images/dirt-512.jpg"
  );
  oceanTexture.wrapS = oceanTexture.wrapT = THREE.RepeatWrapping;

  var sandyTexture = new THREE.TextureLoader().load(
    "/assets/images/sand-512.jpg"
  );
  sandyTexture.wrapS = sandyTexture.wrapT = THREE.RepeatWrapping;

  var grassTexture = new THREE.TextureLoader().load(
    "/assets/images/grass-512.jpg"
  );
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;

  var rockyTexture = new THREE.TextureLoader().load(
    "/assets/images/rock-512.jpg"
  );
  rockyTexture.wrapS = rockyTexture.wrapT = THREE.RepeatWrapping;

  var snowyTexture = new THREE.TextureLoader().load(
    "/assets/images/snow-512.jpg"
  );
  snowyTexture.wrapS = snowyTexture.wrapT = THREE.RepeatWrapping;

  // use "this." to create global object
  let customUniforms = {
    bumpTexture: { type: "t", value: bumpTexture },
    bumpScale: { type: "f", value: bumpScale },
    oceanTexture: { type: "t", value: oceanTexture },
    sandyTexture: { type: "t", value: sandyTexture },
    grassTexture: { type: "t", value: grassTexture },
    rockyTexture: { type: "t", value: rockyTexture },
    snowyTexture: { type: "t", value: snowyTexture },
  };

  // create custom material from the shader code above
  //   that is within specially labelled script tags
  var customMaterial = new THREE.ShaderMaterial({
    uniforms: customUniforms,
    vertexShader: document.getElementById("vertexShader").textContent,
    fragmentShader: document.getElementById("fragmentShader").textContent,
    //   may need to remove
    side: THREE.DoubleSide,
  });

  var planeGeo = new THREE.PlaneGeometry(1000, 1000, 100, 100);
  var plane = new THREE.Mesh(planeGeo, customMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -4;
  scene.add(plane);

  //


  //STATS
  stats = new Stats();
  canvas.appendChild(stats.dom);

  // GUI
  const gui = new dat.GUI();

  const folderSky = gui.addFolder("Sky");
  folderSky.add(parameters, "elevation", 0, 90, 0.1).onChange(updateSun);
  folderSky.add(parameters, "azimuth", -180, 180, 0.1).onChange(updateSun);
  folderSky.open();

  const waterUniforms = water.material.uniforms;

  const folderWater = gui.addFolder("Water");
  folderWater
    .add(waterUniforms.distortionScale, "value", 0, 8, 0.1)
    .name("distortionScale");
  folderWater.add(waterUniforms.size, "value", 0.1, 10, 0.1).name("size");
  folderWater.open();

  //

  window.addEventListener("resize", onWindowResize);
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
  const time = performance.now() * 0.001;

  mesh.position.y = Math.sin(time) * 20 + 5;
  mesh.rotation.x = time * 0.5;
  mesh.rotation.z = time * 0.51;

  water.material.uniforms["time"].value += 1.0 / 60.0;

  renderer.render(scene, camera);
}
