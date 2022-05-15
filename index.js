var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight);
var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth - 50, window.innerHeight - 50);
document.body.appendChild(renderer.domElement);

const gridHelper = new THREE.GridHelper(210, 20);
scene.add(gridHelper);

const materialPool = {
    'SKIRT': {r:75, g:0, b:0.51, visibility: true},
    'SKIN': {r:75, g:0, b:0.51, visibility: true},
    'WALL-INNER': {r:255, g:215, b:0.00, visibility: true},
    'WALL-OUTER': {r:255, g:215, b:0.00, visibility: true},
    'SUPPORT': {r:0, g:0, b:1.00, visibility: true},
    'SUPPORT-INTERFACE': {r:0, g:0, b:1.00, visibility: true},
    'FILL': {r:255, g:0, b:0.00, visibility: true}
}

const controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.7;
controls.screenSpacePanning = false;
controls.minDistance = 10;
controls.maxDistance = 1000;

camera.position.set(0, 200, 200);

const startClip = new THREE.Plane( new THREE.Vector3( 0, 1, 0 ), -0 );
const endClip = new THREE.Plane( new THREE.Vector3( 0, -1, 0 ), 0 );

renderer.localClippingEnabled = true;

const material = new THREE.LineMaterial( {
    // color: 0x0000ff,
    // linewidth: 5,
    vertexColors: true,
    alphaToCoverage: true,
    worldUnits : true,
    clippingPlanes: [startClip, endClip],
    onBeforeCompile: shader => {
        shader.vertexShader = `
            ${shader.vertexShader}
        `.replace(`uniform float linewidth;`, `attribute float linewidth;`);
    }
} );

let extrudeFactor = 11;

var slider = document.getElementById('slider');

let result = [];
let centerX = 0;
let centerY = 0;


document.getElementById('file').onchange = function() {

    clearScene();

    var file = this.files[0];
    result = [];
    let z = 0;
    let e = 0;
    let color = 'SKIRT';
    let objInfo = {};
    let layersHeights = [];

    var reader = new FileReader();
    reader.onload = function(progressEvent) {
        var lines = this.result.split('\n');
        for(var line = 0; line < lines.length; line++) {

            let commands = lines[line].split(" ");

            if (commands[0].slice(0, 5) === ';TIME' || commands[0].slice(0, 7) === ';FLAVOR'
                || commands[0].slice(0, 9) === ';Filament' || commands[0].slice(0, 10) === ';Generated') {
                commands[0] = commands[0].replace(/\r/g, '');

                let tempStr = commands[0].substring(1).substring(0, commands[0].substring(1).indexOf(':')) ?
                    commands[0].substring(1).substring(0, commands[0].substring(1).indexOf(':')) : commands[0].substring(1);

                switch (tempStr) {
                    case 'TIME':
                        objInfo.time = new Date(commands[0].substring(6) * 1000).toISOString().substr(11, 8);
                        break;
                    case 'Filament':
                        objInfo.filamentUsed = lines[line].substring(16).replace(/\r/g, '');
                        break;
                    case 'FLAVOR':
                        objInfo.flavor = commands[0].substring(8);
                        break;
                    case 'Generated':
                        objInfo.generatedWith = lines[line].substring(1).replace(/\r/g, '');
                        break;
                    default:
                        break;
                }
            } else if (commands[0].slice(0, 4) === ';MIN') {
                commands[0] = commands[0].replace(/\r/g, '');
                let tempRez = parseFloat(commands[0].substring(6));

                switch (commands[0].charAt(4)) {
                    case 'X':
                        objInfo.minX = tempRez;
                        break;
                    case 'Y':
                        objInfo.minY = tempRez;
                        break;
                    case 'Z':
                        objInfo.minZ = tempRez;
                        break;
                    default:
                        break;
                }
            } else if (commands[0].slice(0, 4) === ';MAX') {
                commands[0] = commands[0].replace(/\r/g, '');
                let tempRez = parseFloat(commands[0].substring(6));

                switch (commands[0].charAt(4)) {
                    case 'X':
                        objInfo.maxX = tempRez;
                        break;
                    case 'Y':
                        objInfo.maxY = tempRez;
                        break;
                    case 'Z':
                        objInfo.maxZ = tempRez;
                        break;
                    default:
                        break;
                }
            } else if (commands[0].slice(0, 6) === ';TYPE:') {
                commands[0] = commands[0].replace(/\r/g, '');

                color = commands[0].substring(6).toString();

            } else if (commands[0] === 'G1' || commands[0] === 'G0') {
                let obj = {};
                obj.e = 0;

                for (let i = 1; i < commands.length; i++) {
                    commands[i] = commands[i].replace(/\r/g, '');
                    switch (commands[i].charAt(0)) {
                        case 'X':
                            obj.x = commands[i].substring(1);
                            break;
                        case 'Y':
                            obj.y = commands[i].substring(1);
                            break;
                        case 'Z':
                            z = commands[i].substring(1);
                            break;
                        case 'E':
                            var previousE = e;
                            var tempE = commands[i].substring(1)

                            if (tempE !== '') {
                                e = tempE;
                                obj.e = e - previousE;
                            } else {
                                obj.e = 0;
                            }

                            break;
                        default:
                            break;
                    }
                }

                if (obj.x && obj.y && z !== '') {
                    obj.z = z;
                    obj.color = color;

                    if (layersHeights.indexOf(z) === -1) {
                        layersHeights.push(z);
                    }

                    result.push(obj);
                }
            }

        }

        layersHeights.splice(0, 3);
        layersHeights = layersHeights.map(Number);

        centerX = (objInfo.maxX - objInfo.minX) / 2 + objInfo.minX;
        centerY = (objInfo.maxY - objInfo.minY) / 2 + objInfo.minY;
        objInfo.modelLenght = objInfo.maxY - objInfo.minY;
        objInfo.modelWidth = objInfo.maxX - objInfo.minX;
        objInfo.modelHeight = objInfo.maxZ - objInfo.minZ;
        objInfo.layersQuantity = layersHeights.length;

        startClip.constant = 0;
        endClip.constant = objInfo.modelHeight + 0.1;

        if (slider.noUiSlider !== undefined) {
            slider.noUiSlider.updateOptions({
                start: [0, layersHeights.length],
                range: {
                    'min': 0,
                    'max': layersHeights.length
                }
            });
        }

        renderModel();

        if (slider.noUiSlider === undefined) {
            noUiSlider.create(slider, {
                start: [0, layersHeights.length],
                connect: true,
                step: 1,
                range: {
                    'min': 0,
                    'max': layersHeights.length
                }
            });
        }

        slider.noUiSlider.on('update', () => {
            let values = slider.noUiSlider != undefined ? slider.noUiSlider.get() : [objInfo.minZ, objInfo.maxZ];
            console.log()
            startClip.constant = -(layersHeights[parseFloat(values[0])]- 0.1);
            endClip.constant = layersHeights[parseFloat(values[1])] + 0.1;
        });
    };

    reader.readAsText(file);
};

renderer.setAnimationLoop( _ => {
    controls.update();
    renderer.render(scene, camera);
});

function calculateLength(p1, p2) {
    var a = p2.x - p1.x;
    var b = p2.y - p1.y;
    var c = p2.z - p1.z;

    return Math.sqrt(a * a + b * b + c * c);
}

function clearScene() {
    scene.remove.apply(scene, scene.children);
    scene.add(gridHelper);
}

function renderModel() {
    clearScene();
    let points = [0, 0, 0];
    let widths = [];
    let colors = [];

    let lastPoint;

    result.forEach(obj => {
        if (materialPool[obj.color].visibility) {
            let x = obj.x - centerX;
            let y = obj.y - centerY;

            points.push(x, obj.z, -y);

            colors.push(materialPool[obj.color].r, materialPool[obj.color].g, materialPool[obj.color].b);

            if (lastPoint == undefined) {
                lastPoint = obj;
            }

            let lineLength = calculateLength(lastPoint, obj);

            if (lineLength == 0 || obj.e <= 0) {
                widths.push(0);
            } else {
                widths.push(obj.e / lineLength * extrudeFactor);
            }

            lastPoint = obj;
        }
    });

    const geometry = new THREE.LineGeometry()
    geometry.setPositions(points);
    geometry.setColors(colors);
    geometry.setAttribute("linewidth", new THREE.InstancedBufferAttribute(new Float32Array(widths), 1));

    const renderLine = new THREE.Line2(geometry, material);

    // renderLine.computeLineDistances();
    // renderLine.scale.set( 1, 1, 1 );

    scene.add(renderLine);
}

function handleClick(cb) {
    if (cb.checked) {
        extrudeFactor = 1;
    } else {
        extrudeFactor = 11;
    }

    if (result.length !== 0) {
        renderModel();
    }
}

function changeVisibility(type) {
    materialPool[type].visibility = !materialPool[type].visibility;

    if (result.length !== 0) {
        renderModel();
    }
}