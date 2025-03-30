/** @type {HTMLCanvasElement} */

// import { io } from "socket.io-client";
import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";

const backendLink = "https://tankmultiplayergame-production.up.railway.app/";
// const backendLink = 'http://localhost:8001';

const socket = io(backendLink);
let socketID;

let players = {};

socket.on("connect", () => {
    socketID = socket.id;
    console.log("Connected to server, ID:", socket.id);
});

socket.on("connect_error", (err) => {
    console.error("Connection Error:", err.message);
});

// 1. New player connection
socket.on("newPlayerJoined", ({socketID, x, y, angle, colorBasedSpriteCoordinates}) => {
    
    players[socketID] = new Player(socketID, x, y, angle, colorBasedSpriteCoordinates);
});

// update players Object (only executes once after connection)
socket.on("dataForNewPlayer", (playersObject) => {
    
    players = {};

    for (const [socketID, player] of Object.entries(playersObject)) {
        console.log(player);

        players[socketID] = new Player(
            player.socketID, 
            player.x, 
            player.y, 
            player.angle, 
            player.colorBasedSpriteCoordinates
        );
    }
    
});

// Delete the disconnected player for still connected client
socket.on("playerLeft", (socketID) => {
    delete players[socketID];
})

// The moved players are updated locally
socket.on('otherPlayerMoved', ({socketID, x, y, angle}) => {
    players[socketID].x = x;
    players[socketID].y = y;
    players[socketID].angle = angle; 
});

const CANVAS = document.getElementById("canvas");
const ctx = CANVAS.getContext('2d');
CANVAS.width = 1000;
CANVAS.height = 1000;



const keysPressed = {};

// EVENTS

window.addEventListener("keydown", (event) => {
    keysPressed[event.key] = true; // Mark key as pressed
});

window.addEventListener("keyup", (event) => {
    delete keysPressed[event.key]; // Remove key when released
});

window.addEventListener("click", (event) => {
    console.log(event.x, event.y);
});

class Player {
    constructor(socketID, x = 0, y = 0, angle = 0, colorBasedSpriteCoordinates = { tank: { x: 588, y: 0 }, barrel: { x: 834, y: 0 } } ) {
        this.socketID = socketID;
        this.x = x;
        this.y = y;
        this.speed = 5;
        this.width = 50;
        this.height = 50;
        // <SubTexture name="tankRed_outline.png" x="588" y="0" width="83" height="78"/>
        // <SubTexture name="barrelRed_outline.png" x="834" y="0" width="24" height="58"/>
        this.image = document.getElementById('tankSheet');
        this.spriteWidth = 83;
        this.spriteHeight = 78;
        this.barrelSpriteWidth = 24;
        this.barrelSpriteHeight = 58;
        this.colorBasedSpriteCoordinates = colorBasedSpriteCoordinates;
        

        this.angle = angle;
        
    }
    draw() {
        
        // Tank
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2); // rotation pivot
        ctx.rotate(this.angle);
        ctx.drawImage(this.image, this.colorBasedSpriteCoordinates.tank.x, this.colorBasedSpriteCoordinates.tank.y, this.spriteWidth, this.spriteHeight, -this.spriteWidth * 0.5, -this.spriteHeight * 0.5, this.spriteWidth, this.spriteHeight);
        ctx.restore();
        
        // Barrel
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.width / 2); // rotation pivot
        ctx.rotate(this.angle);
        ctx.drawImage(this.image, this.colorBasedSpriteCoordinates.barrel.x, this.colorBasedSpriteCoordinates.barrel.y, 24, 58, -this.barrelSpriteWidth * 0.5, -this.barrelSpriteHeight * 0.5 - (this.width * 0.5), this.barrelSpriteWidth, this.barrelSpriteHeight);
        ctx.restore();
    }
    update() {
        let moved = false;
        
        if (keysPressed["w"] || keysPressed["ArrowUp"]) {
            this.y -= this.speed;
            this.angle = 0;
            if (this.y < 0) this.y = 0; // boundary-top
            moved = true;
        }
        if (keysPressed["s"] || keysPressed["ArrowDown"]) {
            this.y += this.speed;
            this.angle = Math.PI;
            if (this.y > (1000 - this.height)) this.y = 1000 - this.height; // boundary-bottom
            moved = true;
        }
        if (keysPressed["a"] || keysPressed["ArrowLeft"]) {
            this.x -= this.speed;
            this.angle = -0.5 * Math.PI;
            if (this.x < 0) this.x = 0; // boundary-left
            moved = true;
        }
        if (keysPressed["d"] || keysPressed["ArrowRight"]) {
            this.x += this.speed;
            this.angle = 0.5 * Math.PI;
            if (this.x > (1000 - this.width)) this.x = 1000 - this.width;
            moved = true;
        }

        if (moved) {
            // if movement detected
            socket.emit("playerMovedLocally", { 
                "socketID": socketID,
                x: this.x, 
                y: this.y,
                angle: this.angle
            }); // Send only if moved
        }
    }
}


let player;

function animate() {
    ctx.clearRect(0, 0, CANVAS.width, CANVAS.height); 
    if (players[socketID]) {
        players[socketID].update();
    }
    // players[socketID].draw();
    // console.log(players[socketID]);

    for (let id in players) {
        if (players[id]) { // Ensure player exists before calling update & draw
            
            players[id].draw();
        }
    }


    requestAnimationFrame(animate);
}
animate();
