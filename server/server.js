
// Storiz2 server

var express = require('express');
var cookieParser = require('cookie-parser');
const uuid = require('uuid');
const fs = require('fs').promises;
const { Console } = require('console');
const multer = require('multer');
const path = require('path');

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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/avi', 'video/mov',
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and audio files are allowed.'));
    }
  }
});

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
  // Check if user already has a SESSION cookie
  if(req.cookies.SESSION != undefined) {
    // User already logged in, redirect to stories
    res.redirect('/stories');
    return;
  }
  
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
  
  // Get continue code from SESSION cookie to check if user is creator
  var continueCode = "";
  if(req.cookies.SESSION != undefined) {
    continueCode = req.cookies.SESSION;
  }
  
  var i = 0
  stories = await retrieve('stories');
  players = await retrieve('players');
  for (let story of stories) {
    const isPublished = story.published === 'yes' || !story.published;
    const isCreator = story.creator === continueCode;
    
    // Show published stories to everyone, unpublished stories only to creators
    if (isPublished || isCreator) {
      i = i + 1;
      
      // Use blue hexagon for unpublished stories (creator testing)
      const hexagonClass = !isPublished && isCreator ? "hexagon-blue hex" + i : "hexagon hex" + i;
      const testingLabel = !isPublished && isCreator ? " (Testing)" : "";
      
      list += "<div class=\"" + hexagonClass + "\"><a href=\"/story/" + story.Name + "\">" + story.Name + "</a> (" + story.NbTiles + " Tiles)" + testingLabel + "<p>" + story.Description + "</p></div>"
    }
  }
  res.setHeader("Content-Type", "text/html");
  res.send(homepage1+pagelist1+list+pagelist2+homepage2);
})

// Edit menu - shows all stories with edit access indicators
app.get('/edit', async function (req, res) {
  var list = "";

  const pagelist1 = `
  <div class="hex-container">
  `
  const pagelist2 = `
    </div>
  `
  
  // Get continue code from SESSION cookie
  var continueCode = "";
  if(req.cookies.SESSION != undefined) {
    continueCode = req.cookies.SESSION;
  } else {
    // If no user is logged-in, redirect to login
    res.redirect('/resume');
    return;
  }

  var i = 0;
  stories = await retrieve('stories');
  
  // Add "Create New Story" hexagon first
  i = i + 1;
  list += "<div class=\"hexagon hex"+i+"\"><a href=\"#\" onclick=\"createNewStory()\">Create New Story</a><p>Start a new interactive story</p></div>";
  
  // Add existing stories - only show stories created by current user
  for (let story of stories) {
    // Check if current user is the creator (handle legacy stories without creator field)
    const isCreator = story.creator === continueCode;
    const isLegacy = !story.creator;
    const canEdit = isCreator || isLegacy;
    
    // Only show stories that the user can edit
    if (canEdit) {
      i = i + 1;
      const legacyIndicator = isLegacy ? " (Legacy - No Creator)" : "";
      list += "<div class=\"hexagon hex"+i+"\"><a href=\"/edit/story/"+(story.filename || story.Name.toLowerCase())+"\">"+story.Name+"</a> ("+story.NbTiles+" Tiles)<p>"+story.Description+legacyIndicator+"</p></div>";
    }
  }
  
  // Add JavaScript for create new story functionality
  const createNewScript = `
    <script>
      function createNewStory() {
        const storyName = prompt('Enter a name for your new story (letters, numbers, hyphens and underscores only):');
        if (storyName && /^[a-zA-Z0-9_-]+$/.test(storyName)) {
          fetch('/edit/story/new', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({name: storyName})
          })
          .then(response => response.json())
          .then(data => {
            if (data.error) {
              alert('Error: ' + data.error);
            } else {
              window.location.href = '/edit/story/' + storyName;
            }
          })
          .catch(error => {
            alert('Error creating story: ' + error);
          });
        } else if (storyName) {
          alert('Invalid story name. Use only letters, numbers, hyphens and underscores.');
        }
      }
    </script>
  `;
  
  res.setHeader("Content-Type", "text/html");
  res.send(homepage1+pagelist1+list+pagelist2+createNewScript+homepage2);
})

// Load story for editing
app.get('/edit/story/:name', async function (req, res) {
  // Get continue code from SESSION cookie
  var continueCode = "";
  if(req.cookies.SESSION != undefined) {
    continueCode = req.cookies.SESSION;
  } else {
    // If no user is logged-in, return error
    res.status(401).json({"error":"please log in"});
    return;
  }

  try {
    // Load story from file system
    const storyPath = `./server/private/${req.params.name}.json`;
    const storyData = await fs.readFile(storyPath, 'utf-8');
    const story = JSON.parse(storyData);
    
    // Verify creator matches (if creator field exists)
    if (story.creator && story.creator !== continueCode) {
      res.status(403).json({error: 'Not authorized to edit this story'});
      return;
    }
    
    // Handle legacy stories without creator field
    if (!story.creator) {
      // Allow editing but show warning and assign creator on save
      console.log(`Legacy story "${req.params.name}" accessed by user ${continueCode}`);
    }
    
    // Return story editor HTML interface
    const editorHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Story Editor - ${story.Name}</title>
    <link rel="stylesheet" href="/system/global.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .editor-container {
            display: flex;
            gap: 20px;
            max-width: 1600px;
            margin: 0 auto;
            height: calc(100vh - 80px);
        }
        .tile-tree {
            width: 250px;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            height: fit-content;
            max-height: 100%;
            overflow-y: auto;
        }
        .action-panel {
            width: 200px;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            height: fit-content;
            max-height: 100%;
            overflow-y: auto;
        }
        .content-preview {
            flex: 1;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: relative;
            overflow-y: auto;
        }
        .edit-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.98);
            padding: 20px;
            border-radius: 8px;
            display: none;
            overflow-y: auto;
            max-height: 100%;
        }
        .action-button {
            width: 100%;
            margin-bottom: 8px;
            padding: 8px 12px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            text-align: left;
        }
        .action-button:hover {
            background: #e9ecef;
        }
        .action-button.primary {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }
        .action-button.primary:hover {
            background: #0056b3;
        }
        .action-button.danger {
            background: #dc3545;
            color: white;
            border-color: #dc3545;
        }
        .action-button.danger:hover {
            background: #c82333;
        }
        .top-squares {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .top-square {
            width: 80px;
            height: 60px;
            background: #007bff;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            text-align: center;
        }
        .top-square:hover {
            background: #0056b3;
        }
        .top-square.active {
            background: #28a745;
        }
        .tile-node {
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            cursor: pointer;
            border: 2px solid transparent;
        }
        .tile-node:hover {
            background: #e9ecef;
        }
        .tile-node.active {
            border-color: #007bff;
            background: #e3f2fd;
        }
        .tile-node.connected {
            border-color: #28a745;
            background: #d4edda;
        }
        .tile-node.missing {
            background: #f8d7da;
            border-color: #dc3545;
            color: #721c24;
        }
        .tile-node.missing:hover {
            background: #f5c6cb;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        .form-group input, .form-group textarea, .form-group select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .form-group textarea {
            min-height: 100px;
            resize: vertical;
        }
        .choice-item {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 10px;
            background: #f8f9fa;
        }
        .choice-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .btn-primary {
            background: #007bff;
            color: white;
        }
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn:hover {
            opacity: 0.9;
        }
        .header-actions {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .save-status {
            margin-left: auto;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
        }
        .save-status.saved {
            background: #d4edda;
            color: #155724;
        }
        .save-status.unsaved {
            background: #f8d7da;
            color: #721c24;
        }
        .add-tile-btn {
            width: 100%;
            margin-top: 10px;
        }
        .hidden {
            display: none;
        }
        .media-preview {
            margin-top: 5px;
        }
        .media-preview img, .media-preview video {
            display: block;
            margin-top: 10px;
        }
        .audio-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
        }
        .image-map-editor {
            position: relative;
            display: inline-block;
            margin-top: 10px;
        }
        .image-map-editor img {
            display: block;
            cursor: crosshair;
        }
        .image-map-overlay {
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 10;
        }
        .map-region-highlight {
            fill: rgba(255, 0, 0, 0.3);
            stroke: #ff0000;
            stroke-width: 2;
        }
        .map-region-editing {
            fill: rgba(0, 255, 0, 0.3);
            stroke: #00ff00;
            stroke-width: 2;
        }
        .map-editor-controls {
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .map-editor-controls button {
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="editor-container">
        <div class="tile-tree">
            <h3>Story Structure</h3>
            <div class="top-squares">
                <div class="top-square" onclick="selectView('metadata')">Meta</div>
                <div class="top-square" onclick="selectView('stuff')">Stuff</div>
                <div class="top-square" onclick="selectView('achievements')">Achieve</div>
                <div class="top-square" onclick="selectView('credits')">Credits</div>
            </div>
            <div id="tile-list">
                <!-- Tiles will be populated by JavaScript -->
            </div>
            <button class="btn btn-primary add-tile-btn" onclick="addTile()">Add Tile</button>
        </div>
        
        <div class="action-panel">
            <h3>Actions</h3>
            <div id="action-buttons">
                <!-- Action buttons will be populated by JavaScript -->
            </div>
        </div>
        
        <div class="content-preview">
            <div class="header-actions">
                <button class="btn btn-success" onclick="saveStory()">Save Story</button>
                <a href="/edit" class="btn btn-primary">Back to Edit Menu</a>
                <div class="save-status saved" id="save-status">Saved</div>
            </div>
            
            <div id="preview-content">
                <!-- Play mode preview will be populated by JavaScript -->
            </div>
            
            <div id="edit-overlay" class="edit-overlay">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 id="edit-title">Edit</h3>
                    <div>
                        <button class="btn btn-success" onclick="saveCurrentEdit()">Save</button>
                        <button class="btn btn-secondary" onclick="cancelCurrentEdit()">Cancel</button>
                    </div>
                </div>
                <div id="edit-form">
                    <!-- Edit form will be populated by JavaScript -->
                </div>
            </div>
            
            <!-- Hidden file input for uploads -->
            <input type="file" id="file-upload" style="display: none;" />
        </div>
    </div>

    <script>
        let currentStory = ${JSON.stringify(story)};
        let currentView = 'tile';
        let currentTileId = '1';
        let currentEditMode = 'preview'; // 'preview' or 'editing'
        let currentEditFeature = null; // what feature is being edited
        let unsavedChanges = false;

        function initEditor() {
            renderTileList();
            selectTile('1');
        }

        function renderTileList() {
            const tileList = document.getElementById('tile-list');
            tileList.innerHTML = '';
            
            if (!currentStory || !currentStory.Tiles) {
                return;
            }
            
            // Get all existing tile IDs
            const existingTileIds = new Set(currentStory.Tiles.map(t => t.id));
            
            // Get all referenced tile IDs from choices and maps
            const referencedTileIds = new Set();
            currentStory.Tiles.forEach(tile => {
                if (tile.choices) {
                    tile.choices.forEach(choice => {
                        if (choice.to_tile) {
                            referencedTileIds.add(choice.to_tile);
                        }
                    });
                }
                if (tile.map) {
                    tile.map.forEach(region => {
                        if (region.to_tile) {
                            referencedTileIds.add(region.to_tile);
                        }
                    });
                }
            });
            
            // Get connected tiles for the current tile
            const connectedTileIds = new Set();
            if (currentTileId && currentView === 'tile') {
                const currentTile = currentStory.Tiles.find(t => t.id === currentTileId);
                if (currentTile) {
                    if (currentTile.choices) {
                        currentTile.choices.forEach(choice => {
                            if (choice.to_tile) {
                                connectedTileIds.add(choice.to_tile);
                            }
                        });
                    }
                    if (currentTile.map) {
                        currentTile.map.forEach(region => {
                            if (region.to_tile) {
                                connectedTileIds.add(region.to_tile);
                            }
                        });
                    }
                }
            }
            
            // Render existing tiles
            currentStory.Tiles.forEach(tile => {
                const tileNode = document.createElement('div');
                tileNode.className = 'tile-node';
                tileNode.innerHTML = \`Tile \${tile.id}\${tile.title ? ': ' + tile.title : ''}\`;
                tileNode.onclick = () => selectTile(tile.id);
                
                // Add appropriate classes
                if (tile.id === currentTileId && currentView === 'tile') {
                    tileNode.classList.add('active');
                } else if (connectedTileIds.has(tile.id)) {
                    tileNode.classList.add('connected');
                }
                
                tileList.appendChild(tileNode);
            });
            
            // Render missing tiles (referenced but don't exist)
            referencedTileIds.forEach(tileId => {
                if (!existingTileIds.has(tileId)) {
                    const missingNode = document.createElement('div');
                    missingNode.className = 'tile-node missing';
                    missingNode.innerHTML = \`Tile \${tileId} (missing - click to create)\`;
                    missingNode.onclick = () => createMissingTile(tileId);
                    tileList.appendChild(missingNode);
                }
            });
        }
        
        function createMissingTile(tileId) {
            // Create a new tile with the specified ID
            const newTile = {
                id: tileId,
                title: '',
                text: '',
                choices: []
            };
            
            currentStory.Tiles.push(newTile);
            renderTileList();
            selectTile(tileId);
            markUnsaved();
        }

        function selectView(view) {
            // Auto-cancel any current edit
            if (currentEditMode === 'editing') {
                cancelCurrentEdit();
            }
            
            currentView = view;
            currentTileId = null;
            currentEditMode = 'preview';
            currentEditFeature = null;
            
            // Update active states
            document.querySelectorAll('.top-square').forEach(sq => sq.classList.remove('active'));
            document.querySelectorAll('.tile-node').forEach(node => node.classList.remove('active'));
            event.target.classList.add('active');
            
            // Clear action buttons when not on a tile
            document.getElementById('action-buttons').innerHTML = '';
            
            if (view === 'metadata') {
                renderMetadataPreview();
            } else if (view === 'stuff') {
                renderStuffPreview();
            } else if (view === 'achievements') {
                renderAchievementsPreview();
            } else if (view === 'credits') {
                renderCreditsPreview();
            }
        }

        function selectTile(tileId) {
            // Auto-cancel any current edit
            if (currentEditMode === 'editing') {
                cancelCurrentEdit();
            }
            
            currentView = 'tile';
            currentTileId = tileId;
            currentEditMode = 'preview';
            currentEditFeature = null;
            
            // Update active states
            document.querySelectorAll('.top-square').forEach(sq => sq.classList.remove('active'));
            renderTileList(); // Re-render to update active tile
            renderActionButtons();
            renderTilePreview();
        }

        function renderActionButtons() {
            if (currentView !== 'tile' || !currentTileId) {
                document.getElementById('action-buttons').innerHTML = '';
                return;
            }
            
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile) return;
            
            const actionButtons = document.getElementById('action-buttons');
            let buttonsHTML = '';
            
            // Tile ID button (always first)
            buttonsHTML += '<button class="action-button" onclick="editFeature(\\'id\\')">Edit Tile ID</button>';
            
            // Title button
            if (tile.title) {
                buttonsHTML += '<button class="action-button" onclick="editFeature(\\'title\\')">Edit Title</button>';
            } else {
                buttonsHTML += '<button class="action-button primary" onclick="editFeature(\\'title\\')">Add Title</button>';
            }
            
            // Text button
            if (tile.text) {
                buttonsHTML += '<button class="action-button" onclick="editFeature(\\'text\\')">Edit Text</button>';
            } else {
                buttonsHTML += '<button class="action-button primary" onclick="editFeature(\\'text\\')">Add Text</button>';
            }
            
            // Picture button
            if (tile.picture) {
                buttonsHTML += '<button class="action-button" onclick="editFeature(\\'picture\\')">Change Picture</button>';
                buttonsHTML += '<button class="action-button danger" onclick="removeMedia(\\'picture\\')">Remove Picture</button>';
            } else {
                buttonsHTML += '<button class="action-button primary" onclick="editFeature(\\'picture\\')">Add Picture</button>';
            }
            
            // Video button
            if (tile.video) {
                buttonsHTML += '<button class="action-button" onclick="editFeature(\\'video\\')">Change Video</button>';
                buttonsHTML += '<button class="action-button danger" onclick="removeMedia(\\'video\\')">Remove Video</button>';
            } else {
                buttonsHTML += '<button class="action-button" onclick="uploadMedia(\\'video\\')">Upload Video</button>';
            }
            
            // Sound button
            if (tile.sound) {
                buttonsHTML += '<button class="action-button" onclick="editFeature(\\'sound\\')">Change Sound</button>';
                buttonsHTML += '<button class="action-button danger" onclick="removeMedia(\\'sound\\')">Remove Sound</button>';
            } else {
                buttonsHTML += '<button class="action-button" onclick="uploadMedia(\\'sound\\')">Upload Sound</button>';
            }
            
            // Music button
            if (tile.music) {
                buttonsHTML += '<button class="action-button" onclick="editFeature(\\'music\\')">Change Music</button>';
                buttonsHTML += '<button class="action-button danger" onclick="removeMedia(\\'music\\')">Remove Music</button>';
            } else {
                buttonsHTML += '<button class="action-button" onclick="uploadMedia(\\'music\\')">Upload Music</button>';
            }
            
            // Mood button
            if (tile.mood) {
                buttonsHTML += '<button class="action-button" onclick="editFeature(\\'mood\\')">Change Mood</button>';
                buttonsHTML += '<button class="action-button danger" onclick="removeFeature(\\'mood\\')">Remove Mood</button>';
            } else {
                buttonsHTML += '<button class="action-button" onclick="editFeature(\\'mood\\')">Add Mood</button>';
            }
            
            // Achievement button - now managed at story level, not tile level
            // Remove this section as achievements are now managed in the Meta section
            
            // Choice buttons
            if (tile.choices && tile.choices.length > 0) {
                tile.choices.forEach((choice, index) => {
                    buttonsHTML += \`<button class="action-button" onclick="editFeature('choice', \${index})">Edit Choice \${index + 1}</button>\`;
                    buttonsHTML += \`<button class="action-button danger" onclick="removeChoice(\${index})">Remove Choice \${index + 1}</button>\`;
                });
            }
            buttonsHTML += '<button class="action-button primary" onclick="editFeature(\\'choice\\', -1)">Add Choice</button>';
            
            // Map region buttons
            if (tile.map && tile.map.length > 0) {
                tile.map.forEach((region, index) => {
                    buttonsHTML += \`<button class="action-button" onclick="editFeature('map', \${index})">Edit Map Region \${index + 1}</button>\`;
                    buttonsHTML += \`<button class="action-button danger" onclick="removeMapRegion(\${index})">Remove Map Region \${index + 1}</button>\`;
                });
            }
            // Only show "Add Map Region" if there's a picture
            if (tile.picture) {
                buttonsHTML += '<button class="action-button primary" onclick="startInteractiveMapCreation()">Add Map Region</button>';
            }
            
            actionButtons.innerHTML = buttonsHTML;
        }

        function renderTilePreview() {
            if (currentView !== 'tile' || !currentTileId) {
                document.getElementById('preview-content').innerHTML = '';
                return;
            }
            
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile) return;
            
            const previewContent = document.getElementById('preview-content');
            
            // Create a play-mode style preview
            let previewHTML = '<div style="max-width: 600px; margin: 0 auto;">';
            
            // Title
            if (tile.title) {
                previewHTML += \`<h2 style="text-align: center; margin-bottom: 20px;">\${tile.title}</h2>\`;
            }
            
            // Mood indicator
            if (tile.mood) {
                const moodColors = {
                    'cold': '#87CEEB',
                    'hot': '#FF6B6B', 
                    'gritty': '#8B4513',
                    'metal': '#C0C0C0',
                    'hacker': '#00FF00'
                };
                const moodColor = moodColors[tile.mood] || '#666';
                previewHTML += \`<div style="text-align: center; margin-bottom: 15px; padding: 8px; background: \${moodColor}; color: white; border-radius: 4px; font-weight: bold; text-transform: uppercase;">Mood: \${tile.mood}</div>\`;
            }
            
            // Picture with image map overlay
            if (tile.picture) {
                previewHTML += \`
                    <div style="position: relative; display: inline-block; margin: 0 auto 20px auto;">
                        <img src="\${tile.picture}" alt="Tile image" style="width: 40vw; height: auto; border-radius: 4px; display: block;" id="preview-image">
                        <svg id="preview-map-overlay" style="position: absolute; top: 0; left: 0; pointer-events: none;"></svg>
                    </div>
                \`;
            }
            
            // Video
            if (tile.video) {
                previewHTML += \`
                    <div style="text-align: center; margin-bottom: 20px;">
                        <video controls style="max-width: 100%; height: auto; border-radius: 4px;">
                            <source src="\${tile.video}" type="video/mp4">
                        </video>
                    </div>
                \`;
            }
            
            // Text
            if (tile.text) {
                previewHTML += \`<div style="margin-bottom: 20px; line-height: 1.6;">\${tile.text}</div>\`;
            }
            
            // Audio controls
            if (tile.sound || tile.music) {
                previewHTML += '<div style="margin-bottom: 20px;">';
                if (tile.sound) {
                    previewHTML += \`
                        <div style="margin-bottom: 10px;">
                            <strong>Sound:</strong>
                            <audio controls style="margin-left: 10px;">
                                <source src="\${tile.sound}" type="audio/mpeg">
                            </audio>
                        </div>
                    \`;
                }
                if (tile.music) {
                    previewHTML += \`
                        <div>
                            <strong>Music:</strong>
                            <audio controls style="margin-left: 10px;">
                                <source src="\${tile.music}" type="audio/mpeg">
                            </audio>
                        </div>
                    \`;
                }
                previewHTML += '</div>';
            }
            
            // Choices
            if (tile.choices && tile.choices.length > 0) {
                previewHTML += '<div style="margin-bottom: 20px;">';
                tile.choices.forEach((choice, index) => {
                    previewHTML += \`
                        <button style="display: block; width: 100%; margin-bottom: 10px; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;" 
                                onclick="navigateToTile('\${choice.to_tile}')">
                            \${choice.text}
                        </button>
                    \`;
                });
                previewHTML += '</div>';
            }
            
            previewHTML += '</div>';
            previewContent.innerHTML = previewHTML;
            
            // Initialize image map overlay if needed
            setTimeout(() => {
                if (tile.picture && tile.map) {
                    renderPreviewMapOverlay();
                }
            }, 100);
        }

        function renderPreviewMapOverlay() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile || !tile.map) return;
            
            const img = document.getElementById('preview-image');
            const overlay = document.getElementById('preview-map-overlay');
            if (!img || !overlay) return;
            
            // Wait for image to be fully rendered before setting overlay
            setTimeout(() => {
                // Set overlay to exact image dimensions and position
                overlay.setAttribute('width', img.offsetWidth);
                overlay.setAttribute('height', img.offsetHeight);
                
                // Ensure overlay is positioned exactly over the image
                overlay.style.width = img.offsetWidth + 'px';
                overlay.style.height = img.offsetHeight + 'px';
                overlay.style.left = '0px';
                overlay.style.top = '0px';
                
                // Clear existing regions
                overlay.innerHTML = '';
                
                // Draw each map region (all revealed)
                tile.map.forEach((region, index) => {
                    drawPreviewMapRegion(region, index);
                });
            }, 50);
        }

        function drawPreviewMapRegion(region, index) {
            const overlay = document.getElementById('preview-map-overlay');
            const img = document.getElementById('preview-image');
            if (!overlay || !img) return;
            
            let element;
            const coords = region.coords.split(',').map(c => parseInt(c));
            
            // Convert natural coordinates to display coordinates (same as play mode adjustCoords)
            const ratio = img.offsetHeight / img.naturalHeight;
            const displayCoords = coords.map(coord => coord * ratio);
            
            switch(region.shape) {
                case 'rect':
                    element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    element.setAttribute('x', displayCoords[0]);
                    element.setAttribute('y', displayCoords[1]);
                    element.setAttribute('width', displayCoords[2] - displayCoords[0]);
                    element.setAttribute('height', displayCoords[3] - displayCoords[1]);
                    break;
                    
                case 'circle':
                    element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    element.setAttribute('cx', displayCoords[0]);
                    element.setAttribute('cy', displayCoords[1]);
                    element.setAttribute('r', displayCoords[2]);
                    break;
                    
                case 'poly':
                    element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                    const points = [];
                    for (let i = 0; i < displayCoords.length; i += 2) {
                        points.push(displayCoords[i] + ',' + displayCoords[i + 1]);
                    }
                    element.setAttribute('points', points.join(' '));
                    break;
            }
            
            if (element) {
                // Always show as revealed (red highlight)
                element.setAttribute('fill', 'rgba(255, 0, 0, 0.3)');
                element.setAttribute('stroke', '#ff0000');
                element.setAttribute('stroke-width', '2');
                element.style.cursor = 'pointer';
                element.onclick = () => navigateToTile(region.to_tile);
                overlay.appendChild(element);
            }
        }

        function navigateToTile(tileId) {
            if (tileId && tileId !== currentTileId) {
                selectTile(tileId);
            }
        }

        function editFeature(feature, index = null) {
            currentEditMode = 'editing';
            currentEditFeature = { feature, index };
            
            const overlay = document.getElementById('edit-overlay');
            const title = document.getElementById('edit-title');
            const form = document.getElementById('edit-form');
            
            // Show overlay
            overlay.style.display = 'block';
            
            // Set title and render form based on feature
            switch(feature) {
                case 'id':
                    title.textContent = 'Edit Tile ID';
                    renderIdEditForm();
                    break;
                case 'title':
                    title.textContent = 'Edit Title';
                    renderTitleEditForm();
                    break;
                case 'text':
                    title.textContent = 'Edit Text Content';
                    renderTextEditForm();
                    break;
                case 'picture':
                    title.textContent = 'Edit Picture';
                    renderPictureEditForm();
                    break;
                case 'video':
                    title.textContent = 'Edit Video';
                    renderVideoEditForm();
                    break;
                case 'sound':
                    title.textContent = 'Edit Sound';
                    renderSoundEditForm();
                    break;
                case 'music':
                    title.textContent = 'Edit Music';
                    renderMusicEditForm();
                    break;
                case 'mood':
                    title.textContent = 'Edit Mood';
                    renderMoodEditForm();
                    break;
                case 'choice':
                    title.textContent = index === -1 ? 'Add Choice' : \`Edit Choice \${index + 1}\`;
                    renderChoiceEditForm(index);
                    break;
                case 'map':
                    title.textContent = index === -1 ? 'Add Map Region' : \`Edit Map Region \${index + 1}\`;
                    renderMapEditForm(index);
                    break;
                case 'metadata':
                    title.textContent = 'Edit Metadata';
                    renderMetadataEditForm();
                    break;
                case 'stuff':
                    title.textContent = index === -1 ? 'Add Item' : \`Edit Item \${index + 1}\`;
                    renderStuffEditForm(index);
                    break;
                case 'achievements':
                    title.textContent = index === -1 ? 'Add Achievement' : \`Edit Achievement \${index + 1}\`;
                    renderAchievementsEditForm(index);
                    break;
                case 'credits':
                    title.textContent = 'Edit Credits';
                    renderCreditsEditForm();
                    break;
            }
        }

        function saveCurrentEdit() {
            // This will be implemented for each feature type
            const feature = currentEditFeature.feature;
            const index = currentEditFeature.index;
            
            switch(feature) {
                case 'id':
                    saveIdEdit();
                    break;
                case 'title':
                    saveTitleEdit();
                    break;
                case 'text':
                    saveTextEdit();
                    break;
                case 'picture':
                    savePictureEdit();
                    break;
                case 'video':
                    saveVideoEdit();
                    break;
                case 'sound':
                    saveSoundEdit();
                    break;
                case 'music':
                    saveMusicEdit();
                    break;
                case 'mood':
                    saveMoodEdit();
                    break;
                case 'achievement':
                    saveAchievementEdit();
                    break;
                case 'choice':
                    saveChoiceEdit(index);
                    break;
                case 'map':
                    saveMapEdit(index);
                    break;
                case 'metadata':
                    saveMetadataEdit();
                    break;
                case 'stuff':
                    saveStuffEdit(index);
                    break;
                case 'achievements':
                    saveAchievementsEdit(index);
                    break;
                case 'credits':
                    saveCreditsEdit();
                    break;
            }
            
            // Return to preview mode
            cancelCurrentEdit();
            
            // Refresh displays
            renderActionButtons();
            renderTilePreview();
            renderTileList();
            markUnsaved();
        }

        function cancelCurrentEdit() {
            currentEditMode = 'preview';
            currentEditFeature = null;
            document.getElementById('edit-overlay').style.display = 'none';
        }

        function renderTileEditor(tileId) {
            const tile = currentStory.Tiles.find(t => t.id === tileId);
            if (!tile) return;

            const content = document.getElementById('editor-content');
            content.innerHTML = \`
                <h3>Edit Tile \${tileId}</h3>
                <div class="form-group">
                    <label>Tile ID:</label>
                    <input type="text" id="tile-id" value="\${tile.id}" onchange="updateTileField('id', this.value)">
                </div>
                <div class="form-group">
                    <label>Title:</label>
                    <input type="text" id="tile-title" value="\${tile.title || ''}" onchange="updateTileField('title', this.value)">
                </div>
                <div class="form-group">
                    <label>Text Content:</label>
                    <textarea id="tile-text" onchange="updateTileField('text', this.value)">\${tile.text || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Picture URL:</label>
                    <input type="text" id="tile-picture" value="\${tile.picture || ''}" onchange="updateTileField('picture', this.value); updateMediaPreview('picture', this.value)">
                    <button class="btn btn-primary" onclick="uploadMedia('picture')">Upload Image</button>
                    <div id="picture-preview" class="media-preview"></div>
                </div>
                <div class="form-group">
                    <label>Video URL:</label>
                    <input type="text" id="tile-video" value="\${tile.video || ''}" onchange="updateTileField('video', this.value); updateMediaPreview('video', this.value)">
                    <button class="btn btn-primary" onclick="uploadMedia('video')">Upload Video</button>
                    <div id="video-preview" class="media-preview"></div>
                </div>
                <div class="form-group">
                    <label>Sound URL:</label>
                    <input type="text" id="tile-sound" value="\${tile.sound || ''}" onchange="updateTileField('sound', this.value); updateMediaPreview('sound', this.value)">
                    <div id="sound-preview" class="media-preview"></div>
                </div>
                <div class="form-group">
                    <label>Music URL:</label>
                    <input type="text" id="tile-music" value="\${tile.music || ''}" onchange="updateTileField('music', this.value); updateMediaPreview('music', this.value)">
                    <div id="music-preview" class="media-preview"></div>
                </div>
                <div class="form-group">
                    <label>Mood:</label>
                    <select id="tile-mood" onchange="updateTileField('mood', this.value)">
                        <option value="">None</option>
                        <option value="cold" \${tile.mood === 'cold' ? 'selected' : ''}>Cold</option>
                        <option value="hot" \${tile.mood === 'hot' ? 'selected' : ''}>Hot</option>
                        <option value="gritty" \${tile.mood === 'gritty' ? 'selected' : ''}>Gritty</option>
                        <option value="metal" \${tile.mood === 'metal' ? 'selected' : ''}>Metal</option>
                        <option value="hacker" \${tile.mood === 'hacker' ? 'selected' : ''}>Hacker</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Achievement:</label>
                    <input type="text" id="tile-achievement" value="\${tile.achievement || ''}" onchange="updateTileField('achievement', this.value)">
                </div>
                
                <h4>Choices</h4>
                <div id="choices-list">
                    <!-- Choices will be rendered here -->
                </div>
                <button class="btn btn-primary" onclick="addChoice()">Add Choice</button>
                
                <h4>Image Map</h4>
                <div class="map-editor-controls" id="map-editor-controls" style="display: none;">
                    <label>Creating: </label>
                    <select id="map-shape-selector">
                        <option value="rect">Rectangle</option>
                        <option value="circle">Circle</option>
                        <option value="poly">Polygon</option>
                    </select>
                    <button class="btn btn-primary" onclick="startMapCreation()">Start Creating Region</button>
                    <button class="btn btn-danger" onclick="cancelMapCreation()">Cancel</button>
                    <button class="btn btn-success" onclick="finishMapCreation()">Finish Region</button>
                    <div style="margin-top: 5px;">
                        <small>Click on the image to create regions. For rectangles: click two corners. For circles: click center then edge. For polygons: click multiple points, then finish.</small>
                    </div>
                </div>
                <div id="map-list">
                    <!-- Image map regions will be rendered here -->
                </div>
                <button class="btn btn-primary" onclick="addMapRegion()">Add Map Region</button>
            \`;
            
            renderChoices();
            renderImageMap();
            
            // Initialize media previews
            if (tile.picture) updateMediaPreview('picture', tile.picture);
            if (tile.video) updateMediaPreview('video', tile.video);
            if (tile.sound) updateMediaPreview('sound', tile.sound);
            if (tile.music) updateMediaPreview('music', tile.music);
            
            // Initialize image map editor if picture exists
            setTimeout(() => {
                if (tile.picture) {
                    initImageMapEditor();
                    renderExistingMapRegions();
                }
            }, 100);
        }

        // Edit form functions for each feature type
        function renderIdEditForm() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Tile ID:</label>
                    <input type="text" id="edit-id-input" value="\${tile.id}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <small style="color: #666; margin-top: 5px; display: block;">
                        Warning: Changing the tile ID will update all references to this tile throughout the story.
                    </small>
                </div>
            \`;
        }

        function renderTitleEditForm() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Title:</label>
                    <input type="text" id="edit-title-input" value="\${tile.title || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            \`;
        }

        function renderTextEditForm() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Text Content (HTML supported):</label>
                    <textarea id="edit-text-input" style="width: 100%; min-height: 200px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">\${tile.text || ''}</textarea>
                </div>
            \`;
        }

        function renderPictureEditForm() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Picture URL:</label>
                    <input type="text" id="edit-picture-input" value="\${tile.picture || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" onchange="updateEditMediaPreview('picture', this.value)">
                    <button class="btn btn-primary" onclick="uploadEditMedia('picture')" style="margin-top: 10px;">Upload Image</button>
                    <div id="edit-picture-preview" class="media-preview"></div>
                </div>
            \`;
            if (tile.picture) {
                setTimeout(() => updateEditMediaPreview('picture', tile.picture), 100);
            }
        }

        function renderVideoEditForm() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Video:</label>
                    <button class="btn btn-primary" onclick="uploadEditMedia('video')" style="width: 100%; margin-bottom: 10px;">Upload Video</button>
                    <div id="edit-video-preview" class="media-preview"></div>
                </div>
            \`;
            if (tile.video) {
                setTimeout(() => updateEditMediaPreview('video', tile.video), 100);
            }
        }

        function renderSoundEditForm() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Sound:</label>
                    <button class="btn btn-primary" onclick="uploadEditMedia('sound')" style="width: 100%; margin-bottom: 10px;">Upload Sound</button>
                    <div id="edit-sound-preview" class="media-preview"></div>
                </div>
            \`;
            if (tile.sound) {
                setTimeout(() => updateEditMediaPreview('sound', tile.sound), 100);
            }
        }

        function renderMusicEditForm() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Music:</label>
                    <button class="btn btn-primary" onclick="uploadEditMedia('music')" style="width: 100%; margin-bottom: 10px;">Upload Music</button>
                    <div id="edit-music-preview" class="media-preview"></div>
                </div>
            \`;
            if (tile.music) {
                setTimeout(() => updateEditMediaPreview('music', tile.music), 100);
            }
        }

        function renderMoodEditForm() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Mood:</label>
                    <select id="edit-mood-input" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">None</option>
                        <option value="cold" \${tile.mood === 'cold' ? 'selected' : ''}>Cold</option>
                        <option value="hot" \${tile.mood === 'hot' ? 'selected' : ''}>Hot</option>
                        <option value="gritty" \${tile.mood === 'gritty' ? 'selected' : ''}>Gritty</option>
                        <option value="metal" \${tile.mood === 'metal' ? 'selected' : ''}>Metal</option>
                        <option value="hacker" \${tile.mood === 'hacker' ? 'selected' : ''}>Hacker</option>
                    </select>
                </div>
            \`;
        }

        // Temporary function to handle old achievement edit form - will be removed when we update to new system
        function renderAchievementEditForm() {
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div style="padding: 20px; text-align: center; color: #666;">
                    <h3>Achievement System Updated</h3>
                    <p>Achievements are now managed at the story level.</p>
                    <p>Please use the "Achieve" tab in the left panel to manage achievements,<br>
                    and add them to choices using the achievement dropdown in choice editing.</p>
                    <button class="btn btn-primary" onclick="selectView('achievements')" style="margin-top: 15px;">Go to Achievements</button>
                </div>
            \`;
        }

        function renderChoiceEditForm(index) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const choice = index >= 0 ? tile.choices[index] : {};
            const form = document.getElementById('edit-form');
            
            // Get available stuff items from the story
            const stuffItems = currentStory.Stuff || [];
            
            form.innerHTML = \`
                <div class="form-group">
                    <label>Choice Text:</label>
                    <input type="text" id="edit-choice-text" value="\${choice.text || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Target Tile:</label>
                    <input type="text" id="edit-choice-to-tile" value="\${choice.to_tile || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Requires:</label>
                    <div id="edit-choice-requires-container">
                        <!-- Requires items will be populated by JavaScript -->
                    </div>
                    <button type="button" onclick="addChoiceItem('requires')" style="margin-top: 5px; padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px;">Add Required Item</button>
                    <small style="display: block; margin-top: 5px; color: #666;">Items that must be in inventory for this choice to be available. Create items in the Stuff section first.</small>
                </div>
                <div class="form-group">
                    <label>Uses:</label>
                    <div id="edit-choice-uses-container">
                        <!-- Uses items will be populated by JavaScript -->
                    </div>
                    <button type="button" onclick="addChoiceItem('uses')" style="margin-top: 5px; padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px;">Add Used Item</button>
                    <small style="display: block; margin-top: 5px; color: #666;">Items that will be consumed when this choice is selected. Create items in the Stuff section first.</small>
                </div>
                <div class="form-group">
                    <label>Item:</label>
                    <div id="edit-choice-item-container">
                        <!-- Item rewards will be populated by JavaScript -->
                    </div>
                    <button type="button" onclick="addChoiceItem('item')" style="margin-top: 5px; padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px;">Add Reward Item</button>
                    <small style="display: block; margin-top: 5px; color: #666;">Items that will be added to inventory when this choice is selected. Create items in the Stuff section first.</small>
                </div>
                <div class="form-group">
                    <label>Achievement:</label>
                    <div id="edit-choice-achievement-container">
                        <!-- Achievement rewards will be populated by JavaScript -->
                    </div>
                    <button type="button" onclick="addChoiceAchievement()" style="margin-top: 5px; padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px;">Add Achievement</button>
                    <small style="display: block; margin-top: 5px; color: #666;">Achievements that will be unlocked when this choice is selected. Create achievements in the Achievements section first.</small>
                </div>
                <div class="form-group">
                    <label>Disable:</label>
                    <select id="edit-choice-disable" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Default (grey)</option>
                        <option value="grey" \${choice.disable === 'grey' ? 'selected' : ''}>Grey</option>
                        <option value="invisible" \${choice.disable === 'invisible' ? 'selected' : ''}>Invisible</option>
                    </select>
                </div>
            \`;
            
            // Populate the item containers
            setTimeout(() => {
                populateChoiceItems('requires', choice.requires || []);
                populateChoiceItems('uses', choice.uses || []);
                populateChoiceItems('item', choice.item || []);
                populateChoiceAchievements(choice.achievement || []);
            }, 100);
        }

        function populateChoiceItems(type, items) {
            const container = document.getElementById('edit-choice-' + type + '-container');
            if (!container) return;
            
            container.innerHTML = '';
            
            // Ensure items is an array
            const itemArray = Array.isArray(items) ? items : (items ? [items] : []);
            
            itemArray.forEach((item, index) => {
                addChoiceItemRow(type, item, index);
            });
        }
        
        function addChoiceItem(type) {
            const stuffItems = currentStory.Stuff || [];
            if (stuffItems.length === 0) {
                alert('No items available. Please create items in the Stuff section first.');
                return;
            }
            
            const container = document.getElementById('edit-choice-' + type + '-container');
            const currentItems = container.children.length;
            addChoiceItemRow(type, '', currentItems);
        }
        
        function addChoiceItemRow(type, selectedItem, index) {
            const container = document.getElementById('edit-choice-' + type + '-container');
            const stuffItems = currentStory.Stuff || [];
            
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; margin-bottom: 5px; gap: 10px;';
            
            // Create dropdown
            const select = document.createElement('select');
            select.style.cssText = 'flex: 1; padding: 5px; border: 1px solid #ddd; border-radius: 3px;';
            select.id = 'edit-choice-' + type + '-' + index;
            
            // Add empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- Select Item --';
            select.appendChild(emptyOption);
            
            // Add stuff items
            stuffItems.forEach(item => {
                const option = document.createElement('option');
                option.value = item.key;  // Use key as value
                option.textContent = item.name;  // Display name to user
                if (item.key === selectedItem) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.textContent = 'Remove';
            removeBtn.style.cssText = 'padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px;';
            removeBtn.onclick = () => {
                row.remove();
            };
            
            row.appendChild(select);
            row.appendChild(removeBtn);
            container.appendChild(row);
        }
        
        function getChoiceItems(type) {
            const container = document.getElementById('edit-choice-' + type + '-container');
            const items = [];
            
            Array.from(container.children).forEach(row => {
                const select = row.querySelector('select');
                if (select && select.value) {
                    items.push(select.value);
                }
            });
            
            return items;
        }

        function populateChoiceAchievements(achievements) {
            const container = document.getElementById('edit-choice-achievement-container');
            if (!container) return;
            
            container.innerHTML = '';
            
            // Ensure achievements is an array
            const achievementArray = Array.isArray(achievements) ? achievements : (achievements ? [achievements] : []);
            
            achievementArray.forEach((achievement, index) => {
                addChoiceAchievementRow(achievement, index);
            });
        }
        
        function addChoiceAchievement() {
            const achievements = currentStory.Achievements || [];
            
            if (achievements.length === 0) {
                alert('No achievements available. Please create achievements in the Achievements section first.');
                return;
            }
            
            const container = document.getElementById('edit-choice-achievement-container');
            const currentAchievements = container.children.length;
            addChoiceAchievementRow('', currentAchievements);
        }
        
        function addChoiceAchievementRow(selectedAchievement, index) {
            const container = document.getElementById('edit-choice-achievement-container');
            const achievements = currentStory.Achievements || [];
            
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; margin-bottom: 5px; gap: 10px;';
            
            // Create dropdown
            const select = document.createElement('select');
            select.style.cssText = 'flex: 1; padding: 5px; border: 1px solid #ddd; border-radius: 3px;';
            select.id = 'edit-choice-achievement-' + index;
            
            // Add empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- Select Achievement --';
            select.appendChild(emptyOption);
            
            // Add achievements
            achievements.forEach(achievement => {
                const option = document.createElement('option');
                option.value = achievement.key;  // Use key as value
                option.textContent = achievement.name;  // Display name to user
                if (achievement.key === selectedAchievement) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.textContent = 'Remove';
            removeBtn.style.cssText = 'padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px;';
            removeBtn.onclick = () => {
                row.remove();
            };
            
            row.appendChild(select);
            row.appendChild(removeBtn);
            container.appendChild(row);
        }
        
        function getChoiceAchievements() {
            const container = document.getElementById('edit-choice-achievement-container');
            const achievements = [];
            
            Array.from(container.children).forEach(row => {
                const select = row.querySelector('select');
                if (select && select.value) {
                    achievements.push(select.value);
                }
            });
            
            return achievements;
        }
        
        function addMapItem(type) {
            const stuffItems = currentStory.Stuff || [];
            if (stuffItems.length === 0) {
                alert('No items available. Please create items in the Stuff section first.');
                return;
            }
            
            const container = document.getElementById('map-' + type + '-container');
            const currentItems = container.children.length;
            addMapItemRow(type, '', currentItems);
        }
        
        function addMapItemRow(type, selectedItem, index) {
            const container = document.getElementById('map-' + type + '-container');
            const stuffItems = currentStory.Stuff || [];
            
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; margin-bottom: 5px; gap: 5px;';
            
            // Create dropdown
            const select = document.createElement('select');
            select.style.cssText = 'flex: 1; padding: 5px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;';
            select.id = 'map-' + type + '-' + index;
            
            // Add empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- Select Item --';
            select.appendChild(emptyOption);
            
            // Add stuff items
            stuffItems.forEach(item => {
                const option = document.createElement('option');
                option.value = item.key;  // Use key as value
                option.textContent = item.name;  // Display name to user
                if (item.key === selectedItem) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.textContent = '×';
            removeBtn.style.cssText = 'padding: 5px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; font-size: 12px;';
            removeBtn.onclick = () => {
                row.remove();
            };
            
            row.appendChild(select);
            row.appendChild(removeBtn);
            container.appendChild(row);
        }
        
        function getMapItems(type) {
            const container = document.getElementById('map-' + type + '-container');
            const items = [];
            
            Array.from(container.children).forEach(row => {
                const select = row.querySelector('select');
                if (select && select.value) {
                    items.push(select.value);
                }
            });
            
            return items;
        }

        function addMapAchievement() {
            const achievements = currentStory.Achievements || [];
            if (achievements.length === 0) {
                alert('No achievements available. Please create achievements in the Achievements section first.');
                return;
            }
            
            const container = document.getElementById('map-achievement-container');
            const currentAchievements = container.children.length;
            addMapAchievementRow('', currentAchievements);
        }
        
        function addMapAchievementRow(selectedAchievement, index) {
            const container = document.getElementById('map-achievement-container');
            const achievements = currentStory.Achievements || [];
            
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; margin-bottom: 5px; gap: 5px;';
            
            // Create dropdown
            const select = document.createElement('select');
            select.style.cssText = 'flex: 1; padding: 5px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;';
            select.id = 'map-achievement-' + index;
            
            // Add empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- Select Achievement --';
            select.appendChild(emptyOption);
            
            // Add achievements
            achievements.forEach(achievement => {
                const option = document.createElement('option');
                option.value = achievement.key;  // Use key as value
                option.textContent = achievement.name;  // Display name to user
                if (achievement.key === selectedAchievement) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.textContent = '×';
            removeBtn.style.cssText = 'padding: 5px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; font-size: 12px;';
            removeBtn.onclick = () => {
                row.remove();
            };
            
            row.appendChild(select);
            row.appendChild(removeBtn);
            container.appendChild(row);
        }
        
        function getMapAchievements() {
            const container = document.getElementById('map-achievement-container');
            const achievements = [];
            
            Array.from(container.children).forEach(row => {
                const select = row.querySelector('select');
                if (select && select.value) {
                    achievements.push(select.value);
                }
            });
            
            return achievements;
        }
        
        function renderMapEditForm(index) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const region = index >= 0 ? tile.map[index] : {};
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Shape:</label>
                    <select id="edit-map-shape" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="rect" \${region.shape === 'rect' ? 'selected' : ''}>Rectangle</option>
                        <option value="circle" \${region.shape === 'circle' ? 'selected' : ''}>Circle</option>
                        <option value="poly" \${region.shape === 'poly' ? 'selected' : ''}>Polygon</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Coordinates (comma-separated):</label>
                    <input type="text" id="edit-map-coords" value="\${region.coords || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <small>Rect: x1,y1,x2,y2 | Circle: x,y,radius | Poly: x1,y1,x2,y2,x3,y3...</small>
                </div>
                <div class="form-group">
                    <label>Target Tile:</label>
                    <input type="text" id="edit-map-to-tile" value="\${region.to_tile || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Requires (comma-separated):</label>
                    <input type="text" id="edit-map-requires" value="\${Array.isArray(region.requires) ? region.requires.join(', ') : (region.requires || '')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Uses (comma-separated):</label>
                    <input type="text" id="edit-map-uses" value="\${Array.isArray(region.uses) ? region.uses.join(', ') : (region.uses || '')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Item (comma-separated):</label>
                    <input type="text" id="edit-map-item" value="\${Array.isArray(region.item) ? region.item.join(', ') : (region.item || '')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Achievement (comma-separated):</label>
                    <input type="text" id="edit-map-achievement" value="\${Array.isArray(region.achievement) ? region.achievement.join(', ') : (region.achievement || '')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Hint:</label>
                    <select id="edit-map-hint" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="pointer" \${region.hint === 'pointer' || !region.hint ? 'selected' : ''}>Pointer</option>
                        <option value="invisible" \${region.hint === 'invisible' ? 'selected' : ''}>Invisible</option>
                        <option value="reveal" \${region.hint === 'reveal' ? 'selected' : ''}>Reveal</option>
                    </select>
                </div>
            \`;
        }

        // Save functions for each feature type
        function saveIdEdit() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const newId = document.getElementById('edit-id-input').value.trim();
            
            if (newId && newId !== tile.id) {
                const oldId = tile.id;
                tile.id = newId;
                
                // Update all references to this tile ID throughout the story
                updateTileReferences(oldId, newId);
                
                // Update currentTileId to the new ID
                currentTileId = newId;
            }
        }

        function saveTitleEdit() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const value = document.getElementById('edit-title-input').value;
            if (value.trim()) {
                tile.title = value.trim();
            } else {
                delete tile.title;
            }
        }

        function saveTextEdit() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const value = document.getElementById('edit-text-input').value;
            if (value.trim()) {
                tile.text = value.trim();
            } else {
                delete tile.text;
            }
        }

        function savePictureEdit() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const value = document.getElementById('edit-picture-input').value;
            if (value.trim()) {
                tile.picture = value.trim();
            } else {
                delete tile.picture;
            }
        }

        function saveVideoEdit() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const value = document.getElementById('edit-video-input').value;
            if (value.trim()) {
                tile.video = value.trim();
            } else {
                delete tile.video;
            }
        }

        function saveSoundEdit() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const value = document.getElementById('edit-sound-input').value;
            if (value.trim()) {
                tile.sound = value.trim();
            } else {
                delete tile.sound;
            }
        }

        function saveMusicEdit() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const value = document.getElementById('edit-music-input').value;
            if (value.trim()) {
                tile.music = value.trim();
            } else {
                delete tile.music;
            }
        }

        function saveMoodEdit() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const value = document.getElementById('edit-mood-input').value;
            if (value) {
                tile.mood = value;
            } else {
                delete tile.mood;
            }
        }

        function saveChoiceEdit(index) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile.choices) tile.choices = [];
            
            const choiceData = {
                text: document.getElementById('edit-choice-text').value.trim(),
                to_tile: document.getElementById('edit-choice-to-tile').value.trim()
            };
            
            // Handle dropdown-based array fields
            const requires = getChoiceItems('requires');
            if (requires.length > 0) {
                choiceData.requires = requires.length === 1 ? requires[0] : requires;
            }
            
            const uses = getChoiceItems('uses');
            if (uses.length > 0) {
                choiceData.uses = uses.length === 1 ? uses[0] : uses;
            }
            
            const item = getChoiceItems('item');
            if (item.length > 0) {
                choiceData.item = item.length === 1 ? item[0] : item;
            }
            
            const achievements = getChoiceAchievements();
            if (achievements.length > 0) {
                choiceData.achievement = achievements.length === 1 ? achievements[0] : achievements;
            }
            
            const disable = document.getElementById('edit-choice-disable').value;
            if (disable) {
                choiceData.disable = disable;
            }
            
            if (index >= 0) {
                tile.choices[index] = choiceData;
            } else {
                tile.choices.push(choiceData);
            }
        }

        // Temporary function to handle old achievement case - will be removed when we update to new system
        function saveAchievementEdit() {
            // This is the old tile-level achievement system - no longer used
            // Achievements are now managed at story level in the Achievements section
        }

        function saveMapEdit(index) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile.map) tile.map = [];
            
            const regionData = {
                shape: document.getElementById('edit-map-shape').value,
                coords: document.getElementById('edit-map-coords').value.trim(),
                to_tile: document.getElementById('edit-map-to-tile').value.trim(),
                hint: document.getElementById('edit-map-hint').value
            };
            
            // Handle array fields
            const requires = document.getElementById('edit-map-requires').value.trim();
            if (requires) {
                const items = requires.split(',').map(item => item.trim()).filter(item => item);
                if (items.length === 1) {
                    regionData.requires = items[0];
                } else if (items.length > 1) {
                    regionData.requires = items;
                }
            }
            
            const uses = document.getElementById('edit-map-uses').value.trim();
            if (uses) {
                const items = uses.split(',').map(item => item.trim()).filter(item => item);
                if (items.length === 1) {
                    regionData.uses = items[0];
                } else if (items.length > 1) {
                    regionData.uses = items;
                }
            }
            
            const item = document.getElementById('edit-map-item').value.trim();
            if (item) {
                const items = item.split(',').map(item => item.trim()).filter(item => item);
                if (items.length === 1) {
                    regionData.item = items[0];
                } else if (items.length > 1) {
                    regionData.item = items;
                }
            }
            
            const achievement = document.getElementById('edit-map-achievement').value.trim();
            if (achievement) {
                const achievements = achievement.split(',').map(ach => ach.trim()).filter(ach => ach);
                if (achievements.length === 1) {
                    regionData.achievement = achievements[0];
                } else if (achievements.length > 1) {
                    regionData.achievement = achievements;
                }
            }
            
            if (index >= 0) {
                tile.map[index] = regionData;
            } else {
                tile.map.push(regionData);
            }
        }

        function updateEditMediaPreview(mediaType, url) {
            const previewDiv = document.getElementById('edit-' + mediaType + '-preview');
            if (!previewDiv) return;
            
            // Clear existing content
            previewDiv.innerHTML = '';
            
            if (!url || url.trim() === '') {
                return;
            }
            
            switch(mediaType) {
                case 'picture':
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = 'Picture preview';
                    img.style.cssText = 'max-width: 200px; max-height: 150px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px;';
                    img.onerror = function() { this.style.display = 'none'; };
                    previewDiv.appendChild(img);
                    break;
                    
                case 'video':
                    const video = document.createElement('video');
                    video.controls = true;
                    video.style.cssText = 'max-width: 200px; max-height: 150px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px;';
                    const source = document.createElement('source');
                    source.src = url;
                    source.type = 'video/mp4';
                    video.appendChild(source);
                    previewDiv.appendChild(video);
                    break;
                    
                case 'sound':
                case 'music':
                    const audioDiv = document.createElement('div');
                    audioDiv.style.marginTop = '10px';
                    const audio = document.createElement('audio');
                    audio.preload = 'metadata';
                    const audioSource = document.createElement('source');
                    audioSource.src = url;
                    audioSource.type = 'audio/mpeg';
                    audio.appendChild(audioSource);
                    const button = document.createElement('button');
                    button.className = 'btn btn-primary';
                    button.textContent = '▶ Play';
                    button.style.marginLeft = '10px';
                    button.onclick = function() { toggleAudio(audio, this); };
                    audioDiv.appendChild(audio);
                    audioDiv.appendChild(button);
                    previewDiv.appendChild(audioDiv);
                    break;
            }
        }

        function uploadEditMedia(type) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = type === 'picture' ? 'image/*' : type === 'video' ? 'video/*' : 'audio/*';
            
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('file', file);
                formData.append('storyName', currentStory.Name);
                
                fetch('/edit/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Error uploading file: ' + data.error);
                    } else {
                        // Update the input field
                        const inputField = document.getElementById('edit-' + type + '-input');
                        if (inputField) {
                            inputField.value = data.path;
                        }
                        // Update the media preview
                        updateEditMediaPreview(type, data.path);
                        alert('File uploaded successfully!');
                    }
                })
                .catch(error => {
                    alert('Error uploading file: ' + error);
                });
            };
            
            input.click();
        }

        function renderMetadataEditForm() {
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Story Name:</label>
                    <input type="text" id="edit-metadata-name" value="\${currentStory.Name || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea id="edit-metadata-description" style="width: 100%; min-height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">\${currentStory.Description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Published:</label>
                    <select id="edit-metadata-published" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="no" \${currentStory.published === 'no' ? 'selected' : ''}>No</option>
                        <option value="yes" \${currentStory.published === 'yes' ? 'selected' : ''}>Yes</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Creator (read-only):</label>
                    <input type="text" value="\${currentStory.creator || ''}" readonly style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;">
                </div>
            \`;
        }

        function renderStuffEditForm(index) {
            const item = index >= 0 ? currentStory.Stuff[index] : {};
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Key (unique identifier):</label>
                    <input type="text" id="edit-stuff-key" value="\${item.key || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="edit-stuff-name" value="\${item.name || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea id="edit-stuff-description" style="width: 100%; min-height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">\${item.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Unlock Code (optional):</label>
                    <input type="text" id="edit-stuff-code" value="\${item.code || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            \`;
        }

        function renderCreditsEditForm() {
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Credits (HTML supported):</label>
                    <textarea id="edit-credits-content" style="width: 100%; min-height: 200px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">\${currentStory.Credits || ''}</textarea>
                </div>
            \`;
        }

        function renderAchievementsEditForm(index) {
            const achievement = index >= 0 ? currentStory.Achievements[index] : {};
            const form = document.getElementById('edit-form');
            form.innerHTML = \`
                <div class="form-group">
                    <label>Key (unique identifier):</label>
                    <input type="text" id="edit-achievement-key" value="\${achievement.key || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="edit-achievement-name" value="\${achievement.name || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea id="edit-achievement-description" style="width: 100%; min-height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">\${achievement.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Trophy:</label>
                    <select id="edit-achievement-trophy" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="bronze" \${achievement.trophy === 'bronze' ? 'selected' : ''}>Bronze</option>
                        <option value="silver" \${achievement.trophy === 'silver' ? 'selected' : ''}>Silver</option>
                        <option value="gold" \${achievement.trophy === 'gold' ? 'selected' : ''}>Gold</option>
                    </select>
                </div>
            \`;
        }

        function saveMetadataEdit() {
            currentStory.Name = document.getElementById('edit-metadata-name').value.trim() || 'Untitled Story';
            currentStory.Description = document.getElementById('edit-metadata-description').value.trim();
            currentStory.published = document.getElementById('edit-metadata-published').value;
        }

        function saveStuffEdit(index) {
            if (!currentStory.Stuff) currentStory.Stuff = [];
            
            const itemData = {
                key: document.getElementById('edit-stuff-key').value.trim(),
                name: document.getElementById('edit-stuff-name').value.trim(),
                description: document.getElementById('edit-stuff-description').value.trim()
            };
            
            const code = document.getElementById('edit-stuff-code').value.trim();
            if (code) {
                itemData.code = code;
            }
            
            if (index >= 0) {
                currentStory.Stuff[index] = itemData;
            } else {
                currentStory.Stuff.push(itemData);
            }
            
            // Immediately refresh stuff view if we're in stuff mode
            if (currentView === 'stuff') {
                setTimeout(() => renderStuffPreview(), 100);
            }
        }

        function saveCreditsEdit() {
            currentStory.Credits = document.getElementById('edit-credits-content').value.trim();
        }

        function saveAchievementsEdit(index) {
            if (!currentStory.Achievements) currentStory.Achievements = [];
            
            const achievementData = {
                key: document.getElementById('edit-achievement-key').value.trim(),
                name: document.getElementById('edit-achievement-name').value.trim(),
                description: document.getElementById('edit-achievement-description').value.trim(),
                trophy: document.getElementById('edit-achievement-trophy').value
            };
            
            if (index >= 0) {
                currentStory.Achievements[index] = achievementData;
            } else {
                currentStory.Achievements.push(achievementData);
            }
            
            // Mark story as unsaved
            markUnsaved();
            
            // Immediately refresh achievements view if we're in achievements mode
            if (currentView === 'achievements') {
                setTimeout(() => renderAchievementsPreview(), 100);
            }
        }

        function removeMedia(mediaType) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile) return;
            
            // Confirm removal
            if (confirm(\`Are you sure you want to remove the \${mediaType}?\`)) {
                delete tile[mediaType];
                
                // Refresh displays
                renderActionButtons();
                renderTilePreview();
                markUnsaved();
            }
        }

        function removeFeature(featureType) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile) return;
            
            // Confirm removal
            if (confirm(\`Are you sure you want to remove the \${featureType}?\`)) {
                delete tile[featureType];
                
                // Refresh displays
                renderActionButtons();
                renderTilePreview();
                markUnsaved();
            }
        }

        // Interactive Map Creation (similar to image-map.net)
        let mapCreationState = {
            isActive: false,
            currentShape: 'rect',
            points: [],
            tempElements: []
        };

        function startInteractiveMapCreation() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile || !tile.picture) return;
            
            // Switch to interactive map creation mode
            mapCreationState.isActive = true;
            mapCreationState.points = [];
            mapCreationState.tempElements = [];
            
            // Show the interactive map editor overlay
            const overlay = document.getElementById('edit-overlay');
            const title = document.getElementById('edit-title');
            const form = document.getElementById('edit-form');
            
            overlay.style.display = 'block';
            title.textContent = 'Create Map Region';
            
            form.innerHTML = \`
                <div style="display: grid; grid-template-columns: 1fr 300px; gap: 20px; height: 70vh;">
                    <!-- Left column: Image and controls -->
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Shape:</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <select id="map-shape-selector" onchange="changeMapShape(this.value)" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; flex: 1;">
                                    <option value="rect">Rectangle</option>
                                    <option value="circle">Circle</option>
                                    <option value="poly">Polygon</option>
                                </select>
                                <button type="button" onclick="clearMapCreation()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear</button>
                            </div>
                        </div>
                        
                        <div style="flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: auto;">
                            <div id="interactive-map-container" style="position: relative; display: inline-block; border: 2px solid #007bff; border-radius: 4px; margin: 0 auto;">
                                <img id="interactive-map-image" src="\${tile.picture}" style="width: 40vw; height: auto; border-radius: 4px; cursor: crosshair; display: block;" onclick="handleMapClick(event)">
                                <svg id="interactive-map-overlay" style="position: absolute; top: 0; left: 0; pointer-events: none; z-index: 10;"></svg>
                            </div>
                        </div>
                        
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #495057;">Coordinates:</label>
                            <div id="map-coordinates-display" style="font-family: monospace; font-size: 12px; color: #6c757d; min-height: 20px;">
                                Click on the image to start creating the region...
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right column: Form fields -->
                    <div style="display: flex; flex-direction: column; gap: 15px; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px solid #007bff;">
                        <div style="padding: 15px; background: #e3f2fd; border-radius: 4px; border-left: 4px solid #2196f3;">
                            <p style="margin: 0 0 10px 0; color: #1565c0; font-size: 14px; font-weight: bold;">
                                Instructions:
                            </p>
                            <ul style="margin: 0; padding-left: 20px; color: #1565c0; font-size: 13px;">
                                <li><strong>Rectangle:</strong> Click two opposite corners</li>
                                <li><strong>Circle:</strong> Click center, then click edge</li>
                                <li><strong>Polygon:</strong> Click multiple points, then click "Save"</li>
                            </ul>
                        </div>
                        
                        <div style="padding: 15px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #856404; font-size: 16px;">Target Tile ID:</label>
                            <input type="text" id="map-target-tile" placeholder="Enter tile ID (e.g., '2', 'boss-fight')" style="width: 100%; padding: 12px; border: 3px solid #007bff; border-radius: 6px; font-size: 16px; background: #fff; box-shadow: 0 2px 4px rgba(0,123,255,0.2);">
                            <small style="color: #856404; font-size: 12px; margin-top: 8px; display: block; font-weight: bold;">⚠️ REQUIRED: This is the tile the player will go to when they click this region</small>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #495057;">Hint Behavior:</label>
                            <select id="map-hint-selector" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                                <option value="pointer">Pointer (cursor changes to hand)</option>
                                <option value="invisible">Invisible (no visual indication)</option>
                                <option value="reveal">Reveal (always highlighted)</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #495057;">Requires:</label>
                            <div id="map-requires-container" style="margin-bottom: 10px;">
                                <!-- Requires items will be populated by JavaScript -->
                            </div>
                            <button type="button" onclick="addMapItem('requires')" style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 12px;">Add Required Item</button>
                            <small style="display: block; margin-top: 5px; color: #666; font-size: 11px;">Items that must be in inventory for this region to be clickable. Create items in the Stuff section first.</small>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #495057;">Uses:</label>
                            <div id="map-uses-container" style="margin-bottom: 10px;">
                                <!-- Uses items will be populated by JavaScript -->
                            </div>
                            <button type="button" onclick="addMapItem('uses')" style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 12px;">Add Used Item</button>
                            <small style="display: block; margin-top: 5px; color: #666; font-size: 11px;">Items that will be consumed when this region is clicked. Create items in the Stuff section first.</small>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #495057;">Item:</label>
                            <div id="map-item-container" style="margin-bottom: 10px;">
                                <!-- Item rewards will be populated by JavaScript -->
                            </div>
                            <button type="button" onclick="addMapItem('item')" style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 12px;">Add Reward Item</button>
                            <small style="display: block; margin-top: 5px; color: #666; font-size: 11px;">Items that will be added to inventory when this region is clicked. Create items in the Stuff section first.</small>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #495057;">Achievement:</label>
                            <div id="map-achievement-container" style="margin-bottom: 10px;">
                                <!-- Achievement rewards will be populated by JavaScript -->
                            </div>
                            <button type="button" onclick="addMapAchievement()" style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 12px;">Add Achievement</button>
                            <small style="display: block; margin-top: 5px; color: #666; font-size: 11px;">Achievements that will be unlocked when this region is clicked. Create achievements in the Achievements section first.</small>
                        </div>
                    </div>
                </div>
            \`;
            
            // Initialize the interactive map
            setTimeout(() => {
                initInteractiveMap();
            }, 100);
        }

        function initInteractiveMap() {
            const img = document.getElementById('interactive-map-image');
            const overlay = document.getElementById('interactive-map-overlay');
            
            if (!img || !overlay) return;
            
            function updateOverlaySize() {
                // Wait for image to be fully rendered
                setTimeout(() => {
                    const imgRect = img.getBoundingClientRect();
                    const containerRect = img.parentElement.getBoundingClientRect();
                    
                    // Set overlay to exact image dimensions and position
                    overlay.setAttribute('width', img.offsetWidth);
                    overlay.setAttribute('height', img.offsetHeight);
                    
                    // Ensure overlay is positioned exactly over the image
                    overlay.style.width = img.offsetWidth + 'px';
                    overlay.style.height = img.offsetHeight + 'px';
                    overlay.style.left = '0px';
                    overlay.style.top = '0px';
                    
                    renderExistingMapRegionsInEditor();
                }, 50);
            }
            
            // Set overlay size when image loads
            img.onload = updateOverlaySize;
            
            // If image is already loaded
            if (img.complete) {
                updateOverlaySize();
            }
        }

        function renderExistingMapRegionsInEditor() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const overlay = document.getElementById('interactive-map-overlay');
            
            if (!tile || !tile.map || !overlay) return;
            
            // Clear existing regions (but not temp elements)
            const existingRegions = overlay.querySelectorAll('.existing-region');
            existingRegions.forEach(region => region.remove());
            
            // Draw existing map regions in reveal mode
            tile.map.forEach((region, index) => {
                drawExistingMapRegion(region, index);
            });
        }

        function drawExistingMapRegion(region, index) {
            const overlay = document.getElementById('interactive-map-overlay');
            const img = document.getElementById('interactive-map-image');
            if (!overlay || !img) return;
            
            let element;
            const coords = region.coords.split(',').map(c => parseInt(c));
            
            // Convert natural coordinates to display coordinates (same as play mode adjustCoords)
            const ratio = img.offsetHeight / img.naturalHeight;
            const displayCoords = coords.map(coord => coord * ratio);
            
            switch(region.shape) {
                case 'rect':
                    element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    element.setAttribute('x', displayCoords[0]);
                    element.setAttribute('y', displayCoords[1]);
                    element.setAttribute('width', displayCoords[2] - displayCoords[0]);
                    element.setAttribute('height', displayCoords[3] - displayCoords[1]);
                    break;
                    
                case 'circle':
                    element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    element.setAttribute('cx', displayCoords[0]);
                    element.setAttribute('cy', displayCoords[1]);
                    element.setAttribute('r', displayCoords[2]);
                    break;
                    
                case 'poly':
                    element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                    const points = [];
                    for (let i = 0; i < displayCoords.length; i += 2) {
                        points.push(displayCoords[i] + ',' + displayCoords[i + 1]);
                    }
                    element.setAttribute('points', points.join(' '));
                    break;
            }
            
            if (element) {
                element.className = 'existing-region';
                element.setAttribute('fill', 'rgba(0, 0, 255, 0.2)');
                element.setAttribute('stroke', '#0000ff');
                element.setAttribute('stroke-width', '2');
                element.setAttribute('stroke-dasharray', '5,5');
                overlay.appendChild(element);
            }
        }

        function handleMapClick(event) {
            if (!mapCreationState.isActive) return;
            
            // Get coordinates relative to the image element itself
            const img = document.getElementById('interactive-map-image');
            const rect = img.getBoundingClientRect();
            
            // Calculate coordinates relative to the displayed image
            const displayX = Math.round(event.clientX - rect.left);
            const displayY = Math.round(event.clientY - rect.top);
            
            // Ensure coordinates are within image bounds
            if (displayX < 0 || displayY < 0 || displayX > img.offsetWidth || displayY > img.offsetHeight) {
                return; // Click outside image bounds
            }
            
            // Convert to natural image coordinates (same as play mode logic)
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            const displayWidth = img.offsetWidth;
            const displayHeight = img.offsetHeight;
            
            // Calculate the scaling ratio (reverse of play mode adjustCoords)
            const ratio = naturalHeight / displayHeight;
            
            // Store coordinates at natural image size (like play mode origcoords)
            const naturalX = Math.round(displayX * ratio);
            const naturalY = Math.round(displayY * ratio);
            
            mapCreationState.points.push({x: naturalX, y: naturalY});
            
            // Update coordinates display
            updateCoordinatesDisplay();
            
            // Draw temp elements using display coordinates for visual feedback
            switch(mapCreationState.currentShape) {
                case 'rect':
                    if (mapCreationState.points.length === 1) {
                        drawTempPoint(displayX, displayY);
                    } else if (mapCreationState.points.length === 2) {
                        clearTempElements();
                        drawTempRectangle();
                    }
                    break;
                    
                case 'circle':
                    if (mapCreationState.points.length === 1) {
                        drawTempPoint(displayX, displayY);
                    } else if (mapCreationState.points.length === 2) {
                        clearTempElements();
                        drawTempCircle();
                    }
                    break;
                    
                case 'poly':
                    drawTempPoint(displayX, displayY);
                    if (mapCreationState.points.length > 2) {
                        drawTempPolygon();
                    }
                    break;
            }
        }

        function drawTempPoint(x, y) {
            const overlay = document.getElementById('interactive-map-overlay');
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 4);
            circle.setAttribute('fill', '#ff0000');
            circle.setAttribute('stroke', '#000');
            circle.setAttribute('stroke-width', 1);
            circle.className = 'temp-element';
            overlay.appendChild(circle);
            mapCreationState.tempElements.push(circle);
        }

        function drawTempRectangle() {
            const points = mapCreationState.points;
            const img = document.getElementById('interactive-map-image');
            
            // Convert natural coordinates back to display coordinates for visual feedback
            const ratio = img.offsetHeight / img.naturalHeight;
            
            const x1Display = Math.min(points[0].x * ratio, points[1].x * ratio);
            const y1Display = Math.min(points[0].y * ratio, points[1].y * ratio);
            const x2Display = Math.max(points[0].x * ratio, points[1].x * ratio);
            const y2Display = Math.max(points[0].y * ratio, points[1].y * ratio);
            
            const overlay = document.getElementById('interactive-map-overlay');
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x1Display);
            rect.setAttribute('y', y1Display);
            rect.setAttribute('width', x2Display - x1Display);
            rect.setAttribute('height', y2Display - y1Display);
            rect.setAttribute('fill', 'rgba(255, 0, 0, 0.3)');
            rect.setAttribute('stroke', '#ff0000');
            rect.setAttribute('stroke-width', 2);
            rect.className = 'temp-element';
            overlay.appendChild(rect);
            mapCreationState.tempElements.push(rect);
        }

        function drawTempCircle() {
            const points = mapCreationState.points;
            const img = document.getElementById('interactive-map-image');
            
            // Convert natural coordinates back to display coordinates for visual feedback
            const ratio = img.offsetHeight / img.naturalHeight;
            
            const centerXDisplay = points[0].x * ratio;
            const centerYDisplay = points[0].y * ratio;
            const radiusDisplay = Math.round(Math.sqrt(
                Math.pow((points[1].x - points[0].x) * ratio, 2) + Math.pow((points[1].y - points[0].y) * ratio, 2)
            ));
            
            const overlay = document.getElementById('interactive-map-overlay');
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', centerXDisplay);
            circle.setAttribute('cy', centerYDisplay);
            circle.setAttribute('r', radiusDisplay);
            circle.setAttribute('fill', 'rgba(255, 0, 0, 0.3)');
            circle.setAttribute('stroke', '#ff0000');
            circle.setAttribute('stroke-width', 2);
            circle.className = 'temp-element';
            overlay.appendChild(circle);
            mapCreationState.tempElements.push(circle);
        }

        function drawTempPolygon() {
            const overlay = document.getElementById('interactive-map-overlay');
            const img = document.getElementById('interactive-map-image');
            
            // Remove existing temp polygon
            const existingPoly = overlay.querySelector('.temp-polygon');
            if (existingPoly) {
                existingPoly.remove();
                mapCreationState.tempElements = mapCreationState.tempElements.filter(el => el !== existingPoly);
            }
            
            // Convert natural coordinates back to display coordinates for visual feedback
            const ratio = img.offsetHeight / img.naturalHeight;
            const points = mapCreationState.points.map(p => (p.x * ratio) + ',' + (p.y * ratio)).join(' ');
            
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', points);
            polygon.setAttribute('fill', 'rgba(255, 0, 0, 0.3)');
            polygon.setAttribute('stroke', '#ff0000');
            polygon.setAttribute('stroke-width', 2);
            polygon.className = 'temp-element temp-polygon';
            overlay.appendChild(polygon);
            mapCreationState.tempElements.push(polygon);
        }

        function updateCoordinatesDisplay() {
            const display = document.getElementById('map-coordinates-display');
            if (!display) return;
            
            const points = mapCreationState.points;
            let coordsText = '';
            
            // Add debug info about image dimensions
            const img = document.getElementById('interactive-map-image');
            const debugInfo = img ? ' [Natural: ' + img.naturalWidth + 'x' + img.naturalHeight + ', Display: ' + img.offsetWidth + 'x' + img.offsetHeight + ']' : '';
            
            switch(mapCreationState.currentShape) {
                case 'rect':
                    if (points.length === 1) {
                        coordsText = 'First corner: ' + points[0].x + ',' + points[0].y + debugInfo;
                    } else if (points.length === 2) {
                        const x1 = Math.min(points[0].x, points[1].x);
                        const y1 = Math.min(points[0].y, points[1].y);
                        const x2 = Math.max(points[0].x, points[1].x);
                        const y2 = Math.max(points[0].y, points[1].y);
                        coordsText = 'Rectangle: ' + x1 + ',' + y1 + ',' + x2 + ',' + y2 + debugInfo;
                    }
                    break;
                    
                case 'circle':
                    if (points.length === 1) {
                        coordsText = 'Center: ' + points[0].x + ',' + points[0].y + debugInfo;
                    } else if (points.length === 2) {
                        const radius = Math.round(Math.sqrt(
                            Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)
                        ));
                        coordsText = 'Circle: ' + points[0].x + ',' + points[0].y + ',' + radius + debugInfo;
                    }
                    break;
                    
                case 'poly':
                    coordsText = 'Polygon: ' + points.map(p => p.x + ',' + p.y).join(',') + debugInfo;
                    if (points.length >= 3) {
                        coordsText += ' (Click "Save" to finish)';
                    }
                    break;
            }
            
            display.textContent = coordsText || ('Click on the image to start creating the region...' + debugInfo);
        }

        function changeMapShape(newShape) {
            mapCreationState.currentShape = newShape;
            clearMapCreation();
        }

        function clearMapCreation() {
            mapCreationState.points = [];
            clearTempElements();
            updateCoordinatesDisplay();
        }

        function clearTempElements() {
            mapCreationState.tempElements.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            mapCreationState.tempElements = [];
        }

        // Override the saveCurrentEdit function to handle interactive map creation
        function saveCurrentEdit() {
            if (mapCreationState.isActive) {
                saveInteractiveMapRegion();
                return;
            }
            
            // Original saveCurrentEdit logic
            const feature = currentEditFeature.feature;
            const index = currentEditFeature.index;
            
            switch(feature) {
                case 'id':
                    saveIdEdit();
                    break;
                case 'title':
                    saveTitleEdit();
                    break;
                case 'text':
                    saveTextEdit();
                    break;
                case 'picture':
                    savePictureEdit();
                    break;
                case 'video':
                    saveVideoEdit();
                    break;
                case 'sound':
                    saveSoundEdit();
                    break;
                case 'music':
                    saveMusicEdit();
                    break;
                case 'mood':
                    saveMoodEdit();
                    break;
                case 'achievement':
                    saveAchievementEdit();
                    break;
                case 'choice':
                    saveChoiceEdit(index);
                    break;
                case 'map':
                    saveMapEdit(index);
                    break;
                case 'metadata':
                    saveMetadataEdit();
                    break;
                case 'stuff':
                    saveStuffEdit(index);
                    break;
                case 'achievements':
                    saveAchievementsEdit(index);
                    break;
                case 'credits':
                    saveCreditsEdit();
                    break;
            }
            
            // Return to preview mode
            cancelCurrentEdit();
            
            // Refresh displays
            renderActionButtons();
            renderTilePreview();
            renderTileList();
            markUnsaved();
        }

        function saveInteractiveMapRegion() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            const targetTile = document.getElementById('map-target-tile').value.trim();
            const hint = document.getElementById('map-hint-selector').value;
            
            if (!targetTile) {
                alert('Please enter a target tile ID');
                return;
            }
            
            let coords = '';
            const points = mapCreationState.points;
            
            switch(mapCreationState.currentShape) {
                case 'rect':
                    if (points.length < 2) {
                        alert('Please click two corners to create a rectangle');
                        return;
                    }
                    const x1 = Math.min(points[0].x, points[1].x);
                    const y1 = Math.min(points[0].y, points[1].y);
                    const x2 = Math.max(points[0].x, points[1].x);
                    const y2 = Math.max(points[0].y, points[1].y);
                    coords = \`\${x1},\${y1},\${x2},\${y2}\`;
                    break;
                    
                case 'circle':
                    if (points.length < 2) {
                        alert('Please click center and edge to create a circle');
                        return;
                    }
                    const radius = Math.round(Math.sqrt(
                        Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)
                    ));
                    coords = \`\${points[0].x},\${points[0].y},\${radius}\`;
                    break;
                    
                case 'poly':
                    if (points.length < 3) {
                        alert('Please click at least 3 points to create a polygon');
                        return;
                    }
                    coords = points.map(p => \`\${p.x},\${p.y}\`).join(',');
                    break;
            }
            
            // Create the map region
            if (!tile.map) tile.map = [];
            
            const regionData = {
                shape: mapCreationState.currentShape,
                coords: coords,
                to_tile: targetTile,
                hint: hint
            };
            
            // Handle dropdown-based array fields
            const requires = getMapItems('requires');
            if (requires.length > 0) {
                regionData.requires = requires.length === 1 ? requires[0] : requires;
            }
            
            const uses = getMapItems('uses');
            if (uses.length > 0) {
                regionData.uses = uses.length === 1 ? uses[0] : uses;
            }
            
            const item = getMapItems('item');
            if (item.length > 0) {
                regionData.item = item.length === 1 ? item[0] : item;
            }
            
            const achievements = getMapAchievements();
            if (achievements.length > 0) {
                regionData.achievement = achievements.length === 1 ? achievements[0] : achievements;
            }
            
            tile.map.push(regionData);
            
            // Reset map creation state
            mapCreationState.isActive = false;
            clearTempElements();
            
            // Return to preview mode
            cancelCurrentEdit();
            
            // Refresh displays
            renderActionButtons();
            renderTilePreview();
            renderTileList();
            markUnsaved();
        }

        // Test function to verify coordinate consistency between edit and play modes
        function testCoordinateConsistency() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile || !tile.map || tile.map.length === 0) {
                console.log('No map regions to test');
                return;
            }
            
            const editImg = document.getElementById('interactive-map-image');
            const previewImg = document.getElementById('preview-image');
            
            if (!editImg || !previewImg) {
                console.log('Images not found for testing');
                return;
            }
            
            console.log('=== COORDINATE CONSISTENCY TEST ===');
            console.log('Edit mode image:', editImg.offsetWidth + 'x' + editImg.offsetHeight, 'Natural:', editImg.naturalWidth + 'x' + editImg.naturalHeight);
            console.log('Preview mode image:', previewImg.offsetWidth + 'x' + previewImg.offsetHeight, 'Natural:', previewImg.naturalWidth + 'x' + previewImg.naturalHeight);
            
            // Test each map region
            tile.map.forEach((region, index) => {
                console.log('Region ' + (index + 1) + ' (' + region.shape + '):');
                console.log('  Stored coords (natural):', region.coords);
                
                // Calculate what play mode would display
                const coords = region.coords.split(',').map(c => parseInt(c));
                const playModeRatio = 0.4 * window.innerWidth / editImg.naturalWidth; // 40vw / natural width
                const playModeCoords = coords.map(coord => coord * playModeRatio);
                console.log('  Play mode coords (40vw):', playModeCoords.join(','));
                
                // Calculate what edit mode displays
                const editModeRatio = editImg.offsetHeight / editImg.naturalHeight;
                const editModeCoords = coords.map(coord => coord * editModeRatio);
                console.log('  Edit mode coords (display):', editModeCoords.join(','));
                
                // Calculate what preview mode displays
                const previewModeRatio = previewImg.offsetHeight / previewImg.naturalHeight;
                const previewModeCoords = coords.map(coord => coord * previewModeRatio);
                console.log('  Preview mode coords (display):', previewModeCoords.join(','));
                
                // Check if ratios match (they should be the same since all use 40vw)
                const ratiosMatch = Math.abs(editModeRatio - previewModeRatio) < 0.01;
                console.log('  Ratios match:', ratiosMatch, '(edit:', editModeRatio.toFixed(3), 'preview:', previewModeRatio.toFixed(3), ')');
            });
            
            console.log('=== END TEST ===');
        }
        
        // Add test button to the interface (for debugging)
        window.testCoordinateConsistency = testCoordinateConsistency;
        function cancelCurrentEdit() {
            if (mapCreationState.isActive) {
                mapCreationState.isActive = false;
                clearTempElements();
            }
            
            currentEditMode = 'preview';
            currentEditFeature = null;
            document.getElementById('edit-overlay').style.display = 'none';
        }

        function renderChoices() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile) return;
            
            const choicesList = document.getElementById('choices-list');
            choicesList.innerHTML = '';
            
            if (!tile.choices) tile.choices = [];
            
            tile.choices.forEach((choice, index) => {
                const choiceDiv = document.createElement('div');
                choiceDiv.className = 'choice-item';
                choiceDiv.innerHTML = \`
                    <div class="choice-header">
                        <strong>Choice \${index + 1}</strong>
                        <button class="btn btn-danger" onclick="removeChoice(\${index})">Remove</button>
                    </div>
                    <div class="form-group">
                        <label>Choice Text:</label>
                        <input type="text" value="\${choice.text || ''}" onchange="updateChoice(\${index}, 'text', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Target Tile:</label>
                        <input type="text" value="\${choice.to_tile || ''}" onchange="updateChoice(\${index}, 'to_tile', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Requires (comma-separated):</label>
                        <input type="text" value="\${Array.isArray(choice.requires) ? choice.requires.join(', ') : (choice.requires || '')}" onchange="updateChoiceArray(\${index}, 'requires', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Uses (comma-separated):</label>
                        <input type="text" value="\${Array.isArray(choice.uses) ? choice.uses.join(', ') : (choice.uses || '')}" onchange="updateChoiceArray(\${index}, 'uses', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Item (comma-separated):</label>
                        <input type="text" value="\${Array.isArray(choice.item) ? choice.item.join(', ') : (choice.item || '')}" onchange="updateChoiceArray(\${index}, 'item', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Disable:</label>
                        <select onchange="updateChoice(\${index}, 'disable', this.value)">
                            <option value="">Default (grey)</option>
                            <option value="grey" \${choice.disable === 'grey' ? 'selected' : ''}>Grey</option>
                            <option value="invisible" \${choice.disable === 'invisible' ? 'selected' : ''}>Invisible</option>
                        </select>
                    </div>
                \`;
                choicesList.appendChild(choiceDiv);
            });
        }

        function renderImageMap() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile) return;
            
            const mapList = document.getElementById('map-list');
            mapList.innerHTML = '';
            
            if (!tile.map) tile.map = [];
            
            tile.map.forEach((region, index) => {
                const regionDiv = document.createElement('div');
                regionDiv.className = 'choice-item';
                regionDiv.innerHTML = \`
                    <div class="choice-header">
                        <strong>Map Region \${index + 1}</strong>
                        <button class="btn btn-danger" onclick="removeMapRegion(\${index})">Remove</button>
                    </div>
                    <div class="form-group">
                        <label>Shape:</label>
                        <select onchange="updateMapRegion(\${index}, 'shape', this.value)">
                            <option value="rect" \${region.shape === 'rect' ? 'selected' : ''}>Rectangle</option>
                            <option value="circle" \${region.shape === 'circle' ? 'selected' : ''}>Circle</option>
                            <option value="poly" \${region.shape === 'poly' ? 'selected' : ''}>Polygon</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Coordinates (comma-separated):</label>
                        <input type="text" value="\${region.coords || ''}" onchange="updateMapRegion(\${index}, 'coords', this.value)">
                        <small>Rect: x1,y1,x2,y2 | Circle: x,y,radius | Poly: x1,y1,x2,y2,x3,y3...</small>
                    </div>
                    <div class="form-group">
                        <label>Target Tile:</label>
                        <input type="text" value="\${region.to_tile || ''}" onchange="updateMapRegion(\${index}, 'to_tile', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Requires (comma-separated):</label>
                        <input type="text" value="\${Array.isArray(region.requires) ? region.requires.join(', ') : (region.requires || '')}" onchange="updateMapRegionArray(\${index}, 'requires', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Uses (comma-separated):</label>
                        <input type="text" value="\${Array.isArray(region.uses) ? region.uses.join(', ') : (region.uses || '')}" onchange="updateMapRegionArray(\${index}, 'uses', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Item (comma-separated):</label>
                        <input type="text" value="\${Array.isArray(region.item) ? region.item.join(', ') : (region.item || '')}" onchange="updateMapRegionArray(\${index}, 'item', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Hint:</label>
                        <select onchange="updateMapRegion(\${index}, 'hint', this.value)">
                            <option value="pointer" \${region.hint === 'pointer' || !region.hint ? 'selected' : ''}>Pointer</option>
                            <option value="invisible" \${region.hint === 'invisible' ? 'selected' : ''}>Invisible</option>
                            <option value="reveal" \${region.hint === 'reveal' ? 'selected' : ''}>Reveal</option>
                        </select>
                    </div>
                \`;
                mapList.appendChild(regionDiv);
            });
        }

        // Preview functions for metadata, stuff, and credits
        function renderMetadataPreview() {
            const previewContent = document.getElementById('preview-content');
            previewContent.innerHTML = \`
                <div style="max-width: 600px; margin: 0 auto;">
                    <h2>Story Metadata</h2>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3>\${currentStory.Name || 'Untitled Story'}</h3>
                        <p><strong>Description:</strong> \${currentStory.Description || 'No description'}</p>
                        <p><strong>Published:</strong> \${currentStory.published === 'yes' ? 'Yes' : 'No'}</p>
                        <p><strong>Creator:</strong> \${currentStory.creator || 'Unknown'}</p>
                        <p><strong>Number of Tiles:</strong> \${currentStory.Tiles ? currentStory.Tiles.length : 0}</p>
                    </div>
                    <button class="btn btn-primary" onclick="editFeature('metadata')">Edit Metadata</button>
                </div>
            \`;
        }

        function renderStuffPreview() {
            const previewContent = document.getElementById('preview-content');
            let stuffHTML = '<div style="max-width: 600px; margin: 0 auto;"><h2>Story Items</h2>';
            
            if (currentStory.Stuff && currentStory.Stuff.length > 0) {
                stuffHTML += '<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
                currentStory.Stuff.forEach((item, index) => {
                    stuffHTML += \`
                        <div style="border-bottom: 1px solid #ddd; padding: 10px 0; margin-bottom: 10px;">
                            <h4>\${item.name || 'Unnamed Item'}</h4>
                            <p><strong>Key:</strong> \${item.key || 'No key'}</p>
                            <p><strong>Description:</strong> \${item.description || 'No description'}</p>
                            \${item.code ? '<p><strong>Unlock Code:</strong> ' + item.code + '</p>' : ''}
                            <button class="btn btn-secondary" onclick="editFeature('stuff', \${index})">Edit</button>
                        </div>
                    \`;
                });
                stuffHTML += '</div>';
            } else {
                stuffHTML += '<p>No items defined.</p>';
            }
            
            stuffHTML += '<button class="btn btn-primary" onclick="editFeature(\\'stuff\\', -1)">Add Item</button></div>';
            previewContent.innerHTML = stuffHTML;
        }

        function renderCreditsPreview() {
            const previewContent = document.getElementById('preview-content');
            previewContent.innerHTML = \`
                <div style="max-width: 600px; margin: 0 auto;">
                    <h2>Story Credits</h2>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; min-height: 100px;">
                        \${currentStory.Credits || '<em>No credits defined</em>'}
                    </div>
                    <button class="btn btn-primary" onclick="editFeature('credits')">Edit Credits</button>
                </div>
            \`;
        }

        function renderAchievementsPreview() {
            const previewContent = document.getElementById('preview-content');
            let achievementsHTML = '<div style="max-width: 600px; margin: 0 auto;"><h2>Story Achievements</h2>';
            
            if (currentStory.Achievements && currentStory.Achievements.length > 0) {
                achievementsHTML += '<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
                currentStory.Achievements.forEach((achievement, index) => {
                    const trophyColors = {
                        'bronze': '#CD7F32',
                        'silver': '#C0C0C0', 
                        'gold': '#FFD700'
                    };
                    const trophyColor = trophyColors[achievement.trophy] || '#666';
                    achievementsHTML += \`
                        <div style="border-bottom: 1px solid #ddd; padding: 10px 0; margin-bottom: 10px; display: flex; align-items: center; gap: 15px;">
                            <div style="width: 40px; height: 40px; background: \${trophyColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                                \${achievement.trophy ? achievement.trophy.toUpperCase().substring(0,3) : 'ACH'}
                            </div>
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 5px 0;">\${achievement.name || 'Unnamed Achievement'}</h4>
                                <p style="margin: 0; color: #666;"><strong>Key:</strong> \${achievement.key || 'No key'}</p>
                                <p style="margin: 5px 0 0 0; color: #666;">\${achievement.description || 'No description'}</p>
                            </div>
                            <button class="btn btn-secondary" onclick="editFeature('achievements', \${index})">Edit</button>
                        </div>
                    \`;
                });
                achievementsHTML += '</div>';
            } else {
                achievementsHTML += '<p>No achievements defined.</p>';
            }
            
            achievementsHTML += '<button class="btn btn-primary" onclick="editFeature(\\'achievements\\', -1)">Add Achievement</button></div>';
            previewContent.innerHTML = achievementsHTML;
        }

        function renderMetadataEditor() {
            const content = document.getElementById('editor-content');
            content.innerHTML = \`
                <h3>Story Metadata</h3>
                <div class="form-group">
                    <label>Story Name:</label>
                    <input type="text" value="\${currentStory.Name || ''}" onchange="updateStoryField('Name', this.value)">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea onchange="updateStoryField('Description', this.value)">\${currentStory.Description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Published:</label>
                    <select onchange="updateStoryField('published', this.value)">
                        <option value="no" \${currentStory.published === 'no' ? 'selected' : ''}>No</option>
                        <option value="yes" \${currentStory.published === 'yes' ? 'selected' : ''}>Yes</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Creator (read-only):</label>
                    <input type="text" value="\${currentStory.creator || ''}" readonly>
                </div>
                <div class="form-group">
                    <label>Number of Tiles (calculated):</label>
                    <input type="text" value="\${currentStory.Tiles ? currentStory.Tiles.length : 0}" readonly>
                </div>
            \`;
        }

        function renderStuffEditor() {
            const content = document.getElementById('editor-content');
            content.innerHTML = \`
                <h3>Story Items</h3>
                <div id="stuff-list">
                    <!-- Stuff items will be rendered here -->
                </div>
                <button class="btn btn-primary" onclick="addStuffItem()">Add Item</button>
            \`;
            renderStuffItems();
        }

        function renderStuffItems() {
            const stuffList = document.getElementById('stuff-list');
            if (!stuffList) return;
            
            stuffList.innerHTML = '';
            
            if (!currentStory.Stuff) currentStory.Stuff = [];
            
            currentStory.Stuff.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'choice-item';
                itemDiv.innerHTML = \`
                    <div class="choice-header">
                        <strong>Item \${index + 1}</strong>
                        <button class="btn btn-danger" onclick="removeStuffItem(\${index})">Remove</button>
                    </div>
                    <div class="form-group">
                        <label>Key (unique identifier):</label>
                        <input type="text" value="\${item.key || ''}" onchange="updateStuffItem(\${index}, 'key', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Name:</label>
                        <input type="text" value="\${item.name || ''}" onchange="updateStuffItem(\${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea onchange="updateStuffItem(\${index}, 'description', this.value)">\${item.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Unlock Code (optional):</label>
                        <input type="text" value="\${item.code || ''}" onchange="updateStuffItem(\${index}, 'code', this.value)">
                    </div>
                \`;
                stuffList.appendChild(itemDiv);
            });
        }

        function renderCreditsEditor() {
            const content = document.getElementById('editor-content');
            content.innerHTML = \`
                <h3>Story Credits</h3>
                <div class="form-group">
                    <label>Credits (HTML supported):</label>
                    <textarea style="min-height: 200px;" onchange="updateStoryField('Credits', this.value)">\${currentStory.Credits || ''}</textarea>
                </div>
            \`;
        }

        function updateTileField(field, value) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile) return;
            
            if (field === 'id') {
                // Handle tile ID change - update references
                const oldId = tile.id;
                tile.id = value;
                updateTileReferences(oldId, value);
                renderTileList();
            } else {
                tile[field] = value || undefined;
                if (!value) delete tile[field];
            }
            
            markUnsaved();
        }

        function updateChoice(choiceIndex, field, value) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile || !tile.choices || !tile.choices[choiceIndex]) return;
            
            tile.choices[choiceIndex][field] = value || undefined;
            if (!value) delete tile.choices[choiceIndex][field];
            
            // Re-render tile list if to_tile field changed (affects connections)
            if (field === 'to_tile') {
                renderTileList();
            }
            
            markUnsaved();
        }

        function updateChoiceArray(choiceIndex, field, value) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile || !tile.choices || !tile.choices[choiceIndex]) return;
            
            if (value.trim()) {
                const items = value.split(',').map(item => item.trim()).filter(item => item);
                if (items.length === 1) {
                    tile.choices[choiceIndex][field] = items[0];
                } else if (items.length > 1) {
                    tile.choices[choiceIndex][field] = items;
                } else {
                    delete tile.choices[choiceIndex][field];
                }
            } else {
                delete tile.choices[choiceIndex][field];
            }
            
            markUnsaved();
        }

        function updateStoryField(field, value) {
            currentStory[field] = value || undefined;
            if (!value) delete currentStory[field];
            markUnsaved();
        }

        function updateStuffItem(itemIndex, field, value) {
            if (!currentStory.Stuff || !currentStory.Stuff[itemIndex]) return;
            
            currentStory.Stuff[itemIndex][field] = value || undefined;
            if (!value) delete currentStory.Stuff[itemIndex][field];
            
            markUnsaved();
        }

        function addChoice() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile) return;
            
            if (!tile.choices) tile.choices = [];
            tile.choices.push({
                text: '',
                to_tile: ''
            });
            
            renderChoices();
            renderTileList(); // Update tile list to show new connections
            markUnsaved();
        }

        function removeChoice(index) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile || !tile.choices) return;
            
            tile.choices.splice(index, 1);
            renderActionButtons(); // Update action buttons to reflect removal
            renderTilePreview(); // Update preview to show changes
            renderTileList(); // Update tile list to show removed connections
            markUnsaved();
        }

        function addMapRegion() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile) return;
            
            if (!tile.map) tile.map = [];
            tile.map.push({
                shape: 'rect',
                coords: '',
                to_tile: '',
                hint: 'pointer'
            });
            
            renderImageMap();
            renderTileList(); // Update tile list to show new connections
            markUnsaved();
        }

        function removeMapRegion(index) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile || !tile.map) return;
            
            tile.map.splice(index, 1);
            renderActionButtons(); // Update action buttons to reflect removal
            renderTilePreview(); // Update preview to show changes
            renderTileList(); // Update tile list to show removed connections
            markUnsaved();
        }

        function updateMapRegion(regionIndex, field, value) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile || !tile.map || !tile.map[regionIndex]) return;
            
            tile.map[regionIndex][field] = value || undefined;
            if (!value) delete tile.map[regionIndex][field];
            
            // Re-render tile list if to_tile field changed (affects connections)
            if (field === 'to_tile') {
                renderTileList();
            }
            
            // Re-render visual regions if coords changed
            if (field === 'coords') {
                renderExistingMapRegions();
            }
            
            markUnsaved();
        }

        function updateMapRegionArray(regionIndex, field, value) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile || !tile.map || !tile.map[regionIndex]) return;
            
            if (value.trim()) {
                const items = value.split(',').map(item => item.trim()).filter(item => item);
                if (items.length === 1) {
                    tile.map[regionIndex][field] = items[0];
                } else if (items.length > 1) {
                    tile.map[regionIndex][field] = items;
                } else {
                    delete tile.map[regionIndex][field];
                }
            } else {
                delete tile.map[regionIndex][field];
            }
            
            markUnsaved();
        }

        function updateMediaPreview(mediaType, url) {
            const previewDiv = document.getElementById(mediaType + '-preview');
            if (!previewDiv) return;
            
            // Clear existing content
            previewDiv.innerHTML = '';
            
            if (!url || url.trim() === '') {
                return;
            }
            
            switch(mediaType) {
                case 'picture':
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'image-map-editor';
                    imgContainer.id = 'image-map-container';
                    
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = 'Picture preview';
                    img.style.cssText = 'max-width: 400px; max-height: 300px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px;';
                    img.onerror = function() { this.style.display = 'none'; };
                    img.onload = function() { 
                        initImageMapEditor(); 
                        renderExistingMapRegions();
                    };
                    
                    const overlay = document.createElement('svg');
                    overlay.className = 'image-map-overlay';
                    overlay.id = 'map-overlay';
                    overlay.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none;';
                    
                    imgContainer.appendChild(img);
                    imgContainer.appendChild(overlay);
                    previewDiv.appendChild(imgContainer);
                    
                    // Show map editor controls
                    const controls = document.getElementById('map-editor-controls');
                    if (controls) controls.style.display = 'block';
                    break;
                    
                case 'video':
                    const video = document.createElement('video');
                    video.controls = true;
                    video.style.cssText = 'max-width: 200px; max-height: 150px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px;';
                    const source = document.createElement('source');
                    source.src = url;
                    source.type = 'video/mp4';
                    video.appendChild(source);
                    previewDiv.appendChild(video);
                    break;
                    
                case 'sound':
                    const soundDiv = document.createElement('div');
                    soundDiv.style.marginTop = '10px';
                    const soundAudio = document.createElement('audio');
                    soundAudio.id = 'sound-audio';
                    soundAudio.preload = 'metadata';
                    const soundSource = document.createElement('source');
                    soundSource.src = url;
                    soundSource.type = 'audio/mpeg';
                    soundAudio.appendChild(soundSource);
                    const soundButton = document.createElement('button');
                    soundButton.className = 'btn btn-primary';
                    soundButton.textContent = '▶ Play';
                    soundButton.style.marginLeft = '10px';
                    soundButton.onclick = function() { toggleAudio('sound-audio', this); };
                    soundDiv.appendChild(soundAudio);
                    soundDiv.appendChild(soundButton);
                    previewDiv.appendChild(soundDiv);
                    break;
                    
                case 'music':
                    const musicDiv = document.createElement('div');
                    musicDiv.style.marginTop = '10px';
                    const musicAudio = document.createElement('audio');
                    musicAudio.id = 'music-audio';
                    musicAudio.preload = 'metadata';
                    const musicSource = document.createElement('source');
                    musicSource.src = url;
                    musicSource.type = 'audio/mpeg';
                    musicAudio.appendChild(musicSource);
                    const musicButton = document.createElement('button');
                    musicButton.className = 'btn btn-primary';
                    musicButton.textContent = '▶ Play';
                    musicButton.style.marginLeft = '10px';
                    musicButton.onclick = function() { toggleAudio('music-audio', this); };
                    musicDiv.appendChild(musicAudio);
                    musicDiv.appendChild(musicButton);
                    previewDiv.appendChild(musicDiv);
                    break;
            }
        }

        // Image Map Editor Variables
        let mapEditorState = {
            isCreating: false,
            currentShape: 'rect',
            currentRegion: null,
            points: [],
            editingIndex: -1
        };

        function initImageMapEditor() {
            const container = document.getElementById('image-map-container');
            const img = container ? container.querySelector('img') : null;
            const overlay = document.getElementById('map-overlay');
            
            if (!img || !overlay) return;
            
            // Set overlay size to match image
            overlay.setAttribute('width', img.offsetWidth);
            overlay.setAttribute('height', img.offsetHeight);
            
            // Add click handler to image
            img.onclick = handleImageClick;
            img.style.cursor = 'default';
        }

        function handleImageClick(event) {
            if (!mapEditorState.isCreating) return;
            
            const rect = event.target.getBoundingClientRect();
            const x = Math.round(event.clientX - rect.left);
            const y = Math.round(event.clientY - rect.top);
            
            mapEditorState.points.push({x, y});
            
            switch(mapEditorState.currentShape) {
                case 'rect':
                    if (mapEditorState.points.length === 2) {
                        createRectangleRegion();
                    } else {
                        drawTemporaryPoint(x, y);
                    }
                    break;
                case 'circle':
                    if (mapEditorState.points.length === 2) {
                        createCircleRegion();
                    } else {
                        drawTemporaryPoint(x, y);
                    }
                    break;
                case 'poly':
                    drawTemporaryPoint(x, y);
                    // Polygon continues until user clicks "Finish Region"
                    break;
            }
        }

        function drawTemporaryPoint(x, y) {
            const overlay = document.getElementById('map-overlay');
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 3);
            circle.setAttribute('fill', '#00ff00');
            circle.setAttribute('stroke', '#000');
            circle.setAttribute('stroke-width', 1);
            circle.className = 'temp-point';
            overlay.appendChild(circle);
        }

        function createRectangleRegion() {
            const points = mapEditorState.points;
            const x1 = Math.min(points[0].x, points[1].x);
            const y1 = Math.min(points[0].y, points[1].y);
            const x2 = Math.max(points[0].x, points[1].x);
            const y2 = Math.max(points[0].y, points[1].y);
            
            const coords = \`\${x1},\${y1},\${x2},\${y2}\`;
            addMapRegionWithCoords('rect', coords);
            finishMapCreation();
        }

        function createCircleRegion() {
            const points = mapEditorState.points;
            const centerX = points[0].x;
            const centerY = points[0].y;
            const radius = Math.round(Math.sqrt(
                Math.pow(points[1].x - centerX, 2) + Math.pow(points[1].y - centerY, 2)
            ));
            
            const coords = \`\${centerX},\${centerY},\${radius}\`;
            addMapRegionWithCoords('circle', coords);
            finishMapCreation();
        }

        function createPolygonRegion() {
            if (mapEditorState.points.length < 3) {
                alert('Polygon needs at least 3 points');
                return;
            }
            
            const coords = mapEditorState.points.map(p => \`\${p.x},\${p.y}\`).join(',');
            addMapRegionWithCoords('poly', coords);
            finishMapCreation();
        }

        function addMapRegionWithCoords(shape, coords) {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile) return;
            
            if (!tile.map) tile.map = [];
            tile.map.push({
                shape: shape,
                coords: coords,
                to_tile: '',
                hint: 'pointer'
            });
            
            renderImageMap();
            renderExistingMapRegions();
            renderTileList();
            markUnsaved();
        }

        function startMapCreation() {
            mapEditorState.isCreating = true;
            mapEditorState.currentShape = document.getElementById('map-shape-selector').value;
            mapEditorState.points = [];
            
            const img = document.querySelector('#image-map-container img');
            if (img) {
                img.style.cursor = 'crosshair';
            }
            
            // Clear temporary points
            clearTemporaryElements();
        }

        function cancelMapCreation() {
            mapEditorState.isCreating = false;
            mapEditorState.points = [];
            
            const img = document.querySelector('#image-map-container img');
            if (img) {
                img.style.cursor = 'default';
            }
            
            clearTemporaryElements();
        }

        function finishMapCreation() {
            if (mapEditorState.currentShape === 'poly' && mapEditorState.points.length >= 3) {
                createPolygonRegion();
            }
            
            mapEditorState.isCreating = false;
            mapEditorState.points = [];
            
            const img = document.querySelector('#image-map-container img');
            if (img) {
                img.style.cursor = 'default';
            }
            
            clearTemporaryElements();
        }

        function clearTemporaryElements() {
            const overlay = document.getElementById('map-overlay');
            if (overlay) {
                const tempPoints = overlay.querySelectorAll('.temp-point');
                tempPoints.forEach(point => point.remove());
            }
        }

        function renderExistingMapRegions() {
            const tile = currentStory.Tiles.find(t => t.id === currentTileId);
            if (!tile || !tile.map) return;
            
            const overlay = document.getElementById('map-overlay');
            if (!overlay) return;
            
            // Clear existing regions (but not temp points)
            const existingRegions = overlay.querySelectorAll('.map-region-highlight');
            existingRegions.forEach(region => region.remove());
            
            // Draw each map region
            tile.map.forEach((region, index) => {
                drawMapRegion(region, index);
            });
        }

        function drawMapRegion(region, index) {
            const overlay = document.getElementById('map-overlay');
            if (!overlay) return;
            
            let element;
            const coords = region.coords.split(',').map(c => parseInt(c));
            
            switch(region.shape) {
                case 'rect':
                    element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    element.setAttribute('x', coords[0]);
                    element.setAttribute('y', coords[1]);
                    element.setAttribute('width', coords[2] - coords[0]);
                    element.setAttribute('height', coords[3] - coords[1]);
                    break;
                    
                case 'circle':
                    element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    element.setAttribute('cx', coords[0]);
                    element.setAttribute('cy', coords[1]);
                    element.setAttribute('r', coords[2]);
                    break;
                    
                case 'poly':
                    element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                    const points = [];
                    for (let i = 0; i < coords.length; i += 2) {
                        points.push(\`\${coords[i]},\${coords[i + 1]}\`);
                    }
                    element.setAttribute('points', points.join(' '));
                    break;
            }
            
            if (element) {
                element.className = 'map-region-highlight';
                element.setAttribute('data-region-index', index);
                element.style.cursor = 'pointer';
                element.onclick = () => editMapRegion(index);
                overlay.appendChild(element);
            }
        }

        function editMapRegion(index) {
            // Scroll to the map region in the form
            const mapList = document.getElementById('map-list');
            const regionForms = mapList.querySelectorAll('.choice-item');
            if (regionForms[index]) {
                regionForms[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                regionForms[index].style.backgroundColor = '#e3f2fd';
                setTimeout(() => {
                    regionForms[index].style.backgroundColor = '';
                }, 2000);
            }
        }

        function toggleAudio(audioId, button) {
            const audio = document.getElementById(audioId);
            if (!audio) return;
            
            if (audio.paused) {
                // Stop all other audio first
                const allAudio = document.querySelectorAll('audio');
                allAudio.forEach(a => {
                    if (a !== audio && !a.paused) {
                        a.pause();
                        // Reset other buttons
                        const otherButtons = document.querySelectorAll('button[onclick*="toggleAudio"]');
                        otherButtons.forEach(btn => {
                            if (btn !== button) {
                                btn.textContent = '▶ Play';
                            }
                        });
                    }
                });
                
                audio.play();
                button.textContent = '⏸ Pause';
            } else {
                audio.pause();
                button.textContent = '▶ Play';
            }
            
            // Reset button when audio ends
            audio.onended = function() {
                button.textContent = '▶ Play';
            };
        }

        function uploadMedia(type) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = type === 'picture' ? 'image/*' : type === 'video' ? 'video/*' : 'audio/*';
            
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('file', file);
                formData.append('storyName', currentStory.Name);
                
                fetch('/edit/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Error uploading file: ' + data.error);
                    } else {
                        // Update the appropriate field
                        updateTileField(type, data.path);
                        // Update the input field
                        const inputField = document.getElementById('tile-' + type);
                        if (inputField) {
                            inputField.value = data.path;
                        }
                        // Update the media preview
                        updateMediaPreview(type, data.path);
                        alert('File uploaded successfully!');
                    }
                })
                .catch(error => {
                    alert('Error uploading file: ' + error);
                });
            };
            
            input.click();
        }

        function addTile() {
            const newId = prompt('Enter ID for new tile:');
            if (!newId) return;
            
            // Check if ID already exists
            const existingTile = currentStory.Tiles.find(t => t.id === newId);
            if (existingTile) {
                alert('A tile with this ID already exists. Multiple tiles can share the same ID for randomness.');
            }
            
            currentStory.Tiles.push({
                id: newId,
                title: '',
                text: '',
                choices: []
            });
            
            renderTileList();
            selectTile(newId);
            markUnsaved();
        }

        function addStuffItem() {
            if (!currentStory.Stuff) currentStory.Stuff = [];
            
            currentStory.Stuff.push({
                key: '',
                name: '',
                description: ''
            });
            
            renderStuffItems();
            markUnsaved();
        }

        function removeStuffItem(index) {
            if (!currentStory.Stuff) return;
            
            currentStory.Stuff.splice(index, 1);
            renderStuffItems();
            markUnsaved();
        }

        function updateTileReferences(oldId, newId) {
            // Update all choice references
            currentStory.Tiles.forEach(tile => {
                if (tile.choices) {
                    tile.choices.forEach(choice => {
                        if (choice.to_tile === oldId) {
                            choice.to_tile = newId;
                        }
                    });
                }
                if (tile.map) {
                    tile.map.forEach(region => {
                        if (region.to_tile === oldId) {
                            region.to_tile = newId;
                        }
                    });
                }
            });
        }

        function markUnsaved() {
            unsavedChanges = true;
            const status = document.getElementById('save-status');
            status.textContent = 'Unsaved changes';
            status.className = 'save-status unsaved';
        }

        function markSaved() {
            unsavedChanges = false;
            const status = document.getElementById('save-status');
            status.textContent = 'Saved';
            status.className = 'save-status saved';
        }

        function saveStory() {
            // Ensure required fields
            if (!currentStory.creator) {
                currentStory.creator = '${continueCode}';
            }
            if (!currentStory.published) {
                currentStory.published = 'no';
            }
            currentStory.NbTiles = currentStory.Tiles.length;
            
            fetch('/edit/story/${req.params.name}', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({story: currentStory})
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Error saving story: ' + data.error);
                } else {
                    markSaved();
                    // Story saved successfully (no popup)
                }
            })
            .catch(error => {
                alert('Error saving story: ' + error);
            });
        }

        // Warn about unsaved changes
        window.addEventListener('beforeunload', function(e) {
            if (unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        // Initialize the editor
        initEditor();
        
        // Debug function to check story state
        window.debugStory = function() {
            console.log('Current story:', currentStory);
            console.log('Achievements:', currentStory.Achievements);
            console.log('Stuff:', currentStory.Stuff);
        };
    </script>
</body>
</html>
    `;
    
    res.setHeader("Content-Type", "text/html");
    res.send(editorHTML);
    
  } catch (error) {
    console.error('Error loading story for editing:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({error: 'Story not found'});
    } else {
      res.status(500).json({error: 'Server error loading story'});
    }
  }
})

// Create new story
app.post('/edit/story/new', async function (req, res) {
  // Get continue code from SESSION cookie
  var continueCode = "";
  if(req.cookies.SESSION != undefined) {
    continueCode = req.cookies.SESSION;
  } else {
    // If no user is logged-in, return error
    res.status(401).json({"error":"please log in"});
    return;
  }

  try {
    const storyName = req.body.name;
    
    // Validate story name (alphanumeric, hyphens, underscores only)
    if (!storyName || !/^[a-zA-Z0-9_-]+$/.test(storyName)) {
      res.status(400).json({error: 'Invalid story name. Use only letters, numbers, hyphens and underscores.'});
      return;
    }
    
    // Check if story already exists
    const storyPath = `./server/private/${storyName}.json`;
    try {
      await fs.access(storyPath);
      res.status(409).json({error: 'Story already exists'});
      return;
    } catch (error) {
      // File doesn't exist, which is what we want
    }
    
    // Create initial story structure
    const newStory = {
      Name: storyName,
      Description: '',
      Credits: '',
      creator: continueCode,
      published: 'no',
      NbTiles: 1,
      Tiles: [{
        id: '1',
        title: '',
        text: '',
        choices: []
      }],
      Stuff: [],
      Achievements: []
    };
    
    // Write to file system
    await fs.writeFile(storyPath, JSON.stringify(newStory, null, 2));
    
    // Update stories cache by reloading the story
    await updateStoryInCache(`${storyName}.json`);
    
    // Return success
    res.json({success: true, story: newStory});
    
  } catch (error) {
    console.error('Error creating new story:', error);
    res.status(500).json({error: 'Server error creating story'});
  }
})

// Save story
app.post('/edit/story/:name', async function (req, res) {
  // Get continue code from SESSION cookie
  var continueCode = "";
  if(req.cookies.SESSION != undefined) {
    continueCode = req.cookies.SESSION;
  } else {
    // If no user is logged-in, return error
    res.status(401).json({"error":"please log in"});
    return;
  }

  try {
    const story = req.body.story;
    
    if (!story) {
      res.status(400).json({error: 'No story data provided'});
      return;
    }
    
    // Validate story data
    const errors = validateStory(story);
    if (errors.length > 0) {
      res.status(400).json({errors});
      return;
    }
    
    // Ensure creator field is set to current user
    story.creator = continueCode;
    
    // Ensure published field exists (default 'no')
    if (!story.published) {
      story.published = 'no';
    }
    
    // Calculate NbTiles
    story.NbTiles = story.Tiles ? story.Tiles.length : 0;
    
    // Write to file system atomically (write to temp file, then rename)
    const storyPath = `./server/private/${req.params.name}.json`;
    const tempPath = `${storyPath}.tmp`;
    
    await fs.writeFile(tempPath, JSON.stringify(story, null, 2));
    await fs.rename(tempPath, storyPath);
    
    // Update stories cache by reloading the story
    await updateStoryInCache(`${req.params.name}.json`);
    
    // Return success
    res.json({success: true});
    
  } catch (error) {
    console.error('Error saving story:', error);
    res.status(500).json({error: 'Server error saving story'});
  }
})

// Story validation function
function validateStory(story) {
  const errors = [];
  
  // Must have at least one tile
  if (!story.Tiles || story.Tiles.length === 0) {
    errors.push({field: 'Tiles', message: 'Story must have at least one tile'});
  }
  
  // Must have tile with id "1"
  if (story.Tiles) {
    const hasTileOne = story.Tiles.some(t => t.id === '1');
    if (!hasTileOne) {
      errors.push({field: 'Tiles', message: 'Story must have a tile with id "1"'});
    }
  }
  
  // All choice targets must reference existing tiles
  if (story.Tiles) {
    const tileIds = new Set(story.Tiles.map(t => t.id));
    story.Tiles.forEach((tile, tileIndex) => {
      if (tile.choices) {
        tile.choices.forEach((choice, choiceIndex) => {
          if (choice.to_tile && !tileIds.has(choice.to_tile)) {
            errors.push({
              field: `Tiles[${tileIndex}].choices[${choiceIndex}].to_tile`,
              message: `Choice references non-existent tile "${choice.to_tile}"`
            });
          }
        });
      }
      
      // Same for map regions
      if (tile.map) {
        tile.map.forEach((region, regionIndex) => {
          if (region.to_tile && !tileIds.has(region.to_tile)) {
            errors.push({
              field: `Tiles[${tileIndex}].map[${regionIndex}].to_tile`,
              message: `Map region references non-existent tile "${region.to_tile}"`
            });
          }
        });
      }
    });
  }
  
  // Tile IDs must be strings
  if (story.Tiles) {
    story.Tiles.forEach((tile, index) => {
      if (typeof tile.id !== 'string') {
        errors.push({
          field: `Tiles[${index}].id`,
          message: 'Tile ID must be a string'
        });
      }
    });
  }
  
  return errors;
}

// Media upload endpoint
app.post('/edit/upload', upload.single('file'), async function (req, res) {
  // Get continue code from SESSION cookie
  var continueCode = "";
  if(req.cookies.SESSION != undefined) {
    continueCode = req.cookies.SESSION;
  } else {
    // If no user is logged-in, return error
    res.status(401).json({"error":"please log in"});
    return;
  }

  try {
    if (!req.file) {
      res.status(400).json({error: 'No file uploaded'});
      return;
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const filename = `${uuid.v4()}${ext}`;
    
    // Determine target directory (story-specific or general uploads)
    const storyName = req.body.storyName || 'uploads';
    const targetDir = `./server/public/${storyName}/`;
    
    // Create directory if it doesn't exist
    try {
      await fs.mkdir(targetDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }
    
    // Save file
    const targetPath = path.join(targetDir, filename);
    await fs.writeFile(targetPath, req.file.buffer);
    
    // Return public path
    const publicPath = `/${storyName}/${filename}`;
    res.json({path: publicPath, success: true});
    
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({error: 'Server error uploading file'});
  }
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

    filteredArray = currentPlayer.stories.filter(element => element.name !== newStory.name);
    // add new tile for story
    filteredArray.push(newStory);
    // update player data
    currentPlayer.stories = filteredArray;

    // store updated player in players
    filteredArray = players.filter(element => element.username !== currentPlayer.username);
    filteredArray.push(currentPlayer);
    await persist('players', filteredArray);

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
  // if we already have persisted stories, reload them from memory
  needUpdate = false
  // first: do we have a stories file persisted?
  fileExists = await checkFileExists('stories')
  if(fileExists) {
    // we have a stories file, but is it empty?
    needUpdate = await isFileEmpty('stories')
  } else {
    needUpdate = true
  }
  // if needUpdate is true, it means that we have to initialize stories.
  if(needUpdate) {
    await persist('stories', []);
    await loadAllStories()
  }

  // if we already have persisted players, reload them from memory
  needUpdate = false
  // first: do we have a players file persisted?
  fileExists = await checkFileExists('players')
  if(fileExists) {
    // we have a players file, but is it empty?
    needUpdate = await isFileEmpty('players')
  } else {
    needUpdate = true
  }
  // if needUpdate is true, it means that we have to initialize players.
  if(needUpdate) {
    await persist('players', []);
  }
}

// returns a promise which resolves true if file exists:
async function checkFileExists(where) {
  filePath = "./persistence/"+where
  try {
    await fs.readFile(filePath, 'utf-8');
    return true;
  } catch (error) {
    return false;
  }
}

// returns true if the file does not exist or is empty.
// creates an empty file if the file does not exist
async function isFileEmpty(where) {
  filePath = "./persistence/"+where
  try {
    const stats = await fs.stat(filePath);
    return stats.size === 0;
  } catch (error) {
    console.error(`Error checking file size: ${error.message}`);
    return true
  }
}

// persist JSON objects on the filesystem
async function persist(where, what) {
  // persist on the filesystem
  filePath = "./persistence/"+where
  jsonString = JSON.stringify(what, null, 2);
  try {
    await fs.writeFile(filePath, jsonString);
  } catch (error) {
    console.error(`Error storing content in ${filePath}: ${error.message}`);
  }
}

// retrieve JSON objects from the filesystem
async function retrieve(where) {
  // retrieve from the filesystem
  filePath = "./persistence/"+where
  try {
    const jsonString = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`Error reading content from ${filePath}: ${error.message}`);
  }
}

// Main server
const port = process.env.PORT || 8000;

var server = app.listen(port, async function () {
  var host = server.address().address
  var port = server.address().port

  await initStorage();
  
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
  // Clear stories array first
  stories = [];
  
  // scan /private directory for *.json files
  try {
    const files = await fsp.readdir(privateDir)
    for (let f of files) {
      await loadStory(f)
    }
    // Persist all stories at once
    await persist('stories', stories);
  } catch(e) {
    console.log(e);
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
    // count and push number of tiles
    story.NbTiles = story.Tiles.length;
    // store the filename (without .json extension) for URL generation
    story.filename = filename.replace('.json', '');
    stories.push(story)
  }
}

async function updateStoryInCache(filename) {
  // Remove existing story with same filename from cache
  stories = stories.filter(s => s.filename !== filename.replace('.json', ''));
  
  // Load the updated story
  if (filename.match(".*json")) {
    console.log("[*] Updating "+filename);
    const filedata = await fsp.readFile(privateDir+filename,'utf8');
    const story = JSON.parse(filedata)
    story.NbTiles = story.Tiles.length;
    story.filename = filename.replace('.json', '');
    stories.push(story)
    await persist('stories', stories);
  }
}
