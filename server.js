
const express = require('express');
const cors = require('cors');
const http = require('http');
const wav = require('wav');

var app = express();
var expressWs = require('express-ws');

var subs = new Set();

app.use(express.static('./'));

var expressWs = expressWs(app);
var app = expressWs.app;

let queue = [];

app.ws('/pub', (socket, req) => {

	// let outFile = new Date().getTime() + '.wav';
    // let fileWriter = new wav.FileWriter(outFile, {
    //     channels: 1,
    //     sampleRate: 10000,
    //     bitDepth: 16
    // });

    // queue.push()
    // queue.shift();

    socket.on('message',  (msg) =>{

        // 缓存三段
        // if(queue.length > 3){
        //     queue.shift();
        //     queue.push(msg);
        // }
        // let buffer = msg.slice(44);
        // fileWriter.write(buffer);

        for (let sock of subs) {
            sock.send(msg)
            console.log('send222222');
        }

    });

    socket.on('close',() => {
        //fileWriter.end();
    });

});

app.ws('/sub',  (socekt, req) => {
    
    subs.add(socekt);
    socekt.on('close', () => {
        subs.delete(socekt);
    })
});


app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
