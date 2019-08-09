# storiz
A simple engine for creating HTML5 choice-based games. Think super-simple Visual Novel. Built with Meteor.

[![Features tour](https://img.youtube.com/vi/7i0tOzKHSlw/0.jpg)](https://www.youtube.com/watch?v=7i0tOzKHSlw)

## LATEST NEWS

I finally managed to fix the concurrent access issue ! In Meteor, Sessions are shared by all users. So when two players were playing, each click on one button would refresh both pages, making the game unplayable. Now you can register and login. As long as two players run as a different user they should be fine.

I learned a lot more how the refresh 'magic' of Meteor does work in the process, I rewrote almost the engine from scratch and removed code which worked but was really ugly. Now there is only one strange issue I don't know how to fix, that's why on first start you will have to refresh your page. For some reason after the first reload everything runs smoothly.

The home page says that you can login as demo/demo. Of course, you will have to register this user the first time otherwise this won't work.

Last, I'm still not too sure how Meteor handles package downloads. I've now committed .meteor/packages, this should hopefully make meteor npm install more efficient and avoid the need to run meteor remove insecure and the like.

Enjoy, and as usual, feedback welcome !

## HOW-TO RUN

cd storiz

meteor npm install

meteor remove autopublish

meteor remove insecure

meteor

then from your web browser, go to http://localhost:3000

## CHANGES

[NEW] - Now instead of hardcoding your story path, you edit /private/stories.json. This will populate a page where from users can choose which story to play. Also, they can now click 'exit' to go back to the story menu or 'restart' to reload the story

[FIXED] - Since the engine does not handle users, if several users play concurrently each choice made by each user will affect all the other users

[DONE] - create user accounts

[FIXED] - There is now an 'under construction' error message in case a non-implemented tile is being chosen

[NEW] - Added sound support. Looping, continuous music can be played with 'music'. One-time, tile specific sounds can be played with 'sound'.

[NEW] - Choices which require items to activate can now be completely removed ("disable":"invisible") instead of the default behavior which grey them out (same as "disable":"grey").

[NEW] - You can now create several tiles with the same ID. One of them will then be picked at random. Use this to add some replay value to your stories !

[DONE] - make cheating more complex: IDs are now replaced by UUIDs generated at server start, making difficult to predict where each choice will lead (especially if two choices lead to the same page). Item management is now server-side only, making impossible to see which choice gives/uses which item or how to enable greyed-out choices.

[DONE] - only one 'required' item at the moment, should be replaced by an array => you can now specify an array for 'requires', 'item' and/or 'uses' elements.

[DONE] - uninstall 'insecure' package of Meteor (and debug the subscriptions)

[NEW] - add heatmaps (pictures with coordinates, each associated to a transition just like a choice)

[FIXED] - Greyed-out options should be ungreyed from the start when player has the correct item in stock, not only upon choosing the item

[FIXED] - 'required' objects only work on page 1, for some reason method 'enabled()' only works for tile 1

[FIXED] - The current version uses 'name' for storing required object and 'value' for storing the target tile when clicking on a <button>. This <button> should be replaced by something more free-form with dedicated tags (using name and value for this is ugly).

## KNOWN BUGS & LIMITATIONS

- CSS is desesperately needed

- An editor should be developed, for that I need to add user support, create an admin account, and let it edit / create tiles

- UUIDs are generated at server start, not game start, making replay attacks somewhat possible. A better solution would be to generate UUIDs at each click.

- Since all assets are stored in the /public folder, forced browsing is possible if resources have predictable names (e.g. 1.jpg 2.jpg etc.). Not sure much can be done to prevent this.

- Upon the first story load, the server does not push its data to the client. The workaround is to refresh the page once. I still do not understand why since after this refresh everything runs smoothly...

## ON THE TODO LIST...

- persist progression in DB (for scoring, storing history of visited tiles etc.)

- make a tile editor (possibly with direct upload of pictures / videos to folder /public)

- update the demo tour Youtube video with the latest content of the sample story and with user registration/login
