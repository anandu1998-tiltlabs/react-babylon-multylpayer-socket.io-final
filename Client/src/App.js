import { useEffect, useState } from "react";
import socketIO from "socket.io-client";
import Scene from "./components/canvas";
import LandingPage from "./components/landing-page";
import { BrowserRouter, Switch, Route } from "react-router-dom";
const { REACT_APP_SERVER_DOMAIN } = process.env;


function App() {
	const [room, setRoom] = useState("");
	const [socket, setSocket] = useState("");
	const [roomOne, setRoomOne] = useState([]);

	const handleApi = () => {
		fetch(REACT_APP_SERVER_DOMAIN)
			.then((response) => response.json())
			.then((data) => setRoomOne(Object.keys(data.rooms)));
	};

	useEffect(() => {
		const socket = socketIO.connect(REACT_APP_SERVER_DOMAIN,{transports: ['websocket']});
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
