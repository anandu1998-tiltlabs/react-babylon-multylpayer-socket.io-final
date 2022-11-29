const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http").Server(app);
const PORT = 4000;
const socketIO = require("socket.io")(http, {
	cors: {
		origin: "*",
	},
});

app.use(cors());

var tanks = {};
const rooms = {};

app.get("/", (req, res) => {
	res.send({ rooms: rooms });
});

socketIO.on("connection", (socket) => {
	console.log("A client tried to connect with ID :: " + socket.id);

	socket.emit("GetYourID", { id: socket.id });

	socket.on("new-room", (room) => {
		rooms[room] = { users: {} };
		tanks[room] = {};
		socket.broadcast.emit("room-added", rooms);
	});

	socket.on("ThankYou", function (Game) {
		if (Game.room in rooms) {
			socket.join(Game.room);
			rooms[Game.room].users[Game.id] = Game.name;
			console.log("The client: " + Game.name + " with ID :" + socket.id + " in Room: " + Game.room + " Sent me a thankyou ");
			socket.emit("Start", Game);
		}
	});

	socket.on("disconnect", () => {
		getUserRooms(socket).forEach((room) => {
			socket.broadcast.to(room).emit("AnotherWentAway", { id: socket.id });
			delete rooms[room].users[socket.id];
			delete tanks[room][socket.id];
		});

		// console.log("inside disconnect");
	});

	socket.on("IWasCreated", function (Game, data) {
		if (Game.room in rooms) {
			if (data.id != socket.id) {
				// kick the cheater out;
			}
			tanks[Game.room][data.id] = data;
			tanks[Game.room][data.id]["Game"] = Game;
			socket.broadcast.to(Game.room).emit("AnotherTankCreated", Game, data);

			for (key in tanks[Game.room]) {
				if (key == socket.id) continue;
				socket.emit("AnotherTankCreated", tanks[Game.room][data.id]["Game"], tanks[Game.room][key]);
			}
		}
	});

	socket.on("IMoved", function (Game, data) {
		if (Game.room in rooms) {
			const name = rooms[Game.room].users[socket.id];
			tanks[Game.room][data.id] = data;
			tanks[Game.room][data.id]["Game"] = Game;
			socket.broadcast.to(Game.room).emit("AnotherTankMoved", data);
		}
	});

	socket.on("IGoAway", function (Game, data) {
		if (Game.room in rooms) {
			delete tanks[Game.room][socket.id];
			const name = rooms[Game.room].users[socket.id];
			socket.broadcast.to(Game.room).emit("AnotherWentAway", Game, { id: socket.id });
		}
	});
});

http.listen(PORT,'0.0.0.0', () => {
	console.log(`Server listening on ${PORT}`);
});

function getUserRooms(socket) {
	return Object.entries(rooms).reduce((names, [name, room]) => {
		if (room.users[socket.id] != null) names.push(name);
		return names;
	}, []);
}
