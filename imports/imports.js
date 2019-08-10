// we create 3 collections:
// - one which contains all the static content, never published to the client
// - one which contains player data, where we will publish only the current player's data
// - when the client changes the "to_data" field,
//   the server loads the corresponding data in the "data" field
// - when the server updates the "data" field,
//   the client updates the corresponding data in the UI
// - one which contains player flags (Stuff), kept on the server to make cheating harder
export const AllContent = new Mongo.Collection('allcontent');
export const PlayerData = new Mongo.Collection('playerdata');
export const PlayerFlags = new Mongo.Collection('playerflags');

// This function takes one JSON object which contains one Tile, and the current Stuff of the player.
// It swaps real IDs with scrambled IDs, and removes at the time inaccessible choices (minimize)
Meteor.methods(
{
  'minimize': function(oneTile,stuff){
  if(Meteor.isServer) {
    // replace the id with scrambled_id
    oneTile.id = oneTile.scrambled_id;
    delete oneTile.scrambled_id;
    // if we have choices, loop over them
    if(oneTile.choices != undefined) {
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
                enabled = Meteor.call('checkRequiredItem',oneTile.choices[j].requires[i],stuff);
              }
            }
          } else {
            // we have one single item
            enabled = Meteor.call('checkRequiredItem',oneTile.choices[j].requires,stuff);
          }          
        }

      var disable = "grey";
      if(enabled == true)
        disable = "no";
      if(enabled == false) {
        // shall we grey-out the choice or delete it entirely?
        if(oneTile.choices[j].disable == null) {
          // by default we grey-out
          disable = "grey";
        } else {
          disable = oneTile.choices[j].disable;
        }
      }
      // if the choice is supposed to be invisible, remove it entirely
      if(disable == "invisible") {
        oneTile.choices.splice(j, 1);
        j--;
      } else if(disable == "grey") {
        delete oneTile.choices[j].to_tile;
        delete oneTile.choices[j].requires;
        delete oneTile.choices[j].disable;
      } else {
        delete oneTile.choices[j].disable;
      }
    }
  }

  // if we have a map, loop over its choices
  if(oneTile.map != undefined) {
    for (var j = 0; j < oneTile.map.length; j++) {
      // we replace the to_tile with its scrambled counterpart
      oneTile.map[j].to_tile = oneTile.map[j].scrambled_to_tile.toString();
      delete oneTile.map[j].scrambled_to_tile;
      // we remove any mention of items being added or used
      delete oneTile.map[j].item;
      delete oneTile.map[j].uses;
      // we check if the choice should be active (e.g. if we have the required item(s))
      enabled = false;
      if(oneTile.map[j].requires == null) {
        enabled = true;
      } else {
        // do we have one required item or more than one?
        if(Array.isArray(oneTile.map[j].requires)) {
          // we have many things, iterate over them
          enabled = true;
          for(i in oneTile.map[j].requires) {
            if(enabled == true) {
              enabled = Meteor.call('checkRequiredItem',oneTile.map[j].requires[i],stuff);
            }
          }
        } else {
          // we have one single item
          enabled = Meteor.call('checkRequiredItem',oneTile.map[j].requires,stuff);
        }
      }
      // we remove any mention of items being required
      delete oneTile.map[j].requires;

      if(enabled == false) {
        // we completely remove the option
        delete oneTile.map[j];
      }
    }
  }}
  return oneTile;
  }
});

// checks if you have the necessary item
Meteor.methods({
  'checkRequiredItem': function(item,stuff){
  if(Meteor.isServer) {
    var index = stuff.indexOf(item);
    if(index === -1)
      return false;
    return true;
  }
}});

// This method updates the player's Stuff (add/remove item) according to the chosen choice or map
Meteor.methods({
  'updateStuff' : function(oneChoice){
    if(Meteor.isServer){
    currentStuff = PlayerFlags.find({player:Meteor.userId()}).fetch()[0].Stuff;

    // if this choice gives one or several item(s), add them (if we don't have them already)
    if(oneChoice.item != undefined) {
      // we have something
      if(Array.isArray(oneChoice.item)) {
        // we have many things, iterate over them
          for(i in oneChoice.item) {
          currentStuff = Meteor.call('addItem',oneChoice.item[i],currentStuff);
          }
      } else {
        // we have one single item
        currentStuff = Meteor.call('addItem',oneChoice.item,currentStuff);
      }
    }
    // if this choice uses one or several item(s), remove them (if possible)
    if(oneChoice.uses != undefined) {
      // we have something
      if(Array.isArray(oneChoice.uses)) {
        // we have many things, iterate over them
          for(i in oneChoice.uses) {
          currentStuff = Meteor.call('removeItem',oneChoice.uses[i],currentStuff);
          }
      } else {
        // we have one single item
        currentStuff = Meteor.call('removeItem',oneChoice.uses,currentStuff);
      }
    }
    // Update player's Stuff
    PlayerFlags.update({player:currentPlayer},{$set:{'Stuff':currentStuff}});
  }}
});

// adds an item to your inventory
Meteor.methods({
  'addItem': function(item,items){
    if(item != undefined && items.indexOf(item) === -1) {
      items.push(item);
    }
    return items;
  }
});

// removes an item to your inventory
Meteor.methods({
  'removeItem': function(item,items){
    var index = items.indexOf(item);
    if (index > -1) {
      items.splice(index, 1);
    }
    return items;
  }
});

// This method is called by the client when he chooses a Tile
Meteor.methods(
{
    // update the to_tile value of the current user's game
    'toData': function(to_data){
       currentPlayer = Meteor.userId();
       currentGame = PlayerData.find({}).fetch()[0].game;

      if(Meteor.isServer) {
        // Loads the PlayerData corresponding to this new tile value
        // Search in AllContent the data corresponding to the to_data value

          AllTiles = AllContent.find({'filename':currentGame}).fetch()[0].Tiles;

        // We have a scrambled ID assigned to a Choice. We need first to retrieve the associated real ID
          to_tile = null;
        // Run through all Tiles
          for (var i=0 ; i < AllTiles.length ; i++)
          {
            if(to_tile != null) break;
            AllChoices = AllTiles[i].choices;
            if(AllChoices != undefined) {
              // Run through all Choices
              for (var j=0 ; j < AllChoices.length ; j++)
              {
                if(AllChoices[j].scrambled_to_tile == to_data)
                {
                  // update the player's Stuff accordingly
                  Meteor.call('updateStuff',AllChoices[j]);
                  // retrieve the non-scrambled tile ID
                  to_tile = AllChoices[j].to_tile;
                  break;
                }
              }
            }
            AllMaps = AllTiles[i].map;
            if(AllMaps != undefined) {
              // Run through all Maps
              for (var j=0 ; j < AllMaps.length ; j++)
              {
                if(AllMaps[j].scrambled_to_tile == to_data)
                {
                  // update the player's Stuff accordingly
                  Meteor.call('updateStuff',AllMaps[j]);
                  // retrieve the non-scrambled tile ID
                  to_tile = AllMaps[j].to_tile;
                  break;
                }
              }
            }
          }

        var NewTiles = [];
        // Now that we have the real ID, we search for the corresponding Tile(s)
          for (var i=0 ; i < AllTiles.length ; i++)
          {
              if (AllTiles[i].id == to_tile) {
                NewTiles.push(AllTiles[i]);
              }
          }

        // If we have more than one Tile, choose one at random.
        // Use this feature with care !
        rnd = ~~(Math.random() * NewTiles.length); 
        NewTile = NewTiles[rnd];

        AllKeys = PlayerFlags.find({player:currentPlayer}).fetch()[0].Stuff;
        // Stripping the Tile from all the non-scrambled data
        NewTile = Meteor.call('minimize', NewTile, AllKeys);

        // Stuff management: PlayerFlags.Stuff contains all the stuff keys (e.g. story flags).
        // We retrieve the key + description when available and append them to the current Tile

        // Fetch all Stuff from the story
        StoryStuff = AllContent.find( { 'filename': currentData.game } , {fields: {'Stuff':1,'_id':0}} ).fetch()[0];
        StoryStuff = StoryStuff.Stuff;
        TileStuff = [];

        for (var i=0 ; i < StoryStuff.length ; i++)
        {
          // check if we have the key in our player Stuff (key, name, description)
          if(AllKeys.includes(StoryStuff[i].key)) {
            oneItem = {};
            oneItem.name = StoryStuff[i].name;
            oneItem.description = StoryStuff[i].description;
            TileStuff.push(oneItem);
          }
        }

        // Append current Stuff to the Tile
        NewTile.Stuff = TileStuff;

        // Update the PlayerData accordingly
        PlayerData.update({player:currentPlayer},{$set:{'currentScrambledTile':NewTile}});

        // this triggers a Tile refresh on-screen
        PlayerData.update({player:currentPlayer},{$set:{'to_data':to_data}});
      }
    }
});

// This method is called by the client when a new game is loaded
Meteor.methods(
{
  'loadStory': function(storyname){
//console.log("loadStory called: "+storyname);
  if(Meteor.isServer) {

    // We shall populate PlayerData with the content of the proper story's first tile
    currentData = {};
    currentData.player = Meteor.userId();
    currentData.game = storyname;
    // We shall populate PlayerFlags with the content of the proper story's first tile (e.g. nothing)
    currentFlags = {};
    currentFlags.player = Meteor.userId();
    currentFlags.Stuff = [];

    manyTiles = AllContent.find( { 'filename': storyname } , {fields: {'Tiles':1,'_id':0}} ).fetch()[0];
    // at this stage manyTiles contains all Tiles from the story. Searching for tile #1
    manyTilesContent = manyTiles.Tiles;
    oneTile = null;
    for (i = 0; i < manyTilesContent.length; i++) {
      oneTile = manyTilesContent[i];
      if(oneTile.id == '1') {
        break;
      }
    }

    // here, oneTile contains the Tile with ID 1. We minimize it, store it, and return.
    oneScrambledTile = Meteor.call('minimize',oneTile,currentFlags.Stuff);

    currentData.currentScrambledTile = oneScrambledTile;
    // save this state in the player's collections
    PlayerData.remove({player: Meteor.userId()});
    PlayerData.insert(currentData);
    PlayerFlags.remove({player: Meteor.userId()});
    PlayerFlags.insert(currentFlags);
  }
}
});


// This method ends a game and clears all player data
Meteor.methods(
{
    'exit': function(){
      currentPlayer = Meteor.userId();
      // go back to home page
      if(Meteor.isClient) {
        Router.go('/');
      }
      if(Meteor.isServer) {
        // Drop player data
        PlayerData.remove({player:currentPlayer});
        PlayerFlags.remove({player:currentPlayer});
      }
    }
});

// This method restarts the current game
Meteor.methods(
{
    'restart': function(){
      currentPlayer = Meteor.userId();
      currentStory = PlayerData.find({player:currentPlayer}).fetch()[0].game;
      Meteor.call('loadStory',currentStory);
    }
});

