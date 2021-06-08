import {
  MeshStandardMaterial,
  TextureLoader,
  MeshPhongMaterial,
  Matrix4,
  InstancedMesh,
  Vector3,
  Euler,
  Quaternion,
  MeshToonMaterial,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
const WORLD_SIZE = 2000;

class Clouds {
  constructor(numClouds, scene) {
    this.numClouds = numClouds;
    this.mesh = null;
    this.clouds = [];
    this.name = "CLOUD";
    this.initMesh(scene);
  }

  initMesh(scene) {
    this.clean(scene);
    // make instances
    const loader = new GLTFLoader();
    loader.load(
      "assets/images/new-cloud.glb",
      (gltf) => this.loadGeometry(gltf.scene.children[0].geometry, scene),
      // (e) => console.log(`Loading ${e.total} vertices`),
      undefined,
      (error) => console.error(error)
    );
  }

  loadGeometry(geo, scene) {
    let m = new MeshStandardMaterial({ color: "white", flatShading: true });

    geo.computeVertexNormals();
    console.time("(build)");

    const matrix = new Matrix4();
    const mesh = new InstancedMesh(geo, m, this.numClouds);

    for (let i = 0; i < this.numClouds; i++) {
      this.randomizeMatrix(matrix);
      mesh.setMatrixAt(i, matrix);
      mesh.name = this.name;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
    }
    scene.add(mesh);
    this.mesh = mesh;
    // const geometryByteLength = this.getGeometryByteLength(geo);
    console.timeEnd("(build)");
  }

  randomizeMatrix(matrix) {
    const position = new Vector3();
    const rotation = new Euler();
    const quaternion = new Quaternion();
    const scale = new Vector3();

    position.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    position.y = Math.random() * 500 + 150;
    position.z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    // position.x = 0;
    // position.y = 300;
    // position.z = 0;

    rotation.x = Math.PI / 2;
    // rotation.y = Math.random() * 2 * Math.PI;
    // rotation.z = Math.random() * 2 * Math.PI;

    quaternion.setFromEuler(rotation);

    scale.x = Math.random() * 10 + 10;
    scale.y = Math.random() * 10 + 10;
    scale.z = Math.random() * 10 + 10;
    // scale.x = scale.y = scale.z = Math.random() * 0.02;

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
