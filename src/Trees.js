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

const params = {
  x: 0,
  y: 0,
  z: 0,
};

class Trees {
  constructor(posArray, scene, gui) {
    this.num = posArray.length;
    this.posArray = posArray;
    this.mesh = null;
    this.trees = [];
    this.gui = gui;
    this.name = "TREES";
    this.scene = scene;
    this.gui.add(params, "x", -100, 100.0, 0.1).onChange(() => {
      this.update();
    });
    this.gui.add(params, "y", -100, 100.0, 0.1).onChange(() => this.update());
    this.gui.add(params, "z", -100, 100.0, 0.1).onChange(() => this.update());
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
  update() {
    this.mesh.position.x =  params.x;
    this.mesh.position.y =  params.y;
    this.mesh.position.z =  params.z;
  }

  loadGeometry(geo, scene) {
    let m = new MeshStandardMaterial({ color: "blue", flatShading: true });
    geo.computeVertexNormals();
    console.time("(build trees)");

    const matrix = new Matrix4();
    const mesh = new InstancedMesh(geo, m, this.num);

    for (let i = 0; i < this.num; i++) {
      this.randomizeMatrix(this.posArray[i], matrix);
      mesh.setMatrixAt(i, matrix);
      mesh.name = this.name;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
    }

    // mesh.position.x = mesh.position.x+ params.x;
    // mesh.position.y = mesh.position.y+ params.y;
    // mesh.position.z = mesh.position.z+ params.z;

    scene.add(mesh);
    console.log(scene);

    this.mesh = mesh;
    // const geometryByteLength = this.getGeometryByteLength(geo);
    console.timeEnd("(build trees)");
  }

  randomizeMatrix(pos, matrix) {
    const rotation = new Euler();
    const quaternion = new Quaternion();
    const scale = new Vector3();

    rotation.x = Math.PI / 2;
    // rotation.y = Math.random() * 2 * Math.PI;
    // rotation.z = Math.random() * 2 * Math.PI;

    quaternion.setFromEuler(rotation);
    pos.multiplyScalar(1000);
    pos.x += -50;
    pos.y -= 20;
    pos.z += -24;
    scale.x = scale.y = scale.z = 1;
    matrix.compose(pos, quaternion, scale);
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
      meshes.push(object);
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

export { Trees };
