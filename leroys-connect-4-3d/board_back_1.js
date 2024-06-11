import {
    FlakesTexture
} from './textures/FlakesTexture.js';
export class Board {
    constructor() {


        this.scene = new THREE.Scene();
        //this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1100 );
        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.shadowMap.enabled = true;

        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
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
        this.camera.position.set(0, 50, 100);

        console.log('Setting up renderer...');
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x202020);
        document.body.appendChild(this.renderer.domElement);

        console.log('Adding lights...');
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        //this.scene.add(ambientLight);

        const pointLight = new THREE.SpotLight(0xffffff, 1);
        pointLight.position.set(20, 100, 100);
        pointLight.castShadow = true;
        this.scene.add(pointLight);

        // Set up shadow properties for the light
        console.log('Adding shadow...');
        pointLight.shadow.mapSize.width = 512; // default
        pointLight.shadow.mapSize.height = 512; // default
        pointLight.shadow.camera.near = 0.5; // default
        pointLight.shadow.camera.far = 500; // default
        pointLight.shadow.focus = 1; // default

        const spotLight = new THREE.SpotLight(0xffffff, 50);
        spotLight.name = 'Spot Light';
        spotLight.angle = Math.PI / 5;
        spotLight.penumbra = 0.3;
        spotLight.position.set(10, 30, 5);
        spotLight.castShadow = true;
        spotLight.shadow.camera.near = 8;
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
        pointLight.castShadow = true;
        //this.scene.add( dirLight );
        //this.scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );

        const particleLight = new THREE.Mesh(
            new THREE.SphereGeometry(.01, -80, 280),
            new THREE.MeshBasicMaterial({
                color: 0xffffff
            })
        );
        //this.scene.add( particleLight );
        //particleLight.add( new THREE.PointLight( 0xffffff, 5 ) );

        const geometry = new THREE.SphereGeometry( 500, 60, 40 );
        // invert the geometry on the x-axis so that all of the faces point inward
        geometry.scale( - 1, 1, 1 );

        console.log('Loading textures...');
        const loader = new THREE.TextureLoader();
        const normalMap2 = loader.load('textures/Water_1_M_Normal.jpg');
        const normalMap1 = loader.load('textures/Water_1_M_Normal.jpg');

        const texture = new THREE.TextureLoader().load( 'textures/panoramic-room-sm.jpg' );
		texture.colorSpace = THREE.SRGBColorSpace;
		const material = new THREE.MeshBasicMaterial( { map: texture } );

        const mesh2 = new THREE.Mesh( geometry, material );

        this.scene.add( mesh2 );

        /*const normalMap3 = new THREE.CanvasTexture( new FlakesTexture() );
        normalMap3.wrapS = THREE.RepeatWrapping;
        normalMap3.wrapT = THREE.RepeatWrapping;
        normalMap3.repeat.x = 10;
        normalMap3.repeat.y = 6;
        normalMap3.anisotropy = 16;*/

        const clearcoatNormalMap = loader.load('textures/Scratched_gold_01_1K_Normal.png');
        const woodTexture = loader.load('textures/wood.jpg');
        const groundTexture = loader.load('textures/wall.jpg'); // Load ground texture
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(1, 1);

        this.materials.red_ficha = new THREE.MeshPhysicalMaterial({
            clearcoat: 1.0,
            metalness: 1.0,
            color: 0xff0000,
            normalMap: normalMap1,
            normalScale: new THREE.Vector2(0.15, 0.15),
            clearcoatNormalMap: clearcoatNormalMap,

            // y scale is negated to compensate for normal map handedness.
            clearcoatNormalScale: new THREE.Vector2(2.0, -2.0)
        });

        this.materials['blue-ficha'] = new THREE.MeshPhysicalMaterial({
            clearcoat: 1.0,
            metalness: 1.0,
            color: 0x001e9d,
            normalMap: normalMap2,
            normalScale: new THREE.Vector2(0.15, 0.15),
            clearcoatNormalMap: clearcoatNormalMap,

            // y scale is negated to compensate for normal map handedness.
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

        this.controls.enableZoom = true;
        this.controls.maxPolarAngle = Math.PI / 2.1;

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        document.addEventListener('click', this.onDocumentMouseDown.bind(this), false);
    }

    createGrid(rows, cols, initialX, initialY) {
        const spacingX = 13.8;
        const spacingY = 10;
        let nextPosX = initialX;
        let nextPosY = initialY;
        for (let i = 0; i < rows; i++) {
            nextPosX = initialX;
            for (let j = 0; j < cols; j++) {
                const geometry = new THREE.BoxGeometry(10, 10, 1);
                const material = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    wireframe: false
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(nextPosX, nextPosY, 0);
                mesh.receiveShadow = true; // Enable shadows on the ground
                mesh.castShadow = true; //default is false
                this.gridGroup.add(mesh);
                nextPosX += spacingX;
            }
            nextPosY += spacingY;
        }
        console.log('Grid created with', this.gridGroup.children.length, 'cells.');
    }

    createGround(groundTexture) {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({
            map: groundTexture
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -60; // Position the ground below the grid
        ground.receiveShadow = true; // Enable shadows on the ground
        ground.castShadow = false; //default is false
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
            //this.checkWinner();
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
