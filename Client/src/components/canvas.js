import React, { useRef, useEffect, useState } from "react";
import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import * as GUI from "babylonjs-gui";
import * as cannon from "cannon";
import socketIO from "socket.io-client";

window.CANNON = cannon;

const myStyle = {
	width: "95%",
	height: "95%",
};

const ReactCanvas = (props) => {
	let canvasRef = useRef(null);
	let canvas;
	let engine;
	let scene;
	let camera;

	let isWPressed = false;
	let isSPressed = false;
	let isAPressed = false;
	let isDPressed = false;
	let isBPressed = false;

	const socket = socketIO.connect("http://10.106.0.21:4000");
	const locRoom = localStorage.getItem("room");
	const locName = localStorage.getItem("name");

	// let data = {name:locRoom};
	// localStorage.clear();
	let GameData = {};
	let enemies = {};

	function connectToServer() {
		console.log("inside connect function");

		setCount(1);
		socket.on("connect", function () {
			console.log("connction estaplished successfully");

			socket.on("GetYourID", function (data) {
				GameData.id = data.id;
				GameData.name = locName;
				GameData.room = locRoom;
				socket.emit("ThankYou", GameData);
				// localStorage.clear();
			});

			socket.on("Start", function (Game) {
				startGame(Game);
			});

			socket.on("AnotherTankCreated", function (Game, data) {
				createGirl(scene, Game, data);
			});

			socket.on("AnotherTankMoved", function (data) {
				// console.log("aaaaaaaaaaaa",data);
				let girl = enemies[data.id];
				let hero = girl.meshes[0];
				hero.setState(data);
				const idleAnim = girl.animationGroups[0];
				const sambaAnim = girl.animationGroups[1];
				const walkAnim = girl.animationGroups[2];
				const walkBackAnim = girl.animationGroups[3];

				//Manage animations to be played
				if (data.notifyServer) {
					if (data.isSPressed) {
						walkBackAnim.start(true, 1.0, walkBackAnim.from, walkBackAnim.to, false);
					}
					if (data.isWPressed) {
						walkAnim.start(true, 1.0, walkAnim.from, walkAnim.to, false);
					}
					if (data.isBPressed) {
						sambaAnim.start(true, 1.0, sambaAnim.from, sambaAnim.to, false);
					}
				} else {
					//Default animation is idle when no key is down
					idleAnim.start(true, 1.0, idleAnim.from, idleAnim.to, false);

					//Stop all animations besides Idle Anim when no key is down
					sambaAnim.stop();
					walkAnim.stop();
					walkBackAnim.stop();
				}
			});

			// window.onbeforeunload = function () {
			//   socket.emit("IGoAway",locRoom, Game.id);
			//   socket.disconnect();
			// };

			socket.on("AnotherWentAway", function (data) {
				let hero = enemies[data.id].meshes[0];
				hero.dispose();
				delete enemies[data.id];
			});
		});
	}

	async function startGame(Game) {
		canvas = canvasRef.current;
		engine = new BABYLON.Engine(canvas, true);
		scene = await createScene(Game);
		// modifySettings();
		let hero = scene.getMeshByName("__root__");
		let toRender = function () {
			scene.render();
			hero?.move();
		};
		engine.runRenderLoop(toRender);
	}

	let createScene = async function (Game) {
		let scene = new BABYLON.Scene(engine);
		scene.collisionsEnabled = true;
		// camera = await CreateArcRotateCamera(scene)
		// camera = await CreateFollowCamera(scene)

		let light = await createLights(scene);

		let collider = await CreateGround(scene);
		let land1 = await CreateLand1(scene);
		// let land2 = await CreateLand2(scene);
		let fence = await CreateFence(scene);

		let tree = await CreateTree(scene);

		let girl = await createGirl(scene, Game);
		let followCamera = createFollowCameralock(scene, girl);
		return scene;
	};

	function createRoomGUI(scene) {
		var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
		var roomBTN = GUI.Button.CreateSimpleButton("but1", "Create Room");
		roomBTN.width = "175px";
		roomBTN.width = 0.2;
		roomBTN.height = "40px";
		roomBTN.cornerRadius = 20;
		roomBTN.color = "Orange";
		roomBTN.thickness = 4;
		roomBTN.background = "green";
		roomBTN.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
		roomBTN.onPointerUpObservable.add(function () {
			let room = prompt("Room Name");
			socket.emit("new-room", room);
		});

		advancedTexture.addControl(roomBTN);
	}

	async function ListRoomGUI(scene) {
		const data = await fetch("http://10.106.0.21:4000")
			.then((response) => response.json())
			.then((data) => {
				var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
				Object.keys(data.rooms).forEach((room) => {
					var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
					var roomBTN = GUI.Button.CreateSimpleButton("but1", `Join ${room}`);
					roomBTN.width = "175px";
					roomBTN.width = 0.2;
					roomBTN.height = "40px";
					roomBTN.cornerRadius = 20;
					roomBTN.color = "Orange";
					roomBTN.thickness = 4;
					roomBTN.background = "green";
					roomBTN.horizontalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
					roomBTN.onPointerUpObservable.add(function () {
						let name = prompt("Enter Your Name");
						// socket.emit('new-user',room , name)
					});
					advancedTexture.addControl(roomBTN);
				});
			});
	}

	function createFollowCameralock(scene, target) {
		let camera = new BABYLON.FollowCamera("tankFollowCamera", target.position, scene, target);
		camera.radius = 20; // how far from the object to follow
		camera.heightOffset = 4; // how high above the object to place the camera
		camera.rotationOffset = 180; // the viewing anglewww
		camera.cameraAcceleration = 0.1; // how fast to move
		camera.maxCameraSpeed = 5; // speed limit
		return camera;
	}
	async function CreateLand1(scene) {
		const land1 = await BABYLON.SceneLoader.ImportMesh("", "http://10.106.0.21:3000/assets/", "Land1.glb", scene, (meshes) => {
			let first = scene.getMeshByName("__root__");
			let second = scene.getMeshByName("my_flore");
			meshes[0].position.y = -2.5;
			first.checkCollisions = true;
			second.checkCollisions = true;
		});
		return land1;
	}

	async function CreateLand2(scene) {
		const land2 = await BABYLON.SceneLoader.ImportMesh("", "http://10.106.0.21:3000/assets/", "Land2.glb", scene, (meshes) => {
			// meshes[0].position.x = -150;
			meshes[0].position.y = -3;
			meshes[0].position.x = 160;
			meshes[0].position.z = 80;
			meshes.forEach((i) => {
				i.checkCollisions = true;
			});
		});

		return land2;
	}

	function CreateGround(scene) {
		let ground = new BABYLON.Mesh.CreateGroundFromHeightMap("ground", "http://10.106.0.21:3000/assets/hmap1.png", 57, 62, 20, 0, 10, scene, false, OnGroundCreated);
		ground.position.y = -3.5;
		ground.position.x = -3.5;
		ground.position.z = 3.5;

		function OnGroundCreated() {
			let groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
			groundMaterial.alpha = 0; // to invisible mesh
			groundMaterial.ambientTexture = new BABYLON.Texture("http://10.106.0.21:3000/assets/grass.png", scene);
			ground.material = groundMaterial;
			ground.checkCollisions = true;
		}
		return ground;
	}

	async function CreateFence(scene) {
		const fence = new BABYLON.SceneLoader.ImportMesh("", "http://10.106.0.21:3000/assets/", "Fence.obj", scene, (meshes) => {
			meshes.forEach((i) => {
				i.position.y = -1;
				i.checkCollisions = true;
				i.scaling.scaleInPlace(0.01);
				i.position.z = -10;
			});
		});
		return fence;
	}

	async function CreateTree(scene) {
		// const tree = new BABYLON.SceneLoader.ImportMesh("", "http://10.106.0.21:3000/assets/", "urban_tree.glb", scene, (meshes) => {
		// 	console.log("ssssssssssssssssss", meshes);
		// 	meshes.forEach((i) => {
		// 		i.position.y = -1.5;
		// 		i.position.x = -4;
		// 		i.checkCollisions = true;
		// 		// i.scaling.scaleInPlace(0.06);
		// 		// i.position.z = -10;
		// 	});
		// });
		// return tree;

		const tree = await BABYLON.SceneLoader.ImportMesh("", "http://10.106.0.21:3000/assets/", "urban_tree.glb", scene, (meshes) => {
			// meshes[0].position.x = -150;
			meshes[0].position.y = -1.5;
			meshes[0].position.x = 5 ;
			// meshes[0].position.z = 10;
			meshes.forEach((i) => {
				i.checkCollisions = true;
			});
		});
		return tree;
	}
	async function createLights(scene) {
		let light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
		light.intensity = 0.7;
	}

	async function CreateArcRotateCamera(scene) {
		let camera = new BABYLON.ArcRotateCamera("camera1", 10, Math.PI / 4, 10, new BABYLON.Vector3(10, 0, 10), scene);
		scene.activeCamera = camera;
		scene.activeCamera.attachControl(canvas, true);
		// camera.lowerRadiusLimit = 2;
		return camera;
	}

	async function CreateFollowCamera(scene) {
		// let camera = new BABYLON.ArcRotateCamera( "camera1", Math.PI / 2, Math.PI / 4, 10, new BABYLON.Vector3(0, -5, 0), scene);
		let camera = new BABYLON.FollowCamera("tankFollowCamera", new BABYLON.Vector3(10, 0, 10), scene);
		scene.activeCamera = camera;
		scene.activeCamera.attachControl(canvas, true);
		// camera.lowerRadiusLimit = 2;
		camera.heightOffset = 2;
		camera.rotationOffset = 180;
		camera.cameraAcceleration = 0.1;
		camera.maxCameraSpeed = 1;
		camera.attachControl(canvas, true);
		return camera;
	}

	async function createGirl(scene, Game, data) {
		let inputMap = {};
		scene.actionManager = new BABYLON.ActionManager(scene);
		scene.actionManager.registerAction(
			new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
				inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === "keydown";
			})
		);
		scene.actionManager.registerAction(
			new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
				inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === "keydown";
			})
		);

		scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), new BABYLON.CannonJSPlugin());

		let girl = await BABYLON.SceneLoader.ImportMeshAsync("", "http://10.106.0.21:3000/assets/", "HVGirl.glb", scene);
		girl.meshes.map((element) => {
			element.checkCollisions = true;
		});
		let hero = girl.meshes[0];
		hero.physicsImpostor = new BABYLON.PhysicsImpostor(hero, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 10 }, scene);
		//Scale the model down
		hero.scaling.scaleInPlace(0.15);
		hero.position.y = 0.32;
		hero.position.x = -20;

		const idleAnim = girl.animationGroups[0];
		const sambaAnim = girl.animationGroups[1];
		const walkAnim = girl.animationGroups[2];
		const walkBackAnim = girl.animationGroups[3];
		const gravity = new BABYLON.Vector3(0, -0.2, 0);

		hero.ellipsoid = new BABYLON.Vector3(0.01, 0.02, 0.01);
		hero.state = {
			id: Game.id,
			x: hero.position.x,
			y: hero.position.y,
			z: hero.position.z,
			isSPressed: false,
			isAPressed: false,
			isDPressed: false,
			isWPressed: false,
			isBPressed: false,
		};
		hero.setState = function (data) {
			hero.position.x = data.x;
			hero.position.y = data.y;
			hero.position.z = data.z;
			if (data.isAPressed || data.isDPressed) {
				hero.rotate(BABYLON.Vector3.Up(), data.r);
			}
		};

		if (data) {
			enemies[data.id] = girl;
			hero.setState(data);

			// --------------------- GUI BUTTON BOX -------------------------------
			var plane = BABYLON.Mesh.CreatePlane("plane", 5);
			plane.parent = hero;
			plane.position.y = 25;
			// var advancedTexture = new BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(
			//   plane
			// );
			var advancedTexture = GUI.AdvancedDynamicTexture.CreateForMesh(plane);
			var textblock = new GUI.TextBlock();
			textblock.text = data.Game.name;
			textblock.fontSize = 300;
			textblock.color = "white";
			advancedTexture.addControl(textblock);
			// --------------------- GUI BUTTON BOX -------------------------------
		} else {
			// --------------------- GUI BUTTON BOX -------------------------------
			var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

			var textblock = new GUI.TextBlock();
			textblock.height = "20px";
			textblock.text = Game.name;
			textblock.fontSize = 20;
			textblock.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
			textblock.color = "white";
			advancedTexture.addControl(textblock);
			// --------------------- GUI BUTTON BOX -------------------------------

			// camera.target = hero;
			// camera.lockedTarget = hero;
			socket.emit("IWasCreated", GameData, hero.state);
		}

		hero.move = function () {
			let heroSpeed = 0.1;
			let heroSpeedBackwards = 0.05;
			let heroRotationSpeed = 0.1;
			const gravity = new BABYLON.Vector3(0, -0.2, 0);

			let notifyServer = false;
			hero.state.notifyServer = false;
			if (hero.position.y > 2) {
				hero.moveWithCollisions(new BABYLON.Vector3(0, -2, 0));
				notifyServer = true;
			}

			if (isWPressed) {
				walkAnim.start(true, 1.0, walkAnim.from, walkAnim.to, false);
				const vec = hero.forward.scale(heroSpeed).add(gravity);
				hero.moveWithCollisions(vec);
				notifyServer = true;
				hero.state.notifyServer = true;
			}
			if (isSPressed) {
				const vec = hero.forward.scale(-heroSpeedBackwards).add(gravity);
				hero.moveWithCollisions(vec);
				walkBackAnim.start(true, 1.0, walkBackAnim.from, walkBackAnim.to, false);
				notifyServer = true;
				hero.state.notifyServer = true;
			}
			if (isAPressed) {
				hero.state.r = -heroRotationSpeed;
				hero.rotate(BABYLON.Vector3.Up(), -heroRotationSpeed);
				hero.frontVector = new BABYLON.Vector3(Math.sin(hero.rotation.y), 0, Math.cos(hero.rotation.y));
				notifyServer = true;
			}
			if (isDPressed) {
				hero.state.r = heroRotationSpeed;
				hero.rotate(BABYLON.Vector3.Up(), heroRotationSpeed);
				hero.frontVector = new BABYLON.Vector3(Math.sin(hero.rotation.y), 0, Math.cos(hero.rotation.y));
				notifyServer = true;
			}
			if (isBPressed) {
				sambaAnim.start(true, 1.0, sambaAnim.from, sambaAnim.to, false);
				notifyServer = true;
				hero.state.notifyServer = true;
			}
		

			if (notifyServer) {
				hero.state.x = hero.position.x;
				hero.state.y = hero.position.y;
				hero.state.z = hero.position.z;
				hero.state.isSPressed = isSPressed;
				hero.state.isAPressed = isAPressed;
				hero.state.isDPressed = isDPressed;
				hero.state.isWPressed = isWPressed;
				hero.state.isBPressed = isBPressed;
			} else {
				hero.state.isSPressed = false;
				hero.state.isAPressed = false;
				hero.state.isDPressed = false;
				hero.state.isWPressed = false;
				hero.state.isBPressed = false;
				idleAnim.start(true, 1.0, idleAnim.from, idleAnim.to, false);
				//Stop all animations besides Idle Anim when no key is down
				sambaAnim.stop();
				walkAnim.stop();
				walkBackAnim.stop();
				hero.state.notifyServer = false;
			}
			socket.emit("IMoved", Game, hero.state);
		};

		function vecToLocal(vector, mesh) {
			var m = mesh.getWorldMatrix();
			var v = BABYLON.Vector3.TransformCoordinates(vector, m);
			return v;
		}

		function castRay() {
			var origin = hero.position;

			var forward = new BABYLON.Vector3(0, 0, 1);
			forward = vecToLocal(forward, hero);

			var direction = forward.subtract(origin);
			direction = BABYLON.Vector3.Normalize(direction);

			var length = 15;

			var ray = new BABYLON.Ray(origin, direction, length);

			// let rayHelper = new BABYLON.RayHelper(ray);
			// rayHelper.show(scene);

			var hit = scene.pickWithRay(ray);

			if (hit.pickedMesh) {
				let mesh =hit.pickedMesh
				// console.log("aaaaaaaaaaaa",mesh.id);
			
				let array =['ground','my_flore']

				//  array.find(element => {console.log("2222222222222",element)});
				if(!array.includes(mesh.id)){
					// mesh.setEnabled( false); 
					mesh.setEnabled((mesh.isEnabled() ? false : true)); 
				}
				
			}
		}

		scene.registerBeforeRender(function() {
			castRay();
		});




		return hero;
	}

	window.addEventListener("resize", function () {
		engine.resize();
	});

	function modifySettings() {
		scene.onPointerDown = function () {
			if (!scene.alreadyLocked) {
				console.log("Requesting pointer lock");
				canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
				canvas.requestPointerLock();
			} else {
				console.log("Not requesting because we are already locked");
			}
		};

		document.addEventListener("pointerlockchange", pointerLockListener);
		document.addEventListener("mspointerlockchange", pointerLockListener);
		document.addEventListener("mozpointerlockchange", pointerLockListener);
		document.addEventListener("webkitpointerlockchange", pointerLockListener);

		function pointerLockListener() {
			let element = document.mozPointerLockElement || document.webkitPointerLockElement || document.msPointerLockElement || document.pointerLockElement || null;

			if (element) {
				scene.alreadyLocked = true;
			} else {
				scene.alreadyLocked = false;
			}
		}
	}

	document.addEventListener("keydown", function (event) {
		if (event.key === "w" || event.key === "W") {
			isWPressed = true;
		}
		if (event.key === "s" || event.key === "S") {
			isSPressed = true;
		}
		if (event.key === "a" || event.key === "A") {
			isAPressed = true;
		}
		if (event.key === "d" || event.key === "D") {
			isDPressed = true;
		}
		if (event.key === "b" || event.key === "B") {
			isBPressed = true;
		}
	});

	document.addEventListener("keyup", function (event) {
		if (event.key === "w" || event.key === "W") {
			isWPressed = false;
		}
		if (event.key === "s" || event.key === "S") {
			isSPressed = false;
		}
		if (event.key === "a" || event.key === "A") {
			isAPressed = false;
		}
		if (event.key === "d" || event.key === "D") {
			isDPressed = false;
		}
		if (event.key === "b" || event.key === "B") {
			isBPressed = false;
		}
	});

	const [count, setCount] = useState(0);

	useEffect(() => {
		console.log("inside useeffect");
		connectToServer();
	}, []);

	return <canvas style={myStyle} ref={canvasRef} {...props}></canvas>;
};
export default ReactCanvas;
