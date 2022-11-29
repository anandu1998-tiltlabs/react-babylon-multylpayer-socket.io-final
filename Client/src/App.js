import { useEffect, useState } from "react";
import socketIO from "socket.io-client";
import Scene from "./components/canvas";
import LandingPage from "./components/landing-page";
import { BrowserRouter, Switch, Route } from "react-router-dom";
console.log("aaaaaaaaaaa",process.env.SERVER_DOMAIN);

function App() {
	const [room, setRoom] = useState("");
	const [socket, setSocket] = useState("");
	const [roomOne, setRoomOne] = useState([]);

	const handleApi = () => {
		fetch("http://10.106.0.21:4000/")
			.then((response) => response.json())
			.then((data) => setRoomOne(Object.keys(data.rooms)));
	};

	useEffect(() => {
		const socket = socketIO.connect("http://10.106.0.21:4000",{transports: ['websocket']});
		setSocket(socket);
		handleApi();
	}, []);
	return (
		<div className="App">
			<BrowserRouter>
				<Switch>
					<Route exact path="/">
						<LandingPage socket={socket} setRoom={(room) => setRoom(room)} />{" "}
					</Route>
					{roomOne.map((item, index) => (
						<Route key={index} path={`/:${item}`}>
							{" "}
							<Scene room={room} />{" "}
						</Route>
					))}
				</Switch>
			</BrowserRouter>
		</div>
	);
}

export default App;
