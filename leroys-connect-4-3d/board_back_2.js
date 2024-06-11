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
        this.gridGroup = new THREE.Group();
        this.fichasGroup = new THREE.Group();
        this.materials = {};
        this.rows = 6;
        this.cols = 7;
        this.grid = Array.from({
            length: this.rows
        }, () => Array(this.cols).fill(null));
    }

    init() {
        console.log('Initializing scene...');
        this.camera.position.set(0, -220, 100);

        console.log('Setting up renderer...');
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x202020);
        document.body.appendChild(this.renderer.domElement);

        console.log('Adding lights...');
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

        console.log('Loading textures...');
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

        this.materials.white = new THREE.MeshBasicMaterial({
            map: woodTexture
        });

        console.log('Initializing groups...');
        this.scene.add(this.gridGroup);
        this.scene.add(this.fichasGroup);

        console.log('Creating grid...');
        this.createGrid(this.rows, this.cols, -44.7, -50);

        console.log('Creating ground...');
        this.createGround(groundTexture);

        console.log('Creating table...');
        this.createTable(woodTextureTable, metalTextureTable);

        console.log('Loading GLB model...');
        //this.loadGLBModel('./model/table.glb');

        this.controls.enableZoom = true;
        this.controls.maxPolarAngle = Math.PI / 2.1;

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        document.addEventListener('click', this.onDocumentMouseDown.bind(this), false);
    }

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

    createGrid(rows, cols, initialX, initialY) {
        const spacingX = 13.8;
        const spacingY = 10;
        let nextPosX = initialX;
        let nextPosY = initialY;
        for (let i = 0; i < rows; i++) {
            nextPosX = initialX;
            for (let j = 0; j < cols; j++) {
                const geometry = new THREE.BoxGeometry(10, 10, 1);  // (Breite, Höhe, Tiefe) Dimensionen
                const material = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    wireframe: false
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(nextPosX, nextPosY, 0);
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                this.gridGroup.add(mesh);
                nextPosX += spacingX;
            }
            nextPosY += spacingY;
        }
        console.log('Grid created with', this.gridGroup.children.length, 'cells.');
    }

    createTable(tableTopTexture, tableLegTexture) {
        console.log('Creating table...');
        // Angepasste Größen für die Tischplatte
        const tableTopGeometry = new THREE.BoxGeometry(100, 2, 60); // (Breite, Höhe, Tiefe) Dimensionen
        const tableTopMaterial = new THREE.MeshPhongMaterial({
            map: tableTopTexture,
            shininess: 30
        });
        const tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
        tableTop.position.set(0, -57, 0); // Angepasste Höhe basierend auf der neuen Größe
        tableTop.receiveShadow = true;
        tableTop.castShadow = true;
        this.scene.add(tableTop);

        // Angepasste Größen für die Tischbeine
        const legGeometry = new THREE.CylinderGeometry(3, 1, 20, 32); // (Durchmesser oben, Durchmesser unten, Höhe) Dimensionen
        const legMaterial = new THREE.MeshPhongMaterial({
            map: tableLegTexture,
            shininess: 50
        });

        const legsPositions = [
            { x: 40, y: -70, z: 20 },
            { x: -40, y: -70, z: 20 },
            { x: 40, y: -70, z: -20 },
            { x: -40, y: -70, z: -20 }
        ];

        legsPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos.x, pos.y, pos.z);
            leg.receiveShadow = true;
            leg.castShadow = true;
            this.scene.add(leg);
        });
    }

    createGround(groundTexture) {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({
            map: groundTexture
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -80;
        ground.receiveShadow = true;
        ground.castShadow = false;
        this.scene.add(ground);

    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setGame(game) {
        this.game = game;
    }

    onDocumentMouseDown(event) {
        event.preventDefault();
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
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
