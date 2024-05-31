console.log(`load`)

class gameController {
    constructor() {
        this.mainGameFrame = new PIXI.Application({
            resizeTo: window,
            backgroundColor: 0xFFFFFF,
        }); // contains all game elements
        
        this.backgroundLayer = new gameLayer("background");
        this.foregroundLayer = new gameLayer("foreground");
        this.effectsLayer = new gameLayer("effects");


        this.mainGameFrame.stage.addChild(this.backgroundLayer.container);
        this.mainGameFrame.stage.addChild(this.foregroundLayer.container);
        this.mainGameFrame.stage.addChild(this.effectsLayer.container);
        
        this.setScreenSize(this.mainGameFrame, this.backgroundLayer)
        this.setScreenSize(this.mainGameFrame, this.foregroundLayer)
        this.setScreenSize(this.mainGameFrame, this.effectsLayer)


        document.getElementById(`game`).appendChild(this.mainGameFrame.view);

        this.keyInputs = [];

        this.init()
    }

    async init(){
        this.detectInput();

        this.backgroundManager = new backgroundManager(this.backgroundLayer, this.effectsLayer);
        await this.backgroundManager.loadMap("default")

        this.createPlayer()

        // start ticking
        this.mainGameFrame.ticker.add(async() => await this.tick());
    }

    setScreenSize(main, layer){
        layer.width = main.view.width;
        layer.height = main.view.height;
    }

    createPlayer(){
        this.playerContainer = new playerContainer(this.foregroundLayer, this.backgroundManager);
    }

    renderOutline(layer){
        layer.renderer.lineStyle(5, 0x000000, 5);
        layer.renderer.drawRect(0, 0, layer.width, layer.height);
    }
    
    detectInput() {
        // detect key input
        window.addEventListener(`keydown`, event => {
            // add the key to the keyInputs array if it isn't already in there
            if (!this.keyInputs.includes(event.key)) {
                this.keyInputs.push(event.key);
            }
        });

        window.addEventListener(`keyup`, event => {
            // remove the key from the keyInputs array
            this.keyInputs = this.keyInputs.filter(key => key !== event.key);
        });
    }

    async tick(){
        if(this.keyInputs.includes("r")){
            this.keyInputs = []
            await this.backgroundManager.loadMap("default")
        }
        if(this.keyInputs.includes("h")){
            this.keyInputs = []
            await this.backgroundManager.loadMap("one")
        }
    }

}

class playerContainer{
    constructor(foregroundLayer, backgroundManager){
        this.foregroundLayer = foregroundLayer;
        this.backgroundManager = backgroundManager

        this.scale = 100

        this.player = PIXI.Sprite.from(`./assets/player/player_idle.png`);
        this.player.costumeID = "idle"
        this.player.width = this.scale;
        this.player.height = this.scale;
        this.player.anchor.set(0.5);
        this.player.visible = true;

        this.hidden = false

        this.shadow = false;

        this.costumes = {    
            "idle": ["player_idle", "player_idle2"]
        }

        this.update = this.getTimeMs()

        this.centerPlayer()

        this.originalY = this.player.y;
        this.jumpHeight = 10;
        this.jumpSpeed = 0.1;
        this.jumpTime = 0;
        
        game.mainGameFrame.ticker.add(() => {
            this.setCostume()
            // console.log(game.keyInputs.length != 0)
            if(game.keyInputs.length != 0 || Math.floor(this.jumpSin) != -9){
                this.animate()
            }
        });

        this.foregroundLayer.container.addChild(this.player);
    }

    drawShadow(size){
        // oval shadow
        this.foregroundLayer.container.removeChild(this.shadow);
        if(!this.hidden){
            this.shadow = new PIXI.Graphics();
            this.shadow.beginFill(0x000000, 0.2);
            this.shadow.drawEllipse(this.player.x, this.originalY + this.scale / 2.5, this.scale / 4 + size /2, this.scale / 8);
            this.shadow.endFill();
            this.shadow.name = "playerShadow"
            this.foregroundLayer.container.addChild(this.shadow);
        }
    }

    // constant looping jump animation using sine wave
    animate(){
        this.jumpSin = (Math.sin(this.jumpTime) * this.jumpHeight)
        this.jumpTime += this.jumpSpeed;
        this.player.y = this.foregroundLayer.height / 2 - this.player.height / 2 - this.jumpSin;
        this.player.rotation = (Math.sin(this.jumpTime / 2) * 0.1);
        this.drawShadow(-this.jumpSin)
    }
    
    centerPlayer(){
        this.player.x = this.foregroundLayer.width / 2 - this.player.width / 2;
        this.player.y = this.foregroundLayer.height / 2 - this.player.height / 2;
    }

    getTimeMs(){
        return Math.floor(Date.now() / 100);
    }

    setCostume(){
        if(this.getTimeMs() - this.update){
            this.update = this.getTimeMs()
            if(this.player.costumeID == "idle"){
                this.player.texture = PIXI.Texture.from(`./assets/player/player_idle2.png`);
                this.player.costumeID = "idle2"
            } else {
                this.player.texture = PIXI.Texture.from(`./assets/player/player_idle.png`);
                this.player.costumeID = "idle"
            }
        }
        if(this.backgroundManager.mapContainer.lastDirection == "left"){
            this.player.scale.x = 1;
        }else{
            this.player.scale.x = -1;
        }
    }

    show(){
        this.hidden = false;
        this.player.visible = true;
    }

    hide(){
        this.hidden = true;
        this.player.visible = false;
    }

}

class gameLayer{
    constructor(name){
        this.name = name;
        this.container = new PIXI.Container();
        this.renderer = new PIXI.Graphics();

        this.container.addChild(this.renderer);
    }
}

class wipeEffect {
    constructor(effectsLayer) {
        this.effectsLayer = effectsLayer;
        this.wipe = new PIXI.Graphics();
        this.wipe.beginFill(0xFFFFFF);
        this.wipe.drawRect(0, 0, window.innerWidth, window.innerHeight);
        this.wipe.endFill();

        this.wipe.x = -window.innerWidth

        this.covered = false
        this.speed = 3

        this.effectsLayer.renderer.addChild(this.wipe);
    }

    destroy(){
        this.effectsLayer.renderer.removeChild(this.wipe);
    }

    async moveIn(){
        return new Promise((resolve, reject) => {
            let move = setInterval(() => {
                this.wipe.x += 10
                if(this.wipe.x >= -10){
                    clearInterval(move)
                    resolve()
                }
            }, this.speed)
        })
    }

    async moveOut(){
        return new Promise((resolve, reject) => {
            let move = setInterval(() => {
                this.wipe.x += 10
                if(this.wipe.x >= window.innerWidth * 2){
                    clearInterval(move)
                    this.destroy()
                    resolve()
                }
            }, this.speed)
        })
    }
}

class dialogBox{
    constructor(effectsLayer){
        this.effectsLayer = effectsLayer

        this.scale = 100

        this.dialogSprite = new PIXI.Graphics();
        this.dialogSprite.beginFill(0x000000, 1);
        this.dialogSprite.drawRect(15, 15, this.effectsLayer.width - 30, this.scale - 30);
        this.dialogSprite.endFill();
        this.dialogSprite.beginFill(0xFFFFFF, 1);
        this.dialogSprite.drawRect(20, 20, this.effectsLayer.width - 40, this.scale - 40);
        this.dialogSprite.endFill();

        this.dialogSprite.x = 0
        this.dialogSprite.y = this.effectsLayer.height - this.scale

        this.textSprite = false

        this.thingsToDestroy = []

        this.effectsLayer.container.addChild(this.dialogSprite);
    }

    displayText(text){
        if(this.textSprite){
            // change the text
            console.log("changing text")
            this.textSprite.text = text
        } else {
            this.textSprite = new PIXI.Text(text, {fontFamily : 'Arial', fontSize: 24, fill : 0x000000, align : 'center'});
            this.textSprite.x = (this.effectsLayer.width / 2 - this.textSprite.width / 2) + 20
            this.textSprite.y = this.effectsLayer.height - this.scale / 2 - this.textSprite.height / 2
            this.textSprite.anchor.set(0.5);
            this.thingsToDestroy.push(this.textSprite)
            this.effectsLayer.container.addChild(this.textSprite);
        }
    }

    destroy(){
        for(let thing of this.thingsToDestroy){
            this.effectsLayer.container.removeChild(thing);
        }
        this.effectsLayer.container.removeChild(this.dialogSprite);
    }
}

class npcController{
    constructor(npcJSON, effectsLayer){
        this.effectsLayer = effectsLayer
        this.npcJSON = npcJSON

        this.scale = 100

        this.dialog = this.npcJSON.dialog
        this.dialogIndex = -1

        this.interactShown = false;
        this.interactName = "interact"
        this.interactRange = this.npcJSON.interactRange
        this.interactSprite = false

        this.update = this.getTimeMs()

        this.x = this.npcJSON.x;
        this.y = this.npcJSON.y;

        this.screenCorner = {
            x: this.effectsLayer.width - this.scale,
            y: this.effectsLayer.height - this.scale
        }
        
        this.makeSprite()
        game.mainGameFrame.ticker.add(() => this.tick());
    }

    boil(){
        if(this.interactSprite && (this.getTimeMs() - this.update)){
            this.interactSprite.boilFrame += 1
            if(this.interactSprite.boilFrame > this.interactSprite.boilFrames){
                this.interactSprite.boilFrame = 0
            }
            this.interactSprite.texture = PIXI.Texture.from(`./assets/effects/${this.interactName}${this.interactSprite.boilFrame}.png`);
            this.update = this.getTimeMs()
        }
    }

    destroy(){
        this.effectsLayer.container.removeChild(this.interactSprite);
    }

    getTimeMs(){
        return Math.floor(Date.now() / 100);
    }

    makeSprite(){
        this.interactSprite = PIXI.Sprite.from(`./assets/effects/${this.interactName}0.png`);
        this.interactSprite.width = this.scale;
        this.interactSprite.height = this.scale;

        this.interactSprite.boilFrames = 1
        this.interactSprite.boilFrame = -1

        this.interactSprite.x = this.screenCorner.x / 7
        this.interactSprite.y = this.screenCorner.y - this.scale / 2;
        this.interactSprite.anchor.set(0.5);

        this.effectsLayer.container.addChild(this.interactSprite);
    }

    tick(){
        if(this.interactShown){
            this.interactShown = true;
            this.interactSprite.visible = true;
        }else{
            this.interactSprite.visible = false;
        }
        this.boil()
    }

    getNextLine(){
        this.dialogIndex += 1
        return this.dialog[this.dialogIndex]
    }

    setDialogIndex(index){
        this.dialogIndex = index - 1
    }

    withinRange(x,y){
        // use this.scale
        let distance = Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2))
        let within = distance < this.interactRange
        if(within){ this.interactShown = true } else { this.interactShown = false }
        return within
    }
}

class mapContainer{
    constructor(mapJSON = { width: 1, height: 1, tiles: [] }, backgroundLayer, effectsLayer){
        this.mapJSON = mapJSON
        this.backgroundLayer = backgroundLayer
        this.effectsLayer = effectsLayer
        this.mapContainer = new PIXI.Container();

        this.map = new PIXI.Graphics()

        this.mapContainer.addChild(this.map);

        this.centerTile = [0,0]
        this.tilesMap = []

        this.update = this.getTimeMs()

        this.scale = 100;
        this.topSpeed = 0.1;
        this.speed = 0.005;
        this.friction = 0.85

        this.accelX = 0
        this.accelY = 0

        this.thingsToDestroy = []

        this.dialogBox = false

        this.lastDirection = "left"

        this.buildMap()
    }

    getTimeMs(){
        return Math.floor(Date.now() / 100);
    }

    getTileInDirection(direction){
        let tile = this.getStandingTile()
        switch (direction) {
            case "w":
                tile.y -= 1
                break;
            case "s":
                tile.y += 1
                break;
            case "a":
                tile.x -= 1
                break;
            case "d":
                tile.x += 1
                break;
        }
        return tile
    }

    getStandingTile(){
        return {
            x: Math.round(this.centerTile[0]),
            y: Math.round(this.centerTile[1])
        }
    }

    getTileAt(x,y){
        for(let tile of this.mapJSON.tiles){
            if(tile.x == x && tile.y == y){
                return tile
            }
        }
        return false
    }

    rawTilePos(tx,ty){
        return {
            x: tx * this.scale,
            y: ty * this.scale
        }
    }

    destroy(){
        for(let thing of this.thingsToDestroy){
            thing.destroy()
        }
        this.backgroundLayer.container.removeChild(this.mapContainer);
    }

    animateTiles(){
        if(this.getTimeMs() - this.update){
            for(let tile of this.mapJSON.tiles){
                if(tile.boilFrames > 0){
                    // find the tile at those coordinates
                    let tileIndex = this.mapJSON.tiles.indexOf(tile)
                    let tileSprite = this.tilesMap[tileIndex]
                    
                    tileSprite.boilFrame += 1
                    if(tileSprite.boilFrame > tile.boilFrames){
                        tileSprite.boilFrame = 0
                    }
                    tileSprite.texture = PIXI.Texture.from(`./assets/tiles/${tile.name}${tileSprite.boilFrame}.png`);
                }
            }
            this.update = this.getTimeMs()
        }
    }

    buildMap(){

        // set container size
        this.mapContainer.width = this.mapJSON.width * this.scale;
        this.mapContainer.height = this.mapJSON.height * this.scale;

        this.centerTile = [this.mapJSON.player.x, this.mapJSON.player.y]


        // color border of map
        this.map.lineStyle(1, 0x000000, 1);
        this.map.drawRect(0, 0, this.mapJSON.width * this.scale, this.mapJSON.height * this.scale);

        for(let mapTile of this.mapJSON.tiles){
            let frame = ""
            if(mapTile.boilFrames != 0){
                frame = "0"
            }
                
            let tile = PIXI.Sprite.from(`./assets/tiles/${mapTile.name}${frame}.png`);
            tile.width = this.scale;
            tile.height = this.scale;
            tile.x = mapTile.x * this.scale;
            tile.y = (mapTile.y * this.scale) + this.scale / 3;
            tile.anchor.set(0.5);

            tile.tileType = mapTile.type

            tile.boilFrame = 0

            // draw debug rectangle around it
            this.map.lineStyle(1, 0x000000, 1);
            this.map.drawRect(tile.x - this.scale / 2, tile.y - this.scale / 2, this.scale, this.scale);


            if(mapTile.type == "npc"){
                let npc = new npcController(mapTile, this.effectsLayer)
                tile.npc = npc
                this.thingsToDestroy.push(npc)
            }

            this.tilesMap.push(tile)
            this.map.addChild(tile);
        }

        this.updateMapPos();

        this.backgroundLayer.container.addChild(this.mapContainer);
        
        game.mainGameFrame.ticker.add(() => this.tick());
    }

    updateMapPos(){
        // center the map so the centerTile is in the center of the screen relitive to bglayer, use rawtilepos
        let centered = {
            x: (this.backgroundLayer.width / 2 - this.rawTilePos(this.centerTile[0], this.centerTile[1]).x) - this.scale/2,
            y: (this.backgroundLayer.height / 2 - this.rawTilePos(this.centerTile[0], this.centerTile[1]).y) - this.scale/2
        }
        this.mapContainer.x = centered.x;
        this.mapContainer.y = centered.y;
    }

    applySpeedLimit(){
        if(this.accelX > this.topSpeed){
            this.accelX = this.topSpeed;
        }
        if(this.accelX < -this.topSpeed){
            this.accelX = -this.topSpeed;
        }
        if(this.accelY > this.topSpeed){
            this.accelY = this.topSpeed;
        }
        if(this.accelY < -this.topSpeed){
            this.accelY = -this.topSpeed;
        }
    }

    bonkPlayer(direction, strength, invert = false){
        switch (direction) {
            case "w":
                invert ? this.accelY += strength : this.accelY -= strength;
                break;
            case "s":
                invert ? this.accelY -= strength : this.accelY += strength;
                break;
            case "a":
                invert ? this.accelX += strength : this.accelX -= strength;
                break;
            case "d":
                invert ? this.accelX -= strength : this.accelX += strength;
                break;
        }
    }

    takeKeyInput(){
        for(let input of game.keyInputs){
            switch (input) {
                case "w":
                    this.accelY -= this.speed;
                    break;
                case "s":
                    this.accelY += this.speed;
                    break;
                case "a":
                    this.accelX -= this.speed;
                    this.lastDirection = "left"
                    break;
                case "d":
                    this.accelX += this.speed;
                    this.lastDirection = "right"
                    break;
            }
        }

        this.accelX *= this.friction;
        this.accelY *= this.friction;

        this.applySpeedLimit();

        let nextTile = this.getTileAt(Math.round(this.centerTile[0] + this.accelX), Math.round(this.centerTile[1] + this.accelY))
        if(nextTile){
            if(nextTile.collidable){
                this.accelX = 0
                this.accelY = 0
            }
        }

        this.centerTile[0] += this.accelX;
        this.centerTile[1] += this.accelY;
    }

    npcInteraction(){
        let playerTile = this.getStandingTile()
        let playerTilePos = this.rawTilePos(playerTile.x, playerTile.y)

        for(let tile of this.mapJSON.tiles){
            if(tile.type == "npc"){
                let tileSprite = this.tilesMap[this.mapJSON.tiles.indexOf(tile)]
                let npc = tileSprite.npc
                if(npc.withinRange(playerTile.x, playerTile.y)){
                    if(game.keyInputs.includes("x")){
                        game.keyInputs = []
                        let dialog = npc.getNextLine()
                        if(dialog == undefined){
                            npc.setDialogIndex(0)
                            dialog = npc.getNextLine()
                        }
                        console.log(dialog)
                        if(!this.dialogBox){
                            this.dialogBox = new dialogBox(this.effectsLayer)
                        }
                        this.dialogBox.displayText(dialog)
                    }
                }else{
                    npc.setDialogIndex(0)
                    if(this.dialogBox){
                        this.dialogBox.destroy()
                        this.dialogBox = false
                    }
                }
            }
        }
    }

    tick(){
        this.takeKeyInput();
        this.updateMapPos();
        this.animateTiles();
        this.npcInteraction();
    }
}

// displays and loads map data
class backgroundManager{
    constructor(backgroundLayer, effectsLayer){
        this.backgroundLayer = backgroundLayer;
        this.effectsLayer = effectsLayer;

        this.mapContainer = false;
    }

    async loadMapJson(mapName){
        let mapData = await fetch(`./assets/maps/${mapName}.json`);
        return await mapData.json();
    }

    async loadMap(name){
        console.log(`loading map ${name}`)

        let wipe = new wipeEffect(this.effectsLayer);
        await wipe.moveIn()

        if(this.mapContainer){
            this.mapContainer.destroy();
        }
        this.mapContainer = await new mapContainer(await this.loadMapJson(name), this.backgroundLayer, this.effectsLayer);
        
        wipe.moveOut()
    }
}

window.game = new gameController();