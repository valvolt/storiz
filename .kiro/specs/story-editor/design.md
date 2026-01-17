# Design Document: Story Editor

## Overview

The Story Editor is a visual web-based interface that enables authenticated users to create and modify interactive stories for the Storiz engine. The editor provides a dual-panel layout with a tile tree navigator on the left and a content editor on the right. Users can edit all story elements including tiles, choices, media, metadata, stuff, and credits through intuitive form-based interfaces.

The editor integrates seamlessly with the existing Storiz architecture by:
- Reusing the existing Express.js server and routing infrastructure
- Leveraging the current continue code authentication mechanism
- Maintaining full backward compatibility with the existing JSON story format
- Reusing the hexagon grid rendering code for visual consistency
- Storing stories in the same `server/private/` directory structure

The design follows a client-server architecture where the browser-based editor communicates with new Express.js API endpoints for loading, saving, and managing story data.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│  ┌────────────────┐  ┌──────────────────────────────────┐  │
│  │  Edit Menu     │  │     Story Editor Interface       │  │
│  │  (Hexagon Grid)│  │  ┌────────┐  ┌─────────────────┐ │  │
│  │                │  │  │  Tile  │  │   Content       │ │  │
│  │  - My Stories  │  │  │  Tree  │  │   Editor        │ │  │
│  │  - Others'     │  │  │  Panel │  │   Panel         │ │  │
│  │  - Create New  │  │  │        │  │                 │ │  │
│  └────────────────┘  │  │ Meta   │  │  - Tile Editor  │ │  │
│                      │  │ Stuff  │  │  - Meta Editor  │ │  │
│                      │  │ Credits│  │  - Stuff Editor │ │  │
│                      │  │ Tiles  │  │  - Credits Ed.  │ │  │
│                      │  └────────┘  └─────────────────┘ │  │
│                      └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/JSON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Server                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Editor API Endpoints                     │   │
│  │  - GET  /edit                (Edit menu)             │   │
│  │  - GET  /edit/story/:name    (Load story for edit)   │   │
│  │  - POST /edit/story/:name    (Save story)            │   │
│  │  - POST /edit/story/new      (Create new story)      │   │
│  │  - POST /edit/upload         (Upload media files)    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Existing Storiz Infrastructure             │   │
│  │  - Authentication (continue code via cookies)        │   │
│  │  - Story loading (retrieve/persist functions)        │   │
│  │  - File system access (server/private, server/public)│   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      File System                             │
│  - server/private/*.json     (Story JSON files)             │
│  - server/public/*           (Media files)                  │
│  - persistence/stories       (Story metadata cache)         │
│  - persistence/players       (Player data)                  │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Edit Menu Flow**:
   - User navigates to `/edit`
   - Server reads continue code from SESSION cookie
   - Server loads all stories and filters by creator
   - Server renders hexagon grid (reusing existing code)
   - User clicks story hexagon or "Create New"

2. **Story Editor Flow**:
   - User opens story for editing
   - Server loads complete story JSON
   - Server verifies creator matches continue code
   - Client renders tile tree and first tile editor
   - User modifies content in editor panels
   - Changes stored in browser memory (not persisted yet)
   - User clicks Save button
   - Client sends complete story JSON to server
   - Server validates and writes to file system

3. **Media Upload Flow**:
   - User clicks upload button in tile editor
   - Browser opens file selection dialog
   - User selects image/video file
   - Client sends file via multipart form POST
   - Server saves to `server/public/` directory
   - Server returns file path
   - Client updates tile data with file path

## Components and Interfaces

### Client-Side Components

#### 1. EditMenuComponent
**Purpose**: Display hexagon grid of all stories with edit access indicators

**State**:
```javascript
{
  stories: Array<StoryMetadata>,
  currentUser: string,  // continue code
  loading: boolean
}
```

**Methods**:
- `loadStories()`: Fetch all stories from server
- `filterByCreator()`: Separate user's stories from others'
- `renderHexagons()`: Reuse existing hexagon rendering code
- `handleStoryClick(storyName)`: Navigate to story editor
- `handleCreateNew()`: Create new empty story

**API Calls**:
- `GET /edit` → Returns HTML with embedded story list

#### 2. StoryEditorComponent
**Purpose**: Main editor interface with tile tree and content panels

**State**:
```javascript
{
  story: Story,              // Complete story object
  selectedView: string,      // 'tile' | 'metadata' | 'stuff' | 'credits'
  selectedTileId: string,    // Currently selected tile ID
  unsavedChanges: boolean,
  validationErrors: Array<ValidationError>
}
```

**Methods**:
- `loadStory(storyName)`: Fetch story from server
- `selectView(viewType, tileId?)`: Switch between editor views
- `updateStoryData(path, value)`: Update story object in memory
- `validateStory()`: Run validation checks
- `saveStory()`: Persist changes to server
- `addTile()`: Create new tile with unique ID
- `deleteTile(tileId)`: Remove tile and update references

**API Calls**:
- `GET /edit/story/:name` → Returns complete story JSON
- `POST /edit/story/:name` → Saves story JSON

#### 3. TileTreeComponent
**Purpose**: Visual navigation tree showing tiles and connections

**Props**:
```javascript
{
  tiles: Array<Tile>,
  selectedTileId: string,
  selectedView: string,
  onSelectTile: (tileId) => void,
  onSelectView: (view) => void,
  onAddTile: () => void
}
```

**Rendering Logic**:
- Top row: Metadata, Stuff, Credits squares
- Below: Tile nodes arranged vertically
- Arrows drawn using SVG from tile to choice targets
- Highlight currently selected tile/view

**Methods**:
- `renderTopSquares()`: Render Metadata/Stuff/Credits buttons
- `renderTileNodes()`: Render tile squares with IDs
- `renderConnections()`: Draw SVG arrows between tiles
- `calculateLayout()`: Position tiles to avoid overlap

#### 4. TileEditorComponent
**Purpose**: Edit all properties of a single tile

**Props**:
```javascript
{
  tile: Tile,
  allTileIds: Array<string>,
  onUpdate: (field, value) => void,
  onUploadMedia: (file, type) => Promise<string>
}
```

**Form Fields**:
- Text input: id, title, mood
- Textarea: text content
- URL inputs: sound, music, video
- Checkbox: loop music
- File upload buttons: picture, video
- Achievement inputs
- Item keyword inputs: requires, uses, item
- Choice list editor (ChoiceListComponent)
- Image map editor (ImageMapComponent)

**Methods**:
- `handleFieldChange(field, value)`: Update tile data
- `handleMediaUpload(file, type)`: Upload and set media path
- `validateTileId(newId)`: Check ID uniqueness
- `updateChoiceReferences(oldId, newId)`: Update all references when ID changes

#### 5. ChoiceListComponent
**Purpose**: Manage list of choices for a tile

**Props**:
```javascript
{
  choices: Array<Choice>,
  onUpdate: (choices) => void
}
```

**Methods**:
- `addChoice()`: Add empty choice to list
- `removeChoice(index)`: Remove choice from list
- `updateChoice(index, field, value)`: Update choice field
- `renderChoice(choice, index)`: Render editable choice form

**Choice Form Fields**:
- Text input: text, to_tile
- Text inputs: requires, uses, item (comma-separated for arrays)
- Select: disable ('grey' | 'invisible')

#### 6. ImageMapComponent
**Purpose**: Edit clickable regions on images

**Props**:
```javascript
{
  map: Array<MapRegion>,
  imagePath: string,
  onUpdate: (map) => void
}
```

**Methods**:
- `addRegion()`: Add empty map region
- `removeRegion(index)`: Remove region from list
- `updateRegion(index, field, value)`: Update region field
- `renderRegionForm(region, index)`: Render editable region form
- `renderVisualOverlay()`: Optional visual editor for drawing regions

**Region Form Fields**:
- Select: shape ('rect' | 'circle' | 'poly')
- Text input: coords (comma-separated)
- Text input: to_tile
- Text inputs: requires, uses, item
- Select: hint ('pointer' | 'invisible' | 'reveal')

#### 7. MetadataEditorComponent
**Purpose**: Edit story-level metadata

**Props**:
```javascript
{
  metadata: StoryMetadata,
  onUpdate: (field, value) => void
}
```

**Form Fields**:
- Text input: Name (story name)
- Textarea: Description
- Select: published ('yes' | 'no')
- Read-only: creator (continue code)
- Read-only: NbTiles (calculated)

#### 8. StuffEditorComponent
**Purpose**: Edit story items/inventory

**Props**:
```javascript
{
  stuff: Array<StuffItem>,
  onUpdate: (stuff) => void
}
```

**Methods**:
- `addItem()`: Add empty item to list
- `removeItem(index)`: Remove item from list
- `updateItem(index, field, value)`: Update item field
- `renderItem(item, index)`: Render editable item form

**Item Form Fields**:
- Text input: key (unique identifier)
- Text input: name
- Textarea: description
- Text input: code (optional unlock code)

#### 9. CreditsEditorComponent
**Purpose**: Edit story credits

**Props**:
```javascript
{
  credits: string,
  onUpdate: (credits) => void
}
```

**Form Fields**:
- Rich textarea: credits (supports HTML)

### Server-Side Components

#### 1. Edit Menu Route Handler
**Endpoint**: `GET /edit`

**Logic**:
```javascript
async function handleEditMenu(req, res) {
  // 1. Get continue code from SESSION cookie
  const continueCode = req.cookies.SESSION;
  
  // 2. Load all stories
  const stories = await retrieve('stories');
  
  // 3. Render hexagon grid HTML
  // Reuse existing hexagon rendering code
  // Mark stories where creator === continueCode as clickable
  // Mark others as greyed-out
  // Add "Create New Story" hexagon
  
  // 4. Send HTML response
  res.send(html);
}
```

#### 2. Load Story Route Handler
**Endpoint**: `GET /edit/story/:name`

**Logic**:
```javascript
async function handleLoadStory(req, res) {
  // 1. Get continue code from SESSION cookie
  const continueCode = req.cookies.SESSION;
  
  // 2. Load story from file system
  const storyPath = `./server/private/${req.params.name}.json`;
  const story = JSON.parse(await fs.readFile(storyPath, 'utf-8'));
  
  // 3. Verify creator matches (if creator field exists)
  if (story.creator && story.creator !== continueCode) {
    return res.status(403).send({error: 'Not authorized'});
  }
  
  // 4. Return complete story JSON
  res.json(story);
}
```

#### 3. Save Story Route Handler
**Endpoint**: `POST /edit/story/:name`

**Request Body**:
```javascript
{
  story: Story  // Complete story object
}
```

**Logic**:
```javascript
async function handleSaveStory(req, res) {
  // 1. Get continue code from SESSION cookie
  const continueCode = req.cookies.SESSION;
  
  // 2. Validate story data
  const errors = validateStory(req.body.story);
  if (errors.length > 0) {
    return res.status(400).json({errors});
  }
  
  // 3. Ensure creator field is set
  req.body.story.creator = continueCode;
  
  // 4. Ensure published field exists (default 'no')
  if (!req.body.story.published) {
    req.body.story.published = 'no';
  }
  
  // 5. Calculate NbTiles
  req.body.story.NbTiles = req.body.story.Tiles.length;
  
  // 6. Write to file system
  const storyPath = `./server/private/${req.params.name}.json`;
  await fs.writeFile(storyPath, JSON.stringify(req.body.story, null, 2));
  
  // 7. Update stories cache
  await loadStory(`${req.params.name}.json`);
  
  // 8. Return success
  res.json({success: true});
}
```

#### 4. Create New Story Route Handler
**Endpoint**: `POST /edit/story/new`

**Request Body**:
```javascript
{
  name: string  // Story name (will be filename)
}
```

**Logic**:
```javascript
async function handleCreateStory(req, res) {
  // 1. Get continue code from SESSION cookie
  const continueCode = req.cookies.SESSION;
  
  // 2. Validate story name (alphanumeric, no spaces)
  if (!isValidStoryName(req.body.name)) {
    return res.status(400).json({error: 'Invalid story name'});
  }
  
  // 3. Check if story already exists
  const storyPath = `./server/private/${req.body.name}.json`;
  if (await fileExists(storyPath)) {
    return res.status(409).json({error: 'Story already exists'});
  }
  
  // 4. Create initial story structure
  const newStory = {
    Name: req.body.name,
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
  
  // 5. Write to file system
  await fs.writeFile(storyPath, JSON.stringify(newStory, null, 2));
  
  // 6. Update stories cache
  await loadStory(`${req.body.name}.json`);
  
  // 7. Return new story
  res.json(newStory);
}
```

#### 5. Media Upload Route Handler
**Endpoint**: `POST /edit/upload`

**Request**: Multipart form data with file

**Logic**:
```javascript
async function handleMediaUpload(req, res) {
  // 1. Get continue code from SESSION cookie
  const continueCode = req.cookies.SESSION;
  
  // 2. Validate file type (image or video)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({error: 'Invalid file type'});
  }
  
  // 3. Generate unique filename
  const ext = path.extname(req.file.originalname);
  const filename = `${uuid.v4()}${ext}`;
  
  // 4. Determine target directory (could be story-specific)
  const storyName = req.body.storyName || 'uploads';
  const targetDir = `./server/public/${storyName}/`;
  await fs.mkdir(targetDir, {recursive: true});
  
  // 5. Save file
  const targetPath = path.join(targetDir, filename);
  await fs.writeFile(targetPath, req.file.buffer);
  
  // 6. Return public path
  const publicPath = `/${storyName}/${filename}`;
  res.json({path: publicPath});
}
```

#### 6. Validation Module

**Function**: `validateStory(story)`

**Validation Rules**:
```javascript
function validateStory(story) {
  const errors = [];
  
  // Must have at least one tile
  if (!story.Tiles || story.Tiles.length === 0) {
    errors.push({field: 'Tiles', message: 'Story must have at least one tile'});
  }
  
  // Must have tile with id "1"
  const hasTileOne = story.Tiles.some(t => t.id === '1');
  if (!hasTileOne) {
    errors.push({field: 'Tiles', message: 'Story must have a tile with id "1"'});
  }
  
  // All choice targets must reference existing tiles
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
  
  // Tile IDs must be strings
  story.Tiles.forEach((tile, index) => {
    if (typeof tile.id !== 'string') {
      errors.push({
        field: `Tiles[${index}].id`,
        message: 'Tile ID must be a string'
      });
    }
  });
  
  return errors;
}
```

## Data Models

### Story JSON Structure

```javascript
{
  // Top-level metadata
  Name: string,              // Story name (matches filename)
  Description: string,       // Story description (HTML supported)
  Credits: string,           // Credits text (HTML supported)
  creator: string,           // Continue code of creator (NEW)
  published: string,         // 'yes' | 'no' (NEW, default 'no')
  NbTiles: number,           // Calculated tile count
  
  // Story content
  Tiles: Array<Tile>,
  Stuff: Array<StuffItem>,
  Achievements: Array<Achievement>
}
```

### Tile Structure

```javascript
{
  id: string,                // Unique identifier (required)
  title: string,             // Tile title (optional)
  text: string,              // Tile text content, HTML supported (optional)
  picture: string,           // Path to image file (optional)
  video: string,             // Path to video file (optional)
  sound: string,             // Path to sound file (optional)
  music: string,             // Path to music file (optional)
  mood: string,              // Theme: 'none'|'cold'|'hot'|'gritty'|'metal'|'hacker' (optional)
  achievement: string | Array<string>,  // Achievement key(s) (optional)
  choices: Array<Choice>,    // Choice buttons (optional)
  map: Array<MapRegion>      // Clickable image regions (optional)
}
```

### Choice Structure

```javascript
{
  text: string,              // Button text (required)
  to_tile: string,           // Target tile ID (required)
  item: string | Array<string>,      // Item(s) to give (optional)
  requires: string | Array<string>,  // Item(s) required (optional)
  uses: string | Array<string>,      // Item(s) to consume (optional)
  disable: 'grey' | 'invisible'      // Behavior when requirements not met (optional)
}
```

### MapRegion Structure

```javascript
{
  shape: 'rect' | 'circle' | 'poly',  // Region shape (required)
  coords: string,                      // Comma-separated coordinates (required)
  to_tile: string,                     // Target tile ID (required)
  item: string | Array<string>,        // Item(s) to give (optional)
  requires: string | Array<string>,    // Item(s) required (optional)
  uses: string | Array<string>,        // Item(s) to consume (optional)
  hint: 'pointer' | 'invisible' | 'reveal'  // Visual hint (optional, default 'pointer')
}
```

### StuffItem Structure

```javascript
{
  key: string,               // Unique identifier (required)
  name: string,              // Display name (required)
  description: string,       // Item description (required)
  code: string               // Unlock code (optional)
}
```

### Achievement Structure

```javascript
{
  trophy: 'bronze' | 'silver' | 'gold',  // Trophy type (required)
  key: string,                            // Unique identifier (required)
  name: string,                           // Achievement name (required)
  description: string                     // Achievement description (required)
}
```

### In-Memory Editor State

```javascript
{
  // Story data (matches JSON structure)
  story: Story,
  
  // UI state
  selectedView: 'tile' | 'metadata' | 'stuff' | 'credits',
  selectedTileId: string,
  unsavedChanges: boolean,
  
  // Validation state
  validationErrors: Array<{
    field: string,
    message: string
  }>,
  
  // Upload state
  uploadingMedia: boolean,
  uploadProgress: number
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Continue Code Identification
*For any* HTTP request to the edit menu with a valid SESSION cookie, the system should correctly identify the user by extracting the continue code from the cookie.
**Validates: Requirements 1.2**

### Property 2: Creator Field Assignment
*For any* newly created story, the story JSON should contain a `creator` field with a value matching the continue code of the authenticated user who created it.
**Validates: Requirements 2.1**

### Property 3: Story Filtering by Creator
*For any* set of stories and a given continue code, filtering stories by creator should return exactly those stories where the `creator` field matches the continue code.
**Validates: Requirements 2.2**

### Property 4: Edit Authorization Check
*For any* edit attempt on a story, if the story's `creator` field does not match the authenticated user's continue code, the system should reject the edit operation.
**Validates: Requirements 2.3**

### Property 5: Auto-Select First Tile
*For any* story opened for editing, the system should automatically select and display the tile with id "1" as the initial view.
**Validates: Requirements 4.1**

### Property 6: New Story Initial Tile
*For any* newly created story, the story should contain exactly one tile with id "1" in its Tiles array.
**Validates: Requirements 4.2**

### Property 7: Save Persistence
*For any* story modifications made in the editor, when the save operation completes successfully, reading the story JSON file from disk should reflect all the modifications.
**Validates: Requirements 8.2**

### Property 8: JSON Structure Preservation
*For any* story loaded and saved without modifications, the saved JSON structure should be identical to the original structure (preserving field order, formatting, and all fields).
**Validates: Requirements 8.3**

### Property 9: New Story Published Default
*For any* newly created story, the story JSON should contain a `published` field with the value "no".
**Validates: Requirements 9.1**

### Property 10: Published Filtering in Play Mode
*For any* set of stories, when loading the story selection menu in play mode, the displayed stories should include all and only those stories where `published` equals "yes".
**Validates: Requirements 9.5, 9.6, 9.7**

### Property 11: Edit Mode Shows All User Stories
*For any* set of stories and a given continue code, when loading the Edit menu, the displayed stories should include all stories where `creator` matches the continue code, regardless of their `published` status.
**Validates: Requirements 9.8**

### Property 12: Media Upload Path Assignment
*For any* valid media file (image or video) uploaded through the editor, the upload should succeed and return a valid public path that can be used to access the file.
**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

### Property 13: Choice Target Validation
*For any* story being validated, all choice `to_tile` values should reference tile IDs that exist in the story's Tiles array, or validation should fail with specific error messages.
**Validates: Requirements 12.1**

### Property 14: Minimum Tile Validation
*For any* story being saved, if the story contains zero tiles, the validation should fail and prevent the save operation.
**Validates: Requirements 12.3**

### Property 15: Tile One Validation
*For any* story being saved, if the story does not contain a tile with id "1", the validation should fail and prevent the save operation.
**Validates: Requirements 12.4**

### Property 16: Tile ID Reference Update
*For any* tile whose ID is changed from oldId to newId, all choice `to_tile` and map region `to_tile` references throughout the story that pointed to oldId should be updated to point to newId.
**Validates: Requirements 12.6**

### Property 17: Legacy Story Published Default
*For any* story loaded from disk that does not have a `published` field, the system should treat it as if `published` equals "yes" for display in play mode.
**Validates: Requirements 13.2**

### Property 18: Unknown Field Preservation
*For any* story JSON containing fields not managed by the editor, when the story is saved, all those unknown fields should be preserved in the saved JSON with their original values.
**Validates: Requirements 13.3**

### Property 19: Unique Tile ID Validation (Except Intentional Duplicates)
*For any* tile ID change operation, if the new ID would create an unintentional duplicate (not for randomness purposes), the validation should fail and prevent the change.
**Validates: Requirements 15.2**

### Property 20: Tile One ID Protection
*For any* attempt to change the ID of a tile currently having id "1" to a different value, the system should reject the change and maintain the ID as "1".
**Validates: Requirements 15.5**

### Property 21: Intentional Duplicate IDs Allowed
*For any* story, the system should allow multiple tiles to share the same ID (for implementing randomness), and validation should not flag this as an error.
**Validates: Requirements 15.6**

## Error Handling

### Client-Side Error Handling

**Validation Errors**:
- Display inline error messages next to invalid fields
- Prevent save operation when validation errors exist
- Show summary of all errors at top of editor
- Highlight invalid fields with red borders

**Network Errors**:
- Display error toast notifications for failed API calls
- Retry mechanism for transient failures
- Preserve unsaved changes in browser localStorage
- Offer "Retry" button for failed operations

**File Upload Errors**:
- Display specific error messages for file type/size issues
- Show upload progress indicator
- Allow cancellation of in-progress uploads
- Rollback tile data if upload fails

**Authorization Errors**:
- Redirect to main menu if user lacks edit permission
- Display clear error message explaining access denial
- Prevent any modification attempts on unauthorized stories

### Server-Side Error Handling

**File System Errors**:
- Catch and log all fs operation errors
- Return 500 status with generic error message to client
- Preserve existing file if write operation fails
- Implement atomic writes (write to temp file, then rename)

**Validation Errors**:
- Return 400 status with detailed validation error array
- Include field path and error message for each violation
- Client can display errors next to relevant fields

**Authorization Errors**:
- Return 403 status for unauthorized edit attempts
- Log security violations for monitoring
- Do not reveal whether story exists if user lacks access

**Malformed JSON Errors**:
- Catch JSON parse errors when loading stories
- Return 500 status with generic error message
- Log detailed error for debugging
- Prevent corruption of story files

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests as complementary approaches:

**Unit Tests**: Focus on specific examples, edge cases, and error conditions
- Test specific UI component rendering
- Test specific API endpoint responses
- Test error handling for known failure scenarios
- Test integration between components
- Keep unit tests focused and minimal - property tests handle broad input coverage

**Property-Based Tests**: Verify universal properties across all inputs
- Test validation rules with randomly generated stories
- Test filtering logic with random story sets
- Test persistence with random modifications
- Test reference updates with random ID changes
- Each property test should run minimum 100 iterations

### Property-Based Testing Configuration

**Library Selection**: Use `fast-check` for JavaScript/Node.js property-based testing

**Test Configuration**:
```javascript
fc.assert(
  fc.property(
    // generators here
    (inputs) => {
      // property assertion here
    }
  ),
  { numRuns: 100 }  // Minimum 100 iterations
);
```

**Property Test Tagging**:
Each property-based test must include a comment tag referencing the design document property:
```javascript
// Feature: story-editor, Property 2: Creator Field Assignment
test('new stories have creator field matching continue code', () => {
  fc.assert(
    fc.property(
      continueCodeGenerator(),
      storyNameGenerator(),
      (continueCode, storyName) => {
        const story = createNewStory(storyName, continueCode);
        return story.creator === continueCode;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage by Component

**EditMenuComponent**:
- Unit: Test hexagon rendering with specific story sets
- Unit: Test click handlers for story selection
- Property: Test story filtering by creator (Property 3)
- Property: Test published filtering (Property 10, 11)

**StoryEditorComponent**:
- Unit: Test view switching between tile/metadata/stuff/credits
- Unit: Test unsaved changes warning
- Property: Test auto-select tile "1" (Property 5)
- Property: Test save persistence (Property 7)

**TileEditorComponent**:
- Unit: Test form field updates
- Unit: Test media upload UI
- Property: Test tile ID validation (Property 19, 20)

**ValidationModule**:
- Unit: Test specific validation error messages
- Property: Test choice target validation (Property 13)
- Property: Test minimum tile validation (Property 14)
- Property: Test tile one validation (Property 15)
- Property: Test unique ID validation (Property 19)

**Server Routes**:
- Unit: Test authentication with specific cookies
- Unit: Test error responses for invalid requests
- Property: Test continue code identification (Property 1)
- Property: Test creator field assignment (Property 2)
- Property: Test authorization checks (Property 4)
- Property: Test JSON structure preservation (Property 8)
- Property: Test unknown field preservation (Property 18)

**Reference Update Logic**:
- Unit: Test specific ID change scenarios
- Property: Test reference updates (Property 16)
- Property: Test duplicate ID handling (Property 21)

### Integration Testing

**End-to-End Flows**:
1. Create new story → Edit tiles → Add choices → Save → Verify file
2. Load existing story → Modify metadata → Save → Verify changes
3. Upload media → Reference in tile → Save → Verify path
4. Change tile ID → Verify all references updated → Save
5. Set published="yes" → Verify appears in play mode
6. Attempt unauthorized edit → Verify rejection

**Browser Testing**:
- Test in Chrome, Firefox, Safari
- Test responsive layout on different screen sizes
- Test file upload with various file types and sizes
- Test concurrent editing (multiple browser tabs)

### Test Data Generators

**For Property-Based Tests**:
```javascript
// Generate random continue codes
const continueCodeGenerator = () => fc.uuid();

// Generate random story names
const storyNameGenerator = () => fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')),
  { minLength: 3, maxLength: 20 }
);

// Generate random tiles
const tileGenerator = () => fc.record({
  id: fc.string(),
  title: fc.option(fc.string()),
  text: fc.option(fc.string()),
  picture: fc.option(fc.string()),
  choices: fc.array(choiceGenerator())
});

// Generate random choices
const choiceGenerator = () => fc.record({
  text: fc.string(),
  to_tile: fc.string(),
  item: fc.option(fc.oneof(fc.string(), fc.array(fc.string()))),
  requires: fc.option(fc.oneof(fc.string(), fc.array(fc.string()))),
  uses: fc.option(fc.oneof(fc.string(), fc.array(fc.string())))
});

// Generate random stories
const storyGenerator = () => fc.record({
  Name: storyNameGenerator(),
  Description: fc.string(),
  Credits: fc.string(),
  creator: continueCodeGenerator(),
  published: fc.constantFrom('yes', 'no'),
  Tiles: fc.array(tileGenerator(), { minLength: 1 }),
  Stuff: fc.array(stuffItemGenerator()),
  Achievements: fc.array(achievementGenerator())
});
```

### Manual Testing Checklist

- [ ] Create new story and verify initial state
- [ ] Edit all tile properties and verify persistence
- [ ] Add/remove choices and verify updates
- [ ] Upload images and videos and verify display
- [ ] Create image map regions and verify clickability
- [ ] Edit metadata and verify changes
- [ ] Edit stuff items and verify display in game
- [ ] Edit credits and verify display
- [ ] Change tile IDs and verify reference updates
- [ ] Test validation errors for invalid data
- [ ] Test authorization for other users' stories
- [ ] Test published filtering in play mode
- [ ] Test backward compatibility with legacy stories
- [ ] Test hexagon grid layout and interactions
- [ ] Test tile tree navigation and connections
- [ ] Test unsaved changes warning
- [ ] Test concurrent editing scenarios
