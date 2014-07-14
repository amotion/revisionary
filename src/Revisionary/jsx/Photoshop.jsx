#target photoshop

const kRevSettings = "rev_settings";
const kFileSettings = "file_settings";

const kRevClientKey = app.stringIDToTypeID("rev_client_key");

const kDBId = app.stringIDToTypeID("dbId");
const kDBToken = app.stringIDToTypeID("dbToken");
const kDBType = app.stringIDToTypeID("dbType");

const kFileUrl = app.stringIDToTypeID("fileUrl");
const kFileStatus = app.stringIDToTypeID("fileStatus");

const keyTextData = app.charIDToTypeID("TxtD");
const ktextToClipboardStr = app.stringIDToTypeID("textToClipboard");


$._ext_save_and_copy={
  run : function(time,db_id,db_token) {

    try {
        var doc_name = app.activeDocument.name;
        var generatorDesc = new ActionDescriptor();
        generatorDesc.putString(app.stringIDToTypeID("name"), "revisionary");
        generatorDesc.putString(app.stringIDToTypeID("saveFile"), true);
        generatorDesc.putString(app.stringIDToTypeID("fileName"), doc_name);
        generatorDesc.putString(app.stringIDToTypeID("dbId"), db_id);
        generatorDesc.putString(app.stringIDToTypeID("dbToken"), db_token);
        generatorDesc.putString(app.stringIDToTypeID("currTime"), time);
        executeAction(app.stringIDToTypeID("generateAssets"), generatorDesc, DialogModes.NO);
        return doc_name + '-' + time + '.png';
    } catch(err) {
        return 'Photoshop is drunk';
    }

  },
};

$._ext_reset_settings={
    run : function() {
          var desc = new ActionDescriptor();
          desc.putString(kDBId, '');
          desc.putString(kDBToken, '');
          desc.putString(kDBType, '');
          desc.putString(kRevClientKey, '');
          app.putCustomOptions(kRevSettings, desc, true);
          return true;
    },
};

$._ext_save_settings={
    run : function(db_id,db_token,db_type,rev_client_key) {
		  var desc = new ActionDescriptor();
		  desc.putString(kDBId, db_id);
		  desc.putString(kDBToken, db_token);
		  desc.putString(kDBType, db_type);
          desc.putString(kRevClientKey, rev_client_key);
		  app.putCustomOptions(kRevSettings, desc, true);
		  return [ desc.getString(kDBId), desc.getString(kDBToken), desc.getString(kDBType), desc.getString(kRevClientKey) ];
	},
};

$._ext_get_settings={
    run : function() {

		var auth_uid = '';
		var auth_token = '';
		var auth_type = '';
        var client_key = '';

		var desc = app.getCustomOptions(kRevSettings);

		if (desc.hasKey(kDBId)) {
			auth_uid = desc.getString(kDBId);
		}
		if (desc.hasKey(kDBToken)) {
			auth_token = desc.getString(kDBToken);
		}
		if (desc.hasKey(kDBType)) {
			auth_type = desc.getString(kDBType);
		}
        if (desc.hasKey(kRevClientKey)) {
            client_key = desc.getString(kRevClientKey);
        }

		return [ auth_uid, auth_token, auth_type, client_key ];
	}
};


$._ext_get_file_url={
    run : function() {

        var file_url = 'false';
        var desc = app.getCustomOptions(kFileSettings);

        if (desc.hasKey(kFileUrl)) {
            file_url = desc.getString(kFileUrl);
        }

        return file_url;
    }
};

$._ext_clear_file_url={
    run : function() {

        var file_url = 'false';
        var desc = new ActionDescriptor();

        desc.putString(kFileUrl, file_url);
        app.putCustomOptions(kFileSettings, desc, true);

        file_url = app.getCustomOptions(kFileSettings).getString(kFileUrl);

        return file_url;
    }
};

$._ext_get_file_status={
    run : function() {

        var file_status = 'false';
        var desc = app.getCustomOptions(kFileSettings);

        if (desc.hasKey(kFileStatus)) {
            file_status = desc.getString(kFileStatus);
        }

        return file_status;
    }
};

$._ext_clear_file_status={
    run : function() {

        var file_status = 'false';
        var desc = new ActionDescriptor();

        desc.putString(kFileStatus, file_status);
        app.putCustomOptions(kFileSettings, desc, true);

        file_status = app.getCustomOptions(kFileSettings).getString(kFileStatus);

        return file_status;
    }
};

$._ext_copy_text_to_clipboard={
    run : function(txt) {

        var textStrDesc = new ActionDescriptor();

        textStrDesc.putString(keyTextData, txt);

        executeAction(ktextToClipboardStr, textStrDesc, DialogModes.NO);

        return 'Copied to clipboard: ' + txt;
    }
};
