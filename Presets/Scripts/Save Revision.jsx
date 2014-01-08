#target photoshop

const kRevSettings = "rev_settings";
const kDBId = app.stringIDToTypeID("dbId");
const kDBToken = app.stringIDToTypeID("dbToken");

var db_id = '';
var db_token = '';
var time = new Date().getTime();
var desc = app.getCustomOptions(kRevSettings);
var doc_name = app.activeDocument.name;

if (desc.hasKey(kDBId)) {
  db_id = desc.getString(kDBId);
}

if (desc.hasKey(kDBToken)) {
  db_token = desc.getString(kDBToken);
}

var generatorDesc = new ActionDescriptor();

generatorDesc.putString(app.stringIDToTypeID("name"), "revisionary");
generatorDesc.putString(app.stringIDToTypeID("saveFile"), true);
generatorDesc.putString(app.stringIDToTypeID("fileName"), doc_name);
generatorDesc.putString(app.stringIDToTypeID("dbId"), db_id);
generatorDesc.putString(app.stringIDToTypeID("dbToken"), db_token);
generatorDesc.putString(app.stringIDToTypeID("currTime"), time);

executeAction(app.stringIDToTypeID("generateAssets"), generatorDesc, DialogModes.NO);
