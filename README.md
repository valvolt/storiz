# storiz
A simple engine for creating HTML5 choice-based games. Think super-simple Visual Novel. This v2 version has been rebuilt from the ground up, in javascript.

## User interface
You are first greeted with a 'New Game' / 'Continue' screen. By clicking 'New Game' a new user is created for you.

![](https://raw.githubusercontent.com/valvolt/storiz/main/server/public/screenshots/start.png)

Just select next the story you want to play.

![](https://raw.githubusercontent.com/valvolt/storiz/main/server/public/screenshots/stories.png)

Each story let you choose your next action. Usually you just have to click on the button of your choice; occasionally certain areas of the picture are clickable as well.

At the end of the story you will have the possibility to restart or to choose another story.

![](https://raw.githubusercontent.com/valvolt/storiz/main/server/public/screenshots/story.png)

At any point in time, click the PROFILE link at the bottom of the screen. Keep a copy of your unique code, you will need it if you want to 'Continue' at a later time. On that screen you can also see the achievements you have unlocked.

![](https://raw.githubusercontent.com/valvolt/storiz/main/server/public/screenshots/profile.png)

With the CREDITS link, you can at any time check information about the story

![](https://raw.githubusercontent.com/valvolt/storiz/main/server/public/screenshots/credits.png)

Your progress is saved automatically. Which makes cheating harder :-)

## Run your own server

### From source
```
git clone https://github.com/valvolt/storiz
cd storiz
npm install
node server/server.js
```
Then on your browser, visit `http://localhost:8000`

### With docker-compose
```
git clone https://github.com/valvolt/storiz
cd storiz
docker-compose up --build
```
Then on your browser, visit `http://localhost:8000`

### From dockerhub
```
docker run -d -p 8000:8000 valvolt2/storiz:2.1
```
Then on your browser, visit `http://localhost:8000`

## Create your own stories (experimental)
You can add your own stories. For that, on the home page, click 'Create Story'. Hopefully the UI is understandable. Please open issues to report bugs (I know there are a few).

## Create your own stories (classic way)
You can add your own stories. For that, you will need to create and store your own .json file into the `server/private/` folder, and store your media files in a subdirectory of `server/public/`.

The built-in story 'Tutorial' will give you a full walkthrough of how to create your story.

## Limitations / on the TODO list
It it possible to brute-force public resources. If that's a problem for you, rename your media with non-guessable names.

## Special Thanks
Special thanks to Anne 'Shinari' Radunski for her enthusiasm and support with the UX. Some of her work has been integrated to this v2 version.

Thanks to Henrik Plate for his support and suggestions.

Thanks to Jasser for his PRs.

And thanks to You for playing :-)
