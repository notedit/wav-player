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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvV2F2UGxheWVyLmpzIiwic3JjL2NvbmNhdC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy93YXZpZnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7QUNBQSxBQUFPLEFBQVk7Ozs7OztBQUduQixJQUFNLE1BQU0sQUFBQyxxQkFBVyxBQUNwQjtRQUFNLGdCQUFnQixJQUFBLEFBQUksYUFBMUIsQUFBc0IsQUFBaUIsQUFFdkM7O1dBQUEsQUFBTyxnQkFBUCxBQUF1QixlQUF2QixBQUFzQyxHQUF0QyxBQUF5QyxBQUV6Qzs7UUFBSSxjQUFlLGNBQUEsQUFBYyxLQUFqQyxBQUFzQyxBQUV0Qzs7U0FBSyxJQUFJLElBQVQsQUFBYSxHQUFHLElBQUksT0FBcEIsQUFBMkIsUUFBUSxLQUFuQyxBQUF3QyxHQUFHLEFBQ3ZDO2VBQUEsQUFBTyxnQkFBUCxBQUF1QixlQUF2QixBQUFzQyxHQUF0QyxBQUF5QyxBQUV6Qzs7WUFBSyxlQUFlLGNBQUEsQUFBYyxLQUE5QixBQUFtQyxLQUM5QixDQUFBLEFBQUMsZUFBZSxjQUFBLEFBQWMsS0FEdkMsQUFDNEMsR0FBSSxBQUM1QztBQUNIO0FBRUQ7O3NCQUFBLEFBQWMsS0FBZCxBQUFtQixBQUNuQjtlQUFBLEFBQU8sY0FBUCxBQUFxQixlQUFyQixBQUFvQyxHQUFwQyxBQUF1QyxBQUMxQztBQUVEOztXQUFBLEFBQU8sZ0JBQVAsQUFBdUIsZUFBdkIsQUFBc0MsR0FBRyxPQUFBLEFBQU8sU0FBaEQsQUFBeUQsQUFFekQ7O2tCQUFlLGNBQUEsQUFBYyxLQUE3QixBQUFrQyxBQUVsQzs7U0FBSyxJQUFJLEtBQUksT0FBQSxBQUFPLFNBQXBCLEFBQTZCLEdBQUcsS0FBaEMsQUFBb0MsR0FBRyxNQUF2QyxBQUE0QyxHQUFHLEFBQzNDO2VBQUEsQUFBTyxnQkFBUCxBQUF1QixlQUF2QixBQUFzQyxHQUF0QyxBQUF5QyxBQUV6Qzs7WUFBSyxlQUFlLGNBQUEsQUFBYyxLQUE5QixBQUFtQyxLQUM5QixDQUFBLEFBQUMsZUFBZSxjQUFBLEFBQWMsS0FEdkMsQUFDNEMsR0FBSSxBQUM1QztBQUNIO0FBRUQ7O3NCQUFBLEFBQWMsS0FBZCxBQUFtQixBQUNuQjtlQUFBLEFBQU8sY0FBUCxBQUFxQixlQUFyQixBQUFvQyxHQUFwQyxBQUF1QyxBQUMxQztBQUVEOztXQUFBLEFBQU8sQUFDVjtBQXBDRDs7QUFzQ0EsSUFBTSxZQUFZLHFCQUFNLEFBQ3BCO1FBQUEsQUFBSSxBQUVKOztRQUFJLGVBQUosQUFBbUIsQUFFbkI7O1FBQUEsQUFBSSxBQUVKOztRQUFNLFFBQU8sb0JBQU8sQUFFaEI7O1lBQUksV0FBSixBQUFlLEFBRWY7O1lBQU0sYUFBTixBQUFtQixBQUVuQjs7dUJBQUEsQUFBZSxBQUVmOztrQkFBVSxJQUFWLEFBQVUsQUFBSSxBQUVkOztZQUFJLDJCQUFKLEFBQStCLEFBRS9COztZQUFJLFlBQUosQUFBZ0IsQUFFaEI7O1lBQU0sa0JBQWtCLDJCQUFNLEFBRTFCOztnQkFBQSxBQUFJLGNBQWMsQUFDZDsyQ0FBQSxBQUEyQixBQUMzQjtBQUNIO0FBRUQ7O21CQUFPLFdBQUEsQUFBVyxTQUFYLEFBQW9CLEtBQUssV0FBQSxBQUFXLEdBQVgsQUFBYyxXQUF2QyxBQUFrRCxhQUFhLFdBQVcsUUFBQSxBQUFRLGNBQXpGLEFBQXVHO29CQUM3RixjQUFjLFFBQXBCLEFBQTRCLEFBRTVCOztvQkFBTSxTQUFTLFFBQWYsQUFBZSxBQUFRLEFBRXZCOztvQkFBTSxVQUFVLFdBQWhCLEFBQWdCLEFBQVcsQUFFM0I7O0FBQ0E7dUJBQUEsQUFBTyxTQUFTLFFBQWhCLEFBQXdCLEFBQ3hCO3VCQUFBLEFBQU8sUUFBUSxRQUFmLEFBQXVCLEFBRXZCOztvQkFBSSxZQUFKLEFBQWdCLEdBQUcsQUFDZjsrQkFBVyxjQURJLEFBQ2YsQUFBeUIsS0FBTSxBQUNsQztBQUVEOztvQkFBSSxXQUFXLE9BQUEsQUFBTyxPQUF0QixBQUE2QixBQUM3QjtvQkFBSSxTQUFKLEFBQWEsQUFFYjs7b0JBQUksY0FBSixBQUFrQixVQUFVLEFBQ3hCOzZCQUFTLGNBQVQsQUFBdUIsQUFDdkI7K0JBQUEsQUFBVyxBQUNYOytCQUFXLFdBQVgsQUFBc0IsQUFDekI7QUFFRDs7dUJBQUEsQUFBTyxNQUFQLEFBQWEsVUFBYixBQUF1QixBQUN2Qjt1QkFBQSxBQUFPLEtBQUssV0FBWixBQUF1QixBQUV2Qjs7NEJBM0JzRyxBQTJCdEcsQUFBWSxTQTNCMEYsQUFDdEcsQ0EwQnNCLEFBQ3pCO0FBRUQ7OztBQUFzQyx1QkFBWCxBQUFpQjthQUFqQixFQUEzQixBQUEyQixBQUFvQyxBQUNsRTtBQXRDRCxBQXdDQTs7b0JBQVksSUFBQSxBQUFJLFVBQWhCLEFBQVksQUFBYyxBQUUxQjs7a0JBQUEsQUFBVSxhQUFWLEFBQXVCLEFBRXZCOztrQkFBQSxBQUFVLFNBQVMsWUFBTSxBQUVyQjs7b0JBQUEsQUFBUSxJQUFSLEFBQVksQUFDZjtBQUhELEFBS0E7O2tCQUFBLEFBQVUsVUFBVyxZQUFNLEFBRXZCOztvQkFBQSxBQUFRLElBQVIsQUFBWSxBQUNmO0FBSEQsQUFLQTs7WUFBSSxnQkFBSixBQUFvQixBQUVwQjs7a0JBQUEsQUFBVSxZQUFZLEFBQUMsbUJBQVksQUFFL0I7O2dCQUFBLEFBQUcsY0FBYSxBQUNaO0FBQ0g7QUFFRDs7b0JBQUEsQUFBUSxJQUFSLEFBQVksQUFFWjs7Z0JBQUssU0FBUyxRQUFkLEFBQXNCLEFBQ3RCO2dCQUFBLEFBQUk7Z0JBQUosQUFBc0IsQUFDdEI7Z0JBQUEsQUFBSSxBQUVKOztnQkFBRyxPQUFBLEFBQU8sY0FBVixBQUF3QixJQUFHLEFBQ3ZCO0FBQ0g7QUFFRDs7Z0JBQU0sV0FBVyxJQUFBLEFBQUksU0FBckIsQUFBaUIsQUFBYSxBQUU5Qjs7K0JBQW1CLFNBQUEsQUFBUyxVQUFULEFBQW1CLElBQXRDLEFBQW1CLEFBQXVCLEFBQzFDO3lCQUFhLFNBQUEsQUFBUyxVQUFULEFBQW1CLElBQWhDLEFBQWEsQUFBdUIsQUFFcEM7O29CQUFBLEFBQVEsSUFBUixBQUFZLHFCQUFaLEFBQWdDLEFBQ2hDO29CQUFBLEFBQVEsSUFBUixBQUFZLGVBQVosQUFBMkIsQUFFM0I7O3FCQUFTLE9BQUEsQUFBTyxNQUFoQixBQUFTLEFBQWEsQUFFdEI7O3NCQUFBLEFBQVUsQUFFVjs7dUJBQUEsQUFBVyxLQUFYLEFBQWdCLEFBRWhCOztvQkFBQSxBQUFRLGdCQUFnQixzQkFBQSxBQUFPLFFBQVAsQUFBZSxrQkFBdkMsQUFBd0IsQUFBaUMsYUFBekQsQUFBc0UsS0FBSyxBQUFDLHVCQUFnQixBQUN4Rjt3QkFBQSxBQUFRLFNBQVIsQUFBaUIsQUFFakI7O29CQUFJLENBQUosQUFBSyxXQUFXLEFBQ1o7Z0NBQUEsQUFBWSxBQUNaOztBQUFXLCtCQUFYLEFBQWlCO3VCQUFqQixBQUFvQyxBQUN2QztBQUNKO0FBUEQsQUFTSDtBQXZDRCxBQXdDSDtBQTlHRCxBQWdIQTs7OztBQUNVLG1CQUFPLE1BRFYsQUFDVSxBQUFLLEFBQ2xCOztjQUFNLGdCQUFNLEFBQ1I7MkJBQUEsQUFBZSxBQUNmO2dCQUFBLEFBQUksU0FBUyxBQUNUO3dCQUFBLEFBQVEsQUFDWDtBQUNEO2dCQUFBLEFBQUcsV0FBVSxBQUNUOzBCQUFBLEFBQVUsQUFDYjtBQUNKO0FBVkwsQUFBTyxBQVlWO0FBWlUsQUFDSDtBQXhIUixBQXFJQTs7a0JBQUEsQUFBZTs7Ozs7Ozs7OztBQzVLZjtBQUNBLElBQU0sU0FBUyxnQkFBQSxBQUFDLFNBQUQsQUFBVSxTQUFZLEFBQ2pDO1FBQU0sTUFBTSxJQUFBLEFBQUksV0FBVyxRQUFBLEFBQVEsYUFBYSxRQUFoRCxBQUFZLEFBQTRDLEFBRXhEOztRQUFBLEFBQUksSUFBSSxJQUFBLEFBQUksV0FBWixBQUFRLEFBQWUsVUFBdkIsQUFBaUMsQUFDakM7UUFBQSxBQUFJLElBQUksSUFBQSxBQUFJLFdBQVosQUFBUSxBQUFlLFVBQVUsUUFBakMsQUFBeUMsQUFFekM7O1dBQU8sSUFBUCxBQUFXLEFBQ2Q7QUFQRCxBQVNBOztrQkFBQSxBQUFlOzs7Ozs7Ozs7QUNaZixBQUFPLEFBQWUsQUFFdEIsQUFBZTs7Ozs7Ozs7QUFDZixPQUFBLEFBQU8sQUFBVTs7Ozs7Ozs7O0FDSGpCLEFBQU8sQUFBWTs7Ozs7O0FBRW5CO0FBQ0EsSUFBTSxTQUFTLGdCQUFBLEFBQUMsTUFBRCxBQUFPLGtCQUFQLEFBQXlCLFlBQWUsQUFDbkQ7UUFBTSxTQUFTLElBQUEsQUFBSSxZQUFuQixBQUFlLEFBQWdCLEFBRS9COztRQUFJLElBQUksSUFBQSxBQUFLLFNBQWIsQUFBUSxBQUFjLEFBRXRCOztNQUFBLEFBQUUsU0FBRixBQUFXLEdBQUcsSUFBQSxBQUFJLFdBQWxCLEFBQWMsQUFBZSxBQUM3QjtNQUFBLEFBQUUsU0FBRixBQUFXLEdBQUcsSUFBQSxBQUFJLFdBQWxCLEFBQWMsQUFBZSxBQUM3QjtNQUFBLEFBQUUsU0FBRixBQUFXLEdBQUcsSUFBQSxBQUFJLFdBQWxCLEFBQWMsQUFBZSxBQUM3QjtNQUFBLEFBQUUsU0FBRixBQUFXLEdBQUcsSUFBQSxBQUFJLFdBQWxCLEFBQWMsQUFBZSxBQUU3Qjs7TUFBQSxBQUFFLFVBQUYsQUFBWSxHQUFHLEtBQUEsQUFBSyxhQUFMLEFBQWtCLElBQWpDLEFBQXFDLElBQXJDLEFBQXlDLEFBRXpDOztNQUFBLEFBQUUsU0FBRixBQUFXLEdBQUcsSUFBQSxBQUFJLFdBQWxCLEFBQWMsQUFBZSxBQUM3QjtNQUFBLEFBQUUsU0FBRixBQUFXLEdBQUcsSUFBQSxBQUFJLFdBQWxCLEFBQWMsQUFBZSxBQUM3QjtNQUFBLEFBQUUsU0FBRixBQUFXLElBQUksSUFBQSxBQUFJLFdBQW5CLEFBQWUsQUFBZSxBQUM5QjtNQUFBLEFBQUUsU0FBRixBQUFXLElBQUksSUFBQSxBQUFJLFdBQW5CLEFBQWUsQUFBZSxBQUM5QjtNQUFBLEFBQUUsU0FBRixBQUFXLElBQUksSUFBQSxBQUFJLFdBQW5CLEFBQWUsQUFBZSxBQUM5QjtNQUFBLEFBQUUsU0FBRixBQUFXLElBQUksSUFBQSxBQUFJLFdBQW5CLEFBQWUsQUFBZSxBQUM5QjtNQUFBLEFBQUUsU0FBRixBQUFXLElBQUksSUFBQSxBQUFJLFdBQW5CLEFBQWUsQUFBZSxBQUM5QjtNQUFBLEFBQUUsU0FBRixBQUFXLElBQUksSUFBQSxBQUFJLFdBQW5CLEFBQWUsQUFBZSxBQUU5Qjs7TUFBQSxBQUFFLFVBQUYsQUFBWSxJQUFaLEFBQWdCLElBQWhCLEFBQW9CLEFBQ3BCO01BQUEsQUFBRSxVQUFGLEFBQVksSUFBWixBQUFnQixHQUFoQixBQUFtQixBQUNuQjtNQUFBLEFBQUUsVUFBRixBQUFZLElBQVosQUFBZ0Isa0JBQWhCLEFBQWtDLEFBQ2xDO01BQUEsQUFBRSxVQUFGLEFBQVksSUFBWixBQUFnQixZQUFoQixBQUE0QixBQUM1QjtNQUFBLEFBQUUsVUFBRixBQUFZLElBQUksYUFBQSxBQUFhLElBQTdCLEFBQWlDLEFBQ2pDO01BQUEsQUFBRSxVQUFGLEFBQVksSUFBSSxtQkFBaEIsQUFBbUMsQUFDbkM7TUFBQSxBQUFFLFVBQUYsQUFBWSxJQUFaLEFBQWdCLElBQWhCLEFBQW9CLEFBRXBCOztNQUFBLEFBQUUsU0FBRixBQUFXLElBQUksSUFBQSxBQUFJLFdBQW5CLEFBQWUsQUFBZSxBQUM5QjtNQUFBLEFBQUUsU0FBRixBQUFXLElBQUksSUFBQSxBQUFJLFdBQW5CLEFBQWUsQUFBZSxBQUM5QjtNQUFBLEFBQUUsU0FBRixBQUFXLElBQUksSUFBQSxBQUFJLFdBQW5CLEFBQWUsQUFBZSxBQUM5QjtNQUFBLEFBQUUsU0FBRixBQUFXLElBQUksSUFBQSxBQUFJLFdBQW5CLEFBQWUsQUFBZSxBQUM5QjtNQUFBLEFBQUUsVUFBRixBQUFZLElBQUksS0FBaEIsQUFBcUIsWUFBckIsQUFBaUMsQUFFakM7O1dBQU8sc0JBQUEsQUFBTyxRQUFkLEFBQU8sQUFBZSxBQUN6QjtBQXBDRCxBQXNDQTs7a0JBQUEsQUFBZSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgd2F2aWZ5IGZyb20gJy4vd2F2aWZ5JztcblxuXG5jb25zdCBwYWQgPSAoYnVmZmVyKSA9PiB7XG4gICAgY29uc3QgY3VycmVudFNhbXBsZSA9IG5ldyBGbG9hdDMyQXJyYXkoMSk7XG5cbiAgICBidWZmZXIuY29weUZyb21DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIDApO1xuXG4gICAgbGV0IHdhc1Bvc2l0aXZlID0gKGN1cnJlbnRTYW1wbGVbMF0gPiAwKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZmVyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGJ1ZmZlci5jb3B5RnJvbUNoYW5uZWwoY3VycmVudFNhbXBsZSwgMCwgaSk7XG5cbiAgICAgICAgaWYgKCh3YXNQb3NpdGl2ZSAmJiBjdXJyZW50U2FtcGxlWzBdIDwgMCkgfHxcbiAgICAgICAgICAgICAgICAoIXdhc1Bvc2l0aXZlICYmIGN1cnJlbnRTYW1wbGVbMF0gPiAwKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50U2FtcGxlWzBdID0gMDtcbiAgICAgICAgYnVmZmVyLmNvcHlUb0NoYW5uZWwoY3VycmVudFNhbXBsZSwgMCwgaSk7XG4gICAgfVxuXG4gICAgYnVmZmVyLmNvcHlGcm9tQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBidWZmZXIubGVuZ3RoIC0gMSk7XG5cbiAgICB3YXNQb3NpdGl2ZSA9IChjdXJyZW50U2FtcGxlWzBdID4gMCk7XG5cbiAgICBmb3IgKGxldCBpID0gYnVmZmVyLmxlbmd0aCAtIDE7IGkgPiAwOyBpIC09IDEpIHtcbiAgICAgICAgYnVmZmVyLmNvcHlGcm9tQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBpKTtcblxuICAgICAgICBpZiAoKHdhc1Bvc2l0aXZlICYmIGN1cnJlbnRTYW1wbGVbMF0gPCAwKSB8fFxuICAgICAgICAgICAgICAgICghd2FzUG9zaXRpdmUgJiYgY3VycmVudFNhbXBsZVswXSA+IDApKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnRTYW1wbGVbMF0gPSAwO1xuICAgICAgICBidWZmZXIuY29weVRvQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYnVmZmVyO1xufTtcblxuY29uc3QgV2F2UGxheWVyID0gKCkgPT4ge1xuICAgIGxldCBjb250ZXh0O1xuXG4gICAgbGV0IGhhc0NhbmNlbGVkXyA9IGZhbHNlO1xuXG4gICAgbGV0IHdlYnNvY2tldDtcblxuICAgIGNvbnN0IHBsYXkgPSB1cmwgPT4ge1xuXG4gICAgICAgIGxldCBuZXh0VGltZSA9IDA7XG5cbiAgICAgICAgY29uc3QgYXVkaW9TdGFjayA9IFtdO1xuXG4gICAgICAgIGhhc0NhbmNlbGVkXyA9IGZhbHNlO1xuXG4gICAgICAgIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5cbiAgICAgICAgbGV0IHNjaGVkdWxlQnVmZmVyc1RpbWVvdXRJZCA9IG51bGw7XG5cbiAgICAgICAgbGV0IGlzU3RhcnRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGNvbnN0IHNjaGVkdWxlQnVmZmVycyA9ICgpID0+IHtcblxuICAgICAgICAgICAgaWYgKGhhc0NhbmNlbGVkXykge1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlQnVmZmVyc1RpbWVvdXRJZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAoYXVkaW9TdGFjay5sZW5ndGggPiAwICYmIGF1ZGlvU3RhY2tbMF0uYnVmZmVyICE9PSB1bmRlZmluZWQgJiYgbmV4dFRpbWUgPCBjb250ZXh0LmN1cnJlbnRUaW1lICsgMikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gY29udGV4dC5jdXJyZW50VGltZTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzZWdtZW50ID0gYXVkaW9TdGFjay5zaGlmdCgpO1xuXG4gICAgICAgICAgICAgICAgLy9zb3VyY2UuYnVmZmVyID0gcGFkKHNlZ21lbnQuYnVmZmVyKTtcbiAgICAgICAgICAgICAgICBzb3VyY2UuYnVmZmVyID0gc2VnbWVudC5idWZmZXI7XG4gICAgICAgICAgICAgICAgc291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAobmV4dFRpbWUgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSA9IGN1cnJlbnRUaW1lICsgMC4yOyAgLy8vIGFkZCA3MDBtcyBsYXRlbmN5IHRvIHdvcmsgd2VsbCBhY3Jvc3Mgc3lzdGVtcyAtIHR1bmUgdGhpcyBpZiB5b3UgbGlrZVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxldCBkdXJhdGlvbiA9IHNvdXJjZS5idWZmZXIuZHVyYXRpb247XG4gICAgICAgICAgICAgICAgbGV0IG9mZnNldCA9IDA7XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPiBuZXh0VGltZSkge1xuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBjdXJyZW50VGltZSAtIG5leHRUaW1lO1xuICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSA9IGN1cnJlbnRUaW1lO1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGR1cmF0aW9uIC0gb2Zmc2V0O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNvdXJjZS5zdGFydChuZXh0VGltZSwgb2Zmc2V0KTtcbiAgICAgICAgICAgICAgICBzb3VyY2Uuc3RvcChuZXh0VGltZSArIGR1cmF0aW9uKTtcblxuICAgICAgICAgICAgICAgIG5leHRUaW1lICs9IGR1cmF0aW9uOyAvLyBNYWtlIHRoZSBuZXh0IGJ1ZmZlciB3YWl0IHRoZSBsZW5ndGggb2YgdGhlIGxhc3QgYnVmZmVyIGJlZm9yZSBiZWluZyBwbGF5ZWRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NoZWR1bGVCdWZmZXJzVGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiBzY2hlZHVsZUJ1ZmZlcnMoKSwgNDAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdlYnNvY2tldCA9IG5ldyBXZWJTb2NrZXQodXJsKTtcblxuICAgICAgICB3ZWJzb2NrZXQuYmluYXJ5VHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cbiAgICAgICAgd2Vic29ja2V0Lm9ub3BlbiA9ICgpID0+IHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ29ub3BlbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgd2Vic29ja2V0Lm9uY2xvc2UgID0gKCkgPT4ge1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb25jbG9zZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgaXNGaXJzdEJ1ZmZlciA9IHRydWU7XG5cbiAgICAgICAgd2Vic29ja2V0Lm9ubWVzc2FnZSA9IChtZXNzYWdlKSA9PiB7XG5cbiAgICAgICAgICAgIGlmKGhhc0NhbmNlbGVkXyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcblxuICAgICAgICAgICAgbGV0ICBidWZmZXIgPSBtZXNzYWdlLmRhdGE7XG4gICAgICAgICAgICBsZXQgbnVtYmVyT2ZDaGFubmVscywgc2FtcGxlUmF0ZTtcbiAgICAgICAgICAgIGxldCBzZWdtZW50O1xuXG4gICAgICAgICAgICBpZihidWZmZXIuYnl0ZUxlbmd0aCA8PSA0NCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBkYXRhVmlldyA9IG5ldyBEYXRhVmlldyhidWZmZXIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBudW1iZXJPZkNoYW5uZWxzID0gZGF0YVZpZXcuZ2V0VWludDE2KDIyLCB0cnVlKTtcbiAgICAgICAgICAgIHNhbXBsZVJhdGUgPSBkYXRhVmlldy5nZXRVaW50MzIoMjQsIHRydWUpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbnVtYmVyT2ZDaGFubmVscyAnLG51bWJlck9mQ2hhbm5lbHMpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhbXBsZVJhdGUgJywgc2FtcGxlUmF0ZSk7XG5cbiAgICAgICAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSg0NCk7XG5cbiAgICAgICAgICAgIHNlZ21lbnQgPSB7fTtcblxuICAgICAgICAgICAgYXVkaW9TdGFjay5wdXNoKHNlZ21lbnQpO1xuXG4gICAgICAgICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSh3YXZpZnkoYnVmZmVyLCBudW1iZXJPZkNoYW5uZWxzLCBzYW1wbGVSYXRlKSkudGhlbigoYXVkaW9CdWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICBzZWdtZW50LmJ1ZmZlciA9IGF1ZGlvQnVmZmVyO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFpc1N0YXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNTdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBzY2hlZHVsZUJ1ZmZlcnMoKSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHBsYXk6IHVybCA9PiBwbGF5KHVybCksXG4gICAgICAgIHN0b3A6ICgpID0+IHtcbiAgICAgICAgICAgIGhhc0NhbmNlbGVkXyA9IHRydWU7XG4gICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGNvbnRleHQuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKHdlYnNvY2tldCl7XG4gICAgICAgICAgICAgICAgd2Vic29ja2V0LmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFdhdlBsYXllcjsiLCJcblxuLy8gQ29uY2F0IHR3byBBcnJheUJ1ZmZlcnNcbmNvbnN0IGNvbmNhdCA9IChidWZmZXIxLCBidWZmZXIyKSA9PiB7XG4gICAgY29uc3QgdG1wID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyMS5ieXRlTGVuZ3RoICsgYnVmZmVyMi5ieXRlTGVuZ3RoKTtcblxuICAgIHRtcC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyMSksIDApO1xuICAgIHRtcC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyMiksIGJ1ZmZlcjEuYnl0ZUxlbmd0aCk7XG5cbiAgICByZXR1cm4gdG1wLmJ1ZmZlcjtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNvbmNhdDtcbiIsImltcG9ydCBXYXZQbGF5ZXIgZnJvbSAnLi9XYXZQbGF5ZXInO1xuXG5leHBvcnQgZGVmYXVsdCBXYXZQbGF5ZXI7XG5tb2R1bGUuZXhwb3J0cyA9IFdhdlBsYXllcjsiLCJpbXBvcnQgY29uY2F0IGZyb20gJy4vY29uY2F0JztcblxuLy8gV3JpdGUgYSBwcm9wZXIgV0FWRSBoZWFkZXIgZm9yIHRoZSBnaXZlbiBidWZmZXIuXG5jb25zdCB3YXZpZnkgPSAoZGF0YSwgbnVtYmVyT2ZDaGFubmVscywgc2FtcGxlUmF0ZSkgPT4ge1xuICAgIGNvbnN0IGhlYWRlciA9IG5ldyBBcnJheUJ1ZmZlcig0NCk7XG5cbiAgICB2YXIgZCA9IG5ldyAgRGF0YVZpZXcoaGVhZGVyKTtcblxuICAgIGQuc2V0VWludDgoMCwgJ1InLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMSwgJ0knLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMiwgJ0YnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMywgJ0YnLmNoYXJDb2RlQXQoMCkpO1xuXG4gICAgZC5zZXRVaW50MzIoNCwgZGF0YS5ieXRlTGVuZ3RoIC8gMiArIDQ0LCB0cnVlKTtcblxuICAgIGQuc2V0VWludDgoOCwgJ1cnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoOSwgJ0EnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTAsICdWJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDExLCAnRScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxMiwgJ2YnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTMsICdtJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDE0LCAndCcuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxNSwgJyAnLmNoYXJDb2RlQXQoMCkpO1xuXG4gICAgZC5zZXRVaW50MzIoMTYsIDE2LCB0cnVlKTtcbiAgICBkLnNldFVpbnQxNigyMCwgMSwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MTYoMjIsIG51bWJlck9mQ2hhbm5lbHMsIHRydWUpO1xuICAgIGQuc2V0VWludDMyKDI0LCBzYW1wbGVSYXRlLCB0cnVlKTtcbiAgICBkLnNldFVpbnQzMigyOCwgc2FtcGxlUmF0ZSAqIDEgKiAyKTtcbiAgICBkLnNldFVpbnQxNigzMiwgbnVtYmVyT2ZDaGFubmVscyAqIDIpO1xuICAgIGQuc2V0VWludDE2KDM0LCAxNiwgdHJ1ZSk7XG5cbiAgICBkLnNldFVpbnQ4KDM2LCAnZCcuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgzNywgJ2EnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMzgsICd0Jy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDM5LCAnYScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50MzIoNDAsIGRhdGEuYnl0ZUxlbmd0aCwgdHJ1ZSk7XG5cbiAgICByZXR1cm4gY29uY2F0KGhlYWRlciwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB3YXZpZnkiXX0=
