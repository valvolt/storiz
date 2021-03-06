# storiz
A simple engine for creating HTML5 choice-based games. Think super-simple Visual Novel. Built with Meteor.

Play/test it here: https://valvolt-storiz.herokuapp.com/

## LATEST NEWS (check the CHANGES below as well !)

A big, BIG thank you to Anne 'Shinari' Radunski who spent several weeks rethinking the complete user experience. She created beautiful prototypes which I used as a target to reach and she designed the Storiz logo. What I implemented is not as perfect as what she proposed, but it's a huge improvement over the previous version.

Just compare these screenshots:

'D3mons' story:

![Old](https://raw.githubusercontent.com/valvolt/storiz/master/public/tutorial/sample-storiz.png)
![New](https://raw.githubusercontent.com/valvolt/storiz/master/public/tutorial/new-sample-storiz.png)

'Tutorial':

![Old](https://raw.githubusercontent.com/valvolt/storiz/master/public/tutorial/tuto-storiz.png)
![New](https://raw.githubusercontent.com/valvolt/storiz/master/public/tutorial/new-tuto-storiz.png)


There is still work to do on the design, but it's reasonably functional so I thought I could release it to you.

Enjoy, and as usual, feedback welcome !

## HOW-TO RUN

### on your machine

```
cd storiz
meteor npm install
meteor
```

then from your web browser, go to http://localhost:3000

### from Docker

```
docker build --no-cache -t storiz .
docker run -d -p 80:3000 --name storiz storiz:latest
```

then from your web browser, go to http://localhost

## CHANGES

[Done] - Major redesign of the whole UI, made possible by Anne Radunski's impressive designs (thanks again Anne !). There is still some work to do (cf TODO list underneath) but it works good already.

[New] - The new design gave birth to the 'mood' feature, which lets you choose background effects. This one has untapped potential that I may explore later.

[New] - Stories are now auto-saved. You can switch between them and resume where you left. If you have registered your account, you can now logout and resume playing later. Of course though, Anonymous users will lose their progress between sessions.

[Fixed/New] - Now stories URLs can be bookmarked. Changing the URL will also now load the proper story. This should also get rid of the 'please refresh your browser' error message.

[Fixed] - Achievements are now working properly. Updated the tutorial to explain how to use them. Achievements are persisted for the user between games (according that it's a registered user - Anonymous accounts won't access achievements as they would anyway be lost between sessions)

[New] - Added a new feature named 'item codes'. Players knowing the right code(s) can unlock the corresponding item(s) via an input field auto-added to your story if it needs it. I have an idea in mind for these codes, if you want to know you'll have to be patient :)

[New] - My friend Henrik added a Dockerfile for those of you who want to deploy Storiz in a docker container. The /public and /private directories will map to your local Document folder (on Windows machine) if you run the container with the command described in the Dockerfile. Thanks Henrik for this welcome contribution!

[New] - Added a profile page for the user, where his achievements are displayed. Added an 'achievement' field as well for stories. As usual, features.json shows how this works. There a some known limitations.

[New] - Added an actual short sci-fi story named D3mons to give you a better feel of the engine - I hope you'll enjoy it :) With this story I come closer to the original idea I had when creating Storiz: a platform for cool stories which intermix with other types of gameplay such as hacking exercises. Don't expect real hacking there though, all you have to do is choose well where you click :) There is a hidden golden ending to show what achievements shall look like, but the feature is still under development as I'm writing this.

[NEW] - Added 'Credits' feature. Use this to credit artists who contributed to your stories. Players can show/hide them from the top menu.

[NEW] - Played a bit with the CSS formatting. Now on laptop screens the text and choices will appear on the right side of the screen, removing the need to scroll back and forth. If you narrow the window or if you play on a mobile, the text should appear under the picture as before.

[NEW] - Instead of creating an account, one can now use the 'autologin' feature. At the login page, click on the 'login as anonymous' or go to /autologin. This will create an anonymous user without a password. Only the last MaxAnonUsers users will be kept on the database (default value: 1000).

[NEW] - I've added a new private collection storing the story flags (e.g. Stuff keys) out of the main PlayerData collection. As this new PlayerFlags collection is never published, this avoids a data leak which could help players to cheat.

[FIXED] - Upon the first story load, the server does not push its data to the client. The workaround is to refresh the page once. I still do not understand why since after this refresh everything runs smoothly...

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

- The new UI design is really nice on laptops but don't work anymore on mobile phones. I should create a specific design for mobiles, not sure where to start with this one.

- Whenever I do a database structure change, I need to delete user accounts on Heroku. Just create a new account, sorry for that. And if your account does not work anymore, it might be that it's still an old version. Either create another account or send me a message and I will delete the defective account for you.

- An editor should be developed, for that I need to add user roles, create an admin account, and let it edit / create tiles

- UUIDs are generated at server start, not game start, making replay attacks somewhat possible. A better solution would be to generate UUIDs at each click.

- Since all assets are stored in the /public folder, forced browsing is possible if resources have predictable names (e.g. 1.jpg 2.jpg etc.). Not sure much can be done to prevent this (of course you can choose to create assets with cryptic names :)).

## ON THE TODO LIST...

- persist progression in DB (for logging / scoring, storing history of visited tiles etc.)

- make a tile editor (possibly with direct upload of pictures / videos to folder /public)

- explain how the 'logout', 'restart', 'exit' and other functions work. They are rather self-explanatory though.

- add a 'change password' feature and a 'reset password' feature.

- redesign the 'Credits' page

- complete the 'Profile' page, let user upload an avatar and display the avatar with the username
