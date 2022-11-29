import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import socketIO from "socket.io-client";
const IO = socketIO.connect("http://10.106.0.21:4000");

const LandingPage = (props) => {
	const history = useHistory();
	const [value, setValue] = useState("");
	const [rooms, setRooms] = useState([]);
	const [createRooms, setCreateRooms] = useState(false);
	const [isName, setIsName] = useState(false);
	const [name, setName] = useState("");
	const socket = props.socket;

	const handleRoom = (value) => {
		props.setRoom(value);
		socket.emit("new-room", value);
	};

	const handleApi = () => {
		fetch("http://10.106.0.21:4000/")
			.then((response) => response.json())
			.then((data) => setRooms(Object.keys(data.rooms)));
	};

	IO.on("room-added", (rooms) => {
		setRooms(Object.keys(rooms));
	});

	useEffect(() => {
		handleApi();
	}, []);

	const handleName = (room, name) => {
		localStorage.setItem("room", room);
		localStorage.setItem("name", name);
		socket.disconnect();
		history.push(`/${room}`);
	};

	return (
		<div className="landingpage-container">
			<div className="room-container1">
				<h1>Hi!</h1>
				<hr></hr>
				<h3>Create Room</h3>
				<div className="room-container">
					<form>
						{!createRooms && (
							<button
								className="button"
								onClick={() => {
									setCreateRooms(true);
									setIsName(false);
								}}
							>
								Create Room{" "}
							</button>
						)}
						{createRooms && (
							<input
								type="text"
								onChange={(e) => {
									setValue(e.target.value);
								}}
								placeholder="Enter Room Name"
								className="input"
							></input>
						)}

						{createRooms && (
							<button className="button" type="submit" onClick={() => handleRoom(value)}>
								Create
							</button>
						)}
					</form>
				</div>

				{rooms.length > 0 && (
					<>
						<h3>Join Room</h3> <hr></hr>
						<input
							type="text"
							onChange={(e) => {
								setName(e.target.value);
							}}
							placeholder="Enter Your Name"
							className="input"
						></input>
					</>
				)}

				{rooms.map((room, index) => (
					<form>
						<div key={index}>
							<button className="button" type="submit" onClick={() => handleName(room, name)}>
								{" "}
								{room}
							</button>
						</div>
					</form>
				))}
			</div>
		</div>
	);
};
export default LandingPage;
