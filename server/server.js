
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
  res.cookie('SESSION', req.body.username, { maxAge: 14400000, httpOnly: true });

  res.redirect('/');
})


// Logs user in
app.post('/login', function (req, res) {
  // Does the user exist?
  for (let player of players) {
    if(player.username == req.body.username) {
      // user already exist, logging in
        res.cookie('SESSION', req.body.username, { maxAge: 14400000, httpOnly: true });
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
    <link rel="stylesheet" href="/system/global.css">
    <link rel="stylesheet" href="/system/none.css">
    <link rel="stylesheet" href="/system/cold.css">
    <link rel="stylesheet" href="/system/hot.css">
    <link rel="stylesheet" href="/system/gritty.css">
    <link rel="stylesheet" href="/system/metal.css">
    <link rel="stylesheet" href="/system/hacker.css">
    <title id='title'>...</title>
  </head>
  <body>
    <div id="background"></div>
    <div id="main">
      <header>
        <h1 id="title"></h1>
      </header>
      <div id="content" class="banner">
        <main>
          <div id="title2"></div>
          <div id="picture">
            <img src="" id="img">
            <map name="clickable" id="map"></map>
          </div>
          <div id="reveal">
            <svg id="svg"></svg>
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
            <table><tbody></tbody></table>
          </div>
          <div id="code">
            <p>&nbsp;</p>
            <form>
              <input type = "text" id = "codeinput" name = "code" placeholder = "item code">
              <button id="unlock-button">UNLOCK</button>
            </form>
          </div>
        </main>
      <footer>
        <div id="github">Powered by <a href="http://github.com/valvolt/storiz">Storiz</a></div>
        <div id="credits"><a href="#" id="toggle-credits">Show credits</a></div>
      </footer>
      </div>
    </div>
    <div id="creditroll" class="banner">
      <div id="creditcontent"></div>
      <div id="credits2"><a href="#" id="toggle-credits2">Hide credits</a></div>
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

  const unlockButton = document.getElementById('unlock-button');

  unlockButton.addEventListener('click', function(event) {
    event.preventDefault();
    unlockItem(event.target.form.code.value);
  });

  function toggleCredits(event) {
    event.preventDefault();
    const content = document.getElementById('main');
    const credits = document.getElementById('creditroll');
    if (credits.style.display === "none") {
      // hide main content
      content.style.display = "none";
      // show credits
      credits.style.display = "block";
    } else {
      // show main content
      content.style.display = "block";
      // hide credits
      credits.style.display = "none";
    }  
  }

  document.getElementById('toggle-credits').addEventListener('click', toggleCredits);
  document.getElementById('toggle-credits2').addEventListener('click', toggleCredits);

  const credits = document.getElementById('creditroll');

  function scrollCredits() {
    const totalHeight = credits.scrollHeight;
    const currentPosition = credits.scrollTop;
    const newPosition = currentPosition + 1;
    credits.scrollTo(0, newPosition);
    // If the new position is equal to or greater than the total height, reset the scroll position to 0
    if (newPosition >= totalHeight) {
     credits.scrollTo(0, 0);
    } 
  }

  setInterval(scrollCredits, 50); // Scroll the credits every 50 milliseconds



function removeOverlay() {

  svgElement = document.getElementById("svg");
  svgElement.innerHTML = "";

  document.getElementById("reveal").style.display = "none";
}


function generateOverlay() {

  document.getElementById("reveal").style.display = "block";

  var imgElement = document.getElementById("img");
  var svgElement = document.getElementById("svg");
  var mapElement = document.getElementById("map");
  

  // Set the SVG's size and position to match the img element
  svgElement.style.position = "absolute";
  svgElement.style.left = imgElement.offsetLeft + "px";
  svgElement.style.top = imgElement.offsetTop + "px";
  svgElement.setAttribute("width", imgElement.offsetWidth);
  svgElement.setAttribute("height", imgElement.offsetHeight);
  svgElement.style.pointerEvents = "none";

  // Drop all existing children before inserting the new ones
  svgElement.innerHTML = "";

  // loop over all <area> elements which have the 'reveal' hint set
  var areas = mapElement.getElementsByTagName("area");

  // Loop over each area element
  for (var i = 0; i < areas.length; i++) {
    var area = areas[i];

    // Check the value of the hint property
    if (area.getAttribute("hint") === "reveal") {
      // let's create an SVG element covering this area
      if (area.shape == "poly") {
        var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', area.coords);
        polygon.setAttribute('style', 'fill: rgba(255, 0, 0, 0.5); stroke: purple; stroke-width: 1;');
        polygon.style.pointerEvents = "none";
        svgElement.appendChild(polygon);
      } else if (area.shape == "rect") {

        // Split the coords attribute into an array
        var coords = area.coords.split(",");

        // Extract the top-left and bottom-right coordinates from the array
        var x1 = coords[0];
        var y1 = coords[1];
        var x2 = coords[2];
        var y2 = coords[3];

        // Calculate the width and height of the rectangle
        var width = x2 - x1;
        var height = y2 - y1;

        // Create the rectangle element
        var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

        // Set the rectangle's size and position
        rect.setAttribute("x", x1);
        rect.setAttribute("y", y1);
        rect.setAttribute("width", width);
        rect.setAttribute("height", height);

        rect.setAttribute('style', 'fill: rgba(255, 0, 0, 0.5); stroke: purple; stroke-width: 1;');
        rect.style.pointerEvents = "none";

        // Append the rectangle to the SVG element
        svgElement.appendChild(rect);
      } else if (area.shape == "circle") {

        // Split the coords attribute into an array
        var coords = area.coords.split(",");

        // Extract the center coordinates and radius from the array
        var cx = coords[0];
        var cy = coords[1];
        var r = coords[2];

        // Create the circle element
        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

        // Set the circle's size and position
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        circle.setAttribute("r", r);

        circle.setAttribute('style', 'fill: rgba(255, 0, 0, 0.5); stroke: purple; stroke-width: 1;');
        circle.style.pointerEvents = "none";

        // Append the circle to the SVG element
        svgElement.appendChild(circle);
      }
    }
  }
}

      function unlockItem(code) {
        var xhttp = new XMLHttpRequest();

        // update elements based on fetched data
        xhttp.onreadystatechange = function() {
          if (this.readyState == 4 && this.status == 200) {
            var item = JSON.parse(this.responseText);

            // clear input field
            document.getElementById('codeinput').value= ""

            // did we unlock something?
            if (item.name == undefined) {
              // no item found, nothing to do
              return;
            }
            
            document.getElementById("stuff").style.display = "block";
            // create new row for the item
            var row = document.createElement('tr');
            row.innerHTML = "<td>"+item.name+"</td><td>"+item.description+"</td>";

            const table = document.getElementById('stuff').querySelector('table');
            
            // if the table is empty, create one
            if(table.rows.length == 0) {
              table.innerHTML = "<tr><th>Stuff</th><th>Description</th></tr>";         
            }
            // append the new row (unless it's already there)
            var rowExists = false;
            for (var i = 0; i < table.rows.length; i++) {
              if (table.rows[i].innerHTML == row.innerHTML) {
                rowExists = true;
                break;
              }
            }
            if (!rowExists) {
              table.appendChild(row);
            }
          }
        }
        
        // send unlock request
        var storyname = "`+req.params.name+`";
        xhttp.open("GET", "/unlock/"+storyname+"/"+code, true);
        xhttp.send();
      }
    
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
              document.getElementById("picture").style.display = "block";
              document.getElementById("img").src = tile.picture;
            } else {
              document.getElementById("background").style.backgroundImage = "url(/system/blur.png)";
              document.getElementById("picture").style.display = "none";
            }

            // video
            if (tile.video) {
              document.getElementById("picture").style.display = "none";
              document.getElementById("video").style.display = "block";
              document.getElementById("video").firstElementChild.src = tile.video;
              document.getElementById("video").firstElementChild.type = "video/mp4";
            } else {
              document.getElementById("video").style.display = "none";
            }

            // title
            if (tile.title == undefined) {
              document.getElementById("title").style.display = "none";
              document.getElementById("title2").style.display = "none";
            } else {
              document.getElementById("title").innerHTML = tile.title;
              document.getElementById("title").style.display = "block";
              document.getElementById("title2").innerHTML = tile.title;
              document.getElementById("title2").style.display = "block";
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
            removeOverlay();
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
              
              // cleanup
              while (mapElement.hasChildNodes()) {
                mapElement.removeChild(mapElement.firstChild);
              }

              tile.map.forEach(area => {
                const areaElement = document.createElement('area');
                areaElement.setAttribute('shape', area.shape);
                areaElement.setAttribute('origcoords', area.coords);
                areaElement.setAttribute('coords', area.coords);
                areaElement.setAttribute('to_tile', area.to_tile);
                if (area.hint == undefined) {
                  areaElement.style.cursor = 'pointer';
                  areaElement.setAttribute('hint', "pointer");
                } else {
                  areaElement.setAttribute('hint', area.hint);
                  if (area.hint == "invisible") {
                    areaElement.style.cursor = 'default';
                  } else {
                    areaElement.style.cursor = 'pointer';
                  }
                }
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
            
            // code
            if (tile.code == true) {
              document.getElementById("code").style.display = "block";
            } else {
              document.getElementById("code").style.display = "none";
            }
            
            // mood
            switch (tile.mood) {
              case "cold":
                document.querySelector("link[href='/system/none.css']").disabled = true;
                document.querySelector("link[href='/system/cold.css']").disabled = false;
                document.querySelector("link[href='/system/hot.css']").disabled = true;
                document.querySelector("link[href='/system/gritty.css']").disabled = true;
                document.querySelector("link[href='/system/metal.css']").disabled = true;
                document.querySelector("link[href='/system/hacker.css']").disabled = true;
                break;
              case "hot":
                document.querySelector("link[href='/system/none.css']").disabled = true;
                document.querySelector("link[href='/system/cold.css']").disabled = true;
                document.querySelector("link[href='/system/hot.css']").disabled = false;
                document.querySelector("link[href='/system/gritty.css']").disabled = true;
                document.querySelector("link[href='/system/metal.css']").disabled = true;
                document.querySelector("link[href='/system/hacker.css']").disabled = true;
                break;
              case "gritty":
                document.querySelector("link[href='/system/none.css']").disabled = true;
                document.querySelector("link[href='/system/cold.css']").disabled = true;
                document.querySelector("link[href='/system/hot.css']").disabled = true;
                document.querySelector("link[href='/system/gritty.css']").disabled = false;
                document.querySelector("link[href='/system/metal.css']").disabled = true;
                document.querySelector("link[href='/system/hacker.css']").disabled = true;
                break;
              case "metal":
                document.querySelector("link[href='/system/none.css']").disabled = true;
                document.querySelector("link[href='/system/cold.css']").disabled = true;
                document.querySelector("link[href='/system/hot.css']").disabled = true;
                document.querySelector("link[href='/system/gritty.css']").disabled = true;
                document.querySelector("link[href='/system/metal.css']").disabled = false;
                document.querySelector("link[href='/system/hacker.css']").disabled = true;
                break;
              case "hacker":
                document.querySelector("link[href='/system/none.css']").disabled = true;
                document.querySelector("link[href='/system/cold.css']").disabled = true;
                document.querySelector("link[href='/system/hot.css']").disabled = true;
                document.querySelector("link[href='/system/gritty.css']").disabled = true;
                document.querySelector("link[href='/system/metal.css']").disabled = true;
                document.querySelector("link[href='/system/hacker.css']").disabled = false;
                break;
              case "none":
              default:
                // if mood is undefined
                document.querySelector("link[href='/system/none.css']").disabled = false;
                document.querySelector("link[href='/system/cold.css']").disabled = true;
                document.querySelector("link[href='/system/hot.css']").disabled = true;
                document.querySelector("link[href='/system/gritty.css']").disabled = true;
                document.querySelector("link[href='/system/metal.css']").disabled = true;
                document.querySelector("link[href='/system/hacker.css']").disabled = true;
                break;
            }

            // credits
            document.getElementById("creditroll").style.display = "none";
            if (tile.credits != undefined) {
              document.getElementById("creditcontent").innerHTML = tile.credits;
              document.getElementById("credits").style.display = "block";
            } else {
              document.getElementById("credits").style.display = "none";
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
            
            // Adjust overlay if necessary
            if(areaElements[i].getAttribute("hint") == "reveal") {
              generateOverlay();
            }
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

    // We return (one of) the tile(s) corresponding to tileID "1"
    let foundTiles = [];
    for (let tile of currentStory.Tiles) {
      if(tile.id == "1") {
        foundTiles.push(tile);
      }
    }

    if (foundTiles.length > 1) {
      // Generate a random number between 0 and the length of the array
      let randomIndex = Math.floor(Math.random() * foundTiles.length);
      // Assign a random tile from the array to newStory.tile
      newStory.tile = foundTiles[randomIndex];
    } else {
      // If only one or no tiles were found, assign the first (or only) tile in the array to newStory.tile
      newStory.tile = foundTiles[0];
    }

    // does the story use item code(s) ?
    if(currentStory.Stuff.some(entry => entry.hasOwnProperty('code'))) {
      newStory.tile.code = true;
    }
    
    // Push the credits to the tile
    if(currentStory.Credits != undefined) {
      newStory.tile.credits = currentStory.Credits;
    }

    currentPlayer.stories.push(scramble(newStory, "1"));
    // store updated player in players
    players.push(currentPlayer);

    // tile 1 is loaded for player, return it
    var newTile = newStory.tile;
    res.setHeader("Content-Type", "application/json");
    res.send(newTile);
    return;

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
    var found = undefined;
    if (searchArray != undefined) {
      found = newStory.tile.choices.find(entry => entry.to_tile === req.params.tileId);
    }
    if (found == undefined) {
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

    // update player's stuff
    newStory.stuff = currentStuff;
    // store a description of the current player's stuff in the current tile
    newStory.tile.stuff = currentStory.Stuff.filter(item => currentStuff.includes(item.key) && item.name !== undefined).map(item => ({ name: item.name, description: item.description }));

    // We return (one of) the tile(s) corresponding to element.to_tile
    let foundTiles = [];
    for (let tile of currentStory.Tiles) {
      if(tile.id == element.to_tile) {
        foundTiles.push(tile);
      }
    }

    if (foundTiles.length > 1) {
      // Generate a random number between 0 and the length of the array
      let randomIndex = Math.floor(Math.random() * foundTiles.length);
      // Assign a random tile from the array to newStory.tile
      newStory.tile = foundTiles[randomIndex];
    } else {
      // If only one or no tiles were found, assign the first (or only) tile in the array to newStory.tile
      newStory.tile = foundTiles[0];
    }

    // Achievements
    var currentAchievements = newStory.achievements;
    // retrieve the achievements obtained when performing the choice
    newAchievements = newStory.tile.achievement;
    
    if (newAchievements != undefined) {
      // add achievement(s) to the player's achievement list
      var newAchievementsArray = [];
      if (Array.isArray(newAchievements) == false) {
        // newAchievements can either contain a single element or an array.
        // we make sure it's an array in all cases
        newAchievementsArray.push(newAchievements);
      } else {
        newAchievementsArray = newAchievements;
      }
      // store, without duplicates
      currentAchievements = [...new Set(currentAchievements.concat(newAchievementsArray))];
    }

    // update player's achievements
    newStory.achievements = currentAchievements;


    newStory = scramble(newStory, req.params.tileId);
    
    // Shall we enable the Code field?
    if(currentStory.Stuff.some(entry => entry.hasOwnProperty('code'))) {
      newStory.tile.code = true;
    }

    // Push the credits to the tile
    if(currentStory.Credits != undefined) {
      newStory.tile.credits = currentStory.Credits;
    }

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

// add the item specified by the 'code' value to the user's stuff
app.get('/unlock/:name/:code', function (req, res) {

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
  if(newStory.name == undefined) {
    // New story for user. Reject the request.
    console.log("Too early unlock request - "+username+" - "+req.params.name+" - "+req.params.code);
    res.setHeader("Content-Type", "application/json");
    res.send({"error":"request denied"});
    return;
  } else {

    // Known story for user. Is the provided code valid?
    var entry = currentStory.Stuff.find(entry => entry.code === req.params.code);
    if(entry != undefined) {
      // add item key to player's stuff (without duplicates)
      const key = entry.key;
      newStory.stuff = [...new Set(newStory.stuff.concat(key))]

      // return item name and description
      const {name, description} = entry;
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify({name, description}));
      return;
    
    } else {
      entry = {};
      res.setHeader("Content-Type", "application/json");
      res.send(entry);
      return;
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
  
  var filteredArray = [];

  var array = story.tile.choices;

  if(array) {

    // filter-out invalid choices for user (based on the current user's stuff)
    filteredArray = story.tile.choices.map(entry => {
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



    // work on a copy (as we will edit it)
    const arrayCopy = [...newArray];

    for (let i = 0; i < array.length; i++) {
      const elem = array[i];
      const newElemIndex = arrayCopy.findIndex(obj => obj.to_tile === elem.to_tile);
      const newElem = arrayCopy[newElemIndex];
      elem.to_tile = newElem.scrambled_to_tile;
      // remove element, to handle cases where multiple choices lead to the same tile id
      arrayCopy.splice(newElemIndex, 1);
    }

    story.tile.choices = array;
  }

  var mapArray = story.tile['map'];

  if(mapArray) {

    // filter-out invalid choices for user (based on the current user's stuff)
    filteredArray = story.tile['map'].map(entry => {
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

      // 'requires' criteria not met, drop the entry
      return null;
    });

    // remove null elements from the array
    mapArray = filteredArray.filter(entry => entry !== null);

    // we create a map to later retrieve the original to_tile values
    mapNewArray = mapArray.map(obj => ({
      to_tile: obj.to_tile,
      scrambled_to_tile: uuid.v4()
    }));

    // work on a copy (as we will edit it)
    const mapNewArrayCopy = [...mapNewArray];

    for (let i = 0; i < mapArray.length; i++) {
      const elem = mapArray[i];
      const newElemIndex = mapNewArrayCopy.findIndex(obj => obj.to_tile === elem.to_tile);
      const newElem = mapNewArrayCopy[newElemIndex];
      elem.to_tile = newElem.scrambled_to_tile;
      // remove element, to handle cases where multiple choices lead to the same tile id
      mapNewArrayCopy.splice(newElemIndex, 1);
    }
  
    story.tile['map'] = mapArray;
  }

  // concatenate both 'choices' and 'map' arrays together
  story.tilemap = newArray.concat(mapNewArray);

  // add a scrambled id to the current tile id to manage page refresh
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

