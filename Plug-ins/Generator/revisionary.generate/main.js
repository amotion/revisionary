(function () {
    "use strict";

    var PLUGIN_ID = require("./package.json").name,
        MENU_ID = "revisionary",
        MENU_LABEL = "Revisionary",
        DB_KEY = "ohu15auk3qwy1za";

    var _document = null,
        _generator = null,
        _config = null,
        client = null,
        db_uid = null,
        db_token = null;

    var fs = require('fs'),
        path = require('path'),
        PNG = require('pngjs').PNG,
        Dropbox = require('dropbox');

    function init(generator, config) {

        _generator = generator;
        _config = config;

        _generator.addMenuItem(MENU_ID, MENU_LABEL, true, false).then(
            function () {
                console.log("Menu created", MENU_ID);
            }, function () {
                console.error("Menu creation failed", MENU_ID);
            }
        );

        _generator.onPhotoshopEvent("generatorMenuChanged", handleGeneratorMenuClicked);

        function initLater() {

        }
        process.nextTick(initLater);

    }

    function handleGeneratorMenuClicked(event) {

        // Ignore changes to other menus
        var menu = event.generatorMenuChanged;
        if (!menu || menu.name !== MENU_ID) {
            return;
        }

        var startingMenuState = _generator.getMenuState(menu.name);
        var saveFile = event.generatorMenuChanged.saveFile;

        if (saveFile) {
            var dbId = event.generatorMenuChanged.dbId;
            var dbToken = event.generatorMenuChanged.dbToken;
            var currTime = event.generatorMenuChanged.currTime;
            var fileName = event.generatorMenuChanged.fileName;

            var str = "var desc = new ActionDescriptor();" +
                      "desc.putString(app.stringIDToTypeID('fileStatus'), 'uploading');" +
                      "app.putCustomOptions('file_settings', desc, true );" +
                      "var file_status = app.getCustomOptions('file_settings').getString(app.stringIDToTypeID('fileStatus'));";

            sendJavascript(str);

            if (! startingMenuState.checked) {
                updateMenuState(true);
            }

            if (client) {
                savePngToDropbox(fileName + '-' + currTime);
            } else {
                initDbClient(dbToken, dbId, function () {
                    savePngToDropbox(fileName + '-' + currTime);
                });
            }
        } else {
            if (startingMenuState.checked) {
                updateMenuState(false);
            } else {
                updateMenuState(true);
            }
        }

    }

    function initDbClient(token, uid, callback) {

        client = new Dropbox.Client({
            key: DB_KEY,
            token: token,
            uid: uid
        });

        client.getAccountInfo(function(error, accountInfo) {
            if (error) {
                sendJavascript("alert('" + error + "');"); // Something went wrong.
            }
            if (callback) {
                callback();
            }
        });

    }

    function writeDbFile(name,data) {

        client.writeFile(name, data, function(error, stat) {
            if (error) {
                sendJavascript("alert('" + error + "');"); // Something went wrong.
            }

            client.makeUrl(name, { longUrl: true }, function(error, url) {
              if (error) {
                sendJavascript("alert('" + error + "');"); // Something went wrong.
              }
              var str = "var desc = new ActionDescriptor();" +
                      "desc.putString(app.stringIDToTypeID('fileUrl'), '"+url.url+"');" +
                      "app.putCustomOptions('file_settings', desc, true );" +
                      "var saved_url = app.getCustomOptions('file_settings').getString(app.stringIDToTypeID('fileUrl'));";

              sendJavascript(str);
            });

        });

    }

    function savePngToDropbox(filename) {
        _generator.getDocumentInfo().then(
            function (document) {

                filename = filename + '.png';
                _document = document;

                // A little bit of Alchemy
                // sendDocumentThumbnailToNetworkClient (flattened preview of currently opened doc)
                var str = 'var idNS = stringIDToTypeID("sendDocumentThumbnailToNetworkClient" );'+
                           'var desc1 = new ActionDescriptor();'+
                           'desc1.putInteger( stringIDToTypeID( "width" ), app.activeDocument.width );'+// width
                           'desc1.putInteger( stringIDToTypeID( "height" ), app.activeDocument.height );'+// height
                           'desc1.putInteger( stringIDToTypeID("format"), 2 );'+ // FORMAT: 2=pixmap, 1=jpeg
                           'executeAction( idNS, desc1, DialogModes.NO );'+
                           // set document units to PIXELS, users often use POINTS, so we force it to PIXELS
                           'app.preferences.rulerUnits = Units.PIXELS;'+
                           // we return back the current width and height as string divided by a comma
                           // the value of the last line always gets returned back
                           'app.activeDocument.width+","+app.activeDocument.height;';

                var pixmap = {};

                _generator._photoshop.on("pixmap", function (messageID, messageBody) { // , rawMessage)
                        // documentThumbnail always comes in RGB, without Alpha element
                        pixmap.channelCount = 3;
                        pixmap.pixels = messageBody;
                        pixmap.pixels.parent = {};
                        console.log("pixmap");
                        console.log("length: "+pixmap.pixels.length);
                        console.log("pixmap: "+pixmap.pixels[12]);

                        for(var i=0;i<200;i++){
                            console.log(i+": "+pixmap.pixels[i]);
                        }

                });

                 _generator.evaluateJSXString(str).then(
                    function(result){
                        // get width and height
                        var obj = result.split(",");
                        pixmap.width = parseInt(obj[0]);
                        pixmap.height = parseInt(obj[1]);

                        // divider value is on 12th byte
                        var divider = pixmap.pixels[12]; // 16 or 32 or more

                        // reconstruct buffer by bitmap size multiplied by 4 for RGBA
                        var len = pixmap.width*pixmap.height*4;
                        var rgbaPixels = new Buffer(len);
                        var pixels = pixmap.pixels;

                        // first 16 bytes of pixmap is header, skip it
                        var n = 16;

                        for(var i=0;i<len;i+=4){
                            rgbaPixels.writeUInt8(pixels[n], i);
                            rgbaPixels.writeUInt8(pixels[n+1], i+1);
                            rgbaPixels.writeUInt8(pixels[n+2], i+2);

                            // Add Alpha
                            rgbaPixels.writeUInt8(255, i+3);
                            n+=3;

                            // detect the new line and skip bytes by 1 (16) or 2 (32)
                            if(i%pixmap.width==1){
                                if(divider==16){
                                    n+=1;
                                }else if(divider==32){
                                    n+=2;
                                }//else nothing... can be higher
                            }
                        }

                        var png = new PNG({
                            width: pixmap.width,
                            height: pixmap.height
                        });

                        // set pixel data
                        png.data = rgbaPixels;

                        var fileName = filename;
                        var filePath = path.resolve(__dirname, fileName);
                        var fileStream = fs.createWriteStream(filePath);

                        // write to dropbox on close
                        fileStream.on('close', function() {
                            fs.readFile(filePath, function (err,data) {
                                if (data) {
                                    writeDbFile(fileName,data);

                                    // delete file after writing
                                    fs.unlink(filePath, function (err) {
                                        if (err) {
                                            sendJavascript("alert('"+err+"');");
                                        }
                                    })
                                }
                            });
                        });

                        // save local png
                        png.pack().pipe(fileStream);

                    },
                    function(err){
                        console.log(err);
                    });
            },
            function (err) {
                // console.error("[Tutorial] Error in getDocumentInfo:", err);
            }
        ).done();
    }

    function updateMenuState(enabled) {
        _generator.toggleMenu(MENU_ID, true, enabled);
    }

    function sendJavascript(str){

        _generator.evaluateJSXString(str).then(
            function(result){
                console.log(result);
            },
            function(err){
                console.log(err);
            });

    }

    function stringify(object) {

        try {
            return JSON.stringify(object, null, "    ");
        } catch (e) {
            console.error(e);
        }
        return String(object);

    }

    exports.init = init;

    // Unit test function exports
    exports._setConfig = function (config) { _config = config; };

}());
