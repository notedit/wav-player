
const express = require('express');
const cors = require('cors');
const http = require('http');
const wav = require('wav');

const bufferConcat = require('buffer-concat');

var app = express();
var expressWs = require('express-ws');

const streamBuffers = require('stream-buffers');

var subs = new Set();

app.use(express.static('./'));

var expressWs = expressWs(app,null,{
    perMessageDeflate: false,
});
var app = expressWs.app;

let queues = [];
let size = 0;
let wavheader;

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
        //

        console.log('length ===',msg.length);

        if(size == 0){
            queues.push(msg); 
            size += msg.length;
        } else {
            let buffer = msg.slice(44);
            queues.push(buffer);
            size += buffer.length;
        }

        // 缓存2秒钟
        if(size > 40960){  

            let allbuffer = bufferConcat(queues);
            queues = [];
            size = 0;

            for (let sock of subs) {
                if(sock.readyState === 1){
                    sock.send(allbuffer);
                }
               
            }
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
        console.log('sockets ', subs);
    })
});


app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
