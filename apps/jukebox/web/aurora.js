var Base,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Base = (function() {
  var fnTest;

  function Base() {}

  fnTest = /\b_super\b/;

  Base.extend = function(prop) {
    var Class, fn, key, keys, _ref, _super;
    Class = (function(_super) {

      __extends(Class, _super);

      function Class() {
        return Class.__super__.constructor.apply(this, arguments);
      }

      return Class;

    })(this);
    if (typeof prop === 'function') {
      keys = Object.keys(Class.prototype);
      prop.call(Class, Class);
      prop = {};
      _ref = Class.prototype;
      for (key in _ref) {
        fn = _ref[key];
        if (__indexOf.call(keys, key) < 0) {
          prop[key] = fn;
        }
      }
    }
    _super = Class.__super__;
    for (key in prop) {
      fn = prop[key];
      if (typeof fn === 'function' && fnTest.test(fn)) {
        (function(key, fn) {
          return Class.prototype[key] = function() {
            var ret, tmp;
            tmp = this._super;
            this._super = _super[key];
            ret = fn.apply(this, arguments);
            this._super = tmp;
            return ret;
          };
        })(key, fn);
      } else {
        Class.prototype[key] = fn;
      }
    }
    return Class;
  };

  return Base;

})();



var Buffer;

Buffer = (function() {
  var BlobBuilder, URL;

  function Buffer(data) {
    this.data = data;
    this.length = this.data.length;
  }

  Buffer.allocate = function(size) {
    return new Buffer(new Uint8Array(size));
  };

  Buffer.prototype.copy = function() {
    return new Buffer(new Uint8Array(this.data));
  };

  Buffer.prototype.slice = function(position, length) {
    if (position === 0 && length >= this.length) {
      return new Buffer(this.data);
    } else {
      return new Buffer(this.data.subarray(position, position + length));
    }
  };

  BlobBuilder = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder;

  URL = window.URL || window.webkitURL || window.mozURL;

  Buffer.makeBlob = function(data) {
    var bb;
    try {
      return new Blob([data]);
    } catch (_error) {}
    if (BlobBuilder != null) {
      bb = new BlobBuilder;
      bb.append(data);
      return bb.getBlob();
    }
    return null;
  };

  Buffer.makeBlobURL = function(data) {
    return URL != null ? URL.createObjectURL(this.makeBlob(data)) : void 0;
  };

  Buffer.revokeBlobURL = function(url) {
    return URL != null ? URL.revokeObjectURL(url) : void 0;
  };

  Buffer.prototype.toBlob = function() {
    return Buffer.makeBlob(this.data.buffer);
  };

  Buffer.prototype.toBlobURL = function() {
    return Buffer.makeBlobURL(this.data.buffer);
  };

  return Buffer;

})();



var BufferList;

BufferList = (function() {

  function BufferList() {
    this.buffers = [];
    this.availableBytes = 0;
    this.availableBuffers = 0;
    this.first = null;
  }

  BufferList.prototype.copy = function() {
    var result;
    result = new BufferList;
    result.buffers = this.buffers.slice(0);
    result.first = result.buffers[0];
    result.availableBytes = this.availableBytes;
    result.availableBuffers = this.availableBuffers;
    return result;
  };

  BufferList.prototype.shift = function() {
    var result;
    result = this.buffers.shift();
    this.availableBytes -= result.length;
    this.availableBuffers -= 1;
    this.first = this.buffers[0];
    return result;
  };

  BufferList.prototype.push = function(buffer) {
    this.buffers.push(buffer);
    this.availableBytes += buffer.length;
    this.availableBuffers += 1;
    if (!this.first) {
      this.first = buffer;
    }
    return this;
  };

  BufferList.prototype.unshift = function(buffer) {
    this.buffers.unshift(buffer);
    this.availableBytes += buffer.length;
    this.availableBuffers += 1;
    this.first = buffer;
    return this;
  };

  return BufferList;

})();



var Stream;

Stream = (function() {
  var buf, float32, float64, float64Fallback, float80, int16, int32, int8, nativeEndian, uint16, uint32, uint8;

  buf = new ArrayBuffer(16);

  uint8 = new Uint8Array(buf);

  int8 = new Int8Array(buf);

  uint16 = new Uint16Array(buf);

  int16 = new Int16Array(buf);

  uint32 = new Uint32Array(buf);

  int32 = new Int32Array(buf);

  float32 = new Float32Array(buf);

  if (typeof Float64Array !== "undefined" && Float64Array !== null) {
    float64 = new Float64Array(buf);
  }

  nativeEndian = new Uint16Array(new Uint8Array([0x12, 0x34]).buffer)[0] === 0x3412;

  function Stream(list) {
    this.list = list;
    this.localOffset = 0;
    this.offset = 0;
  }

  Stream.fromBuffer = function(buffer) {
    var list;
    list = new BufferList;
    list.push(buffer);
    return new Stream(list);
  };

  Stream.prototype.copy = function() {
    var result;
    result = new Stream(this.list.copy());
    result.localOffset = this.localOffset;
    result.offset = this.offset;
    return result;
  };

  Stream.prototype.available = function(bytes) {
    return bytes <= this.list.availableBytes - this.localOffset;
  };

  Stream.prototype.remainingBytes = function() {
    return this.list.availableBytes - this.localOffset;
  };

  Stream.prototype.advance = function(bytes) {
    this.localOffset += bytes;
    this.offset += bytes;
    while (this.list.first && (this.localOffset >= this.list.first.length)) {
      this.localOffset -= this.list.shift().length;
    }
    return this;
  };

  Stream.prototype.readUInt8 = function() {
    var a;
    a = this.list.first.data[this.localOffset];
    this.localOffset += 1;
    this.offset += 1;
    if (this.localOffset === this.list.first.length) {
      this.localOffset = 0;
      this.list.shift();
    }
    return a;
  };

  Stream.prototype.peekUInt8 = function(offset) {
    var buffer, list, _i, _len;
    if (offset == null) {
      offset = 0;
    }
    offset = this.localOffset + offset;
    list = this.list.buffers;
    for (_i = 0, _len = list.length; _i < _len; _i++) {
      buffer = list[_i];
      if (buffer.length > offset) {
        return buffer.data[offset];
      }
      offset -= buffer.length;
    }
    return 0;
  };

  Stream.prototype.read = function(bytes, littleEndian) {
    var i, _i, _j, _ref;
    if (littleEndian == null) {
      littleEndian = false;
    }
    if (littleEndian === nativeEndian) {
      for (i = _i = 0; _i < bytes; i = _i += 1) {
        uint8[i] = this.readUInt8();
      }
    } else {
      for (i = _j = _ref = bytes - 1; _j >= 0; i = _j += -1) {
        uint8[i] = this.readUInt8();
      }
    }
  };

  Stream.prototype.peek = function(bytes, offset, littleEndian) {
    var i, _i, _j;
    if (littleEndian == null) {
      littleEndian = false;
    }
    if (littleEndian === nativeEndian) {
      for (i = _i = 0; _i < bytes; i = _i += 1) {
        uint8[i] = this.peekUInt8(offset + i);
      }
    } else {
      for (i = _j = 0; _j < bytes; i = _j += 1) {
        uint8[bytes - i - 1] = this.peekUInt8(offset + i);
      }
    }
  };

  Stream.prototype.readInt8 = function() {
    this.read(1);
    return int8[0];
  };

  Stream.prototype.peekInt8 = function(offset) {
    if (offset == null) {
      offset = 0;
    }
    this.peek(1, offset);
    return int8[0];
  };

  Stream.prototype.readUInt16 = function(littleEndian) {
    this.read(2, littleEndian);
    return uint16[0];
  };

  Stream.prototype.peekUInt16 = function(offset, littleEndian) {
    if (offset == null) {
      offset = 0;
    }
    this.peek(2, offset, littleEndian);
    return uint16[0];
  };

  Stream.prototype.readInt16 = function(littleEndian) {
    this.read(2, littleEndian);
    return int16[0];
  };

  Stream.prototype.peekInt16 = function(offset, littleEndian) {
    if (offset == null) {
      offset = 0;
    }
    this.peek(2, offset, littleEndian);
    return int16[0];
  };

  Stream.prototype.readUInt24 = function(littleEndian) {
    if (littleEndian) {
      return this.readUInt16(true) + (this.readUInt8() << 16);
    } else {
      return (this.readUInt16() << 8) + this.readUInt8();
    }
  };

  Stream.prototype.peekUInt24 = function(offset, littleEndian) {
    if (offset == null) {
      offset = 0;
    }
    if (littleEndian) {
      return this.peekUInt16(offset, true) + (this.peekUInt8(offset + 2) << 16);
    } else {
      return (this.peekUInt16(offset) << 8) + this.peekUInt8(offset + 2);
    }
  };

  Stream.prototype.readInt24 = function(littleEndian) {
    if (littleEndian) {
      return this.readUInt16(true) + (this.readInt8() << 16);
    } else {
      return (this.readInt16() << 8) + this.readUInt8();
    }
  };

  Stream.prototype.peekInt24 = function(offset, littleEndian) {
    if (offset == null) {
      offset = 0;
    }
    if (littleEndian) {
      return this.peekUInt16(offset, true) + (this.peekInt8(offset + 2) << 16);
    } else {
      return (this.peekInt16(offset) << 8) + this.peekUInt8(offset + 2);
    }
  };

  Stream.prototype.readUInt32 = function(littleEndian) {
    this.read(4, littleEndian);
    return uint32[0];
  };

  Stream.prototype.peekUInt32 = function(offset, littleEndian) {
    if (offset == null) {
      offset = 0;
    }
    this.peek(4, offset, littleEndian);
    return uint32[0];
  };

  Stream.prototype.readInt32 = function(littleEndian) {
    this.read(4, littleEndian);
    return int32[0];
  };

  Stream.prototype.peekInt32 = function(offset, littleEndian) {
    if (offset == null) {
      offset = 0;
    }
    this.peek(4, offset, littleEndian);
    return int32[0];
  };

  Stream.prototype.readFloat32 = function(littleEndian) {
    this.read(4, littleEndian);
    return float32[0];
  };

  Stream.prototype.peekFloat32 = function(offset, littleEndian) {
    if (offset == null) {
      offset = 0;
    }
    this.peek(4, offset, littleEndian);
    return float32[0];
  };

  Stream.prototype.readFloat64 = function(littleEndian) {
    this.read(8, littleEndian);
    if (float64) {
      return float64[0];
    } else {
      return float64Fallback();
    }
  };

  float64Fallback = function() {
    var exp, frac, high, low, out, sign;
    low = uint32[0], high = uint32[1];
    if (!high || high === 0x80000000) {
      return 0.0;
    }
    sign = 1 - (high >>> 31) * 2;
    exp = (high >>> 20) & 0x7ff;
    frac = high & 0xfffff;
    if (exp === 0x7ff) {
      if (frac) {
        return NaN;
      }
      return sign * Infinity;
    }
    exp -= 1023;
    out = (frac | 0x100000) * Math.pow(2, exp - 20);
    out += low * Math.pow(2, exp - 52);
    return sign * out;
  };

  Stream.prototype.peekFloat64 = function(offset, littleEndian) {
    if (offset == null) {
      offset = 0;
    }
    this.peek(8, offset, littleEndian);
    if (float64) {
      return float64[0];
    } else {
      return float64Fallback();
    }
  };

  Stream.prototype.readFloat80 = function(littleEndian) {
    this.read(10, littleEndian);
    return float80();
  };

  float80 = function() {
    var a0, a1, exp, high, low, out, sign;
    high = uint32[0], low = uint32[1];
    a0 = uint8[9];
    a1 = uint8[8];
    sign = 1 - (a0 >>> 7) * 2;
    exp = ((a0 & 0x7F) << 8) | a1;
    if (exp === 0 && low === 0 && high === 0) {
      return 0;
    }
    if (exp === 0x7fff) {
      if (low === 0 && high === 0) {
        return sign * Infinity;
      }
      return NaN;
    }
    exp -= 16383;
    out = low * Math.pow(2, exp - 31);
    out += high * Math.pow(2, exp - 63);
    return sign * out;
  };

  Stream.prototype.peekFloat80 = function(offset, littleEndian) {
    if (offset == null) {
      offset = 0;
    }
    this.peek(10, offset, littleEndian);
    return float80();
  };

  Stream.prototype.readString = function(length) {
    var i, result, _i;
    result = [];
    for (i = _i = 0; _i < length; i = _i += 1) {
      result.push(String.fromCharCode(this.readUInt8()));
    }
    return result.join('');
  };

  Stream.prototype.peekString = function(offset, length) {
    var i, result, _i;
    result = [];
    for (i = _i = 0; _i < length; i = _i += 1) {
      result.push(String.fromCharCode(this.peekUInt8(offset + i)));
    }
    return result.join('');
  };

  Stream.prototype.readUTF8 = function(length) {
    return decodeURIComponent(escape(this.readString(length)));
  };

  Stream.prototype.peekUTF8 = function(offset, length) {
    return decodeURIComponent(escape(this.peekString(offset, length)));
  };

  Stream.prototype.readBuffer = function(length) {
    var i, result, to, _i;
    result = Buffer.allocate(length);
    to = result.data;
    for (i = _i = 0; _i < length; i = _i += 1) {
      to[i] = this.readUInt8();
    }
    return result;
  };

  Stream.prototype.peekBuffer = function(offset, length) {
    var i, result, to, _i;
    if (offset == null) {
      offset = 0;
    }
    result = Buffer.allocate(length);
    to = result.data;
    for (i = _i = 0; _i < length; i = _i += 1) {
      to[i] = this.peekUInt8(offset + i);
    }
    return result;
  };

  Stream.prototype.readSingleBuffer = function(length) {
    var result;
    result = this.list.first.slice(this.localOffset, length);
    this.advance(result.length);
    return result;
  };

  Stream.prototype.peekSingleBuffer = function(length) {
    var result;
    result = this.list.first.slice(this.localOffset, length);
    return result;
  };

  return Stream;

})();



var Bitstream;

Bitstream = (function() {
  var bitMask;

  function Bitstream(stream) {
    this.stream = stream;
    this.bitPosition = 0;
  }

  Bitstream.prototype.copy = function() {
    var result;
    result = new Bitstream(this.stream.copy());
    result.bitPosition = this.bitPosition;
    return result;
  };

  Bitstream.prototype.offset = function() {
    return 8 * this.stream.offset + this.bitPosition;
  };

  Bitstream.prototype.available = function(bits) {
    return this.stream.available((bits + 8 - this.bitPosition) / 8);
  };

  Bitstream.prototype.advance = function(bits) {
    this.bitPosition += bits;
    this.stream.advance(this.bitPosition >> 3);
    this.bitPosition = this.bitPosition & 7;
    return this;
  };

  Bitstream.prototype.align = function() {
    if (this.bitPosition !== 0) {
      this.bitPosition = 0;
      this.stream.advance(1);
    }
    return this;
  };

  Bitstream.prototype.readBig = function(bits) {
    var val;
    if (bits === 0) {
      return 0;
    }
    val = this.peekBig(bits);
    this.advance(bits);
    return val;
  };

  Bitstream.prototype.peekBig = function(bits) {
    var a, a0, a1, a2, a3, a4;
    if (bits === 0) {
      return 0;
    }
    a0 = this.stream.peekUInt8(0) * 0x0100000000;
    a1 = this.stream.peekUInt8(1) * 0x0001000000;
    a2 = this.stream.peekUInt8(2) * 0x0000010000;
    a3 = this.stream.peekUInt8(3) * 0x0000000100;
    a4 = this.stream.peekUInt8(4) * 0x0000000001;
    a = a0 + a1 + a2 + a3 + a4;
    a = a % Math.pow(2, 40 - this.bitPosition);
    a = a / Math.pow(2, 40 - this.bitPosition - bits);
    return a << 0;
  };

  Bitstream.prototype.read = function(bits) {
    var a;
    if (bits === 0) {
      return 0;
    }
    a = this.stream.peekUInt32(0);
    a = (a << this.bitPosition) >>> (32 - bits);
    this.advance(bits);
    return a;
  };

  Bitstream.prototype.readSigned = function(bits) {
    var a;
    if (bits === 0) {
      return 0;
    }
    a = this.stream.peekUInt32(0);
    a = (a << this.bitPosition) >> (32 - bits);
    this.advance(bits);
    return a;
  };

  Bitstream.prototype.peek = function(bits) {
    var a;
    if (bits === 0) {
      return 0;
    }
    a = this.stream.peekUInt32(0);
    a = (a << this.bitPosition) >>> (32 - bits);
    return a;
  };

  Bitstream.prototype.readSmall = function(bits) {
    var a;
    if (bits === 0) {
      return 0;
    }
    a = this.stream.peekUInt16(0);
    a = ((a << this.bitPosition) & 0xFFFF) >>> (16 - bits);
    this.advance(bits);
    return a;
  };

  Bitstream.prototype.peekSmall = function(bits) {
    var a;
    if (bits === 0) {
      return 0;
    }
    a = this.stream.peekUInt16(0);
    a = ((a << this.bitPosition) & 0xFFFF) >>> (16 - bits);
    return a;
  };

  Bitstream.prototype.readOne = function() {
    var a;
    a = this.stream.peekUInt8(0);
    a = ((a << this.bitPosition) & 0xFF) >>> 7;
    this.advance(1);
    return a;
  };

  Bitstream.prototype.peekOne = function() {
    var a;
    a = this.stream.peekUInt8(0);
    a = ((a << this.bitPosition) & 0xFF) >>> 7;
    return a;
  };

  bitMask = [0x00000000, 0x00000001, 0x00000003, 0x00000007, 0x0000000f, 0x0000001f, 0x0000003f, 0x0000007f, 0x000000ff, 0x000001ff, 0x000003ff, 0x000007ff, 0x00000fff, 0x00001fff, 0x00003fff, 0x00007fff, 0x0000ffff, 0x0001ffff, 0x0003ffff, 0x0007ffff, 0x000fffff, 0x001fffff, 0x003fffff, 0x007fffff, 0x00ffffff, 0x01ffffff, 0x03ffffff, 0x07ffffff, 0x0fffffff, 0x1fffffff, 0x3fffffff, 0x7fffffff, 0xffffffff];

  Bitstream.prototype.readLSB = function(bits) {
    var a, modBits;
    if (bits === 0) {
      return 0;
    }
    modBits = bits + this.bitPosition;
    a = (this.stream.peekUInt8(0) & 0xFF) >>> this.bitPosition;
    if (modBits > 8) {
      a |= (this.stream.peekUInt8(1) & 0xFF) << (8 - this.bitPosition);
    }
    if (modBits > 16) {
      a |= (this.stream.peekUInt8(2) & 0xFF) << (16 - this.bitPosition);
    }
    if (modBits > 24) {
      a |= (this.stream.peekUInt8(3) & 0xFF) << (24 - this.bitPosition);
    }
    if (modBits > 32) {
      a |= (this.stream.peekUInt8(4) & 0xFF) << (32 - this.bitPosition);
    }
    this.advance(bits);
    return a & bitMask[bits];
  };

  return Bitstream;

})();



var EventEmitter,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice;

EventEmitter = (function(_super) {

  __extends(EventEmitter, _super);

  function EventEmitter() {
    return EventEmitter.__super__.constructor.apply(this, arguments);
  }

  EventEmitter.prototype.on = function(event, fn) {
    var _base, _ref, _ref1;
    if ((_ref = this.events) == null) {
      this.events = {};
    }
    if ((_ref1 = (_base = this.events)[event]) == null) {
      _base[event] = [];
    }
    return this.events[event].push(fn);
  };

  EventEmitter.prototype.off = function(event, fn) {
    var index, _ref;
    if (!((_ref = this.events) != null ? _ref[event] : void 0)) {
      return;
    }
    index = this.events[event].indexOf(fn);
    if (~index) {
      return this.events[event].splice(index, 1);
    }
  };

  EventEmitter.prototype.once = function(event, fn) {
    var cb,
      _this = this;
    return this.on(event, cb = function() {
      _this.off(event, cb);
      return fn.apply(_this, arguments);
    });
  };

  EventEmitter.prototype.emit = function() {
    var args, event, fn, _i, _len, _ref, _ref1;
    event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (!((_ref = this.events) != null ? _ref[event] : void 0)) {
      return;
    }
    _ref1 = this.events[event];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      fn = _ref1[_i];
      fn.apply(this, args);
    }
  };

  return EventEmitter;

})(Base);



var Demuxer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Demuxer = (function(_super) {
  var formats;

  __extends(Demuxer, _super);

  Demuxer.probe = function(buffer) {
    return false;
  };

  function Demuxer(source, chunk) {
    var list, received,
      _this = this;
    list = new BufferList;
    list.push(chunk);
    this.stream = new Stream(list);
    received = false;
    source.on('data', function(chunk) {
      received = true;
      list.push(chunk);
      return _this.readChunk(chunk);
    });
    source.on('error', function(err) {
      return _this.emit('error', err);
    });
    source.on('end', function() {
      if (!received) {
        _this.readChunk(chunk);
      }
      return _this.emit('end');
    });
    this.init();
  }

  Demuxer.prototype.init = function() {};

  Demuxer.prototype.readChunk = function(chunk) {};

  Demuxer.prototype.seek = function(timestamp) {
    return 0;
  };

  formats = [];

  Demuxer.register = function(demuxer) {
    return formats.push(demuxer);
  };

  Demuxer.find = function(buffer) {
    var format, stream, _i, _len;
    stream = Stream.fromBuffer(buffer);
    for (_i = 0, _len = formats.length; _i < _len; _i++) {
      format = formats[_i];
      if (format.probe(stream)) {
        return format;
      }
    }
    return null;
  };

  return Demuxer;

})(EventEmitter);



var Decoder,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Decoder = (function(_super) {
  var codecs;

  __extends(Decoder, _super);

  function Decoder(demuxer, format) {
    var list,
      _this = this;
    this.format = format;
    list = new BufferList;
    this.stream = new Stream(list);
    this.bitstream = new Bitstream(this.stream);
    this.receivedFinalBuffer = false;
    demuxer.on('cookie', function(cookie) {
      return _this.setCookie(cookie);
    });
    demuxer.on('data', function(chunk, final) {
      _this.receivedFinalBuffer = !!final;
      list.push(chunk);
      return setTimeout(function() {
        return _this.emit('available');
      }, 0);
    });
    this.init();
  }

  Decoder.prototype.init = function() {};

  Decoder.prototype.setCookie = function(cookie) {};

  Decoder.prototype.readChunk = function() {};

  Decoder.prototype.seek = function(position) {
    return 'Not Implemented.';
  };

  codecs = {};

  Decoder.register = function(id, decoder) {
    return codecs[id] = decoder;
  };

  Decoder.find = function(id) {
    return codecs[id] || null;
  };

  return Decoder;

})(EventEmitter);



var Queue,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Queue = (function(_super) {

  __extends(Queue, _super);

  function Queue(decoder) {
    this.decoder = decoder;
    this.write = __bind(this.write, this);

    this.readyMark = 64;
    this.finished = false;
    this.buffering = true;
    this.buffers = [];
    this.decoder.on('data', this.write);
    this.decoder.readChunk();
  }

  Queue.prototype.write = function(buffer) {
    if (buffer) {
      this.buffers.push(buffer);
    }
    if (this.buffering) {
      if (this.buffers.length >= this.readyMark || this.decoder.receivedFinalBuffer) {
        this.buffering = false;
        return this.emit('ready');
      } else {
        return this.decoder.readChunk();
      }
    }
  };

  Queue.prototype.read = function() {
    if (this.buffers.length === 0) {
      return null;
    }
    this.decoder.readChunk();
    return this.buffers.shift();
  };

  return Queue;

})(EventEmitter);



var AudioDevice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AudioDevice = (function(_super) {
  var devices;

  __extends(AudioDevice, _super);

  function AudioDevice(sampleRate, channels) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.updateTime = __bind(this.updateTime, this);

    this.playing = false;
    this.currentTime = 0;
    this._lastTime = 0;
  }

  AudioDevice.prototype.start = function() {
    var _ref,
      _this = this;
    if (this.playing) {
      return;
    }
    this.playing = true;
    if ((_ref = this.device) == null) {
      this.device = AudioDevice.create(this.sampleRate, this.channels);
    }
    this._lastTime = this.device.getDeviceTime();
    this._timer = setInterval(this.updateTime, 200);
    return this.device.on('refill', this.refill = function(buffer) {
      return _this.emit('refill', buffer);
    });
  };

  AudioDevice.prototype.stop = function() {
    if (!this.playing) {
      return;
    }
    this.playing = false;
    this.device.off('refill', this.refill);
    return clearInterval(this._timer);
  };

  AudioDevice.prototype.destroy = function() {
    this.stop();
    return this.device.destroy();
  };

  AudioDevice.prototype.seek = function(currentTime) {
    this.currentTime = currentTime;
    this._lastTime = this.device.getDeviceTime();
    return this.emit('timeUpdate', this.currentTime);
  };

  AudioDevice.prototype.updateTime = function() {
    var time;
    time = this.device.getDeviceTime();
    this.currentTime += (time - this._lastTime) / this.device.sampleRate * 1000 | 0;
    this._lastTime = time;
    return this.emit('timeUpdate', this.currentTime);
  };

  devices = [];

  AudioDevice.register = function(device) {
    return devices.push(device);
  };

  AudioDevice.create = function(sampleRate, channels) {
    var device, _i, _len;
    for (_i = 0, _len = devices.length; _i < _len; _i++) {
      device = devices[_i];
      if (device.supported) {
        return new device(sampleRate, channels);
      }
    }
    return null;
  };

  return AudioDevice;

})(EventEmitter);



var Asset,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Asset = (function(_super) {

  __extends(Asset, _super);

  window.Asset = Asset;

  function Asset(source) {
    var _this = this;
    this.source = source;
    this.findDecoder = __bind(this.findDecoder, this);

    this.probe = __bind(this.probe, this);

    this.buffered = 0;
    this.duration = null;
    this.format = null;
    this.metadata = null;
    this.active = false;
    this.demuxer = null;
    this.decoder = null;
    this.source.once('data', this.probe);
    this.source.on('error', function(err) {
      _this.emit('error', err);
      return _this.stop();
    });
    this.source.on('progress', function(buffered) {
      _this.buffered = buffered;
      return _this.emit('buffer', _this.buffered);
    });
  }

  Asset.fromURL = function(url) {
    var source;
    source = new HTTPSource(url);
    return new Asset(source);
  };

  Asset.fromFile = function(file) {
    var source;
    source = new FileSource(file);
    return new Asset(source);
  };

  Asset.prototype.start = function() {
    if (this.active) {
      return;
    }
    this.active = true;
    return this.source.start();
  };

  Asset.prototype.stop = function() {
    if (!this.active) {
      return;
    }
    this.active = false;
    return this.source.pause();
  };

  Asset.prototype.get = function(event, callback) {
    var _this = this;
    if (event !== 'format' && event !== 'duration' && event !== 'metadata') {
      return;
    }
    if (this[event] != null) {
      return callback(this[event]);
    } else {
      this.once(event, function(value) {
        _this.stop();
        return callback(value);
      });
      return this.start();
    }
  };

  Asset.prototype.probe = function(chunk) {
    var demuxer,
      _this = this;
    if (!this.active) {
      return;
    }
    demuxer = Demuxer.find(chunk);
    if (!demuxer) {
      return this.emit('error', 'A demuxer for this container was not found.');
    }
    this.demuxer = new demuxer(this.source, chunk);
    this.demuxer.on('format', this.findDecoder);
    this.demuxer.on('duration', function(duration) {
      _this.duration = duration;
      return _this.emit('duration', _this.duration);
    });
    this.demuxer.on('metadata', function(metadata) {
      _this.metadata = metadata;
      return _this.emit('metadata', _this.metadata);
    });
    return this.demuxer.on('error', function(err) {
      _this.emit('error', err);
      return _this.stop();
    });
  };

  Asset.prototype.findDecoder = function(format) {
    var decoder,
      _this = this;
    this.format = format;
    if (!this.active) {
      return;
    }
    this.emit('format', this.format);
    console.log(this.format);
    decoder = Decoder.find(this.format.formatID);
    if (!decoder) {
      return this.emit('error', "A decoder for " + this.format.formatID + " was not found.");
    }
    this.decoder = new decoder(this.demuxer, this.format);
    this.decoder.on('data', function(buffer) {
      return _this.emit('data', buffer);
    });
    this.decoder.on('error', function(err) {
      _this.emit('error', err);
      return _this.stop();
    });
    return this.emit('decodeStart');
  };

  return Asset;

})(EventEmitter);



var Player,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Player = (function(_super) {

  __extends(Player, _super);

  window.Player = Player;

  function Player(asset) {
    var _this = this;
    this.asset = asset;
    this.startPlaying = __bind(this.startPlaying, this);

    this.playing = false;
    this.buffered = 0;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 100;
    this.pan = 0;
    this.metadata = {};
    this.filters = [new VolumeFilter(this, 'volume'), new BalanceFilter(this, 'pan')];
    this.asset.on('buffer', function(buffered) {
      _this.buffered = buffered;
      return _this.emit('buffer', _this.buffered);
    });
    this.asset.on('decodeStart', function() {
      _this.queue = new Queue(_this.asset.decoder);
      return _this.queue.once('ready', _this.startPlaying);
    });
    this.asset.on('format', function(format) {
      _this.format = format;
      return _this.emit('format', _this.format);
    });
    this.asset.on('metadata', function(metadata) {
      _this.metadata = metadata;
      return _this.emit('metadata', _this.metadata);
    });
    this.asset.on('duration', function(duration) {
      _this.duration = duration;
      return _this.emit('duration', _this.duration);
    });
    this.asset.on('error', function(error) {
      return _this.emit('error', error);
    });
  }

  Player.fromURL = function(url) {
    var asset;
    asset = Asset.fromURL(url);
    return new Player(asset);
  };

  Player.fromFile = function(file) {
    var asset;
    asset = Asset.fromFile(file);
    return new Player(asset);
  };

  Player.prototype.preload = function() {
    if (!this.asset) {
      return;
    }
    this.startedPreloading = true;
    return this.asset.start();
  };

  Player.prototype.play = function() {
    var _ref;
    if (this.playing) {
      return;
    }
    if (!this.startedPreloading) {
      this.preload();
    }
    this.playing = true;
    return (_ref = this.device) != null ? _ref.start() : void 0;
  };

  Player.prototype.pause = function() {
    var _ref;
    if (!this.playing) {
      return;
    }
    this.playing = false;
    return (_ref = this.device) != null ? _ref.stop() : void 0;
  };

  Player.prototype.togglePlayback = function() {
    if (this.playing) {
      return this.pause();
    } else {
      return this.play();
    }
  };

  Player.prototype.stop = function() {
    var _ref;
    this.pause();
    this.asset.stop();
    return (_ref = this.device) != null ? _ref.destroy() : void 0;
  };

  Player.prototype.startPlaying = function() {
    var decoder, div, format, frame, frameOffset, _ref,
      _this = this;
    frame = this.queue.read();
    frameOffset = 0;
    _ref = this.asset, format = _ref.format, decoder = _ref.decoder;
    div = decoder.floatingPoint ? 1 : Math.pow(2, format.bitsPerChannel - 1);
    this.device = new AudioDevice(format.sampleRate, format.channelsPerFrame);
    this.device.on('timeUpdate', function(currentTime) {
      _this.currentTime = currentTime;
      return _this.emit('progress', _this.currentTime);
    });
    this.refill = function(buffer) {
      var bufferOffset, filter, i, max, _i, _j, _len, _ref1;
      if (!_this.playing) {
        return;
      }
      bufferOffset = 0;
      while (frame && bufferOffset < buffer.length) {
        max = Math.min(frame.length - frameOffset, buffer.length - bufferOffset);
        for (i = _i = 0; _i < max; i = _i += 1) {
          buffer[bufferOffset++] = frame[frameOffset++] / div;
        }
        if (frameOffset === frame.length) {
          frame = _this.queue.read();
          frameOffset = 0;
        }
      }
      _ref1 = _this.filters;
      for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
        filter = _ref1[_j];
        filter.process(buffer);
      }
      if (!frame) {
        if (decoder.receivedFinalBuffer) {
          _this.currentTime = _this.duration;
          _this.emit('progress', _this.currentTime);
          _this.emit('end');
          _this.pause();
        } else {
          _this.device.stop();
        }
      }
    };
    this.device.on('refill', this.refill);
    if (this.playing) {
      this.device.start();
    }
    return this.emit('ready');
  };

  return Player;

})(EventEmitter);



/*
 * This resampler is from XAudioJS: https://github.com/grantgalitz/XAudioJS
 * Planned to be replaced with src.js, eventually: https://github.com/jussi-kalliokoski/src.js
 */

//JavaScript Audio Resampler (c) 2011 - Grant Galitz
function Resampler(fromSampleRate, toSampleRate, channels, outputBufferSize, noReturn) {
	this.fromSampleRate = fromSampleRate;
	this.toSampleRate = toSampleRate;
	this.channels = channels | 0;
	this.outputBufferSize = outputBufferSize;
	this.noReturn = !!noReturn;
	this.initialize();
}

Resampler.prototype.initialize = function () {
	//Perform some checks:
	if (this.fromSampleRate > 0 && this.toSampleRate > 0 && this.channels > 0) {
		if (this.fromSampleRate == this.toSampleRate) {
			//Setup a resampler bypass:
			this.resampler = this.bypassResampler;		//Resampler just returns what was passed through.
			this.ratioWeight = 1;
		}
		else {
			if (this.fromSampleRate < this.toSampleRate) {
				/*
					Use generic linear interpolation if upsampling,
					as linear interpolation produces a gradient that we want
					and works fine with two input sample points per output in this case.
				*/
				this.compileLinearInterpolationFunction();
				this.lastWeight = 1;
			}
			else {
				/*
					Custom resampler I wrote that doesn't skip samples
					like standard linear interpolation in high downsampling.
					This is more accurate than linear interpolation on downsampling.
				*/
				this.compileMultiTapFunction();
				this.tailExists = false;
				this.lastWeight = 0;
			}
			this.ratioWeight = this.fromSampleRate / this.toSampleRate;
			this.initializeBuffers();
		}
	}
	else {
		throw(new Error("Invalid settings specified for the resampler."));
	}
};

Resampler.prototype.compileLinearInterpolationFunction = function () {
	var toCompile = "var bufferLength = buffer.length;\
	var outLength = this.outputBufferSize;\
	if ((bufferLength % " + this.channels + ") == 0) {\
		if (bufferLength > 0) {\
			var ratioWeight = this.ratioWeight;\
			var weight = this.lastWeight;\
			var firstWeight = 0;\
			var secondWeight = 0;\
			var sourceOffset = 0;\
			var outputOffset = 0;\
			var outputBuffer = this.outputBuffer;\
			for (; weight < 1; weight += ratioWeight) {\
				secondWeight = weight % 1;\
				firstWeight = 1 - secondWeight;";
	for (var channel = 0; channel < this.channels; ++channel) {
		toCompile += "outputBuffer[outputOffset++] = (this.lastOutput[" + channel + "] * firstWeight) + (buffer[" + channel + "] * secondWeight);";
	}
	toCompile += "}\
			weight -= 1;\
			for (bufferLength -= " + this.channels + ", sourceOffset = Math.floor(weight) * " + this.channels + "; outputOffset < outLength && sourceOffset < bufferLength;) {\
				secondWeight = weight % 1;\
				firstWeight = 1 - secondWeight;";
	for (var channel = 0; channel < this.channels; ++channel) {
		toCompile += "outputBuffer[outputOffset++] = (buffer[sourceOffset" + ((channel > 0) ? (" + " + channel) : "") + "] * firstWeight) + (buffer[sourceOffset + " + (this.channels + channel) + "] * secondWeight);";
	}
	toCompile += "weight += ratioWeight;\
				sourceOffset = Math.floor(weight) * " + this.channels + ";\
			}";
	for (var channel = 0; channel < this.channels; ++channel) {
		toCompile += "this.lastOutput[" + channel + "] = buffer[sourceOffset++];";
	}
	toCompile += "this.lastWeight = weight % 1;\
			return this.bufferSlice(outputOffset);\
		}\
		else {\
			return (this.noReturn) ? 0 : [];\
		}\
	}\
	else {\
		throw(new Error(\"Buffer was of incorrect sample length.\"));\
	}";
	this.resampler = Function("buffer", toCompile);
};

Resampler.prototype.compileMultiTapFunction = function () {
	var toCompile = "var bufferLength = buffer.length;\
	var outLength = this.outputBufferSize;\
	if ((bufferLength % " + this.channels + ") == 0) {\
		if (bufferLength > 0) {\
			var ratioWeight = this.ratioWeight;\
			var weight = 0;";
	for (var channel = 0; channel < this.channels; ++channel) {
		toCompile += "var output" + channel + " = 0;"
	}
	toCompile += "var actualPosition = 0;\
			var amountToNext = 0;\
			var alreadyProcessedTail = !this.tailExists;\
			this.tailExists = false;\
			var outputBuffer = this.outputBuffer;\
			var outputOffset = 0;\
			var currentPosition = 0;\
			do {\
				if (alreadyProcessedTail) {\
					weight = ratioWeight;";
	for (channel = 0; channel < this.channels; ++channel) {
		toCompile += "output" + channel + " = 0;"
	}
	toCompile += "}\
				else {\
					weight = this.lastWeight;";
	for (channel = 0; channel < this.channels; ++channel) {
		toCompile += "output" + channel + " = this.lastOutput[" + channel + "];"
	}
	toCompile += "alreadyProcessedTail = true;\
				}\
				while (weight > 0 && actualPosition < bufferLength) {\
					amountToNext = 1 + actualPosition - currentPosition;\
					if (weight >= amountToNext) {";
	for (channel = 0; channel < this.channels; ++channel) {
		toCompile += "output" + channel + " += buffer[actualPosition++] * amountToNext;"
	}
	toCompile += "currentPosition = actualPosition;\
						weight -= amountToNext;\
					}\
					else {";
	for (channel = 0; channel < this.channels; ++channel) {
		toCompile += "output" + channel + " += buffer[actualPosition" + ((channel > 0) ? (" + " + channel) : "") + "] * weight;"
	}
	toCompile += "currentPosition += weight;\
						weight = 0;\
						break;\
					}\
				}\
				if (weight == 0) {";
	for (channel = 0; channel < this.channels; ++channel) {
		toCompile += "outputBuffer[outputOffset++] = output" + channel + " / ratioWeight;"
	}
	toCompile += "}\
				else {\
					this.lastWeight = weight;";
	for (channel = 0; channel < this.channels; ++channel) {
		toCompile += "this.lastOutput[" + channel + "] = output" + channel + ";"
	}
	toCompile += "this.tailExists = true;\
					break;\
				}\
			} while (actualPosition < bufferLength && outputOffset < outLength);\
			return this.bufferSlice(outputOffset);\
		}\
		else {\
			return (this.noReturn) ? 0 : [];\
		}\
	}\
	else {\
		throw(new Error(\"Buffer was of incorrect sample length.\"));\
	}";
	this.resampler = Function("buffer", toCompile);
};

Resampler.prototype.bypassResampler = function (buffer) {
	if (this.noReturn) {
		//Set the buffer passed as our own, as we don't need to resample it:
		this.outputBuffer = buffer;
		return buffer.length;
	}
	else {
		//Just return the buffer passsed:
		return buffer;
	}
};

Resampler.prototype.bufferSlice = function (sliceAmount) {
	if (this.noReturn) {
		//If we're going to access the properties directly from this object:
		return sliceAmount;
	}
	else {
		//Typed array and normal array buffer section referencing:
		try {
			return this.outputBuffer.subarray(0, sliceAmount);
		}
		catch (error) {
			try {
				//Regular array pass:
				this.outputBuffer.length = sliceAmount;
				return this.outputBuffer;
			}
			catch (error) {
				//Nightly Firefox 4 used to have the subarray function named as slice:
				return this.outputBuffer.slice(0, sliceAmount);
			}
		}
	}
};

Resampler.prototype.initializeBuffers = function () {
	//Initialize the internal buffer:
	try {
		this.outputBuffer = new Float32Array(this.outputBufferSize);
		this.lastOutput = new Float32Array(this.channels);
	}
	catch (error) {
		this.outputBuffer = [];
		this.lastOutput = [];
	}
};

var WebKitAudioDevice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

WebKitAudioDevice = (function(_super) {
  var AudioContext, sharedContext;

  __extends(WebKitAudioDevice, _super);

  AudioDevice.register(WebKitAudioDevice);

  AudioContext = window.AudioContext || window.webkitAudioContext;

  WebKitAudioDevice.supported = AudioContext != null;

  sharedContext = null;

  function WebKitAudioDevice(sampleRate, channels) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.refill = __bind(this.refill, this);

    this.context = sharedContext != null ? sharedContext : sharedContext = new AudioContext;
    this.deviceChannels = this.context.destination.numberOfChannels;
    this.deviceSampleRate = this.context.sampleRate;
    this.bufferSize = Math.ceil(4096 / (this.deviceSampleRate / this.sampleRate) * this.channels);
    this.bufferSize += this.bufferSize % this.channels;
    if (this.deviceSampleRate !== this.sampleRate) {
      this.resampler = new Resampler(this.sampleRate, this.deviceSampleRate, this.channels, 4096 * this.channels);
    }
    this.node = this.context.createJavaScriptNode(4096, this.channels, this.channels);
    this.node.onaudioprocess = this.refill;
    this.node.connect(this.context.destination);
  }

  WebKitAudioDevice.prototype.refill = function(event) {
    var channelCount, channels, data, i, n, outputBuffer, _i, _j, _k, _ref;
    outputBuffer = event.outputBuffer;
    channelCount = outputBuffer.numberOfChannels;
    channels = new Array(channelCount);
    for (i = _i = 0; _i < channelCount; i = _i += 1) {
      channels[i] = outputBuffer.getChannelData(i);
    }
    data = new Float32Array(this.bufferSize);
    this.emit('refill', data);
    if (this.resampler) {
      data = this.resampler.resampler(data);
    }
    for (i = _j = 0, _ref = outputBuffer.length; _j < _ref; i = _j += 1) {
      for (n = _k = 0; _k < channelCount; n = _k += 1) {
        channels[n][i] = data[i * channelCount + n];
      }
    }
  };

  WebKitAudioDevice.prototype.destroy = function() {
    return this.node.disconnect(0);
  };

  WebKitAudioDevice.prototype.getDeviceTime = function() {
    return this.context.currentTime * this.deviceSampleRate;
  };

  return WebKitAudioDevice;

})(EventEmitter);



var MozillaAudioDevice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

MozillaAudioDevice = (function(_super) {
  var createTimer, destroyTimer;

  __extends(MozillaAudioDevice, _super);

  AudioDevice.register(MozillaAudioDevice);

  MozillaAudioDevice.supported = 'mozWriteAudio' in new Audio;

  function MozillaAudioDevice(sampleRate, channels) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.refill = __bind(this.refill, this);

    this.audio = new Audio;
    this.audio.mozSetup(this.channels, this.sampleRate);
    this.writePosition = 0;
    this.prebufferSize = this.sampleRate / 2;
    this.tail = null;
    this.timer = createTimer(this.refill, 100);
  }

  MozillaAudioDevice.prototype.refill = function() {
    var available, buffer, currentPosition, written;
    if (this.tail) {
      written = this.audio.mozWriteAudio(this.tail);
      this.writePosition += written;
      if (this.tailPosition < this.tail.length) {
        this.tail = this.tail.subarray(written);
      } else {
        this.tail = null;
      }
    }
    currentPosition = this.audio.mozCurrentSampleOffset();
    available = currentPosition + this.prebufferSize - this.writePosition;
    if (available > 0) {
      buffer = new Float32Array(available);
      this.emit('refill', buffer);
      written = this.audio.mozWriteAudio(buffer);
      if (written < buffer.length) {
        this.tail = buffer.subarray(written);
      }
      this.writePosition += written;
    }
  };

  MozillaAudioDevice.prototype.destroy = function() {
    return destroyTimer(this.timer);
  };

  MozillaAudioDevice.prototype.getDeviceTime = function() {
    return this.audio.mozCurrentSampleOffset() / this.channels;
  };

  createTimer = function(fn, interval) {
    var url, worker;
    url = Buffer.makeBlobURL("setInterval(function() { postMessage('ping'); }, " + interval + ");");
    if (url == null) {
      return setInterval(fn, interval);
    }
    worker = new Worker(url);
    worker.onmessage = fn;
    worker.url = url;
    return worker;
  };

  destroyTimer = function(timer) {
    if (timer.terminate) {
      timer.terminate();
      return URL.revokeObjectURL(timer.url);
    } else {
      return clearInterval(timer);
    }
  };

  return MozillaAudioDevice;

})(EventEmitter);



var HTTPSource,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

HTTPSource = (function(_super) {

  __extends(HTTPSource, _super);

  function HTTPSource(url) {
    this.url = url;
    this.chunkSize = 1 << 20;
    this.inflight = false;
    this.reset();
  }

  HTTPSource.prototype.start = function() {
    var _this = this;
    this.inflight = true;
    this.xhr = new XMLHttpRequest();
    this.xhr.onload = function(event) {
      _this.length = parseInt(_this.xhr.getResponseHeader("Content-Length"));
      _this.inflight = false;
      return _this.loop();
    };
    this.xhr.onerror = function(err) {
      _this.pause();
      return _this.emit('error', err);
    };
    this.xhr.onabort = function(event) {
      console.log("HTTP Aborted: Paused?");
      return _this.inflight = false;
    };
    this.xhr.open("HEAD", this.url, true);
    return this.xhr.send(null);
  };

  HTTPSource.prototype.loop = function() {
    var endPos,
      _this = this;
    if (this.inflight || !this.length) {
      return this.emit('error', 'Something is wrong in HTTPSource.loop');
    }
    if (this.offset === this.length) {
      this.inflight = false;
      this.emit('end');
      return;
    }
    this.inflight = true;
    this.xhr = new XMLHttpRequest();
    this.xhr.onprogress = function(event) {
      return _this.emit('progress', (_this.offset + event.loaded) / _this.length * 100);
    };
    this.xhr.onload = function(event) {
      var buf, buffer, i, txt, _i, _ref;
      if (_this.xhr.response) {
        buf = new Uint8Array(_this.xhr.response);
      } else {
        txt = _this.xhr.responseText;
        buf = new Uint8Array(txt.length);
        for (i = _i = 0, _ref = txt.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          buf[i] = txt.charCodeAt(i) & 0xff;
        }
      }
      buffer = new Buffer(buf);
      _this.offset += buffer.length;
      _this.emit('data', buffer);
      if (_this.offset === _this.length) {
        _this.emit('end');
      }
      _this.emit('progress', _this.offset / _this.length * 100);
      _this.inflight = false;
      return _this.loop();
    };
    this.xhr.onerror = function(err) {
      _this.emit('error', err);
      return _this.pause();
    };
    this.xhr.onabort = function(event) {
      return _this.inflight = false;
    };
    this.xhr.open("GET", this.url, true);
    this.xhr.responseType = "arraybuffer";
    endPos = Math.min(this.offset + this.chunkSize, this.length);
    this.xhr.setRequestHeader("Range", "bytes=" + this.offset + "-" + endPos);
    this.xhr.overrideMimeType('text/plain; charset=x-user-defined');
    return this.xhr.send(null);
  };

  HTTPSource.prototype.pause = function() {
    var _ref;
    this.inflight = false;
    return (_ref = this.xhr) != null ? _ref.abort() : void 0;
  };

  HTTPSource.prototype.reset = function() {
    this.pause();
    return this.offset = 0;
  };

  return HTTPSource;

})(EventEmitter);



var FileSource,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

FileSource = (function(_super) {

  __extends(FileSource, _super);

  function FileSource(file) {
    this.file = file;
    if (!window.FileReader) {
      return this.emit('error', 'This browser does not have FileReader support.');
    }
    this.offset = 0;
    this.length = this.file.size;
    this.chunkSize = 1 << 20;
  }

  FileSource.prototype.start = function() {
    var _this = this;
    this.reader = new FileReader;
    this.reader.onload = function(e) {
      var buf;
      buf = new Buffer(new Uint8Array(e.target.result));
      _this.offset += buf.length;
      _this.emit('data', buf);
      _this.emit('progress', _this.offset / _this.length * 100);
      if (_this.offset < _this.length) {
        return _this.loop();
      }
    };
    this.reader.onloadend = function() {
      if (_this.offset === _this.length) {
        _this.emit('end');
        return _this.reader = null;
      }
    };
    this.reader.onerror = function(e) {
      return _this.emit('error', e);
    };
    this.reader.onprogress = function(e) {
      return _this.emit('progress', (_this.offset + e.loaded) / _this.length * 100);
    };
    return this.loop();
  };

  FileSource.prototype.loop = function() {
    var blob, endPos, slice;
    this.file[slice = 'slice'] || this.file[slice = 'webkitSlice'] || this.file[slice = 'mozSlice'];
    endPos = Math.min(this.offset + this.chunkSize, this.length);
    blob = this.file[slice](this.offset, endPos);
    return this.reader.readAsArrayBuffer(blob);
  };

  FileSource.prototype.pause = function() {
    var _ref;
    return (_ref = this.reader) != null ? _ref.abort() : void 0;
  };

  FileSource.prototype.reset = function() {
    this.pause();
    return this.offset = 0;
  };

  return FileSource;

})(EventEmitter);



var Filter;

Filter = (function() {

  function Filter(context, key) {
    if (context && key) {
      Object.defineProperty(this, 'value', {
        get: function() {
          return context[key];
        }
      });
    }
  }

  Filter.prototype.process = function(buffer) {};

  return Filter;

})();



var VolumeFilter,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

VolumeFilter = (function(_super) {

  __extends(VolumeFilter, _super);

  function VolumeFilter() {
    return VolumeFilter.__super__.constructor.apply(this, arguments);
  }

  VolumeFilter.prototype.process = function(buffer) {
    var i, vol, _i, _ref;
    if (this.value >= 100) {
      return;
    }
    vol = Math.max(0, Math.min(100, this.value)) / 100;
    for (i = _i = 0, _ref = buffer.length; _i < _ref; i = _i += 1) {
      buffer[i] *= vol;
    }
  };

  return VolumeFilter;

})(Filter);



var BalanceFilter,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BalanceFilter = (function(_super) {

  __extends(BalanceFilter, _super);

  function BalanceFilter() {
    return BalanceFilter.__super__.constructor.apply(this, arguments);
  }

  BalanceFilter.prototype.process = function(buffer) {
    var i, pan, _i, _ref;
    if (this.value === 0) {
      return;
    }
    pan = Math.max(-50, Math.min(50, this.value));
    for (i = _i = 0, _ref = buffer.length; _i < _ref; i = _i += 2) {
      buffer[i] *= Math.min(1, (50 - pan) / 50);
      buffer[i + 1] *= Math.min(1, (50 + pan) / 50);
    }
  };

  return BalanceFilter;

})(Filter);



var EarwaxFilter,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

EarwaxFilter = (function(_super) {
  var NUMTAPS, filt;

  __extends(EarwaxFilter, _super);

  filt = new Int8Array([4, -6, 4, -11, -1, -5, 3, 3, -2, 5, -5, 0, 9, 1, 6, 3, -4, -1, -5, -3, -2, -5, -7, 1, 6, -7, 30, -29, 12, -3, -11, 4, -3, 7, -20, 23, 2, 0, 1, -6, -14, -5, 15, -18, 6, 7, 15, -10, -14, 22, -7, -2, -4, 9, 6, -12, 6, -6, 0, -11, 0, -5, 4, 0]);

  NUMTAPS = 64;

  function EarwaxFilter() {
    this.taps = new Float32Array(NUMTAPS * 2);
  }

  EarwaxFilter.prototype.process = function(buffer) {
    var i, len, output, _i, _ref;
    len = buffer.length;
    i = 0;
    while (len--) {
      output = 0;
      for (i = _i = _ref = NUMTAPS - 1; _i > 0; i = _i += -1) {
        this.taps[i] = this.taps[i - 1];
        output += this.taps[i] * filt[i];
      }
      this.taps[0] = buffer[i] / 64;
      output += this.taps[0] * filt[0];
      buffer[i++] = output;
    }
  };

  return EarwaxFilter;

})(Filter);



var CAFDemuxer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

CAFDemuxer = (function(_super) {

  __extends(CAFDemuxer, _super);

  function CAFDemuxer() {
    return CAFDemuxer.__super__.constructor.apply(this, arguments);
  }

  Demuxer.register(CAFDemuxer);

  CAFDemuxer.probe = function(buffer) {
    return buffer.peekString(0, 4) === 'caff';
  };

  CAFDemuxer.prototype.readChunk = function() {
    var buffer, char, entries, flags, i, key, metadata, value, _i;
    if (!this.format && this.stream.available(64)) {
      if (this.stream.readString(4) !== 'caff') {
        return this.emit('error', "Invalid CAF, does not begin with 'caff'");
      }
      this.stream.advance(4);
      if (this.stream.readString(4) !== 'desc') {
        return this.emit('error', "Invalid CAF, 'caff' is not followed by 'desc'");
      }
      if (!(this.stream.readUInt32() === 0 && this.stream.readUInt32() === 32)) {
        return this.emit('error', "Invalid 'desc' size, should be 32");
      }
      this.format = {};
      this.format.sampleRate = this.stream.readFloat64();
      this.format.formatID = this.stream.readString(4);
      flags = this.stream.readUInt32();
      this.format.floatingPoint = Boolean(flags & 1);
      this.format.littleEndian = Boolean(flags & 2);
      this.format.bytesPerPacket = this.stream.readUInt32();
      this.format.framesPerPacket = this.stream.readUInt32();
      this.format.channelsPerFrame = this.stream.readUInt32();
      this.format.bitsPerChannel = this.stream.readUInt32();
      this.emit('format', this.format);
    }
    while (this.stream.available(1)) {
      if (!this.headerCache) {
        this.headerCache = {
          type: this.stream.readString(4),
          oversize: this.stream.readUInt32() !== 0,
          size: this.stream.readUInt32()
        };
        if (this.headerCache.oversize) {
          return this.emit('error', "Holy Shit, an oversized file, not supported in JS");
        }
      }
      switch (this.headerCache.type) {
        case 'kuki':
          if (this.stream.available(this.headerCache.size)) {
            if (this.format.formatID === 'aac ') {
              this.len = this.headerCache.size;
              M4ADemuxer.prototype.readEsds.call(this);
            } else {
              buffer = this.stream.readBuffer(this.headerCache.size);
              this.emit('cookie', buffer);
            }
            this.headerCache = null;
          }
          break;
        case 'pakt':
          if (this.stream.available(this.headerCache.size)) {
            if (this.stream.readUInt32() !== 0) {
              return this.emit('error', 'Sizes greater than 32 bits are not supported.');
            }
            this.numPackets = this.stream.readUInt32();
            if (this.stream.readUInt32() !== 0) {
              return this.emit('error', 'Sizes greater than 32 bits are not supported.');
            }
            this.numFrames = this.stream.readUInt32();
            this.primingFrames = this.stream.readUInt32();
            this.remainderFrames = this.stream.readUInt32();
            this.emit('duration', this.numFrames / this.format.sampleRate * 1000 | 0);
            this.sentDuration = true;
            this.stream.advance(this.headerCache.size - 24);
            this.headerCache = null;
          }
          break;
        case 'info':
          entries = this.stream.readUInt32();
          metadata = {};
          for (i = _i = 0; 0 <= entries ? _i < entries : _i > entries; i = 0 <= entries ? ++_i : --_i) {
            key = '';
            while ((char = this.stream.readUInt8()) !== 0) {
              key += String.fromCharCode(char);
            }
            value = '';
            while ((char = this.stream.readUInt8()) !== 0) {
              value += String.fromCharCode(char);
            }
            metadata[key] = value;
          }
          this.emit('metadata', metadata);
          this.headerCache = null;
          break;
        case 'data':
          if (!this.sentFirstDataChunk) {
            this.stream.advance(4);
            this.headerCache.size -= 4;
            if (this.format.bytesPerPacket !== 0 && !this.sentDuration) {
              this.numFrames = this.headerCache.size / this.format.bytesPerPacket;
              this.emit('duration', this.numFrames / this.format.sampleRate * 1000 | 0);
            }
            this.sentFirstDataChunk = true;
          }
          buffer = this.stream.readSingleBuffer(this.headerCache.size);
          this.headerCache.size -= buffer.length;
          this.emit('data', buffer, this.headerCache.size === 0);
          if (this.headerCache.size <= 0) {
            this.headerCache = null;
          }
          break;
        default:
          if (this.stream.available(this.headerCache.size)) {
            this.stream.advance(this.headerCache.size);
            this.headerCache = null;
          }
      }
    }
  };

  return CAFDemuxer;

})(Demuxer);



var M4ADemuxer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

M4ADemuxer = (function(_super) {
  var genres, metafields, readDescr;

  __extends(M4ADemuxer, _super);

  function M4ADemuxer() {
    return M4ADemuxer.__super__.constructor.apply(this, arguments);
  }

  Demuxer.register(M4ADemuxer);

  M4ADemuxer.probe = function(buffer) {
    return buffer.peekString(8, 4) === 'M4A ';
  };

  metafields = {
    '©alb': 'Album',
    '©arg': 'Arranger',
    '©art': 'Artist',
    '©ART': 'Album Artist',
    'catg': 'Category',
    '©com': 'Composer',
    'covr': 'Cover Art',
    'cpil': 'Compilation',
    '©cpy': 'Copyright',
    'cprt': 'Copyright',
    'desc': 'Description',
    'disk': 'Disk Number',
    '©gen': 'Genre',
    'gnre': 'Genre',
    '©grp': 'Grouping',
    '©isr': 'ISRC Code',
    'keyw': 'Keyword',
    '©lab': 'Record Label',
    '©lyr': 'Lyrics',
    '©nam': 'Title',
    'pcst': 'Podcast',
    'pgap': 'Gapless',
    '©phg': 'Recording Copyright',
    '©prd': 'Producer',
    '©prf': 'Performers',
    'purl': 'Podcast URL',
    'rtng': 'Rating',
    '©swf': 'Songwriter',
    'tmpo': 'Tempo',
    '©too': 'Encoder',
    'trkn': 'Track Number',
    '©wrt': 'Composer'
  };

  genres = ["Blues", "Classic Rock", "Country", "Dance", "Disco", "Funk", "Grunge", "Hip-Hop", "Jazz", "Metal", "New Age", "Oldies", "Other", "Pop", "R&B", "Rap", "Reggae", "Rock", "Techno", "Industrial", "Alternative", "Ska", "Death Metal", "Pranks", "Soundtrack", "Euro-Techno", "Ambient", "Trip-Hop", "Vocal", "Jazz+Funk", "Fusion", "Trance", "Classical", "Instrumental", "Acid", "House", "Game", "Sound Clip", "Gospel", "Noise", "AlternRock", "Bass", "Soul", "Punk", "Space", "Meditative", "Instrumental Pop", "Instrumental Rock", "Ethnic", "Gothic", "Darkwave", "Techno-Industrial", "Electronic", "Pop-Folk", "Eurodance", "Dream", "Southern Rock", "Comedy", "Cult", "Gangsta", "Top 40", "Christian Rap", "Pop/Funk", "Jungle", "Native American", "Cabaret", "New Wave", "Psychadelic", "Rave", "Showtunes", "Trailer", "Lo-Fi", "Tribal", "Acid Punk", "Acid Jazz", "Polka", "Retro", "Musical", "Rock & Roll", "Hard Rock", "Folk", "Folk/Rock", "National Folk", "Swing", "Fast Fusion", "Bebob", "Latin", "Revival", "Celtic", "Bluegrass", "Avantgarde", "Gothic Rock", "Progressive Rock", "Psychedelic Rock", "Symphonic Rock", "Slow Rock", "Big Band", "Chorus", "Easy Listening", "Acoustic", "Humour", "Speech", "Chanson", "Opera", "Chamber Music", "Sonata", "Symphony", "Booty Bass", "Primus", "Porn Groove", "Satire", "Slow Jam", "Club", "Tango", "Samba", "Folklore", "Ballad", "Power Ballad", "Rhythmic Soul", "Freestyle", "Duet", "Punk Rock", "Drum Solo", "A Capella", "Euro-House", "Dance Hall"];

  M4ADemuxer.prototype.readChunk = function() {
    var buffer, diff, duration, entryCount, field, i, numEntries, pos, rating, sampleRate, _i, _ref;
    while (this.stream.available(1)) {
      if (!this.readHeaders && this.stream.available(8)) {
        this.len = this.stream.readUInt32() - 8;
        this.type = this.stream.readString(4);
        if (this.len === 0) {
          continue;
        }
        this.readHeaders = true;
      }
      if (this.type in metafields) {
        this.metafield = this.type;
        this.readHeaders = false;
        continue;
      }
      switch (this.type) {
        case 'ftyp':
          if (!this.stream.available(this.len)) {
            return;
          }
          if (this.stream.readString(4) !== 'M4A ') {
            return this.emit('error', 'Not a valid M4A file.');
          }
          this.stream.advance(this.len - 4);
          break;
        case 'moov':
        case 'trak':
        case 'mdia':
        case 'minf':
        case 'stbl':
        case 'udta':
        case 'ilst':
          break;
        case 'stco':
          this.stream.advance(4);
          entryCount = this.stream.readUInt32();
          this.chunkOffsets = [];
          for (i = _i = 0; 0 <= entryCount ? _i < entryCount : _i > entryCount; i = 0 <= entryCount ? ++_i : --_i) {
            this.chunkOffsets[i] = this.stream.readUInt32();
          }
          break;
        case 'meta':
          this.metadata = {};
          this.metaMaxPos = this.stream.offset + this.len;
          this.stream.advance(4);
          break;
        case 'data':
          if (!this.stream.available(this.len)) {
            return;
          }
          field = metafields[this.metafield];
          switch (this.metafield) {
            case 'disk':
            case 'trkn':
              pos = this.stream.offset;
              this.stream.advance(10);
              this.metadata[field] = this.stream.readUInt16() + ' of ' + this.stream.readUInt16();
              this.stream.advance(this.len - (this.stream.offset - pos));
              break;
            case 'cpil':
            case 'pgap':
            case 'pcst':
              this.stream.advance(8);
              this.metadata[field] = this.stream.readUInt8() === 1;
              break;
            case 'gnre':
              this.stream.advance(8);
              this.metadata[field] = genres[this.stream.readUInt16() - 1];
              break;
            case 'rtng':
              this.stream.advance(8);
              rating = this.stream.readUInt8();
              this.metadata[field] = rating === 2 ? 'Clean' : rating !== 0 ? 'Explicit' : 'None';
              break;
            case 'tmpo':
              this.stream.advance(8);
              this.metadata[field] = this.stream.readUInt16();
              break;
            case 'covr':
              this.stream.advance(8);
              this.metadata[field] = this.stream.readBuffer(this.len - 8);
              break;
            default:
              this.metadata[field] = this.stream.readUTF8(this.len);
          }
          break;
        case 'mdhd':
          if (!this.stream.available(this.len)) {
            return;
          }
          this.stream.advance(4);
          this.stream.advance(8);
          sampleRate = this.stream.readUInt32();
          duration = this.stream.readUInt32();
          this.emit('duration', duration / sampleRate * 1000 | 0);
          this.stream.advance(4);
          break;
        case 'stsd':
          if (!this.stream.available(this.len)) {
            return;
          }
          this.stream.advance(4);
          numEntries = this.stream.readUInt32();
          if (numEntries !== 1) {
            return this.emit('error', "Only expecting one entry in sample description atom!");
          }
          this.stream.advance(4);
          this.format = {};
          this.format.formatID = this.stream.readString(4);
          this.stream.advance(6);
          if (this.stream.readUInt16() !== 1) {
            return this.emit('error', 'Unknown version in stsd atom.');
          }
          this.stream.advance(6);
          this.stream.advance(2);
          this.format.channelsPerFrame = this.stream.readUInt16();
          this.format.bitsPerChannel = this.stream.readUInt16();
          this.stream.advance(4);
          this.format.sampleRate = this.stream.readUInt16();
          this.stream.advance(2);
          this.emit('format', this.format);
          break;
        case 'alac':
          this.stream.advance(4);
          this.emit('cookie', this.stream.readBuffer(this.len - 4));
          this.sentCookie = true;
          if (this.dataSections) {
            this.sendDataSections();
          }
          break;
        case 'esds':
          this.readEsds();
          this.sentCookie = true;
          if (this.dataSections) {
            this.sendDataSections();
          }
          break;
        case 'mdat':
          if (this.chunkOffsets && this.stream.offset < this.chunkOffsets[0]) {
            diff = this.chunkOffsets[0] - this.stream.offset;
            this.stream.advance(diff);
            this.len -= diff;
          }
          buffer = this.stream.readSingleBuffer(this.len);
          this.len -= buffer.length;
          this.readHeaders = this.len > 0;
          if (this.sentCookie) {
            this.emit('data', buffer, this.len === 0);
          } else {
            if ((_ref = this.dataSections) == null) {
              this.dataSections = [];
            }
            this.dataSections.push(buffer);
          }
          break;
        default:
          if (!this.stream.available(this.len)) {
            return;
          }
          this.stream.advance(this.len);
      }
      if (this.stream.offset === this.metaMaxPos) {
        this.emit('metadata', this.metadata);
      }
      if (this.type !== 'mdat') {
        this.readHeaders = false;
      }
    }
  };

  M4ADemuxer.prototype.sendDataSections = function() {
    var interval,
      _this = this;
    return interval = setInterval(function() {
      _this.emit('data', _this.dataSections.shift(), _this.dataSections.length === 0);
      if (_this.dataSections.length === 0) {
        return clearInterval(interval);
      }
    }, 100);
  };

  M4ADemuxer.readDescrLen = function(stream) {
    var c, count, len;
    len = 0;
    count = 4;
    while (count--) {
      c = stream.readUInt8();
      len = (len << 7) | (c & 0x7f);
      if (!(c & 0x80)) {
        break;
      }
    }
    return len;
  };

  readDescr = function(stream) {
    var tag;
    tag = stream.readUInt8();
    return [tag, M4ADemuxer.readDescrLen(stream)];
  };

  M4ADemuxer.prototype.readEsds = function() {
    var codec_id, extra, flags, len, startPos, tag, _ref, _ref1, _ref2;
    startPos = this.stream.offset;
    this.stream.advance(4);
    _ref = readDescr(this.stream), tag = _ref[0], len = _ref[1];
    if (tag === 0x03) {
      this.stream.advance(2);
      flags = this.stream.readUInt8();
      if (flags & 0x80) {
        this.stream.advance(2);
      }
      if (flags & 0x40) {
        this.stream.advance(this.stream.readUInt8());
      }
      if (flags & 0x20) {
        this.stream.advance(2);
      }
    } else {
      this.stream.advance(2);
    }
    _ref1 = readDescr(this.stream), tag = _ref1[0], len = _ref1[1];
    if (tag === 0x04) {
      codec_id = this.stream.readUInt8();
      this.stream.advance(1);
      this.stream.advance(3);
      this.stream.advance(4);
      this.stream.advance(4);
      _ref2 = readDescr(this.stream), tag = _ref2[0], len = _ref2[1];
      if (tag === 0x05) {
        this.emit('cookie', this.stream.readBuffer(len));
      }
    }
    extra = this.len - this.stream.offset + startPos;
    return this.stream.advance(extra);
  };

  return M4ADemuxer;

})(Demuxer);



var AIFFDemuxer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AIFFDemuxer = (function(_super) {

  __extends(AIFFDemuxer, _super);

  function AIFFDemuxer() {
    return AIFFDemuxer.__super__.constructor.apply(this, arguments);
  }

  Demuxer.register(AIFFDemuxer);

  AIFFDemuxer.probe = function(buffer) {
    var _ref;
    return buffer.peekString(0, 4) === 'FORM' && ((_ref = buffer.peekString(8, 4)) === 'AIFF' || _ref === 'AIFC');
  };

  AIFFDemuxer.prototype.readChunk = function() {
    var buffer, format, offset, _ref;
    if (!this.readStart && this.stream.available(12)) {
      if (this.stream.readString(4) !== 'FORM') {
        return this.emit('error', 'Invalid AIFF.');
      }
      this.fileSize = this.stream.readUInt32();
      this.fileType = this.stream.readString(4);
      this.readStart = true;
      if ((_ref = this.fileType) !== 'AIFF' && _ref !== 'AIFC') {
        return this.emit('error', 'Invalid AIFF.');
      }
    }
    while (this.stream.available(1)) {
      if (!this.readHeaders && this.stream.available(8)) {
        this.type = this.stream.readString(4);
        this.len = this.stream.readUInt32();
      }
      switch (this.type) {
        case 'COMM':
          if (!this.stream.available(this.len)) {
            return;
          }
          this.format = {
            formatID: 'lpcm',
            channelsPerFrame: this.stream.readUInt16(),
            sampleCount: this.stream.readUInt32(),
            bitsPerChannel: this.stream.readUInt16(),
            sampleRate: this.stream.readFloat80()
          };
          if (this.fileType === 'AIFC') {
            format = this.stream.readString(4);
            if (format === 'twos' || format === 'sowt' || format === 'fl32' || format === 'fl64' || format === 'NONE') {
              format = 'lpcm';
            }
            this.format.formatID = format;
            this.format.littleEndian = format === 'sowt';
            this.format.floatingPoint = format === 'fl32' || format === 'fl64';
            this.len -= 4;
          }
          this.stream.advance(this.len - 18);
          this.emit('format', this.format);
          this.emit('duration', this.format.sampleCount / this.format.sampleRate * 1000 | 0);
          break;
        case 'SSND':
          if (!(this.readSSNDHeader && this.stream.available(4))) {
            offset = this.stream.readUInt32();
            this.stream.advance(4);
            this.stream.advance(offset);
            this.readSSNDHeader = true;
          }
          buffer = this.stream.readSingleBuffer(this.len);
          this.len -= buffer.length;
          this.readHeaders = this.len > 0;
          this.emit('data', buffer, this.len === 0);
          break;
        default:
          if (!this.stream.available(this.len)) {
            return;
          }
          this.stream.advance(this.len);
      }
      if (this.type !== 'SSND') {
        this.readHeaders = false;
      }
    }
  };

  return AIFFDemuxer;

})(Demuxer);



var WAVEDemuxer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

WAVEDemuxer = (function(_super) {
  var formats;

  __extends(WAVEDemuxer, _super);

  function WAVEDemuxer() {
    return WAVEDemuxer.__super__.constructor.apply(this, arguments);
  }

  Demuxer.register(WAVEDemuxer);

  WAVEDemuxer.probe = function(buffer) {
    return buffer.peekString(0, 4) === 'RIFF' && buffer.peekString(8, 4) === 'WAVE';
  };

  formats = {
    0x0001: 'lpcm',
    0x0003: 'lpcm',
    0x0006: 'alaw',
    0x0007: 'ulaw'
  };

  WAVEDemuxer.prototype.readChunk = function() {
    var buffer, bytes, encoding;
    if (!this.readStart && this.stream.available(12)) {
      if (this.stream.readString(4) !== 'RIFF') {
        return this.emit('error', 'Invalid WAV file.');
      }
      this.fileSize = this.stream.readUInt32(true);
      this.readStart = true;
      if (this.stream.readString(4) !== 'WAVE') {
        return this.emit('error', 'Invalid WAV file.');
      }
    }
    while (this.stream.available(1)) {
      if (!this.readHeaders && this.stream.available(8)) {
        this.type = this.stream.readString(4);
        this.len = this.stream.readUInt32(true);
      }
      switch (this.type) {
        case 'fmt ':
          encoding = this.stream.readUInt16(true);
          if (!(encoding in formats)) {
            return this.emit('error', 'Unsupported format in WAV file.');
          }
          this.format = {
            formatID: formats[encoding],
            floatingPoint: encoding === 0x0003,
            littleEndian: formats[encoding] === 'lpcm',
            channelsPerFrame: this.stream.readUInt16(true),
            sampleRate: this.stream.readUInt32(true)
          };
          this.stream.advance(4);
          this.stream.advance(2);
          this.format.bitsPerChannel = this.bitsPerChannel = this.stream.readUInt16(true);
          this.emit('format', this.format);
          break;
        case 'data':
          if (!this.sentDuration) {
            bytes = this.bitsPerChannel / 8;
            this.emit('duration', this.len / bytes / this.format.channelsPerFrame / this.format.sampleRate * 1000 | 0);
            this.sentDuration = true;
          }
          buffer = this.stream.readSingleBuffer(this.len);
          this.len -= buffer.length;
          this.readHeaders = this.len > 0;
          this.emit('data', buffer, this.len === 0);
          break;
        default:
          if (!this.stream.available(this.len)) {
            return;
          }
          this.stream.advance(this.len);
      }
      if (this.type !== 'data') {
        this.readHeaders = false;
      }
    }
  };

  return WAVEDemuxer;

})(Demuxer);



var AUDemuxer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AUDemuxer = (function(_super) {
  var bps, formats;

  __extends(AUDemuxer, _super);

  function AUDemuxer() {
    return AUDemuxer.__super__.constructor.apply(this, arguments);
  }

  Demuxer.register(AUDemuxer);

  AUDemuxer.probe = function(buffer) {
    return buffer.peekString(0, 4) === '.snd';
  };

  bps = [8, 8, 16, 24, 32, 32, 64];

  bps[26] = 8;

  formats = {
    1: 'ulaw',
    27: 'alaw'
  };

  AUDemuxer.prototype.readChunk = function() {
    var buf, bytes, dataSize, encoding, size, _results;
    if (!this.readHeader && this.stream.available(24)) {
      if (this.stream.readString(4) !== '.snd') {
        return this.emit('error', 'Invalid AU file.');
      }
      size = this.stream.readUInt32();
      dataSize = this.stream.readUInt32();
      encoding = this.stream.readUInt32();
      this.format = {
        formatID: formats[encoding] || 'lpcm',
        floatingPoint: encoding === 6 || encoding === 7,
        bitsPerChannel: bps[encoding - 1],
        sampleRate: this.stream.readUInt32(),
        channelsPerFrame: this.stream.readUInt32()
      };
      if (!(this.format.bitsPerChannel != null)) {
        return this.emit('error', 'Unsupported encoding in AU file.');
      }
      if (dataSize !== 0xffffffff) {
        bytes = this.format.bitsPerChannel / 8;
        this.emit('duration', dataSize / bytes / this.format.channelsPerFrame / this.format.sampleRate * 1000 | 0);
      }
      this.emit('format', this.format);
      this.readHeader = true;
    }
    if (this.readHeader) {
      _results = [];
      while (this.stream.available(1)) {
        buf = this.stream.readSingleBuffer(this.stream.remainingBytes());
        _results.push(this.emit('data', buf, this.stream.remainingBytes() === 0));
      }
      return _results;
    }
  };

  return AUDemuxer;

})(Demuxer);



var LPCMDecoder,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

LPCMDecoder = (function(_super) {

  __extends(LPCMDecoder, _super);

  function LPCMDecoder() {
    this.readChunk = __bind(this.readChunk, this);
    return LPCMDecoder.__super__.constructor.apply(this, arguments);
  }

  Decoder.register('lpcm', LPCMDecoder);

  LPCMDecoder.prototype.init = function() {
    return this.floatingPoint = this.format.floatingPoint;
  };

  LPCMDecoder.prototype.readChunk = function() {
    var chunkSize, i, littleEndian, output, samples, stream, _i, _j, _k, _l, _m, _n;
    stream = this.stream;
    littleEndian = this.format.littleEndian;
    chunkSize = Math.min(4096, stream.remainingBytes());
    samples = chunkSize / (this.format.bitsPerChannel / 8) >> 0;
    if (chunkSize === 0) {
      return this.once('available', this.readChunk);
    }
    if (this.format.floatingPoint) {
      switch (this.format.bitsPerChannel) {
        case 32:
          output = new Float32Array(samples);
          for (i = _i = 0; _i < samples; i = _i += 1) {
            output[i] = stream.readFloat32(littleEndian);
          }
          break;
        case 64:
          output = new Float64Array(samples);
          for (i = _j = 0; _j < samples; i = _j += 1) {
            output[i] = stream.readFloat64(littleEndian);
          }
          break;
        default:
          return this.emit('error', 'Unsupported bit depth.');
      }
    } else {
      switch (this.format.bitsPerChannel) {
        case 8:
          output = new Int8Array(samples);
          for (i = _k = 0; _k < samples; i = _k += 1) {
            output[i] = stream.readInt8();
          }
          break;
        case 16:
          output = new Int16Array(samples);
          for (i = _l = 0; _l < samples; i = _l += 1) {
            output[i] = stream.readInt16(littleEndian);
          }
          break;
        case 24:
          output = new Int32Array(samples);
          for (i = _m = 0; _m < samples; i = _m += 1) {
            output[i] = stream.readInt24(littleEndian);
          }
          break;
        case 32:
          output = new Int32Array(samples);
          for (i = _n = 0; _n < samples; i = _n += 1) {
            output[i] = stream.readInt32(littleEndian);
          }
          break;
        default:
          return this.emit('error', 'Unsupported bit depth.');
      }
    }
    return this.emit('data', output);
  };

  return LPCMDecoder;

})(Decoder);



var XLAWDecoder,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

XLAWDecoder = (function(_super) {
  var BIAS, QUANT_MASK, SEG_MASK, SEG_SHIFT, SIGN_BIT;

  __extends(XLAWDecoder, _super);

  Decoder.register('ulaw', XLAWDecoder);

  Decoder.register('alaw', XLAWDecoder);

  SIGN_BIT = 0x80;

  QUANT_MASK = 0xf;

  SEG_SHIFT = 4;

  SEG_MASK = 0x70;

  BIAS = 0x84;

  function XLAWDecoder() {
    this.readChunk = __bind(this.readChunk, this);

    var i, seg, t, table, val, _i, _j;
    XLAWDecoder.__super__.constructor.apply(this, arguments);
    this.format.bitsPerChannel = 16;
    this.table = table = new Float32Array(256);
    if (this.format.formatID === 'ulaw') {
      for (i = _i = 0; _i < 256; i = ++_i) {
        val = ~i;
        t = ((val & QUANT_MASK) << 3) + BIAS;
        t <<= (val & SEG_MASK) >>> SEG_SHIFT;
        table[i] = val & SIGN_BIT ? BIAS - t : t - BIAS;
      }
    } else {
      for (i = _j = 0; _j < 256; i = ++_j) {
        val = i ^ 0x55;
        t = val & QUANT_MASK;
        seg = (val & SEG_MASK) >>> SEG_SHIFT;
        if (seg) {
          t = (t + t + 1 + 32) << (seg + 2);
        } else {
          t = (t + t + 1) << 3;
        }
        table[i] = val & SIGN_BIT ? t : -t;
      }
    }
    return;
  }

  XLAWDecoder.prototype.readChunk = function() {
    var chunkSize, i, output, samples, stream, table, _i;
    stream = this.stream, table = this.table;
    chunkSize = Math.min(4096, this.stream.remainingBytes());
    samples = chunkSize / (this.format.bitsPerChannel / 8) >> 0;
    if (chunkSize === 0) {
      return this.once('available', this.readChunk);
    }
    output = new Int16Array(samples);
    for (i = _i = 0; _i < samples; i = _i += 1) {
      output[i] = table[stream.readUInt8()];
    }
    return this.emit('data', output);
  };

  return XLAWDecoder;

})(Decoder);



