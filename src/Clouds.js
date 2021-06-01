import { AmbientLight, BoxHelper, TextureLoader } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const WORLD_SIZE = 8000;

class Clouds {
  constructor(numClouds, scene) {
    this.numClouds = 1;
    this.clouds = [];
    this.name = "CLOUD";
    this.initMesh(scene);
  }

  initMesh(scene) {
    this.clean(scene);
    // make instances
    const loader = new GLTFLoader();
    loader.load(
      "assets/images/cloud.glb",
      (gltf) =>
        this.loadGeometry(gltf.scene.children[0].children[0].geometry, scene),
      // (e) => console.log(`Loading ${e.total} vertices`),
      undefined,
      (error) => console.error(error)
    );
  }

  loadGeometry(geo, scene) {
 
    let tex = new TextureLoader().load("assets/images/waternormals.jpg");
    let material = new THREE.MeshStandardMaterial({
    //   color: 0x552811,
      specular: 0x222222,
      shininess: 25,
      normalMap: tex,
      refractionRatio: 0.98,
      reflectivity: 0.9,
      flatShading: true,
        displacementScale:10,
        normalScale: THREE.Vector2(10, 10),
        bumpMap: tex,
        bumpScale: 12,
    });

    // let newgeo = new THREE.SphereGeometry(1000,100,100);

    geo.computeVertexNormals();
    console.time("(build)");

    const matrix = new THREE.Matrix4();
    const mesh = new THREE.InstancedMesh(geo, material, this.numClouds);

    for (let i = 0; i < this.numClouds; i++) {
      this.randomizeMatrix(matrix);
      mesh.setMatrixAt(i, matrix);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
    }
    

    scene.add(mesh);

    // const geometryByteLength = this.getGeometryByteLength(geo);
    console.timeEnd("(build)");
  }

  randomizeMatrix(matrix) {
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    // position.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    // position.y = Math.random() * 500 + 50;
    // position.z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    position.x = 0;
    position.y = 300;
    position.z = 0;

    rotation.x = Math.PI / 2;
    // rotation.y = Math.random() * 2 * Math.PI;
    // rotation.z = Math.random() * 2 * Math.PI;

    quaternion.setFromEuler(rotation);

    scale.x = scale.y = scale.z = 0.03;
    // scale.x = scale.y = scale.z = Math.random() * 0.03;

    matrix.compose(position, quaternion, scale);
  }

  getGeometryByteLength(geo) {
    let total = 0;
    if (geo.index) total += geo.index.array.byteLength;
    for (const name in geo.attributes) {
      total += geo.attributes[name].array.byteLength;
    }
    return total;
  }

  generateClouds() {}

  /**
   * Remove all clouds from scene and dispose their geometries
   * @param {*} scene The renderer scene object
   */
  clean(scene) {
    let meshes = [];

    scene.traverse(function (object) {
      if (object.isMesh) meshes.push(object);
    });

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      if (mesh.name === this.name) {
        mesh.material.dispose();
        mesh.geometry.dispose();
        scene.remove(mesh);
      }
    }
  }
}

export { Clouds };
