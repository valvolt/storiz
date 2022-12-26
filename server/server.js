
// Storiz2 server

var express = require('express');
var cookieParser = require('cookie-parser');
const uuid = require('uuid');

var app = express();
var fsp = require('fs').promises;

app.use(express.json())
app.use(cookieParser())
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('etag', false);

//app.use(function (req, res, next) {
//  res.setHeader("Content-Type", "application/json");
//  next();
//})

//app.use(function (req, res, next) {
//  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self'");
//  next();
//})

app.use(function(req, res, next) {
  if (req.path.startsWith('/public/')) {
    res.setHeader("Content-Type", "text/html");
  }
  next();
});

const publicDir = './public/';
const privateDir = './private/';
var stories = []
var players = []

// Main page
//
// If user is not authenticated, prompt user for login
// If user is authenticated, prompt for story choice

app.get('/', function (req, res) {

  var user = "";
  if(req.cookies.SESSION != undefined) {
    user = req.cookies.SESSION;
  }
  
  const homepage1 = "<html><head></head><body><h1>Storiz</h1>"
  const homepage2 = "</body></html>"
  var loggedIn = "<h2>Welcome, "+user+"</h2><a href='/stories'>Select story</a>"
  const loggedOut = "<form method='POST' action='/login'><input name='username'/><button type='submit'>Login</button></form><a href='/register'>Register</a>"

  res.setHeader("Content-Type", "text/html");
  if (user == "") {
    res.send(homepage1+loggedOut+homepage2);
  } else {
    res.send(homepage1+loggedIn+homepage2);
  }

})

// Register new user
app.get('/register', function (req, res) {

  const registerpage = "<html><head></head><body><h1>Storiz</h1><form method='POST' action='/register'><input name='username'/><button type='submit'>Register</button></form></body></html>"

  res.setHeader("Content-Type", "text/html");
  res.send(registerpage);
})

app.post('/register', function (req, res) {
  // check if user already exists
  for (let player of players) {
    if(player.username == req.body.username) {
      // user already exists, sending error message
      res.send({"error":"User already exists"});
      return;
    }
  }
  // create user
  var player = {};
  player.username = req.body.username;
  player.stories = [];
  players.push(player);
  
  // log user in (session valid for 4 hours)
  res.cookie('SESSION',req.body.username, { maxAge: 14400000, httpOnly: true });
  res.redirect('/');
})


// Logs user in
app.post('/login', function (req, res) {
  // Does the user exist?
  for (let player of players) {
    if(player.username == req.body.username) {
      // user already exist, logging in
        res.cookie('SESSION',req.body.username, { maxAge: 900000, httpOnly: true });
        res.redirect('/');
        return;
    }
  }
  // user does not exist, sending error message
  res.setHeader("Content-Type", "application/json");
  res.send({"error":"Bad username or password"});
})


// Returns the list of available stories
app.get('/stories', function (req, res) {
  var list = "";
  for (let story of stories) {
    list += "<a href='/story/"+story.Name+"'>"+story.Name+"</a>";
  }
  res.setHeader("Content-Type", "text/html");
  res.send(list);
})

// Loads story for player
//
// Loads the main page canvas, then fetches the user's current Tile content for the current story
app.get('/story/:name', function (req, res) {

  // Get player
  var username = "";
  if(req.cookies.SESSION != undefined) {
    username = req.cookies.SESSION;
  } else {
    // If no user is logged-in, propose to log in
    res.setHeader("Content-Type", "application/json");
    res.send({"error":"please log in"});
    return;
  }

  // Does the player exist?
  var currentPlayer = undefined
  for (let player of players) {
    if(player.username == username) {
      currentPlayer = player;
    }
  }
  if (currentPlayer == undefined) {
    console.log("Forged SESSION cookie - "+req.cookies.SESSION);
    res.setHeader("Content-Type", "application/json");
    res.send({"error":"server error"});
    return;
  }

  // Does the story exist?
  var currentStory = undefined;
  // make a copy of stories to later edit them while keeping original tiles intact
  storiesCopy = JSON.parse(JSON.stringify(stories));

  for (let story of storiesCopy) {
    if(story.Name == req.params.name) {
      currentStory = story;
    }
  }

  if(currentStory == undefined) {
    console.log("Forged story name - "+req.params.name);
    res.setHeader("Content-Type", "application/json");
    res.send({"error":"server error"});
    return;
  }

  var tileToFetch = "";

  // Did the player ever play this story?
  newStory = {};
  for (let playerStory of currentPlayer.stories) {
    if(playerStory.name == req.params.name) {
      newStory = playerStory;
    }
  }
  if(newStory.name == undefined) {
    // New story for user. We'll then fetch tile 1
    tileToFetch = 1
  } else {
    // Known story for user.
    tileToFetch = newStory.tile.scrambledId
  }

  const canvas = `
<html>
  <head>
    <meta charset="utf-8">
    <meta name="description" content="A dynamic story game with branching paths and multiple choices">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="stylesheet" href="/main.css">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <title id='title'>...</title>
    <style>
      img {
        width: 40vw;
        height: auto
      }
      video {
        width: 100%
      }
      #picture,
      #video {
        display: none;
        margin: 0 auto;
        text-align: center;
        height: auto
      }
      #choices button {
        display: block;
        margin-top: 10px;
      }
      #background {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-size: cover;
        filter: blur(10px);
        z-index: -2;
      }
      #content {
        background-color: #ccc;
        padding: 10px;
        position: absolute;
        top: 0;
        bottom: 0;
        left:  calc(5%);
        right: 0;
        width: calc(100% - 10%);
        z-index: -1;
        overflow: scroll;
      }



#stuff {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background-color: #333;
  color: #fff;
  font-weight: bold;
}

tr:nth-child(even) {
  background-color: #ddd;
}

tr:nth-child(odd) {
  background-color: #ccc;
}

td:first-child,
th:first-child {
  width: 30%;
}



    </style>
  </head>
  <body>
    <div id="background"></div>
    <div id="main">
      <header>
        <h1 id="title"></h1>
      </header>
      <div id="content">
        <main>
          <div id="picture">
            <img src="" id="img">
            <map name="clickable" id="map"></map>
          </div>
          <div id="video">
            <video autoplay controls>
              <source src="" type="video/mp4">
            </video>
          </div>
          <p id="text"></p>
          <div id="choices">
          </div>
          <div id="stuff">
          <p>&nbsp;</p>
          <table>
          </table>
          </div>
        </main>
      <footer>
        <p>Copyright 2022</p>
      </footer>
      </div>
    </div>

    <script>
      var currentMusic = ""
      var currentAudio = new Audio();
      function processMusic(newMusic) {
        if(newMusic == currentMusic) {
          // nothing to do, we keep the music playing
          return;
        } else {
          currentMusic = newMusic
          if(currentMusic == "") {
            // stop music
            currentAudio.pause();
          } else {
            // stop music, load and play new music
            currentAudio.pause();
            var thisAudio = new Audio(currentMusic);
            thisAudio.load();
            thisAudio.loop = true;
            thisAudio.play();
            currentAudio = thisAudio;
          }
        }
      }



  const mapElement = document.getElementById("map");

  mapElement.addEventListener('click', function(event) {
    event.preventDefault();
    processTile(event.target.getAttribute('to_tile'));
  });

    
      function processTile(tileID) {
        var xhttp = new XMLHttpRequest();

        // update elements based on fetched data
        xhttp.onreadystatechange = function() {
          if (this.readyState == 4 && this.status == 200) {
            var tile = JSON.parse(this.responseText);

debug = tile;

            // music
            processMusic(tile.music)

            // sound
            if (tile.sound) {
              var thisSound = new Audio(tile.sound);
              thisSound.load();
              thisSound.play();
            }

            // picture
            if (tile.picture) {
              document.getElementById("background").style.backgroundImage = "url(" + tile.picture + ")";
            } else {
              document.getElementById("background").style.backgroundImage = none;
            }


            if (tile.picture && !tile.video) {
              document.getElementById("picture").style.display = "block";
              document.getElementById("img").src = tile.picture;
            } else {
              document.getElementById("picture").style.display = "none";
            }

            // video
            if (tile.video) {
              document.getElementById("video").style.display = "block";
              document.getElementById("video").firstElementChild.src = tile.video;
              document.getElementById("video").firstElementChild.type = "video/mp4";
            } else {
              document.getElementById("video").style.display = "none";
            }

            // title
            if (tile.title == undefined) {
              document.getElementById("title").style.display = "none";
            } else {
              document.getElementById("title").innerHTML = tile.title;
              document.getElementById("title").style.display = "block";
            }

            // text
            if (tile.text == undefined) {
              document.getElementById("text").style.display = "none";
            } else {
              document.getElementById("text").innerHTML = tile.text;
              document.getElementById("text").style.display = "block";
            }

            // choices
            if (tile.choices == undefined) {
              document.getElementById("choices").style.display = "none";
            } else {
              document.getElementById("choices").innerHTML = "";
              for (var i = 0; i < tile.choices.length; i++) {
                var button = document.createElement("button");
                button.innerHTML = tile.choices[i].text;
                if (tile.choices[i].disabled) {
                  button.disabled = true;
                } else {
                  button.setAttribute("to_tile", tile.choices[i].to_tile)
                  button.onclick = function() {
                    processTile(this.getAttribute("to_tile"));
                  };
                }
                document.getElementById("choices").appendChild(button);
              }
              document.getElementById("choices").style.display = "block";
            }

            // map
            imgElement = document.getElementById("img");
            window.addEventListener('resize', adjustCoords);
            imgElement.addEventListener('load', adjustCoords);
            if (tile.map == undefined) {
              if (imgElement.hasAttribute('usemap')) {
                imgElement.setAttribute('usemap', '');
                while (mapElement.firstChild) {
                  mapElement.removeChild(mapElement.firstChild);
                }
              }
            } else {
              imgElement.setAttribute('usemap', '#clickable');

              tile.map.forEach(area => {
                const areaElement = document.createElement('area');
                areaElement.setAttribute('shape', area.shape);
                areaElement.setAttribute('origcoords', area.coords);
                areaElement.setAttribute('coords', area.coords);
                areaElement.setAttribute('href', "#");
                areaElement.setAttribute('to_tile', area.to_tile);
                mapElement.appendChild(areaElement);
              });
            }
            
            // stuff
            if (Array.isArray(tile.stuff) && tile.stuff.length > 0) {
              document.getElementById("stuff").style.display = "block";
              const table = document.getElementById('stuff').querySelector('table');
              table.innerHTML = "<tr><th>Stuff</th><th>Description</th></tr>";
              tile.stuff.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = "<td>"+item.name+"</td><td>"+item.description+"</td>";
                table.appendChild(row);
              });
            } else {
              document.getElementById("stuff").style.display = "none";
            }
          }
        };

        // fetch user data
        var storyname = "`+req.params.name+`";
        xhttp.open("GET", "/story/"+storyname+"/"+tileID, true);
        xhttp.send();
      }

      // resizes the 'map' coordinates to the size of the image
      function adjustCoords() {
        const imgElement = document.getElementById("img");
        var height = imgElement.naturalHeight;
        var currentHeight = imgElement.clientHeight;

        const mapElement = document.getElementById("map");
        
        if (imgElement.hasAttribute('usemap')) {
          // scale according to new clientHeight / naturalHeight ratio
          var ratio = currentHeight / height;
          // recompute map coordinates
          var areaElements = mapElement.getElementsByTagName("area");

          for (var i = 0; i < areaElements.length; i++) {
            var coords = areaElements[i].attributes.origcoords.value;
            // rescale each coord
            var newCoords = "";

            coords.split(",").forEach(function(coord) {
              newCoords += coord * ratio + ",";
            });

            // Remove the trailing comma from the newCoords string
            newCoords = newCoords.substring(0, newCoords.length - 1);

            // Stores new coords
            areaElements[i].coords = newCoords;
          }
        }
      }

      
      function init() {
        processTile('`+tileToFetch+`');
      }
      
var debug = ""

      window.onload = init();
    </script>

  </body>
</html>
`
  
  res.setHeader("Content-Type", "text/html");
  res.send(canvas);
})

// returns the content of the specified tile, for the specified story, for the currently logged-in user
app.get('/story/:name/:tileId', function (req, res) {

  // Get player
  var username = "";
  if(req.cookies.SESSION != undefined) {
    username = req.cookies.SESSION;
  } else {
    // If no user is logged-in, propose to log in
    res.setHeader("Content-Type", "application/json");
    res.send({"error":"please log in"});
    return;
  }

  // Does the player exist?
  var currentPlayer = undefined
  for (let player of players) {
    if(player.username == username) {
      currentPlayer = player;
    }
  }
  if (currentPlayer == undefined) {
    console.log("Forged SESSION cookie - "+req.cookies.SESSION);
    res.setHeader("Content-Type", "application/json");
    res.send({"error":"server error"});
    return;
  }

  // Does the story exist?
  var currentStory = undefined;
  // make a copy of stories to later edit them while keeping original tiles intact
  storiesCopy = JSON.parse(JSON.stringify(stories));

  for (let story of storiesCopy) {
    if(story.Name == req.params.name) {
      currentStory = story;
    }
  }

  if(currentStory == undefined) {
    console.log("Forged story name - "+req.params.name);
    res.setHeader("Content-Type", "application/json");
    res.send({"error":"server error"});
    return;
  }

  // Did the player ever play this story?
  newStory = {};
  for (let playerStory of currentPlayer.stories) {
    if(playerStory.name == req.params.name) {
      newStory = playerStory;
    }
  }
  if(newStory.name == undefined || req.params.tileId == "1") {
    // New story for user. Whatever tile is requested, we return the tileID "1"

    // remove player from players
    players.splice(players.indexOf(currentPlayer));
    
    // update player
    newStory.name = req.params.name;
    newStory.stuff = [];
    newStory.achievements = [];
    for (let tile of currentStory.Tiles) {
      if(tile.id == "1") {
        newStory.tile = tile;
      }
    }
    currentPlayer.stories.push(scramble(newStory, "1"));
    // store updated player in players
    players.push(currentPlayer);

    // tile 1 is loaded for player, return it
    var newTile = newStory.tile;
    res.setHeader("Content-Type", "application/json");
    res.send(newTile);

  } else {
    // Known story for user. Is the requested tileID valid?
    // if tileID is the current tile, we just return (refresh)
    if(req.params.tileId == newStory.tile.scrambledId) {
      res.setHeader("Content-Type", "application/json");
      res.send(newStory.tile);
    } else {
      // is the tileId valid? Let's try to retrieve it
      const element = newStory.tilemap.find(obj => obj.scrambled_to_tile === req.params.tileId);
      if(element == undefined) {
        // invalid tile !
        console.log("Forged tile - "+req.params.tileId+" for story - "+req.params.name);
        // return the current tile instead
        res.setHeader("Content-Type", "application/json");
        res.send(newStory);
        return;
      }

    // at this point, the tile is valid.
    
    // Did we obtain or lose stuff?
    var currentStuff = newStory.stuff;
    // retrieve the items obtained when performing the choice
    // search in 'choices', if exists
    searchArray = newStory.tile.choices;
    var found = ""
    if (searchArray != undefined) {
      found = newStory.tile.choices.find(entry => entry.to_tile === req.params.tileId);
    }
    if (found == "") {
      // search in 'map', if exists
      searchArray = newStory.tile['map'];
      if (searchArray != undefined) {
        found = newStory.tile["map"].find(entry => entry.to_tile === req.params.tileId);
      }
    }

    // 'found' contains the choice entry.
    // Did we obtain an item?
    var newItems = found.item;
    if (newItems != undefined) {
      // add item(s) to the player's stuff
      var newItemArray = [];
      if (Array.isArray(newItems) == false) {
        // newItems can either contain a single element or an array.
        // we make sure it's an array in all cases
        newItemArray.push(newItems);
      } else {
        newItemArray = newItems;
      }
      // store, without duplicates
      currentStuff = [...new Set(currentStuff.concat(newItemArray))];
    }

    // Did we lose an item?
    var usedItems = found.uses;
    if (usedItems != undefined) {
      // remove item(s) from the player's stuff
      var usedItemArray = [];
      if (Array.isArray(usedItems) == false) {
        // usedItems can either contain a single element or an array.
        // we make sure it's an array in all cases
        usedItemArray.push(usedItems);
      } else {
        usedItemArray = usedItems;
      }
      currentStuff = currentStuff.filter(x => !usedItemArray.includes(x));
    }
    
    // We return the tile corresponding to element.to_tile

    for (let tile of currentStory.Tiles) {
      if(tile.id == element.to_tile) {
        newStory.tile = tile;
      }
    }

    // update player's stuff
    newStory.stuff = currentStuff;
    // store a description of the current player's stuff in the current tile
    newStory.tile.stuff = currentStory.Stuff.filter(item => currentStuff.includes(item.key)).map(item => ({ name: item.name, description: item.description }));

    newStory = scramble(newStory, req.params.tileId);

    // we keep only the current tile of the current story in memory
    // meaning we remove stories which name is the current story name

    const filteredArray = currentPlayer.stories.filter(element => element.name !== newStory.name);
    // add new tile for story
    filteredArray.push(newStory);
    // update player data
    currentPlayer.stories = filteredArray;

    // store updated player in players
    players.push(currentPlayer);

    // requested tile is loaded for player, return it
    var newTile = newStory.tile;
    res.setHeader("Content-Type", "application/json");
    res.send(newTile);
    }
  }
})


// Main server
var server = app.listen(8000, async function () {
  var host = server.address().address
  var port = server.address().port

  await loadAllStories()

  // TODO: remove this
  // DEBUG: create admin user (to avoid having to re-register each time)
  var player = {};
  player.username = "admin";
  player.stories = [];
  players.push(player);

  console.log("Storiz2 server listening at http://%s:%s", host, port)
})

// modifies the player's tile in the following way:
// - generates random numbers for to_tile
// - keeps current scrambled Tile Id in memory (to stop/resume playing)
// - keeps a map of random numbers / real numbers (for next choice visit)
// - disables or removes unreachable choices
function scramble(story, currentTileId) {

  story.tilemap = [];
  var newArray = [];
  var mapNewArray = [];

  var array = story.tile.choices;

  if(array) {

//console.log(story.stuff);
//console.log(story.tile.choices);


    const filteredArray = story.tile.choices.map(entry => {
      if (!entry.hasOwnProperty('requires')) {
        return entry;  // no item required, keep the entry
      }
      if (Array.isArray(entry.requires)) {
        // check if all values in the 'requires' array are contained in my stuff
        if (entry.requires.every(item => story.stuff.includes(item))) {
          return entry;  // keep the entry
        }
      } else {
        // 'requires' is a single value, check if it is contained in myStuffArray
        if (story.stuff.includes(entry.requires)) {
          return entry;  // keep the entry
        }
      }

      // 'requires' criteria not met, check if entry has 'disable' attribute set to 'invisible'
      if (entry.hasOwnProperty('disable') && entry.disable === 'invisible') {
        return null;  // drop the entry entirely
      }

      // grey-out the entry (default operation when the requirements are not met)
      delete entry.to_tile;
      return {...entry, disabled: true};
    });

    // remove null elements from the array
    array = filteredArray.filter(entry => entry !== null);

    // we create a map to later retrieve the original to_tile values
    newArray = array.map(obj => ({
      to_tile: obj.to_tile,
      scrambled_to_tile: uuid.v4()
    }));
  
    // and we scramble the original to_tile values
    for (let i = 0; i < array.length; i++) {
      const elem = array[i];
      const newElem = newArray.find(obj => obj.to_tile === elem.to_tile);
      elem.to_tile = newElem.scrambled_to_tile;
    }
    story.tile.choices = array;
  }

  var mapArray = story.tile['map'];

  if(mapArray) {
    // we purge the options which should not be visible
    //TODO

    // we create a map to later retrieve the original to_tile values
    mapNewArray = mapArray.map(obj => ({
      to_tile: obj.to_tile,
      scrambled_to_tile: uuid.v4()
    }));
  
    // and we scramble the original to_tile values
    for (let i = 0; i < mapArray.length; i++) {
      const elem = mapArray[i];
      const newElem = mapNewArray.find(obj => obj.to_tile === elem.to_tile);
      elem.to_tile = newElem.scrambled_to_tile;
    }
    story.tile['map'] = mapArray;
  }

  // concatenate both 'choices' and 'map' arrays together
  story.tilemap = newArray.concat(mapNewArray);

  story.tile.scrambledId = currentTileId;
  
  return story;
}

async function loadAllStories() {
  console.log("Loading stories:");
  // scan /private directory for *.json files
  try {
    const files = await fsp.readdir(privateDir)
    for (let f of files) {
      loadStory(f)
    }
  } catch(e) {
    console.log(e);
    res.sendStatus(500);
  }
  console.log("... done\n");
}

async function loadStory(filename) {
  // we read only .json files
  if (filename.match(".*json")) {
    console.log("[*] "+filename);
    const filedata = await fsp.readFile(privateDir+filename,'utf8');
    // we store the content as a json object inside the global stories object
    const story = JSON.parse(filedata)
    stories.push(story)
  }
}

