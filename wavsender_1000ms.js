'use strict';

const fs = require('fs');
const WebSocket = require('ws');


class WavSender
{
    constructor()
    {
        this.ws  = new WebSocket('ws://localhost:3000/pub'); 

        this.ws.onopen = function(){
            console.log('open');
        };
        this.ws.onerror = function(err) {
            console.log('error ', err)
        }
        
        this.ws.onclose = function(){
            console.log('close');
        }
    }
    async readFiles(dirname) {

        let err,filenames = fs.readdirSync(dirname); 
        
        console.log(typeof filename);
        console.log(err,filenames);

        // 重复循环 
        while(true){
            for(let filename of filenames){
                console.log(filename);
                let file = dirname + filename;
                let err, data = fs.readFileSync(file);
                this.ws.send(data);
                await this.sleep(1000);
            }
        }
    }
    async sleep(ms){
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        });
    }
}


const sender = new WavSender();

setTimeout(function() {
    sender.readFiles('./audios_1000ms/');
}, 1000);

