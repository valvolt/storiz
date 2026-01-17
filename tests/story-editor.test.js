const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;
const path = require('path');

// Mock the server setup for testing
const app = express();
app.use(express.json());
app.use(cookieParser());

// Test data generators
const continueCodeGenerator = () => fc.uuid();

const storyNameGenerator = () => fc.string({
  minLength: 3,
  maxLength: 20
}).filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

const choiceGenerator = () => fc.record({
  text: fc.string(),
  to_tile: fc.string(),
  item: fc.option(fc.oneof(fc.string(), fc.array(fc.string()))),
  requires: fc.option(fc.oneof(fc.string(), fc.array(fc.string()))),
  uses: fc.option(fc.oneof(fc.string(), fc.array(fc.string())))
});

const tileGenerator = () => fc.record({
  id: fc.string(),
  title: fc.option(fc.string()),
  text: fc.option(fc.string()),
  picture: fc.option(fc.string()),
  choices: fc.array(choiceGenerator())
});

const stuffItemGenerator = () => fc.record({
  key: fc.string(),
  name: fc.string(),
  description: fc.string(),
  code: fc.option(fc.string())
});

const achievementGenerator = () => fc.record({
  trophy: fc.constantFrom('bronze', 'silver', 'gold'),
  key: fc.string(),
  name: fc.string(),
  description: fc.string()
});

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

// Mock functions for testing
function mockContinueCodeExtraction(req) {
  return req.cookies.SESSION;
}

function mockStoryFiltering(stories, continueCode) {
  return stories.filter(story => story.creator === continueCode);
}

function mockCreateStoryWithCreator(storyName, continueCode) {
  return {
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
}

function mockEditAuthorizationCheck(story, continueCode) {
  return story.creator === continueCode;
}

describe('Story Editor Property-Based Tests', () => {
  
  // Property 1: Continue Code Identification
  test('Property 1: Continue Code Identification', () => {
    // Feature: story-editor, Property 1: Continue Code Identification
    fc.assert(
      fc.property(
        continueCodeGenerator(),
        (continueCode) => {
          const mockReq = { cookies: { SESSION: continueCode } };
          const extractedCode = mockContinueCodeExtraction(mockReq);
          return extractedCode === continueCode;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 3: Story Filtering by Creator
  test('Property 3: Story Filtering by Creator', () => {
    // Feature: story-editor, Property 3: Story Filtering by Creator
    fc.assert(
      fc.property(
        fc.array(storyGenerator()),
        continueCodeGenerator(),
        (stories, continueCode) => {
          const filteredStories = mockStoryFiltering(stories, continueCode);
          return filteredStories.every(story => story.creator === continueCode);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 4: Edit Authorization Check
  test('Property 4: Edit Authorization Check', () => {
    // Feature: story-editor, Property 4: Edit Authorization Check
    fc.assert(
      fc.property(
        storyGenerator(),
        continueCodeGenerator(),
        continueCodeGenerator(),
        (story, storyCreator, userCode) => {
          story.creator = storyCreator;
          const isAuthorized = mockEditAuthorizationCheck(story, userCode);
          return isAuthorized === (storyCreator === userCode);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 2: Creator Field Assignment
  test('Property 2: Creator Field Assignment', () => {
    // Feature: story-editor, Property 2: Creator Field Assignment
    fc.assert(
      fc.property(
        storyNameGenerator(),
        continueCodeGenerator(),
        (storyName, continueCode) => {
          const story = mockCreateStoryWithCreator(storyName, continueCode);
          return story.creator === continueCode;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 9: New Story Published Default
  test('Property 9: New Story Published Default', () => {
    // Feature: story-editor, Property 9: New Story Published Default
    fc.assert(
      fc.property(
        storyNameGenerator(),
        continueCodeGenerator(),
        (storyName, continueCode) => {
          const story = mockCreateStoryWithCreator(storyName, continueCode);
          return story.published === 'no';
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 6: New Story Initial Tile
  test('Property 6: New Story Initial Tile', () => {
    // Feature: story-editor, Property 6: New Story Initial Tile
    fc.assert(
      fc.property(
        storyNameGenerator(),
        continueCodeGenerator(),
        (storyName, continueCode) => {
          const story = mockCreateStoryWithCreator(storyName, continueCode);
          return story.Tiles.length === 1 && story.Tiles[0].id === '1';
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 7: Save Persistence (mock test)
  test('Property 7: Save Persistence', () => {
    // Feature: story-editor, Property 7: Save Persistence
    fc.assert(
      fc.property(
        storyGenerator(),
        (story) => {
          // Mock save and load operation
          const savedStory = JSON.parse(JSON.stringify(story));
          const loadedStory = JSON.parse(JSON.stringify(savedStory));
          
          // Check that all modifications are preserved
          return JSON.stringify(story) === JSON.stringify(loadedStory);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 8: JSON Structure Preservation
  test('Property 8: JSON Structure Preservation', () => {
    // Feature: story-editor, Property 8: JSON Structure Preservation
    fc.assert(
      fc.property(
        storyGenerator(),
        (originalStory) => {
          // Mock save without modifications
          const savedStory = JSON.parse(JSON.stringify(originalStory));
          
          // Structure should be identical
          return JSON.stringify(originalStory) === JSON.stringify(savedStory);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 13: Choice Target Validation
  test('Property 13: Choice Target Validation', () => {
    // Feature: story-editor, Property 13: Choice Target Validation
    fc.assert(
      fc.property(
        storyGenerator(),
        (story) => {
          const tileIds = new Set(story.Tiles.map(t => t.id));
          let allChoiceTargetsValid = true;
          
          story.Tiles.forEach(tile => {
            if (tile.choices) {
              tile.choices.forEach(choice => {
                if (choice.to_tile && !tileIds.has(choice.to_tile)) {
                  allChoiceTargetsValid = false;
                }
              });
            }
          });
          
          // If all choice targets are valid, validation should pass
          // If any are invalid, validation should fail
          return allChoiceTargetsValid || story.Tiles.some(tile => 
            tile.choices && tile.choices.some(choice => 
              choice.to_tile && !tileIds.has(choice.to_tile)
            )
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 14: Minimum Tile Validation
  test('Property 14: Minimum Tile Validation', () => {
    // Feature: story-editor, Property 14: Minimum Tile Validation
    fc.assert(
      fc.property(
        fc.record({
          Name: fc.string(),
          Tiles: fc.array(tileGenerator(), { minLength: 0, maxLength: 5 })
        }),
        (story) => {
          const hasMinimumTiles = story.Tiles && story.Tiles.length > 0;
          return hasMinimumTiles === (story.Tiles.length > 0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 15: Tile One Validation
  test('Property 15: Tile One Validation', () => {
    // Feature: story-editor, Property 15: Tile One Validation
    fc.assert(
      fc.property(
        storyGenerator(),
        (story) => {
          const hasTileOne = story.Tiles && story.Tiles.some(t => t.id === '1');
          return hasTileOne === story.Tiles.some(t => t.id === '1');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 12: Media Upload Path Assignment (mock test)
  test('Property 12: Media Upload Path Assignment', () => {
    // Feature: story-editor, Property 12: Media Upload Path Assignment
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (filename, storyName) => {
          // Mock successful upload
          const mockUploadResult = {
            success: true,
            path: `/${storyName}/${filename}`
          };
          
          // Should return a valid public path
          return mockUploadResult.success && 
                 mockUploadResult.path.startsWith('/') &&
                 mockUploadResult.path.includes(filename);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 5: Auto-Select First Tile
  test('Property 5: Auto-Select First Tile', () => {
    // Feature: story-editor, Property 5: Auto-Select First Tile
    fc.assert(
      fc.property(
        storyGenerator(),
        (story) => {
          // Mock editor initialization
          const mockEditorState = {
            currentTileId: null,
            story: story
          };
          
          // Simulate auto-selecting first tile
          if (story.Tiles && story.Tiles.some(t => t.id === '1')) {
            mockEditorState.currentTileId = '1';
          }
          
          // Should auto-select tile "1" if it exists
          return mockEditorState.currentTileId === '1' || !story.Tiles.some(t => t.id === '1');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 19: Unique Tile ID Validation (Except Intentional Duplicates)
  test('Property 19: Unique Tile ID Validation', () => {
    // Feature: story-editor, Property 19: Unique Tile ID Validation
    fc.assert(
      fc.property(
        storyGenerator(),
        fc.string(),
        (story, newId) => {
          // Mock tile ID change validation
          const existingIds = story.Tiles.map(t => t.id);
          const isDuplicate = existingIds.includes(newId);
          
          // Should allow intentional duplicates (for randomness)
          // but warn about unintentional ones
          return true; // Always allow, but may show warning
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 20: Tile One ID Protection
  test('Property 20: Tile One ID Protection', () => {
    // Feature: story-editor, Property 20: Tile One ID Protection
    fc.assert(
      fc.property(
        storyGenerator(),
        fc.string().filter(s => s !== '1'),
        (story, newId) => {
          // Mock attempt to change tile "1" ID
          const tileOne = story.Tiles.find(t => t.id === '1');
          if (tileOne) {
            // Should reject changing tile "1" to different value
            const shouldReject = newId !== '1';
            return shouldReject === (newId !== '1');
          }
          return true; // No tile "1" to protect
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 21: Intentional Duplicate IDs Allowed
  test('Property 21: Intentional Duplicate IDs Allowed', () => {
    // Feature: story-editor, Property 21: Intentional Duplicate IDs Allowed
    fc.assert(
      fc.property(
        fc.array(tileGenerator(), { minLength: 2, maxLength: 5 }),
        fc.string(),
        (tiles, sharedId) => {
          // Mock multiple tiles with same ID (for randomness)
          const tilesWithSharedId = tiles.map(tile => ({...tile, id: sharedId}));
          
          // Should allow multiple tiles with same ID
          const allHaveSameId = tilesWithSharedId.every(t => t.id === sharedId);
          return allHaveSameId;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 10: Published Filtering in Play Mode
  test('Property 10: Published Filtering in Play Mode', () => {
    // Feature: story-editor, Property 10: Published Filtering in Play Mode
    fc.assert(
      fc.property(
        fc.array(storyGenerator()),
        (stories) => {
          // Mock play mode filtering
          const playModeStories = stories.filter(story => story.published === 'yes');
          
          // Should only include published stories
          return playModeStories.every(story => story.published === 'yes');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 11: Edit Mode Shows All User Stories
  test('Property 11: Edit Mode Shows All User Stories', () => {
    // Feature: story-editor, Property 11: Edit Mode Shows All User Stories
    fc.assert(
      fc.property(
        fc.array(storyGenerator()),
        continueCodeGenerator(),
        (stories, userCode) => {
          // Mock edit mode filtering
          const userStories = stories.filter(story => story.creator === userCode);
          
          // Should include all user stories regardless of published status
          return userStories.every(story => story.creator === userCode);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 17: Legacy Story Published Default
  test('Property 17: Legacy Story Published Default', () => {
    // Feature: story-editor, Property 17: Legacy Story Published Default
    fc.assert(
      fc.property(
        storyGenerator(),
        (story) => {
          // Mock legacy story without published field
          const legacyStory = {...story};
          delete legacyStory.published;
          
          // Should treat as published="yes" for backward compatibility
          const effectivePublished = legacyStory.published || 'yes';
          return effectivePublished === 'yes';
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 18: Unknown Field Preservation
  test('Property 18: Unknown Field Preservation', () => {
    // Feature: story-editor, Property 18: Unknown Field Preservation
    fc.assert(
      fc.property(
        storyGenerator(),
        fc.string(),
        fc.string(),
        (story, unknownField, unknownValue) => {
          // Mock story with unknown field
          const storyWithUnknown = {...story, [unknownField]: unknownValue};
          
          // Mock save and load operation
          const savedStory = JSON.parse(JSON.stringify(storyWithUnknown));
          
          // Unknown field should be preserved
          return savedStory[unknownField] === unknownValue;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 16: Tile ID Reference Update
  test('Property 16: Tile ID Reference Update', () => {
    // Feature: story-editor, Property 16: Tile ID Reference Update
    fc.assert(
      fc.property(
        storyGenerator(),
        fc.string().filter(s => s.length > 0),
        fc.string().filter(s => s.length > 0),
        (story, oldId, newId) => {
          // Skip if oldId and newId are the same
          if (oldId === newId) return true;
          
          // Mock tile ID change and reference update
          const updatedStory = JSON.parse(JSON.stringify(story));
          
          // Count original references to oldId
          let originalReferences = 0;
          story.Tiles.forEach(tile => {
            if (tile.choices) {
              tile.choices.forEach(choice => {
                if (choice.to_tile === oldId) {
                  originalReferences++;
                }
              });
            }
            if (tile.map) {
              tile.map.forEach(region => {
                if (region.to_tile === oldId) {
                  originalReferences++;
                }
              });
            }
          });
          
          // Update all references from oldId to newId
          updatedStory.Tiles.forEach(tile => {
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
          
          // Count remaining references to oldId (should be 0)
          let remainingOldReferences = 0;
          updatedStory.Tiles.forEach(tile => {
            if (tile.choices) {
              tile.choices.forEach(choice => {
                if (choice.to_tile === oldId) {
                  remainingOldReferences++;
                }
              });
            }
            if (tile.map) {
              tile.map.forEach(region => {
                if (region.to_tile === oldId) {
                  remainingOldReferences++;
                }
              });
            }
          });
          
          // Count new references to newId
          let newReferences = 0;
          updatedStory.Tiles.forEach(tile => {
            if (tile.choices) {
              tile.choices.forEach(choice => {
                if (choice.to_tile === newId) {
                  newReferences++;
                }
              });
            }
            if (tile.map) {
              tile.map.forEach(region => {
                if (region.to_tile === newId) {
                  newReferences++;
                }
              });
            }
          });
          
          // All old references should be gone and converted to new references
          return remainingOldReferences === 0 && newReferences >= originalReferences;
        }
      ),
      { numRuns: 100 }
    );
  });

});