import {PlayerData} from '../imports/imports.js';
import {AllContent} from '../imports/imports.js';
import {Template} from 'meteor/templating';
import uuid from 'uuid';

// Authentication and User management
/////////////////////////////////////

Router.route('/register');
Router.route('/login');
Router.route('/autologin');

// used for logout and for quitting current game
Router.configure({
    layoutTemplate: 'headerfooter'
});

Template.register.events({
    'submit form': function(event){
        event.preventDefault();
        var username = $('[name=username]').val();
        var password = $('[name=password]').val();
        Accounts.createUser({
            username: username,
            password: password
        }, function(error){
          if(error){
            console.log(error.reason); // Output error if registration fails
            Session.set('errorMessage', error.reason);
        } else {
          Router.go('/');
        }
      })
    }
});

Template.register.helpers({
  errorMessage: function() {
    return Session.get('errorMessage');
  }
});

Template.login.events({
    'submit form': function(event){
        event.preventDefault();
        var username = $('[name=username]').val();
        var password = $('[name=password]').val();
        Meteor.loginWithPassword(username, password, function(error){
          if(error){
            // 'User not found' and 'Incorrect password' are too verbose, let's fix that
            if(error.reason == "User not found") {error.reason = "Incorrect username or password"}
            if(error.reason == "Incorrect password") {error.reason = "Incorrect username or password"}
            console.log(error.reason);
            Session.set('errorMessage', error.reason);
          } else {
            Router.go('/');
          }
       })
     }
});

Template.login.helpers({
  errorMessage: function() {
    return Session.get('errorMessage');
  }
});

// Used to create an anonymous user automatically (and to delete old anonymous users)
Template.autologin.helpers({
  autologin: function() {
    loginToken = uuid();
    Meteor.call('autologin',loginToken);
    Meteor.loginWithToken(loginToken);
    Router.go('/');
  }
});


Template.headerfooter.helpers({
  playerData() {
    // get user data (used to display current game)
    if(PlayerData.find({}).count() > 0) {
      return PlayerData.find({});
    }
    return null;
  }
});

Template.headerfooter.events({
    'click .logout': function(event){
        event.preventDefault();
        Meteor.call('exit');
        Meteor.logout();
    },
    'click .exit': function(event){
        event.preventDefault();
        Meteor.call('exit');
    },
    'click .restart': function(event){
        event.preventDefault();
        Meteor.call('restart');
    },
});

// Stories
//////////

// home page is the menu where to choose your story
Router.route('/', {
    template: 'stories'
});

// Get the list of stories stored in AllContent
Meteor.subscribe('storynames');

Template.stories.helpers({
  allContent() {
    // get list of all available stories
    if(AllContent.find({}).count() > 0) {
      return AllContent.find({});
    }
    return null;
  },
});

// Triggers when we click on a story name link
Template.stories.events({
  'click a'(event, instance) {
    url = event.target.href;
    // url is of format http://<location>/story/<storyname>
    storyname = url.split("/");
    storyname = storyname[storyname.length-1];
    // loading story data...
    Meteor.call('loadStory',storyname);
  }
});


// Game
////////

Router.route('/story/:_storyname', function () {
  this.render('game');
});

// Get updated when the user's PlayerData is modified
Tracker.autorun(() => {
  Meteor.subscribe('mydata',Meteor.userId());
});

Template.game.helpers({
  playerData() {
    // get user data
    if(PlayerData.find({}).count() > 0) {
//console.log("SOME DATA FOUND");
//console.log(PlayerData.find({}).fetch()[0]);
      return PlayerData.find({});
    } else {
    return null;}
  },
  currentGame() {
    currentData = PlayerData.find({}).fetch()[0];
    if(currentData == undefined) {
      return null;
    } else {
      return currentData.game;
    }
  },
  music() {
    currentMusic = Session.get("music");
    // Three options:
    if(this.currentScrambledTile.music == currentMusic) {
      // 1- we have to play the same music -> we do nothing
    } else if(this.currentScrambledTile.music == undefined) {
      // 2- we do not have any music to play -> we stop the current music
      mute();
    } else {
      // 3- we have a new music to play -> stop the current one and start the new one
      muteAndPlay(this.currentScrambledTile.music);
    }
    Session.set("music",this.currentScrambledTile.music);
  }
});

Template.game.events({
  'click area'(event, instance) {
    manageClick(event.target.getAttribute('tile'));
  }
});

Template.game.events({
  'click button'(event, instance) {
    manageClick(event.target.getAttribute('tile'));
  }
});

// updates the to_tile value of the PlayerData of the current user
function manageClick(to_data) {
  // updates the to_data field of PlayerData
  //and asks server to fetch the corresponding data
  Meteor.call('toData', to_data);
};

Template.sound.helpers({
  hasSound: function (sound) {
    return (sound && sound.length > 0);
  }
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

