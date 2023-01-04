
// Storiz2 server

var express = require('express');
var cookieParser = require('cookie-parser');
const uuid = require('uuid');
const storage = require('node-persist');
const AWS = require("aws-sdk");
var s3 = ""

var app = express();
var fsp = require('fs').promises;

app.use(express.json())
app.use(cookieParser())
app.use(express.static('server/public'));
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

const publicDir = './server/public/';
const privateDir = './server/private/';
var stories = []
var players = []

const homepage1 = `
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="description" content="A dynamic story game with branching paths and multiple choices">
      <link rel="icon" type="image/x-icon" href="/favicon.ico">
      <link rel="stylesheet" href="/system/global.css">
      <link rel="stylesheet" href="/system/none.css">
    </head>
  <body>
    <h1 id="title2">Storiz</h1>`
const homepage2 = "</body></html>"

// Main page
app.get('/', async function (req, res) {

  const welcome = `
    <style>
      .buttons {
        text-align: center; /* Center the buttons horizontally */
      }

      button {
        width: 200px;
        height: 50px;
        font-size: 18px;
        font-weight: bold;
        background-color: #333333;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        margin: 20px 0; /* Add some margin to the buttons */
      }

      button:hover {
        background-color: #666666;
      }

      button:active {
        background-color: #999999;
      }
      
      #logo {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #logo img {
        width: 20%;
      }
    </style>
    
    <script>
      function newGameOp() {
        window.location.href = '/newgame';
      }

      function continueOp() {
        window.location.href = '/resume';
      }
    </script>

    <div id="logo">
      <img src="/system/logo-black.svg"></img>
    </div>

    <div id="newgame" class="buttons">
      <button id="new-game-button" onclick="newGameOp()">New Game</button>
    </div>
    <div id="continue" class="buttons">
      <button id="continue-button" onclick="continueOp()">Continue</button>
    </div>
  `
  
  res.setHeader("Content-Type", "text/html");
  res.send(homepage1+welcome+homepage2);
})

app.get('/resume', async function (req, res) {

  const resumeForm = `
    <style>
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}

#title2 {
  margin: 16px 0;
}

div {
  max-width: 500px;
  margin: 0 auto;
  text-align: center;
  font-size: 18px;
  margin-bottom: 16px;
}

form {
  display: flex;
  flex-direction: column;
  align-items: center;
}

input[name="username"] {
  width: 200px;
  height: 32px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 8px;
  padding: 8px;
}

button[type="submit"] {
  width: 120px;
  height: 32px;
  font-size: 16px;
  background-color: #333333;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;

}

      button[type="submit"]:hover {
        background-color: #666666;
      }

      button[type="submit"]:active {
        background-color: #999999;
      }
    
    </style>
    
    <div>Welcome back. Please enter your code:<form method='POST' action='/resume'><input name='username'/><button type='submit'>Submit</button></form></div>`

  res.setHeader("Content-Type", "text/html");
  res.send(homepage1+resumeForm+homepage2);

})

app.get('/newgame', async function (req, res) {
  // create user (autologin)
  userid = uuid.v4();
  var player = {};
  player.username = userid;
  player.screenname = "Anonymous";
  player.stories = [];
  players.push(player);
  await persist('players', players);
  
  // auto log user in
  res.cookie('SESSION', userid, { httpOnly: true });

  // redirect to story list
  res.redirect('/stories');
})


// Logs user returning in
app.post('/resume', async function (req, res) {

  players = await retrieve('players');

  // Does the user exist?
  for (let player of players) {
    if(player.username == req.body.username) {
      // user already exist, logging in
        res.cookie('SESSION', req.body.username, { httpOnly: true });
        res.redirect('/stories');
        return;
    }
  }
  // user does not exist, sending error message
  res.setHeader("Content-Type", "application/json");
  res.send({"error":"Invalid code"});
})


// Updates screen name
app.post('/rename', async function (req, res) {

  players = await retrieve('players');

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
      // save new screenname
      player.screenname = req.body.screenname;
      // persist player
      // remove existing version
      players = players.filter(aplayer => aplayer.username !== player.username);
      // add new instance
      players.push(player);
      await persist('players', players);
      res.setHeader("Content-Type", "application/json");
      res.send({"ok":"Screen name updated"});
      return;
    }
  }
  if (currentPlayer == undefined) {
    console.log("Forged SESSION cookie - "+req.cookies.SESSION);
    res.setHeader("Content-Type", "application/json");
    res.send({"error":"server error"});
    return;
  }
})


// Returns the list of available stories
app.get('/stories', async function (req, res) {
  var list = "";

  const pagelist1 = `
  <div class="hex-container">
  `
  const pagelist2 = `
    </div>
  `
  
  var i = 0
  stories = await retrieve('stories');
  players = await retrieve('players');
  for (let story of stories) {
    i = i + 1;
    list += "<div class=\"hexagon hex"+i+"\"><a href=\"/story/"+story.Name+"\">"+story.Name+"</a> ("+story.NbTiles+" Tiles)<p>"+story.Description+"</p></div>"
  }
  res.setHeader("Content-Type", "text/html");
  res.send(homepage1+pagelist1+list+pagelist2+homepage2);
})

// Loads story for player
//
// Loads the main page canvas, then fetches the user's current Tile content for the current story
app.get('/story/:name', async function (req, res) {

  stories = await retrieve('stories');
  players = await retrieve('players');

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
        <hr>
      <footer>
        <div id="github">Powered by <a href="http://github.com/valvolt/storiz">Storiz</a></div>
        <div id="profile"><a href="/myprofile">My Profile (`+currentPlayer.screenname+`)</a></div>
        <div id="credits"><a href="#" id="toggle-credits">Credits</a></div>
      </footer>
      </div>
    </div>
    <div id="creditroll" class="banner creditroll">
      <div id="creditcontent"></div>
      <div id="credits2"><a href="#" id="toggle-credits2">Close</a></div>
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

  function copyToClipboard(elementId) {
    // Get the text field
    var textField = document.getElementById(elementId);

    // Select the text field's content
    textField.select();

    // Copy the selected text to the clipboard
    document.execCommand('copy');
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
            
            // ending
            if ((tile.choices == undefined && tile.map == undefined) || (Array.isArray(tile.stuff) && tile.choices.length === 0 && tile.map == undefined)) {
              // no choice offered to the player, we add default restart options
              document.getElementById("choices").innerHTML = "";
              // restart story
              var button = document.createElement("button");
              button.innerHTML = "Try Again";
              button.onclick = function() {
                processTile("1");
              };
              document.getElementById("choices").appendChild(button);
              // story menu
              var button = document.createElement("button");
              button.innerHTML = "Main menu";
              button.onclick = function() {
                window.location="/stories";
              };
              document.getElementById("choices").appendChild(button);
              document.getElementById("choices").style.display = "block";
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
  await persist('players', players);

  res.setHeader("Content-Type", "text/html");
  res.send(canvas);
})



// displays user profile
app.get('/myprofile', async function (req, res) {

  stories = await retrieve('stories');
  players = await retrieve('players');


const profilepage1 = `
     <style>
       img {
         height: 50px;
         width: auto;
       }
       
       td,
       th {
         text-align: center;
       }
     </style>
    <div id="myprofile" class="banner creditroll">
      <div id="profilecontent">
        My Continue code: <input type="text" id="usercode" value="`+req.cookies.SESSION+`" readonly>
        <button onclick="copyToClipboard('usercode')">Copy</button>`

var screenname = ""
var achievements = ""

const profilepage2 = `</div>
      <div id="profile2"><a href="/stories">Main menu</a></div>
    </div>
`
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

  // Screen name
  screenname = `
    <script>
    function saveScreenname(newname) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/rename', true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
          alert("New screenname saved");
        }
      };
      xhr.send('screenname=' + encodeURIComponent(newname));
    }
    </script>
    <div>
      My screen name: <input type="text" id="screenname" value="`+currentPlayer.screenname+`" >
      <button onclick="saveScreenname(document.getElementById('screenname').value)">Save</button>
    </div>
  `

  // Loop over achievements
  currentPlayer.stories.forEach(function(story) {
    // Retrieve list of achievements for story
    if (story.achievements.length > 0) {
      var achievementTable = "<label>"+story.name+"</label><table><tr><th>#</th><th>Name</th><th>Description</th></tr>";
      story.achievements.forEach(function(achievementKey) {
        // fetch trophy, name and description
        for (let i = 0; i < stories.length; i++) {
          if (stories[i].Name === story.name) {
            let achievements = stories[i].Achievements;
            for (let j = 0; j < achievements.length; j++) {
              if (achievements[j].key === achievementKey) {
                achievementTable = achievementTable + "<tr><td><img src=\"/system/"+achievements[j].trophy+".png\" title=\""+achievements[j].trophy+"\"></td><td>"+achievements[j].name+"</td><td>"+achievements[j].description+"</td></tr>";
              }
            }
          }
        }
      })
      achievements = achievements + achievementTable + "</table>";
    }
  });

  res.setHeader("Content-Type", "text/html");
  res.send(homepage1+profilepage1+screenname+achievements+profilepage2+homepage2);

})









// returns the content of the specified tile, for the specified story, for the currently logged-in user
app.get('/story/:name/:tileId', async function (req, res) {

  stories = await retrieve('stories');
  players = await retrieve('players');

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

    await persist('players', players);

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

    // now that we have our return tile, update player's stuff
    newStory.stuff = currentStuff;
    // store a description of the current player's stuff in the current tile
    newStory.tile.stuff = currentStory.Stuff.filter(item => currentStuff.includes(item.key) && item.name !== undefined).map(item => ({ name: item.name, description: item.description }));

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
    await persist('players', players);

    // requested tile is loaded for player, return it
    var newTile = newStory.tile;
    res.setHeader("Content-Type", "application/json");
    res.send(newTile);
    }
  }
})

// add the item specified by the 'code' value to the user's stuff
app.get('/unlock/:name/:code', async function (req, res) {

  stories = await retrieve('stories');
  players = await retrieve('players');

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
      // persist
      
      // we keep only the current tile of the current story in memory
      // meaning we remove stories which name is the current story name

      const filteredArray = currentPlayer.stories.filter(element => element.name !== newStory.name);
      // add new tile for story
      filteredArray.push(newStory);
      // update player data
      currentPlayer.stories = filteredArray;

      // store updated player in players
      players.push(currentPlayer);
      await persist('players', players);

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

async function initStorage() {
  var cyclicStorage = process.env.CYCLIC_BUCKET_NAME;
  if(cyclicStorage == undefined) {
    // persist using node-persist
      await storage.init()
  } else {
    s3 = new AWS.S3()
  }
}

async function persist(where, what) {
  var cyclicStorage = process.env.CYCLIC_BUCKET_NAME;
  if(cyclicStorage == undefined) {
    // persist using node-persist
    await storage.setItem(where,what);
  } else {
    // persist using S3 bucket
    await s3.putObject({
                Body: what,
                Bucket: cyclicStorage,
                Key: where+"/data.json",
            }).promise();
  }
}

async function retrieve(where) {
  var cyclicStorage = process.env.CYCLIC_BUCKET_NAME;
  if(cyclicStorage == undefined) {
    // retrieve using node-persist
    let my_data = await storage.getItem(where);
    return my_data;
  } else {
    // retrieve from S3 bucket
    let my_data = await s3.getObject({
                Bucket: cyclicStorage,
                Key: where+"/data.json",
            }).promise();
    return my_data;
  }
}

// Main server
const port = process.env.PORT || 8000;

var server = app.listen(port, async function () {
  var host = server.address().address
  var port = server.address().port

  await initStorage();
  
  await persist('stories', []);
  await persist('players', []);

  await loadAllStories()
  
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

  stories = await retrieve('stories');
  // we read only .json files
  if (filename.match(".*json")) {
    console.log("[*] "+filename);
    const filedata = await fsp.readFile(privateDir+filename,'utf8');
    // we store the content as a json object inside the global stories object
    const story = JSON.parse(filedata)
    // count and push number of tiles
    story.NbTiles = story.Tiles.length;
    stories.push(story)
    await persist('stories', stories);
  }
}
