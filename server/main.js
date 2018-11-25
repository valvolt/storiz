import { Meteor } from 'meteor/meteor';

// Change this to your story file
var story = require('../stories/samplestory.json');

import {Tiles} from '../imports/api/tiles.js';
import {Stuff} from '../imports/api/tiles.js';

// Method to retrieve the data of the current Tile
Meteor.publish('currentTileContent', function (tileID) {
  return Tiles.find({ id: tileID});
});

// Method to retrieve the stuff the player collects
Meteor.publish('currentStuffContent', function (items) {
  if(items == null)
    items = [];
  return Stuff.find( { key: { $in: items } } )
});

Meteor.startup(() => {
  // code to run on server at startup

  // populating DB...

  var insert_already_done = false

if(!insert_already_done) {

  // Setting the HTML <title>
  Meteor.call('setStoryTitle',story.Name);

  Tiles.rawCollection().drop(),
  Stuff.rawCollection().drop(),

  // Loading Tiles into DB
  theTiles = story.Tiles;
  theStuff = story.Stuff;

  console.log("Loading story: \""+story.Name+"\"");

  for (i in theTiles) {
    Tiles.insert(theTiles[i]);
  }

  for (i in theStuff) {
    Stuff.insert(theStuff[i]);
  }

  insert_already_done = true;
}
});
