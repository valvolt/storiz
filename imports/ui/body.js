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

Template.map.events({
  'click area'(event, instance) {
    manageClick(event.target.getAttribute('tile'),event.target.getAttribute('item'));
  }
});

Template.story.onCreated(function helloOnCreated() {
  // first tile has ID 1
  currentTile = new ReactiveVar(1);
  // Session cleanup (in case a previous one is being found on the player's computer)
//  Session.keys = {};
  //Session.set("items",[]);
});

Template.story.events({
  'click button'(event, instance) {
    manageClick(event.target.getAttribute('tile'),event.target.getAttribute('item'));
  }
});

function manageClick(to_tile, itemName) {
    // adds the item to the My Stuff list
    if(itemName != "" && itemName != null){
      // there is an item to be picked-up.
      // Let's fetch it from the DB
      var item = Stuff.find({"key": itemName}).fetch();
      // Storing it inside the current Session
      // If the list is empty, store it as-is
      if(!Session.get("items")) {
        Session.set("items",item);  
      } else {
        // there is already one item. Let's see if we already have the object, we don't want duplicates        
        if(isInMyStuff(itemName)) {
        } else {
          // there is already one item. Let's append the second one
          var newArray = Session.get("items").concat(item);
          Session.set("items",newArray);
        }
      }
    }
    // sets tile to be redirected to
    Session.set("to_tile", to_tile);
}

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
	enabled() {
		// if no specific item is required, the choice is enabled
		var currentText = this.text;
		// retrieving the choice
    choice = Tiles.find({id: Session.get("to_tile")}, {"choices":1,"_id":0}).fetch();
		// extracting choices element
		var choices = choice[0].choices;
		// iterate over choices to find the current one
		for(var i=0; i < choices.length; i++) {
			if(choices[i].text == currentText) {
				// found it. Fetching the possible 'required' item
				// TODO: allow multiple items to be required instead of just one (make this an array)
				var requires = choices[i].requires;
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
