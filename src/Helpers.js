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

  
function setCol(colors, index, c1, c2, c3) {
    colors.setXYZ(index + 0, c1, c2, c3);
    colors.setXYZ(index + 1, c1, c2, c3);
    colors.setXYZ(index + 2, c1, c2, c3);
  }


  export {map, setCol as setFaceCol, makeCloud, chopBottom, jitter};