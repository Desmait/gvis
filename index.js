var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight);
var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setSize(window.innerWidth - 50, window.innerHeight - 50);
renderer.setClearColor( 0xffffff, 0 );
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
    let fileName = 'File Name';

    var reader = new FileReader();
    reader.fileName = file.name;
    reader.onload = function(progressEvent) {
        fileName = progressEvent.target.fileName;
        var lines = this.result.split('\n');
        for(var line = 0; line < lines.length; line++) {

            let commands = lines[line].split(" ");

            if (commands[0].slice(0, 5) === ';TIME' || commands[0].slice(0, 7) === ';FLAVOR'
                || commands[0].slice(0, 9) === ';Filament' || commands[0].slice(0, 10) === ';Generated'
                || commands[0].slice(0, 6) === ';Layer') {
                commands[0] = commands[0].replace(/\r/g, '');

                let tempStr = commands[0].substring(1).substring(0, commands[0].substring(1).indexOf(':')) ?
                    commands[0].substring(1).substring(0, commands[0].substring(1).indexOf(':')) : commands[0].substring(1);

                switch (tempStr) {
                    case 'TIME':
                        objInfo.time = new Date(commands[0].substring(6) * 1000).toISOString().substr(11, 8);
                        break;
                    case 'Filament':
                        objInfo.filamentUsed = lines[line].substring(16).replace(/\r/g, '');
                        objInfo.filamentUsed = objInfo.filamentUsed.slice(0, objInfo.filamentUsed.length - 1);
                        objInfo.filamentUsed = parseFloat(objInfo.filamentUsed) * 100;
                        break;
                    case 'FLAVOR':
                        objInfo.flavor = commands[0].substring(8);
                        break;
                    case 'Generated':
                        objInfo.generatedWith = lines[line].substring(1).replace(/\r/g, '');
                        break;
                    case 'Layer':
                        objInfo.layerHeight = lines[line].substring(15).replace(/\r/g, '');
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

        centerX = (objInfo.MAXX - objInfo.MINX) / 2 + objInfo.MINX;
        centerY = (objInfo.MAXY - objInfo.MINY) / 2 + objInfo.MINY;
        objInfo.model_length = objInfo.MAXY - objInfo.MINY;
        objInfo.model_width = objInfo.MAXX - objInfo.MINX;
        objInfo.model_height = objInfo.MAXZ - objInfo.MINZ;
        objInfo.layers_quantity = layersHeights.length;
        objInfo.filament_weight = (objInfo.filament_used * Math.pow(0.175/2, 2) * Math.PI) * 1.25;
        objInfo.filament_weight = Math.round(objInfo.filament_weight) + 'g'
        objInfo.filament_used = (objInfo.filament_used.toFixed(0)) + 'cm';
        objInfo.model_name = fileName;

        addModelInfo(objInfo);

        startClip.constant = 0;
        endClip.constant = objInfo.model_height + 0.1;

        if (slider.noUiSlider !== undefined) {
            slider.noUiSlider.updateOptions({
                start: [1, layersHeights.length],
                range: {
                    'min': 1,
                    'max': layersHeights.length
                }
            });
        }

        renderModel();

        if (slider.noUiSlider === undefined) {
            noUiSlider.create(slider, {
                start: [1, layersHeights.length],
                connect: true,
                direction: 'rtl',
                orientation: 'vertical',
                step: 1,
                margin: 0,
                tooltips: true,
                range: {
                    'min': 1,
                    'max': layersHeights.length
                }
            });
        }

        slider.noUiSlider.on('update', () => {
            let values = slider.noUiSlider != undefined ? slider.noUiSlider.get() : [objInfo.minZ, objInfo.maxZ];
            startClip.constant = -(layersHeights[parseFloat(values[0])-1]- 0.1);
            endClip.constant = layersHeights[parseFloat(values[1])-1] + 0.1;
        });
    }

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
        let x = obj.x - centerX;
        let y = obj.y - centerY;

        points.push(x, obj.z, -y);

        colors.push(materialPool[obj.color].r, materialPool[obj.color].g, materialPool[obj.color].b);

        if (lastPoint == undefined) {
            lastPoint = obj;
        }

        let lineLength = calculateLength(lastPoint, obj);

        if (lineLength == 0 || obj.e <= 0 || !materialPool[obj.color].visibility) {
            widths.push(0);
        } else {
            widths.push(obj.e / lineLength * extrudeFactor);
        }

        lastPoint = obj;
    });

    const geometry = new THREE.LineGeometry()
    geometry.setPositions(points);
    geometry.setColors(colors);
    geometry.setAttribute("linewidth", new THREE.InstancedBufferAttribute(new Float32Array(widths), 1));

    const renderLine = new THREE.Line2(geometry, material);

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

function addModelInfo(objInfo) {
    let arr = document.querySelectorAll('.infoFields');
    for (let i = 0; i < arr.length; i++) {
        arr[i].innerHTML = objInfo[arr[i].id];
    }
}