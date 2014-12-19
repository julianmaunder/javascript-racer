var myLoader = html5Preloader();

myLoader.addFiles(
  "audio/poof.ogg",
  "audio/wood.ogg", 
  "audio/game.mp3", 
  "images/background.png",
  "images/sprites.png",
  "images/wolflarge.png",
  "images/feathers.png",
  "images/wood.png",
  "images/combosprites.png"
  );

myLoader.on('finish', function(){
  $('#start').removeClass("hidden");
  // menuLoop.play();
});

var title = true;

var poofSound = new Audio("audio/poof.ogg");
poofSound.volume = 0.2;
var woodSound = new Audio("audio/wood.ogg");
woodSound.volume = 0.2;
var howlSound = new Audio("audio/howl.ogg");
var growlSound = new Audio("audio/growlbark.ogg");
growlSound.volume = 0.5;


var gameSound = new Audio("audio/game.mp3");
gameSound.loop = true;
gameSound.volume = 0.2;
var menuLoop = new Audio("audio/menuloop.ogg");
menuLoop.loop = true;
var gameMellow = new Audio("audio/menuloop.ogg");
gameMellow.loop = true;
gameMellow.volume = 0.1;
var gameExciting = new Audio("audio/tatu.mp3")
gameExciting.loop = true;

var comboSprites = new Image();
comboSprites.src = ("images/combosprites.png");


$('#start').click(function(){
    title = false;
    start();
    $('#start').addClass("hidden");
    $('#racer').removeClass("hidden");
});

document.onkeypress=function(e){
  if (title) {
    title = false;
    start();
    $('#start').addClass("hidden");
    $('#racer').removeClass("hidden");
  }
}



function start() {
// gameExciting.play();
console.log('started');
//=========================================================================
// minimalist DOM helpers
//=========================================================================

var Dom = {

  get:  function(id)                     { return ((id instanceof HTMLElement) || (id === document)) ? id : document.getElementById(id); },
  set:  function(id, html)               { Dom.get(id).innerHTML = html;                        },
  on:   function(ele, type, fn, capture) { Dom.get(ele).addEventListener(type, fn, capture);    },
  un:   function(ele, type, fn, capture) { Dom.get(ele).removeEventListener(type, fn, capture); },
  show: function(ele, type)              { Dom.get(ele).style.display = (type || 'block');      },
  blur: function(ev)                     { ev.target.blur();                                    },

  addClassName:    function(ele, name)     { Dom.toggleClassName(ele, name, true);  },
  removeClassName: function(ele, name)     { Dom.toggleClassName(ele, name, false); },
  toggleClassName: function(ele, name, on) {
    ele = Dom.get(ele);
    var classes = ele.className.split(' ');
    var n = classes.indexOf(name);
    on = (typeof on == 'undefined') ? (n < 0) : on;
    if (on && (n < 0))
      classes.push(name);
    else if (!on && (n >= 0))
      classes.splice(n, 1);
    ele.className = classes.join(' ');
  },

  storage: window.localStorage || {}

}

//=========================================================================
// general purpose helpers (mostly math)
//=========================================================================

var Util = {

  timestamp:        function()                  { return new Date().getTime();                                    },
  toInt:            function(obj, def)          { if (obj !== null) { var x = parseInt(obj, 10); if (!isNaN(x)) return x; } return Util.toInt(def, 0); },
  toFloat:          function(obj, def)          { if (obj !== null) { var x = parseFloat(obj);   if (!isNaN(x)) return x; } return Util.toFloat(def, 0.0); },
  limit:            function(value, min, max)   { return Math.max(min, Math.min(value, max));                     },
  randomInt:        function(min, max)          { return Math.round(Util.interpolate(min, max, Math.random()));   },
  randomChoice:     function(options)           { return options[Util.randomInt(0, options.length-1)];            },
  percentRemaining: function(n, total)          { return (n%total)/total;                                         },
  accelerate:       function(v, accel, dt)      { return v + (accel * dt);                                        },
  interpolate:      function(a,b,percent)       { return a + (b-a)*percent                                        },
  easeIn:           function(a,b,percent)       { return a + (b-a)*Math.pow(percent,2);                           },
  easeOut:          function(a,b,percent)       { return a + (b-a)*(1-Math.pow(1-percent,2));                     },
  easeInOut:        function(a,b,percent)       { return a + (b-a)*((-Math.cos(percent*Math.PI)/2) + 0.5);        },
  exponentialFog:   function(distance, density) { return 1 / (Math.pow(Math.E, (distance * distance * density))); },

  increase:  function(start, increment, max) { // with looping
    var result = start + increment;
    while (result >= max)
      result -= max;
    while (result < 0)
      result += max;
    return result;
  },

  project: function(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    p.camera.x     = (p.world.x || 0) - cameraX;
    p.camera.y     = (p.world.y || 0) - cameraY;
    p.camera.z     = (p.world.z || 0) - cameraZ;
    p.screen.scale = cameraDepth/p.camera.z;
    p.screen.x     = Math.round((width/2)  + (p.screen.scale * p.camera.x  * width/2));
    p.screen.y     = Math.round((height/2) - (p.screen.scale * p.camera.y  * height/2));
    p.screen.w     = Math.round(             (p.screen.scale * roadWidth   * width/2));
  },

  overlap: function(x1, w1, x2, w2, percent) {
    var half = (percent || 1)/2;
    var min1 = (x1*2) - w1;
    var max1 = (x1*2) + w1;
    var min2 = (x2*2) - w2;
    var max2 = (x2*2) + w2;
    return ! ((max1 < min2) || (min1 > max2));
  }

}

//=========================================================================
// POLYFILL for requestAnimationFrame
//=========================================================================

if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimationFrame = window.webkitRequestAnimationFrame || 
                                 window.mozRequestAnimationFrame    || 
                                 window.oRequestAnimationFrame      || 
                                 window.msRequestAnimationFrame     || 
                                 function(callback, element) {
                                   window.setTimeout(callback, 1000 / 60);
                                 }
}

//=========================================================================
// GAME LOOP helpers
//=========================================================================
var Game = {  // a modified version of the game loop from my previous boulderdash game - see http://codeincomplete.com/posts/2011/10/25/javascript_boulderdash/#gameloop
  run: function(options) {

    Game.loadImages(options.images, function(images) {

      options.ready(images); // tell caller to initialize itself because images are loaded and we're ready to rumble

      Game.setKeyListener(options.keys);

      var canvas = options.canvas,    // canvas render target is provided by caller
          update = options.update,    // method to update game logic is provided by caller
          render = options.render,    // method to render the game is provided by caller
          step   = options.step,      // fixed frame step (1/fps) is specified by caller
          stats  = options.stats,     // stats instance is provided by caller
          now    = null,
          last   = Util.timestamp(),
          dt     = 0,
          gdt    = 0;

      function frame() {
        now = Util.timestamp();
        dt  = Math.min(1, (now - last) / 1000); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
        gdt = gdt + dt;
        while (gdt > step) {
          gdt = gdt - step;
          update(step);
        }
        if (title === false) {
        render();
        stats.update();
        last = now;
        requestAnimationFrame(frame, canvas);
        }
      }
      frame(); // lets get this party started
      $("#wolf").removeClass("hidden");
    });
  },

  //---------------------------------------------------------------------------

  loadImages: function(names, callback) { // load multiple images and callback when ALL images have loaded
    var result = [];
    var count  = names.length;

    var onload = function() {
      if (--count == 0)
        callback(result);
    };

    for(var n = 0 ; n < names.length ; n++) {
      var name = names[n];
      result[n] = document.createElement('img');
      Dom.on(result[n], 'load', onload);
      result[n].src = "images/" + name + ".png";
    }
  },

  //---------------------------------------------------------------------------

  setKeyListener: function(keys) {
    var onkey = function(keyCode, mode) {
      var n, k;
      for(n = 0 ; n < keys.length ; n++) {
        k = keys[n];
        k.mode = k.mode || 'up';
        if ((k.key == keyCode) || (k.keys && (k.keys.indexOf(keyCode) >= 0))) {
          if (k.mode == mode) {
            k.action.call();
          }
        }
      }
    };
    Dom.on(document, 'keydown', function(ev) { onkey(ev.keyCode, 'down'); } );
    Dom.on(document, 'keyup',   function(ev) { onkey(ev.keyCode, 'up');   } );
  },

  //---------------------------------------------------------------------------

  stats: function(parentId, id) { // construct mr.doobs FPS counter - along with friendly good/bad/ok message box

    var result = new Stats();
    result.domElement.id = id || 'stats';
    Dom.get(parentId).appendChild(result.domElement);

    var msg = document.createElement('div');
    msg.style.cssText = "border: 2px solid gray; padding: 5px; margin-top: 5px; text-align: left; font-size: 1.15em; text-align: right;";
    msg.innerHTML = "Your canvas performance is ";
    Dom.get(parentId).appendChild(msg);

    var value = document.createElement('span');
    value.innerHTML = "...";
    msg.appendChild(value);

    setInterval(function() {
      var fps   = result.current();
      var ok    = (fps > 50) ? 'good'  : (fps < 30) ? 'bad' : 'ok';
      var color = (fps > 50) ? 'green' : (fps < 30) ? 'red' : 'gray';
      value.innerHTML       = ok;
      value.style.color     = color;
      msg.style.borderColor = color;
    }, 5000);
    return result;
  },

  //---------------------------------------------------------------------------

  playMusic: function() {
    var music = Dom.get('music');
    music.loop = true;
    music.volume = 0.05; // shhhh! annoying music!
    music.muted = (Dom.storage.muted === "true");
    music.play();
    Dom.toggleClassName('mute', 'on', music.muted);
    Dom.on('mute', 'click', function() {
      Dom.storage.muted = music.muted = !music.muted;
      Dom.toggleClassName('mute', 'on', music.muted);
    });
  }

}

//=========================================================================
// canvas rendering helpers
//=========================================================================

var Render = {

  polygon: function(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  },

  //---------------------------------------------------------------------------

  segment: function(ctx, width, lanes, x1, y1, w1, x2, y2, w2, fog, color) {

    var r1 = Render.rumbleWidth(w1, lanes),
        r2 = Render.rumbleWidth(w2, lanes),
        l1 = Render.laneMarkerWidth(w1, lanes),
        l2 = Render.laneMarkerWidth(w2, lanes),
        lanew1, lanew2, lanex1, lanex2, lane;
    
    ctx.fillStyle = color.grass;
    ctx.fillRect(0, y2, width, y1 - y2);
    
    Render.polygon(ctx, x1-w1-r1, y1, x1-w1, y1, x2-w2, y2, x2-w2-r2, y2, color.rumble);
    Render.polygon(ctx, x1+w1+r1, y1, x1+w1, y1, x2+w2, y2, x2+w2+r2, y2, color.rumble);
    Render.polygon(ctx, x1-w1,    y1, x1+w1, y1, x2+w2, y2, x2-w2,    y2, color.road);
    
    if (color.lane) {
      lanew1 = w1*2/lanes;
      lanew2 = w2*2/lanes;
      lanex1 = x1 - w1 + lanew1;
      lanex2 = x2 - w2 + lanew2;
      for(lane = 1 ; lane < lanes ; lanex1 += lanew1, lanex2 += lanew2, lane++)
        Render.polygon(ctx, lanex1 - l1/2, y1, lanex1 + l1/2, y1, lanex2 + l2/2, y2, lanex2 - l2/2, y2, color.lane);
    }
    
    Render.fog(ctx, 0, y1, width, y2-y1, fog);
  },

  //---------------------------------------------------------------------------

  background: function(ctx, background, width, height, layer, rotation, offset) {

    rotation = rotation || 0;
    offset   = offset   || 0;

    var imageW = layer.w/2;
    var imageH = layer.h;

    var sourceX = layer.x + Math.floor(layer.w * rotation);
    var sourceY = layer.y
    var sourceW = Math.min(imageW, layer.x+layer.w-sourceX);
    var sourceH = imageH;
    
    var destX = 0;
    var destY = 0;
    var destW = Math.floor(width * (sourceW/imageW));
    var destH = height;

    ctx.drawImage(background, sourceX, sourceY, sourceW, sourceH, destX, destY, destW, destH);
    if (sourceW < imageW)
      ctx.drawImage(background, layer.x, sourceY, imageW-sourceW, sourceH, destW-1, destY, width-destW, destH);
  },

  //---------------------------------------------------------------------------

  sprite: function(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY, offsetX, offsetY, clipY) {

                    //  scale for projection AND relative to roadWidth (for tweakUI)
    var destW  = (sprite.w * scale * width/2) * (SPRITES.SCALE * roadWidth);
    var destH  = (sprite.h * scale * width/2) * (SPRITES.SCALE * roadWidth);

    destX = destX + (destW * (offsetX || 0));
    destY = destY + (destH * (offsetY || 0));

    var clipH = clipY ? Math.max(0, destY+destH-clipY) : 0;
    if (clipH < destH)
      if (moonMode) {
        // img.src = 'images/combosprites.png'; // Set source path
        ctx.drawImage(comboSprites, sprite.x, sprite.y, sprite.w, sprite.h - (sprite.h*clipH/destH), destX, destY, destW, destH - clipH);
      } else {
        ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h - (sprite.h*clipH/destH), destX, destY, destW, destH - clipH);
      }
  },

  //---------------------------------------------------------------------------

  player: function(ctx, width, height, resolution, roadWidth, sprites, speedPercent, scale, destX, destY, steer, updown) {

    var bounce = (1.5 * Math.random() * speedPercent * resolution) * Util.randomChoice([-1,1]);
    var sprite;
    if (steer < 0)
      sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_LEFT : SPRITES.PLAYER_LEFT;
    else if (steer > 0)
      sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_RIGHT : SPRITES.PLAYER_RIGHT;
    else
      sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_STRAIGHT : SPRITES.PLAYER_STRAIGHT;

    Render.sprite(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY + bounce, -0.5, -1);
  },

  //---------------------------------------------------------------------------

  fog: function(ctx, x, y, width, height, fog) {
    if (fog < 1) {
      ctx.globalAlpha = (1-fog)
      ctx.fillStyle = COLORS.FOG;
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = 1;
    }
  },

  rumbleWidth:     function(projectedRoadWidth, lanes) { return projectedRoadWidth/Math.max(6,  2*lanes); },
  laneMarkerWidth: function(projectedRoadWidth, lanes) { return projectedRoadWidth/Math.max(32, 8*lanes); }

}

//=============================================================================
// RACING GAME CONSTANTS
//=============================================================================

var KEY = {
  LEFT:  37,
  UP:    38,
  RIGHT: 39,
  DOWN:  40,
  A:     65,
  D:     68,
  S:     83,
  W:     87
};

var COLORS = {
  SKY:  '#72D7EE',
  TREE: '#e7e7df',
  FOG:  '#cfccdf',
  LIGHT:  { road: '#efefef',   grass: '#e9e9e9',   rumble: '#e9e9e9', lane: '#efefef'  },
  DARK:   { road: '#efefef',   grass: '#e9e9e9',   rumble: '#e9e9e9'                   },
  START:  { road: '#efefef',   grass: '#e9e9e9',   rumble: '#e9e9e9'               },
  FINISH: { road: '#efefef',   grass: '#e9e9e9',   rumble: '#e9e9e9'               }
};


var COMBOCOLORS = {
    SKY:  '#000000',
    TREE: '#000000',
    FOG:  '#000000',
    LIGHT:  { road: '#1d2838',   grass: '#101a24',   rumble: '#101a24', lane: '#1d2838'  },
    DARK:   { road: '#1d2838',   grass: '#101a24',   rumble: '#101a24'                   },
    START:  { road: '#1d2838',   grass: '#101a24',   rumble: '#101a24'               },
    FINISH: { road: '#1d2838',   grass: '#101a24',   rumble: '#101a24'               }
  };


var BACKGROUND = {
  HILLS: { x:   5, y:   5, w: 1280, h: 480 },
  SKY:   { x:   5, y: 495, w: 1280, h: 480 },
  TREES: { x:   5, y: 985, w: 1280, h: 480 }
};

//to get tops of trees hidden sprites must be 1600-1800px tall

var SPRITES = {
  TREE1:                  { x:    0, y:    0, w:  500, h: 1710 },
  TREE2:                  { x:  560, y:    0, w:  740, h: 1730 },
  TREE3:                  { x: 1300, y:    0, w:  300, h: 1730 },
  LOG:                    { x:    0, y: 1760, w:  880, h:  160 },
  STUMP1:                 { x:  880, y: 1760, w:  135, h:  150 },
  CAR03:                  { x:  500, y:  105, w:   55, h:   35 },
  CAR02:                  { x:  500, y:   60, w:   55, h:   45 },
  CAR04:                  { x:  500, y:    0, w:   55, h:   55 },
  CAR01:                  { x:  500, y:    0, w:   55, h:   55 },
  PLAYER_UPHILL_LEFT:     { x:  300, y:    0, w:   60, h:  150 },
  PLAYER_UPHILL_STRAIGHT: { x:  300, y:    0, w:   60, h:  150 },
  PLAYER_UPHILL_RIGHT:    { x:  300, y:    0, w:   60, h:  150 },
  PLAYER_LEFT:            { x:  300, y:    0, w:   60, h:  150 },
  PLAYER_STRAIGHT:        { x:  300, y:    0, w:   60, h:  150 },
  PLAYER_RIGHT:           { x:  300, y:    0, w:   60, h:  150 }
};

SPRITES.SCALE = 0.2 * (1/SPRITES.PLAYER_STRAIGHT.w) // the reference sprite width should be 1/3rd the (half-)roadWidth

SPRITES.PLANTS     = [SPRITES.TREE1, SPRITES.TREE2, SPRITES.TREE3];
SPRITES.CARS       = [SPRITES.CAR01, SPRITES.CAR02, SPRITES.CAR03, SPRITES.CAR04];
SPRITES.STUMPS     = [SPRITES.STUMP1, SPRITES.STUMP1];

    var fps            = 60;                      // how many 'update' frames per second
    var step           = 1/fps;                   // how long is each frame (in seconds)
    var width          = 640;                     // logical canvas width
    var height         = 480;                     // logical canvas height
    var centrifugal    = 0.15;                    // centrifugal force multiplier when going around curves
    var offRoadDecel   = 0.99;                    // speed multiplier when off road (e.g. you lose 2% speed each update frame)
    var skySpeed       = 0.001;                   // background sky layer scroll speed when going around curve (or up hill)
    var hillSpeed      = 0.002;                   // background hill layer scroll speed when going around curve (or up hill)
    var treeSpeed      = 0.002;                   // background tree layer scroll speed when going around curve (or up hill)
    var skyOffset      = 0;                       // current sky scroll offset
    var hillOffset     = 0;                       // current hill scroll offset
    var treeOffset     = 0;                       // current tree scroll offset
    var segments       = [];                      // array of road segments
    var cars           = [];                      // array of cars on the road
    var stumps         = [];                      // array of stumps on the road
    var stats          = Game.stats('fps');       // mr.doobs FPS counter
    var canvas         = Dom.get('canvas');       // our canvas...
    var ctx            = canvas.getContext('2d'); // ...and its drawing context
    var background     = null;                    // our background image (loaded below)
    var sprites        = null;                    // our spritesheet (loaded below)
    var resolution     = null;                    // scaling factor to provide resolution independence (computed)
    var roadWidth      = 2000;                    // actually half the roads width, easier math if the road spans from -roadWidth to +roadWidth
    var segmentLength  = 150;                     // length of a single segment
    var rumbleLength   = 3;                       // number of segments per red/white rumble strip
    var trackLength    = null;                    // z length of entire track (computed)
    var lanes          = 3;                       // number of lanes
    var fieldOfView    = 80;                     // angle (degrees) for field of view
    var cameraHeight   = 500;                    // z height of camera
    var cameraDepth    = null;                    // z distance camera is from screen (computed)
    var drawDistance   = 900;                     // number of segments to draw
    var playerX        = 0;                       // player x offset from center of road (-1 to 1 to stay independent of roadWidth)
    var playerZ        = null;                    // player relative z distance from camera (computed)
    var fogDensity     = 0;                       // exponential fog density
    var position       = 0;                       // current camera Z position (add playerZ to get player's absolute Z position)
    var speed          = 0;                       // current speed
    var maxSpeed       = segmentLength/step;      // top speed (ensure we can't move more than 1 segment in a single frame to make collision detection easier)
    var accel          =  maxSpeed/20;             // acceleration rate - tuned until it 'felt' right
    var breaking       = -maxSpeed;               // deceleration rate when braking
    var decel          = -maxSpeed/5;             // 'natural' deceleration rate when neither accelerating, nor braking
    var offRoadDecel   = -maxSpeed;             // off road deceleration is somewhere in between
    var offRoadLimit   =  maxSpeed;             // limit when off road deceleration no longer applies (e.g. you can always go at least this speed even when off road)
    var totalCars      = 400;                     // total number of cars on the road
    var totalStumps    = 100;
    var currentLapTime = 0;                       // current lap time
    var lastLapTime    = null;                    // last lap time
    var score          = 0;
    var birds          = 0;
    var birdScore      = 0;
    var maxHearts      = 2;
    var hearts         = 1;
    var birdHealth     = 99;
    var isCombo        = false;
    var currentCombo   = 0;    
    var rushBirds      = 18;
    var moonMode       = false;

    var img = new Image();   // Create new img element
    img.src = "images/combosprites.png";

    var keyLeft        = false;
    var keyRight       = false;
    var keyFaster      = false;
    var keySlower      = false;
    var straight       = true;

    var hud = {
      speed:            { value: null, dom: Dom.get('speed_value')            },
      current_lap_time: { value: null, dom: Dom.get('current_lap_time_value') },
      last_lap_time:    { value: null, dom: Dom.get('last_lap_time_value')    },
      fast_lap_time:    { value: null, dom: Dom.get('fast_lap_time_value')    }
    }


    //=========================================================================
    // UPDATE THE GAME WORLD
    //=========================================================================

    function update(dt) {

      var n, car, carW, sprite, spriteW, stump, stumpW;
      var playerSegment = findSegment(position+playerZ);
      var playerW       = SPRITES.PLAYER_STRAIGHT.w * SPRITES.SCALE;
      var speedPercent  = speed/maxSpeed;
      var dx            = dt * 4 * speedPercent; // at top speed, should be able to cross from left to right (-1 to 1) in 1 second
      var startPosition = position;

      playerX = playerX - (dx * speedPercent * playerSegment.curve * centrifugal);

      speed = Util.accelerate(speed, accel, dt);       

      if (currentCombo >= rushBirds - 2) {
        moonMode = true;
      } 

      if (moonMode && currentCombo === rushBirds - 2) { 
          howlSound.play();
        }
      
      if (speed < maxSpeed/2) {
        accel          =  maxSpeed*2; 
      } else {
        accel          =  maxSpeed/20; 
      }

      updateCars(dt, playerSegment, playerW);
      updateStumps(dt, playerSegment, playerW);

      if (hearts > 0) {
        position = Util.increase(position, dt * speed, trackLength);
      }
      if (moonMode) {
        if (keyLeft) {
          playerX = playerX - dx;
          $('#wolf').addClass("leftc").removeClass("straightc rightc");
        }
          
        else if (keyRight) {
          playerX = playerX + dx;
          $('#wolf').addClass("rightc").removeClass("straightc leftc");
        }

        else if (keyLeft === false && keyRight === false) {
          $('#wolf').addClass('straightc').removeClass("rightc leftc");
        }

      } else if (isCombo === false) {
        $('#wolf').removeClass("straightc rightc leftc");
        
        if (keyLeft) {
          playerX = playerX - dx;
          $('#wolf').addClass("left").removeClass("straight right");
        }
          
        else if (keyRight) {
          playerX = playerX + dx;
          $('#wolf').addClass("right").removeClass("straight left");
        }

        else if (keyLeft === false && keyRight === false) {
          $('#wolf').addClass('straight').removeClass("right left");
        }
      }

      function addPoints() {
        birdScore = birdScore + 200;
        if (moonMode) {
          birdScore = birdScore + 200;
          $("#points-animation").css("color", "#ffffff");
        } else {
          $("#points-animation").css("color", "#000000");
        }
        $("#points-animation").text(birdScore);

        if ($('#points-animation').hasClass('points-animation2')) {
         $('#points-animation').addClass('points-animation1').removeClass('points-animation2');
        } else {
           $('#points-animation').addClass('points-animation2').removeClass("points-animation1");
        }
      }

      function addMessage(message) {
        $("#points-animation").text(message);

        if ($('#points-animation').hasClass('points-animation2')) {
         $('#points-animation').addClass('points-animation1').removeClass('points-animation2');
        } else {
           $('#points-animation').addClass('points-animation2').removeClass("points-animation1");
        }
      }

      function updateMoon() {
        if (moonMode === false) {
          if (currentCombo <= 1) {
            $(".moon").css("background-position", "0 0");
          } else if (currentCombo === 2) {
            $(".moon").css("background-position", "-640px 0");
          } else if (currentCombo === 3) {
            $(".moon").css("background-position", "-1280px 0");
          } else if (currentCombo === 4) {
            $(".moon").css("background-position", "-1920px 0");
          } else if (currentCombo === 5) {
            $(".moon").css("background-position", "-2560px 0");
          } else if (currentCombo === 6) {
            $(".moon").css("background-position", "-3200px 0");
          } else if (currentCombo === 7) {
            $(".moon").css("background-position", "-3840px 0");
          } else if (currentCombo === 8) {
            $(".moon").css("background-position", "-4480px 0");
          } else if (currentCombo === 9) {
            $(".moon").css("background-position", "-5120px 0");
          } else if (currentCombo === 10) {
            $(".moon").css("background-position", "-5760px 0");
          } else if (currentCombo === 11) {
            $(".moon").css("background-position", "-6400px 0");
          } else if (currentCombo === 12) {
            $(".moon").css("background-position", "-7040px 0");
          } else if (currentCombo === 13) {
            $(".moon").css("background-position", "-7680px 0");
          } else if (currentCombo === 14) {
            $(".moon").css("background-position", "-8320px 0");
          } else if (currentCombo === 15) {
            $(".moon").css("background-position", "-8960px 0");
          } 
        } else {
          $(".moon").css("background-position", "-9600px 0");
        }
      }

      // if (isCombo === true) {
      //   $("#wolf").css("opacity", "0.2");
      // } else {
      //   $("#wolf").css("opacity", "1");
      // }

      // if (speed < maxSpeed) {
      //   $('#wolf').css("animation-duration", "0.8s");
      // } else {
      //   $('#wolf').css("animation-duration", "0.35s");
      // }

      if ((playerX < -1) || (playerX > 1)) {
        if (speed > offRoadLimit)
          speed = Util.accelerate(speed, offRoadDecel, dt);

        for(n = 0 ; n < playerSegment.sprites.length ; n++) {
          sprite  = playerSegment.sprites[n];
          spriteW = sprite.source.w;
          if (Util.overlap(playerX, playerW, sprite.offset + spriteW/2 * (sprite.offset > 0 ? 1 : -1), spriteW)) {
            // speed = maxSpeed/5;
            // position = Util.increase(playerSegment.p1.world.z, -playerZ, trackLength); // stop in front of sprite (at front of segment)
            // break;
          }
        }
      }

      for(n = 0 ; n < playerSegment.cars.length ; n++) {
        car  = playerSegment.cars[n];
        carW = (car.sprite.w * SPRITES.SCALE) * 3;
        if (speed > car.speed) {
          if (Util.overlap(playerX, playerW, car.offset, (carW), 1)) {
            // position = Util.increase(car.z, -playerZ, trackLength)
            playerSegment.cars.splice();
            isCombo = true;
            currentCombo += 1;
            console.log(currentCombo);
            updateMoon();
            addPoints();
            if (currentCombo >= rushBirds - 2) {
              carW = (car.sprite.w * SPRITES.SCALE) * 50;
              moonMode = true;
            }  else { 
              isCombo = false;
            }
            birds += 1;
            // poofSound.pause();
            // poofSound.currentTime = 0;
            // poofSound.volume = Math.random(); 
            // poofSound.play();
              if ($('#feather').hasClass('feather-pop2')) {
                $('#feather').addClass('feather-pop').removeClass('feather-pop2');
               } else {
                  $('#feather').addClass('feather-pop2').removeClass("feather-pop");
               }
            break;
          } else {
            isCombo = false;
            currentCombo = 0;
            birdScore = 0;
            updateMoon();
            addMessage("miss");
          }
        }
      }

      for(n = 0 ; n < playerSegment.stumps.length ; n++) {
        stump  = playerSegment.stumps[n];
        stumpW = (stump.sprite.w * SPRITES.SCALE) * 0.3;
        var playerW = playerW * 0.5;
        if (speed > stump.speed) {
          if (Util.overlap(playerX, playerW, stump.offset, stumpW, 1)) {
            playerSegment.stumps.splice();
            isCombo = false;
            currentCombo = 1;
            updateMoon();
            var currentSpeed = speed;
            speed    = maxSpeed/3;
            setTimeout(function(){ speed = currentSpeed + maxSpeed/2; }, 400);
            // position = Util.increase(car.z, -playerZ, trackLength)
            playerSegment.stumps.splice();
            if (moonMode === false) {
              hearts = 0;
            } else {
              moonMode = false;
            }
            woodSound.pause();
            woodSound.currentTime = 0;
            woodSound.play();
            if ($('#wood').hasClass('wood-pop2')) {
              $('#wood').addClass('wood-pop').removeClass('wood-pop2');
            } else {
              $('#wood').addClass('wood-pop2').removeClass("wood-pop");
            }
            updateHearts();
            updateMoon();
            break;
          }
        }
      }

      playerX = Util.limit(playerX, -1, 1);     // dont ever let it go too far out of bounds
      speed   = Util.limit(speed, 0, maxSpeed); // or exceed maxSpeed

      skyOffset  = Util.increase(skyOffset,  skySpeed  * playerSegment.curve * (position-startPosition)/segmentLength, 1);
      hillOffset = Util.increase(hillOffset, hillSpeed * playerSegment.curve * (position-startPosition)/segmentLength, 1);
      treeOffset = Util.increase(treeOffset, treeSpeed * playerSegment.curve * (position-startPosition)/segmentLength, 1);

      // if (position > playerZ) {
      //   if (currentLapTime && (startPosition < playerZ)) {
      //     lastLapTime    = currentLapTime;
      //     currentLapTime = 0;
      //   //   if (lastLapTime <= Util.toFloat(Dom.storage.fast_lap_time)) {
      //   //     Dom.storage.fast_lap_time = lastLapTime;
      //   //     updateHud('fast_lap_time', formatTime(lastLapTime));
      //   //     Dom.addClassName('fast_lap_time', 'fastest');
      //   //     Dom.addClassName('last_lap_time', 'fastest');
      //   //     // cars.length = 0;
      //   //     // stumps.length = 0;
      //   //     // resetCars();
      //   //     // resetStumps();
      //   //   }
      //   //   else {
      //   //     Dom.removeClassName('fast_lap_time', 'fastest');
      //   //     Dom.removeClassName('last_lap_time', 'fastest');
      //   //     cars.length = 0;
      //   //     stumps.length = 0;
      //   //     // resetCars();
      //   //     // resetStumps();
      //   //   }
      //   //   updateHud('last_lap_time', formatTime(lastLapTime));
      //   //   Dom.show('last_lap_time');
      //   // }
      //   else {
      //     currentLapTime += dt;
      //   }
      // }

      // updateHud('speed',            score);
      // updateHud('current_lap_time', birds);
    }

    //-------------------------------------------------------------------------

    function updateHearts() {
      if (hearts === 0) {
        title = true;
        $('#wolf').removeClass("straight right left");
        $('#start').removeClass("hidden");
        $('#racer').addClass("hidden");
        $('#feather').removeClass("feather-pop feather-pop2");
      }
    }

    function updateCars(dt, playerSegment, playerW) {
      var n, car, oldSegment, newSegment;
      for(n = 0 ; n < cars.length ; n++) {
        car         = cars[n];
        oldSegment  = findSegment(car.z);
        car.offset  = car.offset + updateCarOffset(car, oldSegment, playerSegment, playerW);
        // car.z       = Util.increase(car.z, dt * car.speed, trackLength);
        car.percent = Util.percentRemaining(car.z, segmentLength); // useful for interpolation during rendering phase
        newSegment  = findSegment(car.z);
        if (oldSegment != newSegment) {
          combo = false;
          index = oldSegment.cars.indexOf(car);
          oldSegment.cars.splice(index, 1);
          newSegment.cars.push(car);
        }
      }
    }

    function updateCarOffset(car, carSegment, playerSegment, playerW) {

      var i, j, dir, segment, otherCar, otherCarW, lookahead = 20, carW = car.sprite.w * SPRITES.SCALE;

      // optimization, dont bother steering around other cars when 'out of sight' of the player
      if ((carSegment.index - playerSegment.index) > drawDistance)
        return 0;

      for(i = 1 ; i < lookahead ; i++) {
        segment = segments[(carSegment.index+i)%segments.length];

        if ((segment === playerSegment) && (car.speed > speed) && (Util.overlap(playerX, playerW, car.offset, carW, 1.2))) {
          if (playerX > 0.5)
            dir = -1;
          else if (playerX < -0.5)
            dir = 1;
          else
            dir = (car.offset > playerX) ? 1 : -1;
          return dir * 1/i * (car.speed-speed)/maxSpeed; // the closer the cars (smaller i) and the greated the speed ratio, the larger the offset
        }

        for(j = 0 ; j < segment.cars.length ; j++) {
          otherCar  = segment.cars[j];
          otherCarW = otherCar.sprite.w * SPRITES.SCALE;
          if ((car.speed > otherCar.speed) && Util.overlap(car.offset, carW, otherCar.offset, otherCarW, 1.2)) {
            if (otherCar.offset > 0.5)
              dir = -1;
            else if (otherCar.offset < -0.5)
              dir = 1;
            else
              dir = (car.offset > otherCar.offset) ? 1 : -1;
            return dir * 1/i * (car.speed-otherCar.speed)/maxSpeed;
          }
        }
      }

      // if no cars ahead, but I have somehow ended up off road, then steer back on
      if (car.offset < -0.9)
        return 0.1;
      else if (car.offset > 0.9)
        return -0.1;
      else
        return 0;
    }

    function updateStumps(dt, playerSegment, playerW) {
      var n, stump, oldSegment, newSegment;
      for(n = 0 ; n < stumps.length ; n++) {
        stump       = stumps[n];
        oldSegment  = findSegment(stump.z);
        stump.offset = stump.offset + updateStumpOffset(stump, oldSegment, playerSegment, playerW);
        // car.z       = Util.increase(car.z, dt * car.speed, trackLength);
        stump.percent = Util.percentRemaining(stump.z, segmentLength); // useful for interpolation during rendering phase
        newSegment  = findSegment(stump.z);
        if (oldSegment != newSegment) {
          index = oldSegment.stumps.indexOf(stump);
          oldSegment.stumps.splice(index, 1);
          newSegment.stumps.push(stump);
        }
      }
    }

    function updateStumpOffset(stump, stumpSegment, playerSegment, playerW) {

      var i, j, dir, segment, otherStump, otherStumpW, lookahead = 20, stumpW = stump.sprite.w * SPRITES.SCALE;

      // optimization, dont bother steering around other cars when 'out of sight' of the player
      if ((stumpSegment.index - playerSegment.index) > drawDistance)
        return 0;

      for(i = 1 ; i < lookahead ; i++) {
        segment = segments[(stumpSegment.index+i)%segments.length];

        if ((segment === playerSegment) && (stump.speed > speed) && (Util.overlap(playerX, playerW, stump.offset, stumpW, 1.2))) {
          if (playerX > 0.5)
            dir = -1;
          else if (playerX < -0.5)
            dir = 1;
          else
            dir = (stump.offset > playerX) ? 1 : -1;
          return dir * 1/i * (stump.speed-speed)/maxSpeed; // the closer the cars (smaller i) and the greated the speed ratio, the larger the offset
        }

        for(j = 0 ; j < segment.stumps.length ; j++) {
          otherStump  = segment.stumps[j];
          otherStumpW = otherStump.sprite.w * SPRITES.SCALE;
          if ((stump.speed > otherStump.speed) && Util.overlap(stump.offset, stumpW, otherStump.offset, otherStumpW, 1.2)) {
            if (otherStump.offset > 0.5)
              dir = -1;
            else if (otherStump.offset < -0.5)
              dir = 1;
            else
              dir = (stump.offset > otherStump.offset) ? 1 : -1;
            return dir * 1/i * (stump.speed-otherStump.speed)/maxSpeed;
          }
        }
      }

      // if no cars ahead, but I have somehow ended up off road, then steer back on
      if (stump.offset < -0.9)
        return 0.1;
      else if (stump.offset > 0.9)
        return -0.1;
      else
        return 0;
    }    

    //-------------------------------------------------------------------------

    function updateHud(key, value) { // accessing DOM can be slow, so only do it if value has changed
      if (hud[key].value !== value) {
        hud[key].value = value;
        Dom.set(hud[key].dom, value);
      }
    }

    function formatTime(dt) {
      var minutes = Math.floor(dt/60);
      var seconds = Math.floor(dt - (minutes * 60));
      var tenths  = Math.floor(10 * (dt - Math.floor(dt)));
      if (minutes > 0)
        return minutes + "." + (seconds < 10 ? "0" : "") + seconds + "." + tenths;
      else
        return seconds + "." + tenths;
    }

    //=========================================================================
    // RENDER THE GAME WORLD
    //=========================================================================

    function render() {

      var baseSegment   = findSegment(position);
      var basePercent   = Util.percentRemaining(position, segmentLength);
      var playerSegment = findSegment(position+playerZ);
      var playerPercent = Util.percentRemaining(position+playerZ, segmentLength);
      var playerY       = Util.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
      var maxy          = height;

      var x  = 0;
      var dx = - (baseSegment.curve * basePercent);

      ctx.clearRect(0, 0, width, height);

      Render.background(ctx, background, width, height, BACKGROUND.SKY,   skyOffset,  resolution * skySpeed  * playerY);
      Render.background(ctx, background, width, height, BACKGROUND.HILLS, hillOffset, resolution * hillSpeed * playerY);
      if (moonMode) {
        Render.background(ctx, background, width, height, BACKGROUND.TREES, treeOffset, resolution * treeSpeed * playerY);
      }
      var n, i, segment, car, stump, sprite, spriteScale, spriteX, spriteY;

      for(n = 0 ; n < drawDistance ; n++) {

        segment        = segments[(baseSegment.index + n) % segments.length];
        segment.looped = segment.index < baseSegment.index;
        segment.fog    = Util.exponentialFog(n/drawDistance, fogDensity);
        segment.clip   = maxy;

        Util.project(segment.p1, (playerX * roadWidth) - x,      playerY + cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);
        Util.project(segment.p2, (playerX * roadWidth) - x - dx, playerY + cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);

        x  = x + dx;
        dx = dx + segment.curve;

        if ((segment.p1.camera.z <= cameraDepth)         || // behind us
            (segment.p2.screen.y >= segment.p1.screen.y) || // back face cull
            (segment.p2.screen.y >= maxy))                  // clip by (already rendered) hill
          continue;
        renderRoad();
      } 

      function renderRoad() {
        if (moonMode) {
          fogDensity = 0;
          segment.color = Math.floor(n/rumbleLength)%2 ? COMBOCOLORS.DARK : COMBOCOLORS.LIGHT;
        } else {
          fogDensity = 20;
          segment.color = Math.floor(n/rumbleLength)%2 ? COLORS.DARK : COLORS.LIGHT;
        }
                Render.segment(ctx, width, lanes,
                       segment.p1.screen.x,
                       segment.p1.screen.y,
                       segment.p1.screen.w,
                       segment.p2.screen.x,
                       segment.p2.screen.y,
                       segment.p2.screen.w,
                       segment.fog,
                       segment.color);
        
        maxy = segment.p1.screen.y;
      }

      for(n = (drawDistance-1) ; n > 0 ; n--) {
        segment = segments[(baseSegment.index + n) % segments.length];

        for(i = 0 ; i < segment.cars.length ; i++) {
          car         = segment.cars[i];
          sprite      = car.sprite;
          spriteScale = Util.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, car.percent);
          spriteX     = Util.interpolate(segment.p1.screen.x,     segment.p2.screen.x,     car.percent) + (spriteScale * car.offset * roadWidth * width/2);
          spriteY     = Util.interpolate(segment.p1.screen.y,     segment.p2.screen.y,     car.percent);
          Render.sprite(ctx, width, height, resolution, roadWidth, sprites, car.sprite, (spriteScale), spriteX, spriteY, -0.5, -1, segment.clip);
        }

        for(i = 0 ; i < segment.stumps.length ; i++) {
          stump       = segment.stumps[i];
          sprite      = stump.sprite;
          spriteScale = Util.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, stump.percent);
          spriteX     = Util.interpolate(segment.p1.screen.x,     segment.p2.screen.x,     stump.percent) + (spriteScale * stump.offset * roadWidth * width/2);
          spriteY     = Util.interpolate(segment.p1.screen.y,     segment.p2.screen.y,     stump.percent);
          Render.sprite(ctx, width, height, resolution, roadWidth, sprites, stump.sprite, (spriteScale/1.5), spriteX, spriteY, -0.5, -1, segment.clip);
        }
       
        for(i = 0 ; i < segment.sprites.length ; i++) {
            sprite      = segment.sprites[i];
            spriteScale = segment.p1.screen.scale * 10;
            spriteX     = segment.p1.screen.x + (spriteScale * sprite.offset * roadWidth * width/2);
            spriteY     = segment.p1.screen.y;

            Render.sprite(ctx, width, height, resolution, roadWidth, sprites, sprite.source, spriteScale, spriteX, spriteY, (sprite.offset < 0 ? -1 : 0), -1, segment.clip);
        }

        if (segment == playerSegment) {
          Render.player(ctx, width, height, resolution, roadWidth, sprites, speed/maxSpeed,
                        cameraDepth/playerZ,
                        width/2,
                        (height/2) - (cameraDepth/playerZ * Util.interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) * height/2),
                        speed * (keyLeft ? -1 : keyRight ? 1 : 0),
                        playerSegment.p2.world.y - playerSegment.p1.world.y);
        }
      }
    }

    function findSegment(z) {
      return segments[Math.floor(z/segmentLength) % segments.length]; 
    }

    //=========================================================================
    // BUILD ROAD GEOMETRY
    //=========================================================================

    function lastY() { return (segments.length == 0) ? 0 : segments[segments.length-1].p2.world.y; }

    function addSegment(curve, y) {
    var n = segments.length;
      segments.push({
          index: n,
             p1: { world: { y: lastY(), z:  n   *segmentLength }, camera: {}, screen: {} },
             p2: { world: { y: y,       z: (n+1)*segmentLength }, camera: {}, screen: {} },
          curve: curve,
        sprites: [],
           cars: [],
         stumps: [],
          color: Math.floor(n/rumbleLength)%2 ? COLORS.DARK : COLORS.LIGHT
      });
    }

    function addSprite(n, sprite, offset) {
      segments[n].sprites.push({ source: sprite, offset: offset });
    }

    function addRoad(enter, hold, leave, curve, y) {
      var startY   = lastY();
      var endY     = startY + (Util.toInt(y, 0) * segmentLength);
      var n, total = enter + hold + leave;
      for(n = 0 ; n < enter ; n++)
        addSegment(Util.easeIn(0, curve, n/enter), Util.easeInOut(startY, endY, n/total));
      for(n = 0 ; n < hold  ; n++)
        addSegment(curve, Util.easeInOut(startY, endY, (enter+n)/total));
      for(n = 0 ; n < leave ; n++)
        addSegment(Util.easeInOut(curve, 0, n/leave), Util.easeInOut(startY, endY, (enter+hold+n)/total));
    }

    var ROAD = {
      LENGTH: { NONE: 0, SHORT:  25, MEDIUM:   50, LONG:  100 },
      HILL:   { NONE: 0, LOW:    20, MEDIUM:   40, HIGH:   60 },
      CURVE:  { NONE: 0, EASY:    2, MEDIUM:    4, HARD:    6 }
    };

    function addStraight(num) {
      num = num || ROAD.LENGTH.MEDIUM;
      addRoad(num, num, num, 0, 0);
    }

    function addHill(num, height) {
      num    = num    || ROAD.LENGTH.MEDIUM;
      height = height || ROAD.HILL.MEDIUM;
      addRoad(num, num, num, 0, height);
    }

    function addCurve(num, curve, height) {
      num    = num    || ROAD.LENGTH.MEDIUM;
      curve  = curve  || ROAD.CURVE.MEDIUM;
      height = height || ROAD.HILL.NONE;
      addRoad(num, num, num, curve, height);
    }
        
    function addLowRollingHills(num, height) {
      num    = num    || ROAD.LENGTH.SHORT;
      height = height || ROAD.HILL.LOW;
      addRoad(num, num, num,  0,                height/2);
      addRoad(num, num, num,  0,               -height);
      addRoad(num, num, num,  ROAD.CURVE.EASY,  height);
      addRoad(num, num, num,  0,                0);
      addRoad(num, num, num, -ROAD.CURVE.EASY,  height/2);
      addRoad(num, num, num,  0,                0);
    }

    function addSCurves() {
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,  -ROAD.CURVE.EASY,    ROAD.HILL.NONE);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,   ROAD.CURVE.MEDIUM,  ROAD.HILL.MEDIUM);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,   ROAD.CURVE.EASY,   -ROAD.HILL.LOW);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,  -ROAD.CURVE.EASY,    ROAD.HILL.MEDIUM);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,  -ROAD.CURVE.MEDIUM, -ROAD.HILL.MEDIUM);
    }

    function addBumps() {
      addRoad(10, 10, 10, 0,  5);
      addRoad(10, 10, 10, 0, -2);
      addRoad(10, 10, 10, 0, -5);
      addRoad(10, 10, 10, 0,  8);
      addRoad(10, 10, 10, 0,  5);
      addRoad(10, 10, 10, 0, -7);
      addRoad(10, 10, 10, 0,  5);
      addRoad(10, 10, 10, 0, -2);
    }

    function addDownhillToEnd(num) {
      num = num || 200;
      addRoad(num, num, num, -ROAD.CURVE.EASY, -lastY()/segmentLength);
    }

    function resetRoad() {
      segments = [];
      addStraight(50)
      addBumps();
      addLowRollingHills();
      addHill(ROAD.LENGTH.SHORT, -ROAD.HILL.HARD);
      addLowRollingHills();
      addSCurves();
      addCurve(ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.LOW);
      addBumps();
      addLowRollingHills();
      addCurve(ROAD.LENGTH.LONG*2, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
      addHill(ROAD.LENGTH.MEDIUM, ROAD.HILL.HIGH);
      addSCurves();
      addCurve(ROAD.LENGTH.SHORT, -ROAD.CURVE.MEDIUM, ROAD.HILL.NONE);
      addHill(ROAD.LENGTH.LONG, ROAD.HILL.HIGH);
      addSCurves();
      addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.MEDIUM, -ROAD.HILL.LOW);
      addBumps();
      addHill(ROAD.LENGTH.SHORT, ROAD.HILL.HIGH);
      addDownhillToEnd(400);

      resetSprites();
      resetCars();
      resetStumps();
      gameSound.play();

      trackLength = segments.length * segmentLength;
    }

    function resetSprites() {
      var n, i;

      // addSprite(500, SPRITES.STUMP1, 0);

      addSprite(900, SPRITES.TREE2, -2);
      addSprite(1000, SPRITES.TREE1, -3);
      addSprite(1000, SPRITES.LOG, -1);

      // addSprite(240,                  SPRITES.BILLBOARD07, -1.2);
      // addSprite(240,                  SPRITES.BILLBOARD06,  1.2);
      // addSprite(segments.length - 25, SPRITES.BILLBOARD07, -1.2);
      // addSprite(segments.length - 25, SPRITES.BILLBOARD06,  1.2);

      for(n = 10 ; n < 1000 ; n += 500 + Math.floor(n/100)) {
        addSprite(n, SPRITES.TREE1, 0.5 + Math.random()*0.5);
        addSprite(n, SPRITES.TREE2,   1 + Math.random()*2);
      }

       for(n = 10 ; n < 1000 ; n += 200 + Math.floor(n/100)) {
        addSprite(n, SPRITES.TREE1, -2 + Math.random()*0.5);
        addSprite(n, SPRITES.TREE2,   -4 + Math.random()*2);
      }


      for(n = 250 ; n < 5000 ; n += 500) {
        // addSprite(n,     SPRITES.COLUMN, 1.1);
        addSprite(n + Util.randomInt(3,5), SPRITES.TREE1, -1);
        addSprite(n + Util.randomInt(3,5), SPRITES.TREE1,  1);
      }

      for(n = 200 ; n < segments.length ; n += 200) {
        addSprite(n, SPRITES.TREE2, Util.randomChoice([0,0]) * (2 + Math.random() * 5));
      }

      for(n = 200 ; n < segments.length ; n += 500) {
        addSprite(n, SPRITES.TREE3, Util.randomChoice([-0.2,0.2]) * (2 + Math.random() * 5));
      }

      // var side, sprite, offset;
      // for(n = 200 ; n < (segments.length-50) ; n += 100) {
      //   side      = Util.randomChoice([0.5, -0.5]);
      //   addSprite(n + Util.randomInt(0, 50), Util.randomChoice(SPRITES.BILLBOARDS), -side);
      //   for(i = 0 ; i < 20 ; i++) {
      //     sprite = Util.randomChoice(SPRITES.PLANTS);
      //     offset = side * (1.5 + Math.random());
      //     addSprite(n + Util.randomInt(0, 50), sprite, offset);
      //   }
      // }

    }

    function resetCars() {
      cars = [];
      var n, car, segment, offset, z, sprite, speed;
      var lastCar = 20000;
      randomCars(lastCar, n, car, segment, offset, z, sprite, speed);
    }

    function BirdMiddle(lastCar) {
      offset = 0;
      z      = lastCar;
      sprite = Util.randomChoice(SPRITES.CARS);
      speed  = maxSpeed/4 + Math.random() * maxSpeed/(sprite == SPRITES.SEMI ? 4 : 2);
      car = { offset: offset, z: z, sprite: sprite, speed: speed };
      segment = findSegment(car.z);
      segment.cars.push(car);
      cars.push(car);
    }

    function BirdLeft(lastCar) {
      offset = -1;
      z      = lastCar;
      sprite = Util.randomChoice(SPRITES.CARS);
      speed  = maxSpeed/4 + Math.random() * maxSpeed/(sprite == SPRITES.SEMI ? 4 : 2);
      car = { offset: offset, z: z, sprite: sprite, speed: speed };
      segment = findSegment(car.z);
      segment.cars.push(car);
      cars.push(car);
    }

    function BirdRight(lastCar) {
      offset = 1;
      z      = lastCar;
      sprite = Util.randomChoice(SPRITES.CARS);
      speed  = maxSpeed/4 + Math.random() * maxSpeed/(sprite == SPRITES.SEMI ? 4 : 2);
      car = { offset: offset, z: z, sprite: sprite, speed: speed };
      segment = findSegment(car.z);
      segment.cars.push(car);
      cars.push(car);
    }

    function intro(lastCar) {
      BirdMiddle(lastCar);
      lastCar += 6000;
      BirdLeft(lastCar);
      lastCar += 6000;
      BirdMiddle(lastCar);
      lastCar += 6000;
      BirdRight(lastCar);
      lastCar += 6000;
      BirdRight(lastCar);
      lastCar += 18000;
      BirdMiddle(lastCar);
      lastCar += 6000;
      BirdLeft(lastCar);
      lastCar += 6000;
      BirdMiddle(lastCar);
      lastCar += 6000;
      BirdRight(lastCar);
      lastCar += 6000;
      BirdRight(lastCar);
    }


    function randomCars(lastCar, n, car, segment, offset, z, sprite, speed) {
      cars = [];
      var n, car, segment, offset, z, sprite, speed;
      var right = false;
      if (totalCars > 50) {
        totalCars = totalCars;
      }
      for (var n = 50 ; n < totalCars ; n++) {
        lastCar += 10000;
        offset = Math.random() * Util.randomChoice([-1, 1]);
        z      = lastCar + (Math.floor(Math.random() * 10) + 1) * 100
        sprite = Util.randomChoice(SPRITES.CARS);
        speed  = maxSpeed/4 + Math.random() * maxSpeed/(sprite == SPRITES.SEMI ? 4 : 2);
        car = { offset: offset, z: z, sprite: sprite, speed: speed };
        segment = findSegment(car.z);
        if (z < segments.length * segmentLength) {
        segment.cars.push(car);
        cars.push(car);
      }
      }
    }

    function resetStumps() {
      stumps = [];
      var n, stump, segment, offset, z, sprite, speed;
      if (totalStumps < 50) {
        totalStumps = totalStumps * 0.5;
      }
      for ( var n = 0 ; n < totalStumps ; n++) {
        offset = Math.random() * Util.randomChoice([-1, 1]);
        z      = (Math.floor(Math.random() * segments.length) * segmentLength) + 50000;
        sprite = Util.randomChoice(SPRITES.STUMPS);
        speed  = maxSpeed/4 + Math.random() * maxSpeed/(sprite == SPRITES.SEMI ? 4 : 2);
        stump = { offset: offset, z: z, sprite: sprite, speed: speed };
        segment = findSegment(stump.z);
        if (z < segments.length * segmentLength) {
        segment.stumps.push(stump);
        stumps.push(stump);
      }
      }
    }

    //=========================================================================
    // THE GAME LOOP
    //=========================================================================

    Game.run({
      canvas: canvas, render: render, update: update, stats: stats, step: step,
      images: ["background", "sprites"],
      keys: [
        { keys: [KEY.LEFT,  KEY.A], mode: 'down', action: function() { keyLeft   = true;  } },
        { keys: [KEY.RIGHT, KEY.D], mode: 'down', action: function() { keyRight  = true;  } },
        { keys: [KEY.UP,    KEY.W], mode: 'down', action: function() { keyFaster = true;  } },
        { keys: [KEY.DOWN,  KEY.S], mode: 'down', action: function() { keySlower = true;  } },
        { keys: [KEY.LEFT,  KEY.A], mode: 'up',   action: function() { keyLeft   = false; } },
        { keys: [KEY.RIGHT, KEY.D], mode: 'up',   action: function() { keyRight  = false; } },
        { keys: [KEY.UP,    KEY.W], mode: 'up',   action: function() { keyFaster = false; } },
        { keys: [KEY.DOWN,  KEY.S], mode: 'up',   action: function() { keySlower = false; } }
      ],
      ready: function(images) {
        background = images[0];
        sprites    = images[1];
        reset();
      }
    });

    function reset(options) {
      options       = options || {};
      canvas.width  = width  = Util.toInt(options.width,          width);
      canvas.height = height = Util.toInt(options.height,         height);
      lanes                  = Util.toInt(options.lanes,          lanes);
      roadWidth              = Util.toInt(options.roadWidth,      roadWidth);
      cameraHeight           = Util.toInt(options.cameraHeight,   cameraHeight);
      drawDistance           = Util.toInt(options.drawDistance,   drawDistance);
      fogDensity             = Util.toInt(options.fogDensity,     fogDensity);
      fieldOfView            = Util.toInt(options.fieldOfView,    fieldOfView);
      segmentLength          = Util.toInt(options.segmentLength,  segmentLength);
      rumbleLength           = Util.toInt(options.rumbleLength,   rumbleLength);
      cameraDepth            = 1 / Math.tan((fieldOfView/2) * Math.PI/180);
      playerZ                = (cameraHeight * cameraDepth);
      resolution             = height/480;
      refreshTweakUI();

      if ((segments.length==0) || (options.segmentLength) || (options.rumbleLength))
        resetRoad(); // only rebuild road when necessary
    }

    //=========================================================================
    // TWEAK UI HANDLERS
    //=========================================================================

    Dom.on('resolution', 'change', function(ev) {
      var w, h, ratio;
      switch(ev.target.options[ev.target.selectedIndex].value) {
        case 'fine':   w = 1280; h = 960;  ratio=w/width; break;
        case 'high':   w = 1024; h = 768;  ratio=w/width; break;
        case 'medium': w = 640;  h = 480;  ratio=w/width; break;
        case 'low':    w = 480;  h = 360;  ratio=w/width; break;
      }
      reset({ width: w, height: h })
      Dom.blur(ev);
    });

    Dom.on('lanes',          'change', function(ev) { Dom.blur(ev); reset({ lanes:         ev.target.options[ev.target.selectedIndex].value }); });
    Dom.on('roadWidth',      'change', function(ev) { Dom.blur(ev); reset({ roadWidth:     Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max'))) }); });
    Dom.on('cameraHeight',   'change', function(ev) { Dom.blur(ev); reset({ cameraHeight:  Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max'))) }); });
    Dom.on('drawDistance',   'change', function(ev) { Dom.blur(ev); reset({ drawDistance:  Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max'))) }); });
    Dom.on('fieldOfView',    'change', function(ev) { Dom.blur(ev); reset({ fieldOfView:   Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max'))) }); });
    Dom.on('fogDensity',     'change', function(ev) { Dom.blur(ev); reset({ fogDensity:    Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max'))) }); });

    function refreshTweakUI() {
      Dom.get('lanes').selectedIndex = lanes-1;
      Dom.get('currentRoadWidth').innerHTML      = Dom.get('roadWidth').value      = roadWidth;
      Dom.get('currentCameraHeight').innerHTML   = Dom.get('cameraHeight').value   = cameraHeight;
      Dom.get('currentDrawDistance').innerHTML   = Dom.get('drawDistance').value   = drawDistance;
      Dom.get('currentFieldOfView').innerHTML    = Dom.get('fieldOfView').value    = fieldOfView;
      Dom.get('currentFogDensity').innerHTML     = Dom.get('fogDensity').value     = fogDensity;
    }
    //=========================================================================

  }


