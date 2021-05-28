import "./style.css";
// import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
const canvas = document.querySelector("div.container");
import {
  Terrain,
  EaseInWeak,
  DiamondSquare,
  Linear,
  generateBlendedMaterial,
  scatterMeshes,
} from "three.terrain.js";

let stats;
let camera, scene, renderer;
let controls, water, sun, mesh;

var can = document.createElement("canvas");
var ctx = can.getContext("2d");

const image = new Image(500, 500); // Using optional size for image
image.onload = drawImageActualSize; // Draw when image has loaded

image.src = "/assets/images/square-nz.png";

let data;
let isLoaded = false;

let clouds = [];
// Load an image of intrinsic size 300x227 in CSS pixels

function drawImageActualSize() {
  can.width = this.naturalWidth;
  can.height = this.naturalHeight;

  ctx.drawImage(this, 0, 0, this.width, this.height);
  // canvas.appendChild(can)
  data = ctx.getImageData(0, 0, image.width, image.height);
  isLoaded = true;
  console.log("LOADED");
  init();
  animate();
}

function map(val, smin, smax, emin, emax) {
  const t = (val - smin) / (smax - smin);
  return (emax - emin) * t + emin;
}
const chopBottom = (geo, bottom) =>
  geo.vertices.forEach((v) => (v.y = Math.max(v.y, bottom)));
//randomly displace the x,y,z coords by the `per` value
const jitter = (geo, per) =>
  geo.vertices.forEach((v) => {
    v.x += map(Math.random(), 0, 1, -per, per);
    v.y += map(Math.random(), 0, 1, -per, per);
    v.z += map(Math.random(), 0, 1, -per, per);
  });

function makeCloud(scene, x, y, z) {
  const cloudGeo = new THREE.Geometry();
  let r = Math.random() * 5 + 5;
  const tuft1 = new THREE.SphereGeometry(1.5, r, 8);
  tuft1.translate(x - 2, y, z);
  cloudGeo.merge(tuft1);

  const tuft2 = new THREE.SphereGeometry(1.5, 7, r);
  tuft2.translate(x + 2, y, z);
  cloudGeo.merge(tuft2);

  const tuft3 = new THREE.SphereGeometry(2.0, r, 8);
  tuft3.translate(x, y, z);
  cloudGeo.merge(tuft3);

  cloudGeo.computeFlatVertexNormals();
  let cloud = new THREE.Mesh(
    cloudGeo,
    new THREE.MeshLambertMaterial({
      color: "white",
      flatShading: true,
    })
  );

  const cloudLight = new THREE.DirectionalLight(0xffffff, 0.1);
  cloudLight.position.set(x + 1, y + 1, z).normalize();
  // scene.add(cloudLight);
  // scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  const cloudLight2 = new THREE.DirectionalLight(0xff5566, 0.2);
  cloudLight2.position.set(x - 3, y - 1, z).normalize();
  // scene.add(cloudLight2);

  jitter(cloudGeo, 0.3);
  chopBottom(cloudGeo, y + 0.5);
  cloud.castShadow = true;
  scene.add(cloud);
  clouds.push(cloud);
  cloud.rotation.y = (Math.random() * Math.PI) / 2;
}

function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  // renderer.toneMapping = THREE.LinearToneMapping;
  canvas.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  // scene.background = new THREE.Color().setHSL( 0.6, 0, 1 );
  // scene.fog = new THREE.Fog( scene.background, 50, 500 );
  /**
   * Camera
   */
  // Base camera
  var SCREEN_WIDTH = window.innerWidth,
    SCREEN_HEIGHT = window.innerHeight;
  var VIEW_ANGLE = 45,
    ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,
    NEAR = 0.1,
    FAR = 10000;

  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  camera.position.set(0, 500, 0);
  camera.lookAt(scene.position);
  scene.add(camera);

  // Controls
  controls = new OrbitControls(camera, canvas);
  // controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 40.0;
  // controls.maxDistance = 2000.0;
  controls.enableDamping = true;
  //

  // LIGHTS

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  hemiLight.color.setHSL(0.6, 1, 0.6);
  hemiLight.groundColor.setHSL(0.095, 1, 0.75);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  const hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 10);
  scene.add(hemiLightHelper);

  //

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(-1, 1.75, 1);
  dirLight.position.multiplyScalar(30);
  scene.add(dirLight);

  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;

  const d = 50;

  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;

  dirLight.shadow.camera.far = 3500;
  dirLight.shadow.bias = -0.0001;

  const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10);
  scene.add(dirLightHelper);

  // GROUND

  const groundGeo = new THREE.PlaneGeometry(10000, 10000);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  groundMat.color.setHSL(0.095, 1, 0.75);

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -33;
  ground.rotation.x = -Math.PI / 2;
  // ground.receiveShadow = true;
  // scene.add(ground);

  // SKYDOME

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

  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  let lambert = new THREE.MeshLambertMaterial({
    // wireframe:true,
    vertexColors: THREE.VertexColors,
    //required for flat shading
    flatShading: true,
  });

  if (isLoaded) {
    console.log("here");
    const geo = new THREE.PlaneGeometry(
      data.width,
      data.height,
      data.width,
      data.height + 1
    );
    //assign vert data from the canvas
    for (let j = 0; j < data.height; j++) {
      for (let i = 0; i < data.width; i++) {
        const n = j * data.height + i;
        const nn = j * (data.height + 1) + i;
        const col = data.data[n * 4]; // the red channel
        const v1 = geo.vertices[nn];
        v1.z = map(col, 0, 255, 0, 10); //map from 0:255 to -10:10
        // if (v1.z > 5) v1.z = 5; //exaggerate the peaks
        // v1.x += map(Math.random(),0,1,-0.5,0.5) //jitter x
        // v1.y += map(Math.random(),0,1,-0.5,0.5) //jitter y
      }
    }

    geo.faces.forEach((f) => {
      //get three verts for the face

      const a = geo.vertices[f.a];
      const b = geo.vertices[f.b];
      const c = geo.vertices[f.c];

      //if average is below water, set to 0
      //alt: color transparent to show the underwater landscape
      const avgz = (a.z + b.z + c.z) / 3;
      if (avgz < 0) {
        a.z = 0;
        b.z = 0;
        c.z = 0;
      }
      //assign colors based on the highest point of the face
      const max = Math.max(a.z, Math.max(b.z, c.z));
      if (max <= 0) return f.color.set(0x44ccff);
      if (max <= 1.5) return f.color.set(0x228800);
      if (max <= 3.5) return f.color.set(0xeecc44);
      if (max <= 5) return f.color.set(0xcccccc);

      //otherwise, return white
      f.color.set("white");
    });
    geo.colorsNeedUpdate = true;
    geo.verticesNeedUpdate = true;
    //required for flat shading
    geo.computeFlatVertexNormals();
    var another = new THREE.Mesh(geo, lambert);
    another.rotation.x = -Math.PI / 2;
    // another.position.z = 0;
    another.receiveShadow = true;
    scene.add(another);
    another.geometry.computeBoundingBox();
    for (let num = 0; num <= 5; num++) {
      // let x = Math.random() * data.width;
      // let y = Math.random() * data.height;
      // let z = Math.random() * 300;
      let x = data.width * Math.random() - data.width / 2;
      let y = data.height * Math.random() - data.height / 2;
      makeCloud(scene, x, Math.random() * 70, y);
    }
  }

  //STATS
  stats = new Stats();
  canvas.appendChild(stats.dom);

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

  // mesh.position.y = Math.sin(time) * 20 + 5;
  // mesh.rotation.x = time * 0.5;
  // mesh.rotation.z = time * 0.51;

  // clouds.forEach((cloud) => {
  //   cloud.position.x=Math.sin(time) *THREE.Noise
  //   cloud.position.z=Math.cos(time) *Math.random()
  // });
  renderer.render(scene, camera);
}
