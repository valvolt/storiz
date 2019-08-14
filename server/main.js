import {PlayerData} from '../imports/imports.js';
import {AllContent} from '../imports/imports.js';
import uuid from 'uuid';

// Retrieve the list of available stories from the /private directory
var stories = JSON.parse(Assets.getText('stories.json'));

// loads the list of stories into the AllContent collection
function loadStories() {
  theStories = stories.stories;
  for (i in theStories) {
    // fetch the filename and description from the stories.json file
    oneStory = theStories[i];
    // retrieve the content of the corresponding <filename>.json file and append it
    var storyContent = JSON.parse(Assets.getText(oneStory.filename+'.json'));
    // scramble the Tiles of the story
    var scrambledStoryContent = scrambleTiles(storyContent);
    // Store the name of the story
    oneStory.Name = storyContent.Name;
    // Store the credits, if any
    oneStory.Credits = storyContent.Credits;
    // Its Tiles, enhanced with scrambled IDs
    oneStory.Tiles = scrambledStoryContent;
    // and Stuff
    oneStory.Stuff = storyContent.Stuff;
    // store the full story into the collection
    AllContent.insert(oneStory);

//console.log("INSERTING :");
//console.log(oneStory);
  }
}

// Add scrambled IDs to the a story Tiles to make cheating harder
function scrambleTiles(story) {
  // Loading Tiles into DB
  theTiles = story.Tiles;
  scrambledStory = [];

  // ScrambledTiles shall contains the same content as the Tiles, only... scrambled, and minimized.
  // In this method we generate the scrambled IDs and we store them in the Tiles collection for later mapping back.
  // to_tile values are randomized.
  // Actual scrambled tiles will be computed and returned upon client query

  for (i in theTiles) {
   oneTile = theTiles[i];
    // scramble the tile id
    oneTile.scrambled_id = uuid();
    // add a scrambled to_tile element to each choice (if choices are present)
    if(oneTile.choices != undefined) {
      for (var j = 0; j < oneTile.choices.length; j++) { 
        oneTile.choices[j].scrambled_to_tile = uuid();
      }
    }
    // add a scrambled to_tile element to each map element (if map is present)
    if(oneTile.map != undefined) {
      for (var j = 0; j < oneTile.map.length; j++) { 
        oneTile.map[j].scrambled_to_tile = uuid();
      }
    }
    // we store this complete item in the main collection
    scrambledStory.push(oneTile);
  }
  return scrambledStory;
}

// publishes the current player's data to the client
// we shall only return the data of the current player
Meteor.publish('mydata', function(playerId) {
  return PlayerData.find({ player: playerId });
});

// publishes all story names
Meteor.publish('storynames', function() {
  return AllContent.find({ },{fields : {'filename': 1, 'Name': 1,'description':1}});
});

Meteor.startup(() => {

AllContent.rawCollection().drop().catch(error => {
  // this might fail if the collection is not ready,
  // silently drop the error
});

PlayerData.rawCollection().drop().catch(error => {
  // this might fail if the collection is not ready,
  // silently drop the error
});

  // code to run on server at startup
  loadStories();
});

