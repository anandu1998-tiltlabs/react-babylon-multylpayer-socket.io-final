import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import socketIO from "socket.io-client"
const IO = socketIO.connect("http://localhost:4000")
const LandingPage = (props) => {

const history = useHistory();
const [value,setValue]= useState('')
const [rooms, setRooms]= useState([])
const [isName,setIsName]= useState(false)
const [name,setName]= useState('')
const socket=  props.socket;

const handleRoom = (value) => {

props.setRoom(value)
  socket.emit('new-room',value)
  };

  const handleApi=()=>{
    fetch('http://localhost:4000/')
    .then(response => response.json() )
    .then(data => setRooms(Object.keys( data.rooms )));    
  } 


  IO.on('room-added', (rooms) => {
    setRooms(Object.keys( rooms ))

  })

useEffect(()=>{
  handleApi()
},[])


const handleRoute = ()=>{
  setIsName(true)
}
const handleName = (room, name)=>{
  localStorage.setItem('room', room);
  localStorage.setItem('name', name);
  socket.disconnect();
  history.push(`/${room}`)
}

  return <>
    <h1>welcome</h1>
    <div className="room-container">
    <form>
      <input type="text" onChange={(e)=>{setValue(e.target.value)}} placeholder="Enter Room Name" ></input>
        <button type="submit" onClick={()=>handleRoom(value)}>New Room</button>
    </form>
    <hr/>
    </div>

    {rooms.map((room, index) =>
     
      <div key={index}>
        <h3>{room}</h3>
        <button onClick={()=>handleRoute()} >Join Room </button>
        <br></br>
        {isName && <input type="text" onChange={(e)=>{setName(e.target.value)}} placeholder="Enter Your Name" ></input> }
        {isName && <button onClick={()=>handleName(room, name)}> Submit </button> }
        <hr/>
      </div>
    )}
    
   
  </>;
};
export default LandingPage;
