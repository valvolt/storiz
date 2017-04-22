import { Meteor } from 'meteor/meteor';

import {Tiles} from '../imports/api/tiles.js';
import {Stuff} from '../imports/api/tiles.js';


Meteor.startup(() => {
  // code to run on server at startup

  // populating DB...

  var insert_already_done = false

if(!insert_already_done) {
  Tiles.rawCollection().drop(),
  Tiles.insert({
  "id": "1",
  "title": "So you want to try Storiz...",
  "text": "Hi from me, I'm the game designer. Storiz let you create interactive stories rather simply. It's in alpha version now but not completely useless. See the options below. Go see the receptionist. But to go there you'll need your car keys...",
  "video": "hello.webm",
  "picture": "",
  "choices": [
    {
      "text": "Let me pick-up my car keys",
      "to_tile": "1",
      "item" : "carKey"
    },
    {
      "text": "I'll take my Rubik's Cube",
      "to_tile": "1",
      "item" : "rubiksCube"
    },
    {
      "text": "Let's go see this receptionist !",
      "to_tile": "2",
      "requires": "carKey"
    },
  ]
}),
  Tiles.insert({
  "id": "2",
  "title": "Welcome to stage 2",
  "text": "Hi, I'm Marie. Did you see How your car key appeared in your 'MyStuff' section? Have a look at main.js, it's where all the logic is being handled. All the pages are stored as 'tiles', where your items are stored in a static 'stuff' table in the database. Wanna hear more? Just don't choose option 3, its tile is not yet implemented (nor is a corresponding error message...)",
  "video": "",
  "picture": "receptionist.jpg",
  "choices": [
    {
      "text": "Yes, tell me more, please !",
      "to_tile": "3"
    },
    {
      "text": "I think I got it. Thanks Marie, I'll go back to the beginning.",
      "to_tile": "1"
    },
    {
      "text": "This is option 3, the one not yet implemented",
      "to_tile": "4"
    }
  ]
}),
  Tiles.insert({
  "id": "3",
  "title": "This is the last page of the example story",
  "text": "Thanks for listening to me. As you'll see in main.js, you can transition via the 'to_tile' element. Each tile is a specific page. Just edit the existing ones and create new ones, they will be populated into the DB when you restart the server. Also, you can enable a certain option only if a certain item is in your inventory, like the car key. The JSON format should be self-explanatory. The app is still in alpha and has known bugs (for example, you can only grey-out options of the FIRST tile, for some reason) but the normal flow should work all right. Now go and create your stuff, store pictures and videos in /public (videos have precedence over pictures in case you specify both) and create your own story !",
  "video": "",
  "picture": "building.jpg",
  "choices": [
    {
      "text": "Thanks for everything",
      "to_tile": "1"
    },
    {
      "text": "This option should be grayed-out unless you have the Rubik's Cube",
      "to_tile": "1",
      "requires": "rubiksCube"
    }
  ]
}),
  Stuff.rawCollection().drop(),
  Stuff.insert({
    "key": "carKey",
    "name": "Car key",
    "description": "The key of your Tesla car. Tied to a 'Super Mario' keychain."
}),
  Stuff.insert({
    "key": "rubiksCube",
    "name": "Rubik's Cube",
    "description": "Always useful when getting bored"
}),
  insert_already_done = true;
}
});
 