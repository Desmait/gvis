var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight);
var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth - 50, window.innerHeight - 50);
document.body.appendChild(renderer.domElement);

const gridHelper = new THREE.GridHelper(210, 20);
scene.add(gridHelper);

const materialPull = {
    'SKIRT': {r:75, g:0, b:0.51},
    'SKIN': {r:75, g:0, b:0.51},
    'WALL-INNER': {r:255, g:215, b:0.00},
    'WALL-OUTER': {r:255, g:215, b:0.00},
    'SUPPORT': {r:0, g:0, b:1.00},
    'SUPPORT-INTERFACE': {r:0, g:0, b:1.00},
    'FILL': {r:255, g:0, b:0.00}
}

const controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.7;
controls.screenSpacePanning = false;
controls.minDistance = 10;
controls.maxDistance = 1000;

camera.position.set(0, 200, 200);

const material = new THREE.LineMaterial( {
    // color: 0x0000ff,
    // linewidth: 5,
    vertexColors: true,
    alphaToCoverage: true,
    worldUnits : true,
    onBeforeCompile: shader => {
        shader.vertexShader = `
            ${shader.vertexShader}
        `.replace(`uniform float linewidth;`, `attribute float linewidth;`);
        // console.log(shader.vertexShader)
    }
} );

const extrudeFactor = 11;

document.getElementById('file').onchange = function() {

    var file = this.files[0];
    let result = [];
    let z = 0;
    let e = 0;
    let color = 'SKIRT';
    let centerObj = {};

    var reader = new FileReader();
    reader.onload = function(progressEvent) {
        var lines = this.result.split('\n');
        for(var line = 0; line < lines.length; line++) {

            let commands = lines[line].split(" ");

            if (commands[0].slice(0, 4) === ';MIN') {
                commands[0] = commands[0].replace(/\r/g, '');

                switch (commands[0].charAt(4)) {
                    case 'X':
                        centerObj.minX = parseFloat(commands[0].substring(6));
                        break;
                    case 'Y':
                        centerObj.minY = parseFloat(commands[0].substring(6));
                        break;
                    default:
                        break;
                }
            } else if (commands[0].slice(0, 4) === ';MAX') {
                commands[0] = commands[0].replace(/\r/g, '');

                switch (commands[0].charAt(4)) {
                    case 'X':
                        centerObj.maxX = parseFloat(commands[0].substring(6));
                        break;
                    case 'Y':
                        centerObj.maxY = parseFloat(commands[0].substring(6));
                        break;
                    case 'Z':
                        centerObj.maxZ = parseFloat(commands[0].substring(6));
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

                    result.push(obj);
                    // console.log(obj);
                }
            }

        }

        let centerX = (centerObj.maxX - centerObj.minX) / 2 + centerObj.minX;
        let centerY = (centerObj.maxY - centerObj.minY) / 2 + centerObj.minY;
        let centerZ = centerObj.maxZ / 2;

        const points = [0, 0, 0];
        const widths = [];
        const colors = [];

        let lastPoint;

        result.forEach(obj => {
            let x = obj.x - centerX;
            let y = obj.y - centerY;

            points.push(x, obj.z, -y);

            colors.push(materialPull[obj.color].r, materialPull[obj.color].g, materialPull[obj.color].b);

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
        });
        const geometry = new THREE.LineGeometry()
        geometry.setPositions(points);
        geometry.setColors(colors);
        geometry.setAttribute("linewidth", new THREE.InstancedBufferAttribute(new Float32Array(widths), 1));

        const renderLine = new THREE.Line2(geometry, material);

        // renderLine.computeLineDistances();
        // renderLine.scale.set( 1, 1, 1 );

        scene.add(renderLine);
    };

    reader.readAsText(file);
};

renderer.setAnimationLoop( _ => {
    controls.update();
    // material.resolution.set(innerWidth, innerHeight);
    renderer.render(scene, camera);
});

function calculateLength(p1, p2) {
    var a = p2.x - p1.x;
    var b = p2.y - p1.y;
    var c = p2.z - p1.z;

    return Math.sqrt(a * a + b * b + c * c);
}