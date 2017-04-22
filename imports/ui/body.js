import { Tiles } from '../api/tiles.js';
import { Stuff } from '../api/tiles.js';

import './body.html';

Template.body.helpers({
  tiles() {
    return Tiles.find({ id: Session.get("to_tile") });
  },
  loaded() {
	if(Tiles.find({id: "1" }) != null){
  	  Session.set("to_tile","1");
  	  return true;
  	} else {
  		return false;
  	}
  }
},
);

Template.story.onCreated(function helloOnCreated() {
  // first tile has ID 1
  currentTile = new ReactiveVar(1);
  // Session cleanup (in case a previous one is being found on the player's computer)
  Session.keys = {};
  //Session.set("items",[]);

});

Template.story.helpers({
  currentTile() {
    return currentTile.get();
  },
});

Template.story.events({
  'click button'(event, instance) {
  	// get the value of the 'to_tile' of the pressed element
  	currentTile.set(event.target.value);
  	// TODO: detect if next page does not exist, and display an error message plus the possibility to restart at tile 1

  	// loads the corresponding tile
  	// nextPage = Tiles.find({ id: event.target.value.toString() });
  	// if(nextPage[0] == undefined) {
  	// 	console.log("page does not exist");
  	// } else {
  	// 	console.log("page does exist");
  	// }

  	Session.set("to_tile", event.target.value);
  	// adds the item to the My Stuff list
  	if(event.target.name != ""){
  	  // there is an item to be picked-up.
  	  // Let's fetch it from the DB
  	  var item = Stuff.find({"key": event.target.name}).fetch();
  	  // Storing it inside the current Session
  	  // If the list is empty, store it as-is
  	  if(!Session.get("items")) {
  	    Session.set("items",item);	
  	  } else {
  	  	// there is already one item. Let's see if we already have the object, we don't want duplicates
  	  	if(isInMyStuff(event.target.name)) {
  	  	} else {
  	  	  // there is already one item. Let's append the second one
  	  	  var newArray = Session.get("items").concat(item);
  	  	  Session.set("items",newArray);
  	  	}
  	  }
  	}
  },
});

// checks if item (key) is in possession of the player
function isInMyStuff(key) {
	allTheStuff = Session.get("items");
	if (allTheStuff == undefined) return false;
	// iterate over list
	for (var i=0; i < allTheStuff.length; i++) {
		if(allTheStuff[i].key == key) {
			return true;
		}
	}
	return false;
}


Template.stuff.helpers({
  stuff() {
	return Session.get("items");
  },
});

Template.choice.helpers({
	// TODO: for some reason, enabled() is invoked only on page 1 and not on subsequent pages
	// Even more weird: when I go back from page 3 to page 1 then enabled() gets executed ??
	// Why not on page 2 and page 3 ?
	enabled() {
		// if no specific item is required, the choice is enabled
		var currentText = this.text;
		// retrieving the choice
		choice = Tiles.find({id: currentTile.get().toString()}, {"choices":1,"_id":0}).fetch();
		// extracting choices element
		var choices = choice[0].choices;
		// iterate over choices to find the current one
		for(var i=0; i < choices.length; i++) {
			if(choices[i].text == currentText) {
				// found it. Fetching the possible 'required' item
				// TODO: allow multiple items to be required instead of just one (make this an array)
				var requires = choices[i].requires;
				console.log(choices[i]);
				console.log(requires);
				if(!requires) {
					// nothing is required, we can proceed
					return true;
				} else {
					// we need some specific item(s) to proceed
					if(isInMyStuff(requires)) {
						// we have the item we need
						return true;
					}
					// we don't have the necessary item(s)
					return false;
				}
			}
		};
		return true;
	}
});
