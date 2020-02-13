// we create several collections:
// - one which contains all the static content, never published to the client
// - one for all achievements, only unlocked ones will be published to the client
// - one which contains player data, where we will publish only the current player's data
//   - when the client changes the "to_data" field,
//     the server loads the corresponding data in the "data" field
//   - when the server updates the "data" field,
//     the client updates the corresponding data in the UI
// - one which contains player flags (Stuff), kept on the server to make cheating harder
export const AllContent = new Mongo.Collection('allcontent');
export const AllAchievements = new Mongo.Collection('allachievements');
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

// adds this achievement to PlayerData, if not already there
function processAchievement(achievementKey,currentPlayer,currentGame) {
  if(achievementKey == undefined) return;
  // Retrieve player's achievements
  allPlayerAchievements = PlayerData.find({player:currentPlayer}).fetch()[0].Achievements;
  if(allPlayerAchievements == undefined) allPlayerAchievements = [];
  // Selects this story's achievements
  currentStoryAchievements = null;
  updateIndex = 0;
  for(i in allPlayerAchievements) {
    if(allPlayerAchievements[i].story == currentGame) {
      currentStoryAchievements = allPlayerAchievements[i];
      updateIndex = i;
      break;
    }
  }
  if(currentStoryAchievements == null) {
    // We had zero achievement for this story. Initializing...
    currentStoryAchievements = {};
    currentStoryAchievements.story = currentGame;
    currentStoryAchievements.trophies = [];
  }
  // Now we can check if we already unlocked this achievement
  if(currentStoryAchievements.trophies.includes(achievementKey)) {
    // we already have this one, nothing to do
  } else {
    // that's a new one ! Update the list
    currentStoryAchievements.trophies.push(achievementKey);
    // and save it
    allPlayerAchievements[updateIndex] = currentStoryAchievements;
    PlayerData.update({player:currentPlayer},{$set:{'Achievements':allPlayerAchievements}});
  }
}

// This method is called by the client when he chooses a Tile
Meteor.methods(
{
    // update the to_tile value of the current user's game
    'toData': function(to_data){
       currentPlayer = Meteor.userId();
       currentGame = PlayerData.find({'player':currentPlayer}).fetch()[0].game;

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

          // if we could not find any valid tile ID, we fallback to loading the first one
          // this allows to refresh the initial Tile (as it has no scrambled_to_tile value)
          if(to_tile == null) {
            to_tile = 1;
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

        // Did we unlock an Achievement?
        processAchievement(NewTile.achievement,currentPlayer,currentGame);

        // Retrieve the Stuff possessed currently by the player, since this influences available options
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
  if(storyname == null) return; // avoid throwing an error when we are not actually loading a story
  if(Meteor.isServer) {

    // We shall populate PlayerData with the content of the proper story's first tile
    currentData = {};
    currentData.player = Meteor.userId();
    currentData.game = storyname;
    // We shall populate PlayerFlags with the content of the proper story's first tile (e.g. nothing)
    currentFlags = {};
    currentFlags.player = Meteor.userId();
    currentFlags.Stuff = [];

    manyTiles = AllContent.find( { 'filename': storyname } , {fields: {'Credits':1,'Tiles':1,'Stuff':1,'_id':0}} ).fetch()[0];

    // do we have at least one item which can be activated with a code?
    // if yes we keep it in mind - this will be used to activate the input field on screen
    theStuff = manyTiles.Stuff;
    for (i in theStuff) {
      if(theStuff[i].code != undefined) {
        // found one !
        currentData.hasCode = 1;
        break;
      }
    }

    // stores the Credits
    currentData.Credits = manyTiles.Credits;
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
    currentData.to_data = oneScrambledTile.id;
    // save this state in the player's collections
    PlayerData.remove({player: Meteor.userId()});
    PlayerData.insert(currentData);

    //TODO: everywhere we delete something from PlayerFlags we should keep the Achievements intact (e.g. merely update the Stuff field)
    //TODO: maybe PlayerData shan't be entirely dropped either
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

// This method creates an anonymous user and logs-in
Meteor.methods(
{
  'autologin': function(loginToken){
    var MaxAnonUsers = 1000;
    if(Meteor.isServer) {
      // Anonymous users have a username with format Anonymous-X where X is a number.
      lowestNumber = Number.MAX_SAFE_INTEGER;
      highestNumber = 0;
      // We retrieve the highest and lowest numbers.
      allanonusers = Meteor.users.find({'username':/Anonymous-*/}).fetch();
      for (user in allanonusers) {
        username = allanonusers[user].username;
        usernumber = Number(username.split("-")[1]);
        if(usernumber < lowestNumber) {
          lowestNumber = usernumber;
        }
        if(usernumber > highestNumber) {
          highestNumber = usernumber;
        }
      }
      // How many anonymous users do we have currently?
      anonusers = Meteor.users.find({'username':/Anonymous-*/}).count();
      if(anonusers > MaxAnonUsers) {
        // To avoid anonymous users creep, we keep the latest MaxAnonUsers users only.
        // Since we make this check every time we create a user, we simply need to delete the oldest one
        Meteor.users.remove({'username':"Anonymous-"+lowestNumber});
      }
      // create new anonymous user.
      highestNumber++;
      newAnonUser = {};
      newAnonUser.username = "Anonymous-"+highestNumber;
      // there is a cryptic 'createdAt' field auto-added, but it will be easier to parse this one...
      newAnonUser.creationTime = Date.now();
      newUserId = Accounts.createUser(newAnonUser);
      // generate login token
      stampedLoginToken = Accounts._generateStampedLoginToken();
      stampedLoginToken.token = loginToken;
      // assign token to user
      Accounts._insertLoginToken(newUserId, stampedLoginToken);
    }
  }
});

// This method loops over all stories' achievements, and unlocks the ones the player found
Meteor.methods(
{
  'populateAchievements': function(achievements){
    achievementList = [];
    if(Meteor.isServer){
      // retrieving all achievements
      allAchievements = AllAchievements.find().fetch();
      // going through all of them, story per story
      for(i in allAchievements) {
        // prepare a new entry
        oneList = {};
        oneList.filename = allAchievements[i].filename;
        oneList.Achievements = [];
        // go through all achievements of the story, if any
        if(allAchievements[i].Achievements != null) {
          for(j in allAchievements[i].Achievements) {
            unlocked = false;
            // Did we unlock this one? Retrieving this story's collected trophies
            playerData = PlayerData.find({}).fetch()[0];
            //TODO FIX THIS: it might happen that this is empty - playerdata is populated upon story load, so no trophies if we did not load any story yet ! Fix is to populate playerData upon login
            if(playerData == undefined) return;
            collectedTrophies = playerData.Achievements;
            candidateKeys = [];
            if(playerData.Achievements != undefined) {
              // retrieving the trophies for the current story
              for(k in playerData.Achievements) {
                if(playerData.Achievements[k].story == allAchievements[i].filename) {
                  candidateKeys = playerData.Achievements[k].trophies;
                }
              }
              // at this stage, candidateKeys contains all currently processed story's achievement keys. All there is to do is to compare the current key to this list
              if(candidateKeys.includes(allAchievements[i].Achievements[j].key)) {
                // we have this one !
                unlocked = true;
              }
            }
            if(unlocked == true) {
              // we send the achievement in clear-text form
              oneList.Achievements.push(allAchievements[i].Achievements[j]);
            } else {
              // we send the achievement in hidden form
              hiddenItem = {};
              hiddenItem.trophy = allAchievements[i].Achievements[j].trophy;
              hiddenItem.name = "[LOCKED]"
              hiddenItem.description = "[LOCKED]"
              oneList.Achievements.push(hiddenItem);
            }
          }
          // store it if there is at least one achievement to be found
          if(oneList.Achievements.length > 0) {
            achievementList.push(oneList);
          }
        }
      }
    }
    return achievementList;
  }
});

// This method is invoked when the player submits an item code.
// It checks if an item has the corresponding code and returns the item key.
// If found, it adds the item to the player's stuff
Meteor.methods(
{
    'unlock': function(itemcode){
      if(Meteor.isServer) {
        // Fetch all Stuff from the story
        StoryStuff = AllContent.find( { 'filename': currentData.game } , {fields: {'Stuff':1,'_id':0}} ).fetch()[0];
        StoryStuff = StoryStuff.Stuff;
        // Fetch the current player's stuff
        currentStuff = PlayerFlags.find({player:Meteor.userId()}).fetch()[0].Stuff;

        // Do we have an item with the input code?
        for (var i=0 ; i < StoryStuff.length ; i++)
        {
          // check code, retrieve key
          if(StoryStuff[i].code == itemcode) {
            // found one match. We add the corresponding key to the player stuff
            currentStuff = Meteor.call('addItem',StoryStuff[i].key,currentStuff);
            PlayerFlags.update({player:Meteor.userId()},{$set:{'Stuff':currentStuff}});
          }
        }
      }
    }
});

