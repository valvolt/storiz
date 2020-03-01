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
        // If the user tries to create a username with format Anonymous-X, this user
        // will be treated as a non-registered user...
        if(username.match(/Anonymous-[0-9]+/) != null) {
          console.log("Please don't choose a username looking like an anonymous account");
          Session.set('errorMessage', "Please don't choose a username looking like an anonymous account");
        } else {
          Accounts.createUser({
              username: username,
              password: password
          }, function(error){
            if(error){
              console.log(error.reason); // Output error if registration fails
              Session.set('errorMessage', error.reason);
          } else {
            // Was a story already specified? If yes, send there already
            storyname = Session.get('storyname');
            if(storyname == undefined) {
              Router.go('/');
            } else {
              Router.go('/story/'+storyname);
            }
          }
        })
      }
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
            // Was a story already specified? If yes, send there already
            storyname = Session.get('storyname');
            if(storyname == undefined) {
              Router.go('/');
            } else {
              Router.go('/story/'+storyname);
            }
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
    // Was a story already specified? If yes, send there already
    storyname = Session.get('storyname');
    if(storyname == undefined) {
      Router.go('/');
    } else {
      Router.go('/story/'+storyname);
    }
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
        mute();
        Meteor.call('exit');
        Meteor.logout();
    },
    'click .exit': function(event){
        event.preventDefault();
        mute();
        Meteor.call('exit');
    },
    'click .restart': function(event){
        event.preventDefault();
        Meteor.call('restart');
    },
    'click .credits': function(event){
        event.preventDefault();
        var x = document.getElementById("credits");
        if (x.style.display === "none") {
          x.style.display = "block";
        } else {
          x.style.display = "none";
        }
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
  bookmark() {
    // Persist current story name, useful to login or autologin to this story
    Session.set('storyname', Router.current().params._storyname);
  },
  loadOrRefresh() {
    // Check if the (right) story is loaded.
    // We do this by comparing the currently loaded story (if exists) with the current URL
    // Do we have data available?
    loadedData = PlayerData.find({});
    if(loadedData.count() > 0) {
      // we have something in memory. Is it the right story?
      currentStory = loadedData.fetch()[0].game;
      if (currentStory == Session.get('storyname')) {
        // nothing to do: we are on the right story
        return;
      }
    }
    // if we arrive here, it means that either we have nothing loaded, or we have the wrong story
    // let's fix this
    Meteor.call('loadStory',Session.get('storyname'));
  },
  playerData() {
    // get user data
    if(PlayerData.find({}).count() > 0) {
      return PlayerData.find({});
    } else {
    return null;}
  },
  music() {
    currentMusic = Session.get("music");
    // Three options:
    if(this.currentScrambledTile.music == currentMusic) {
      // 1- we have to play the same music
      //    - if it already plays -> we do nothing
      //    - if it was paused -> we restart it
      resume(this.currentScrambledTile.music);
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

Template.picture.helpers({
video() {
    var video = document.getElementById('video');
    video.load();
    video.play();
  }
});

Template.flag.events({
   'submit form': function(event) {
      event.preventDefault();
      var textValue = event.target.flag.value;
      event.target.flag.value = "";
      Meteor.call('unlock', textValue);
      // refresh page
      Meteor.call('toData', this.to_data);
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

// User profile and achievements
/////////////////////////////////////

Router.route('/profile/:_username', function () {
  this.render('profile');
});

Template.profile.helpers({
  isRegistered: function () {
    return (Meteor.user().username.match(/Anonymous-[0-9]+/) == null);
  }
});

Template.profile.helpers({
  achievements() {
    Meteor.call('populateAchievements',function(err,res){
      Session.set('achievements',res);
    });
    return Session.get('achievements');
  }
});

