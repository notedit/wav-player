import wavify from './wavify';


const pad = (buffer) => {
    const currentSample = new Float32Array(1);

    buffer.copyFromChannel(currentSample, 0, 0);

    let wasPositive = (currentSample[0] > 0);

    for (let i = 0; i < buffer.length; i += 1) {
        buffer.copyFromChannel(currentSample, 0, i);

        if ((wasPositive && currentSample[0] < 0) ||
                (!wasPositive && currentSample[0] > 0)) {
            break;
        }

        currentSample[0] = 0;
        buffer.copyToChannel(currentSample, 0, i);
    }

    buffer.copyFromChannel(currentSample, 0, buffer.length - 1);

    wasPositive = (currentSample[0] > 0);

    for (let i = buffer.length - 1; i > 0; i -= 1) {
        buffer.copyFromChannel(currentSample, 0, i);

        if ((wasPositive && currentSample[0] < 0) ||
                (!wasPositive && currentSample[0] > 0)) {
            break;
        }

        currentSample[0] = 0;
        buffer.copyToChannel(currentSample, 0, i);
    }

    return buffer;
};

const WavPlayer = () => {
    let context;

    let hasCanceled_ = false;

    let websocket;

    const play = url => {

        let nextTime = 0;

        const audioStack = [];

        hasCanceled_ = false;

        context = new AudioContext();

        let scheduleBuffersTimeoutId = null;

        let isStarted = false;

        const scheduleBuffers = () => {

            if (hasCanceled_) {
                scheduleBuffersTimeoutId = null;
                return;
            }

            while (audioStack.length > 0 && audioStack[0].buffer !== undefined && nextTime < context.currentTime + 2) {
                const currentTime = context.currentTime;

                const source = context.createBufferSource();

                const segment = audioStack.shift();

                //source.buffer = pad(segment.buffer);
                source.buffer = segment.buffer;
                source.connect(context.destination);

                if (nextTime == 0) {
                    nextTime = currentTime + 0.2;  /// add 700ms latency to work well across systems - tune this if you like
                }

                let duration = source.buffer.duration;
                let offset = 0;

                if (currentTime > nextTime) {
                    offset = currentTime - nextTime;
                    nextTime = currentTime;
                    duration = duration - offset;
                }

                source.start(nextTime, offset);
                source.stop(nextTime + duration);

                nextTime += duration; // Make the next buffer wait the length of the last buffer before being played
            }

            scheduleBuffersTimeoutId = setTimeout(() => scheduleBuffers(), 500);
        }

        websocket = new WebSocket(url);

        websocket.binaryType = 'arraybuffer';

        websocket.onopen = () => {
            
            console.log('onopen');
        }

        websocket.onclose  = () => {

            console.log('onclose');
        }
        
        let isFirstBuffer = true;

        websocket.onmessage = (message) => {

            if(hasCanceled_){
                return;
            }

            console.log(message);

            let  buffer = message.data;
            let numberOfChannels, sampleRate;
            let segment;

            if(buffer.byteLength <= 44){
                return;
            }
            
            const dataView = new DataView(buffer);
            
            numberOfChannels = dataView.getUint16(22, true);
            sampleRate = dataView.getUint32(24, true);

            console.log('numberOfChannels ',numberOfChannels);
            console.log('sampleRate ', sampleRate);

            buffer = buffer.slice(44);

            segment = {};

            audioStack.push(segment);

            context.decodeAudioData(wavify(buffer, numberOfChannels, sampleRate)).then((audioBuffer) => {
                segment.buffer = audioBuffer;

                if (!isStarted) {
                    isStarted = true;
                    setTimeout(() => scheduleBuffers(), 1000);
                }
            });

        }
    }

    return {
        play: url => play(url),
        stop: () => {
            hasCanceled_ = true;
            if (context) {
                context.close();
            }
            if(websocket){
                websocket.close();
            }
        }
    }
}

export default WavPlayer;