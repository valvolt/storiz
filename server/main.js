import { Meteor } from 'meteor/meteor';

// Change this to your story file
var story = require('../stories/simplepath.json');

import {Tiles} from '../imports/api/tiles.js';
import {ScrambledTiles} from '../imports/api/tiles.js';
import {Stuff} from '../imports/api/tiles.js';

// TODO: make picture / video optional (so that we can write text only)

// The status of collected items
var items = [];

// Method to retrieve the data of the current Tile
Meteor.publish('currentTileContent', function (tileID) {

  // This method is called each time a button is clicked, or upon the loading of the first tile (tileID: 1)
  // If we clicked a button, we will need to unscramble the tileID, finding the target tile, and return it
  // If we load the first tile, we need to simply return it
  // In both cases, we need to check which of the choices shall be kept or greyed-out as well as update the inventory

  // We retrieve the Tile which offers this (scrambled) to_tile value
  someTiles = Tiles.find( { 'choices.scrambled_to_tile': tileID} , {fields: {'choices':1}} );

  // If we have found zero Tile AND that we are trying to load tileID 1, it means we are loading our very first Tile (at game start)
  isInitialLoad = false;
  if(someTiles.count() == 0 && tileID == '1')
    isInitialLoad = true;

  // If we have more than one Tile returned, it means that some UUID were badly generated (hash collision :( )
  if(someTiles.count() > 1) {
    console.log("FATAL ERROR: to_tile UUID not unique !");
    return null;
  }

  // Unless we are loading the first Tile, we need to process the click which led to this tile
  if(isInitialLoad == false) {

    var theOneTile = null;

    someTiles.forEach(function(oneTile) {
      // We shall have found one single Tile. Save this Tile for later processing
      theOneTile = oneTile;
    });

    // we are in our (single) tile. Now we shall loop over all choices
    allChoices = theOneTile.choices;
    allChoices.forEach(function(oneChoice) {
      // is it the correct choice?
      if (oneChoice.scrambled_to_tile == tileID) {
        // we have found the correct choice.
        // Extracting the original to_tile value
        tileID = oneChoice.to_tile;

        // if this choice gives one or several item(s), add them (if we don't have them already)
        if(oneChoice.item != undefined) {
          // we have something
          if(Array.isArray(oneChoice.item)) {
            // we have many things, iterate over them
              for(i in oneChoice.item) {
              addItem(oneChoice.item[i]);
              }
          } else {
            // we have one single item
            addItem(oneChoice.item);
          }
        }
         // if this choice uses one or several item(s), remove them (if possible)
        if(oneChoice.uses != undefined) {
          // we have something
          if(Array.isArray(oneChoice.uses)) {
            // we have many things, iterate over them
              for(i in oneChoice.uses) {
              removeItem(oneChoice.uses[i]);
              }
          } else {
            // we have one single item
            removeItem(oneChoice.uses);
          }
        }
      }
  });
}

  // at this stage, tileID shall contain the original to_tile value
  // we will populate the ScrambledTiles collection with just one tile, generated from the non-scrambled tile having the id tileID
  ScrambledTiles.rawCollection().drop();
  oneTile = Tiles.findOne({ id: tileID});
  // replace the id with scrambled_id
  oneTile.id = oneTile.scrambled_id;
  delete oneTile.scrambled_id;
  // loop over the choices
  for (var j = 0; j < oneTile.choices.length; j++) {
    // we replace the to_tile with its scrambled counterpart
    oneTile.choices[j].to_tile = oneTile.choices[j].scrambled_to_tile.toString();
    delete oneTile.choices[j].scrambled_to_tile;
    // we remove any mention of items being added or used
    delete oneTile.choices[j].item;
    delete oneTile.choices[j].uses;
    // we check if the choice should be active (e.g. if we have the required item(s))
    enabled = false;
    if(oneTile.choices[j].requires == null) {
      enabled = true;
    } else {
      // do we have one required item or more than one?
      if(Array.isArray(oneTile.choices[j].requires)) {
        // we have many things, iterate over them
        enabled = true;
        for(i in oneTile.choices[j].requires) {
          if(enabled == true) {
            enabled = checkRequiredItem(oneTile.choices[j].requires[i]);
          }
        }
      } else {
        // we have one single item
        enabled = checkRequiredItem(oneTile.choices[j].requires);
      }          
    }
    if(enabled == false)
      delete oneTile.choices[j].to_tile;
    // we remove any mention of items being required
    delete oneTile.choices[j].requires;
  }

console.log(oneTile);
  ScrambledTiles.insert(oneTile);
  return ScrambledTiles.find();
});

// adds an item to your inventory
function addItem(item) {
  if(item != undefined && items.indexOf(item) === -1) {
    items.push(item);
  }
}

// removes an item to your inventory
function removeItem(item) {
  var index = items.indexOf(item);
  if (index > -1) {
    items.splice(index, 1);
  }
}

// checks if you have the necessary item
function checkRequiredItem(item) {
  var index = items.indexOf(item);
  if(index === -1)
    return false;
  return true;
}


// Method to retrieve the stuff the player collects
Meteor.publish('currentStuffContent', function () {
  return Stuff.find( { key: { $in: items } } )
});

Meteor.startup(() => {
  // code to run on server at startup

  // populating DB...

  var insert_already_done = false

if(!insert_already_done) {

  // Setting the HTML <title>
  Meteor.call('setStoryTitle',story.Name);

  Tiles.rawCollection().drop();
  ScrambledTiles.rawCollection().drop();
  Stuff.rawCollection().drop();

  // Loading Tiles into DB
  theTiles = story.Tiles;
  theStuff = story.Stuff;

  console.log("Loading story: \""+story.Name+"\"");

  // ScrambledTiles shall contains the same content as the Tiles, only... scrambled, and minimized.
  // We keep a reference in the Tiles for mapping back.
  // to_tile values are randomized.

  for (i in theTiles) {
    oneTile = theTiles[i];
    // scramble the tile id
    oneTile.scrambled_id = Meteor.uuid();
    // add a scrambled to_tile element to each choice
    for (var j = 0; j < oneTile.choices.length; j++) { 
      oneTile.choices[j].scrambled_to_tile = Meteor.uuid();
    }
    // we store this complete item in the main collection
    Tiles.insert(oneTile);
  }

  for (i in theStuff) {
    Stuff.insert(theStuff[i]);
  }

  insert_already_done = true;
}
});
