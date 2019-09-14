/*eslint-env browser*/
/*global window, XMLHttpRequest, event */

var appColViewer = void 0;
var THREE = THREE || {};
var chroma = chroma || {};
var ColorViewer = function () {
    "use strict";
    var camera, scena, radice, renderer, vicino = 1, lontano = 10000,
        urlColori = "https://unpkg.com/color-name-list/dist/colornames.json",
        //urlColori = "data/colors.json",
        spriteCerchio = "img/punto1.png",
        coloreSfondo = "#d4d4d4",
        windowBorder = 8,
        listaColori, trackPoints = new Map(),
        over, // entità HTML
        projector, mouseVector, raycaster, intersects,
        mouseDown = false,
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
            size: 3,
            sizeAttenuation: true,
            map: spritePunto,
            // discarding alpha value and clipping at 0.1
            blending: THREE.NormalBlending, //THREE.NoBlending,            
            alphaTest: 0.10,
            transparent: true,
            opacity: 0.8,
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

    function onMouseMove(e) {
        e.preventDefault();
        mouseVector.x = 2 * (e.clientX / window.innerWidth) - 1;
        mouseVector.y = 1 - 2 * (e.clientY / window.innerHeight);
    }
    
    function onMouseDown(e) {
        e.preventDefault();
        mouseDown = true;
        // TODO: test wether pointer is under the mouse
    }

    function onMouseUp(e) {
        e.preventDefault();
        mouseDown = false;
    }
    
    function reverseTrackPoint(vert=trackedVert) {
        let x = particleSystem.geometry.attributes.position.getX(vert);
        let y = particleSystem.geometry.attributes.position.getY(vert);
        let z = particleSystem.geometry.attributes.position.getZ(vert);
        let vec = new THREE.Vector3(x, y, z);
        vec.project(camera);
        vec.x = Math.round((vec.x + 1) / 2 * window.innerWidth);
        vec.y = Math.round(-(vec.y - 1) / 2 * window.innerHeight);
        return vec;
    }

    function castRay() {
        raycaster.setFromCamera(mouseVector, camera);
        intersects = raycaster.intersectObject(particleSystem);
        intersection = ( intersects.length ) > 0 ? intersects[ 0 ] : null;
        
        if (intersection !== null) {
            if (mouseDown) {
                if (trackPoints.has(intersection.index)) {
                    removeTrackPoint(intersection.index);
                    return; 
                } else {
                    addTrackPoint(intersection.index);   
                }
            }
        }
    }
    
    function addTrackPoint(indexT) {
        let tp = {};
        let vec = reverseTrackPoint(indexT);  
        //trackPoint DOM elements
        tp.targaColore = document.createElement("div");
        tp.nomeColore = document.createElement("div");
        tp.codColore = document.createElement("div");
        tp.cerchioColore = document.createElement("div");
        tp.targaColore.className = "targaColore i" + indexT;
        tp.nomeColore.className = "nomeColore";
        tp.codColore.className = "codColore";
        tp.cerchioColore.className = "cerchioColore i" + indexT;
        let colhex = listaColori[indexT].hex;
        tp.targaColore.style.background = colhex;
        tp.targaColore.style.left = vec.x + 10 + "px";
        tp.targaColore.style.top = vec.y + 15 + "px";
        tp.cerchioColore.style.left = vec.x -25 + "px";
        tp.cerchioColore.style.top = vec.y -30 + "px";
        tp.cerchioColore.style.borderColor = colhex;
        tp.nomeColore.innerText = listaColori[indexT].name;
        tp.codColore.innerText = colhex;
        let tar = over.appendChild(tp.targaColore);
        tar.appendChild(tp.nomeColore);
        tar.appendChild(tp.codColore);
        over.appendChild(tp.cerchioColore);
        trackPoints.set(indexT,tp);
    }
    
    function addPointer() {
        let vec = new THREE.Vector2(10, 10);  
        //Pointer DOM elements
        let size = windowSized();
        let pointer = document.createElement("div");
        pointer.className = "pointerColore";
        pointer.style.left = size[0]/3 + "px";
        pointer.style.top = size[1]/3 + "px";
        pointer.style.borderColor = coloreSfondo;
        over.appendChild(pointer);
        //update pointer position
    }
    
    function removeTrackPoint(indexT) {
        let tp = trackPoints.get(indexT);
        // remove DOM elements
        tp.codColore.remove();
        tp.nomeColore.remove();
        tp.cerchioColore.remove();
        tp.targaColore.remove();
        trackPoints.delete(indexT);
    }
    
    function renderTrackPoints() {
        trackPoints.forEach(renderTrackPoint);
    }
    
    function renderTrackPoint(tp, indexT) {
        let vec = reverseTrackPoint(indexT);
        tp.targaColore.style.left = vec.x + 10 + "px";
        tp.targaColore.style.top = vec.y + 10 + "px";
        tp.cerchioColore.style.left = vec.x -17 + "px";
        tp.cerchioColore.style.top = vec.y -27 + "px";
    }
    
    function windowSized() {
        return [window.innerWidth - 2 * windowBorder, window.innerHeight - 2 * windowBorder];
    }
    
    function onWindowResize() {
        let size = windowSized();
        let width = size[0], height = size[1];
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
        radice;
        renderer = new THREE.WebGLRenderer({
            logging: true,
            antialias: true,
            // rotating the scene will cause glitches of transparent textures
            // I therefore disable alpha blending in order to treat each
            // texture ad opaque, and enable aplha test discarding what is
            // not completely opaque.
            sortObjects: true});
        let size = windowSized();
        renderer.setSize(size[0],size[1]);
        renderer.domElement.style.paddingTop = windowBorder + "px";
        renderer.domElement.style.paddingLeft = windowBorder + "px";
        projector = new THREE.Projector();
        projector;
        mouseVector = new THREE.Vector2();
        raycaster = new THREE.Raycaster();
        raycaster.params.Points.threshold = 0.5;
        window.addEventListener("mousemove", onMouseMove, false);
        window.addEventListener("mousedown", onMouseDown, false);
        window.addEventListener("mouseup", onMouseUp, false);
        //window.addEventListener("touchstart", onMouseDown, false);
        //window.addEventListener("touchend", onMouseUp, false);
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
        let overlay = document.createElement("div");
        overlay.id = "overlay";
        //overlay.style.paddingTop = windowBorder + "px";
        //overlay.style.paddingLeft = windowBorder + "px";
        over = document.body.appendChild(overlay);
        document.body.appendChild(renderer.domElement);
        //addPointer();
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
        render();        
        window.requestAnimationFrame(mainLoop);
    }
    
    function render() {
        if(particleSystem !== undefined) {
            castRay();
        }
        renderTrackPoints();
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
    
    function removeGammaCorrection(rgb) {
        rgb.convertGammaToLinear();
    }

    return {
        init: init,
        loadAssets: loadAssets,
        mainLoop: mainLoop,
        scena: getScena,
        trackPoints: trackPoints
    };
};

window.onload = function init() {
    "use strict";
    appColViewer = new ColorViewer();
    appColViewer.loadAssets();
    appColViewer.init();
    appColViewer.mainLoop();
};
