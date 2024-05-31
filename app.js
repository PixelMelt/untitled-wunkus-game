console.log(`load`)


class gameController {
    constructor() {
        this.mainGameFrame = new PIXI.Application({
            resizeTo: window,
            backgroundColor: 0xFFFFFF,
        }); // contains all game elements
        
        this.foreground = new PIXI.Container(); // contains foreground elements including player
        
        this.background = new PIXI.Container(); // contains background elements including tiles

        this.mainGameFrame.stage.addChild(this.background);
        this.mainGameFrame.stage.addChild(this.foreground);

        document.getElementById(`game`).appendChild(this.mainGameFrame.view);

        this.playerKeyInput = [];

        this.mapChangeTimeout = 0;

        // initialize the game
        this.init();
    }
    
    init = async function() {
        this.createPlayer();
        await this.loadMap(`default`, true);
        this.detectInput();

        // start the game loop
        this.mainGameFrame.ticker.add(delta => this.gameTick(delta));
    }

    gameTick() {
        // keep the player centered on the screen regardless of the window size
        this.player.centerPlayer(this.mainGameFrame);

        // send the player's input to the movePlayer function
        this.playerKeyInput.forEach(key => this.movePlayer(key));

        // animate the player
        this.player.animatePlayer(this.map.accelx, this.map.accely);

        //  tick the map
        this.map.tick();
    }

    detectInput() {
        // detect key input
        window.addEventListener(`keydown`, event => {
            // add the key to the playerKeyInput array if it isn't already in there
            if (!this.playerKeyInput.includes(event.key)) {
                this.playerKeyInput.push(event.key);
            }
        });

        window.addEventListener(`keyup`, event => {
            // remove the key from the playerKeyInput array
            this.playerKeyInput = this.playerKeyInput.filter(key => key !== event.key);
        });
    }

    movePlayer(direction) {
        switch (direction) {
            case `ArrowUp`:
                this.map.accely += this.player.sprite.acceleration;
                break;
            case `ArrowDown`:
                this.map.accely -= this.player.sprite.acceleration;
                break;
            case `ArrowLeft`:
                this.map.accelx += this.player.sprite.acceleration;
                break;
            case `ArrowRight`:
                this.map.accelx -= this.player.sprite.acceleration;
                break;
            case `1`:
                this.loadMap(`default`);
                break;
            case `2`:
                this.loadMap(`one`);
                break;
        }
    }

    createPlayer() {
        this.player = new Player();
        this.foreground.addChild(this.player.sprite);
    }


    async loadMap(mapName, firstLoad = false) {
        if(this.mapChangeTimeout + 1000 > Date.now()){
            return;
        }
        this.mapChangeTimeout = Date.now();

        // remove the old map
        let oldmapexists = false;
        let oldmap = this.map;
        if(this.map){
            oldmapexists = true;
        }

        // load the map json file
        let mapjson = await fetch(`./assets/maps/${mapName}.json`)
        .then(response => response.json());

        // create a new background object using the json data
        this.map = new Background(mapjson, this.mainGameFrame, this);
        
        // execute the wipe effect
        this.wipe = new wipeEffect(this.mainGameFrame, firstLoad);
        this.foreground.addChild(this.wipe.wipe);

        console.log(`load map`);

        if(!firstLoad){
            setTimeout(() => {
                if(oldmapexists){
                    console.log(`remove old map`);
                    this.background.removeChild(oldmap.mapContainer);
                }
                this.background.addChild(this.map.mapContainer);
            }, 700);
        } else {
            this.background.addChild(this.map.mapContainer);
        }

    }
    
}


// makes a white rectangle that eases across the screen, completely covering the screen for a wipe effect
class wipeEffect {
    constructor(mainGameFrame, coverScreenStart = false) {
        this.wipe = new PIXI.Graphics();
        this.wipe.beginFill(0xFFFFFF);
        this.wipe.drawRect(0, 0, 100, 100);
        this.wipe.endFill();
        this.wipe.width = mainGameFrame.screen.width * 2;
        this.wipe.height = mainGameFrame.screen.height;

        if(coverScreenStart){
            // console.log(`cover screen`);
            this.wipe.x = 0;
        }else{
            this.wipe.x = (-mainGameFrame.screen.width * 2);
        }

        this.wipe.y = 0;
        this.init();
    }

    tick() {
        // ease the wipe across the screen
        this.wipe.x += 20;
        
        if(this.wipe.x > this.wipe.width){
            console.log(`wipe done`);
            this.ticker.stop();
            this.wipe.destroy();
        }
    }

    init() {
        // tick the wipe effect until it is off the screen
        this.ticker = new PIXI.Ticker();
        this.ticker.add(delta => this.tick(delta));
        this.ticker.start();
    }
}


// the background class will be in charge of creating the background tiles, it will store the map data in json format
class Background {
    constructor(mapjson, mainGameFrame, game, debugTiles = true) {
        // create the map container
        this.mapContainer = new PIXI.Container();

        // store the map json data
        this.mapjson = mapjson;

        // name of the map
        this.mapName = this.mapjson.name;
        
        // height and width of the map in tiles
        this.mapWidth = this.mapjson.width;
        this.mapHeight = this.mapjson.height;

        // mapContainer height and width based on tile constraints
        this.mapContainer.width = this.mapWidth * 100;
        this.mapContainer.height = this.mapHeight * 100;

        // array of tiles
        this.mapTiles = this.mapjson.tiles;

        // player starting position
        this.player = this.mapjson.player;

        this.accelx = 0;
        this.accely = 0;
        
        this.maxSpeed = 3;

        // create the map tiles from the json data
        this.mapTiles.forEach(tile => {
            // create a new sprite from the tile image
            let tileSprite = PIXI.Sprite.from(`./assets/tiles/${tile.name}.png`);

            // set the tile's position, if the map is 10x10, the first tile will be at 0,0 and the last tile will be at 9,9
            // each tile is 100x100 pixels
            
            // set the tile's position
            tileSprite.x = tile.x * 100;
            tileSprite.y = tile.y * 100;

            // set the tile's size
            tileSprite.width = 100;
            tileSprite.height = 100;

            // draw a rectangle around the tile if debugTiles is true
            if (debugTiles) {
                let tileOutline = new PIXI.Graphics();
                tileOutline.lineStyle(2, 0xFF0000);
                tileOutline.drawRect(tileSprite.x, tileSprite.y, tileSprite.width, tileSprite.height);
                this.mapContainer.addChild(tileOutline);
            }

            // add the tile to the map container
            this.mapContainer.addChild(tileSprite);
        });

        if (debugTiles) {
            // draw a blue rectangle around the map container
            let mapContainerOutline = new PIXI.Graphics();
            mapContainerOutline.lineStyle(2, 0x0000FF);
            mapContainerOutline.drawRect(0, 0, this.mapWidth * 100, this.mapHeight * 100);
            this.mapContainer.addChild(mapContainerOutline);
        }

        // figure out where the map should be positioned using the players starting position
        // the player should always be in the center of the screen
        // plus offset the map container by half the players sprite size
        this.mapContainer.x = (mainGameFrame.screen.width / 2 - this.player.x * 100) - game.player.sprite.width / 2;
        this.mapContainer.y = (mainGameFrame.screen.height / 2 - this.player.y * 100) - game.player.sprite.height / 2;
    }

    // returns the tile that the player is currently on relative to the map container
    locatePlayerTile() {
        // Adjusted calculation to ensure correct orientation and handling of potential inversion
        let playerXRelativeToMap = this.player.x - this.mapContainer.x;
        let playerYRelativeToMap = this.player.y - this.mapContainer.y;
    
        // Ensure positive values for grid coordinates by taking absolute value if necessary
        let playerGridX = Math.abs(Math.floor(playerXRelativeToMap / 100));
        let playerGridY = Math.abs(Math.floor(playerYRelativeToMap / 100));

        // invert the coordinates because canvas coordinates are inverted
        playerGridX = this.mapWidth - playerGridX;
        playerGridY = this.mapHeight - playerGridY;
    
        // Return the corrected tile coordinates
        return { x: playerGridX - 1, y: playerGridY + 1 };
    }
    

    tick() {
        // move the map container by its acceleration
        this.moveMap();
        // degrade the acceleration
        this.accelx *= 0.95;
        this.accely *= 0.95;
    }

    moveMap() {
        // move the map container, make sure it doesn't go past the top speed per frame, make it work with negative acceleration too

        // x velocity
        if(this.accelx > 0){
            this.mapContainer.x += Math.min(this.accelx, this.maxSpeed);
        }
        else if(this.accelx < 0){
            this.mapContainer.x += Math.max(this.accelx, -this.maxSpeed);
        }

        // y velocity
        if(this.accely > 0){
            this.mapContainer.y += Math.min(this.accely, this.maxSpeed);
        }
        else if(this.accely < 0){
            this.mapContainer.y += Math.max(this.accely, -this.maxSpeed);
        }

    }

}

class Player {
    constructor() {
        this.playerSize = 100;

        this.sprite = PIXI.Sprite.from(`./assets/player/player_stationary.png`);
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(0.5);
        this.sprite.x = 0;
        this.sprite.y = 0;
        this.sprite.vx = 0;
        this.sprite.vy = 0;
        this.sprite.friction = 0.9;
        this.sprite.acceleration = 0.5;

        // set size to player size
        this.sprite.width = this.playerSize;
        this.sprite.height = this.playerSize;

        this.costume = `stationary`;

        this.lastCostumeChange = 0;
    }

    centerPlayer(mainGameFrame){
        this.sprite.x = mainGameFrame.screen.width / 2;
        this.sprite.y = mainGameFrame.screen.height / 2;
    }

    animatePlayer(xvel, yvel) {
        
        if (xvel < 0) {
            // flip the sprite horizontally
            this.sprite.scale.x = -1;
        } else {
            // flip the sprite horizontally
            this.sprite.scale.x = 1;
        }

        // if xvel or yvel is above 1, change the costume to walking
        if (xvel > 1 || xvel < -1 || yvel > 1 || yvel < -1) {
            if(this.costume == `stationary`) {
                this.costume = `walking`;
                this.sprite.texture = PIXI.Texture.from(`./assets/player/player_walk1.png`);
            }
        } else {
            this.costume = `stationary`;
            this.sprite.texture = PIXI.Texture.from(`./assets/player/player_stationary.png`);
        }

        switch (this.costume) {
            case `walking`:
            case `walking2`:
                // alternate between the walking sprites
                if (this.lastCostumeChange > 20) {
                    if(this.costume === `walking2`){
                        this.sprite.texture = PIXI.Texture.from(`./assets/player/player_walk1.png`);
                        this.costume = `walking`;
                    } else {
                        this.sprite.texture = PIXI.Texture.from(`./assets/player/player_walk2.png`);
                        this.costume = `walking2`;
                    }
                    this.lastCostumeChange = 0;
                }
                break;
        }
        this.lastCostumeChange++;
    }
}

let game = new gameController();