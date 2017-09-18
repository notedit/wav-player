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
                    nextTime = currentTime + 0.2; /// add 700ms latency to work well across systems - tune this if you like
                }

                var duration = source.buffer.duration;
                var offset = 0;

                if (currentTime > nextTime) {
                    offset = currentTime - nextTime;
                    nextTime = currentTime;
                    duration = duration - offset;
                }

                source.start(nextTime, offset);
                source.stop(nextTime + duration);

                nextTime += duration; // Make the next buffer wait the length of the last buffer before being played
            }

            scheduleBuffersTimeoutId = setTimeout(function () {
                return scheduleBuffers();
            }, 400);
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
                    }, 300);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvV2F2UGxheWVyLmpzIiwic3JjL2NvbmNhdC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy93YXZpZnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7QUNBQTs7Ozs7O0FBR0EsSUFBTSxNQUFNLFNBQU4sR0FBTSxDQUFDLE1BQUQsRUFBWTtBQUNwQixRQUFNLGdCQUFnQixJQUFJLFlBQUosQ0FBaUIsQ0FBakIsQ0FBdEI7O0FBRUEsV0FBTyxlQUFQLENBQXVCLGFBQXZCLEVBQXNDLENBQXRDLEVBQXlDLENBQXpDOztBQUVBLFFBQUksY0FBZSxjQUFjLENBQWQsSUFBbUIsQ0FBdEM7O0FBRUEsU0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE9BQU8sTUFBM0IsRUFBbUMsS0FBSyxDQUF4QyxFQUEyQztBQUN2QyxlQUFPLGVBQVAsQ0FBdUIsYUFBdkIsRUFBc0MsQ0FBdEMsRUFBeUMsQ0FBekM7O0FBRUEsWUFBSyxlQUFlLGNBQWMsQ0FBZCxJQUFtQixDQUFuQyxJQUNLLENBQUMsV0FBRCxJQUFnQixjQUFjLENBQWQsSUFBbUIsQ0FENUMsRUFDZ0Q7QUFDNUM7QUFDSDs7QUFFRCxzQkFBYyxDQUFkLElBQW1CLENBQW5CO0FBQ0EsZUFBTyxhQUFQLENBQXFCLGFBQXJCLEVBQW9DLENBQXBDLEVBQXVDLENBQXZDO0FBQ0g7O0FBRUQsV0FBTyxlQUFQLENBQXVCLGFBQXZCLEVBQXNDLENBQXRDLEVBQXlDLE9BQU8sTUFBUCxHQUFnQixDQUF6RDs7QUFFQSxrQkFBZSxjQUFjLENBQWQsSUFBbUIsQ0FBbEM7O0FBRUEsU0FBSyxJQUFJLEtBQUksT0FBTyxNQUFQLEdBQWdCLENBQTdCLEVBQWdDLEtBQUksQ0FBcEMsRUFBdUMsTUFBSyxDQUE1QyxFQUErQztBQUMzQyxlQUFPLGVBQVAsQ0FBdUIsYUFBdkIsRUFBc0MsQ0FBdEMsRUFBeUMsRUFBekM7O0FBRUEs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QUFYLEVBQWUsSUFBSSxVQUFKLENBQWUsQ0FBZixDQUFmO0FBQ0EsTUFBRSxRQUFGLENBQVcsRUFBWCxFQUFlLElBQUksVUFBSixDQUFlLENBQWYsQ0FBZjs7QUFFQSxNQUFFLFNBQUYsQ0FBWSxFQUFaLEVBQWdCLEVBQWhCLEVBQW9CLElBQXBCO0FBQ0EsTUFBRSxTQUFGLENBQVksRUFBWixFQUFnQixDQUFoQixFQUFtQixJQUFuQjtBQUNBLE1BQUUsU0FBRixDQUFZLEVBQVosRUFBZ0IsZ0JBQWhCLEVBQWtDLElBQWxDO0FBQ0EsTUFBRSxTQUFGLENBQVksRUFBWixFQUFnQixVQUFoQixFQUE0QixJQUE1QjtBQUNBLE1BQUUsU0FBRixDQUFZLEVBQVosRUFBZ0IsYUFBYSxDQUFiLEdBQWlCLENBQWpDO0FBQ0EsTUFBRSxTQUFGLENBQVksRUFBWixFQUFnQixtQkFBbUIsQ0FBbkM7QUFDQSxNQUFFLFNBQUYsQ0FBWSxFQUFaLEVBQWdCLEVBQWhCLEVBQW9CLElBQXBCOztBQUVBLE1BQUUsUUFBRixDQUFXLEVBQVgsRUFBZSxJQUFJLFVBQUosQ0FBZSxDQUFmLENBQWY7QUFDQSxNQUFFLFFBQUYsQ0FBVyxFQUFYLEVBQWUsSUFBSSxVQUFKLENBQWUsQ0FBZixDQUFmO0FBQ0EsTUFBRSxRQUFGLENBQVcsRUFBWCxFQUFlLElBQUksVUFBSixDQUFlLENBQWYsQ0FBZjtBQUNBLE1BQUUsUUFBRixDQUFXLEVBQVgsRUFBZSxJQUFJLFVBQUosQ0FBZSxDQUFmLENBQWY7QUFDQSxNQUFFLFNBQUYsQ0FBWSxFQUFaLEVBQWdCLEtBQUssVUFBckIsRUFBaUMsSUFBakM7O0FBRUEsV0FBTyxzQkFBTyxNQUFQLEVBQWUsSUFBZixDQUFQO0FBQ0gsQ0FwQ0Q7O2tCQXNDZSxNIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB3YXZpZnkgZnJvbSAnLi93YXZpZnknO1xuXG5cbmNvbnN0IHBhZCA9IChidWZmZXIpID0+IHtcbiAgICBjb25zdCBjdXJyZW50U2FtcGxlID0gbmV3IEZsb2F0MzJBcnJheSgxKTtcblxuICAgIGJ1ZmZlci5jb3B5RnJvbUNoYW5uZWwoY3VycmVudFNhbXBsZSwgMCwgMCk7XG5cbiAgICBsZXQgd2FzUG9zaXRpdmUgPSAoY3VycmVudFNhbXBsZVswXSA+IDApO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWZmZXIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgYnVmZmVyLmNvcHlGcm9tQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBpKTtcblxuICAgICAgICBpZiAoKHdhc1Bvc2l0aXZlICYmIGN1cnJlbnRTYW1wbGVbMF0gPCAwKSB8fFxuICAgICAgICAgICAgICAgICghd2FzUG9zaXRpdmUgJiYgY3VycmVudFNhbXBsZVswXSA+IDApKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnRTYW1wbGVbMF0gPSAwO1xuICAgICAgICBidWZmZXIuY29weVRvQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBpKTtcbiAgICB9XG5cbiAgICBidWZmZXIuY29weUZyb21DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIGJ1ZmZlci5sZW5ndGggLSAxKTtcblxuICAgIHdhc1Bvc2l0aXZlID0gKGN1cnJlbnRTYW1wbGVbMF0gPiAwKTtcblxuICAgIGZvciAobGV0IGkgPSBidWZmZXIubGVuZ3RoIC0gMTsgaSA+IDA7IGkgLT0gMSkge1xuICAgICAgICBidWZmZXIuY29weUZyb21DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIGkpO1xuXG4gICAgICAgIGlmICgod2FzUG9zaXRpdmUgJiYgY3VycmVudFNhbXBsZVswXSA8IDApIHx8XG4gICAgICAgICAgICAgICAgKCF3YXNQb3NpdGl2ZSAmJiBjdXJyZW50U2FtcGxlWzBdID4gMCkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgY3VycmVudFNhbXBsZVswXSA9IDA7XG4gICAgICAgIGJ1ZmZlci5jb3B5VG9DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIGkpO1xuICAgIH1cblxuICAgIHJldHVybiBidWZmZXI7XG59O1xuXG5jb25zdCBXYXZQbGF5ZXIgPSAoKSA9PiB7XG4gICAgbGV0IGNvbnRleHQ7XG5cbiAgICBsZXQgaGFzQ2FuY2VsZWRfID0gZmFsc2U7XG5cbiAgICBsZXQgd2Vic29ja2V0O1xuXG4gICAgY29uc3QgcGxheSA9IHVybCA9PiB7XG5cbiAgICAgICAgbGV0IG5leHRUaW1lID0gMDtcblxuICAgICAgICBjb25zdCBhdWRpb1N0YWNrID0gW107XG5cbiAgICAgICAgaGFzQ2FuY2VsZWRfID0gZmFsc2U7XG5cbiAgICAgICAgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcblxuICAgICAgICBsZXQgc2NoZWR1bGVCdWZmZXJzVGltZW91dElkID0gbnVsbDtcblxuICAgICAgICBsZXQgaXNTdGFydGVkID0gZmFsc2U7XG5cbiAgICAgICAgY29uc3Qgc2NoZWR1bGVCdWZmZXJzID0gKCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAoaGFzQ2FuY2VsZWRfKSB7XG4gICAgICAgICAgICAgICAgc2NoZWR1bGVCdWZmZXJzVGltZW91dElkID0gbnVsbDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdoaWxlIChhdWRpb1N0YWNrLmxlbmd0aCA+IDAgJiYgYXVkaW9TdGFja1swXS5idWZmZXIgIT09IHVuZGVmaW5lZCAmJiBuZXh0VGltZSA8IGNvbnRleHQuY3VycmVudFRpbWUgKyAyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBjb250ZXh0LmN1cnJlbnRUaW1lO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNlZ21lbnQgPSBhdWRpb1N0YWNrLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICAvL3NvdXJjZS5idWZmZXIgPSBwYWQoc2VnbWVudC5idWZmZXIpO1xuICAgICAgICAgICAgICAgIHNvdXJjZS5idWZmZXIgPSBzZWdtZW50LmJ1ZmZlcjtcbiAgICAgICAgICAgICAgICBzb3VyY2UuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGlmIChuZXh0VGltZSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRUaW1lID0gY3VycmVudFRpbWUgKyAwLjI7ICAvLy8gYWRkIDcwMG1zIGxhdGVuY3kgdG8gd29yayB3ZWxsIGFjcm9zcyBzeXN0ZW1zIC0gdHVuZSB0aGlzIGlmIHlvdSBsaWtlXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbGV0IGR1cmF0aW9uID0gc291cmNlLmJ1ZmZlci5kdXJhdGlvbjtcbiAgICAgICAgICAgICAgICBsZXQgb2Zmc2V0ID0gMDtcblxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VGltZSA+IG5leHRUaW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IGN1cnJlbnRUaW1lIC0gbmV4dFRpbWU7XG4gICAgICAgICAgICAgICAgICAgIG5leHRUaW1lID0gY3VycmVudFRpbWU7XG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZHVyYXRpb24gLSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc291cmNlLnN0YXJ0KG5leHRUaW1lLCBvZmZzZXQpO1xuICAgICAgICAgICAgICAgIHNvdXJjZS5zdG9wKG5leHRUaW1lICsgZHVyYXRpb24pO1xuXG4gICAgICAgICAgICAgICAgbmV4dFRpbWUgKz0gZHVyYXRpb247IC8vIE1ha2UgdGhlIG5leHQgYnVmZmVyIHdhaXQgdGhlIGxlbmd0aCBvZiB0aGUgbGFzdCBidWZmZXIgYmVmb3JlIGJlaW5nIHBsYXllZFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY2hlZHVsZUJ1ZmZlcnNUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHNjaGVkdWxlQnVmZmVycygpLCA0MDApO1xuICAgICAgICB9XG5cbiAgICAgICAgd2Vic29ja2V0ID0gbmV3IFdlYlNvY2tldCh1cmwpO1xuXG4gICAgICAgIHdlYnNvY2tldC5iaW5hcnlUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuICAgICAgICB3ZWJzb2NrZXQub25vcGVuID0gKCkgPT4ge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb25vcGVuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB3ZWJzb2NrZXQub25jbG9zZSAgPSAoKSA9PiB7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvbmNsb3NlJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCBpc0ZpcnN0QnVmZmVyID0gdHJ1ZTtcblxuICAgICAgICB3ZWJzb2NrZXQub25tZXNzYWdlID0gKG1lc3NhZ2UpID0+IHtcblxuICAgICAgICAgICAgaWYoaGFzQ2FuY2VsZWRfKXtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuXG4gICAgICAgICAgICBsZXQgIGJ1ZmZlciA9IG1lc3NhZ2UuZGF0YTtcbiAgICAgICAgICAgIGxldCBudW1iZXJPZkNoYW5uZWxzLCBzYW1wbGVSYXRlO1xuICAgICAgICAgICAgbGV0IHNlZ21lbnQ7XG5cbiAgICAgICAgICAgIGlmKGJ1ZmZlci5ieXRlTGVuZ3RoIDw9IDQ0KXtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGRhdGFWaWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlcik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG51bWJlck9mQ2hhbm5lbHMgPSBkYXRhVmlldy5nZXRVaW50MTYoMjIsIHRydWUpO1xuICAgICAgICAgICAgc2FtcGxlUmF0ZSA9IGRhdGFWaWV3LmdldFVpbnQzMigyNCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdudW1iZXJPZkNoYW5uZWxzICcsbnVtYmVyT2ZDaGFubmVscyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2FtcGxlUmF0ZSAnLCBzYW1wbGVSYXRlKTtcblxuICAgICAgICAgICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKDQ0KTtcblxuICAgICAgICAgICAgc2VnbWVudCA9IHt9O1xuXG4gICAgICAgICAgICBhdWRpb1N0YWNrLnB1c2goc2VnbWVudCk7XG5cbiAgICAgICAgICAgIGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHdhdmlmeShidWZmZXIsIG51bWJlck9mQ2hhbm5lbHMsIHNhbXBsZVJhdGUpKS50aGVuKChhdWRpb0J1ZmZlcikgPT4ge1xuICAgICAgICAgICAgICAgIHNlZ21lbnQuYnVmZmVyID0gYXVkaW9CdWZmZXI7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWlzU3RhcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICBpc1N0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHNjaGVkdWxlQnVmZmVycygpLCAzMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBwbGF5OiB1cmwgPT4gcGxheSh1cmwpLFxuICAgICAgICBzdG9wOiAoKSA9PiB7XG4gICAgICAgICAgICBoYXNDYW5jZWxlZF8gPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih3ZWJzb2NrZXQpe1xuICAgICAgICAgICAgICAgIHdlYnNvY2tldC5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBXYXZQbGF5ZXI7IiwiXG5cbi8vIENvbmNhdCB0d28gQXJyYXlCdWZmZXJzXG5jb25zdCBjb25jYXQgPSAoYnVmZmVyMSwgYnVmZmVyMikgPT4ge1xuICAgIGNvbnN0IHRtcCA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcjEuYnl0ZUxlbmd0aCArIGJ1ZmZlcjIuYnl0ZUxlbmd0aCk7XG5cbiAgICB0bXAuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcjEpLCAwKTtcbiAgICB0bXAuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcjIpLCBidWZmZXIxLmJ5dGVMZW5ndGgpO1xuXG4gICAgcmV0dXJuIHRtcC5idWZmZXI7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjb25jYXQ7XG4iLCJpbXBvcnQgV2F2UGxheWVyIGZyb20gJy4vV2F2UGxheWVyJztcblxuZXhwb3J0IGRlZmF1bHQgV2F2UGxheWVyO1xubW9kdWxlLmV4cG9ydHMgPSBXYXZQbGF5ZXI7IiwiaW1wb3J0IGNvbmNhdCBmcm9tICcuL2NvbmNhdCc7XG5cbi8vIFdyaXRlIGEgcHJvcGVyIFdBVkUgaGVhZGVyIGZvciB0aGUgZ2l2ZW4gYnVmZmVyLlxuY29uc3Qgd2F2aWZ5ID0gKGRhdGEsIG51bWJlck9mQ2hhbm5lbHMsIHNhbXBsZVJhdGUpID0+IHtcbiAgICBjb25zdCBoZWFkZXIgPSBuZXcgQXJyYXlCdWZmZXIoNDQpO1xuXG4gICAgdmFyIGQgPSBuZXcgIERhdGFWaWV3KGhlYWRlcik7XG5cbiAgICBkLnNldFVpbnQ4KDAsICdSJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEsICdJJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDIsICdGJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDMsICdGJy5jaGFyQ29kZUF0KDApKTtcblxuICAgIGQuc2V0VWludDMyKDQsIGRhdGEuYnl0ZUxlbmd0aCAvIDIgKyA0NCwgdHJ1ZSk7XG5cbiAgICBkLnNldFVpbnQ4KDgsICdXJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDksICdBJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEwLCAnVicuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxMSwgJ0UnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTIsICdmJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEzLCAnbScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxNCwgJ3QnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTUsICcgJy5jaGFyQ29kZUF0KDApKTtcblxuICAgIGQuc2V0VWludDMyKDE2LCAxNiwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MTYoMjAsIDEsIHRydWUpO1xuICAgIGQuc2V0VWludDE2KDIyLCBudW1iZXJPZkNoYW5uZWxzLCB0cnVlKTtcbiAgICBkLnNldFVpbnQzMigyNCwgc2FtcGxlUmF0ZSwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MzIoMjgsIHNhbXBsZVJhdGUgKiAxICogMik7XG4gICAgZC5zZXRVaW50MTYoMzIsIG51bWJlck9mQ2hhbm5lbHMgKiAyKTtcbiAgICBkLnNldFVpbnQxNigzNCwgMTYsIHRydWUpO1xuXG4gICAgZC5zZXRVaW50OCgzNiwgJ2QnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMzcsICdhJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDM4LCAndCcuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgzOSwgJ2EnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDMyKDQwLCBkYXRhLmJ5dGVMZW5ndGgsIHRydWUpO1xuXG4gICAgcmV0dXJuIGNvbmNhdChoZWFkZXIsIGRhdGEpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgd2F2aWZ5Il19
