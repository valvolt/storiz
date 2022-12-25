
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
  
  // log user in
  res.cookie('SESSION',req.body.username, { maxAge: 900000, httpOnly: true });
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
      #picture,
      #video {
        display: none;
        margin: 0 auto;
        text-align: center;
        width: calc(100vw - 10%);
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
            <img src="">
          </div>
          <div id="video">
            <video autoplay controls>
              <source src="" type="video/mp4">
            </video>
          </div>
          <p id="text"></p>
          <div id="choices">
          </div>
        </main>
      <footer>
        <p>Copyright 2022</p>
      </footer>
      </div>
    </div>

    <script>
      function processTile(tileID) {
        var xhttp = new XMLHttpRequest();

        // update elements based on fetched data
        xhttp.onreadystatechange = function() {
          if (this.readyState == 4 && this.status == 200) {
            var tile = JSON.parse(this.responseText);

debug = tile;

            // picture
            if (tile.picture) {
              document.getElementById("background").style.backgroundImage = "url(" + tile.picture + ")";
            } else {
              document.getElementById("background").style.backgroundImage = none;
            }


            if (tile.picture && !tile.video) {
              document.getElementById("picture").style.display = "block";
              document.getElementById("picture").firstElementChild.src = tile.picture;
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
                button.setAttribute("to_tile", tile.choices[i].to_tile)
                button.onclick = function() {
                  processTile(this.getAttribute("to_tile"));
                };
                document.getElementById("choices").appendChild(button);
              }
              document.getElementById("choices").style.display = "block";
            }
          }
        };

        // fetch user data
        var storyname = "`+req.params.name+`";
console.log("/story/"+storyname+"/"+tileID);
        xhttp.open("GET", "/story/"+storyname+"/"+tileID, true);
        xhttp.send();
      }

var debug = ""
      
      window.onload = processTile('`+tileToFetch+`');
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

      // at this point, the tile is valid. We return the tile corresponding to element.to_tile

    for (let tile of currentStory.Tiles) {
      if(tile.id == element.to_tile) {
        newStory.tile = tile;
      }
    }

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

  var array = story.tile.choices;

  // we create a map to later retrieve the original to_tile values
  const newArray = array.map(obj => ({
    to_tile: obj.to_tile,
    scrambled_to_tile: uuid.v4()
  }));
  
  // and we scramble the original to_tile values
  for (let i = 0; i < array.length; i++) {
    const elem = array[i];
    const newElem = newArray.find(obj => obj.to_tile === elem.to_tile);
    elem.to_tile = newElem.scrambled_to_tile;
  }

  // TODO: remove invalid choices (due to missing Stuff)
  story.tile.scrambledId = currentTileId;
  story.tile.choices = array;
  story.tilemap = newArray;
  
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

