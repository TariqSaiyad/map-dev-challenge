import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {map, setFaceCol} from "./Helpers";

const terrainProps = {
  water: 0.0,
  sand:0.1,
  grass:0.3,
  rock:0.5,
  snow:0.7
}
function generateTerrain(scene, mainMesh){
    const loader = new GLTFLoader();
    loader.load(
      "assets/images/high.glb",
      function (gltf) {
        gltf.scene.scale.set(1000, 1000, 1000);
        gltf.scene.applyMatrix4(
          new THREE.Matrix4().makeTranslation(-1000, -500, -1000)
        );
  
        console.log(gltf.scene.position);
        gltf.scene.receiveShadow = true;
        gltf.scene.castShadow = true;
  
        var model = gltf.scene;
        let newMaterial = new THREE.MeshStandardMaterial({
          // wireframe: true,
          vertexColors: THREE.VertexColors,
          // required for flat shading
          flatShading: true,
        });
        model.traverse((o) => {
          if (o.isMesh) {
            mainMesh = o;
            o.geometry = o.geometry.toNonIndexed();
            const mGeo = o.geometry;
            let faces = mGeo.attributes.position.count;
            mGeo.setAttribute(
              "color",
              new THREE.BufferAttribute(new Float32Array(faces * 3), 3)
            );
            const color = new THREE.Color();
            const colors = mGeo.attributes.color;
            const positions = mGeo.attributes.position;
            for (let i = 0; i < colors.count; i += 3) {
              let a = positions.getY(i);
              let b = positions.getY(i + 1);
              let c = positions.getY(i + 2);
  
              //assign colors based on the highest point of the face
              let max = Math.max(a, Math.max(b, c));
              max = map(max, 0, 0.0493, 0, 1);
  
              if (max <= terrainProps.water) setFaceCol(colors, i, 0, 0.3, 1); // blue
              else if (max <= terrainProps.sand) setFaceCol(colors, i, 1, 0.8, 0.3); // yellow
              else if (max <= terrainProps.grass) setFaceCol(colors, i, 0, 0.6, 0.2); // green
              else if (max <= terrainProps.rock) setFaceCol(colors, i, 0.37, 0.29, 0.33); // brown
              else setFaceCol(colors, i, 1, 0.8, 1); // snow
            }
  
            o.material = newMaterial;
          }
        });
        scene.add(gltf.scene);
        // const box = new THREE.BoxHelper(gltf.scene, 0xffff00);
        // scene.add(box);
      },
      undefined,
      function (error) {
        console.error(error);
      }
    );

}


export {generateTerrain}