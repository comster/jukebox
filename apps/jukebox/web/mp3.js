(function() {
    const LATIN1 = 0, UTF16BOM = 1, UTF16BE = 2, UTF8 = 3;
    var ID3Stream = Base.extend({
        constructor: function(header, stream) {
            this.header = header;
            this.stream = stream;
            this.offset = 0;
        },
        read: function() {
            if (!this.data) {
                this.data = {};
                var frame;
                while (frame = this.readFrame()) {
                    if (frame.key in this.data) {
                        if (!Array.isArray(this.data[frame.key])) this.data[frame.key] = [ this.data[frame.key] ];
                        this.data[frame.key].push(frame.value);
                    } else {
                        this.data[frame.key] = frame.value;
                    }
                }
            }
            return this.data;
        },
        readFrame: function() {
            if (this.offset >= this.header.length) return null;
            var header = this.readHeader();
            var decoder = header.identifier;
            if (header.identifier.charCodeAt(0) === 0) {
                this.offset += this.header.length + 1;
                return null;
            }
            if (!this.frameTypes[decoder]) {
                for (var key in this.map) {
                    if (this.map[key].indexOf(decoder) !== -1) {
                        decoder = key;
                        break;
                    }
                }
            }
            if (this.frameTypes[decoder]) {
                var frame = this.decodeFrame(header, this.frameTypes[decoder]), keys = Object.keys(frame);
                if (keys.length === 1) frame = frame[keys[0]];
                var result = {
                    value: frame
                };
            } else {
                var result = {
                    value: this.stream.readBuffer(Math.min(header.length, this.header.length - this.offset))
                };
            }
            result.key = this.names[header.identifier] ? this.names[header.identifier] : header.identifier;
            this.offset += 10 + header.length;
            return result;
        },
        readString: function(encoding, length) {
            var stream = this.stream;
            var littleEndian = false;
            var result = "";
            if (length == null) length = Infinity;
            var end = length + stream.offset;
            switch (encoding) {
              case LATIN1:
                var c;
                while (stream.offset < end && (c = stream.readUInt8())) result += String.fromCharCode(c);
                return result;
              case UTF16BOM:
                var bom;
                if (length < 2 || (bom = stream.readUInt16()) === 0) return result;
                littleEndian = bom === 65534;
              case UTF16BE:
                var w1, w2;
                while (stream.offset < end && (w1 = stream.readUInt16(littleEndian))) {
                    if (w1 < 55296 || w1 > 57343) {
                        result += String.fromCharCode(w1);
                    } else {
                        if (w1 > 56319 || !stream.available(2)) throw new Error("Invalid UTF16 sequence.");
                        w2 = stream.readUInt16(littleEndian);
                        if (w2 < 56320 || w2 > 57343) throw new Error("Invalid UTF16 sequence.");
                        result += String.fromCharCode(w1, w2);
                    }
                }
                return result;
              case UTF8:
                var b1, b2, b3;
                while (stream.offset < end && (b1 = stream.readUInt8())) {
                    if (b1 < 128) {
                        result += String.fromCharCode(b1);
                    } else if (b1 > 191 && b1 < 224) {
                        b2 = stream.readUInt8();
                        result += String.fromCharCode((b1 & 31) << 6 | b2 & 63);
                    } else {
                        b2 = stream.readUInt8();
                        b3 = stream.readUInt8();
                        result += String.fromCharCode((b1 & 15) << 12 | (b2 & 63) << 6 | b3 & 63);
                    }
                }
                return result;
              default:
                throw new Error("Unknown encoding");
            }
        },
        decodeFrame: function(header, fields) {
            var stream = this.stream, start = stream.offset;
            var encoding = LATIN1, ret = {};
            var len = Object.keys(fields).length, i = 0;
            for (var key in fields) {
                var type = fields[key];
                var rest = header.length - (stream.offset - start);
                i++;
                switch (key) {
                  case "encoding":
                    encoding = stream.readUInt8();
                    continue;
                  case "language":
                    ret.language = stream.readString(3);
                    continue;
                }
                switch (type) {
                  case "latin1":
                    ret[key] = this.readString(LATIN1, i === len ? rest : null);
                    break;
                  case "string":
                    ret[key] = this.readString(encoding, i === len ? rest : null);
                    break;
                  case "binary":
                    ret[key] = stream.readBuffer(rest);
                    break;
                  case "int16":
                    ret[key] = stream.readInt16();
                    break;
                  case "int8":
                    ret[key] = stream.readInt8();
                    break;
                  case "int24":
                    ret[key] = stream.readInt24();
                    break;
                  case "int32":
                    ret[key] = stream.readInt32();
                    break;
                  case "int32+":
                    ret[key] = stream.readInt32();
                    if (rest > 4) throw new Error("Seriously dude? Stop playing this song and get a life!");
                    break;
                  case "date":
                    var val = stream.readString(8);
                    ret[key] = new Date(val.slice(0, 4), val.slice(4, 6) - 1, val.slice(6, 8));
                    break;
                  case "frame_id":
                    ret[key] = stream.readString(4);
                    break;
                  default:
                    throw new Error("Unknown key type " + type);
                }
            }
            var rest = header.length - (stream.offset - start);
            if (rest > 0) stream.advance(rest);
            return ret;
        }
    });
    var ID3v23Stream = ID3Stream.extend({
        readHeader: function() {
            var identifier = this.stream.readString(4);
            var length = 0;
            if (this.header.major === 4) {
                for (var i = 0; i < 4; i++) length = (length << 7) + (this.stream.readUInt8() & 127);
            } else {
                length = this.stream.readUInt32();
            }
            return {
                identifier: identifier,
                length: length,
                flags: this.stream.readUInt16()
            };
        },
        map: {
            text: [ "TIT1", "TIT2", "TIT3", "TALB", "TOAL", "TRCK", "TPOS", "TSST", "TSRC", "TPE1", "TPE2", "TPE3", "TPE4", "TOPE", "TEXT", "TOLY", "TCOM", "TMCL", "TIPL", "TENC", "TBPM", "TLEN", "TKEY", "TLAN", "TCON", "TFLT", "TMED", "TMOO", "TCOP", "TPRO", "TPUB", "TOWN", "TRSN", "TRSO", "TOFN", "TDLY", "TDEN", "TDOR", "TDRC", "TDRL", "TDTG", "TSSE", "TSOA", "TSOP", "TSOT", "TDAT", "TIME", "TORY", "TRDA", "TSIZ", "TYER", "TCMP", "TSO2", "TSOC" ],
            url: [ "WCOM", "WCOP", "WOAF", "WOAR", "WOAS", "WORS", "WPAY", "WPUB" ]
        },
        frameTypes: {
            text: {
                encoding: 1,
                value: "string"
            },
            url: {
                value: "latin1"
            },
            TXXX: {
                encoding: 1,
                description: "string",
                value: "string"
            },
            WXXX: {
                encoding: 1,
                description: "string",
                value: "latin1"
            },
            USLT: {
                encoding: 1,
                language: 1,
                description: "string",
                value: "string"
            },
            COMM: {
                encoding: 1,
                language: 1,
                description: "string",
                value: "string"
            },
            APIC: {
                encoding: 1,
                mime: "latin1",
                type: "int8",
                description: "string",
                data: "binary"
            },
            UFID: {
                owner: "latin1",
                identifier: "binary"
            },
            MCDI: {
                value: "binary"
            },
            PRIV: {
                owner: "latin1",
                value: "binary"
            },
            GEOB: {
                encoding: 1,
                mime: "latin1",
                filename: "string",
                description: "string",
                data: "binary"
            },
            PCNT: {
                value: "int32+"
            },
            POPM: {
                email: "latin1",
                rating: "int8",
                counter: "int32+"
            },
            AENC: {
                owner: "latin1",
                previewStart: "int16",
                previewLength: "int16",
                encryptionInfo: "binary"
            },
            ETCO: {
                format: "int8",
                data: "binary"
            },
            MLLT: {
                framesBetweenReference: "int16",
                bytesBetweenReference: "int24",
                millisecondsBetweenReference: "int24",
                bitsForBytesDeviation: "int8",
                bitsForMillisecondsDev: "int8",
                data: "binary"
            },
            SYTC: {
                format: "int8",
                tempoData: "binary"
            },
            SYLT: {
                encoding: 1,
                language: 1,
                format: "int8",
                contentType: "int8",
                description: "string",
                data: "binary"
            },
            RVA2: {
                identification: "latin1",
                data: "binary"
            },
            EQU2: {
                interpolationMethod: "int8",
                identification: "latin1",
                data: "binary"
            },
            RVRB: {
                left: "int16",
                right: "int16",
                bouncesLeft: "int8",
                bouncesRight: "int8",
                feedbackLL: "int8",
                feedbackLR: "int8",
                feedbackRR: "int8",
                feedbackRL: "int8",
                premixLR: "int8",
                premixRL: "int8"
            },
            RBUF: {
                size: "int24",
                flag: "int8",
                offset: "int32"
            },
            LINK: {
                identifier: "frame_id",
                url: "latin1",
                data: "binary"
            },
            POSS: {
                format: "int8",
                position: "binary"
            },
            USER: {
                encoding: 1,
                language: 1,
                value: "string"
            },
            OWNE: {
                encoding: 1,
                price: "latin1",
                purchaseDate: "date",
                seller: "string"
            },
            COMR: {
                encoding: 1,
                price: "latin1",
                validUntil: "date",
                contactURL: "latin1",
                receivedAs: "int8",
                seller: "string",
                description: "string",
                logoMime: "latin1",
                logo: "binary"
            },
            ENCR: {
                owner: "latin1",
                methodSymbol: "int8",
                data: "binary"
            },
            GRID: {
                owner: "latin1",
                groupSymbol: "int8",
                data: "binary"
            },
            SIGN: {
                groupSymbol: "int8",
                signature: "binary"
            },
            SEEK: {
                value: "int32"
            },
            ASPI: {
                dataStart: "int32",
                dataLength: "int32",
                numPoints: "int16",
                bitsPerPoint: "int8",
                data: "binary"
            },
            IPLS: {
                encoding: 1,
                value: "string"
            },
            RVAD: {
                adjustment: "int8",
                bits: "int8",
                data: "binary"
            },
            EQUA: {
                adjustmentBits: "int8",
                data: "binary"
            }
        },
        names: {
            TIT1: "grouping",
            TIT2: "title",
            TIT3: "subtitle",
            TALB: "album",
            TOAL: "originalAlbumTitle",
            TRCK: "trackNumber",
            TPOS: "diskNumber",
            TSST: "setSubtitle",
            TSRC: "ISRC",
            TPE1: "artist",
            TPE2: "albumArtist",
            TPE3: "conductor",
            TPE4: "modifiedBy",
            TOPE: "originalArtist",
            TEXT: "lyricist",
            TOLY: "originalLyricist",
            TCOM: "composer",
            TMCL: "musicianCreditsList",
            TIPL: "involvedPeopleList",
            TENC: "encodedBy",
            TBPM: "tempo",
            TLEN: "length",
            TKEY: "initialKey",
            TLAN: "language",
            TCON: "genre",
            TFLT: "fileType",
            TMED: "mediaType",
            TMOO: "mood",
            TCOP: "copyright",
            TPRO: "producedNotice",
            TPUB: "publisher",
            TOWN: "fileOwner",
            TRSN: "internetRadioStationName",
            TRSO: "internetRadioStationOwner",
            TOFN: "originalFilename",
            TDLY: "playlistDelay",
            TDEN: "encodingTime",
            TDOR: "originalReleaseTime",
            TDRC: "recordingTime",
            TDRL: "releaseTime",
            TDTG: "taggingTime",
            TSSE: "encodedWith",
            TSOA: "albumSortOrder",
            TSOP: "performerSortOrder",
            TSOT: "titleSortOrder",
            TXXX: "userText",
            USLT: "lyrics",
            APIC: "coverArt",
            UFID: "uniqueIdentifier",
            MCDI: "CDIdentifier",
            COMM: "comments",
            WCOM: "commercialInformation",
            WCOP: "copyrightInformation",
            WOAF: "officialAudioFileWebpage",
            WOAR: "officialArtistWebpage",
            WOAS: "officialAudioSourceWebpage",
            WORS: "officialInternetRadioStationHomepage",
            WPAY: "payment",
            WPUB: "officialPublisherWebpage",
            WXXX: "url",
            PRIV: "private",
            GEOB: "generalEncapsulatedObject",
            PCNT: "playCount",
            POPM: "rating",
            AENC: "audioEncryption",
            ETCO: "eventTimingCodes",
            MLLT: "MPEGLocationLookupTable",
            SYTC: "synchronisedTempoCodes",
            SYLT: "synchronisedLyrics",
            RVA2: "volumeAdjustment",
            EQU2: "equalization",
            RVRB: "reverb",
            RBUF: "recommendedBufferSize",
            LINK: "link",
            POSS: "positionSynchronisation",
            USER: "termsOfUse",
            OWNE: "ownership",
            COMR: "commercial",
            ENCR: "encryption",
            GRID: "groupIdentifier",
            SIGN: "signature",
            SEEK: "seek",
            ASPI: "audioSeekPointIndex",
            TDAT: "date",
            TIME: "time",
            TORY: "originalReleaseYear",
            TRDA: "recordingDates",
            TSIZ: "size",
            TYER: "year",
            IPLS: "involvedPeopleList",
            RVAD: "volumeAdjustment",
            EQUA: "equalization",
            TCMP: "compilation",
            TSO2: "albumArtistSortOrder",
            TSOC: "composerSortOrder"
        }
    });
    var ID3v22Stream = ID3v23Stream.extend({
        readHeader: function() {
            var id = this.stream.readString(3);
            if (this.frameReplacements[id] && !this.frameTypes[id]) this.frameTypes[id] = this.frameReplacements[id];
            return {
                identifier: this.replacements[id] || id,
                length: this.stream.readUInt24()
            };
        },
        replacements: {
            UFI: "UFID",
            TT1: "TIT1",
            TT2: "TIT2",
            TT3: "TIT3",
            TP1: "TPE1",
            TP2: "TPE2",
            TP3: "TPE3",
            TP4: "TPE4",
            TCM: "TCOM",
            TXT: "TEXT",
            TLA: "TLAN",
            TCO: "TCON",
            TAL: "TALB",
            TPA: "TPOS",
            TRK: "TRCK",
            TRC: "TSRC",
            TYE: "TYER",
            TDA: "TDAT",
            TIM: "TIME",
            TRD: "TRDA",
            TMT: "TMED",
            TFT: "TFLT",
            TBP: "TBPM",
            TCR: "TCOP",
            TPB: "TPUB",
            TEN: "TENC",
            TSS: "TSSE",
            TOF: "TOFN",
            TLE: "TLEN",
            TSI: "TSIZ",
            TDY: "TDLY",
            TKE: "TKEY",
            TOT: "TOAL",
            TOA: "TOPE",
            TOL: "TOLY",
            TOR: "TORY",
            TXX: "TXXX",
            WAF: "WOAF",
            WAR: "WOAR",
            WAS: "WOAS",
            WCM: "WCOM",
            WCP: "WCOP",
            WPB: "WPUB",
            WXX: "WXXX",
            IPL: "IPLS",
            MCI: "MCDI",
            ETC: "ETCO",
            MLL: "MLLT",
            STC: "SYTC",
            ULT: "USLT",
            SLT: "SYLT",
            COM: "COMM",
            RVA: "RVAD",
            EQU: "EQUA",
            REV: "RVRB",
            GEO: "GEOB",
            CNT: "PCNT",
            POP: "POPM",
            BUF: "RBUF",
            CRA: "AENC",
            LNK: "LINK",
            TST: "TSOT",
            TSP: "TSOP",
            TSA: "TSOA",
            TCP: "TCMP",
            TS2: "TSO2",
            TSC: "TSOC"
        },
        frameReplacements: {
            PIC: {
                encoding: 1,
                format: "int24",
                type: "int8",
                description: "string",
                data: "binary"
            },
            CRM: {
                owner: "latin1",
                description: "latin1",
                data: "binary"
            }
        }
    });
    MP3Demuxer = Demuxer.extend(function() {
        Demuxer.register(this);
        this.probe = function(stream) {
            var off = stream.offset;
            var id3header = MP3Demuxer.getID3v2Header(stream);
            if (id3header) stream.advance(10 + id3header.length);
            var s = new MP3Stream(new Bitstream(stream));
            var header = MP3FrameHeader.decode(s);
            stream.advance(off - stream.offset);
            return !!header;
        };
        this.getID3v2Header = function(stream) {
            if (stream.peekString(0, 3) == "ID3") {
                stream = Stream.fromBuffer(stream.peekBuffer(0, 10));
                stream.advance(3);
                var major = stream.readUInt8();
                var minor = stream.readUInt8();
                var flags = stream.readUInt8();
                var bytes = stream.readBuffer(4).data;
                var length = bytes[0] << 21 | bytes[1] << 14 | bytes[2] << 7 | bytes[3];
                return {
                    version: "2." + major + "." + minor,
                    major: major,
                    minor: minor,
                    flags: flags,
                    length: length
                };
            }
            return null;
        };
        const XING_OFFSETS = [ [ 32, 17 ], [ 17, 9 ] ];
        this.prototype.parseDuration = function(header) {
            var stream = this.stream;
            var frames;
            var offset = stream.offset;
            if (!header || header.layer !== 3) return false;
            stream.advance(XING_OFFSETS[header.flags & FLAGS.LSF_EXT ? 1 : 0][header.nchannels() === 1 ? 1 : 0]);
            var tag = stream.readString(4);
            if (tag === "Xing" || tag === "Info") {
                var flags = stream.readUInt32();
                if (flags & 1) frames = stream.readUInt32();
            }
            stream.advance(offset + 4 + 32 - stream.offset);
            tag = stream.readString(4);
            if (tag == "VBRI" && stream.readUInt16() === 1) {
                stream.advance(4);
                stream.advance(4);
                frames = stream.readUInt32();
            }
            if (!frames) return false;
            var samplesPerFrame = header.flags & FLAGS.LSF_EXT ? 576 : 1152;
            this.emit("duration", frames * samplesPerFrame / header.samplerate * 1e3 | 0);
            return true;
        };
        this.prototype.readChunk = function() {
            var stream = this.stream;
            if (!this.sentInfo) {
                var id3header = MP3Demuxer.getID3v2Header(stream);
                if (id3header) {
                    stream.advance(10);
                    if (id3header.major > 2) {
                        var id3 = new ID3v23Stream(id3header, stream);
                    } else {
                        var id3 = new ID3v22Stream(id3header, stream);
                    }
                    this.emit("metadata", id3.read());
                }
                var off = stream.offset;
                var s = new MP3Stream(new Bitstream(stream));
                var header = MP3FrameHeader.decode(s);
                if (!header) return this.emit("error", "Could not find first frame.");
                this.emit("format", {
                    formatID: "mp3",
                    sampleRate: header.samplerate,
                    channelsPerFrame: header.nchannels(),
                    bitrate: header.bitrate
                });
                this.parseDuration(header);
                stream.advance(off - stream.offset);
                this.sentInfo = true;
            }
            while (stream.available(1)) {
                var buffer = stream.readSingleBuffer(stream.remainingBytes());
                this.emit("data", buffer, stream.remainingBytes() === 0);
            }
        };
    });
    function MP3Stream(stream) {
        this.stream = stream;
        this.sync = false;
        this.freerate = 0;
        this.this_frame = stream.stream.offset;
        this.next_frame = stream.stream.offset;
        this.error = MP3Stream.ERROR.NONE;
        this.main_data = new Uint8Array(BUFFER_MDLEN);
        this.md_len = 0;
        for (var key in stream) {
            if (typeof stream[key] === "function") this[key] = stream[key].bind(stream);
        }
    }
    MP3Stream.prototype.getU8 = function(offset) {
        var stream = this.stream.stream;
        return stream.peekUInt8(offset - stream.offset);
    };
    MP3Stream.prototype.nextByte = function() {
        var stream = this.stream;
        return stream.bitPosition === 0 ? stream.stream.offset : stream.stream.offset + 1;
    };
    MP3Stream.prototype.doSync = function() {
        var stream = this.stream.stream;
        this.align();
        while (this.available(16) && !(stream.peekUInt8(0) === 255 && (stream.peekUInt8(1) & 224) === 224)) {
            this.advance(8);
        }
        if (!this.available(BUFFER_GUARD)) {
            return -1;
        }
    };
    MP3Stream.ERROR = {
        NONE: 0,
        BUFLEN: 1,
        BUFPTR: 2,
        NOMEM: 49,
        LOSTSYNC: 257,
        BADLAYER: 258,
        BADBITRATE: 259,
        BADSAMPLERATE: 260,
        BADEMPHASIS: 261,
        BADCRC: 513,
        BADBITALLOC: 529,
        BADSCALEFACTOR: 545,
        BADMODE: 546,
        BADFRAMELEN: 561,
        BADBIGVALUES: 562,
        BADBLOCKTYPE: 563,
        BADSCFSI: 564,
        BADDATAPTR: 565,
        BADPART3LEN: 566,
        BADHUFFTABLE: 567,
        BADHUFFDATA: 568,
        BADSTEREO: 569
    };
    const BITRATES = [ [ 0, 32e3, 64e3, 96e3, 128e3, 16e4, 192e3, 224e3, 256e3, 288e3, 32e4, 352e3, 384e3, 416e3, 448e3 ], [ 0, 32e3, 48e3, 56e3, 64e3, 8e4, 96e3, 112e3, 128e3, 16e4, 192e3, 224e3, 256e3, 32e4, 384e3 ], [ 0, 32e3, 4e4, 48e3, 56e3, 64e3, 8e4, 96e3, 112e3, 128e3, 16e4, 192e3, 224e3, 256e3, 32e4 ], [ 0, 32e3, 48e3, 56e3, 64e3, 8e4, 96e3, 112e3, 128e3, 144e3, 16e4, 176e3, 192e3, 224e3, 256e3 ], [ 0, 8e3, 16e3, 24e3, 32e3, 4e4, 48e3, 56e3, 64e3, 8e4, 96e3, 112e3, 128e3, 144e3, 16e4 ] ];
    const SAMPLERATES = [ 44100, 48e3, 32e3 ];
    const FLAGS = {
        NPRIVATE_III: 7,
        INCOMPLETE: 8,
        PROTECTION: 16,
        COPYRIGHT: 32,
        ORIGINAL: 64,
        PADDING: 128,
        I_STEREO: 256,
        MS_STEREO: 512,
        FREEFORMAT: 1024,
        LSF_EXT: 4096,
        MC_EXT: 8192,
        MPEG_2_5_EXT: 16384
    };
    const PRIVATE = {
        HEADER: 256,
        III: 31
    };
    const MODE = {
        SINGLE_CHANNEL: 0,
        DUAL_CHANNEL: 1,
        JOINT_STEREO: 2,
        STEREO: 3
    };
    const EMPHASIS = {
        NONE: 0,
        _50_15_US: 1,
        CCITT_J_17: 3,
        RESERVED: 2
    };
    const BUFFER_GUARD = 8;
    const BUFFER_MDLEN = 511 + 2048 + BUFFER_GUARD;
    function MP3FrameHeader() {
        this.layer = 0;
        this.mode = 0;
        this.mode_extension = 0;
        this.emphasis = 0;
        this.bitrate = 0;
        this.samplerate = 0;
        this.crc_check = 0;
        this.crc_target = 0;
        this.flags = 0;
        this.private_bits = 0;
    }
    MP3FrameHeader.prototype.copy = function() {
        var clone = new MP3FrameHeader;
        var keys = Object.keys(this);
        for (var key in keys) {
            clone[key] = this[key];
        }
        return clone;
    };
    MP3FrameHeader.prototype.nchannels = function() {
        return this.mode === 0 ? 1 : 2;
    };
    MP3FrameHeader.prototype.nbsamples = function() {
        return this.layer === 1 ? 12 : this.layer === 3 && this.flags & FLAGS.LSF_EXT ? 18 : 36;
    };
    MP3FrameHeader.prototype.decode = function(stream) {
        this.flags = 0;
        this.private_bits = 0;
        stream.advance(11);
        if (stream.readOne() === 0) {
            this.flags |= FLAGS.MPEG_2_5_EXT;
        }
        if (stream.readOne() === 0) {
            this.flags |= FLAGS.LSF_EXT;
        } else if (this.flags & FLAGS.MPEG_2_5_EXT) {
            stream.error = MP3Stream.ERROR.LOSTSYNC;
            return false;
        }
        this.layer = 4 - stream.readSmall(2);
        if (this.layer === 4) {
            stream.error = MP3Stream.ERROR.BADLAYER;
            return false;
        }
        if (stream.readOne() === 0) this.flags |= FLAGS.PROTECTION;
        var index = stream.readSmall(4);
        if (index === 15) {
            stream.error = MP3Stream.ERROR.BADBITRATE;
            return false;
        }
        if (this.flags & FLAGS.LSF_EXT) {
            this.bitrate = BITRATES[3 + (this.layer >> 1)][index];
        } else {
            this.bitrate = BITRATES[this.layer - 1][index];
        }
        index = stream.readSmall(2);
        if (index === 3) {
            stream.error = MP3Stream.ERROR.BADSAMPLERATE;
            return false;
        }
        this.samplerate = SAMPLERATES[index];
        if (this.flags & FLAGS.LSF_EXT) {
            this.samplerate /= 2;
            if (this.flags & FLAGS.MPEG_2_5_EXT) this.samplerate /= 2;
        }
        if (stream.readOne()) this.flags |= FLAGS.PADDING;
        if (stream.readOne()) this.private_bits |= PRIVATE.HEADER;
        this.mode = 3 - stream.readSmall(2);
        this.mode_extension = stream.readSmall(2);
        if (stream.readOne()) this.flags |= FLAGS.COPYRIGHT;
        if (stream.readOne()) this.flags |= FLAGS.ORIGINAL;
        this.emphasis = stream.readSmall(2);
        if (this.flags & FLAGS.PROTECTION) this.crc_target = stream.read(16);
        return true;
    };
    MP3FrameHeader.decode = function(stream) {
        var ptr = stream.next_frame;
        var syncing = true;
        var header = null;
        while (syncing) {
            syncing = false;
            if (stream.sync) {
                if (!stream.available(BUFFER_GUARD)) {
                    stream.next_frame = ptr;
                    stream.error = MP3Stream.ERROR.BUFLEN;
                    return null;
                } else if (!(stream.getU8(ptr) === 255 && (stream.getU8(ptr + 1) & 224) === 224)) {
                    stream.this_frame = ptr;
                    stream.next_frame = ptr + 1;
                    stream.error = MP3Stream.ERROR.LOSTSYNC;
                    return null;
                }
            } else {
                stream.advance(ptr * 8 - stream.offset());
                if (stream.doSync() === -1) {
                    stream.error = MP3Stream.ERROR.BUFLEN;
                    return null;
                }
                ptr = stream.nextByte();
            }
            stream.this_frame = ptr;
            stream.next_frame = ptr + 1;
            stream.advance(stream.this_frame * 8 - stream.offset());
            header = new MP3FrameHeader;
            header.decode(stream);
            if (!header) return null;
            if (header.bitrate === 0) {
                if (stream.freerate === 0 || !stream.sync || header.layer === 3 && stream.freerate > 64e4) {
                    if (MP3FrameHeader.free_bitrate(stream, header) === -1) {
                        return null;
                    }
                }
                header.bitrate = stream.freerate;
                header.flags |= FLAGS.FREEFORMAT;
            }
            var pad_slot = header.flags & FLAGS.PADDING ? 1 : 0;
            if (header.layer === 1) {
                var N = ((12 * header.bitrate / header.samplerate << 0) + pad_slot) * 4;
            } else {
                var slots_per_frame = header.layer === 3 && header.flags & FLAGS.LSF_EXT ? 72 : 144;
                var N = (slots_per_frame * header.bitrate / header.samplerate << 0) + pad_slot;
            }
            if (!stream.available(N + BUFFER_GUARD)) {
                stream.next_frame = stream.this_frame;
                stream.error = MP3Stream.ERROR.BUFLEN;
                return null;
            }
            stream.next_frame = stream.this_frame + N;
            if (!stream.sync) {
                ptr = stream.next_frame;
                if (!(stream.getU8(ptr) === 255 && (stream.getU8(ptr + 1) & 224) === 224)) {
                    ptr = stream.next_frame = stream.this_frame + 1;
                    syncing = true;
                    continue;
                }
                stream.sync = true;
            }
        }
        header.flags |= FLAGS.INCOMPLETE;
        return header;
    };
    MP3FrameHeader.free_bitrate = function(stream, header) {
        var pad_slot = header.flags & FLAGS.PADDING ? 1 : 0, slots_per_frame = header.layer === 3 && header.flags & FLAGS.LSF_EXT ? 72 : 144;
        var start = stream.offset();
        var rate = 0;
        while (stream.doSync() !== -1) {
            var peek_header = header.copy();
            var peek_stream = stream.copy();
            if (peek_header.decode(peek_stream) && peek_header.layer === header.layer && peek_header.samplerate === header.samplerate) {
                var N = stream.nextByte() - stream.this_frame;
                if (header.layer === 1) {
                    rate = header.samplerate * (N - 4 * pad_slot + 4) / 48 / 1e3 | 0;
                } else {
                    rate = header.samplerate * (N - pad_slot + 1) / slots_per_frame / 1e3 | 0;
                }
                if (rate >= 8) break;
            }
            stream.advance(8);
        }
        stream.advance(start - stream.offset());
        if (rate < 8 || header.layer === 3 && rate > 640) {
            stream.error = MP3Stream.ERROR.LOST_SYNC;
            return -1;
        }
        stream.freerate = rate * 1e3;
    };
    const SFB_48000_LONG = new Uint8Array([ 4, 4, 4, 4, 4, 4, 6, 6, 6, 8, 10, 12, 16, 18, 22, 28, 34, 40, 46, 54, 54, 192 ]);
    const SFB_44100_LONG = new Uint8Array([ 4, 4, 4, 4, 4, 4, 6, 6, 8, 8, 10, 12, 16, 20, 24, 28, 34, 42, 50, 54, 76, 158 ]);
    const SFB_32000_LONG = new Uint8Array([ 4, 4, 4, 4, 4, 4, 6, 6, 8, 10, 12, 16, 20, 24, 30, 38, 46, 56, 68, 84, 102, 26 ]);
    const SFB_48000_SHORT = new Uint8Array([ 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 6, 10, 10, 10, 12, 12, 12, 14, 14, 14, 16, 16, 16, 20, 20, 20, 26, 26, 26, 66, 66, 66 ]);
    const SFB_44100_SHORT = new Uint8Array([ 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 10, 10, 12, 12, 12, 14, 14, 14, 18, 18, 18, 22, 22, 22, 30, 30, 30, 56, 56, 56 ]);
    const SFB_32000_SHORT = new Uint8Array([ 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 12, 12, 12, 16, 16, 16, 20, 20, 20, 26, 26, 26, 34, 34, 34, 42, 42, 42, 12, 12, 12 ]);
    const SFB_48000_MIXED = new Uint8Array([ 4, 4, 4, 4, 4, 4, 6, 6, 4, 4, 4, 6, 6, 6, 6, 6, 6, 10, 10, 10, 12, 12, 12, 14, 14, 14, 16, 16, 16, 20, 20, 20, 26, 26, 26, 66, 66, 66 ]);
    const SFB_44100_MIXED = new Uint8Array([ 4, 4, 4, 4, 4, 4, 6, 6, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 10, 10, 12, 12, 12, 14, 14, 14, 18, 18, 18, 22, 22, 22, 30, 30, 30, 56, 56, 56 ]);
    const SFB_32000_MIXED = new Uint8Array([ 4, 4, 4, 4, 4, 4, 6, 6, 4, 4, 4, 6, 6, 6, 8, 8, 8, 12, 12, 12, 16, 16, 16, 20, 20, 20, 26, 26, 26, 34, 34, 34, 42, 42, 42, 12, 12, 12 ]);
    const SFB_24000_LONG = new Uint8Array([ 6, 6, 6, 6, 6, 6, 8, 10, 12, 14, 16, 18, 22, 26, 32, 38, 46, 54, 62, 70, 76, 36 ]);
    const SFB_22050_LONG = new Uint8Array([ 6, 6, 6, 6, 6, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 38, 46, 52, 60, 68, 58, 54 ]);
    const SFB_16000_LONG = SFB_22050_LONG;
    const SFB_24000_SHORT = new Uint8Array([ 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 10, 10, 12, 12, 12, 14, 14, 14, 18, 18, 18, 24, 24, 24, 32, 32, 32, 44, 44, 44, 12, 12, 12 ]);
    const SFB_22050_SHORT = new Uint8Array([ 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 6, 8, 8, 8, 10, 10, 10, 14, 14, 14, 18, 18, 18, 26, 26, 26, 32, 32, 32, 42, 42, 42, 18, 18, 18 ]);
    const SFB_16000_SHORT = new Uint8Array([ 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 10, 10, 12, 12, 12, 14, 14, 14, 18, 18, 18, 24, 24, 24, 30, 30, 30, 40, 40, 40, 18, 18, 18 ]);
    const SFB_24000_MIXED = new Uint8Array([ 6, 6, 6, 6, 6, 6, 6, 6, 6, 8, 8, 8, 10, 10, 10, 12, 12, 12, 14, 14, 14, 18, 18, 18, 24, 24, 24, 32, 32, 32, 44, 44, 44, 12, 12, 12 ]);
    const SFB_22050_MIXED = new Uint8Array([ 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8, 8, 8, 10, 10, 10, 14, 14, 14, 18, 18, 18, 26, 26, 26, 32, 32, 32, 42, 42, 42, 18, 18, 18 ]);
    const SFB_16000_MIXED = new Uint8Array([ 6, 6, 6, 6, 6, 6, 6, 6, 6, 8, 8, 8, 10, 10, 10, 12, 12, 12, 14, 14, 14, 18, 18, 18, 24, 24, 24, 30, 30, 30, 40, 40, 40, 18, 18, 18 ]);
    const SFB_12000_LONG = SFB_16000_LONG;
    const SFB_11025_LONG = SFB_12000_LONG;
    const SFB_8000_LONG = new Uint8Array([ 12, 12, 12, 12, 12, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 76, 90, 2, 2, 2, 2, 2 ]);
    const SFB_12000_SHORT = SFB_16000_SHORT;
    const SFB_11025_SHORT = SFB_12000_SHORT;
    const SFB_8000_SHORT = new Uint8Array([ 8, 8, 8, 8, 8, 8, 8, 8, 8, 12, 12, 12, 16, 16, 16, 20, 20, 20, 24, 24, 24, 28, 28, 28, 36, 36, 36, 2, 2, 2, 2, 2, 2, 2, 2, 2, 26, 26, 26 ]);
    const SFB_12000_MIXED = SFB_16000_MIXED;
    const SFB_11025_MIXED = SFB_12000_MIXED;
    const SFB_8000_MIXED = new Uint8Array([ 12, 12, 12, 4, 4, 4, 8, 8, 8, 12, 12, 12, 16, 16, 16, 20, 20, 20, 24, 24, 24, 28, 28, 28, 36, 36, 36, 2, 2, 2, 2, 2, 2, 2, 2, 2, 26, 26, 26 ]);
    const SFBWIDTH_TABLE = [ {
        l: SFB_48000_LONG,
        s: SFB_48000_SHORT,
        m: SFB_48000_MIXED
    }, {
        l: SFB_44100_LONG,
        s: SFB_44100_SHORT,
        m: SFB_44100_MIXED
    }, {
        l: SFB_32000_LONG,
        s: SFB_32000_SHORT,
        m: SFB_32000_MIXED
    }, {
        l: SFB_24000_LONG,
        s: SFB_24000_SHORT,
        m: SFB_24000_MIXED
    }, {
        l: SFB_22050_LONG,
        s: SFB_22050_SHORT,
        m: SFB_22050_MIXED
    }, {
        l: SFB_16000_LONG,
        s: SFB_16000_SHORT,
        m: SFB_16000_MIXED
    }, {
        l: SFB_12000_LONG,
        s: SFB_12000_SHORT,
        m: SFB_12000_MIXED
    }, {
        l: SFB_11025_LONG,
        s: SFB_11025_SHORT,
        m: SFB_11025_MIXED
    }, {
        l: SFB_8000_LONG,
        s: SFB_8000_SHORT,
        m: SFB_8000_MIXED
    } ];
    const PRETAB = new Uint8Array([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 3, 3, 2, 0 ]);
    const ROOT_TABLE = new Float32Array([ .59460355750136, .70710678118655, .84089641525371, 1, 1.18920711500272, 1.4142135623731, 1.68179283050743 ]);
    const CS = new Float32Array([ +.857492926, +.881741997, +.949628649, +.983314592, +.995517816, +.999160558, +.999899195, +.999993155 ]);
    const CA = new Float32Array([ -.514495755, -.471731969, -.313377454, -.1819132, -.094574193, -.040965583, -.014198569, -.003699975 ]);
    const COUNT1TABLE_SELECT = 1;
    const SCALEFAC_SCALE = 2;
    const PREFLAG = 4;
    const MIXED_BLOCK_FLAG = 8;
    const I_STEREO = 1;
    const MS_STEREO = 2;
    const WINDOW_L = new Float32Array([ .043619387, .130526192, .216439614, .3007058, .382683432, .461748613, .537299608, .608761429, .675590208, .737277337, .79335334, .843391446, .887010833, .923879533, .953716951, .976296007, .991444861, .999048222, .999048222, .991444861, .976296007, .953716951, .923879533, .887010833, .843391446, .79335334, .737277337, .675590208, .608761429, .537299608, .461748613, .382683432, .3007058, .216439614, .130526192, .043619387 ]);
    const WINDOW_S = new Float32Array([ .130526192, .382683432, .608761429, .79335334, .923879533, .991444861, .991444861, .923879533, .79335334, .608761429, .382683432, .130526192 ]);
    const IS_TABLE = new Float32Array([ 0, .211324865, .366025404, .5, .633974596, .788675135, 1 ]);
    const IS_LSF_TABLE = [ new Float32Array([ .840896415, .707106781, .594603558, .5, .420448208, .353553391, .297301779, .25, .210224104, .176776695, .148650889, .125, .105112052, .088388348, .074325445 ]), new Float32Array([ .707106781, .5, .353553391, .25, .176776695, .125, .088388348, .0625, .044194174, .03125, .022097087, .015625, .011048543, .0078125, .005524272 ]) ];
    const SFLEN_TABLE = [ {
        slen1: 0,
        slen2: 0
    }, {
        slen1: 0,
        slen2: 1
    }, {
        slen1: 0,
        slen2: 2
    }, {
        slen1: 0,
        slen2: 3
    }, {
        slen1: 3,
        slen2: 0
    }, {
        slen1: 1,
        slen2: 1
    }, {
        slen1: 1,
        slen2: 2
    }, {
        slen1: 1,
        slen2: 3
    }, {
        slen1: 2,
        slen2: 1
    }, {
        slen1: 2,
        slen2: 2
    }, {
        slen1: 2,
        slen2: 3
    }, {
        slen1: 3,
        slen2: 1
    }, {
        slen1: 3,
        slen2: 2
    }, {
        slen1: 3,
        slen2: 3
    }, {
        slen1: 4,
        slen2: 2
    }, {
        slen1: 4,
        slen2: 3
    } ];
    const NSFB_TABLE = [ [ [ 6, 5, 5, 5 ], [ 9, 9, 9, 9 ], [ 6, 9, 9, 9 ] ], [ [ 6, 5, 7, 3 ], [ 9, 9, 12, 6 ], [ 6, 9, 12, 6 ] ], [ [ 11, 10, 0, 0 ], [ 18, 18, 0, 0 ], [ 15, 18, 0, 0 ] ], [ [ 7, 7, 7, 0 ], [ 12, 12, 12, 0 ], [ 6, 15, 12, 0 ] ], [ [ 6, 6, 6, 3 ], [ 12, 9, 9, 6 ], [ 6, 12, 9, 6 ] ], [ [ 8, 8, 5, 0 ], [ 15, 12, 9, 0 ], [ 6, 18, 9, 0 ] ] ];
    var PTR = function(offs, bits) {
        return {
            "final": 0,
            ptr: {
                bits: bits,
                offset: offs
            }
        };
    };
    var huffquad_V = function(v, w, x, y, hlen) {
        return {
            "final": 1,
            value: {
                v: v,
                w: w,
                x: x,
                y: y
            }
        };
    };
    const hufftabA = [ PTR(16, 2), PTR(20, 2), PTR(24, 1), PTR(26, 1), huffquad_V(0, 0, 1, 0, 4), huffquad_V(0, 0, 0, 1, 4), huffquad_V(0, 1, 0, 0, 4), huffquad_V(1, 0, 0, 0, 4), huffquad_V(0, 0, 0, 0, 1), huffquad_V(0, 0, 0, 0, 1), huffquad_V(0, 0, 0, 0, 1), huffquad_V(0, 0, 0, 0, 1), huffquad_V(0, 0, 0, 0, 1), huffquad_V(0, 0, 0, 0, 1), huffquad_V(0, 0, 0, 0, 1), huffquad_V(0, 0, 0, 0, 1), huffquad_V(1, 0, 1, 1, 2), huffquad_V(1, 1, 1, 1, 2), huffquad_V(1, 1, 0, 1, 2), huffquad_V(1, 1, 1, 0, 2), huffquad_V(0, 1, 1, 1, 2), huffquad_V(0, 1, 0, 1, 2), huffquad_V(1, 0, 0, 1, 1), huffquad_V(1, 0, 0, 1, 1), huffquad_V(0, 1, 1, 0, 1), huffquad_V(0, 0, 1, 1, 1), huffquad_V(1, 0, 1, 0, 1), huffquad_V(1, 1, 0, 0, 1) ];
    const hufftabB = [ huffquad_V(1, 1, 1, 1, 4), huffquad_V(1, 1, 1, 0, 4), huffquad_V(1, 1, 0, 1, 4), huffquad_V(1, 1, 0, 0, 4), huffquad_V(1, 0, 1, 1, 4), huffquad_V(1, 0, 1, 0, 4), huffquad_V(1, 0, 0, 1, 4), huffquad_V(1, 0, 0, 0, 4), huffquad_V(0, 1, 1, 1, 4), huffquad_V(0, 1, 1, 0, 4), huffquad_V(0, 1, 0, 1, 4), huffquad_V(0, 1, 0, 0, 4), huffquad_V(0, 0, 1, 1, 4), huffquad_V(0, 0, 1, 0, 4), huffquad_V(0, 0, 0, 1, 4), huffquad_V(0, 0, 0, 0, 4) ];
    var V = function(x, y, hlen) {
        return {
            "final": 1,
            value: {
                x: x,
                y: y,
                hlen: hlen
            }
        };
    };
    const hufftab0 = [ V(0, 0, 0) ];
    const hufftab1 = [ V(1, 1, 3), V(0, 1, 3), V(1, 0, 2), V(1, 0, 2), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1) ];
    const hufftab2 = [ PTR(8, 3), V(1, 1, 3), V(0, 1, 3), V(1, 0, 3), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(2, 2, 3), V(0, 2, 3), V(1, 2, 2), V(1, 2, 2), V(2, 1, 2), V(2, 1, 2), V(2, 0, 2), V(2, 0, 2) ];
    const hufftab3 = [ PTR(8, 3), V(1, 0, 3), V(1, 1, 2), V(1, 1, 2), V(0, 1, 2), V(0, 1, 2), V(0, 0, 2), V(0, 0, 2), V(2, 2, 3), V(0, 2, 3), V(1, 2, 2), V(1, 2, 2), V(2, 1, 2), V(2, 1, 2), V(2, 0, 2), V(2, 0, 2) ];
    const hufftab5 = [ PTR(8, 4), V(1, 1, 3), V(0, 1, 3), V(1, 0, 3), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), PTR(24, 1), V(3, 2, 4), V(3, 1, 3), V(3, 1, 3), V(1, 3, 4), V(0, 3, 4), V(3, 0, 4), V(2, 2, 4), V(1, 2, 3), V(1, 2, 3), V(2, 1, 3), V(2, 1, 3), V(0, 2, 3), V(0, 2, 3), V(2, 0, 3), V(2, 0, 3), V(3, 3, 1), V(2, 3, 1) ];
    const hufftab6 = [ PTR(16, 3), PTR(24, 1), PTR(26, 1), V(1, 2, 4), V(2, 1, 4), V(2, 0, 4), V(0, 1, 3), V(0, 1, 3), V(1, 1, 2), V(1, 1, 2), V(1, 1, 2), V(1, 1, 2), V(1, 0, 3), V(1, 0, 3), V(0, 0, 3), V(0, 0, 3), V(3, 3, 3), V(0, 3, 3), V(2, 3, 2), V(2, 3, 2), V(3, 2, 2), V(3, 2, 2), V(3, 0, 2), V(3, 0, 2), V(1, 3, 1), V(3, 1, 1), V(2, 2, 1), V(0, 2, 1) ];
    const hufftab7 = [ PTR(16, 4), PTR(32, 4), PTR(48, 2), V(1, 1, 4), V(0, 1, 3), V(0, 1, 3), V(1, 0, 3), V(1, 0, 3), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), PTR(52, 2), PTR(56, 1), PTR(58, 1), V(1, 5, 4), V(5, 1, 4), PTR(60, 1), V(5, 0, 4), PTR(62, 1), V(2, 4, 4), V(4, 2, 4), V(1, 4, 3), V(1, 4, 3), V(4, 1, 3), V(4, 1, 3), V(4, 0, 3), V(4, 0, 3), V(0, 4, 4), V(2, 3, 4), V(3, 2, 4), V(0, 3, 4), V(1, 3, 3), V(1, 3, 3), V(3, 1, 3), V(3, 1, 3), V(3, 0, 3), V(3, 0, 3), V(2, 2, 3), V(2, 2, 3), V(1, 2, 2), V(1, 2, 2), V(1, 2, 2), V(1, 2, 2), V(2, 1, 1), V(2, 1, 1), V(0, 2, 2), V(2, 0, 2), V(5, 5, 2), V(4, 5, 2), V(5, 4, 2), V(5, 3, 2), V(3, 5, 1), V(4, 4, 1), V(2, 5, 1), V(5, 2, 1), V(0, 5, 1), V(3, 4, 1), V(4, 3, 1), V(3, 3, 1) ];
    const hufftab8 = [ PTR(16, 4), PTR(32, 4), V(1, 2, 4), V(2, 1, 4), V(1, 1, 2), V(1, 1, 2), V(1, 1, 2), V(1, 1, 2), V(0, 1, 3), V(0, 1, 3), V(1, 0, 3), V(1, 0, 3), V(0, 0, 2), V(0, 0, 2), V(0, 0, 2), V(0, 0, 2), PTR(48, 3), PTR(56, 2), PTR(60, 1), V(1, 5, 4), V(5, 1, 4), PTR(62, 1), PTR(64, 1), V(2, 4, 4), V(4, 2, 4), V(1, 4, 4), V(4, 1, 3), V(4, 1, 3), V(0, 4, 4), V(4, 0, 4), V(2, 3, 4), V(3, 2, 4), V(1, 3, 4), V(3, 1, 4), V(0, 3, 4), V(3, 0, 4), V(2, 2, 2), V(2, 2, 2), V(2, 2, 2), V(2, 2, 2), V(0, 2, 2), V(0, 2, 2), V(0, 2, 2), V(0, 2, 2), V(2, 0, 2), V(2, 0, 2), V(2, 0, 2), V(2, 0, 2), V(5, 5, 3), V(5, 4, 3), V(4, 5, 2), V(4, 5, 2), V(5, 3, 1), V(5, 3, 1), V(5, 3, 1), V(5, 3, 1), V(3, 5, 2), V(4, 4, 2), V(2, 5, 1), V(2, 5, 1), V(5, 2, 1), V(0, 5, 1), V(3, 4, 1), V(4, 3, 1), V(5, 0, 1), V(3, 3, 1) ];
    const hufftab9 = [ PTR(16, 4), PTR(32, 3), PTR(40, 2), PTR(44, 2), PTR(48, 1), V(1, 2, 4), V(2, 1, 4), V(2, 0, 4), V(1, 1, 3), V(1, 1, 3), V(0, 1, 3), V(0, 1, 3), V(1, 0, 3), V(1, 0, 3), V(0, 0, 3), V(0, 0, 3), PTR(50, 1), V(3, 5, 4), V(5, 3, 4), PTR(52, 1), V(4, 4, 4), V(2, 5, 4), V(5, 2, 4), V(1, 5, 4), V(5, 1, 3), V(5, 1, 3), V(3, 4, 3), V(3, 4, 3), V(4, 3, 3), V(4, 3, 3), V(5, 0, 4), V(0, 4, 4), V(2, 4, 3), V(4, 2, 3), V(3, 3, 3), V(4, 0, 3), V(1, 4, 2), V(1, 4, 2), V(4, 1, 2), V(4, 1, 2), V(2, 3, 2), V(3, 2, 2), V(1, 3, 1), V(1, 3, 1), V(3, 1, 1), V(3, 1, 1), V(0, 3, 2), V(3, 0, 2), V(2, 2, 1), V(0, 2, 1), V(5, 5, 1), V(4, 5, 1), V(5, 4, 1), V(0, 5, 1) ];
    const hufftab10 = [ PTR(16, 4), PTR(32, 4), PTR(48, 2), V(1, 1, 4), V(0, 1, 3), V(0, 1, 3), V(1, 0, 3), V(1, 0, 3), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), PTR(52, 3), PTR(60, 2), PTR(64, 3), PTR(72, 1), PTR(74, 2), PTR(78, 2), PTR(82, 2), V(1, 7, 4), V(7, 1, 4), PTR(86, 1), PTR(88, 2), PTR(92, 2), V(1, 6, 4), V(6, 1, 4), V(6, 0, 4), PTR(96, 1), PTR(98, 1), PTR(100, 1), V(1, 4, 4), V(4, 1, 4), V(4, 0, 4), V(2, 3, 4), V(3, 2, 4), V(0, 3, 4), V(1, 3, 3), V(1, 3, 3), V(3, 1, 3), V(3, 1, 3), V(3, 0, 3), V(3, 0, 3), V(2, 2, 3), V(2, 2, 3), V(1, 2, 2), V(2, 1, 2), V(0, 2, 2), V(2, 0, 2), V(7, 7, 3), V(6, 7, 3), V(7, 6, 3), V(5, 7, 3), V(7, 5, 3), V(6, 6, 3), V(4, 7, 2), V(4, 7, 2), V(7, 4, 2), V(5, 6, 2), V(6, 5, 2), V(3, 7, 2), V(7, 3, 2), V(7, 3, 2), V(4, 6, 2), V(4, 6, 2), V(5, 5, 3), V(5, 4, 3), V(6, 3, 2), V(6, 3, 2), V(2, 7, 1), V(7, 2, 1), V(6, 4, 2), V(0, 7, 2), V(7, 0, 1), V(7, 0, 1), V(6, 2, 1), V(6, 2, 1), V(4, 5, 2), V(3, 5, 2), V(0, 6, 1), V(0, 6, 1), V(5, 3, 2), V(4, 4, 2), V(3, 6, 1), V(2, 6, 1), V(2, 5, 2), V(5, 2, 2), V(1, 5, 1), V(1, 5, 1), V(5, 1, 1), V(5, 1, 1), V(3, 4, 2), V(4, 3, 2), V(0, 5, 1), V(5, 0, 1), V(2, 4, 1), V(4, 2, 1), V(3, 3, 1), V(0, 4, 1) ];
    const hufftab11 = [ PTR(16, 4), PTR(32, 4), PTR(48, 4), PTR(64, 3), V(1, 2, 4), PTR(72, 1), V(1, 1, 3), V(1, 1, 3), V(0, 1, 3), V(0, 1, 3), V(1, 0, 3), V(1, 0, 3), V(0, 0, 2), V(0, 0, 2), V(0, 0, 2), V(0, 0, 2), PTR(74, 2), PTR(78, 3), PTR(86, 2), PTR(90, 1), PTR(92, 2), V(2, 7, 4), V(7, 2, 4), PTR(96, 1), V(7, 1, 3), V(7, 1, 3), V(1, 7, 4), V(7, 0, 4), V(3, 6, 4), V(6, 3, 4), V(6, 0, 4), PTR(98, 1), PTR(100, 1), V(1, 5, 4), V(6, 2, 3), V(6, 2, 3), V(2, 6, 4), V(0, 6, 4), V(1, 6, 3), V(1, 6, 3), V(6, 1, 3), V(6, 1, 3), V(5, 1, 4), V(3, 4, 4), V(5, 0, 4), PTR(102, 1), V(2, 4, 4), V(4, 2, 4), V(1, 4, 4), V(4, 1, 4), V(0, 4, 4), V(4, 0, 4), V(2, 3, 3), V(2, 3, 3), V(3, 2, 3), V(3, 2, 3), V(1, 3, 2), V(1, 3, 2), V(1, 3, 2), V(1, 3, 2), V(3, 1, 2), V(3, 1, 2), V(3, 1, 2), V(3, 1, 2), V(0, 3, 3), V(3, 0, 3), V(2, 2, 2), V(2, 2, 2), V(2, 1, 1), V(2, 1, 1), V(2, 1, 1), V(2, 1, 1), V(0, 2, 1), V(2, 0, 1), V(7, 7, 2), V(6, 7, 2), V(7, 6, 2), V(7, 5, 2), V(6, 6, 2), V(6, 6, 2), V(4, 7, 2), V(4, 7, 2), V(7, 4, 2), V(7, 4, 2), V(5, 7, 3), V(5, 5, 3), V(5, 6, 2), V(6, 5, 2), V(3, 7, 1), V(3, 7, 1), V(7, 3, 1), V(4, 6, 1), V(4, 5, 2), V(5, 4, 2), V(3, 5, 2), V(5, 3, 2), V(6, 4, 1), V(0, 7, 1), V(4, 4, 1), V(2, 5, 1), V(5, 2, 1), V(0, 5, 1), V(4, 3, 1), V(3, 3, 1) ];
    const hufftab12 = [ PTR(16, 4), PTR(32, 4), PTR(48, 4), PTR(64, 2), PTR(68, 3), PTR(76, 1), V(1, 2, 4), V(2, 1, 4), PTR(78, 1), V(0, 0, 4), V(1, 1, 3), V(1, 1, 3), V(0, 1, 3), V(0, 1, 3), V(1, 0, 3), V(1, 0, 3), PTR(80, 2), PTR(84, 1), PTR(86, 1), PTR(88, 1), V(5, 6, 4), V(3, 7, 4), PTR(90, 1), V(2, 7, 4), V(7, 2, 4), V(4, 6, 4), V(6, 4, 4), V(1, 7, 4), V(7, 1, 4), PTR(92, 1), V(3, 6, 4), V(6, 3, 4), V(4, 5, 4), V(5, 4, 4), V(4, 4, 4), PTR(94, 1), V(2, 6, 3), V(2, 6, 3), V(6, 2, 3), V(6, 2, 3), V(6, 1, 3), V(6, 1, 3), V(1, 6, 4), V(6, 0, 4), V(3, 5, 4), V(5, 3, 4), V(2, 5, 4), V(5, 2, 4), V(1, 5, 3), V(1, 5, 3), V(5, 1, 3), V(5, 1, 3), V(3, 4, 3), V(3, 4, 3), V(4, 3, 3), V(4, 3, 3), V(5, 0, 4), V(0, 4, 4), V(2, 4, 3), V(2, 4, 3), V(4, 2, 3), V(4, 2, 3), V(1, 4, 3), V(1, 4, 3), V(3, 3, 2), V(4, 1, 2), V(2, 3, 2), V(3, 2, 2), V(4, 0, 3), V(0, 3, 3), V(3, 0, 2), V(3, 0, 2), V(1, 3, 1), V(1, 3, 1), V(1, 3, 1), V(1, 3, 1), V(3, 1, 1), V(2, 2, 1), V(0, 2, 1), V(2, 0, 1), V(7, 7, 2), V(6, 7, 2), V(7, 6, 1), V(7, 6, 1), V(5, 7, 1), V(7, 5, 1), V(6, 6, 1), V(4, 7, 1), V(7, 4, 1), V(6, 5, 1), V(7, 3, 1), V(5, 5, 1), V(0, 7, 1), V(7, 0, 1), V(0, 6, 1), V(0, 5, 1) ];
    const hufftab13 = [ PTR(16, 4), PTR(32, 4), PTR(48, 4), PTR(64, 2), V(1, 1, 4), V(0, 1, 4), V(1, 0, 3), V(1, 0, 3), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), PTR(68, 4), PTR(84, 4), PTR(100, 4), PTR(116, 4), PTR(132, 4), PTR(148, 4), PTR(164, 3), PTR(172, 3), PTR(180, 3), PTR(188, 3), PTR(196, 3), PTR(204, 3), PTR(212, 1), PTR(214, 2), PTR(218, 3), PTR(226, 1), PTR(228, 2), PTR(232, 2), PTR(236, 2), PTR(240, 2), V(8, 1, 4), PTR(244, 1), PTR(246, 1), PTR(248, 1), PTR(250, 2), PTR(254, 1), V(1, 5, 4), V(5, 1, 4), PTR(256, 1), PTR(258, 1), PTR(260, 1), V(1, 4, 4), V(4, 1, 3), V(4, 1, 3), V(0, 4, 4), V(4, 0, 4), V(2, 3, 4), V(3, 2, 4), V(1, 3, 3), V(1, 3, 3), V(3, 1, 3), V(3, 1, 3), V(0, 3, 3), V(0, 3, 3), V(3, 0, 3), V(3, 0, 3), V(2, 2, 3), V(2, 2, 3), V(1, 2, 2), V(2, 1, 2), V(0, 2, 2), V(2, 0, 2), PTR(262, 4), PTR(278, 4), PTR(294, 4), PTR(310, 3), PTR(318, 2), PTR(322, 2), PTR(326, 3), PTR(334, 2), PTR(338, 1), PTR(340, 2), PTR(344, 2), PTR(348, 2), PTR(352, 2), PTR(356, 2), V(1, 15, 4), V(15, 1, 4), V(15, 0, 4), PTR(360, 1), PTR(362, 1), PTR(364, 1), V(14, 2, 4), PTR(366, 1), V(1, 14, 4), V(14, 1, 4), PTR(368, 1), PTR(370, 1), PTR(372, 1), PTR(374, 1), PTR(376, 1), PTR(378, 1), V(12, 6, 4), V(3, 13, 4), PTR(380, 1), V(2, 13, 4), V(13, 2, 4), V(1, 13, 4), V(11, 7, 4), PTR(382, 1), PTR(384, 1), V(12, 3, 4), PTR(386, 1), V(4, 11, 4), V(13, 1, 3), V(13, 1, 3), V(0, 13, 4), V(13, 0, 4), V(8, 10, 4), V(10, 8, 4), V(4, 12, 4), V(12, 4, 4), V(6, 11, 4), V(11, 6, 4), V(3, 12, 3), V(3, 12, 3), V(2, 12, 3), V(2, 12, 3), V(12, 2, 3), V(12, 2, 3), V(5, 11, 3), V(5, 11, 3), V(11, 5, 4), V(8, 9, 4), V(1, 12, 3), V(1, 12, 3), V(12, 1, 3), V(12, 1, 3), V(9, 8, 4), V(0, 12, 4), V(12, 0, 3), V(12, 0, 3), V(11, 4, 4), V(6, 10, 4), V(10, 6, 4), V(7, 9, 4), V(3, 11, 3), V(3, 11, 3), V(11, 3, 3), V(11, 3, 3), V(8, 8, 4), V(5, 10, 4), V(2, 11, 3), V(2, 11, 3), V(10, 5, 4), V(6, 9, 4), V(10, 4, 3), V(10, 4, 3), V(7, 8, 4), V(8, 7, 4), V(9, 4, 3), V(9, 4, 3), V(7, 7, 4), V(7, 6, 4), V(11, 2, 2), V(11, 2, 2), V(11, 2, 2), V(11, 2, 2), V(1, 11, 2), V(1, 11, 2), V(11, 1, 2), V(11, 1, 2), V(0, 11, 3), V(11, 0, 3), V(9, 6, 3), V(4, 10, 3), V(3, 10, 3), V(10, 3, 3), V(5, 9, 3), V(9, 5, 3), V(2, 10, 2), V(2, 10, 2), V(10, 2, 2), V(10, 2, 2), V(1, 10, 2), V(1, 10, 2), V(10, 1, 2), V(10, 1, 2), V(0, 10, 3), V(6, 8, 3), V(10, 0, 2), V(10, 0, 2), V(8, 6, 3), V(4, 9, 3), V(9, 3, 2), V(9, 3, 2), V(3, 9, 3), V(5, 8, 3), V(8, 5, 3), V(6, 7, 3), V(2, 9, 2), V(2, 9, 2), V(9, 2, 2), V(9, 2, 2), V(5, 7, 3), V(7, 5, 3), V(3, 8, 2), V(3, 8, 2), V(8, 3, 2), V(8, 3, 2), V(6, 6, 3), V(4, 7, 3), V(7, 4, 3), V(5, 6, 3), V(6, 5, 3), V(7, 3, 3), V(1, 9, 1), V(9, 1, 1), V(0, 9, 2), V(9, 0, 2), V(4, 8, 2), V(8, 4, 2), V(7, 2, 2), V(7, 2, 2), V(4, 6, 3), V(6, 4, 3), V(2, 8, 1), V(2, 8, 1), V(2, 8, 1), V(2, 8, 1), V(8, 2, 1), V(1, 8, 1), V(3, 7, 2), V(2, 7, 2), V(1, 7, 1), V(1, 7, 1), V(7, 1, 1), V(7, 1, 1), V(5, 5, 2), V(0, 7, 2), V(7, 0, 2), V(3, 6, 2), V(6, 3, 2), V(4, 5, 2), V(5, 4, 2), V(2, 6, 2), V(6, 2, 2), V(3, 5, 2), V(0, 8, 1), V(8, 0, 1), V(1, 6, 1), V(6, 1, 1), V(0, 6, 1), V(6, 0, 1), V(5, 3, 2), V(4, 4, 2), V(2, 5, 1), V(2, 5, 1), V(5, 2, 1), V(0, 5, 1), V(3, 4, 1), V(4, 3, 1), V(5, 0, 1), V(2, 4, 1), V(4, 2, 1), V(3, 3, 1), PTR(388, 3), V(15, 15, 4), V(14, 15, 4), V(13, 15, 4), V(14, 14, 4), V(12, 15, 4), V(13, 14, 4), V(11, 15, 4), V(15, 11, 4), V(12, 14, 4), V(13, 12, 4), PTR(396, 1), V(14, 12, 3), V(14, 12, 3), V(13, 13, 3), V(13, 13, 3), V(15, 10, 4), V(12, 13, 4), V(11, 14, 3), V(11, 14, 3), V(14, 11, 3), V(14, 11, 3), V(9, 15, 3), V(9, 15, 3), V(15, 9, 3), V(15, 9, 3), V(14, 10, 3), V(14, 10, 3), V(11, 13, 3), V(11, 13, 3), V(13, 11, 3), V(13, 11, 3), V(8, 15, 3), V(8, 15, 3), V(15, 8, 3), V(15, 8, 3), V(12, 12, 3), V(12, 12, 3), V(10, 14, 4), V(9, 14, 4), V(8, 14, 3), V(8, 14, 3), V(7, 15, 4), V(7, 14, 4), V(15, 7, 2), V(15, 7, 2), V(15, 7, 2), V(15, 7, 2), V(13, 10, 2), V(13, 10, 2), V(10, 13, 3), V(11, 12, 3), V(12, 11, 3), V(15, 6, 3), V(6, 15, 2), V(6, 15, 2), V(14, 8, 2), V(5, 15, 2), V(9, 13, 2), V(13, 9, 2), V(15, 5, 2), V(14, 7, 2), V(10, 12, 2), V(11, 11, 2), V(4, 15, 2), V(4, 15, 2), V(15, 4, 2), V(15, 4, 2), V(12, 10, 3), V(14, 6, 3), V(15, 3, 2), V(15, 3, 2), V(3, 15, 1), V(3, 15, 1), V(8, 13, 2), V(13, 8, 2), V(2, 15, 1), V(15, 2, 1), V(6, 14, 2), V(9, 12, 2), V(0, 15, 1), V(0, 15, 1), V(12, 9, 2), V(5, 14, 2), V(10, 11, 1), V(10, 11, 1), V(7, 13, 2), V(13, 7, 2), V(4, 14, 1), V(4, 14, 1), V(12, 8, 2), V(13, 6, 2), V(3, 14, 1), V(3, 14, 1), V(11, 9, 1), V(11, 9, 1), V(9, 11, 2), V(10, 10, 2), V(11, 10, 1), V(14, 5, 1), V(14, 4, 1), V(8, 12, 1), V(6, 13, 1), V(14, 3, 1), V(2, 14, 1), V(0, 14, 1), V(14, 0, 1), V(5, 13, 1), V(13, 5, 1), V(7, 12, 1), V(12, 7, 1), V(4, 13, 1), V(8, 11, 1), V(11, 8, 1), V(13, 4, 1), V(9, 10, 1), V(10, 9, 1), V(6, 12, 1), V(13, 3, 1), V(7, 11, 1), V(5, 12, 1), V(12, 5, 1), V(9, 9, 1), V(7, 10, 1), V(10, 7, 1), V(9, 7, 1), V(15, 14, 3), V(15, 12, 3), V(15, 13, 2), V(15, 13, 2), V(14, 13, 1), V(14, 13, 1), V(14, 13, 1), V(14, 13, 1), V(10, 15, 1), V(14, 9, 1) ];
    const hufftab15 = [ PTR(16, 4), PTR(32, 4), PTR(48, 4), PTR(64, 4), PTR(80, 4), PTR(96, 3), PTR(104, 3), PTR(112, 2), PTR(116, 1), PTR(118, 1), V(1, 1, 3), V(1, 1, 3), V(0, 1, 4), V(1, 0, 4), V(0, 0, 3), V(0, 0, 3), PTR(120, 4), PTR(136, 4), PTR(152, 4), PTR(168, 4), PTR(184, 4), PTR(200, 3), PTR(208, 3), PTR(216, 4), PTR(232, 3), PTR(240, 3), PTR(248, 3), PTR(256, 3), PTR(264, 2), PTR(268, 3), PTR(276, 3), PTR(284, 2), PTR(288, 2), PTR(292, 2), PTR(296, 2), PTR(300, 2), PTR(304, 2), PTR(308, 2), PTR(312, 2), PTR(316, 2), PTR(320, 1), PTR(322, 1), PTR(324, 1), PTR(326, 2), PTR(330, 1), PTR(332, 1), PTR(334, 2), PTR(338, 1), PTR(340, 1), PTR(342, 1), V(9, 1, 4), PTR(344, 1), PTR(346, 1), PTR(348, 1), PTR(350, 1), PTR(352, 1), V(2, 8, 4), V(8, 2, 4), V(1, 8, 4), V(8, 1, 4), PTR(354, 1), PTR(356, 1), PTR(358, 1), PTR(360, 1), V(2, 7, 4), V(7, 2, 4), V(6, 4, 4), V(1, 7, 4), V(5, 5, 4), V(7, 1, 4), PTR(362, 1), V(3, 6, 4), V(6, 3, 4), V(4, 5, 4), V(5, 4, 4), V(2, 6, 4), V(6, 2, 4), V(1, 6, 4), PTR(364, 1), V(3, 5, 4), V(6, 1, 3), V(6, 1, 3), V(5, 3, 4), V(4, 4, 4), V(2, 5, 3), V(2, 5, 3), V(5, 2, 3), V(5, 2, 3), V(1, 5, 3), V(1, 5, 3), V(5, 1, 3), V(5, 1, 3), V(0, 5, 4), V(5, 0, 4), V(3, 4, 3), V(3, 4, 3), V(4, 3, 3), V(2, 4, 3), V(4, 2, 3), V(3, 3, 3), V(4, 1, 2), V(4, 1, 2), V(1, 4, 3), V(0, 4, 3), V(2, 3, 2), V(2, 3, 2), V(3, 2, 2), V(3, 2, 2), V(4, 0, 3), V(0, 3, 3), V(1, 3, 2), V(1, 3, 2), V(3, 1, 2), V(3, 0, 2), V(2, 2, 1), V(2, 2, 1), V(1, 2, 1), V(2, 1, 1), V(0, 2, 1), V(2, 0, 1), PTR(366, 1), PTR(368, 1), V(14, 14, 4), PTR(370, 1), PTR(372, 1), PTR(374, 1), V(15, 11, 4), PTR(376, 1), V(13, 13, 4), V(10, 15, 4), V(15, 10, 4), V(11, 14, 4), V(14, 11, 4), V(12, 13, 4), V(13, 12, 4), V(9, 15, 4), V(15, 9, 4), V(14, 10, 4), V(11, 13, 4), V(13, 11, 4), V(8, 15, 4), V(15, 8, 4), V(12, 12, 4), V(9, 14, 4), V(14, 9, 4), V(7, 15, 4), V(15, 7, 4), V(10, 13, 4), V(13, 10, 4), V(11, 12, 4), V(6, 15, 4), PTR(378, 1), V(12, 11, 3), V(12, 11, 3), V(15, 6, 3), V(15, 6, 3), V(8, 14, 4), V(14, 8, 4), V(5, 15, 4), V(9, 13, 4), V(15, 5, 3), V(15, 5, 3), V(7, 14, 3), V(7, 14, 3), V(14, 7, 3), V(14, 7, 3), V(10, 12, 3), V(10, 12, 3), V(12, 10, 3), V(12, 10, 3), V(11, 11, 3), V(11, 11, 3), V(13, 9, 4), V(8, 13, 4), V(4, 15, 3), V(4, 15, 3), V(15, 4, 3), V(15, 4, 3), V(3, 15, 3), V(3, 15, 3), V(15, 3, 3), V(15, 3, 3), V(13, 8, 3), V(13, 8, 3), V(14, 6, 3), V(14, 6, 3), V(2, 15, 3), V(2, 15, 3), V(15, 2, 3), V(15, 2, 3), V(6, 14, 4), V(15, 0, 4), V(1, 15, 3), V(1, 15, 3), V(15, 1, 3), V(15, 1, 3), V(9, 12, 3), V(9, 12, 3), V(12, 9, 3), V(12, 9, 3), V(5, 14, 3), V(10, 11, 3), V(11, 10, 3), V(14, 5, 3), V(7, 13, 3), V(13, 7, 3), V(4, 14, 3), V(14, 4, 3), V(8, 12, 3), V(12, 8, 3), V(3, 14, 3), V(6, 13, 3), V(13, 6, 3), V(14, 3, 3), V(9, 11, 3), V(11, 9, 3), V(2, 14, 3), V(2, 14, 3), V(10, 10, 3), V(10, 10, 3), V(14, 2, 3), V(14, 2, 3), V(1, 14, 3), V(1, 14, 3), V(14, 1, 3), V(14, 1, 3), V(0, 14, 4), V(14, 0, 4), V(5, 13, 3), V(5, 13, 3), V(13, 5, 3), V(13, 5, 3), V(7, 12, 3), V(12, 7, 3), V(4, 13, 3), V(8, 11, 3), V(13, 4, 2), V(13, 4, 2), V(11, 8, 3), V(9, 10, 3), V(10, 9, 3), V(6, 12, 3), V(12, 6, 3), V(3, 13, 3), V(13, 3, 2), V(13, 3, 2), V(13, 2, 2), V(13, 2, 2), V(2, 13, 3), V(0, 13, 3), V(1, 13, 2), V(1, 13, 2), V(7, 11, 2), V(7, 11, 2), V(11, 7, 2), V(11, 7, 2), V(13, 1, 2), V(13, 1, 2), V(5, 12, 3), V(13, 0, 3), V(12, 5, 2), V(12, 5, 2), V(8, 10, 2), V(8, 10, 2), V(10, 8, 2), V(4, 12, 2), V(12, 4, 2), V(6, 11, 2), V(11, 6, 2), V(11, 6, 2), V(9, 9, 3), V(0, 12, 3), V(3, 12, 2), V(3, 12, 2), V(12, 3, 2), V(12, 3, 2), V(7, 10, 2), V(7, 10, 2), V(10, 7, 2), V(10, 7, 2), V(10, 6, 2), V(10, 6, 2), V(12, 0, 3), V(0, 11, 3), V(12, 2, 1), V(12, 2, 1), V(2, 12, 2), V(5, 11, 2), V(11, 5, 2), V(1, 12, 2), V(8, 9, 2), V(9, 8, 2), V(12, 1, 2), V(4, 11, 2), V(11, 4, 2), V(6, 10, 2), V(3, 11, 2), V(7, 9, 2), V(11, 3, 1), V(11, 3, 1), V(9, 7, 2), V(8, 8, 2), V(2, 11, 2), V(5, 10, 2), V(11, 2, 1), V(11, 2, 1), V(10, 5, 2), V(1, 11, 2), V(11, 1, 1), V(11, 1, 1), V(11, 0, 2), V(6, 9, 2), V(9, 6, 2), V(4, 10, 2), V(10, 4, 2), V(7, 8, 2), V(8, 7, 2), V(3, 10, 2), V(10, 3, 1), V(10, 3, 1), V(5, 9, 1), V(9, 5, 1), V(2, 10, 1), V(10, 2, 1), V(1, 10, 1), V(10, 1, 1), V(0, 10, 2), V(10, 0, 2), V(6, 8, 1), V(6, 8, 1), V(8, 6, 1), V(4, 9, 1), V(9, 4, 1), V(3, 9, 1), V(9, 3, 1), V(9, 3, 1), V(7, 7, 2), V(0, 9, 2), V(5, 8, 1), V(8, 5, 1), V(2, 9, 1), V(6, 7, 1), V(7, 6, 1), V(9, 2, 1), V(1, 9, 1), V(9, 0, 1), V(4, 8, 1), V(8, 4, 1), V(5, 7, 1), V(7, 5, 1), V(3, 8, 1), V(8, 3, 1), V(6, 6, 1), V(4, 7, 1), V(7, 4, 1), V(0, 8, 1), V(8, 0, 1), V(5, 6, 1), V(6, 5, 1), V(3, 7, 1), V(7, 3, 1), V(4, 6, 1), V(0, 7, 1), V(7, 0, 1), V(0, 6, 1), V(6, 0, 1), V(15, 15, 1), V(14, 15, 1), V(15, 14, 1), V(13, 15, 1), V(15, 13, 1), V(12, 15, 1), V(15, 12, 1), V(13, 14, 1), V(14, 13, 1), V(11, 15, 1), V(12, 14, 1), V(14, 12, 1), V(10, 14, 1), V(0, 15, 1) ];
    const hufftab16 = [ PTR(16, 4), PTR(32, 4), PTR(48, 4), PTR(64, 2), V(1, 1, 4), V(0, 1, 4), V(1, 0, 3), V(1, 0, 3), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), V(0, 0, 1), PTR(68, 3), PTR(76, 3), PTR(84, 2), V(15, 15, 4), PTR(88, 2), PTR(92, 1), PTR(94, 4), V(15, 2, 4), PTR(110, 1), V(1, 15, 4), V(15, 1, 4), PTR(112, 4), PTR(128, 4), PTR(144, 4), PTR(160, 4), PTR(176, 4), PTR(192, 4), PTR(208, 3), PTR(216, 3), PTR(224, 3), PTR(232, 3), PTR(240, 3), PTR(248, 3), PTR(256, 3), PTR(264, 2), PTR(268, 2), PTR(272, 1), PTR(274, 2), PTR(278, 2), PTR(282, 1), V(5, 1, 4), PTR(284, 1), PTR(286, 1), PTR(288, 1), PTR(290, 1), V(1, 4, 4), V(4, 1, 4), PTR(292, 1), V(2, 3, 4), V(3, 2, 4), V(1, 3, 3), V(1, 3, 3), V(3, 1, 3), V(3, 1, 3), V(0, 3, 4), V(3, 0, 4), V(2, 2, 3), V(2, 2, 3), V(1, 2, 2), V(2, 1, 2), V(0, 2, 2), V(2, 0, 2), V(14, 15, 3), V(15, 14, 3), V(13, 15, 3), V(15, 13, 3), V(12, 15, 3), V(15, 12, 3), V(11, 15, 3), V(15, 11, 3), V(10, 15, 2), V(10, 15, 2), V(15, 10, 3), V(9, 15, 3), V(15, 9, 3), V(15, 8, 3), V(8, 15, 2), V(8, 15, 2), V(7, 15, 2), V(15, 7, 2), V(6, 15, 2), V(15, 6, 2), V(5, 15, 2), V(15, 5, 2), V(4, 15, 1), V(4, 15, 1), V(15, 4, 1), V(15, 3, 1), V(15, 0, 1), V(15, 0, 1), V(15, 0, 1), V(15, 0, 1), V(15, 0, 1), V(15, 0, 1), V(15, 0, 1), V(15, 0, 1), V(3, 15, 2), V(3, 15, 2), V(3, 15, 2), V(3, 15, 2), PTR(294, 4), PTR(310, 3), PTR(318, 3), PTR(326, 3), V(2, 15, 1), V(0, 15, 1), PTR(334, 2), PTR(338, 2), PTR(342, 2), PTR(346, 1), PTR(348, 2), PTR(352, 2), PTR(356, 1), PTR(358, 2), PTR(362, 2), PTR(366, 2), PTR(370, 2), V(14, 3, 4), PTR(374, 1), PTR(376, 1), PTR(378, 1), PTR(380, 1), PTR(382, 1), PTR(384, 1), PTR(386, 1), V(0, 13, 4), PTR(388, 1), PTR(390, 1), PTR(392, 1), V(3, 12, 4), PTR(394, 1), V(1, 12, 4), V(12, 0, 4), PTR(396, 1), V(14, 2, 3), V(14, 2, 3), V(2, 14, 4), V(1, 14, 4), V(13, 3, 4), V(2, 13, 4), V(13, 2, 4), V(13, 1, 4), V(3, 11, 4), PTR(398, 1), V(1, 13, 3), V(1, 13, 3), V(12, 4, 4), V(6, 11, 4), V(12, 3, 4), V(10, 7, 4), V(2, 12, 3), V(2, 12, 3), V(12, 2, 4), V(11, 5, 4), V(12, 1, 4), V(0, 12, 4), V(4, 11, 4), V(11, 4, 4), V(6, 10, 4), V(10, 6, 4), V(11, 3, 3), V(11, 3, 3), V(5, 10, 4), V(10, 5, 4), V(2, 11, 3), V(2, 11, 3), V(11, 2, 3), V(11, 2, 3), V(1, 11, 3), V(1, 11, 3), V(11, 1, 3), V(11, 1, 3), V(0, 11, 4), V(11, 0, 4), V(6, 9, 4), V(9, 6, 4), V(4, 10, 4), V(10, 4, 4), V(7, 8, 4), V(8, 7, 4), V(10, 3, 3), V(10, 3, 3), V(3, 10, 4), V(5, 9, 4), V(2, 10, 3), V(2, 10, 3), V(9, 5, 4), V(6, 8, 4), V(10, 1, 3), V(10, 1, 3), V(8, 6, 4), V(7, 7, 4), V(9, 4, 3), V(9, 4, 3), V(4, 9, 4), V(5, 7, 4), V(6, 7, 3), V(6, 7, 3), V(10, 2, 2), V(10, 2, 2), V(10, 2, 2), V(10, 2, 2), V(1, 10, 2), V(1, 10, 2), V(0, 10, 3), V(10, 0, 3), V(3, 9, 3), V(9, 3, 3), V(5, 8, 3), V(8, 5, 3), V(2, 9, 2), V(2, 9, 2), V(9, 2, 2), V(9, 2, 2), V(7, 6, 3), V(0, 9, 3), V(1, 9, 2), V(1, 9, 2), V(9, 1, 2), V(9, 1, 2), V(9, 0, 3), V(4, 8, 3), V(8, 4, 3), V(7, 5, 3), V(3, 8, 3), V(8, 3, 3), V(6, 6, 3), V(2, 8, 3), V(8, 2, 2), V(8, 2, 2), V(4, 7, 3), V(7, 4, 3), V(1, 8, 2), V(1, 8, 2), V(8, 1, 2), V(8, 1, 2), V(8, 0, 2), V(8, 0, 2), V(0, 8, 3), V(5, 6, 3), V(3, 7, 2), V(3, 7, 2), V(7, 3, 2), V(7, 3, 2), V(6, 5, 3), V(4, 6, 3), V(2, 7, 2), V(2, 7, 2), V(7, 2, 2), V(7, 2, 2), V(6, 4, 3), V(5, 5, 3), V(0, 7, 2), V(0, 7, 2), V(1, 7, 1), V(1, 7, 1), V(1, 7, 1), V(1, 7, 1), V(7, 1, 1), V(7, 1, 1), V(7, 0, 2), V(3, 6, 2), V(6, 3, 2), V(4, 5, 2), V(5, 4, 2), V(2, 6, 2), V(6, 2, 1), V(1, 6, 1), V(6, 1, 1), V(6, 1, 1), V(0, 6, 2), V(6, 0, 2), V(5, 3, 1), V(5, 3, 1), V(3, 5, 2), V(4, 4, 2), V(2, 5, 1), V(5, 2, 1), V(1, 5, 1), V(0, 5, 1), V(3, 4, 1), V(4, 3, 1), V(5, 0, 1), V(2, 4, 1), V(4, 2, 1), V(3, 3, 1), V(0, 4, 1), V(4, 0, 1), V(12, 14, 4), PTR(400, 1), V(13, 14, 3), V(13, 14, 3), V(14, 9, 3), V(14, 9, 3), V(14, 10, 4), V(13, 9, 4), V(14, 14, 2), V(14, 14, 2), V(14, 14, 2), V(14, 14, 2), V(14, 13, 3), V(14, 13, 3), V(14, 11, 3), V(14, 11, 3), V(11, 14, 2), V(11, 14, 2), V(12, 13, 2), V(12, 13, 2), V(13, 12, 3), V(13, 11, 3), V(10, 14, 2), V(10, 14, 2), V(12, 12, 2), V(12, 12, 2), V(10, 13, 3), V(13, 10, 3), V(7, 14, 3), V(10, 12, 3), V(12, 10, 2), V(12, 10, 2), V(12, 9, 3), V(7, 13, 3), V(5, 14, 2), V(5, 14, 2), V(11, 13, 1), V(11, 13, 1), V(11, 13, 1), V(11, 13, 1), V(9, 14, 1), V(9, 14, 1), V(11, 12, 2), V(12, 11, 2), V(8, 14, 2), V(14, 8, 2), V(9, 13, 2), V(14, 7, 2), V(11, 11, 2), V(8, 13, 2), V(13, 8, 2), V(6, 14, 2), V(14, 6, 1), V(9, 12, 1), V(10, 11, 2), V(11, 10, 2), V(14, 5, 2), V(13, 7, 2), V(4, 14, 1), V(4, 14, 1), V(14, 4, 2), V(8, 12, 2), V(12, 8, 1), V(3, 14, 1), V(6, 13, 1), V(6, 13, 1), V(13, 6, 2), V(9, 11, 2), V(11, 9, 2), V(10, 10, 2), V(14, 1, 1), V(14, 1, 1), V(13, 4, 1), V(13, 4, 1), V(11, 8, 2), V(10, 9, 2), V(7, 11, 1), V(7, 11, 1), V(11, 7, 2), V(13, 0, 2), V(0, 14, 1), V(14, 0, 1), V(5, 13, 1), V(13, 5, 1), V(7, 12, 1), V(12, 7, 1), V(4, 13, 1), V(8, 11, 1), V(9, 10, 1), V(6, 12, 1), V(12, 6, 1), V(3, 13, 1), V(5, 12, 1), V(12, 5, 1), V(8, 10, 1), V(10, 8, 1), V(9, 9, 1), V(4, 12, 1), V(11, 6, 1), V(7, 10, 1), V(5, 11, 1), V(8, 9, 1), V(9, 8, 1), V(7, 9, 1), V(9, 7, 1), V(8, 8, 1), V(14, 12, 1), V(13, 13, 1) ];
    const hufftab24 = [ PTR(16, 4), PTR(32, 4), PTR(48, 4), V(15, 15, 4), PTR(64, 4), PTR(80, 4), PTR(96, 4), PTR(112, 4), PTR(128, 4), PTR(144, 4), PTR(160, 3), PTR(168, 2), V(1, 1, 4), V(0, 1, 4), V(1, 0, 4), V(0, 0, 4), V(14, 15, 4), V(15, 14, 4), V(13, 15, 4), V(15, 13, 4), V(12, 15, 4), V(15, 12, 4), V(11, 15, 4), V(15, 11, 4), V(15, 10, 3), V(15, 10, 3), V(10, 15, 4), V(9, 15, 4), V(15, 9, 3), V(15, 9, 3), V(15, 8, 3), V(15, 8, 3), V(8, 15, 4), V(7, 15, 4), V(15, 7, 3), V(15, 7, 3), V(6, 15, 3), V(6, 15, 3), V(15, 6, 3), V(15, 6, 3), V(5, 15, 3), V(5, 15, 3), V(15, 5, 3), V(15, 5, 3), V(4, 15, 3), V(4, 15, 3), V(15, 4, 3), V(15, 4, 3), V(3, 15, 3), V(3, 15, 3), V(15, 3, 3), V(15, 3, 3), V(2, 15, 3), V(2, 15, 3), V(15, 2, 3), V(15, 2, 3), V(15, 1, 3), V(15, 1, 3), V(1, 15, 4), V(15, 0, 4), PTR(172, 3), PTR(180, 3), PTR(188, 3), PTR(196, 3), PTR(204, 4), PTR(220, 3), PTR(228, 3), PTR(236, 3), PTR(244, 2), PTR(248, 2), PTR(252, 2), PTR(256, 2), PTR(260, 2), PTR(264, 2), PTR(268, 2), PTR(272, 2), PTR(276, 2), PTR(280, 3), PTR(288, 2), PTR(292, 2), PTR(296, 2), PTR(300, 3), PTR(308, 2), PTR(312, 3), PTR(320, 1), PTR(322, 2), PTR(326, 2), PTR(330, 1), PTR(332, 2), PTR(336, 1), PTR(338, 1), PTR(340, 1), PTR(342, 1), PTR(344, 1), PTR(346, 1), PTR(348, 1), PTR(350, 1), PTR(352, 1), PTR(354, 1), PTR(356, 1), PTR(358, 1), PTR(360, 1), PTR(362, 1), PTR(364, 1), PTR(366, 1), PTR(368, 1), PTR(370, 2), PTR(374, 1), PTR(376, 2), V(7, 3, 4), PTR(380, 1), V(7, 2, 4), V(4, 6, 4), V(6, 4, 4), V(5, 5, 4), V(7, 1, 4), V(3, 6, 4), V(6, 3, 4), V(4, 5, 4), V(5, 4, 4), V(2, 6, 4), V(6, 2, 4), V(1, 6, 4), V(6, 1, 4), PTR(382, 1), V(3, 5, 4), V(5, 3, 4), V(4, 4, 4), V(2, 5, 4), V(5, 2, 4), V(1, 5, 4), PTR(384, 1), V(5, 1, 3), V(5, 1, 3), V(3, 4, 4), V(4, 3, 4), V(2, 4, 3), V(2, 4, 3), V(4, 2, 3), V(4, 2, 3), V(3, 3, 3), V(3, 3, 3), V(1, 4, 3), V(1, 4, 3), V(4, 1, 3), V(4, 1, 3), V(0, 4, 4), V(4, 0, 4), V(2, 3, 3), V(2, 3, 3), V(3, 2, 3), V(3, 2, 3), V(1, 3, 2), V(1, 3, 2), V(1, 3, 2), V(1, 3, 2), V(3, 1, 2), V(3, 1, 2), V(3, 1, 2), V(3, 1, 2), V(0, 3, 3), V(3, 0, 3), V(2, 2, 2), V(2, 2, 2), V(1, 2, 1), V(1, 2, 1), V(1, 2, 1), V(1, 2, 1), V(2, 1, 1), V(2, 1, 1), V(0, 2, 2), V(2, 0, 2), V(0, 15, 1), V(0, 15, 1), V(0, 15, 1), V(0, 15, 1), V(14, 14, 3), V(13, 14, 3), V(14, 13, 3), V(12, 14, 3), V(14, 12, 3), V(13, 13, 3), V(11, 14, 3), V(14, 11, 3), V(12, 13, 3), V(13, 12, 3), V(10, 14, 3), V(14, 10, 3), V(11, 13, 3), V(13, 11, 3), V(12, 12, 3), V(9, 14, 3), V(14, 9, 3), V(10, 13, 3), V(13, 10, 3), V(11, 12, 3), V(12, 11, 3), V(8, 14, 3), V(14, 8, 3), V(9, 13, 3), V(13, 9, 3), V(7, 14, 3), V(14, 7, 3), V(10, 12, 3), V(12, 10, 3), V(12, 10, 3), V(11, 11, 3), V(11, 11, 3), V(8, 13, 3), V(8, 13, 3), V(13, 8, 3), V(13, 8, 3), V(0, 14, 4), V(14, 0, 4), V(0, 13, 3), V(0, 13, 3), V(14, 6, 2), V(14, 6, 2), V(14, 6, 2), V(14, 6, 2), V(6, 14, 3), V(9, 12, 3), V(12, 9, 2), V(12, 9, 2), V(5, 14, 2), V(5, 14, 2), V(11, 10, 2), V(11, 10, 2), V(14, 5, 2), V(14, 5, 2), V(10, 11, 3), V(7, 13, 3), V(13, 7, 2), V(13, 7, 2), V(14, 4, 2), V(14, 4, 2), V(8, 12, 2), V(8, 12, 2), V(12, 8, 2), V(12, 8, 2), V(4, 14, 3), V(2, 14, 3), V(3, 14, 2), V(3, 14, 2), V(6, 13, 2), V(13, 6, 2), V(14, 3, 2), V(9, 11, 2), V(11, 9, 2), V(10, 10, 2), V(14, 2, 2), V(1, 14, 2), V(14, 1, 2), V(5, 13, 2), V(13, 5, 2), V(7, 12, 2), V(12, 7, 2), V(4, 13, 2), V(8, 11, 2), V(11, 8, 2), V(13, 4, 2), V(9, 10, 2), V(10, 9, 2), V(6, 12, 2), V(12, 6, 2), V(3, 13, 2), V(13, 3, 2), V(2, 13, 2), V(13, 2, 2), V(1, 13, 2), V(7, 11, 2), V(11, 7, 2), V(13, 1, 2), V(5, 12, 2), V(12, 5, 2), V(8, 10, 2), V(10, 8, 2), V(9, 9, 2), V(4, 12, 2), V(12, 4, 2), V(6, 11, 2), V(6, 11, 2), V(11, 6, 2), V(11, 6, 2), V(13, 0, 3), V(0, 12, 3), V(3, 12, 2), V(3, 12, 2), V(12, 3, 2), V(7, 10, 2), V(10, 7, 2), V(2, 12, 2), V(12, 2, 2), V(5, 11, 2), V(11, 5, 2), V(1, 12, 2), V(8, 9, 2), V(9, 8, 2), V(12, 1, 2), V(4, 11, 2), V(12, 0, 3), V(0, 11, 3), V(3, 11, 2), V(3, 11, 2), V(11, 0, 3), V(0, 10, 3), V(1, 10, 2), V(1, 10, 2), V(11, 4, 1), V(11, 4, 1), V(6, 10, 2), V(10, 6, 2), V(7, 9, 2), V(7, 9, 2), V(9, 7, 2), V(9, 7, 2), V(10, 0, 3), V(0, 9, 3), V(9, 0, 2), V(9, 0, 2), V(11, 3, 1), V(8, 8, 1), V(2, 11, 2), V(5, 10, 2), V(11, 2, 1), V(11, 2, 1), V(10, 5, 2), V(1, 11, 2), V(11, 1, 2), V(6, 9, 2), V(9, 6, 1), V(10, 4, 1), V(4, 10, 2), V(7, 8, 2), V(8, 7, 1), V(8, 7, 1), V(3, 10, 1), V(10, 3, 1), V(5, 9, 1), V(9, 5, 1), V(2, 10, 1), V(10, 2, 1), V(10, 1, 1), V(6, 8, 1), V(8, 6, 1), V(7, 7, 1), V(4, 9, 1), V(9, 4, 1), V(3, 9, 1), V(9, 3, 1), V(5, 8, 1), V(8, 5, 1), V(2, 9, 1), V(6, 7, 1), V(7, 6, 1), V(9, 2, 1), V(1, 9, 1), V(9, 1, 1), V(4, 8, 1), V(8, 4, 1), V(5, 7, 1), V(7, 5, 1), V(3, 8, 1), V(8, 3, 1), V(6, 6, 1), V(2, 8, 1), V(8, 2, 1), V(1, 8, 1), V(4, 7, 1), V(7, 4, 1), V(8, 1, 1), V(8, 1, 1), V(0, 8, 2), V(8, 0, 2), V(5, 6, 1), V(6, 5, 1), V(1, 7, 1), V(1, 7, 1), V(0, 7, 2), V(7, 0, 2), V(3, 7, 1), V(2, 7, 1), V(0, 6, 1), V(6, 0, 1), V(0, 5, 1), V(5, 0, 1) ];
    function MP3Hufftable(table, linbits, startbits) {
        this.table = table;
        this.linbits = linbits;
        this.startbits = startbits;
    }
    const huff_quad_table = [ hufftabA, hufftabB ];
    const huff_pair_table = [ new MP3Hufftable(hufftab0, 0, 0), new MP3Hufftable(hufftab1, 0, 3), new MP3Hufftable(hufftab2, 0, 3), new MP3Hufftable(hufftab3, 0, 3), null, new MP3Hufftable(hufftab5, 0, 3), new MP3Hufftable(hufftab6, 0, 4), new MP3Hufftable(hufftab7, 0, 4), new MP3Hufftable(hufftab8, 0, 4), new MP3Hufftable(hufftab9, 0, 4), new MP3Hufftable(hufftab10, 0, 4), new MP3Hufftable(hufftab11, 0, 4), new MP3Hufftable(hufftab12, 0, 4), new MP3Hufftable(hufftab13, 0, 4), null, new MP3Hufftable(hufftab15, 0, 4), new MP3Hufftable(hufftab16, 1, 4), new MP3Hufftable(hufftab16, 2, 4), new MP3Hufftable(hufftab16, 3, 4), new MP3Hufftable(hufftab16, 4, 4), new MP3Hufftable(hufftab16, 6, 4), new MP3Hufftable(hufftab16, 8, 4), new MP3Hufftable(hufftab16, 10, 4), new MP3Hufftable(hufftab16, 13, 4), new MP3Hufftable(hufftab24, 4, 4), new MP3Hufftable(hufftab24, 5, 4), new MP3Hufftable(hufftab24, 6, 4), new MP3Hufftable(hufftab24, 7, 4), new MP3Hufftable(hufftab24, 8, 4), new MP3Hufftable(hufftab24, 9, 4), new MP3Hufftable(hufftab24, 11, 4), new MP3Hufftable(hufftab24, 13, 4) ];
    var IMDCT = function() {
        function IMDCT() {
            this.tmp_imdct36 = new Float64Array(18);
            this.tmp_dctIV = new Float64Array(18);
            this.tmp_sdctII = new Float64Array(9);
        }
        IMDCT.prototype.imdct36 = function(x, y) {
            var tmp = this.tmp_imdct36;
            this.dctIV(x, tmp);
            for (var i = 0; i < 9; ++i) {
                y[i] = tmp[9 + i];
            }
            for (var i = 9; i < 27; ++i) {
                y[i] = -tmp[36 - (9 + i) - 1];
            }
            for (var i = 27; i < 36; ++i) {
                y[i] = -tmp[i - 27];
            }
        };
        var dctIV_scale = [];
        for (i = 0; i < 18; i++) {
            dctIV_scale[i] = 2 * Math.cos(Math.PI * (2 * i + 1) / (4 * 18));
        }
        IMDCT.prototype.dctIV = function(y, X) {
            var tmp = this.tmp_dctIV;
            for (var i = 0; i < 18; ++i) {
                tmp[i] = y[i] * dctIV_scale[i];
            }
            this.sdctII(tmp, X);
            X[0] /= 2;
            for (var i = 1; i < 18; ++i) {
                X[i] = X[i] / 2 - X[i - 1];
            }
        };
        var sdctII_scale = [];
        for (var i = 0; i < 9; ++i) {
            sdctII_scale[i] = 2 * Math.cos(Math.PI * (2 * i + 1) / (2 * 18));
        }
        IMDCT.prototype.sdctII = function(x, X) {
            var tmp = this.tmp_sdctII;
            for (var i = 0; i < 9; ++i) {
                tmp[i] = x[i] + x[18 - i - 1];
            }
            fastsdct(tmp, X, 0);
            for (var i = 0; i < 9; ++i) {
                tmp[i] = (x[i] - x[18 - i - 1]) * sdctII_scale[i];
            }
            fastsdct(tmp, X, 1);
            for (var i = 3; i < 18; i += 2) {
                X[i] -= X[i - 2];
            }
        };
        var c0 = 2 * Math.cos(1 * Math.PI / 18);
        var c1 = 2 * Math.cos(3 * Math.PI / 18);
        var c2 = 2 * Math.cos(4 * Math.PI / 18);
        var c3 = 2 * Math.cos(5 * Math.PI / 18);
        var c4 = 2 * Math.cos(7 * Math.PI / 18);
        var c5 = 2 * Math.cos(8 * Math.PI / 18);
        var c6 = 2 * Math.cos(16 * Math.PI / 18);
        function fastsdct(x, y, offset) {
            var a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12;
            var a13, a14, a15, a16, a17, a18, a19, a20, a21, a22, a23, a24, a25;
            var m0, m1, m2, m3, m4, m5, m6, m7;
            a0 = x[3] + x[5];
            a1 = x[3] - x[5];
            a2 = x[6] + x[2];
            a3 = x[6] - x[2];
            a4 = x[1] + x[7];
            a5 = x[1] - x[7];
            a6 = x[8] + x[0];
            a7 = x[8] - x[0];
            a8 = a0 + a2;
            a9 = a0 - a2;
            a10 = a0 - a6;
            a11 = a2 - a6;
            a12 = a8 + a6;
            a13 = a1 - a3;
            a14 = a13 + a7;
            a15 = a3 + a7;
            a16 = a1 - a7;
            a17 = a1 + a3;
            m0 = a17 * -c3;
            m1 = a16 * -c0;
            m2 = a15 * -c4;
            m3 = a14 * -c1;
            m4 = a5 * -c1;
            m5 = a11 * -c6;
            m6 = a10 * -c5;
            m7 = a9 * -c2;
            a18 = x[4] + a4;
            a19 = 2 * x[4] - a4;
            a20 = a19 + m5;
            a21 = a19 - m5;
            a22 = a19 + m6;
            a23 = m4 + m2;
            a24 = m4 - m2;
            a25 = m4 + m1;
            y[offset + 0] = a18 + a12;
            y[offset + 2] = m0 - a25;
            y[offset + 4] = m7 - a20;
            y[offset + 6] = m3;
            y[offset + 8] = a21 - m6;
            y[offset + 10] = a24 - m1;
            y[offset + 12] = a12 - 2 * a18;
            y[offset + 14] = a23 + m0;
            y[offset + 16] = a22 + m7;
        }
        return IMDCT;
    }();
    const IMDCT_S = [ [ .608761429, -.923879533, -.130526192, .991444861, -.382683432, -.79335334 ], [ -.79335334, .382683432, .991444861, .130526192, -.923879533, -.608761429 ], [ .382683432, -.923879533, .923879533, -.382683432, -.382683432, .923879533 ], [ -.923879533, -.382683432, .382683432, .923879533, .923879533, .382683432 ], [ .130526192, -.382683432, .608761429, -.79335334, .923879533, -.991444861 ], [ -.991444861, -.923879533, -.79335334, -.608761429, -.382683432, -.130526192 ] ];
    function MP3SideInfo() {
        this.main_data_begin = null;
        this.private_bits = null;
        this.gr = [ new MP3Granule, new MP3Granule ];
        this.scfsi = new Uint8Array(2);
    }
    function MP3Granule() {
        this.ch = [ new MP3Channel, new MP3Channel ];
    }
    function MP3Channel() {
        this.part2_3_length = null;
        this.big_values = null;
        this.global_gain = null;
        this.scalefac_compress = null;
        this.flags = null;
        this.block_type = null;
        this.table_select = new Uint8Array(3);
        this.subblock_gain = new Uint8Array(3);
        this.region0_count = null;
        this.region1_count = null;
        this.scalefac = new Uint8Array(39);
    }
    function Layer3() {
        this.imdct = new IMDCT;
        this.xr = [ new Float64Array(576), new Float64Array(576) ];
        this._exponents = new Int32Array(39);
        this.reqcache = new Float64Array(16);
        this.modes = new Int16Array(39);
        this.output = new Float64Array(36);
        this.tmp = makeArray([ 32, 3, 6 ]);
        this.tmp2 = new Float64Array(32 * 3 * 6);
    }
    Layer3.prototype.decode = function(stream, frame) {
        var header = frame.header;
        var next_md_begin = 0;
        var md_len = 0;
        var result = 0;
        var nch = header.nchannels();
        var si_len = header.flags & FLAGS.LSF_EXT ? nch === 1 ? 9 : 17 : nch === 1 ? 17 : 32;
        if (stream.next_frame - stream.nextByte() < si_len) {
            stream.error = MP3Stream.ERROR.BADFRAMELEN;
            stream.md_len = 0;
            return -1;
        }
        if (header.flags & FLAGS.PROTECTION) {}
        var sideInfo = this.sideInfo(stream, nch, header.flags & FLAGS.LSF_EXT);
        if (stream.error !== MP3Stream.ERROR.NONE) result = -1;
        var si = sideInfo.si;
        var data_bitlen = sideInfo.data_bitlen;
        var priv_bitlen = sideInfo.priv_bitlen;
        header.flags |= priv_bitlen;
        header.private_bits |= si.private_bits;
        var peek = stream.copy();
        peek.advance(stream.next_frame * 8 - peek.offset());
        var nextHeader = peek.read(32);
        if (this.bitwiseAnd(nextHeader, 4293263360) === 4293001216) {
            if (!this.bitwiseAnd(nextHeader, 65536)) peek.advance(16);
            next_md_begin = peek.read(this.bitwiseAnd(nextHeader, 524288) ? 9 : 8);
        }
        var frame_space = stream.next_frame - stream.nextByte();
        if (next_md_begin > si.main_data_begin + frame_space) {
            next_md_begin = 0;
        }
        var md_len = si.main_data_begin + frame_space - next_md_begin;
        var frame_used = 0;
        var ptr;
        if (si.main_data_begin === 0) {
            ptr = stream.stream;
            stream.md_len = 0;
            frame_used = md_len;
        } else {
            if (si.main_data_begin > stream.md_len) {
                if (result === 0) {
                    stream.error = MP3Stream.ERROR.BADDATAPTR;
                    result = -1;
                }
            } else {
                var old_md_len = stream.md_len;
                if (md_len > si.main_data_begin) {
                    if (stream.md_len + md_len - si.main_data_begin > BUFFER_MDLEN) {
                        throw new Error("Assertion failed: (stream.md_len + md_len - si.main_data_begin <= MAD_BUFFER_MDLEN)");
                    }
                    frame_used = md_len - si.main_data_begin;
                    this.memcpy(stream.main_data, stream.md_len, stream.stream.stream, stream.nextByte(), frame_used);
                    stream.md_len += frame_used;
                }
                ptr = new Bitstream(Stream.fromBuffer(new Buffer(stream.main_data)));
                ptr.advance((old_md_len - si.main_data_begin) * 8);
            }
        }
        var frame_free = frame_space - frame_used;
        if (result === 0) {
            var error = this.decodeMainData(ptr, frame, si, nch);
            if (error) {
                stream.error = error;
                result = -1;
            }
        }
        if (frame_free >= next_md_begin) {
            this.memcpy(stream.main_data, 0, stream.stream.stream, stream.next_frame - next_md_begin, next_md_begin);
            stream.md_len = next_md_begin;
        } else {
            if (md_len < si.main_data_begin) {
                var extra = si.main_data_begin - md_len;
                if (extra + frame_free > next_md_begin) extra = next_md_begin - frame_free;
                if (extra < stream.md_len) {
                    this.memcpy(stream.main_data, 0, stream.main_data, stream.md_len - extra, extra);
                    stream.md_len = extra;
                }
            } else {
                stream.md_len = 0;
            }
            this.memcpy(stream.main_data, stream.md_len, stream.stream.stream, stream.next_frame - frame_free, frame_free);
            stream.md_len += frame_free;
        }
        return result;
    };
    Layer3.prototype.memcpy = function(dst, dstOffset, pSrc, srcOffset, length) {
        var subarr;
        if (pSrc.subarray) subarr = pSrc.subarray(srcOffset, srcOffset + length); else subarr = pSrc.peekBuffer(srcOffset - pSrc.offset, length).data;
        dst.set(subarr, dstOffset);
        return dst;
    };
    Layer3.prototype.bitwiseAnd = function(a, b) {
        var w = 2147483648;
        var aHI = a / w << 0;
        var aLO = a % w;
        var bHI = b / w << 0;
        var bLO = b % w;
        return (aHI & bHI) * w + (aLO & bLO);
    };
    Layer3.prototype.sideInfo = function(stream, nch, lsf) {
        var si = new MP3SideInfo;
        var result = MP3Stream.ERROR.NONE;
        var data_bitlen = 0;
        var priv_bitlen = lsf ? nch === 1 ? 1 : 2 : nch === 1 ? 5 : 3;
        si.main_data_begin = stream.read(lsf ? 8 : 9);
        si.private_bits = stream.read(priv_bitlen);
        var ngr = 1;
        if (!lsf) {
            ngr = 2;
            for (var ch = 0; ch < nch; ++ch) si.scfsi[ch] = stream.read(4);
        }
        for (var gr = 0; gr < ngr; gr++) {
            var granule = si.gr[gr];
            for (var ch = 0; ch < nch; ch++) {
                var channel = granule.ch[ch];
                channel.part2_3_length = stream.read(12);
                channel.big_values = stream.read(9);
                channel.global_gain = stream.read(8);
                channel.scalefac_compress = stream.read(lsf ? 9 : 4);
                data_bitlen += channel.part2_3_length;
                if (channel.big_values > 288 && result === 0) result = MP3Stream.ERROR.BADBIGVALUES;
                channel.flags = 0;
                if (stream.readOne()) {
                    channel.block_type = stream.readSmall(2);
                    if (channel.block_type === 0 && result === 0) result = MP3Stream.ERROR.BADBLOCKTYPE;
                    if (!lsf && channel.block_type === 2 && si.scfsi[ch] && result === 0) result = MP3Stream.ERROR.BADSCFSI;
                    channel.region0_count = 7;
                    channel.region1_count = 36;
                    if (stream.readOne()) channel.flags |= MIXED_BLOCK_FLAG; else if (channel.block_type === 2) channel.region0_count = 8;
                    for (var i = 0; i < 2; i++) channel.table_select[i] = stream.read(5);
                    for (var i = 0; i < 3; i++) channel.subblock_gain[i] = stream.read(3);
                } else {
                    channel.block_type = 0;
                    for (var i = 0; i < 3; i++) channel.table_select[i] = stream.read(5);
                    channel.region0_count = stream.read(4);
                    channel.region1_count = stream.read(3);
                }
                channel.flags |= stream.read(lsf ? 2 : 3);
            }
        }
        if (result !== MP3Stream.ERROR.NONE) stream.error = result;
        return {
            si: si,
            data_bitlen: data_bitlen,
            priv_bitlen: priv_bitlen
        };
    };
    Layer3.prototype.decodeMainData = function(stream, frame, si, nch) {
        var header = frame.header;
        var sfreq = header.samplerate;
        if (header.flags & FLAGS.MPEG_2_5_EXT) sfreq *= 2;
        var sfreqi = (sfreq >> 7 & 15) + (sfreq >> 15 & 1) - 8;
        if (header.flags & FLAGS.MPEG_2_5_EXT) sfreqi += 3;
        var ngr = header.flags & FLAGS.LSF_EXT ? 1 : 2;
        var xr = this.xr;
        for (var gr = 0; gr < ngr; ++gr) {
            var granule = si.gr[gr];
            var sfbwidth = [];
            var l = 0;
            for (var ch = 0; ch < nch; ++ch) {
                var channel = granule.ch[ch];
                var part2_length;
                sfbwidth[ch] = SFBWIDTH_TABLE[sfreqi].l;
                if (channel.block_type === 2) {
                    sfbwidth[ch] = channel.flags & MIXED_BLOCK_FLAG ? SFBWIDTH_TABLE[sfreqi].m : SFBWIDTH_TABLE[sfreqi].s;
                }
                if (header.flags & FLAGS.LSF_EXT) {
                    part2_length = this.scalefactors_lsf(stream, channel, ch === 0 ? 0 : si.gr[1].ch[1], header.mode_extension);
                } else {
                    part2_length = this.scalefactors(stream, channel, si.gr[0].ch[ch], gr === 0 ? 0 : si.scfsi[ch]);
                }
                var error = this.huffmanDecode(stream, xr[ch], channel, sfbwidth[ch], part2_length);
                if (error) return error;
            }
            if (header.mode === MODE.JOINT_STEREO && header.mode_extension !== 0) {
                var error = this.stereo(xr, si.gr, gr, header, sfbwidth[0]);
                if (error) return error;
            }
            for (var ch = 0; ch < nch; ch++) {
                var channel = granule.ch[ch];
                var sample = frame.sbsample[ch].slice(18 * gr);
                var sb, l = 0, i, sblimit;
                var output = this.output;
                if (channel.block_type === 2) {
                    this.reorder(xr[ch], channel, sfbwidth[ch]);
                    if (channel.flags & MIXED_BLOCK_FLAG) this.aliasreduce(xr[ch], 36);
                } else {
                    this.aliasreduce(xr[ch], 576);
                }
                if (channel.block_type !== 2 || channel.flags & MIXED_BLOCK_FLAG) {
                    var block_type = channel.block_type;
                    if (channel.flags & MIXED_BLOCK_FLAG) block_type = 0;
                    for (var sb = 0; sb < 2; ++sb, l += 18) {
                        this.imdct_l(xr[ch].subarray(l, l + 18), output, block_type);
                        this.overlap(output, frame.overlap[ch][sb], sample, sb);
                    }
                } else {
                    for (var sb = 0; sb < 2; ++sb, l += 18) {
                        this.imdct_s(xr[ch].subarray(l, l + 18), output);
                        this.overlap(output, frame.overlap[ch][sb], sample, sb);
                    }
                }
                this.freqinver(sample, 1);
                var i = 576;
                while (i > 36 && xr[ch][i - 1] === 0) {
                    --i;
                }
                sblimit = 32 - ((576 - i) / 18 << 0);
                if (channel.block_type !== 2) {
                    for (var sb = 2; sb < sblimit; ++sb, l += 18) {
                        this.imdct_l(xr[ch].subarray(l, l + 18), output, channel.block_type);
                        this.overlap(output, frame.overlap[ch][sb], sample, sb);
                        if (sb & 1) this.freqinver(sample, sb);
                    }
                } else {
                    for (var sb = 2; sb < sblimit; ++sb, l += 18) {
                        this.imdct_s(xr[ch].subarray(l, l + 18), output);
                        this.overlap(output, frame.overlap[ch][sb], sample, sb);
                        if (sb & 1) this.freqinver(sample, sb);
                    }
                }
                for (var sb = sblimit; sb < 32; ++sb) {
                    this.overlap_z(frame.overlap[ch][sb], sample, sb);
                    if (sb & 1) this.freqinver(sample, sb);
                }
            }
        }
        return MP3Stream.ERROR.NONE;
    };
    Layer3.prototype.scalefactors = function(stream, channel, gr0ch, scfsi) {
        var start = stream.offset();
        var slen1 = SFLEN_TABLE[channel.scalefac_compress].slen1;
        var slen2 = SFLEN_TABLE[channel.scalefac_compress].slen2;
        var sfbi;
        if (channel.block_type === 2) {
            sfbi = 0;
            var nsfb = channel.flags & MIXED_BLOCK_FLAG ? 8 + 3 * 3 : 6 * 3;
            while (nsfb--) channel.scalefac[sfbi++] = stream.read(slen1);
            nsfb = 6 * 3;
            while (nsfb--) channel.scalefac[sfbi++] = stream.read(slen2);
            nsfb = 1 * 3;
            while (nsfb--) channel.scalefac[sfbi++] = 0;
        } else {
            if (scfsi & 8) {
                for (var sfbi = 0; sfbi < 6; ++sfbi) channel.scalefac[sfbi] = gr0ch.scalefac[sfbi];
            } else {
                for (var sfbi = 0; sfbi < 6; ++sfbi) channel.scalefac[sfbi] = stream.read(slen1);
            }
            if (scfsi & 4) {
                for (var sfbi = 6; sfbi < 11; ++sfbi) channel.scalefac[sfbi] = gr0ch.scalefac[sfbi];
            } else {
                for (var sfbi = 6; sfbi < 11; ++sfbi) channel.scalefac[sfbi] = stream.read(slen1);
            }
            if (scfsi & 2) {
                for (var sfbi = 11; sfbi < 16; ++sfbi) channel.scalefac[sfbi] = gr0ch.scalefac[sfbi];
            } else {
                for (var sfbi = 11; sfbi < 16; ++sfbi) channel.scalefac[sfbi] = stream.read(slen2);
            }
            if (scfsi & 1) {
                for (var sfbi = 16; sfbi < 21; ++sfbi) channel.scalefac[sfbi] = gr0ch.scalefac[sfbi];
            } else {
                for (var sfbi = 16; sfbi < 21; ++sfbi) channel.scalefac[sfbi] = stream.read(slen2);
            }
            channel.scalefac[21] = 0;
        }
        return stream.offset() - start;
    };
    Layer3.prototype.scalefactors_lsf = function(stream, channel, gr1ch, mode_extension) {
        var start = stream.offset();
        var scalefac_compress = channel.scalefac_compress;
        var index = channel.block_type === 2 ? channel.flags & MIXED_BLOCK_FLAG ? 2 : 1 : 0;
        var slen = new Int32Array(4);
        var nsfb;
        if (!(mode_extension & I_STEREO && gr1ch)) {
            if (scalefac_compress < 400) {
                slen[0] = (scalefac_compress >>> 4) / 5;
                slen[1] = (scalefac_compress >>> 4) % 5;
                slen[2] = scalefac_compress % 16 >>> 2;
                slen[3] = scalefac_compress % 4;
                nsfb = NSFB_TABLE[0][index];
            } else if (scalefac_compress < 500) {
                scalefac_compress -= 400;
                slen[0] = (scalefac_compress >>> 2) / 5;
                slen[1] = (scalefac_compress >>> 2) % 5;
                slen[2] = scalefac_compress % 4;
                slen[3] = 0;
                nsfb = NSFB_TABLE[1][index];
            } else {
                scalefac_compress -= 500;
                slen[0] = scalefac_compress / 3;
                slen[1] = scalefac_compress % 3;
                slen[2] = 0;
                slen[3] = 0;
                channel.flags |= PREFLAG;
                nsfb = NSFB_TABLE[2][index];
            }
            var n = 0;
            for (var part = 0; part < 4; part++) {
                for (var i = 0; i < nsfb[part]; i++) {
                    channel.scalefac[n++] = stream.read(slen[part]);
                }
            }
            while (n < 39) {
                channel.scalefac[n++] = 0;
            }
        } else {
            scalefac_compress >>>= 1;
            if (scalefac_compress < 180) {
                slen[0] = scalefac_compress / 36;
                slen[1] = scalefac_compress % 36 / 6;
                slen[2] = scalefac_compress % 36 % 6;
                slen[3] = 0;
                nsfb = NSFB_TABLE[3][index];
            } else if (scalefac_compress < 244) {
                scalefac_compress -= 180;
                slen[0] = scalefac_compress % 64 >>> 4;
                slen[1] = scalefac_compress % 16 >>> 2;
                slen[2] = scalefac_compress % 4;
                slen[3] = 0;
                nsfb = NSFB_TABLE[4][index];
            } else {
                scalefac_compress -= 244;
                slen[0] = scalefac_compress / 3;
                slen[1] = scalefac_compress % 3;
                slen[2] = 0;
                slen[3] = 0;
                nsfb = NSFB_TABLE[5][index];
            }
            var n = 0;
            for (var part = 0; part < 4; ++part) {
                var max = (1 << slen[part]) - 1;
                for (var i = 0; i < nsfb[part]; ++i) {
                    var is_pos = stream.read(slen[part]);
                    channel.scalefac[n] = is_pos;
                    gr1ch.scalefac[n++] = is_pos === max ? 1 : 0;
                }
            }
            while (n < 39) {
                channel.scalefac[n] = 0;
                gr1ch.scalefac[n++] = 0;
            }
        }
        return stream.offset() - start;
    };
    Layer3.prototype.huffmanDecode = function(stream, xr, channel, sfbwidth, part2_length) {
        var exponents = this._exponents;
        var sfbwidthptr = 0;
        var bits_left = channel.part2_3_length - part2_length;
        if (bits_left < 0) return MP3Stream.ERROR.BADPART3LEN;
        this.exponents(channel, sfbwidth, exponents);
        var peek = stream.copy();
        stream.advance(bits_left);
        var cachesz = 8 - peek.bitPosition;
        cachesz += 32 - 1 - 24 + (24 - cachesz) & ~7;
        var bitcache = peek.read(cachesz);
        bits_left -= cachesz;
        var xrptr = 0;
        var region = 0;
        var reqcache = this.reqcache;
        var sfbound = xrptr + sfbwidth[sfbwidthptr++];
        var rcount = channel.region0_count + 1;
        var entry = huff_pair_table[channel.table_select[region]];
        var table = entry.table;
        var linbits = entry.linbits;
        var startbits = entry.startbits;
        if (typeof table === "undefined") return MP3Stream.ERROR.BADHUFFTABLE;
        var expptr = 0;
        var exp = exponents[expptr++];
        var reqhits = 0;
        var big_values = channel.big_values;
        while (big_values-- && cachesz + bits_left > 0) {
            if (xrptr === sfbound) {
                sfbound += sfbwidth[sfbwidthptr++];
                if (--rcount === 0) {
                    if (region === 0) rcount = channel.region1_count + 1; else rcount = 0;
                    entry = huff_pair_table[channel.table_select[++region]];
                    table = entry.table;
                    linbits = entry.linbits;
                    startbits = entry.startbits;
                    if (typeof table === "undefined") return MP3Stream.ERROR.BADHUFFTABLE;
                }
                if (exp !== exponents[expptr]) {
                    exp = exponents[expptr];
                    reqhits = 0;
                }
                ++expptr;
            }
            if (cachesz < 21) {
                var bits = 32 - 1 - 21 + (21 - cachesz) & ~7;
                bitcache = bitcache << bits | peek.read(bits);
                cachesz += bits;
                bits_left -= bits;
            }
            var clumpsz = startbits;
            var pair = table[bitcache >> cachesz - clumpsz & (1 << clumpsz) - 1];
            while (!pair.final) {
                cachesz -= clumpsz;
                clumpsz = pair.ptr.bits;
                pair = table[pair.ptr.offset + (bitcache >> cachesz - clumpsz & (1 << clumpsz) - 1)];
            }
            cachesz -= pair.value.hlen;
            if (linbits) {
                var value = pair.value.x;
                var x_final = false;
                switch (value) {
                  case 0:
                    xr[xrptr] = 0;
                    break;
                  case 15:
                    if (cachesz < linbits + 2) {
                        bitcache = bitcache << 16 | peek.read(16);
                        cachesz += 16;
                        bits_left -= 16;
                    }
                    value += bitcache >> cachesz - linbits & (1 << linbits) - 1;
                    cachesz -= linbits;
                    requantized = this.requantize(value, exp);
                    x_final = true;
                    break;
                  default:
                    if (reqhits & 1 << value) {
                        requantized = reqcache[value];
                    } else {
                        reqhits |= 1 << value;
                        requantized = reqcache[value] = this.requantize(value, exp);
                    }
                    x_final = true;
                }
                if (x_final) {
                    xr[xrptr] = bitcache & 1 << cachesz-- - 1 ? -requantized : requantized;
                }
                value = pair.value.y;
                var y_final = false;
                switch (value) {
                  case 0:
                    xr[xrptr + 1] = 0;
                    break;
                  case 15:
                    if (cachesz < linbits + 1) {
                        bitcache = bitcache << 16 | peek.read(16);
                        cachesz += 16;
                        bits_left -= 16;
                    }
                    value += bitcache >> cachesz - linbits & (1 << linbits) - 1;
                    cachesz -= linbits;
                    requantized = this.requantize(value, exp);
                    y_final = true;
                    break;
                  default:
                    if (reqhits & 1 << value) {
                        requantized = reqcache[value];
                    } else {
                        reqhits |= 1 << value;
                        reqcache[value] = this.requantize(value, exp);
                        requantized = reqcache[value];
                    }
                    y_final = true;
                }
                if (y_final) {
                    xr[xrptr + 1] = bitcache & 1 << cachesz-- - 1 ? -requantized : requantized;
                }
            } else {
                var value = pair.value.x;
                if (value === 0) {
                    xr[xrptr] = 0;
                } else {
                    if (reqhits & 1 << value) requantized = reqcache[value]; else {
                        reqhits |= 1 << value;
                        requantized = reqcache[value] = this.requantize(value, exp);
                    }
                    xr[xrptr] = bitcache & 1 << cachesz-- - 1 ? -requantized : requantized;
                }
                value = pair.value.y;
                if (value === 0) {
                    xr[xrptr + 1] = 0;
                } else {
                    if (reqhits & 1 << value) requantized = reqcache[value]; else {
                        reqhits |= 1 << value;
                        requantized = reqcache[value] = this.requantize(value, exp);
                    }
                    xr[xrptr + 1] = bitcache & 1 << cachesz-- - 1 ? -requantized : requantized;
                }
            }
            xrptr += 2;
        }
        if (cachesz + bits_left < 0) return MP3Stream.ERROR.BADHUFFDATA;
        var table = huff_quad_table[channel.flags & COUNT1TABLE_SELECT];
        var requantized = this.requantize(1, exp);
        while (cachesz + bits_left > 0 && xrptr <= 572) {
            if (cachesz < 10) {
                bitcache = bitcache << 16 | peek.read(16);
                cachesz += 16;
                bits_left -= 16;
            }
            var quad = table[bitcache >> cachesz - 4 & (1 << 4) - 1];
            if (!quad.final) {
                cachesz -= 4;
                quad = table[quad.ptr.offset + (bitcache >> cachesz - quad.ptr.bits & (1 << quad.ptr.bits) - 1)];
            }
            cachesz -= quad.value.hlen;
            if (xrptr === sfbound) {
                sfbound += sfbwidth[sfbwidthptr++];
                if (exp !== exponents[expptr]) {
                    exp = exponents[expptr];
                    requantized = this.requantize(1, exp);
                }
                ++expptr;
            }
            xr[xrptr] = quad.value.v ? bitcache & 1 << cachesz-- - 1 ? -requantized : requantized : 0;
            xr[xrptr + 1] = quad.value.w ? bitcache & 1 << cachesz-- - 1 ? -requantized : requantized : 0;
            xrptr += 2;
            if (xrptr === sfbound) {
                sfbound += sfbwidth[sfbwidthptr++];
                if (exp !== exponents[expptr]) {
                    exp = exponents[expptr];
                    requantized = this.requantize(1, exp);
                }
                ++expptr;
            }
            xr[xrptr] = quad.value.x ? bitcache & 1 << cachesz-- - 1 ? -requantized : requantized : 0;
            xr[xrptr + 1] = quad.value.y ? bitcache & 1 << cachesz-- - 1 ? -requantized : requantized : 0;
            xrptr += 2;
            if (cachesz + bits_left < 0) {
                xrptr -= 4;
            }
        }
        if (-bits_left > BUFFER_GUARD * 8) {
            throw new Error("assertion failed: (-bits_left <= Mad.BUFFER_GUARD * CHAR_BIT)");
        }
        while (xrptr < 576) {
            xr[xrptr] = 0;
            xr[xrptr + 1] = 0;
            xrptr += 2;
        }
        return MP3Stream.ERROR.NONE;
    };
    Layer3.prototype.requantize = function(value, exp) {
        var frac = exp % 4 >> 0;
        exp = exp / 4 >> 0;
        var requantized = Math.pow(value, 4 / 3);
        requantized *= Math.pow(2, exp / 4);
        if (frac) {
            requantized *= Math.pow(2, frac / 4);
        }
        if (exp < 0) {
            requantized /= Math.pow(2, -exp * (3 / 4));
        }
        return requantized;
    };
    Layer3.prototype.exponents = function(channel, sfbwidth, exponents) {
        var gain = channel.global_gain - 210;
        var scalefac_multiplier = channel.flags & SCALEFAC_SCALE ? 2 : 1;
        if (channel.block_type === 2) {
            var sfbi = 0, l = 0;
            if (channel.flags & MIXED_BLOCK_FLAG) {
                var premask = channel.flags & PREFLAG ? ~0 : 0;
                while (l < 36) {
                    exponents[sfbi] = gain - (channel.scalefac[sfbi] + (PRETAB[sfbi] & premask) << scalefac_multiplier);
                    l += sfbwidth[sfbi++];
                }
            }
            var gain0 = gain - 8 * channel.subblock_gain[0];
            var gain1 = gain - 8 * channel.subblock_gain[1];
            var gain2 = gain - 8 * channel.subblock_gain[2];
            while (l < 576) {
                exponents[sfbi + 0] = gain0 - (channel.scalefac[sfbi + 0] << scalefac_multiplier);
                exponents[sfbi + 1] = gain1 - (channel.scalefac[sfbi + 1] << scalefac_multiplier);
                exponents[sfbi + 2] = gain2 - (channel.scalefac[sfbi + 2] << scalefac_multiplier);
                l += 3 * sfbwidth[sfbi];
                sfbi += 3;
            }
        } else {
            if (channel.flags & PREFLAG) {
                for (var sfbi = 0; sfbi < 22; sfbi++) {
                    exponents[sfbi] = gain - (channel.scalefac[sfbi] + PRETAB[sfbi] << scalefac_multiplier);
                }
            } else {
                for (var sfbi = 0; sfbi < 22; sfbi++) {
                    exponents[sfbi] = gain - (channel.scalefac[sfbi] << scalefac_multiplier);
                }
            }
        }
    };
    Layer3.prototype.stereo = function(xr, granules, gr, header, sfbwidth) {
        var granule = granules[gr];
        var modes = this.modes;
        var sfbi, l, n, i;
        if (granule.ch[0].block_type !== granule.ch[1].block_type || (granule.ch[0].flags & MIXED_BLOCK_FLAG) !== (granule.ch[1].flags & MIXED_BLOCK_FLAG)) return Mad.Error.BADSTEREO;
        for (var i = 0; i < 39; i++) modes[i] = header.mode_extension;
        if (header.mode_extension & I_STEREO) {
            var right_ch = granule.ch[1];
            var right_xr = xr[1];
            header.flags |= FLAGS.I_STEREO;
            if (right_ch.block_type === 2) {
                var lower, start, max, bound = new Uint32Array(3), w;
                lower = start = max = bound[0] = bound[1] = bound[2] = 0;
                sfbi = l = 0;
                if (right_ch.flags & MIXED_BLOCK_FLAG) {
                    while (l < 36) {
                        n = sfbwidth[sfbi++];
                        for (var i = 0; i < n; ++i) {
                            if (right_xr[i]) {
                                lower = sfbi;
                                break;
                            }
                        }
                        right_xr += n;
                        l += n;
                    }
                    start = sfbi;
                }
                var w = 0;
                while (l < 576) {
                    n = sfbwidth[sfbi++];
                    for (i = 0; i < n; ++i) {
                        if (right_xr[i]) {
                            max = bound[w] = sfbi;
                            break;
                        }
                    }
                    right_xr += n;
                    l += n;
                    w = (w + 1) % 3;
                }
                if (max) lower = start;
                for (i = 0; i < lower; ++i) modes[i] = header.mode_extension & ~I_STEREO;
                w = 0;
                for (i = start; i < max; ++i) {
                    if (i < bound[w]) modes[i] = header.mode_extension & ~I_STEREO;
                    w = (w + 1) % 3;
                }
            } else {
                var bound = 0;
                for (sfbi = l = 0; l < 576; l += n) {
                    n = sfbwidth[sfbi++];
                    for (i = 0; i < n; ++i) {
                        if (right_xr[i]) {
                            bound = sfbi;
                            break;
                        }
                    }
                    right_xr += n;
                }
                for (i = 0; i < bound; ++i) modes[i] = header.mode_extension & ~I_STEREO;
            }
            if (header.flags & FLAGS.LSF_EXT) {
                var illegal_pos = granules[gr + 1].ch[1].scalefac;
                var lsf_scale = IS_LSF_TABLE[right_ch.scalefac_compress & 1];
                for (sfbi = l = 0; l < 576; ++sfbi, l += n) {
                    n = sfbwidth[sfbi];
                    if (!(modes[sfbi] & I_STEREO)) continue;
                    if (illegal_pos[sfbi]) {
                        modes[sfbi] &= ~I_STEREO;
                        continue;
                    }
                    is_pos = right_ch.scalefac[sfbi];
                    for (i = 0; i < n; ++i) {
                        var left = xr[0][l + i];
                        if (is_pos === 0) {
                            xr[1][l + i] = left;
                        } else {
                            var opposite = left * lsf_scale[(is_pos - 1) / 2];
                            if (is_pos & 1) {
                                xr[0][l + i] = opposite;
                                xr[1][l + i] = left;
                            } else {
                                xr[1][l + i] = opposite;
                            }
                        }
                    }
                }
            } else {
                for (sfbi = l = 0; l < 576; ++sfbi, l += n) {
                    n = sfbwidth[sfbi];
                    if (!(modes[sfbi] & I_STEREO)) continue;
                    is_pos = right_ch.scalefac[sfbi];
                    if (is_pos >= 7) {
                        modes[sfbi] &= ~I_STEREO;
                        continue;
                    }
                    for (i = 0; i < n; ++i) {
                        var left = xr[0][l + i];
                        xr[0][l + i] = left * IS_TABLE[is_pos];
                        xr[1][l + i] = left * IS_TABLE[6 - is_pos];
                    }
                }
            }
        }
        if (header.mode_extension & MS_STEREO) {
            header.flags |= FLAGS.MS_STEREO;
            var invsqrt2 = ROOT_TABLE[3 + -2];
            for (sfbi = l = 0; l < 576; ++sfbi, l += n) {
                n = sfbwidth[sfbi];
                if (modes[sfbi] !== MS_STEREO) continue;
                for (i = 0; i < n; ++i) {
                    var m = xr[0][l + i];
                    var s = xr[1][l + i];
                    xr[0][l + i] = (m + s) * invsqrt2;
                    xr[1][l + i] = (m - s) * invsqrt2;
                }
            }
        }
        return MP3Stream.ERROR.NONE;
    };
    Layer3.prototype.aliasreduce = function(xr, lines) {
        for (var xrPointer = 18; xrPointer < lines; xrPointer += 18) {
            for (var i = 0; i < 8; ++i) {
                var a = xr[xrPointer - i - 1];
                var b = xr[xrPointer + i];
                xr[xrPointer - i - 1] = a * CS[i] - b * CA[i];
                xr[xrPointer + i] = b * CS[i] + a * CA[i];
            }
        }
    };
    Layer3.prototype.imdct_l = function(X, z, block_type) {
        this.imdct.imdct36(X, z);
        switch (block_type) {
          case 0:
            for (var i = 0; i < 36; ++i) z[i] = z[i] * WINDOW_L[i];
            break;
          case 1:
            for (var i = 0; i < 18; ++i) z[i] = z[i] * WINDOW_L[i];
            for (var i = 24; i < 30; ++i) z[i] = z[i] * WINDOW_S[i - 18];
            for (var i = 30; i < 36; ++i) z[i] = 0;
            break;
          case 3:
            for (var i = 0; i < 6; ++i) z[i] = 0;
            for (var i = 6; i < 12; ++i) z[i] = z[i] * WINDOW_S[i - 6];
            for (var i = 18; i < 36; ++i) z[i] = z[i] * WINDOW_L[i];
            break;
        }
    };
    Layer3.prototype.imdct_s = function(X, z) {
        var yptr = 0;
        var wptr;
        var Xptr = 0;
        var y = new Float64Array(36);
        var hi, lo;
        for (var w = 0; w < 3; ++w) {
            var sptr = 0;
            for (var i = 0; i < 3; ++i) {
                lo = X[Xptr + 0] * IMDCT_S[sptr][0] + X[Xptr + 1] * IMDCT_S[sptr][1] + X[Xptr + 2] * IMDCT_S[sptr][2] + X[Xptr + 3] * IMDCT_S[sptr][3] + X[Xptr + 4] * IMDCT_S[sptr][4] + X[Xptr + 5] * IMDCT_S[sptr][5];
                y[yptr + i + 0] = lo;
                y[yptr + 5 - i] = -y[yptr + i + 0];
                ++sptr;
                lo = X[Xptr + 0] * IMDCT_S[sptr][0] + X[Xptr + 1] * IMDCT_S[sptr][1] + X[Xptr + 2] * IMDCT_S[sptr][2] + X[Xptr + 3] * IMDCT_S[sptr][3] + X[Xptr + 4] * IMDCT_S[sptr][4] + X[Xptr + 5] * IMDCT_S[sptr][5];
                y[yptr + i + 6] = lo;
                y[yptr + 11 - i] = y[yptr + i + 6];
                ++sptr;
            }
            yptr += 12;
            Xptr += 6;
        }
        yptr = 0;
        var wptr = 0;
        for (var i = 0; i < 6; ++i) {
            z[i + 0] = 0;
            z[i + 6] = y[yptr + 0 + 0] * WINDOW_S[wptr + 0];
            lo = y[yptr + 0 + 6] * WINDOW_S[wptr + 6] + y[yptr + 12 + 0] * WINDOW_S[wptr + 0];
            z[i + 12] = lo;
            lo = y[yptr + 12 + 6] * WINDOW_S[wptr + 6] + y[yptr + 24 + 0] * WINDOW_S[wptr + 0];
            z[i + 18] = lo;
            z[i + 24] = y[yptr + 24 + 6] * WINDOW_S[wptr + 6];
            z[i + 30] = 0;
            ++yptr;
            ++wptr;
        }
    };
    Layer3.prototype.overlap = function(output, overlap, sample, sb) {
        for (var i = 0; i < 18; ++i) {
            sample[i][sb] = output[i] + overlap[i];
            overlap[i] = output[i + 18];
        }
    };
    Layer3.prototype.freqinver = function(sample, sb) {
        for (var i = 1; i < 18; i += 2) sample[i][sb] = -sample[i][sb];
    };
    Layer3.prototype.overlap_z = function(overlap, sample, sb) {
        for (var i = 0; i < 18; ++i) {
            sample[i][sb] = overlap[i];
            overlap[i] = 0;
        }
    };
    Layer3.prototype.reorder = function(xr, channel, sfbwidth) {
        var sfbwidthPointer = 0;
        var tmp = this.tmp;
        var sbw = new Uint32Array(3);
        var sw = new Uint32Array(3);
        var sb = 0;
        if (channel.flags & MIXED_BLOCK_FLAG) {
            var sb = 2;
            var l = 0;
            while (l < 36) l += sfbwidth[sfbwidthPointer++];
        }
        for (var w = 0; w < 3; ++w) {
            sbw[w] = sb;
            sw[w] = 0;
        }
        f = sfbwidth[sfbwidthPointer++];
        w = 0;
        for (var l = 18 * sb; l < 576; ++l) {
            if (f-- === 0) {
                f = sfbwidth[sfbwidthPointer++] - 1;
                w = (w + 1) % 3;
            }
            tmp[sbw[w]][w][sw[w]++] = xr[l];
            if (sw[w] === 6) {
                sw[w] = 0;
                ++sbw[w];
            }
        }
        var tmp2 = this.tmp2;
        var ptr = 0;
        for (var i = 0; i < 32; i++) {
            for (var j = 0; j < 3; j++) {
                for (var k = 0; k < 6; k++) {
                    tmp2[ptr++] = tmp[i][j][k];
                }
            }
        }
        var len = 576 - 18 * sb;
        for (var i = 0; i < len; i++) {
            xr[18 * sb + i] = tmp2[sb + i];
        }
    };
    function MP3Frame() {
        this.header = null;
        this.options = 0;
        this.sbsample = makeArray([ 2, 36, 32 ]);
        this.overlap = makeArray([ 2, 32, 18 ]);
    }
    function makeArray(lengths) {
        if (lengths.length === 1) {
            return new Float64Array(lengths[0]);
        }
        var ret = [], len = lengths[0];
        for (var j = 0; j < len; j++) {
            ret[j] = makeArray(lengths.slice(1));
        }
        return ret;
    }
    const DECODERS = [ function() {
        console.log("Layer I decoding is not implemented!");
    }, function() {
        console.log("Layer II decoding is not implemented!");
    }, new Layer3 ];
    MP3Frame.prototype.decode = function(stream) {
        if (!this.header || !(this.header.flags & FLAGS.INCOMPLETE)) {
            this.header = MP3FrameHeader.decode(stream);
            if (this.header === null) return false;
        }
        this.header.flags &= ~FLAGS.INCOMPLETE;
        if (DECODERS[this.header.layer - 1].decode(stream, this) === -1) {
            return false;
        }
        return true;
    };
    function MP3Synth() {
        this.filter = makeArray([ 2, 2, 2, 16, 8 ]);
        this.phase = 0;
        this.pcm = {
            samplerate: 0,
            channels: 0,
            length: 0,
            samples: [ new Float64Array(1152), new Float64Array(1152) ]
        };
    }
    const costab1 = .998795456;
    const costab2 = .995184727;
    const costab3 = .98917651;
    const costab4 = .98078528;
    const costab5 = .970031253;
    const costab6 = .956940336;
    const costab7 = .941544065;
    const costab8 = .923879533;
    const costab9 = .903989293;
    const costab10 = .881921264;
    const costab11 = .85772861;
    const costab12 = .831469612;
    const costab13 = .803207531;
    const costab14 = .773010453;
    const costab15 = .740951125;
    const costab16 = .707106781;
    const costab17 = .671558955;
    const costab18 = .634393284;
    const costab19 = .595699304;
    const costab20 = .555570233;
    const costab21 = .514102744;
    const costab22 = .471396737;
    const costab23 = .427555093;
    const costab24 = .382683432;
    const costab25 = .336889853;
    const costab26 = .290284677;
    const costab27 = .24298018;
    const costab28 = .195090322;
    const costab29 = .146730474;
    const costab30 = .09801714;
    const costab31 = .049067674;
    MP3Synth.dct32 = function(_in, slot, lo, hi) {
        var t0, t1, t2, t3, t4, t5, t6, t7;
        var t8, t9, t10, t11, t12, t13, t14, t15;
        var t16, t17, t18, t19, t20, t21, t22, t23;
        var t24, t25, t26, t27, t28, t29, t30, t31;
        var t32, t33, t34, t35, t36, t37, t38, t39;
        var t40, t41, t42, t43, t44, t45, t46, t47;
        var t48, t49, t50, t51, t52, t53, t54, t55;
        var t56, t57, t58, t59, t60, t61, t62, t63;
        var t64, t65, t66, t67, t68, t69, t70, t71;
        var t72, t73, t74, t75, t76, t77, t78, t79;
        var t80, t81, t82, t83, t84, t85, t86, t87;
        var t88, t89, t90, t91, t92, t93, t94, t95;
        var t96, t97, t98, t99, t100, t101, t102, t103;
        var t104, t105, t106, t107, t108, t109, t110, t111;
        var t112, t113, t114, t115, t116, t117, t118, t119;
        var t120, t121, t122, t123, t124, t125, t126, t127;
        var t128, t129, t130, t131, t132, t133, t134, t135;
        var t136, t137, t138, t139, t140, t141, t142, t143;
        var t144, t145, t146, t147, t148, t149, t150, t151;
        var t152, t153, t154, t155, t156, t157, t158, t159;
        var t160, t161, t162, t163, t164, t165, t166, t167;
        var t168, t169, t170, t171, t172, t173, t174, t175;
        var t176;
        t0 = _in[0] + _in[31];
        t16 = (_in[0] - _in[31]) * costab1;
        t1 = _in[15] + _in[16];
        t17 = (_in[15] - _in[16]) * costab31;
        t41 = t16 + t17;
        t59 = (t16 - t17) * costab2;
        t33 = t0 + t1;
        t50 = (t0 - t1) * costab2;
        t2 = _in[7] + _in[24];
        t18 = (_in[7] - _in[24]) * costab15;
        t3 = _in[8] + _in[23];
        t19 = (_in[8] - _in[23]) * costab17;
        t42 = t18 + t19;
        t60 = (t18 - t19) * costab30;
        t34 = t2 + t3;
        t51 = (t2 - t3) * costab30;
        t4 = _in[3] + _in[28];
        t20 = (_in[3] - _in[28]) * costab7;
        t5 = _in[12] + _in[19];
        t21 = (_in[12] - _in[19]) * costab25;
        t43 = t20 + t21;
        t61 = (t20 - t21) * costab14;
        t35 = t4 + t5;
        t52 = (t4 - t5) * costab14;
        t6 = _in[4] + _in[27];
        t22 = (_in[4] - _in[27]) * costab9;
        t7 = _in[11] + _in[20];
        t23 = (_in[11] - _in[20]) * costab23;
        t44 = t22 + t23;
        t62 = (t22 - t23) * costab18;
        t36 = t6 + t7;
        t53 = (t6 - t7) * costab18;
        t8 = _in[1] + _in[30];
        t24 = (_in[1] - _in[30]) * costab3;
        t9 = _in[14] + _in[17];
        t25 = (_in[14] - _in[17]) * costab29;
        t45 = t24 + t25;
        t63 = (t24 - t25) * costab6;
        t37 = t8 + t9;
        t54 = (t8 - t9) * costab6;
        t10 = _in[6] + _in[25];
        t26 = (_in[6] - _in[25]) * costab13;
        t11 = _in[9] + _in[22];
        t27 = (_in[9] - _in[22]) * costab19;
        t46 = t26 + t27;
        t64 = (t26 - t27) * costab26;
        t38 = t10 + t11;
        t55 = (t10 - t11) * costab26;
        t12 = _in[2] + _in[29];
        t28 = (_in[2] - _in[29]) * costab5;
        t13 = _in[13] + _in[18];
        t29 = (_in[13] - _in[18]) * costab27;
        t47 = t28 + t29;
        t65 = (t28 - t29) * costab10;
        t39 = t12 + t13;
        t56 = (t12 - t13) * costab10;
        t14 = _in[5] + _in[26];
        t30 = (_in[5] - _in[26]) * costab11;
        t15 = _in[10] + _in[21];
        t31 = (_in[10] - _in[21]) * costab21;
        t48 = t30 + t31;
        t66 = (t30 - t31) * costab22;
        t40 = t14 + t15;
        t57 = (t14 - t15) * costab22;
        t69 = t33 + t34;
        t89 = (t33 - t34) * costab4;
        t70 = t35 + t36;
        t90 = (t35 - t36) * costab28;
        t71 = t37 + t38;
        t91 = (t37 - t38) * costab12;
        t72 = t39 + t40;
        t92 = (t39 - t40) * costab20;
        t73 = t41 + t42;
        t94 = (t41 - t42) * costab4;
        t74 = t43 + t44;
        t95 = (t43 - t44) * costab28;
        t75 = t45 + t46;
        t96 = (t45 - t46) * costab12;
        t76 = t47 + t48;
        t97 = (t47 - t48) * costab20;
        t78 = t50 + t51;
        t100 = (t50 - t51) * costab4;
        t79 = t52 + t53;
        t101 = (t52 - t53) * costab28;
        t80 = t54 + t55;
        t102 = (t54 - t55) * costab12;
        t81 = t56 + t57;
        t103 = (t56 - t57) * costab20;
        t83 = t59 + t60;
        t106 = (t59 - t60) * costab4;
        t84 = t61 + t62;
        t107 = (t61 - t62) * costab28;
        t85 = t63 + t64;
        t108 = (t63 - t64) * costab12;
        t86 = t65 + t66;
        t109 = (t65 - t66) * costab20;
        t113 = t69 + t70;
        t114 = t71 + t72;
        hi[15][slot] = t113 + t114;
        lo[0][slot] = (t113 - t114) * costab16;
        t115 = t73 + t74;
        t116 = t75 + t76;
        t32 = t115 + t116;
        hi[14][slot] = t32;
        t118 = t78 + t79;
        t119 = t80 + t81;
        t58 = t118 + t119;
        hi[13][slot] = t58;
        t121 = t83 + t84;
        t122 = t85 + t86;
        t67 = t121 + t122;
        t49 = t67 * 2 - t32;
        hi[12][slot] = t49;
        t125 = t89 + t90;
        t126 = t91 + t92;
        t93 = t125 + t126;
        hi[11][slot] = t93;
        t128 = t94 + t95;
        t129 = t96 + t97;
        t98 = t128 + t129;
        t68 = t98 * 2 - t49;
        hi[10][slot] = t68;
        t132 = t100 + t101;
        t133 = t102 + t103;
        t104 = t132 + t133;
        t82 = t104 * 2 - t58;
        hi[9][slot] = t82;
        t136 = t106 + t107;
        t137 = t108 + t109;
        t110 = t136 + t137;
        t87 = t110 * 2 - t67;
        t77 = t87 * 2 - t68;
        hi[8][slot] = t77;
        t141 = (t69 - t70) * costab8;
        t142 = (t71 - t72) * costab24;
        t143 = t141 + t142;
        hi[7][slot] = t143;
        lo[8][slot] = (t141 - t142) * costab16 * 2 - t143;
        t144 = (t73 - t74) * costab8;
        t145 = (t75 - t76) * costab24;
        t146 = t144 + t145;
        t88 = t146 * 2 - t77;
        hi[6][slot] = t88;
        t148 = (t78 - t79) * costab8;
        t149 = (t80 - t81) * costab24;
        t150 = t148 + t149;
        t105 = t150 * 2 - t82;
        hi[5][slot] = t105;
        t152 = (t83 - t84) * costab8;
        t153 = (t85 - t86) * costab24;
        t154 = t152 + t153;
        t111 = t154 * 2 - t87;
        t99 = t111 * 2 - t88;
        hi[4][slot] = t99;
        t157 = (t89 - t90) * costab8;
        t158 = (t91 - t92) * costab24;
        t159 = t157 + t158;
        t127 = t159 * 2 - t93;
        hi[3][slot] = t127;
        t160 = (t125 - t126) * costab16 * 2 - t127;
        lo[4][slot] = t160;
        lo[12][slot] = ((t157 - t158) * costab16 * 2 - t159) * 2 - t160;
        t161 = (t94 - t95) * costab8;
        t162 = (t96 - t97) * costab24;
        t163 = t161 + t162;
        t130 = t163 * 2 - t98;
        t112 = t130 * 2 - t99;
        hi[2][slot] = t112;
        t164 = (t128 - t129) * costab16 * 2 - t130;
        t166 = (t100 - t101) * costab8;
        t167 = (t102 - t103) * costab24;
        t168 = t166 + t167;
        t134 = t168 * 2 - t104;
        t120 = t134 * 2 - t105;
        hi[1][slot] = t120;
        t135 = (t118 - t119) * costab16 * 2 - t120;
        lo[2][slot] = t135;
        t169 = (t132 - t133) * costab16 * 2 - t134;
        t151 = t169 * 2 - t135;
        lo[6][slot] = t151;
        t170 = ((t148 - t149) * costab16 * 2 - t150) * 2 - t151;
        lo[10][slot] = t170;
        lo[14][slot] = (((t166 - t167) * costab16 * 2 - t168) * 2 - t169) * 2 - t170;
        t171 = (t106 - t107) * costab8;
        t172 = (t108 - t109) * costab24;
        t173 = t171 + t172;
        t138 = t173 * 2 - t110;
        t123 = t138 * 2 - t111;
        t139 = (t121 - t122) * costab16 * 2 - t123;
        t117 = t123 * 2 - t112;
        hi[0][slot] = t117;
        t124 = (t115 - t116) * costab16 * 2 - t117;
        lo[1][slot] = t124;
        t131 = t139 * 2 - t124;
        lo[3][slot] = t131;
        t140 = t164 * 2 - t131;
        lo[5][slot] = t140;
        t174 = (t136 - t137) * costab16 * 2 - t138;
        t155 = t174 * 2 - t139;
        t147 = t155 * 2 - t140;
        lo[7][slot] = t147;
        t156 = ((t144 - t145) * costab16 * 2 - t146) * 2 - t147;
        lo[9][slot] = t156;
        t175 = ((t152 - t153) * costab16 * 2 - t154) * 2 - t155;
        t165 = t175 * 2 - t156;
        lo[11][slot] = t165;
        t176 = (((t161 - t162) * costab16 * 2 - t163) * 2 - t164) * 2 - t165;
        lo[13][slot] = t176;
        lo[15][slot] = ((((t171 - t172) * costab16 * 2 - t173) * 2 - t174) * 2 - t175) * 2 - t176;
    };
    const D = [ [ 0, -442505e-9, .003250122, -.007003784, .031082153, -.07862854, .100311279, -.572036743, 1.144989014, .572036743, .100311279, .07862854, .031082153, .007003784, .003250122, 442505e-9, 0, -442505e-9, .003250122, -.007003784, .031082153, -.07862854, .100311279, -.572036743, 1.144989014, .572036743, .100311279, .07862854, .031082153, .007003784, .003250122, 442505e-9 ], [ -15259e-9, -473022e-9, .003326416, -.007919312, .030517578, -.084182739, .090927124, -.600219727, 1.144287109, .543823242, .108856201, .073059082, .031478882, .006118774, .003173828, 396729e-9, -15259e-9, -473022e-9, .003326416, -.007919312, .030517578, -.084182739, .090927124, -.600219727, 1.144287109, .543823242, .108856201, .073059082, .031478882, .006118774, .003173828, 396729e-9 ], [ -15259e-9, -534058e-9, .003387451, -.008865356, .029785156, -.089706421, .080688477, -.628295898, 1.142211914, .515609741, .116577148, .067520142, .031738281, .0052948, .003082275, 366211e-9, -15259e-9, -534058e-9, .003387451, -.008865356, .029785156, -.089706421, .080688477, -.628295898, 1.142211914, .515609741, .116577148, .067520142, .031738281, .0052948, .003082275, 366211e-9 ], [ -15259e-9, -579834e-9, .003433228, -.009841919, .028884888, -.095169067, .069595337, -.656219482, 1.138763428, .487472534, .123474121, .06199646, .031845093, .004486084, .002990723, 320435e-9, -15259e-9, -579834e-9, .003433228, -.009841919, .028884888, -.095169067, .069595337, -.656219482, 1.138763428, .487472534, .123474121, .06199646, .031845093, .004486084, .002990723, 320435e-9 ], [ -15259e-9, -62561e-8, .003463745, -.010848999, .027801514, -.100540161, .057617187, -.683914185, 1.133926392, .459472656, .129577637, .056533813, .031814575, .003723145, .00289917, 289917e-9, -15259e-9, -62561e-8, .003463745, -.010848999, .027801514, -.100540161, .057617187, -.683914185, 1.133926392, .459472656, .129577637, .056533813, .031814575, .003723145, .00289917, 289917e-9 ], [ -15259e-9, -686646e-9, .003479004, -.011886597, .026535034, -.105819702, .044784546, -.71131897, 1.127746582, .431655884, .134887695, .051132202, .031661987, .003005981, .002792358, 259399e-9, -15259e-9, -686646e-9, .003479004, -.011886597, .026535034, -.105819702, .044784546, -.71131897, 1.127746582, .431655884, .134887695, .051132202, .031661987, .003005981, .002792358, 259399e-9 ], [ -15259e-9, -747681e-9, .003479004, -.012939453, .025085449, -.110946655, .031082153, -.738372803, 1.120223999, .404083252, .139450073, .045837402, .031387329, .002334595, .002685547, 244141e-9, -15259e-9, -747681e-9, .003479004, -.012939453, .025085449, -.110946655, .031082153, -.738372803, 1.120223999, .404083252, .139450073, .045837402, .031387329, .002334595, .002685547, 244141e-9 ], [ -30518e-9, -808716e-9, .003463745, -.014022827, .023422241, -.115921021, .01651001, -.765029907, 1.111373901, .376800537, .143264771, .040634155, .031005859, .001693726, .002578735, 213623e-9, -30518e-9, -808716e-9, .003463745, -.014022827, .023422241, -.115921021, .01651001, -.765029907, 1.111373901, .376800537, .143264771, .040634155, .031005859, .001693726, .002578735, 213623e-9 ], [ -30518e-9, -88501e-8, .003417969, -.01512146, .021575928, -.120697021, .001068115, -.791213989, 1.101211548, .349868774, .146362305, .035552979, .030532837, .001098633, .002456665, 198364e-9, -30518e-9, -88501e-8, .003417969, -.01512146, .021575928, -.120697021, .001068115, -.791213989, 1.101211548, .349868774, .146362305, .035552979, .030532837, .001098633, .002456665, 198364e-9 ], [ -30518e-9, -961304e-9, .003372192, -.016235352, .01953125, -.125259399, -.015228271, -.816864014, 1.089782715, .323318481, .148773193, .030609131, .029937744, 549316e-9, .002349854, 167847e-9, -30518e-9, -961304e-9, .003372192, -.016235352, .01953125, -.125259399, -.015228271, -.816864014, 1.089782715, .323318481, .148773193, .030609131, .029937744, 549316e-9, .002349854, 167847e-9 ], [ -30518e-9, -.001037598, .00328064, -.017349243, .01725769, -.129562378, -.03237915, -.841949463, 1.07711792, .297210693, .150497437, .025817871, .029281616, 30518e-9, .002243042, 152588e-9, -30518e-9, -.001037598, .00328064, -.017349243, .01725769, -.129562378, -.03237915, -.841949463, 1.07711792, .297210693, .150497437, .025817871, .029281616, 30518e-9, .002243042, 152588e-9 ], [ -45776e-9, -.001113892, .003173828, -.018463135, .014801025, -.133590698, -.050354004, -.866363525, 1.063217163, .271591187, .151596069, .021179199, .028533936, -442505e-9, .002120972, 137329e-9, -45776e-9, -.001113892, .003173828, -.018463135, .014801025, -.133590698, -.050354004, -.866363525, 1.063217163, .271591187, .151596069, .021179199, .028533936, -442505e-9, .002120972, 137329e-9 ], [ -45776e-9, -.001205444, .003051758, -.019577026, .012115479, -.137298584, -.069168091, -.890090942, 1.048156738, .246505737, .152069092, .016708374, .02772522, -869751e-9, .00201416, 12207e-8, -45776e-9, -.001205444, .003051758, -.019577026, .012115479, -.137298584, -.069168091, -.890090942, 1.048156738, .246505737, .152069092, .016708374, .02772522, -869751e-9, .00201416, 12207e-8 ], [ -61035e-9, -.001296997, .002883911, -.020690918, .009231567, -.140670776, -.088775635, -.91305542, 1.031936646, .221984863, .15196228, .012420654, .02684021, -.001266479, .001907349, 106812e-9, -61035e-9, -.001296997, .002883911, -.020690918, .009231567, -.140670776, -.088775635, -.91305542, 1.031936646, .221984863, .15196228, .012420654, .02684021, -.001266479, .001907349, 106812e-9 ], [ -61035e-9, -.00138855, .002700806, -.021789551, .006134033, -.143676758, -.109161377, -.935195923, 1.01461792, .198059082, .151306152, .00831604, .025909424, -.001617432, .001785278, 106812e-9, -61035e-9, -.00138855, .002700806, -.021789551, .006134033, -.143676758, -.109161377, -.935195923, 1.01461792, .198059082, .151306152, .00831604, .025909424, -.001617432, .001785278, 106812e-9 ], [ -76294e-9, -.001480103, .002487183, -.022857666, .002822876, -.146255493, -.130310059, -.956481934, .996246338, .174789429, .150115967, .004394531, .024932861, -.001937866, .001693726, 91553e-9, -76294e-9, -.001480103, .002487183, -.022857666, .002822876, -.146255493, -.130310059, -.956481934, .996246338, .174789429, .150115967, .004394531, .024932861, -.001937866, .001693726, 91553e-9 ], [ -76294e-9, -.001586914, .002227783, -.023910522, -686646e-9, -.148422241, -.152206421, -.976852417, .976852417, .152206421, .148422241, 686646e-9, .023910522, -.002227783, .001586914, 76294e-9, -76294e-9, -.001586914, .002227783, -.023910522, -686646e-9, -.148422241, -.152206421, -.976852417, .976852417, .152206421, .148422241, 686646e-9, .023910522, -.002227783, .001586914, 76294e-9 ] ];
    MP3Synth.prototype.full = function(frame, nch, ns) {
        var Dptr, hi, lo, ptr;
        for (var ch = 0; ch < nch; ++ch) {
            var sbsample = frame.sbsample[ch];
            var filter = this.filter[ch];
            var phase = this.phase;
            var pcm = this.pcm.samples[ch];
            var pcm1Ptr = 0;
            var pcm2Ptr = 0;
            for (var s = 0; s < ns; ++s) {
                MP3Synth.dct32(sbsample[s], phase >> 1, filter[0][phase & 1], filter[1][phase & 1]);
                var pe = phase & ~1;
                var po = phase - 1 & 15 | 1;
                var fe = filter[0][phase & 1];
                var fx = filter[0][~phase & 1];
                var fo = filter[1][~phase & 1];
                var fePtr = 0;
                var fxPtr = 0;
                var foPtr = 0;
                Dptr = 0;
                ptr = D[Dptr];
                _fx = fx[fxPtr];
                _fe = fe[fePtr];
                lo = _fx[0] * ptr[po + 0];
                lo += _fx[1] * ptr[po + 14];
                lo += _fx[2] * ptr[po + 12];
                lo += _fx[3] * ptr[po + 10];
                lo += _fx[4] * ptr[po + 8];
                lo += _fx[5] * ptr[po + 6];
                lo += _fx[6] * ptr[po + 4];
                lo += _fx[7] * ptr[po + 2];
                lo = -lo;
                lo += _fe[0] * ptr[pe + 0];
                lo += _fe[1] * ptr[pe + 14];
                lo += _fe[2] * ptr[pe + 12];
                lo += _fe[3] * ptr[pe + 10];
                lo += _fe[4] * ptr[pe + 8];
                lo += _fe[5] * ptr[pe + 6];
                lo += _fe[6] * ptr[pe + 4];
                lo += _fe[7] * ptr[pe + 2];
                pcm[pcm1Ptr++] = lo;
                pcm2Ptr = pcm1Ptr + 30;
                for (var sb = 1; sb < 16; ++sb) {
                    ++fePtr;
                    ++Dptr;
                    ptr = D[Dptr];
                    _fo = fo[foPtr];
                    _fe = fe[fePtr];
                    lo = _fo[0] * ptr[po + 0];
                    lo += _fo[1] * ptr[po + 14];
                    lo += _fo[2] * ptr[po + 12];
                    lo += _fo[3] * ptr[po + 10];
                    lo += _fo[4] * ptr[po + 8];
                    lo += _fo[5] * ptr[po + 6];
                    lo += _fo[6] * ptr[po + 4];
                    lo += _fo[7] * ptr[po + 2];
                    lo = -lo;
                    lo += _fe[7] * ptr[pe + 2];
                    lo += _fe[6] * ptr[pe + 4];
                    lo += _fe[5] * ptr[pe + 6];
                    lo += _fe[4] * ptr[pe + 8];
                    lo += _fe[3] * ptr[pe + 10];
                    lo += _fe[2] * ptr[pe + 12];
                    lo += _fe[1] * ptr[pe + 14];
                    lo += _fe[0] * ptr[pe + 0];
                    pcm[pcm1Ptr++] = lo;
                    lo = _fe[0] * ptr[-pe + 31 - 16];
                    lo += _fe[1] * ptr[-pe + 31 - 14];
                    lo += _fe[2] * ptr[-pe + 31 - 12];
                    lo += _fe[3] * ptr[-pe + 31 - 10];
                    lo += _fe[4] * ptr[-pe + 31 - 8];
                    lo += _fe[5] * ptr[-pe + 31 - 6];
                    lo += _fe[6] * ptr[-pe + 31 - 4];
                    lo += _fe[7] * ptr[-pe + 31 - 2];
                    lo += _fo[7] * ptr[-po + 31 - 2];
                    lo += _fo[6] * ptr[-po + 31 - 4];
                    lo += _fo[5] * ptr[-po + 31 - 6];
                    lo += _fo[4] * ptr[-po + 31 - 8];
                    lo += _fo[3] * ptr[-po + 31 - 10];
                    lo += _fo[2] * ptr[-po + 31 - 12];
                    lo += _fo[1] * ptr[-po + 31 - 14];
                    lo += _fo[0] * ptr[-po + 31 - 16];
                    pcm[pcm2Ptr--] = lo;
                    ++foPtr;
                }
                ++Dptr;
                ptr = D[Dptr];
                _fo = fo[foPtr];
                lo = _fo[0] * ptr[po + 0];
                lo += _fo[1] * ptr[po + 14];
                lo += _fo[2] * ptr[po + 12];
                lo += _fo[3] * ptr[po + 10];
                lo += _fo[4] * ptr[po + 8];
                lo += _fo[5] * ptr[po + 6];
                lo += _fo[6] * ptr[po + 4];
                lo += _fo[7] * ptr[po + 2];
                pcm[pcm1Ptr] = -lo;
                pcm1Ptr += 16;
                phase = (phase + 1) % 16;
            }
        }
    };
    MP3Synth.prototype.frame = function(frame) {
        var nch = frame.header.nchannels();
        var ns = frame.header.nbsamples();
        this.pcm.samplerate = frame.header.samplerate;
        this.pcm.channels = nch;
        this.pcm.length = 32 * ns;
        this.full(frame, nch, ns);
        this.phase = (this.phase + ns) % 16;
    };
    MP3Decoder = Decoder.extend(function() {
        Decoder.register("mp3", this);
        this.prototype.init = function() {
            this.floatingPoint = true;
            this.mp3_stream = new MP3Stream(this.bitstream);
            this.frame = new MP3Frame;
            this.synth = new MP3Synth;
        };
        this.prototype.readChunk = function() {
            var stream = this.mp3_stream;
            var frame = this.frame;
            var synth = this.synth;
            if (!stream.available(1)) return this.once("available", this.readChunk);
            if (!frame.decode(stream)) {
                if (stream.error !== MP3Stream.ERROR.BUFLEN && stream.error !== MP3Stream.ERROR.LOSTSYNC) this.emit("error", "A decoding error occurred: " + stream.error);
                return;
            }
            synth.frame(frame);
            var data = synth.pcm.samples, channels = synth.pcm.channels, len = synth.pcm.length, output = new Float32Array(len * channels), j = 0;
            for (var k = 0; k < len; k++) {
                for (var i = 0; i < channels; i++) {
                    output[j++] = data[i][k];
                }
            }
            this.emit("data", output);
        };
    });
})();