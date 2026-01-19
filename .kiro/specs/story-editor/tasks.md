# Implementation Plan: Story Editor

## Overview

This implementation plan breaks down the Story Editor feature into discrete coding tasks that build incrementally. The approach starts with core server-side infrastructure, then adds client-side components, and finally integrates everything together. Each major component includes property-based tests to validate correctness properties from the design document.

## Tasks

- [x] 1. Set up server-side infrastructure and API endpoints
  - [x] 1.1 Create edit menu route handler
    - Implement `GET /edit` endpoint that reuses existing hexagon rendering
    - Filter stories by creator field matching SESSION cookie
    - Mark user's stories as clickable, others as greyed-out
    - Add "Create New Story" hexagon
    - _Requirements: 1.2, 2.2, 3.1-3.6_

  - [x] 1.2 Create load story route handler
    - Implement `GET /edit/story/:name` endpoint
    - Load story JSON from `server/private/` directory
    - Verify creator field matches SESSION cookie (authorization)
    - Return complete story JSON or 403 error
    - _Requirements: 2.3, 2.4_

  - [x] 1.3 Write property test for continue code identification
    - **Property 1: Continue Code Identification**
    - **Validates: Requirements 1.2**

  - [x] 1.4 Write property test for story filtering by creator
    - **Property 3: Story Filtering by Creator**
    - **Validates: Requirements 2.2**

  - [x] 1.5 Write property test for edit authorization check
    - **Property 4: Edit Authorization Check**
    - **Validates: Requirements 2.3**

- [x] 2. Implement story creation and saving functionality
  - [x] 2.1 Create new story route handler
    - Implement `POST /edit/story/new` endpoint
    - Validate story name format
    - Create initial story structure with tile id "1"
    - Set creator field to SESSION cookie value
    - Set published field to "no" by default
    - Write JSON file to `server/private/` directory
    - _Requirements: 2.1, 4.2, 9.1_

  - [x] 2.2 Create save story route handler
    - Implement `POST /edit/story/:name` endpoint
    - Validate complete story structure
    - Preserve creator and unknown fields
    - Calculate NbTiles from Tiles array length
    - Write JSON file atomically (temp file + rename)
    - Update stories cache via existing loadStory function
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 13.3_

  - [x] 2.3 Write property test for creator field assignment
    - **Property 2: Creator Field Assignment**
    - **Validates: Requirements 2.1**

  - [x] 2.4 Write property test for new story published default
    - **Property 9: New Story Published Default**
    - **Validates: Requirements 9.1**

  - [x] 2.5 Write property test for save persistence
    - **Property 7: Save Persistence**
    - **Validates: Requirements 8.2**

- [x] 3. Implement validation and media upload
  - [x] 3.1 Create story validation module
    - Implement validateStory function with all validation rules
    - Check for at least one tile and tile id "1"
    - Validate all choice and map to_tile references exist
    - Validate tile IDs are unique (except intentional duplicates)
    - Prevent changing tile id "1" to different value
    - Return detailed error array with field paths
    - _Requirements: 12.1, 12.3, 12.4, 15.2, 15.5_

  - [x] 3.2 Create media upload route handler
    - Implement `POST /edit/upload` endpoint using multer middleware
    - Validate file types (images and videos only)
    - Generate unique filenames to prevent conflicts
    - Save files to `server/public/` directory structure
    - Return public path for use in tile data
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 3.3 Write property test for choice target validation
    - **Property 13: Choice Target Validation**
    - **Validates: Requirements 12.1**

  - [x] 3.4 Write property test for minimum tile validation
    - **Property 14: Minimum Tile Validation**
    - **Validates: Requirements 12.3**

  - [x] 3.5 Write property test for tile one validation
    - **Property 15: Tile One Validation**
    - **Validates: Requirements 12.4**

  - [x] 3.6 Write property test for media upload path assignment
    - **Property 12: Media Upload Path Assignment**
    - **Validates: Requirements 11.1-11.4**

- [x] 4. Checkpoint - Test server-side functionality
  - Ensure all server routes work correctly
  - Verify validation catches invalid data
  - Test file upload and storage
  - Ask the user if questions arise

- [x] 5. Create client-side editor interface structure
  - [x] 5.1 Create main story editor HTML template
    - Design dual-panel layout (tile tree left, content editor right)
    - Include CSS for responsive design and visual consistency
    - Add JavaScript module structure for components
    - Implement basic navigation between views
    - _Requirements: 7.1, 7.12_

  - [x] 5.2 Implement tile tree component
    - Render top squares for Metadata, Stuff, Credits
    - Render tile nodes with IDs in vertical layout
    - Draw SVG arrows showing choice connections
    - Handle click events for navigation
    - Highlight currently selected tile/view
    - Add "Add Tile" button functionality
    - _Requirements: 7.2-7.11_

  - [x] 5.3 Write property test for auto-select first tile
    - **Property 5: Auto-Select First Tile**
    - **Validates: Requirements 4.1**

  - [x] 5.4 Write property test for new story initial tile
    - **Property 6: New Story Initial Tile**
    - **Validates: Requirements 4.2**

- [x] 6. Implement tile editor component
  - [x] 6.1 Create tile editor form interface
    - Implement editable fields for all tile properties
    - Add text inputs for id, title, mood, achievement
    - Add textarea for text content
    - Add URL inputs for sound, music, video
    - Add checkbox for loop music
    - Add file upload buttons for picture and video
    - _Requirements: 5.1-5.12, 15.1_

  - [x] 6.2 Implement choice list editor
    - Create dynamic list of choice forms
    - Add/remove choice buttons
    - Editable fields for text, to_tile, requires, uses, item
    - Support comma-separated arrays for multi-item fields
    - Dropdown for disable option (grey/invisible)
    - _Requirements: 6.1-6.8_

  - [x] 6.3 Implement image map editor
    - Create dynamic list of map region forms
    - Add/remove region buttons
    - Editable fields for shape, coords, to_tile
    - Support requires, uses, item fields
    - Dropdown for hint option (pointer/invisible/reveal)
    - _Requirements: 16.1-16.8_

  - [x] 6.4 Write property test for unique tile ID validation
    - **Property 19: Unique Tile ID Validation**
    - **Validates: Requirements 15.2**

  - [x] 6.5 Write property test for tile one ID protection
    - **Property 20: Tile One ID Protection**
    - **Validates: Requirements 15.5**

- [x] 7. Implement metadata, stuff, and credits editors
  - [x] 7.1 Create metadata editor component
    - Implement form for story-level properties
    - Editable fields for Name, Description
    - Dropdown for published status (yes/no)
    - Read-only display for creator and NbTiles
    - _Requirements: 9.2-9.4_

  - [x] 7.2 Create stuff editor component
    - Create dynamic list of stuff item forms
    - Add/remove item buttons
    - Editable fields for key, name, description, code
    - Validate unique keys within story
    - _Requirements: 10.1-10.7_

  - [x] 7.3 Create credits editor component
    - Implement rich textarea for credits content
    - Support HTML formatting
    - Preview functionality
    - _Requirements: 10.1-10.7_

  - [x] 7.4 Write property test for published filtering in play mode
    - **Property 10: Published Filtering in Play Mode**
    - **Validates: Requirements 9.5-9.7**

  - [x] 7.5 Write property test for edit mode shows all user stories
    - **Property 11: Edit Mode Shows All User Stories**
    - **Validates: Requirements 9.8**

- [x] 8. Implement reference management and validation
  - [x] 8.1 Create tile ID reference update system
    - Implement function to find all references to a tile ID
    - Update choice to_tile and map to_tile references
    - Handle tile ID changes throughout story
    - Prevent orphaned references
    - _Requirements: 12.6, 15.4_

  - [x] 8.2 Implement client-side validation
    - Real-time validation as user types
    - Display inline error messages
    - Prevent save when validation errors exist
    - Show validation summary
    - _Requirements: 12.1-12.5_

  - [x] 8.3 Write property test for tile ID reference update
    - **Property 16: Tile ID Reference Update**
    - **Validates: Requirements 12.6**

  - [x] 8.4 Write property test for intentional duplicate IDs allowed
    - **Property 21: Intentional Duplicate IDs Allowed**
    - **Validates: Requirements 15.6**

- [x] 9. Implement save functionality and error handling
  - [x] 9.1 Create save operation with validation
    - Validate story before sending to server
    - Send complete story JSON to save endpoint
    - Handle server validation errors
    - Display success/error messages
    - Track unsaved changes state
    - _Requirements: 8.1-8.7_

  - [x] 9.2 Implement error handling throughout interface
    - Network error handling with retry
    - File upload error handling
    - Authorization error handling
    - Preserve unsaved changes in localStorage
    - User-friendly error messages
    - _Requirements: 8.6_

  - [x] 9.3 Write property test for JSON structure preservation
    - **Property 8: JSON Structure Preservation**
    - **Validates: Requirements 8.3**

  - [x] 9.4 Write property test for unknown field preservation
    - **Property 18: Unknown Field Preservation**
    - **Validates: Requirements 13.3**

- [x] 10. Implement backward compatibility and legacy support
  - [x] 10.1 Handle legacy stories without creator field
    - Detect stories missing creator field
    - Allow viewing but prevent editing
    - Provide UI to assign creator
    - _Requirements: 13.1_

  - [x] 10.2 Handle legacy stories without published field
    - Default to published="yes" for legacy stories
    - Maintain backward compatibility in play mode
    - Update stories with published field when saved
    - _Requirements: 13.2_

  - [x] 10.3 Write property test for legacy story published default
    - **Property 17: Legacy Story Published Default**
    - **Validates: Requirements 13.2**

- [x] 11. Integration and final wiring
  - [x] 11.1 Connect all components together
    - Wire tile tree navigation to content editors
    - Connect save button to all editor components
    - Implement view switching logic
    - Handle component state management
    - _Requirements: All UI requirements_

  - [x] 11.2 Integrate with existing Storiz infrastructure
    - Ensure edit menu uses existing hexagon rendering
    - Maintain compatibility with existing story format
    - Preserve existing play mode functionality
    - Test with existing stories
    - _Requirements: 13.4, 13.5_

  - [x] 11.3 Add final polish and user experience improvements
    - Loading indicators for async operations
    - Keyboard shortcuts for common actions
    - Auto-save draft functionality
    - Confirmation dialogs for destructive actions
    - Responsive design for different screen sizes

- [x] 12. Final checkpoint - Complete system testing
  - Test complete create/edit/save workflow
  - Verify all validation rules work correctly
  - Test media upload and display
  - Verify published filtering works in play mode
  - Test backward compatibility with existing stories
  - Ensure all tests pass, ask the user if questions arise

- [ ] 13. Redesign editor interface to 3-panel layout
  - [x] 13.1 Restructure HTML layout for 3-panel design
    - Keep left panel (tile tree) unchanged
    - Add middle panel for action buttons
    - Convert right panel to play mode preview
    - Update CSS for responsive 3-panel layout
    - _Requirements: Enhanced UX_

  - [x] 13.2 Implement middle panel action buttons
    - Generate dynamic buttons based on current tile state
    - "Add Picture" / "Change Picture" buttons
    - "Add Choice" / "Edit Choice N" / "Remove Choice N" buttons
    - "Add Map Region" / "Edit Map Region N" / "Remove Map Region N" buttons
    - Buttons for title, text, video, sound, music, mood, achievement
    - Flat list in play mode order
    - _Requirements: Enhanced UX_

  - [x] 13.3 Implement play mode preview in right panel
    - Render tile exactly as player would see it
    - Apply proper styling, background, mood CSS
    - Show functional choices as clickable buttons
    - Display image maps with all regions revealed
    - Add play/pause controls for audio (not auto-playing)
    - Navigate to connected tiles when choices/maps clicked
    - _Requirements: Enhanced UX_

  - [x] 13.4 Create overlay edit forms for specific features
    - Show edit form overlay when action button clicked
    - Form contains only fields for that specific feature
    - Save button returns to play mode preview
    - Cancel button discards changes
    - Maintain current validation and error handling
    - _Requirements: Enhanced UX_

  - [x] 13.5 Update navigation and state management
    - Modify tile selection to show play mode by default
    - Track current editing state (play mode vs editing feature)
    - Update save functionality to work with new interface
    - Preserve unsaved changes handling
    - _Requirements: Enhanced UX_

  - [x] 13.6 Test and refine new interface
    - Verify all existing functionality works in new layout
    - Test responsive design on different screen sizes
    - Ensure smooth transitions between play and edit modes
    - Validate user experience improvements
    - _Requirements: Enhanced UX_

## Notes

- All tasks are required for comprehensive implementation from the start
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design
- Unit tests focus on specific examples and edge cases
- Server-side tasks come first to establish API foundation
- Client-side tasks build incrementally from basic structure to full functionality
- Integration tasks ensure all components work together seamlessly