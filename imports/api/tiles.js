import { Mongo } from 'meteor/mongo';
export const Tiles = new Mongo.Collection('tiles');
export const Stuff = new Mongo.Collection('stuff');

var storyTitle = "storiz";

Meteor.methods(
{
    'getStoryTitle': function(){
       return storyTitle;
    }
});

Meteor.methods(
{
    'setStoryTitle': function(newtitle){
       storyTitle = newtitle;
    }
});

