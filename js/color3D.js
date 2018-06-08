/*eslint-env browser*/
/*global window, XMLHttpRequest, event */

var appColViewer = void 0;
var THREE = THREE || {};
var chroma = chroma || {};
var ColorViewer = function () {
    "use strict";
    var frameCount = 0, camera, scena, radice, renderer, vicino = 1, lontano = 200,
        urlColori = "https://unpkg.com/color-name-list/dist/colornames.json",
        spriteCerchio = "img/punto1.png",
        coloreSfondo = "#d4d4d4",
        listaColori, lastTime, fps, delta = 0, oldTime = 0,
        vec = new THREE.Vector3(0,0,0), trackPoints = [],
        overlay, nomeColore, codColore, targaColore, cerchioColore,// entità HTML
        projector, mouseVector, canvasMouseVector, raycaster, intersects,
        intersection, controls, nuvola, particleSystem, spritePunto, trackedVert = 0,
        dimensionePunto = 2, mLMS = new THREE.Matrix3(), mRGB = new THREE.Matrix3();
    
    mLMS.set(17.8824, 43.5161, 4.1193,
        3.4557, 27.1554, 3.8671,
        0.02996, 0.18431, 1.4670);
    mRGB.getInverse(mLMS);
    
    function generaNuvola(lista) {
        listaColori = lista;
        var numPoints = listaColori.length;
        var indices = new Uint16Array(numPoints);
        var positions = new Float32Array(numPoints * 3);
        var colors = new Float32Array(numPoints * 3);
        var sizes = new Float32Array(numPoints);
        var k = 0;
        nuvola = new THREE.BufferGeometry();
        var materiale = new THREE.PointsMaterial({
            vertexColors: THREE.VertexColors,
            //size: dimensionePunto,
            size: 10,
            sizeAttenuation: false,
            map: spritePunto,
            transparent: true,
            depthWrite: true,
            depthTest: true
        });

        listaColori.forEach(function (colore) {
            // CHROMA
            // http://gka.github.io/chroma.js/
            var componenti = chroma(colore.hex).rgb(),
                pX = componenti[0],
                pY = componenti[1],
                pZ = componenti[2];
            positions[3 * k] = ((pX / 256) - 0.5) * 100;
            positions[3 * k + 1] = ((pY / 256) - 0.5) * 100;
            positions[3 * k + 2] = ((pZ / 256) - 0.5) * 100;

            colors[3 * k] = (pX / 256);
            colors[3 * k + 1] = (pY / 256);
            colors[3 * k + 2] = (pZ / 256);
            sizes[k] = dimensionePunto * 0.5;
            indices[k] = k;
            k += 1;
        });
        nuvola.addAttribute("position", new THREE.BufferAttribute(positions, 3));
        nuvola.addAttribute("color", new THREE.BufferAttribute(colors, 3));
        nuvola.addAttribute("size", new THREE.BufferAttribute(sizes, 1));
        nuvola.computeBoundingSphere();
        nuvola.setIndex(new THREE.BufferAttribute(indices, 1));
        particleSystem = new THREE.Points(nuvola, materiale);
        particleSystem.name = "colori";
        scena.add(particleSystem);
    }


    function status(response) {
        if (response.status >= 200 && response.status < 300) {
            return Promise.resolve(response);
        } else {
            return Promise.reject(new Error(response.statusText));
        }
    }


    function onMouseMove(e) {
        e.preventDefault();
        mouseVector.x = 2 * (e.clientX / window.innerWidth) - 1;
        mouseVector.y = 1 - 2 * (e.clientY / window.innerHeight);
        canvasMouseVector.x = e.clientX;
        canvasMouseVector.y = e.clientY;
    }
    
    function reverseTrackPoint(vert=trackedVert) {
        let x = particleSystem.geometry.attributes.position.getX(vert);
        let y = particleSystem.geometry.attributes.position.getY(vert);
        let z = particleSystem.geometry.attributes.position.getZ(vert);
        vec.fromArray([x, y, z]);
        vec.project(camera);
        vec.x = Math.round((vec.x + 1) / 2 * window.innerWidth);
        vec.y = Math.round(-(vec.y - 1) / 2 * window.innerHeight);
    }

    function castRay() {
        raycaster.setFromCamera(mouseVector, camera);
        intersects = raycaster.intersectObject(particleSystem);
        //window.console.log('intersections: ' + intersects.length);
        intersection = ( intersects.length ) > 0 ? intersects[ 0 ] : null;
        
        if (intersection !== null) {
            trackedVert = intersection.index;
            reverseTrackPoint();        
            var indice = intersects[0].index;
            var colore = listaColori[indice].name;
            var colhex = listaColori[indice].hex;
            nomeColore.innerText = colore;
            codColore.innerText = colhex;
            targaColore.style.background = colhex;
            targaColore.style.left = vec.x + 10 + "px";
            targaColore.style.top = vec.y + 15 + "px";
            cerchioColore.style.left = vec.x -25 + "px";
            cerchioColore.style.top = vec.y -30 + "px";
            cerchioColore.style.borderColor = colhex;
        } else {
            reverseTrackPoint();
            targaColore.style.left = vec.x + 10 + "px";
            targaColore.style.top = vec.y + 15 + "px";
            cerchioColore.style.left = vec.x -25 + "px";
            cerchioColore.style.top = vec.y -30 + "px";
        }
    }
    
    function onWindowResize() {
        var width = window.innerWidth, height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function init() {
        scena = new THREE.Scene();
        scena.background = new THREE.Color(coloreSfondo);
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, vicino, lontano);
        camera.position.set(-10, 30, -130);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        radice = new THREE.Object3D();
        renderer = new THREE.WebGLRenderer({
            logging: true,
            antialias: true});
        renderer.setSize(window.innerWidth -10, window.innerHeight -10);
        projector = new THREE.Projector();
        mouseVector = new THREE.Vector2();
        canvasMouseVector = new THREE.Vector2();
        raycaster = new THREE.Raycaster();
        raycaster.params.Points.threshold = 0.5;
        window.addEventListener("mousemove", onMouseMove, false);
        window.addEventListener("resize", onWindowResize, false);
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.75;
        controls.enableZoom = true;
        controls.zoomSpeed = 0.3;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.1;
        controls.maxDistance = 175;
        controls.maxPolarAngle = Math.PI * 4;
        controls.maxAzimuthAngle = Infinity;
        controls.minAzimuthAngle = -Infinity;
        overlay = document.createElement("div");
        overlay.id = "overlay";
        var over = document.body.appendChild(overlay);
        
        targaColore = document.createElement("div");
        nomeColore = document.createElement("div");
        codColore = document.createElement("div");
        cerchioColore = document.createElement("div");
        targaColore.className = "targaColore";
        nomeColore.className = "nomeColore";
        codColore.className = "codColore";
        cerchioColore.className = "cerchioColore";
        
        var tar = over.appendChild(targaColore);
        tar.appendChild(nomeColore);
        tar.appendChild(codColore);
        over.appendChild(cerchioColore);
        document.body.appendChild(renderer.domElement);
    }

    function loadAssets() {
        spritePunto = new THREE.TextureLoader().load(spriteCerchio);		
        fetch(urlColori)
            .then(response => response.json())
            .then(data => generaNuvola(data))
            .catch(function(error) {
                window.console.log("Request failed", error);
            });
    }

    function mainLoop() {
        window.requestAnimationFrame(mainLoop);
        render();
    }
    
    function render() {
        if(particleSystem !== undefined) {
            castRay();
        }
        renderer.render(scena, camera);
        controls.update();
    }
    
    function getScena() {
        return scena;
    }
    
    function LMS(rgb) {
        return rgb.applyMatrix3(mLMS);
    }
    
    function RGB(lms) {
        return lms.applyMatrix3(mRGB);
    }

    return {
        init: init,
        loadAssets: loadAssets,
        mainLoop: mainLoop,
        scena: getScena
    };
};

window.onload = function init() {
    "use strict";
    appColViewer = new ColorViewer();
    appColViewer.loadAssets();
    appColViewer.init();
    appColViewer.mainLoop();
};
