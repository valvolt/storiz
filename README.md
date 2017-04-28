# storiz
A simple engine for creating HTML5 choice-based games. Think super-simple Visual Novel. Built with Meteor.

## HOW-TO RUN

cd storiz

meteor npm install

meteor

## CHANGES

[NEW] - add heatmaps (pictures with coordinates, each associated to a transition just like a choice)

[FIXED] - Greyed-out options should be ungreyed from the start when player has the correct item in stock, not only upon choosing the item

[FIXED] - 'required' objects only work on page 1, for some reason method 'enabled()' only works for tile 1

[FIXED] - The current version uses 'name' for storing required object and 'value' for storing the target tile when clicking on a <button>. This <button> should be replaced by something more free-form with dedicated tags (using name and value for this is ugly).

## KNOWN BUGS & LIMITATIONS

- only one 'required' item at the moment, should be replaced by an array

- There is no error message in case a non-implemented tile is being chosen

- CSS is desesperately needed

- An editor should be developed, for that I need to add user support, create an admin account, and let it edit / create tiles


## ON THE TODO LIST...

- create user accounts, persist progression in DB (for scoring, storing history of visited tiles etc.)

- make a tile editor (possibly with direct upload of pictures / videos to folder /public)

- uninstall 'insecure' package of Meteor (and debug the subscriptions)

- make cheating more complex: replace IDs with UUIDs, possibly dynamically generated for avoiding replay, namely by sniffing the to_tile of all three options and playing them one after the other, or for saving the key name of an item for a subsequent re-play in another game
