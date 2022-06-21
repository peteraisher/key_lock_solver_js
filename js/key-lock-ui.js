const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
const renderer = new THREE.WebGLRenderer({ antialias:true,
                                           devicePixelRatio: window.devicePixelRatio || 1
                                        });

const clock = new THREE.Clock();

camera.up.set(0, 0, 1);

const controls = new THREE.OrbitControls( camera, renderer.domElement );

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.antialias = true;
document.body.appendChild(renderer.domElement);

// window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

let solution = null;

const setupControls = () => {
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;

	controls.minDistance = 10;
	controls.maxDistance = 30;

	controls.minPolarAngle = Math.PI * 0.25;
	controls.maxPolarAngle = Math.PI * 0.75;

	controls.enablePan = false;
}

const movablePieceColors = [
	0xdd3333,
	0xdd7733,
	0xdddd33,
	0x33dd33,

	0x33dddd,
	0x3333dd,
	0x7733dd,
	0xdd33dd,

	0xdddddd
];

const addSphere = () => {
	const geometry = new THREE.SphereGeometry(1, 32, 32);
	const material = new THREE.MeshPhongMaterial();
	const mesh = new THREE.Mesh(geometry, material);

	scene.add(mesh);
}

const OneSidedBevelledBoxGeometry = (w, d, h, direction, b = 0.15) => {
	const geometry = new THREE.BufferGeometry();
	const x0 = -w * 0.5; const x1 = w * 0.5;
	const y0 = -d * 0.5; const y1 = d * 0.5;
	const z0 = -h * 0.5; const z1 = h * 0.5;

	const vertices = [];
	const normals = [];
	const indices = [];

	const s2 = Math.sqrt(0.5);

	var vertexCount = 0;

	const addFace = (vx, normal) => {
		vertices.push(...vx);
		for (var i = 0; i < 4; i++) {
			normals.push(...normal);
		}
		indices.push(
			vertexCount, vertexCount + 1, vertexCount + 2,
			vertexCount, vertexCount + 2, vertexCount + 3
			);
		vertexCount += 4;
	}

	const addAllFaces = (vx, n) => {
		// vx contains three rings of four vertices, back, bevel, front
		// n contains back, front, ortho ring and slanted ring normals
		addFace([
				vx[9], vx[10], vx[11],
				vx[6], vx[7], vx[8],
				vx[3], vx[4], vx[5],
				vx[0], vx[1], vx[2]
			], [n[0], n[1], n[2]]);
		addFace([
				vx[24], vx[25], vx[26],
				vx[27], vx[28], vx[29],
				vx[30], vx[31], vx[32],
				vx[33], vx[34], vx[35]
			], [n[3], n[4], n[5]]);
		for (var idx = 0; idx < 4; idx++) {
			const i = idx * 3;
			const ii = ((idx + 1) % 4) * 3;
			const j = i + 12;
			const jj = ii + 12;
			const k = i + 24;
			const kk = ii + 24;
			addFace([
				vx[i ], vx[i  + 1], vx[i  + 2],
				vx[ii], vx[ii + 1], vx[ii + 2],
				vx[jj], vx[jj + 1], vx[jj + 2],
				vx[j ], vx[j  + 1], vx[j  + 2]
				], [n[i + 6], n[i + 7], n[i + 8]]);
			addFace([
				vx[j ], vx[j  + 1], vx[j  + 2],
				vx[jj], vx[jj + 1], vx[jj + 2],
				vx[kk], vx[kk + 1], vx[kk + 2],
				vx[k ], vx[k  + 1], vx[k  + 2]
				], [n[j + 6], n[j + 7], n[j + 8]]);
		}
	}

	switch (direction) {
		case '+x':
			addAllFaces([
					// "back"
					x0, y1, z1,
					x0, y0, z1,
					x0, y0, z0,
					x0, y1, z0,
					// "bevel"
					x1 - b, y1, z1,
					x1 - b, y0, z1,
					x1 - b, y0, z0,
					x1 - b, y1, z0,
					// "front"
					x1, y1 - b, z1 - b,
					x1, y0 + b, z1 - b,
					x1, y0 + b, z0 + b,
					x1, y1 - b, z0 + b
				], [
					-1, 0, 0, 1, 0, 0,
					0, 0, 1, 0, -1, 0,
					0, 0, -1, 0, 1, 0,
					s2, 0, s2, s2, -s2, 0,
					s2, 0, -s2, s2, s2, 0
				])
			break;
		case '-x':
			addAllFaces([
					// "back"
					x1, y0, z1,
					x1, y1, z1,
					x1, y1, z0,
					x1, y0, z0,
					// "bevel"
					x0 + b, y0, z1,
					x0 + b, y1, z1,
					x0 + b, y1, z0,
					x0 + b, y0, z0,
					// "front"
					x0, y0 + b, z1 - b,
					x0, y1 - b, z1 - b,
					x0, y1 - b, z0 + b,
					x0, y0 + b, z0 + b
				], [
					1, 0, 0, -1, 0, 0,
					0, 0, 1, 0, 1, 0,
					0, 0, -1, 0, -1, 0,
					-s2, 0, s2, -s2, s2, 0,
					-s2, 0, -s2, -s2, -s2, 0
				]);
			break;
		case '+y':
			addAllFaces([
					// "back"
					x0, y0, z1,
					x1, y0, z1,
					x1, y0, z0,
					x0, y0, z0,
					// "bevel"
					x0, y1 - b, z1,
					x1, y1 - b, z1,
					x1, y1 - b, z0,
					x0, y1 - b, z0,
					// "front"
					x0 + b, y1, z1 - b,
					x1 - b, y1, z1 - b,
					x1 - b, y1, z0 + b,
					x0 + b, y1, z0 + b
				], [
					0, -1, 0, 0, 1, 0,
					0, 0, 1, 1, 0, 0,
					0, 0, -1, -1, 0, 0,
					0, s2, s2, s2, s2, 0,
					0, s2, -s2, -s2, s2, 0
				]);
			break;
		case '-y':
			addAllFaces([
					// "back"
					x1, y1, z1,
					x0, y1, z1,
					x0, y1, z0,
					x1, y1, z0,
					// "bevel"
					x1, y0 + b, z1,
					x0, y0 + b, z1,
					x0, y0 + b, z0,
					x1, y0 + b, z0,
					// "front"
					x1 - b, y0, z1 - b,
					x0 + b, y0, z1 - b,
					x0 + b, y0, z0 + b,
					x1 - b, y0, z0 + b,
				], [
					0, 1, 0, 0, -1, 0,
					0, 0, 1, -1, 0, 0,
					0, 0, -1, 1, 0, 0,
					0, -s2, s2, -s2, -s2, 0,
					0, -s2, -s2, s2, -s2, 0
				]);
			break;
		default: throw 'Invalid direction.';
	}

	geometry.setIndex(indices);
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
	geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

	return geometry;

}

const BoxGroup = (positions) => {
	const group = new THREE.Group();
	const geometry = new THREE.BoxGeometry(1, 1, 1);
	const material = new THREE.MeshPhongMaterial();
	for (var i = 0; i < positions.length; i += 3) {
		const x = positions[i];
		const y = positions[i + 1];
		const z = positions[i + 2];
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(x, y, z);
		group.add(mesh)
	}
	return group;
}

const FixedBox = () => {
	const group = new THREE.Group();
	const material = new THREE.MeshPhongMaterial();
	const twoBySeven = new THREE.BoxGeometry(7, 2, 1);
	const threeByThree = new THREE.BoxGeometry(3, 3, 1);
	for (var z = -3; z <= 3; z += 6) {
		for (var y = -2.5; y <= 2.5; y += 5) {
			const mesh = new THREE.Mesh(twoBySeven, material);
			mesh.position.set(0, y, z);
			group.add(mesh);
		}
		for (var x = -2; x <= 2; x += 4) {
			const mesh = new THREE.Mesh(threeByThree, material);
			mesh.position.set(x, 0, z);
			group.add(mesh);
		}
	}
	const fiveByOne = new THREE.BoxGeometry(1, 1, 5);
	for (var x = -3; x <= 3; x += 6) {
		for (var y = -3; y <= 3; y += 6) {
			const mesh = new THREE.Mesh(fiveByOne, material);
			mesh.position.set(x, y, 0);
			group.add(mesh);
		}
	}
	return group;
}

const BevelledPiece = (volume, color) => {
	const innerPositions = [];
	var dir = '';
	var bevelBoundingBox = new THREE.Box3();
	var bevelTotal = new THREE.Vector3();

	const group = new THREE.Group()
	const geometry = new THREE.BoxGeometry(1, 1, 1);
	const material = new THREE.MeshPhongMaterial();
	material.color = new THREE.Color(color);

	const registerEdgeBlock = (p) => {
		bevelTotal.add(p);
		bevelBoundingBox.expandByPoint(p);
	}
	for (let pos of volume.points.values()) {
		const p = pos.clone();
		p.subScalar(3);
		if (Math.abs(p.x) == 3) {
			dir = 'x';
			registerEdgeBlock(p);
		} else if (Math.abs(p.y) == 3) {
			dir = 'y';
			registerEdgeBlock(p);
		} else {
			const mesh = new THREE.Mesh(geometry, material);
			mesh.position.set(p.x, p.y, p.z);
			group.add(mesh);
		}
	}
	const pos = new THREE.Vector3();
	const size = new THREE.Vector3();

	bevelBoundingBox.getCenter(pos);
	bevelBoundingBox.getSize(size);
	size.addScalar(1);

	if (dir === 'x') {
		const g1 = OneSidedBevelledBoxGeometry(1, size.y, size.z, '+x');
		const g2 = OneSidedBevelledBoxGeometry(1, size.y, size.z, '-x');
		const m1 = new THREE.Mesh(g1, material);
		const m2 = new THREE.Mesh(g2, material);
		m1.position.set(3, pos.y, pos.z);
		m2.position.set(-3, pos.y, pos.z);
		group.add(m1);
		group.add(m2);
	} else if (dir === 'y') {
		const g1 = OneSidedBevelledBoxGeometry(size.x, 1, size.z, '+y');
		const g2 = OneSidedBevelledBoxGeometry(size.x, 1, size.z, '-y');
		const m1 = new THREE.Mesh(g1, material);
		const m2 = new THREE.Mesh(g2, material);
		m1.position.set(pos.x, 3, pos.z);
		m2.position.set(pos.x, -3, pos.z);
		group.add(m1);
		group.add(m2);
	}
	return group;
}

const addBox = () => {
	const boxGroup = FixedBox()
	const material = boxGroup.children[0].material;
	material.color = new THREE.Color(0xe1c699);

	scene.add(boxGroup);
}

const pieceModels = new Array();

addBox();
for (var i = 0; i < movablePieces.length; i++) {
	let piece = BevelledPiece(movablePieces[i], movablePieceColors[i]);
	scene.add(piece);
	pieceModels.push(piece);
	piece.name = 'piece' + i;
}

const rotateWorld = () => {
	for (var i = 0; i < scene.children.length; i++) {
		if (scene.children[i].isGroup) {
			scene.children[i].rotation.z -= 0.01;
		}
	}
}

const setupCamera = () => {
	camera.position.z = 8;
	camera.position.y = 15;
	camera.up.set(0,0,1);
	camera.lookAt(0, 0, 3);
	scene.add(camera);
}

setupCamera();
setupControls();

const performSolve = (event) => {
    const solver = new AStarSolver();
    let solution = solver.solve();
}

const addDirectionalLight = () => {
	const light = new THREE.DirectionalLight(0xcccccc, 0.8);
	light.position.set(15, -12, 15);
	camera.add(light);
}

const addAmbientlLight = () => {
	const light = new THREE.AmbientLight(0x404040);
	scene.add(light);
}

addAmbientlLight();
addDirectionalLight();

let moveIndex = 0;

const animatePieceMove = (index, startPos, endPos, completion) => {

	function vecString(v) {
		return '(' + v.x + ', ' + v.y + ', ' + v.z + ')';
	}
	console.log('animating piece '+ index);
	let pos = pieceModels[index].position;
	console.log('true start: ' + vecString(pos));
	console.log('anim start: ' + vecString(startPos));
	console.log('anim end: ' + vecString(endPos));
	let times = [0, 1];
	let values = [startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z];
	let kfTrack = new THREE.KeyframeTrack('.position', times, values);

	let moveName = 'move' + moveIndex;
	moveIndex++;
	let clip = new THREE.AnimationClip(moveName, 1, [kfTrack]);
	if (!pieceModels[index].userData.mixer) {
		pieceModels[index].userData.mixer = new THREE.AnimationMixer(pieceModels[index]);
		console.log('create mixer for ' + pieceModels[index].name);
	}
	let action = pieceModels[index].userData.mixer.clipAction(clip);
	action.setLoop(THREE.LoopOnce, 1);
	action.clampWhenFinished = true;
	action.play();
	if (completion) {
		pieceModels[index].userData.mixer.addEventListener('finished', completion);
	}
} 

const animate = () => {
    requestAnimationFrame(animate);
    controls.update();

    const mixerUpdateDelta = clock.getDelta();

    if (scene.userData.mixer && scene.userData.isAnimating) {
    	scene.userData.mixer.update(mixerUpdateDelta);
    }

    renderer.render(scene, camera);
    // rotateWorld();
};

const createPositionKeyframeTrack = (index) => {
	let times = new Array();
	let values = new Array();

	let lastPos = solution[0].getPosition(index);
	let lastTime = -1;

	for (let i = 1; i < solution.length; i++) {
		let pos = solution[i].getPosition(index);
		if (pos.equals(lastPos)) {
			continue;
		}
		if (i - 1 > lastTime) {
			values.push(lastPos.x, lastPos.y, lastPos.z)
			times.push(i-1);
		}
		values.push(pos.x, pos.y, pos.z);
		times.push(i);
		lastTime = i;
		lastPos = pos;
	}
	let name = pieceModels[index].uuid + '.position';
	let track = new THREE.KeyframeTrack(name, times, values);
	return track;
}

const createPieceFadeKeyframeTracks = (index) => {
	let times = new Array();
	let transparencyValues = new Array();
	let opacityValues = new Array();
	let visibilityValues = new Array();
	for (let i = 1; i < solution.length; i++) {
		if (solution[i].isRemoved(index)) {
			times.push(i-1, i-0.99, i-0.01, i);
			transparencyValues.push(false, true, true, false);
			opacityValues.push(1.0, 1.0, 0.0, 0.0);
			visibilityValues.push(true, true, true, false);
			break;
		}
	}
	let names = ['.material.transparent', '.material.opacity', '.material.visible'];
	let values = [transparencyValues, opacityValues, visibilityValues];
	let tracks = new Array();
	for (var i = 0; i < names.length; i++) {
		let track = new THREE.KeyframeTrack(pieceModels[index].children[0].uuid + names[i], times, values[i]);
		tracks.push(track);
	}
	return tracks;
}

const createSolutionAnimation = () => {
	let tracks = new Array();
	for (let i = 0; i < 9; i++) {
		tracks.push(createPositionKeyframeTrack(i));
		tracks.push(...createPieceFadeKeyframeTracks(i));
	}
	let clip = new THREE.AnimationClip('solution', solution.length - 1, tracks);
	return clip;
}

const animateSolution = () => {
	let clip = createSolutionAnimation();
	if (!scene.userData.mixer) {
		scene.userData.mixer = new THREE.AnimationMixer(scene);
	}
	let action = scene.userData.mixer.clipAction(clip);
	action.setLoop(THREE.LoopOnce, 1);
	action.clampWhenFinished = true;
	action.play();
	scene.userData.isAnimating = true;
	scene.userData.mixer.addEventListener('finished', function(event) {
		pieceModels[i].userData.isAnimating = false;
	})
}

animate();

const cancelAnimations = () => {
	if (scene.userData.mixer) {
		scene.userData.mixer.stopAllAction();
		scene.userData.isAnimating = false
	}
}

let isPaused = false;

const solvePuzzle = () => {
    // createSolutionAnimations();
    animateSolution();
}

const resetPuzzle = () => {
	isPaused = false;
	cancelAnimations();
	for (var i = 0; i < pieceModels.length; i++) {
		pieceModels[i].position.set(0, 0, 0);
		pieceModels[i].visible = true;
	}
}

const pauseAnimation = () => {
	scene.userData.isAnimating = false;
	isPaused = true;
}

const continueAnimation = () => {
	scene.userData.isAnimating = true;
	isPaused = false;
}

let solveButton = null;

function solveInWorkerIfPossible(solveButton) {

	if (window.Worker && true) {
		let worker = new Worker('js/solve-worker.js');
		worker.onmessage = (result) => {
			solution = [];
			for (const flattened of result.data) {
				solution.push(PuzzleState.fromFlattened(flattened));
			}
			console.log('completed solve');
			solveButton.disabled = false;
			solveButton.innerHTML = 'play solution';
			worker.terminate();
			worker = undefined;
		}
		console.log('started solve on worker thread');
	} else {
		let solver = new AStarSolver();
		console.log('started solve on main thread');
		solution = solver.solve();
		console.log('completed solve');
		solveButton.disabled = false;
		solveButton.innerHTML = 'play solution';
	}
}

const handleSolveClick = (event) => {
	if (!solution) {
		solveButton.disabled = true;

		solveInWorkerIfPossible(solveButton);

		return;
	}
	if (scene.userData.isAnimating) {
		pauseAnimation();
		event.target.innerHTML = 'continue';
	} else {
		if (isPaused) {
			continueAnimation();
		} else {
			animateSolution();
		}
		event.target.innerHTML = 'pause';
	}
}

document.addEventListener("DOMContentLoaded", function(event){

	solveButton = document.getElementById('solve-button');

	solveButton.addEventListener('click', handleSolveClick)

	document.getElementById('reset-button').addEventListener('click', function(event) {
		resetPuzzle();
	})

});
