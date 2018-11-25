import { Tiles } from '../api/tiles.js';
import { Stuff } from '../api/tiles.js';


import './body.html';

Template.body.helpers({
  tiles() {
    return Tiles.find({ id: Session.get("to_tile") });
  },
  loaded() {
        Session.set("items",[]);
	if(Tiles.find({ id: "1"}) != null){
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
    manageClick(event.target.getAttribute('tile'),event.target.getAttribute('item'),event.target.getAttribute('uses'));
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
    manageClick(event.target.getAttribute('tile'),event.target.getAttribute('item'),event.target.getAttribute('uses'));
  }
});

function manageClick(to_tile, itemName, usedItemName) {
    // removes the "used" item from the My Stuff list (if exists)
    if(usedItemName != "" && usedItemName != null){
      // there is an item to be removed from our Stuff list.
      myItems = Session.get("items");
      myItems.pop(usedItemName);
      Session.set("items",myItems);
    }

    // adds the "item" item to the My Stuff list (if there is one "item" option set)
    if(itemName != "" && itemName != null){
      myItems = Session.get("items");
      myItems.push(itemName);
      Session.set("items",myItems);
    }

    // sets tile to be redirected to
    Session.set("to_tile", to_tile);
}

Template.stuff.helpers({
  stuff() {
        return Stuff.find();
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
				var requires = choices[i].requires;
				if(!requires) {
					// nothing is required, we can proceed
					return true;
				} else {
					// we need some specific item(s) to proceed
					if(Session.get("items").includes(requires)) {
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
