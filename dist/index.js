(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WavPlayer = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _wavify = require('./wavify');

var _wavify2 = _interopRequireDefault(_wavify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var pad = function pad(buffer) {
    var currentSample = new Float32Array(1);

    buffer.copyFromChannel(currentSample, 0, 0);

    var wasPositive = currentSample[0] > 0;

    for (var i = 0; i < buffer.length; i += 1) {
        buffer.copyFromChannel(currentSample, 0, i);

        if (wasPositive && currentSample[0] < 0 || !wasPositive && currentSample[0] > 0) {
            break;
        }

        currentSample[0] = 0;
        buffer.copyToChannel(currentSample, 0, i);
    }

    buffer.copyFromChannel(currentSample, 0, buffer.length - 1);

    wasPositive = currentSample[0] > 0;

    for (var _i = buffer.length - 1; _i > 0; _i -= 1) {
        buffer.copyFromChannel(currentSample, 0, _i);

        if (wasPositive && currentSample[0] < 0 || !wasPositive && currentSample[0] > 0) {
            break;
        }

        currentSample[0] = 0;
        buffer.copyToChannel(currentSample, 0, _i);
    }

    return buffer;
};

var WavPlayer = function WavPlayer() {
    var context = void 0;

    var hasCanceled_ = false;

    var websocket = void 0;

    var _play = function _play(url) {

        var nextTime = 0;

        var audioStack = [];

        hasCanceled_ = false;

        context = new AudioContext();

        var scheduleBuffersTimeoutId = null;

        var isStarted = false;

        var scheduleBuffers = function scheduleBuffers() {

            if (hasCanceled_) {
                scheduleBuffersTimeoutId = null;
                return;
            }

            while (audioStack.length > 0 && audioStack[0].buffer !== undefined && nextTime < context.currentTime + 2) {
                var currentTime = context.currentTime;

                var source = context.createBufferSource();

                var segment = audioStack.shift();

                //source.buffer = pad(segment.buffer);
                source.buffer = segment.buffer;
                source.connect(context.destination);

                if (nextTime == 0) {
                    nextTime = currentTime + 0.3; /// add 700ms latency to work well across systems - tune this if you like
                }

                var duration = source.buffer.duration;
                var offset = 0;

                console.log('currentTime ', currentTime, 'nextTime ', nextTime, 'duration ', duration);

                if (currentTime > nextTime) {
                    nextTime = currentTime + 0.3;
                }

                source.start(nextTime, offset);
                source.stop(nextTime + duration);

                console.log('currentTime ', currentTime, 'nextTime ', nextTime, 'duration ', duration);

                nextTime += duration; // Make the next buffer wait the length of the last buffer before being played
            }

            scheduleBuffersTimeoutId = setTimeout(function () {
                return scheduleBuffers();
            }, 500);
        };

        websocket = new WebSocket(url);

        websocket.binaryType = 'arraybuffer';

        websocket.onopen = function () {

            console.log('onopen');
        };

        websocket.onclose = function () {

            console.log('onclose');
        };

        var isFirstBuffer = true;

        websocket.onmessage = function (message) {

            if (hasCanceled_) {
                return;
            }

            console.log(message);

            var buffer = message.data;
            var numberOfChannels = void 0,
                sampleRate = void 0;
            var segment = void 0;

            if (buffer.byteLength <= 44) {
                return;
            }

            var dataView = new DataView(buffer);

            numberOfChannels = dataView.getUint16(22, true);
            sampleRate = dataView.getUint32(24, true);

            console.log('numberOfChannels ', numberOfChannels);
            console.log('sampleRate ', sampleRate);

            buffer = buffer.slice(44);

            segment = {};

            audioStack.push(segment);

            context.decodeAudioData((0, _wavify2.default)(buffer, numberOfChannels, sampleRate)).then(function (audioBuffer) {
                segment.buffer = audioBuffer;

                if (!isStarted) {
                    isStarted = true;
                    setTimeout(function () {
                        return scheduleBuffers();
                    }, 1000);
                }
            });
        };
    };

    return {
        play: function play(url) {
            return _play(url);
        },
        stop: function stop() {
            hasCanceled_ = true;
            if (context) {
                context.close();
            }
            if (websocket) {
                websocket.close();
            }
        }
    };
};

exports.default = WavPlayer;

},{"./wavify":4}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});


// Concat two ArrayBuffers
var concat = function concat(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);

    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);

    return tmp.buffer;
};

exports.default = concat;

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _WavPlayer = require('./WavPlayer');

var _WavPlayer2 = _interopRequireDefault(_WavPlayer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _WavPlayer2.default;

module.exports = _WavPlayer2.default;

},{"./WavPlayer":1}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _concat = require('./concat');

var _concat2 = _interopRequireDefault(_concat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Write a proper WAVE header for the given buffer.
var wavify = function wavify(data, numberOfChannels, sampleRate) {
    var header = new ArrayBuffer(44);

    var d = new DataView(header);

    d.setUint8(0, 'R'.charCodeAt(0));
    d.setUint8(1, 'I'.charCodeAt(0));
    d.setUint8(2, 'F'.charCodeAt(0));
    d.setUint8(3, 'F'.charCodeAt(0));

    d.setUint32(4, data.byteLength / 2 + 44, true);

    d.setUint8(8, 'W'.charCodeAt(0));
    d.setUint8(9, 'A'.charCodeAt(0));
    d.setUint8(10, 'V'.charCodeAt(0));
    d.setUint8(11, 'E'.charCodeAt(0));
    d.setUint8(12, 'f'.charCodeAt(0));
    d.setUint8(13, 'm'.charCodeAt(0));
    d.setUint8(14, 't'.charCodeAt(0));
    d.setUint8(15, ' '.charCodeAt(0));

    d.setUint32(16, 16, true);
    d.setUint16(20, 1, true);
    d.setUint16(22, numberOfChannels, true);
    d.setUint32(24, sampleRate, true);
    d.setUint32(28, sampleRate * 1 * 2);
    d.setUint16(32, numberOfChannels * 2);
    d.setUint16(34, 16, true);

    d.setUint8(36, 'd'.charCodeAt(0));
    d.setUint8(37, 'a'.charCodeAt(0));
    d.setUint8(38, 't'.charCodeAt(0));
    d.setUint8(39, 'a'.charCodeAt(0));
    d.setUint32(40, data.byteLength, true);

    return (0, _concat2.default)(header, data);
};

exports.default = wavify;

},{"./concat":2}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvV2F2UGxheWVyLmpzIiwic3JjL2NvbmNhdC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy93YXZpZnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7QUNBQSxBQUFPLEFBQVk7Ozs7OztBQUduQixJQUFNLE1BQU0sQUFBQyxxQkFBVyxBQUNwQjtRQUFNLGdCQUFnQixJQUFBLEFBQUksYUFBMUIsQUFBc0IsQUFBaUIsQUFFdkM7O1dBQUEsQUFBTyxnQkFBUCxBQUF1QixlQUF2QixBQUFzQyxHQUF0QyxBQUF5QyxBQUV6Qzs7UUFBSSxjQUFlLGNBQUEsQUFBYyxLQUFqQyxBQUFzQyxBQUV0Qzs7U0FBSyxJQUFJLElBQVQsQUFBYSxHQUFHLElBQUksT0FBcEIsQUFBMkIsUUFBUSxLQUFuQyxBQUF3QyxHQUFHLEFBQ3ZDO2VBQUEsQUFBTyxnQkFBUCxBQUF1QixlQUF2QixBQUFzQyxHQUF0QyxBQUF5QyxBQUV6Qzs7WUFBSyxlQUFlLGNBQUEsQUFBYyxLQUE5QixBQUFtQyxLQUM5QixDQUFBLEFBQUMsZUFBZSxjQUFBLEFBQWMsS0FEdkMsQUFDNEMsR0FBSSxBQUM1QztBQUNIO0FBRUQ7O3NCQUFBLEFBQWMsS0FBZCxBQUFtQixBQUNuQjtlQUFBLEFBQU8sY0FBUCxBQUFxQixlQUFyQixBQUFvQyxHQUFwQyxBQUF1QyxBQUMxQztBQUVEOztXQUFBLEFBQU8sZ0JBQVAsQUFBdUIsZUFBdkIsQUFBc0MsR0FBRyxPQUFBLEFBQU8sU0FBaEQsQUFBeUQsQUFFekQ7O2tCQUFlLGNBQUEsQUFBYyxLQUE3QixBQUFrQyxBQUVsQzs7U0FBSyxJQUFJLEtBQUksT0FBQSxBQUFPLFNBQXBCLEFBQTZCLEdBQUcsS0FBaEMsQUFBb0MsR0FBRyxNQUF2QyxBQUE0QyxHQUFHLEFBQzNDO2VBQUEsQUFBTyxnQkFBUCxBQUF1QixlQUF2QixBQUFzQyxHQUF0QyxBQUF5QyxBQUV6Qzs7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QSxBQUFlIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB3YXZpZnkgZnJvbSAnLi93YXZpZnknO1xuXG5cbmNvbnN0IHBhZCA9IChidWZmZXIpID0+IHtcbiAgICBjb25zdCBjdXJyZW50U2FtcGxlID0gbmV3IEZsb2F0MzJBcnJheSgxKTtcblxuICAgIGJ1ZmZlci5jb3B5RnJvbUNoYW5uZWwoY3VycmVudFNhbXBsZSwgMCwgMCk7XG5cbiAgICBsZXQgd2FzUG9zaXRpdmUgPSAoY3VycmVudFNhbXBsZVswXSA+IDApO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWZmZXIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgYnVmZmVyLmNvcHlGcm9tQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBpKTtcblxuICAgICAgICBpZiAoKHdhc1Bvc2l0aXZlICYmIGN1cnJlbnRTYW1wbGVbMF0gPCAwKSB8fFxuICAgICAgICAgICAgICAgICghd2FzUG9zaXRpdmUgJiYgY3VycmVudFNhbXBsZVswXSA+IDApKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnRTYW1wbGVbMF0gPSAwO1xuICAgICAgICBidWZmZXIuY29weVRvQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBpKTtcbiAgICB9XG5cbiAgICBidWZmZXIuY29weUZyb21DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIGJ1ZmZlci5sZW5ndGggLSAxKTtcblxuICAgIHdhc1Bvc2l0aXZlID0gKGN1cnJlbnRTYW1wbGVbMF0gPiAwKTtcblxuICAgIGZvciAobGV0IGkgPSBidWZmZXIubGVuZ3RoIC0gMTsgaSA+IDA7IGkgLT0gMSkge1xuICAgICAgICBidWZmZXIuY29weUZyb21DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIGkpO1xuXG4gICAgICAgIGlmICgod2FzUG9zaXRpdmUgJiYgY3VycmVudFNhbXBsZVswXSA8IDApIHx8XG4gICAgICAgICAgICAgICAgKCF3YXNQb3NpdGl2ZSAmJiBjdXJyZW50U2FtcGxlWzBdID4gMCkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgY3VycmVudFNhbXBsZVswXSA9IDA7XG4gICAgICAgIGJ1ZmZlci5jb3B5VG9DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIGkpO1xuICAgIH1cblxuICAgIHJldHVybiBidWZmZXI7XG59O1xuXG5jb25zdCBXYXZQbGF5ZXIgPSAoKSA9PiB7XG4gICAgbGV0IGNvbnRleHQ7XG5cbiAgICBsZXQgaGFzQ2FuY2VsZWRfID0gZmFsc2U7XG5cbiAgICBsZXQgd2Vic29ja2V0O1xuXG4gICAgY29uc3QgcGxheSA9IHVybCA9PiB7XG5cbiAgICAgICAgbGV0IG5leHRUaW1lID0gMDtcblxuICAgICAgICBjb25zdCBhdWRpb1N0YWNrID0gW107XG5cbiAgICAgICAgaGFzQ2FuY2VsZWRfID0gZmFsc2U7XG5cbiAgICAgICAgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcblxuICAgICAgICBsZXQgc2NoZWR1bGVCdWZmZXJzVGltZW91dElkID0gbnVsbDtcblxuICAgICAgICBsZXQgaXNTdGFydGVkID0gZmFsc2U7XG5cbiAgICAgICAgY29uc3Qgc2NoZWR1bGVCdWZmZXJzID0gKCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAoaGFzQ2FuY2VsZWRfKSB7XG4gICAgICAgICAgICAgICAgc2NoZWR1bGVCdWZmZXJzVGltZW91dElkID0gbnVsbDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdoaWxlIChhdWRpb1N0YWNrLmxlbmd0aCA+IDAgJiYgYXVkaW9TdGFja1swXS5idWZmZXIgIT09IHVuZGVmaW5lZCAmJiBuZXh0VGltZSA8IGNvbnRleHQuY3VycmVudFRpbWUgKyAyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBjb250ZXh0LmN1cnJlbnRUaW1lO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNlZ21lbnQgPSBhdWRpb1N0YWNrLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICAvL3NvdXJjZS5idWZmZXIgPSBwYWQoc2VnbWVudC5idWZmZXIpO1xuICAgICAgICAgICAgICAgIHNvdXJjZS5idWZmZXIgPSBzZWdtZW50LmJ1ZmZlcjtcbiAgICAgICAgICAgICAgICBzb3VyY2UuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGlmIChuZXh0VGltZSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRUaW1lID0gY3VycmVudFRpbWUgKyAwLjM7ICAvLy8gYWRkIDcwMG1zIGxhdGVuY3kgdG8gd29yayB3ZWxsIGFjcm9zcyBzeXN0ZW1zIC0gdHVuZSB0aGlzIGlmIHlvdSBsaWtlXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbGV0IGR1cmF0aW9uID0gc291cmNlLmJ1ZmZlci5kdXJhdGlvbjtcbiAgICAgICAgICAgICAgICBsZXQgb2Zmc2V0ID0gMDtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjdXJyZW50VGltZSAnLGN1cnJlbnRUaW1lLCAnbmV4dFRpbWUgJywgbmV4dFRpbWUsICdkdXJhdGlvbiAnLCBkdXJhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPiBuZXh0VGltZSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSA9IGN1cnJlbnRUaW1lICsgMC4zO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNvdXJjZS5zdGFydChuZXh0VGltZSwgb2Zmc2V0KTtcbiAgICAgICAgICAgICAgICBzb3VyY2Uuc3RvcChuZXh0VGltZSArIGR1cmF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjdXJyZW50VGltZSAnLGN1cnJlbnRUaW1lLCAnbmV4dFRpbWUgJywgbmV4dFRpbWUsICdkdXJhdGlvbiAnLCBkdXJhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBuZXh0VGltZSArPSBkdXJhdGlvbjsgLy8gTWFrZSB0aGUgbmV4dCBidWZmZXIgd2FpdCB0aGUgbGVuZ3RoIG9mIHRoZSBsYXN0IGJ1ZmZlciBiZWZvcmUgYmVpbmcgcGxheWVkXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjaGVkdWxlQnVmZmVyc1RpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4gc2NoZWR1bGVCdWZmZXJzKCksIDUwMCk7XG4gICAgICAgIH1cblxuICAgICAgICB3ZWJzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybCk7XG5cbiAgICAgICAgd2Vic29ja2V0LmJpbmFyeVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG4gICAgICAgIHdlYnNvY2tldC5vbm9wZW4gPSAoKSA9PiB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvbm9wZW4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdlYnNvY2tldC5vbmNsb3NlICA9ICgpID0+IHtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ29uY2xvc2UnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IGlzRmlyc3RCdWZmZXIgPSB0cnVlO1xuXG4gICAgICAgIHdlYnNvY2tldC5vbm1lc3NhZ2UgPSAobWVzc2FnZSkgPT4ge1xuXG4gICAgICAgICAgICBpZihoYXNDYW5jZWxlZF8pe1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2cobWVzc2FnZSk7XG5cbiAgICAgICAgICAgIGxldCAgYnVmZmVyID0gbWVzc2FnZS5kYXRhO1xuICAgICAgICAgICAgbGV0IG51bWJlck9mQ2hhbm5lbHMsIHNhbXBsZVJhdGU7XG4gICAgICAgICAgICBsZXQgc2VnbWVudDtcblxuICAgICAgICAgICAgaWYoYnVmZmVyLmJ5dGVMZW5ndGggPD0gNDQpe1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbnVtYmVyT2ZDaGFubmVscyA9IGRhdGFWaWV3LmdldFVpbnQxNigyMiwgdHJ1ZSk7XG4gICAgICAgICAgICBzYW1wbGVSYXRlID0gZGF0YVZpZXcuZ2V0VWludDMyKDI0LCB0cnVlKTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ251bWJlck9mQ2hhbm5lbHMgJyxudW1iZXJPZkNoYW5uZWxzKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYW1wbGVSYXRlICcsIHNhbXBsZVJhdGUpO1xuXG4gICAgICAgICAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoNDQpO1xuXG4gICAgICAgICAgICBzZWdtZW50ID0ge307XG5cbiAgICAgICAgICAgIGF1ZGlvU3RhY2sucHVzaChzZWdtZW50KTtcblxuICAgICAgICAgICAgY29udGV4dC5kZWNvZGVBdWRpb0RhdGEod2F2aWZ5KGJ1ZmZlciwgbnVtYmVyT2ZDaGFubmVscywgc2FtcGxlUmF0ZSkpLnRoZW4oKGF1ZGlvQnVmZmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgc2VnbWVudC5idWZmZXIgPSBhdWRpb0J1ZmZlcjtcblxuICAgICAgICAgICAgICAgIGlmICghaXNTdGFydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzU3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gc2NoZWR1bGVCdWZmZXJzKCksIDEwMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBwbGF5OiB1cmwgPT4gcGxheSh1cmwpLFxuICAgICAgICBzdG9wOiAoKSA9PiB7XG4gICAgICAgICAgICBoYXNDYW5jZWxlZF8gPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih3ZWJzb2NrZXQpe1xuICAgICAgICAgICAgICAgIHdlYnNvY2tldC5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBXYXZQbGF5ZXI7IiwiXG5cbi8vIENvbmNhdCB0d28gQXJyYXlCdWZmZXJzXG5jb25zdCBjb25jYXQgPSAoYnVmZmVyMSwgYnVmZmVyMikgPT4ge1xuICAgIGNvbnN0IHRtcCA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcjEuYnl0ZUxlbmd0aCArIGJ1ZmZlcjIuYnl0ZUxlbmd0aCk7XG5cbiAgICB0bXAuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcjEpLCAwKTtcbiAgICB0bXAuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcjIpLCBidWZmZXIxLmJ5dGVMZW5ndGgpO1xuXG4gICAgcmV0dXJuIHRtcC5idWZmZXI7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjb25jYXQ7XG4iLCJpbXBvcnQgV2F2UGxheWVyIGZyb20gJy4vV2F2UGxheWVyJztcblxuZXhwb3J0IGRlZmF1bHQgV2F2UGxheWVyO1xubW9kdWxlLmV4cG9ydHMgPSBXYXZQbGF5ZXI7IiwiaW1wb3J0IGNvbmNhdCBmcm9tICcuL2NvbmNhdCc7XG5cbi8vIFdyaXRlIGEgcHJvcGVyIFdBVkUgaGVhZGVyIGZvciB0aGUgZ2l2ZW4gYnVmZmVyLlxuY29uc3Qgd2F2aWZ5ID0gKGRhdGEsIG51bWJlck9mQ2hhbm5lbHMsIHNhbXBsZVJhdGUpID0+IHtcbiAgICBjb25zdCBoZWFkZXIgPSBuZXcgQXJyYXlCdWZmZXIoNDQpO1xuXG4gICAgdmFyIGQgPSBuZXcgIERhdGFWaWV3KGhlYWRlcik7XG5cbiAgICBkLnNldFVpbnQ4KDAsICdSJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEsICdJJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDIsICdGJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDMsICdGJy5jaGFyQ29kZUF0KDApKTtcblxuICAgIGQuc2V0VWludDMyKDQsIGRhdGEuYnl0ZUxlbmd0aCAvIDIgKyA0NCwgdHJ1ZSk7XG5cbiAgICBkLnNldFVpbnQ4KDgsICdXJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDksICdBJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEwLCAnVicuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxMSwgJ0UnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTIsICdmJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEzLCAnbScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxNCwgJ3QnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTUsICcgJy5jaGFyQ29kZUF0KDApKTtcblxuICAgIGQuc2V0VWludDMyKDE2LCAxNiwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MTYoMjAsIDEsIHRydWUpO1xuICAgIGQuc2V0VWludDE2KDIyLCBudW1iZXJPZkNoYW5uZWxzLCB0cnVlKTtcbiAgICBkLnNldFVpbnQzMigyNCwgc2FtcGxlUmF0ZSwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MzIoMjgsIHNhbXBsZVJhdGUgKiAxICogMik7XG4gICAgZC5zZXRVaW50MTYoMzIsIG51bWJlck9mQ2hhbm5lbHMgKiAyKTtcbiAgICBkLnNldFVpbnQxNigzNCwgMTYsIHRydWUpO1xuXG4gICAgZC5zZXRVaW50OCgzNiwgJ2QnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMzcsICdhJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDM4LCAndCcuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgzOSwgJ2EnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDMyKDQwLCBkYXRhLmJ5dGVMZW5ndGgsIHRydWUpO1xuXG4gICAgcmV0dXJuIGNvbmNhdChoZWFkZXIsIGRhdGEpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgd2F2aWZ5Il19
