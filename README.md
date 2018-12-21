# storiz
A simple engine for creating HTML5 choice-based games. Think super-simple Visual Novel. Built with Meteor.

[![Features tour](https://img.youtube.com/vi/7i0tOzKHSlw/0.jpg)](https://www.youtube.com/watch?v=7i0tOzKHSlw)

## HOW-TO RUN

cd storiz

meteor npm install

meteor

then from your web browser, go to http://localhost:3000

## CHANGES

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

- There is no error message in case a non-implemented tile is being chosen

- CSS is desesperately needed

- An editor should be developed, for that I need to add user support, create an admin account, and let it edit / create tiles

- UUIDs are generated at server start, not game start, making replay attacks somewhat possible. A better solution would be to generate UUIDs at each click.

## ON THE TODO LIST...

- create user accounts, persist progression in DB (for scoring, storing history of visited tiles etc.)

- make a tile editor (possibly with direct upload of pictures / videos to folder /public)

