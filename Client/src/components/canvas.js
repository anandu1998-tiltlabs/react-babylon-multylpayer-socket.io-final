import React, { useRef, useEffect, useState } from "react";
import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import * as GUI from "babylonjs-gui";
import * as cannon from "cannon";
import socketIO from "socket.io-client";
import AgoraRTC from "agora-rtc-sdk-ng";
const { REACT_APP_SERVER_DOMAIN } = process.env;

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
	let girl;
	let new_count = { x: 0, y: 0, z: 0 };

	let isWPressed = false;
	let isSPressed = false;
	let isAPressed = false;
	let isDPressed = false;
	let isBPressed = false;

	// const socket = socketIO.connect(REACT_APP_SERVER_DOMAIN,{  extraHeaders: {
	// 	"ngrok-skip-browser-warning":"any"
	//   }});

	const socket = socketIO.connect(REACT_APP_SERVER_DOMAIN);
	const locRoom = localStorage.getItem("room");
	const locName = localStorage.getItem("name");

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
				let girl = enemies[data.id];
				let hero = girl?.meshes[0];
				hero?.setState(data);
				const idleAnim = girl?.animationGroups[0];
				const sambaAnim = girl?.animationGroups[1];
				const walkAnim = girl?.animationGroups[2];
				const walkBackAnim = girl?.animationGroups[3];

				//Manage animations to be played
				if (data.notifyServer) {
					if (data.isSPressed) {
						walkBackAnim?.start(true, 1.0, walkBackAnim.from, walkBackAnim.to, false);
					}
					if (data.isWPressed) {
						walkAnim?.start(true, 1.0, walkAnim.from, walkAnim.to, false);
					}
					if (data.isBPressed) {
						sambaAnim?.start(true, 1.0, sambaAnim.from, sambaAnim.to, false);
					}
				} else {
					//Default animation is idle when no key is down
					idleAnim?.start(true, 1.0, idleAnim.from, idleAnim.to, false);

					//Stop all animations besides Idle Anim when no key is down
					sambaAnim?.stop();
					walkAnim?.stop();
					walkBackAnim?.stop();
				}
			});

			socket.on("AnotherWentAway", function (data) {
				let hero = enemies[data.id].meshes[0];
				hero.dispose();
				delete enemies[data.id];
			});
		});
	}

	let options = {
		// Pass your App ID here.
		appId: "a93ab8fcde6049e497af9d0911758c5b",
		// Set the channel name.
		channel: "vvv",
		// Pass your temp token here.
		token: "007eJxTYNhtvGvzw2oXEd+Hd95YZoU9VipMn9Zemal5oUeh+EmrqbQCQ6KlcWKSRVpySqqZgYllqomleWKaZYqBpaGhualFsmnSf4+O5IZARgbGi6qsQBIMQXxmhrKyMgYGAFBlHyo=",
		// Set the user ID.
		uid: 0,
	};
	let channelParameters = {
		// A variable to hold a local audio track.
		localAudioTrack: null,
		// A variable to hold a remote audio track.
		remoteAudioTrack: null,
		// A variable to hold the remote user id.
		remoteUid: null,
	};
	async function startBasicCall() {
		// Create an instance of the Agora Engine
		const agoraEngine = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
		// Listen for the "user-published" event to retrieve an AgoraRTCRemoteUser object.
		agoraEngine.on("user-published", async (user, mediaType) => {
			// Subscribe to the remote user when the SDK triggers the "user-published" event.
			await agoraEngine.subscribe(user, mediaType);
			console.log("subscribe success");
			// Subscribe and play the remote audio track.
			if (mediaType == "audio") {
				channelParameters.remoteUid = user.uid;
				// Get the RemoteAudioTrack object from the AgoraRTCRemoteUser object.
				channelParameters.remoteAudioTrack = user.audioTrack;
				// Play the remote audio track.
				channelParameters.remoteAudioTrack.play();
				showMessage("Remote user connected: " + user.uid);
			}
			// Listen for the "user-unpublished" event.
			agoraEngine.on("user-unpublished", (user) => {
				console.log(user.uid + "has left the channel");
				showMessage("Remote user has left the channel");
			});
		});
		const onLoad = async () => {
			// Listen to the Join button click event.
			// Join a channel.
			await agoraEngine.join(options.appId, options.channel, options.token, options.uid);
			showMessage("Joined channel: " + options.channel);
			// Create a local audio track from the microphone audio.
			channelParameters.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
			// Publish the local audio track in the channel.
			await agoraEngine.publish(channelParameters.localAudioTrack);
			console.log("Publish success!");
			// Listen to the Leave button click event.
			// document.getElementById('leave').onclick = async function ()
			// {
			//   // Destroy the local audio track.
			//   channelParameters.localAudioTrack.close();
			//   // Leave the channel
			//   await agoraEngine.leave();
			//   console.log("You left the channel");
			//   // Refresh the page for reuse
			//   window.location.reload();
			// }
		};
		onLoad();
	}
	function showMessage(text) {
		//   document.getElementById("message").textContent = text;
		console.log(" text----->", text);
	}

	async function startGame(Game) {
		canvas = canvasRef.current;
		engine = new BABYLON.Engine(canvas, true);
		scene = new BABYLON.Scene(engine);
		let new_girl = createScene(Game);
		girl = await new_girl;
		let toRender = async function () {
			scene.render();
			await girl?.move();
		};
		engine.runRenderLoop(toRender);
	}

	let createScene = async function (Game) {
		scene.collisionsEnabled = true;
		// camera = await CreateArcRotateCamera(scene)
		// camera = await CreateFollowCamera(scene)

		let light = createLights(scene);
		let girl = createGirl(scene, Game);
		let collider = CreateGround(scene);
		let land1 = CreateLand1(scene);
		// let land2 = awaitCreateLand2(scene);
		// let fence =  CreateFence(scene);
		// let tree =  CreateTree(scene);

		let new_light = await light;
		let new_girl = await girl;
		let new_collider = await collider;
		let new_land1 = await land1;
		// let new_fence = await fence ;
		// let new_tree = await tree ;

		let followCamera = createFollowCameralock(scene, new_girl);
		let new_followCamera = await followCamera;

		return new_girl;
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
		const data = await fetch(REACT_APP_SERVER_DOMAIN)
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

	async function createFollowCameralock(scene, target) {
		let camera = await new BABYLON.FollowCamera("tankFollowCamera", target.position, scene, target);
		camera.radius = 20; // how far from the object to follow
		camera.heightOffset = 4; // how high above the object to place the camera
		camera.rotationOffset = 180; // the viewing anglewww
		camera.cameraAcceleration = 0.1; // how fast to move
		camera.maxCameraSpeed = 5; // speed limit
		return camera;
	}
	async function CreateLand1(scene) {
		const land1 = await BABYLON.SceneLoader.ImportMesh("", "/assets/", "Land1.glb", scene, (meshes) => {
			let first = scene.getMeshByName("__root__");
			let second = scene.getMeshByName("my_flore");
			meshes[0].position.y = -2.5;
			first.checkCollisions = true;
			second.checkCollisions = true;
		});
		return land1;
	}

	async function CreateLand2(scene) {
		const land2 = await BABYLON.SceneLoader.ImportMesh("", "/assets/", "Land2.glb", scene, (meshes) => {
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
		let ground = new BABYLON.Mesh.CreateGroundFromHeightMap("ground", "/assets/hmap1.png", 57, 62, 20, 0, 10, scene, false, OnGroundCreated);
		ground.position.y = -3.5;
		ground.position.x = -3.5;
		ground.position.z = 3.5;

		function OnGroundCreated() {
			let groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
			groundMaterial.alpha = 0; // to invisible mesh
			groundMaterial.ambientTexture = new BABYLON.Texture("/assets/grass.png", scene);
			ground.material = groundMaterial;
			ground.checkCollisions = true;
		}
		return ground;
	}

	async function CreateFence(scene) {
		const fence = new BABYLON.SceneLoader.ImportMesh("", "/assets/", "Fence.obj", scene, (meshes) => {
			meshes.forEach((i) => {
				i.position.y = -1;
				i.checkCollisions = true;
				i.scaling.scaleInPlace(0.01);
				i.position.z = -10;
				// console.log("fence ", i._absolutePosition)
			});
		});
		return fence;
	}

	async function CreateTree(scene) {

		const tree = await BABYLON.SceneLoader.ImportMesh("", "/assets/", "urban_tree.glb", scene, (meshes) => {
			// meshes[0].position.x = -150;
			meshes[0].position.y = -1.5;
			meshes[0].position.x = 5;
			// meshes[0].position.z = 10;
			meshes.forEach((i) => {
				i.checkCollisions = true;
			});
		});
		return tree;
	}
	async function createLights(scene) {
		let light = await new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
		light.intensity = 0.7;
	}

	async function CreateArcRotateCamera(scene) {
		let camera = await new BABYLON.ArcRotateCamera("camera1", 10, Math.PI / 4, 10, new BABYLON.Vector3(10, 0, 10), scene);
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
		scene.actionManager = await new BABYLON.ActionManager(scene);
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

		let girl = await BABYLON.SceneLoader.ImportMeshAsync("", "/assets/", "HVGirl.glb", scene);
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

		hero.move = async function () {
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
				walkAnim?.start(true, 1.0, walkAnim.from, walkAnim.to, false);
				const vec = hero.forward.scale(heroSpeed).add(gravity);
				hero.moveWithCollisions(vec);
				notifyServer = true;
				hero.state.notifyServer = true;
			}
			if (isSPressed) {
				const vec = hero.forward.scale(-heroSpeedBackwards).add(gravity);
				hero.moveWithCollisions(vec);
				walkBackAnim?.start(true, 1.0, walkBackAnim.from, walkBackAnim.to, false);
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
				sambaAnim?.start(true, 1.0, sambaAnim.from, sambaAnim.to, false);
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
				idleAnim?.start(true, 1.0, idleAnim.from, idleAnim.to, false);
				//Stop all animations besides Idle Anim when no key is down
				sambaAnim?.stop();
				walkAnim?.stop();
				walkBackAnim?.stop();
				hero.state.notifyServer = false;
			}
			// console.log("aaaaaaaaaaaa", hero._absolutePosition);
			socket.emit("IMoved", Game, hero.state);
		};

		// function vecToLocal(vector, mesh) {
		// 	var m = mesh.getWorldMatrix();
		// 	var v = BABYLON.Vector3.TransformCoordinates(vector, m);
		// 	return v;
		// }

		// function castRay() {
		// 	var origin = hero.position;

		// 	var forward = new BABYLON.Vector3(0, 0, 1);
		// 	forward = vecToLocal(forward, hero);

		// 	var direction = forward.subtract(origin);
		// 	direction = BABYLON.Vector3.Normalize(direction);

		// 	var length = 15;

		// 	var ray = new BABYLON.Ray(origin, direction, length);

		// 	let rayHelper = new BABYLON.RayHelper(ray);
		// 	rayHelper.show(scene);

		// 	var hit = scene.pickWithRay(ray);

		// 	if (hit.pickedMesh) {
		// 		let mesh =hit.pickedMesh
		// 		// console.log("aaaaaaaaaaaa",mesh.id);

		// 		let array =['ground','my_flore']

		// 		//  array.find(element => {console.log("2222222222222",element)});
		// 		if(!array.includes(mesh.id)){
		// 			// mesh.setEnabled( false);
		// 			console.log("2222222222222",mesh.id)
		// 			mesh.setEnabled((mesh.isEnabled() ? false : true));
		// 		}

		// 	}
		// }

		// scene.registerBeforeRender(function() {
		// 	castRay();
		// });

		return hero;
	}

	window.addEventListener("resize", function () {
		engine?.resize();
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

	const loadAssets = async () => {
		let distance = 15;
		let refresh_distance = 2;
		if (
			girl?._absolutePosition.x - new_count.x > refresh_distance ||
			girl?._absolutePosition.x - new_count.x < -refresh_distance ||
			girl?._absolutePosition.z - new_count.z > refresh_distance ||
			girl?._absolutePosition.z - new_count.z < -refresh_distance
		) {
			new_count.x = girl?._absolutePosition.x;
			new_count.z = girl?._absolutePosition.z;

			let array = [
				"ground",
				"HVGirl_primitive0",
				"HVGirl_primitive1",
				"HVGirl_primitive2",
				"HVGirl_primitive3",
				"HVGirl_primitive4",
				"HVGirl_primitive5",
				"HVGirl_primitive6",
				"HVGirl_primitive7",
				"HVGirl_primitive8",
				"HVGirl_primitive9",
				"HVGirl_primitive10",
				"my_flore",
				"__root__",
				"HVGirl_primitive0",
				"plane",
				"Mesh_galho",
			];

			// 		let array = ["ground","1","2","3","4","__root__","HVGirl_primitive0","HVGirl_primitive1",
			// 		"HVGirl_primitive2","HVGirl_primitive3","HVGirl_primitive4","HVGirl_primitive5",
			// 		"HVGirl_primitive6","HVGirl_primitive7","HVGirl_primitive8","HVGirl_primitive9",
			// 		"HVGirl_primitive10","my_flore","plane","Mesh_galho","Mesh_Folhagem_0","Mesh_galho fino_0"

			if (girl?._absolutePosition.z - -10 < distance) {
				let fence = CreateFence(scene);
				let new_fence = await fence;
			}
			if (girl?._absolutePosition.x - 5 < distance) {
				let tree = CreateTree(scene);
				let new_tree = await tree;
			}

			scene?.meshes?.forEach((mesh) => {
				if (!array.includes(mesh.id)) {
					if (
						girl?._absolutePosition.x - mesh?._absolutePosition.x > distance ||
						girl?._absolutePosition.x - mesh?._absolutePosition.x < -distance ||
						girl?._absolutePosition.z - mesh?._absolutePosition.z > distance ||
						girl?._absolutePosition.z - mesh?._absolutePosition.z < -distance
					) {
						mesh?.dispose();
					}
				}
			});
		}
	};

	document.addEventListener("keydown", async function (event) {
		await loadAssets();

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
		// startBasicCall()
		console.log("inside useeffect");
		connectToServer();
	}, []);

	return <canvas style={myStyle} ref={canvasRef} {...props}></canvas>;
};
export default ReactCanvas;
