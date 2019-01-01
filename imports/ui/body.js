import {ScrambledTiles} from '../api/tiles.js';
import {Stuff} from '../api/tiles.js';

import './body.html';

Template.body.helpers({
  tiles() {
    // since there is only one match, we can return them all ;)
    return ScrambledTiles.find({ });
  },
  loaded() {

        // set story title
        var title = 'storiz';
        Meteor.call('getStoryTitle', function(error,result) {
          document.title = result;
        })

        // play story music
        Meteor.call('getMusic', function(error,result) {
          var audio = new Audio(result);
          audio.load();
          audio.loop = true;
          audio.play();
        })

        // load initial tile
        Session.set("to_tile","1");
        return true;
  },
},
);

Template.map.events({
  'click area'(event, instance) {
    manageClick(event.target.getAttribute('tile'));
  }
});

Template.story.onCreated(function helloOnCreated() {
  // first tile has ID 1
  currentTile = new ReactiveVar(1);
});

Template.story.events({
  'click button'(event, instance) {
    manageClick(event.target.getAttribute('tile'));
  }
});

function manageClick(to_tile) {
    // sets tile to be redirected to
    Session.set("to_tile", to_tile);
}

Template.stuff.helpers({
  stuff() {
        return Stuff.find({ });
  },
});

Template.text.helpers({
  text() {
    // we shall replace the carriage returns with actual HTML carriage returns :)
    return this.text.replace(/\n/g, '<br/>');
  }
});

Template.choice.helpers({
	enabled() {
          // if the to_tile option is set, then the choice is enabled.
          if(this.to_tile != undefined)
            return true;
          return false;
	}
});
