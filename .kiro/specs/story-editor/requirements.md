# Requirements Document: Story Editor

## Introduction

The Story Editor feature enables authenticated users to create and edit interactive stories for the Storiz engine through a visual interface. Users can manage story metadata, edit tile content, navigate tile relationships through a visual tree, and control publication status. The editor integrates with the existing continue code authentication system and maintains backward compatibility with the current JSON story format.

## Glossary

- **Story_Editor**: The visual interface system that allows users to create and modify story JSON files
- **Tile**: A scene in a story containing text, media, choices, and metadata (identified by numeric id)
- **Continue_Code**: A unique key that serves as both username and password for user authentication
- **Tile_Tree**: A visual representation showing all tiles and their choice-based connections
- **Creator**: The user (identified by continue code) who created a specific story
- **Published_Status**: A boolean flag indicating whether a story is visible in normal play mode
- **Choice**: A user-selectable option within a tile that branches to another tile
- **Edit_Menu**: The interface showing all stories with edit access indicators
- **Story_Metadata**: Top-level story properties including title, description, creator, and published status

## Requirements

### Requirement 1: User Authentication

**User Story:** As a story creator, I want to use my continue code to identify myself, so that I can access my stories for editing.

#### Acceptance Criteria

1. THE System SHALL use the existing continue code mechanism for user identification
2. WHEN a user accesses the Edit menu, THE System SHALL use the current continue code to identify the user
3. THE System SHALL maintain the continue code throughout the editing workflow

### Requirement 2: Story Ownership

**User Story:** As a story creator, I want stories to be associated with my continue code, so that only I can edit my own stories.

#### Acceptance Criteria

1. WHEN a new story is created, THE System SHALL add a `creator` field to the JSON file containing the authenticated user's continue code
2. WHEN loading the Edit menu, THE System SHALL identify which stories belong to the current user by comparing continue codes
3. WHEN a user attempts to edit a story, THE System SHALL verify the story's `creator` field matches the authenticated user's continue code
4. IF a user attempts to edit another user's story, THEN THE System SHALL prevent the edit operation and maintain the story's current state

### Requirement 3: Edit Menu Display

**User Story:** As a story creator, I want to see all available stories in a hexagon grid, so that I can identify which stories I can edit.

#### Acceptance Criteria

1. WHEN the Edit menu loads, THE System SHALL display all stories using the same hexagon grid layout as the main story selection menu
2. WHEN displaying stories created by the current user, THE System SHALL render them as clickable hexagons
3. WHEN displaying stories created by other users, THE System SHALL render them as greyed-out (disabled) hexagons
4. THE System SHALL display an additional hexagon labeled "Create New Story"
5. WHEN the "Create New Story" hexagon is clicked, THE System SHALL initialize a new empty story with the current user as creator
6. THE System SHALL reuse the existing hexagon rendering code from the main menu for visual consistency

### Requirement 4: Story Editor Initialization

**User Story:** As a story creator, I want the editor to automatically load the first tile when I open a story, so that I can immediately start editing.

#### Acceptance Criteria

1. WHEN a story is opened for editing, THE System SHALL automatically select and display the tile with id "1"
2. WHEN a new story is created, THE System SHALL create an initial tile with id "1"
3. WHEN the first tile is displayed, THE System SHALL render all tile properties in editable mode
4. IF a story has no tile with id "1", THEN THE System SHALL create one before displaying the editor

### Requirement 5: Tile Content Editing

**User Story:** As a story creator, I want to edit all properties of a tile, so that I can define the complete scene content.

#### Acceptance Criteria

1. WHEN a tile is displayed in the editor, THE System SHALL render the title field as an editable text input
2. WHEN a tile is displayed in the editor, THE System SHALL render the text content as an editable text area
3. WHEN a tile is displayed in the editor, THE System SHALL provide a button to upload or replace the picture file
4. WHEN a tile is displayed in the editor, THE System SHALL render the sound URL as an editable text input
5. WHEN a tile is displayed in the editor, THE System SHALL render the music URL as an editable text input
6. WHEN a tile is displayed in the editor, THE System SHALL provide a checkbox for "loop music"
7. WHEN the "loop music" checkbox is disabled, THE System SHALL configure music to play once
8. WHEN the "loop music" checkbox is enabled, THE System SHALL configure music to loop continuously
9. WHEN a tile is displayed in the editor, THE System SHALL render the mood field as an editable input
10. WHEN a tile is displayed in the editor, THE System SHALL render achievement fields as editable inputs
11. WHEN a tile is displayed in the editor, THE System SHALL render image map coordinates as editable inputs
12. WHEN a tile is displayed in the editor, THE System SHALL render item-related keywords (requires/uses/item) as editable inputs

### Requirement 6: Choice Management

**User Story:** As a story creator, I want to add, edit, and remove choices within a tile, so that I can define branching paths in my story.

#### Acceptance Criteria

1. WHEN a tile with existing choices is displayed, THE System SHALL render each choice as an editable input field pre-filled with the choice text
2. WHEN a tile with existing choices is displayed, THE System SHALL render the target tile id for each choice as an editable input field
3. WHEN a tile with existing choices is displayed, THE System SHALL render the requires, uses, and item fields for each choice as editable inputs
4. THE System SHALL provide an "Add Choice" button for each tile
5. WHEN the "Add Choice" button is clicked, THE System SHALL create a new empty choice input field set (text, target, requires, uses, item)
6. THE System SHALL provide a "Remove Choice" button for each choice
7. WHEN a "Remove Choice" button is clicked, THE System SHALL delete that choice from the tile
8. WHEN choice fields are modified, THE System SHALL update the tile data in memory

### Requirement 7: Tile Tree Navigation

**User Story:** As a story creator, I want to see a visual tree of all tiles and their connections, so that I can understand and navigate my story structure.

#### Acceptance Criteria

1. WHEN the editor is open, THE System SHALL display a Tile_Tree panel on the left side of the interface
2. WHEN rendering the Tile_Tree panel, THE System SHALL display clickable squares at the top for Metadata, Stuff, and Credits
3. WHEN the Metadata square is clicked, THE System SHALL display the metadata editor in the right panel
4. WHEN the Stuff square is clicked, THE System SHALL display the stuff editor in the right panel
5. WHEN the Credits square is clicked, THE System SHALL display the credits editor in the right panel
6. WHEN rendering the Tile_Tree, THE System SHALL display each tile as a square node labeled with its id below the top squares
7. WHEN rendering the Tile_Tree, THE System SHALL draw arrows from each tile to its choice target tiles
8. WHEN a tile node in the Tile_Tree is clicked, THE System SHALL load and display that tile in the editor
9. THE System SHALL provide an "Add Tile" button in the Tile_Tree panel
10. WHEN the "Add Tile" button is clicked, THE System SHALL create a new tile with a unique id
11. WHEN a new tile is created, THE System SHALL allow it to be initially empty (no required fields)
12. WHEN the Tile_Tree is rendered, THE System SHALL visually distinguish the currently selected tile or editor screen

### Requirement 8: Story Persistence

**User Story:** As a story creator, I want to save my changes to the story file, so that my edits are preserved.

#### Acceptance Criteria

1. THE System SHALL provide a "Save" button in the editor interface
2. WHEN the "Save" button is clicked, THE System SHALL write all tile data to the story's JSON file
3. WHEN saving, THE System SHALL preserve the existing JSON structure and format
4. WHEN saving, THE System SHALL maintain the `creator` field in the JSON file
5. WHEN saving, THE System SHALL maintain the `published` field in the JSON file
6. IF a save operation fails, THEN THE System SHALL display an error message and preserve the in-memory state
7. WHEN a save operation succeeds, THE System SHALL display a confirmation message

### Requirement 9: Publication Control

**User Story:** As a story creator, I want to control whether my story is visible to players, so that I can work on drafts before publishing.

#### Acceptance Criteria

1. WHEN a new story is created, THE System SHALL set the `published` field to "no" by default
2. WHEN the Metadata square in the Tile_Tree is clicked, THE System SHALL display the metadata editor
3. WHEN the metadata editor is opened, THE System SHALL display all story metadata fields as editable inputs including title, description, and published status
4. WHEN the metadata editor is opened, THE System SHALL display the current `published` status as an editable field
5. WHEN the `published` field is set to "yes", THE System SHALL make the story visible in normal play mode
6. WHEN the `published` field is set to "no", THE System SHALL hide the story from normal play mode
7. WHEN loading the story selection menu in play mode, THE System SHALL only display stories where `published` equals "yes"
8. WHEN loading the Edit menu, THE System SHALL display all stories created by the current user regardless of `published` status

### Requirement 10: Stuff and Credits Editing

**User Story:** As a story creator, I want to edit the stuff and credits sections of my story, so that I can provide additional context and attribution.

#### Acceptance Criteria

1. WHEN the Stuff square in the Tile_Tree is clicked, THE System SHALL display the stuff editor in the right panel
2. WHEN the stuff editor is displayed, THE System SHALL render the stuff content as an editable text area
3. WHEN the stuff content is modified, THE System SHALL update the story data in memory
4. WHEN the Credits square in the Tile_Tree is clicked, THE System SHALL display the credits editor in the right panel
5. WHEN the credits editor is displayed, THE System SHALL render the credits content as an editable text area
6. WHEN the credits content is modified, THE System SHALL update the story data in memory
7. WHEN saving the story, THE System SHALL persist the stuff and credits content to the JSON file

### Requirement 11: Media Upload

**User Story:** As a story creator, I want to upload images for my tiles, so that I can add visual content to my story.

#### Acceptance Criteria

1. WHEN the image upload button is clicked, THE System SHALL open a file selection dialog
2. WHEN an image file is selected, THE System SHALL upload the file to the `server/public/` directory
3. WHEN an image upload succeeds, THE System SHALL update the tile's picture field with the file path
4. WHEN an image upload succeeds, THE System SHALL display the uploaded image in the editor preview
5. IF an image upload fails, THEN THE System SHALL display an error message and maintain the previous picture value
6. WHEN replacing an existing image, THE System SHALL allow the user to select a new file

### Requirement 12: Data Validation

**User Story:** As a story creator, I want the system to validate my story data, so that I can ensure my story will function correctly.

#### Acceptance Criteria

1. WHEN a choice target is specified, THE System SHALL validate that the target tile id exists in the story
2. IF a choice target references a non-existent tile, THEN THE System SHALL display a warning message
3. WHEN saving a story, THE System SHALL validate that at least one tile exists
4. WHEN saving a story, THE System SHALL validate that tile id "1" exists
5. IF required validation fails, THEN THE System SHALL prevent the save operation and display specific error messages
6. WHEN a tile id is changed, THE System SHALL update all choice references to that tile throughout the story

### Requirement 13: Backward Compatibility

**User Story:** As a system administrator, I want existing stories to work with the new editor, so that legacy content remains functional.

#### Acceptance Criteria

1. WHEN loading an existing story without a `creator` field, THE System SHALL allow viewing but prevent editing until a creator is assigned
2. WHEN loading an existing story without a `published` field, THE System SHALL treat it as published ("yes") for backward compatibility
3. WHEN saving a story, THE System SHALL preserve all existing fields not managed by the editor
4. THE System SHALL maintain compatibility with the existing JSON schema for tiles, choices, and story metadata
5. WHEN playing a story in normal mode, THE System SHALL function identically to the pre-editor behavior for published stories

### Requirement 14: Video and Additional Media Support

**User Story:** As a story creator, I want to add video content to my tiles, so that I can create richer multimedia experiences.

#### Acceptance Criteria

1. WHEN a tile is displayed in the editor, THE System SHALL render the video URL as an editable text input
2. WHEN a video URL is provided, THE System SHALL display a video preview in the editor
3. WHEN the video upload button is clicked, THE System SHALL open a file selection dialog
4. WHEN a video file is selected, THE System SHALL upload the file to the `server/public/` directory
5. WHEN a video upload succeeds, THE System SHALL update the tile's video field with the file path
6. IF a video upload fails, THEN THE System SHALL display an error message and maintain the previous video value

### Requirement 15: Tile ID Management

**User Story:** As a story creator, I want to edit tile IDs, so that I can organize my story structure.

#### Acceptance Criteria

1. WHEN a tile is displayed in the editor, THE System SHALL render the tile ID as an editable text input
2. WHEN a tile ID is changed, THE System SHALL validate that the new ID is unique within the story
3. IF a duplicate tile ID is entered, THEN THE System SHALL display an warning message but accept the change
4. WHEN a tile ID is successfully changed, THE System SHALL update all choice references pointing to the old ID throughout the story
5. THE System SHALL prevent changing tile ID "1" to a different value
6. WHEN multiple tiles share the same ID (for randomness), THE System SHALL allow this configuration and display a visual indicator

### Requirement 16: Image Map Editing

**User Story:** As a story creator, I want to define clickable regions on images, so that I can create interactive image-based navigation.

#### Acceptance Criteria

1. WHEN a tile is displayed in the editor, THE System SHALL provide an interface for adding image map regions
2. WHEN adding an image map region, THE System SHALL allow specifying coordinates (x1, y1, x2, y2)
3. WHEN adding an image map region, THE System SHALL allow specifying the target tile ID
4. WHEN adding an image map region, THE System SHALL allow specifying the requires, uses, and item fields
5. THE System SHALL provide an "Add Region" button for image maps
6. THE System SHALL provide a "Remove Region" button for each image map region
7. WHEN an image is present, THE System SHALL optionally display a visual overlay for drawing/editing map regions
8. WHEN image map regions are modified, THE System SHALL update the tile data in memory
