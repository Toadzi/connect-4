export class Board {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.shadowMap.enabled = true;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement); // Use global THREE.OrbitControls
		this.controls.minDistance = 180;  // Mindestabstand zum Zoomen
		this.controls.maxDistance = 500;  // Maximaler Abstand zum Zoomen
        this.gridGroup = new THREE.Group();
        this.fichasGroup = new THREE.Group();
        this.materials = {};
        this.rows = 6;
        this.cols = 7;
        this.grid = Array.from({
            length: this.rows
        }, () => Array(this.cols).fill(null));

        // Erstelle den Marker
        this.fingerMarker = this.createFingerMarker();

        // Anzahl der Positionen, die für die Durchschnittsberechnung gespeichert
        this.fingerHistory = [];
        this.historySize = 10;

        // Initialisiere Standardwerte
        this.smoothingFactor = 0.5; // Beispiel für einen Startwert
        this.scaleX = window.innerWidth;
        this.scaleY = window.innerHeight;

		this.currentColumn = null;
        this.markerTimeout = null;
        this.markerPosition = { x: 0, y: 0 };  // Startposition des Markers

        // UI-Elemente erstellen
        this.createSettingsUI();

    }

    init() {

		console.log('Window innerWidth: ', window.innerWidth ,' innerHeight: ', window.innerHeight);

        console.log('Initializing scene ...');
        this.camera.position.set(0, 0, 240);
		this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        console.log('Setting up renderer ...');
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x202020);
        document.body.appendChild(this.renderer.domElement);

        /****
         * Setup MediaPipe Hands
         */
        console.log('Setup MediaPipe Hands ...');
        this.setupMediaPipeHands();
        window.addEventListener('resize', this.onWindowResize.bind(this), false);


        console.log('Adding lights ...');
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);
        const pointLight = new THREE.SpotLight(0xffffff, 1);
        pointLight.position.set(20, 100, 100);
        pointLight.castShadow = true;
        this.scene.add(pointLight);

        pointLight.shadow.mapSize.width = 512;
        pointLight.shadow.mapSize.height = 512;
        pointLight.shadow.camera.near = 0.5;
        pointLight.shadow.camera.far = 500;
        pointLight.shadow.focus = 1;

        const spotLight = new THREE.SpotLight(0xffffff, 1.2);
        spotLight.name = 'Spot Light';
        spotLight.angle = Math.PI / 5;
        spotLight.penumbra = 0.3;
        spotLight.position.set(100, 7, 100); // (schwenken, Höhe, Tiefe)
        spotLight.castShadow = true;
        spotLight.shadow.camera.near = 2;
        spotLight.shadow.camera.far = 30;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        this.scene.add(spotLight);

        this.scene.add(new THREE.CameraHelper(spotLight.shadow.camera));

        const dirLight = new THREE.DirectionalLight(0xffffff, 3);
        dirLight.name = 'Dir. Light';
        dirLight.position.set(0, 10, 0);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 10;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.castShadow = true;

        const particleLight = new THREE.Mesh(
            new THREE.SphereGeometry(.01, -80, 280),
            new THREE.MeshBasicMaterial({
                color: 0xffffff
            })
        );

        console.log('Loading textures ...');
        const loader = new THREE.TextureLoader();
        const normalMap2 = loader.load('textures/Water_1_M_Normal.jpg');
        const normalMap1 = loader.load('textures/Water_1_M_Normal.jpg');
        const clearcoatNormalMap = loader.load('textures/Scratched_gold_01_1K_Normal.png');
        const woodTexture = loader.load('textures/wood.jpg');
        const woodTextureTable = loader.load('textures/concrete-wall-texture.jpg');
        const metalTextureTable = loader.load('textures/metal.jpg');
        const groundTexture = loader.load('textures/wood-02.jpg');
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(4, 4);

        /****
         * Definiere Material Spielsteine
         */
        this.materials.red_ficha = new THREE.MeshPhysicalMaterial({
            clearcoat: 1.0,
            metalness: 1.0,
            color: 0xff0000,
            normalMap: normalMap1,
            normalScale: new THREE.Vector2(0.15, 0.15),
            clearcoatNormalMap: clearcoatNormalMap,
            clearcoatNormalScale: new THREE.Vector2(2.0, -2.0)
        });

        this.materials['blue-ficha'] = new THREE.MeshPhysicalMaterial({
            clearcoat: 1.0,
            metalness: 1.0,
            color: 0x001e9d,
            normalMap: normalMap2,
            normalScale: new THREE.Vector2(0.15, 0.15),
            clearcoatNormalMap: clearcoatNormalMap,
            clearcoatNormalScale: new THREE.Vector2(2.0, -2.0)
        });


        console.log('Initializing groups ...');
        this.scene.add(this.gridGroup);
        this.scene.add(this.fichasGroup);

        console.log('Creating grid ...');
        this.createGrid(this.rows, this.cols, -44.7, -50);

        console.log('Creating ground ...');
        this.createGround(groundTexture);


        //console.log('Loading GLB model ...');
        //this.loadGLBModel('./model/table.glb');

        this.controls.enableZoom = true;
        this.controls.maxPolarAngle = Math.PI / 2.1;

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        document.addEventListener('click', this.onDocumentMouseDown.bind(this), false);

    }


    /****
     * Loader GLB Model
     */
    loadGLBModel(path) {
        const loader = new THREE.GLTFLoader(); // Use global THREE.GLTFLoader
        loader.load(path, (gltf) => {
            const model = gltf.scene;
            model.position.set(0, 0, 0);
            model.castShadow = true;
            model.receiveShadow = true;
            this.scene.add(model);
            console.log('GLB model loaded successfully');
        }, undefined, (error) => {
            console.error('An error occurred while loading the GLB model', error);
        });
    }


    /****
     * Erstelle Grid
     */
    createGrid(rows, cols, initialX, initialY) {
        const spacingX = 13.8;
        const spacingY = 10;
        let nextPosX = initialX;
        let nextPosY = initialY;
        for (let i = 0; i < rows; i++) {
            nextPosX = initialX;
            for (let j = 0; j < cols; j++) {
                const geometry = new THREE.BoxGeometry(10, 10, 1); // (Breite, Höhe, Tiefe) Dimensionen
                const material = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    wireframe: false
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(nextPosX, nextPosY, 0);
                mesh.receiveShadow = true;
                mesh.castShadow = true;
				mesh.name = `column_${j}`;  // Zuweisung der Spalten-ID
				console.log(`Mesh at column ${j}, row ${i}, positioned at x: ${nextPosX}, y: ${nextPosY}`);
                this.gridGroup.add(mesh);
                nextPosX += spacingX;
            }
            nextPosY += spacingY;
        }
        console.log('Grid created with', this.gridGroup.children.length, 'cells.');
    }


    /****
     * Create Ground
     */
    createGround(groundTexture) {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({
            map: groundTexture
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -55;
        ground.receiveShadow = true;
        ground.castShadow = false;
        this.scene.add(ground);

    }


    /****
     * Setup MediaPipe Hands
     */
    setupMediaPipeHands() {
        const videoElement = document.createElement('video');
        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(this.onHandResults.bind(this)); // Bind this to the callback function

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({
                    image: videoElement
                });
            },
            width: 1280,
            height: 720
        });

        //camera.start(); ----------------------------------------------------------------------------
    }


    /****
     * On Hands Results
     */
    onHandResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const indexFingerTip = landmarks[8]; // Spitze des Zeigefingers

            if (indexFingerTip) {
				// Berechne die Pixelkoordinaten aus den normierten Koordinaten
            const fingerX = indexFingerTip.x * window.innerWidth;
            const fingerY = indexFingerTip.y * window.innerHeight;
			console.log('---------------------- fingerX: ', indexFingerTip.x * window.innerWidth);
			console.log('---------------------- fingerY: ', indexFingerTip.y * window.innerHeight);

			console.log('---------------------- indexFingerTip.x: ', indexFingerTip.x);
			console.log('---------------------- indexFingerTip.y: ', indexFingerTip.y);

            // Aktualisiere die Position des Markers
            this.updateMarkerPosition(fingerX, fingerY);


                this.updateFingerPosition(indexFingerTip.x, indexFingerTip.y);

            }
        }
    }


    /****
     * Create Finger Marker
     */
    createFingerMarker() {
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            depthTest: false // Ignoriert den Tiefentest
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.renderOrder = 999; // Eine hohe Render-Order stellt sicher, dass der Marker immer sichtbar bleibt
        this.scene.add(sphere);
        return sphere;
    }


    /****
     * Create Finger Marker
     *
     * Einfache gleitende Durchschnittsbildung (Moving Average)
     */
    updateFingerPosition(x, y) {
		// MediaPipe gibt Koordinaten im Bereich [0,1], daher müssen wir sie transformieren, um sie im Three.js-Raum zu positionieren.
	    x = x * window.innerWidth;
	    y = y * window.innerHeight;

	    this.fingerHistory.push({ x, y });
	    if (this.fingerHistory.length > this.historySize) {
	        this.fingerHistory.shift(); // Älteste Position entfernen, wenn das Limit überschritten wird
	    }

	    let avgX = 0, avgY = 0;
	    this.fingerHistory.forEach(pos => {
	        avgX += pos.x;
	        avgY += pos.y;
	    });
	    avgX /= this.fingerHistory.length;
	    avgY /= this.fingerHistory.length;

	    // Anpassung der Koordinaten, um die Spiegelung zu korrigieren
	    // Implementierung der Glättung und dynamischen Skalierung
	    const newX = (0.5 - avgX / window.innerWidth) * this.scaleX;
	    const newY = (0.5 - avgY / window.innerHeight) * this.scaleY;

	    // Setzt die neue Position des Markers
	    this.fingerMarker.position.set(newX, newY, 0);
    }


	updateMarkerPosition(newX, newY) {
	    // Setze die x-Position des Raycasters
	    this.mouse.x = (newX / window.innerWidth) * 2 - 1;
	    this.mouse.y = -(newY / window.innerHeight) * 2 + 1;

	    // Aktualisiere den Raycaster
	    this.raycaster.setFromCamera(this.mouse, this.camera);

		// Richtungsvektor des Raycasters abrufen
		const direction = new THREE.Vector3();
		this.raycaster.ray.direction.normalize(); // Normalisiere die Richtung für den ArrowHelper

		// Erstelle den ArrowHelper
		const arrowHelper = new THREE.ArrowHelper(
		    this.raycaster.ray.direction,   // Richtung
		    this.raycaster.ray.origin,      // Ursprung
		    100,                            // Länge des Pfeils
		    0xff0000                        // Farbe des Pfeils
		);

		// Füge den ArrowHelper zur Szene hinzu
		//this.scene.add(arrowHelper);

	    // Führe das Raycasting auf die Spaltengruppe aus
	    const intersects = this.raycaster.intersectObjects(this.gridGroup.children, true);
		//console.log(intersects);
	    if (intersects.length > 0) {
			console.log("Hit: ", intersects[0].object.name);
	        const hit = intersects[0].object;
	        if (hit && hit.name.startsWith("column_")) {
	            const col = parseInt(hit.name.split("_")[1]);
	            if (col !== this.currentColumn) {
	                this.currentColumn = col;
	                this.resetTimer();  // Setze den Timer zurück, wenn der Marker die Spalte wechselt
	            }
	        }
	    }

	    // Aktualisiere die Markerposition
	    this.markerPosition = { x: newX, y: newY };
	}


	resetTimer() {
	    clearTimeout(this.markerTimeout);
		//console.log('---------------------- resetTimer: playing: ', this.game.game.playing );
	    this.markerTimeout = setTimeout(() => {
	        if (this.game.game.playing == true) {  // Überprüfe, ob das Spiel noch läuft
	            console.log('---------------------- Spaltenauswahl erkannt.', this.currentColumn, 'Column');
	            this.game.makeMove(this.currentColumn);
	        }
	    }, 3000);  // Warte 3 Sekunden
	}


    createSettingsUI() {
		const settingsDiv = document.createElement('div');
	    settingsDiv.id = 'ui-settings';  // Zuweisung einer ID
	    settingsDiv.style.position = 'absolute';
	    settingsDiv.style.top = '30px';
	    settingsDiv.style.left = '200px';
	    document.body.appendChild(settingsDiv);

	    // Label und Slider für den Glättungsfaktor
	    const smoothingLabel = document.createElement('label');
	    smoothingLabel.innerHTML = 'Glättungsfaktor:';
	    smoothingLabel.htmlFor = 'smoothingSlider';
	    settingsDiv.appendChild(smoothingLabel);

	    const smoothingSlider = document.createElement('input');
	    smoothingSlider.id = 'smoothingSlider';
	    smoothingSlider.type = 'range';
	    smoothingSlider.min = 0;
	    smoothingSlider.max = 1;
	    smoothingSlider.step = 0.05;
	    smoothingSlider.value = this.smoothingFactor;
	    smoothingSlider.oninput = (e) => {
	        this.smoothingFactor = e.target.value;
	    };
	    settingsDiv.appendChild(smoothingSlider);

	    // Label und Slider für Skalierung X
	    const scaleXLabel = document.createElement('label');
	    scaleXLabel.innerHTML = 'Skalierung X:';
	    scaleXLabel.htmlFor = 'scaleXSlider';
	    settingsDiv.appendChild(scaleXLabel);

	    const scaleXSlider = document.createElement('input');
	    scaleXSlider.id = 'scaleXSlider';
	    scaleXSlider.type = 'range';
	    scaleXSlider.min = 0.2 * window.innerWidth;
	    scaleXSlider.max = 1.5 * window.innerWidth;
	    scaleXSlider.step = 10;
	    scaleXSlider.value = this.scaleX;
	    scaleXSlider.oninput = (e) => {
	        this.scaleX = e.target.value;
	    };
	    settingsDiv.appendChild(scaleXSlider);

	    // Label und Slider für Skalierung Y
	    const scaleYLabel = document.createElement('label');
	    scaleYLabel.innerHTML = 'Skalierung Y:';
	    scaleYLabel.htmlFor = 'scaleYSlider';
	    settingsDiv.appendChild(scaleYLabel);

	    const scaleYSlider = document.createElement('input');
	    scaleYSlider.id = 'scaleYSlider';
	    scaleYSlider.type = 'range';
	    scaleYSlider.min = 0.2 * window.innerHeight;
	    scaleYSlider.max = 1.5 * window.innerHeight;
	    scaleYSlider.step = 10;
	    scaleYSlider.value = this.scaleY;
	    scaleYSlider.oninput = (e) => {
	        this.scaleY = e.target.value;
	    };
	    settingsDiv.appendChild(scaleYSlider);

	    // Label und Slider für die historySize
	    const historySizeLabel = document.createElement('label');
	    historySizeLabel.innerHTML = 'History Size:';
	    historySizeLabel.htmlFor = 'historySizeSlider';
	    settingsDiv.appendChild(historySizeLabel);

	    const historySizeSlider = document.createElement('input');
	    historySizeSlider.id = 'historySizeSlider';
	    historySizeSlider.type = 'range';
	    historySizeSlider.min = 1;
	    historySizeSlider.max = 30;
	    historySizeSlider.step = 1;
	    historySizeSlider.value = this.historySize;
	    historySizeSlider.oninput = (e) => {
	        this.historySize = parseInt(e.target.value);
	    };
	    settingsDiv.appendChild(historySizeSlider);
    }



    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.controls.update();
    }

    setGame(game) {
        this.game = game;
    }

    onDocumentMouseDown(event) {
        event.preventDefault();
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        //this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.gridGroup.children);



        if (intersects.length > 0 && this.game.game.playing) {
            const intersected = intersects[0].object;
            console.log('Grid cell clicked at:', intersected.position);
            const col = Math.round((intersected.position.x + 44.7) / 13.8);
            this.game.makeMove(col);
            if (this.game.game.winner !== "") {
                document.querySelector('.game-over').style.display = 'block';
                document.getElementById('winner').innerText = `${this.game.game.winner} Wins`;
            }
        }
    }


    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
        this.controls.update();
    }
}

const board = new Board();
export default board;
