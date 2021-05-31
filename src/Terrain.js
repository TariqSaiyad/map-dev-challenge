import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { map, setFaceCol as setCol } from "./Helpers";

export const p = {
  water: 0.0,
  sand: 0.01,
  grass: 0.3,
  rock: 0.5,
  snow: 0.7,
};

const pos = {
  x: -1000,
  y: -500,
  z: -1000,
};

class Terrain {
  constructor() {
    this.model = null;
  }

  generateTerrain(scene, mesh) {
    const loader = new GLTFLoader();
    loader.load(
      "assets/images/high.glb",
      (gltf) => this.loadGLTF(scene, gltf, mesh),
      // (e) => console.log(`Loading ${e.total} vertices`),
      undefined,
      (error) => console.error(error)
    );
  }

  loadGLTF(scene, gltf, mesh) {
    const { x, y, z } = pos;
    const model = gltf.scene;

    model.scale.set(1000, 1000, 1000);
    model.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));

    model.receiveShadow = true;
    model.castShadow = true;

    model.traverse((o) => {
      this.traverseMesh(o);
      mesh = o;
    });

    scene.add(model);
    this.model = model;

    // const box = new THREE.BoxHelper(gltf.scene, 0xffff00);
    // scene.add(box);
  }

  traverseMesh(o) {
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

      for (let i = 0; i < cols.count; i += 3) {
        // get vertex of this triangle.
        let a = positions.getY(i);
        let b = positions.getY(i + 1);
        let c = positions.getY(i + 2);

        //assign colors based on the highest point of the face
        let max = Math.max(a, Math.max(b, c));
        // map value between 0-1.
        max = map(max, 0, 0.0493, 0, 1);

        if (max <= p.water) setCol(cols, i, 0, 0.3, 1);
        // blue
        else if (max <= p.sand && i % 3 == 0) setCol(cols, i, 1, 0.8, 0.3);
        // yellow
        else if (max <= p.grass) setCol(cols, i, 0, 0.6, 0.2);
        // green
        else if (max <= p.rock) setCol(cols, i, 0.37, 0.29, 0.33);
        // brown
        else setCol(cols, i, 1, 0.8, 1); // snow
      }
      let newMaterial = new THREE.MeshStandardMaterial({
        // wireframe: true,
        vertexColors: THREE.VertexColors,
        // required for flat shading
        flatShading: true,
      });
      o.material = newMaterial;
    }
  }
}

export { Terrain, p as props };
