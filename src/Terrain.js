import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { map, setCol } from "./Helpers";

export const MAP_NAME = "NZ-MAP";

export const p = {
  water: 0.0,
  sand: 0.01,
  grass: 0.3,
  rock: 0.5,
  snow: 0.7,
};

const pos = {
  x: 0,
  y: 21,
  z: 0,
};

class Terrain {
  constructor() {
    const SimplexNoise = require("simplex-noise");
    this.simplex = new SimplexNoise("myseed");
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

    model.traverse((o) => {
      console.log();
      if (o.type === "Mesh") {
        o.scale.set(1000, 1000, 1000);
        o.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));
        o.receiveShadow = true;
        o.castShadow = true;

        this.traverseMesh(o, scene);
        mesh = o;
        mesh.name = MAP_NAME;
        this.model = o;
      }
    });

    // scene.add(model);

    // const box = new THREE.BoxHelper(gltf.scene, 0xffff00);
    // scene.add(box);
  }

  traverseMesh(o, scene) {
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

        let val = this.simplex.noise3D(a, b, c);
        val = map(val, -1, 1, 0, 1);
        setCol(cols, i, val, val, val); // blue
        if (max <= p.water) setCol(cols, i, 0.0, 0.3, 1.0);
        // blue
        else if (max <= p.sand) setCol(cols, i, 1.0, 0.8, 0.3);
        // yellow
        else if (max <= p.grass) setCol(cols, i, 0.44, 0.7, 0.18);
        // green
        else if (max <= p.rock) setCol(cols, i, 0.3, 0.3, 0.3);
        // brown
        else setCol(cols, i, 0.92, 0.98, 0.98); // snow
      }
      let newMaterial = new THREE.MeshStandardMaterial({
        // wireframe: true,
        vertexColors: THREE.VertexColors,
        // required for flat shading
        flatShading: true,
      });
      o.material = newMaterial;
      scene.add(o);
    }
  }
}

export { Terrain, p as props };
