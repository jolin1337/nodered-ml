/*
   Copyright 2019 Johannes Lindén & Pontus Ekholm
   floppybird - main.js

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

const states = Object.freeze({
   SplashScreen: 0,
   GameScreen: 1,
   ScoreScreen: 2
});

let gameState = {
   debugmode:true,
   currentState:states.SplashScreen,
   pipes:[],
   score:0,
   scores: [],
   velocity:0,
   position:180,
   rotation:0,
   runCounter:0,
   getPlayer(){
      return $('#player');
   }
};

let speed = 2;
const gravity = 0.25;
const jump = -4.6;

let flyArea = $("#flyarea").height();


let highscore = 0;

const pipeheight = 90;
const pipewidth = 52;


let replayclickable = false;

//sounds
let volume = 30;
const soundJump = new buzz.sound("assets/sounds/sfx_wing.ogg");
const soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
const soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
const soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
const soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);

//loops
let loopGameloop;
let maxFrame = 0;

$(document).ready(function() {
   if(window.location.search === "?debug")
      debugmode = true;
   if(window.location.search === "?easy")
      pipeheight = 200;

   //get the highscore
   var savedscore = getCookie("highscore");
   if(savedscore != "")
      highscore = parseInt(savedscore);

   const modelid = getUrlParameter('model');
   modelid && bot.loadModel(modelid).then(showSplash);
});

function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
};

function getCookie(cname)
{
   var name = cname + "=";
   var ca = document.cookie.split(';');
   for(var i=0; i<ca.length; i++)
   {
      var c = ca[i].trim();
      if (c.indexOf(name)===0) return c.substring(name.length,c.length);
   }
   return "";
}

function setCookie(cname,cvalue,exdays)
{
   var d = new Date();
   d.setTime(d.getTime()+(exdays*24*60*60*1000));
   var expires = "expires="+d.toGMTString();
   document.cookie = cname + "=" + cvalue + "; " + expires;
}

function showSplash()
{
   let gs = getGameState();
   gs.currentState = states.SplashScreen;

   //set the defaults (again)
   gs.velocity = 0;
   gs.position = 180;
   gs.rotation = 0;
   gs.score = 0;

   //update the player in preparation for the next game
   gs.getPlayer().css({ y: 0, x: 0});

   if (speed <= 2) {
      soundSwoosh.stop();
      soundSwoosh.play();
   }

   //clear out all the pipes if there are any
   $(".pipe").remove();
   gs.pipes = [];

   //make everything animated again
   $(".animated").css('animation-play-state', 'running');
   $(".animated").css('-webkit-animation-play-state', 'running');
   $(".pipe").css('animation-duration', '0.1s');
   $(".pipe").css('-webkit-animation-duration', '0.1s');


   //fade in the splash
   $("#splash").transition({ opacity: 1 }, 2000, 'ease');
   updateGameState(gs);
}

function startGame()
{
   let gs = getGameState();
   gs.runCounter++;

   gs.currentState = states.GameScreen;

   //fade out the splash
   $("#splash").stop();
   $("#splash").transition({ opacity: 0 }, 500, 'ease');

   //update the big score
   setBigScore(false,gs);
   setBigMaxFrame(false, gs);
   setRunCounter(false, gs);
   setAvgScore(false, gs);

   //debug mode?
   if(gs.debugmode)
   {
      //show the bounding boxes
      $(".boundingbox").show();
      const qTable = bot.qTable;
      const stateContainer = $('#states tbody');
      stateContainer.html("");
      const threshold = 10;
      let keys = Object.keys(qTable).filter(k => qTable[k] > threshold);
      keys.sort((a, b) => qTable[b] - qTable[a]);
      keys = keys.slice(0, 40);
      stateContainer.find('caption').html(`QTable States (${keys.length}/${Object.keys(qTable).length})`);
      keys.forEach(state => {
         const stateObj = JSON.parse(state);
         const score = qTable[state];
         const action = stateObj['action'] ? 'flap' : 'no-flap';
         stateContainer.append($(`<tr><td>${pxToCM(stateObj['relpipeleft'])}</td><td>${pxToCM(stateObj['relpipebottom'])}</td><td>${pxToCM(stateObj['velocity'])}</td><td>${action}</td><td>${parseInt(100000 * score) / 100000}</td></tr>`));
      });
   }

   startGameLoop();

   //jump from the start!
   playerJump(gs);
   updateGameState(gs);
}
function pxToCM(val) {
   return parseInt(100000 * val * 0.02645833)/100000;
}

function startGameLoop() {
   //start up our loops
   const updaterate = 1000.0 / (speed * 60.0) ; //60 times a second
   const botUpdateRate = updaterate * 15;
   let frame = 0;
   let lastFrame = Date.now();

   loopGameloop = setInterval(() => {
      let dt = Date.now() - lastFrame;
      let framedrop = Math.min(20, dt / updaterate);

      while (framedrop > 1) {
         render = framedrop < 2;
         if (frame % 75 === 0) {
            createPipe(render);
         }
         gameloop(render);
         botAction(render);
         frame++;
         const gs = getGameState();
         if (gs.score > maxFrame) maxFrame = gs.score;
         framedrop--;
      }
      lastFrame = Date.now();
   }, updaterate);
   // loopPipeloop = setInterval(() => createPipe(7500 / speed), 1400 / speed);
   // botLoop = setInterval(botAction, botUpdateRate);
}
function stopGameLoop() {
   clearInterval(loopGameloop);
   loopGameloop = undefined;
}

function botAction() {
   const gs = getGameState();

   if(gs.pipes.length && bot.getAction(gs)) {
      screenClick();
   }
}

function updatePlayer(gs)
{
   //rotation
   gs.rotation = Math.min((gs.velocity / 10) * 90, 90);

   //apply rotation and position
   gs.getPlayer().css({ rotate: gs.rotation, top: gs.position });
}

function getGameState() {
   return {...gameState};
}

function updateGameState(gs, render=true) {

   //update the player
   updatePlayer(gs);
   updatePipes(speed * 75 * 100 / innerWidth, gs);

   gameState = gs;
}

function gameloop(render) {
   let gs = getGameState();

   //update the player speed/position
   gs.velocity += gravity;
   gs.position += gs.velocity;

   //create the bounding box
   const box = gs.getPlayer()[0].getBoundingClientRect();
   box.top = gs.position;
   var origwidth = 34.0;
   var origheight = 24.0;

   var boxwidth = origwidth - (Math.sin(Math.abs(gs.rotation) / 90) * 8);
   var boxheight = (origheight + box.height) / 2;
   var boxleft = ((box.width - boxwidth) / 2) + box.left;
   var boxtop = ((box.height - boxheight) / 2) + box.top;
   var boxright = boxleft + boxwidth;
   var boxbottom = boxtop + boxheight;

   //if we're in debug mode, draw the bounding box
   if(gs.debugmode && render)
   {
      var boundingbox = $("#playerbox");
      boundingbox.css('left', boxleft);
      boundingbox.css('top', boxtop);
      boundingbox.css('height', boxheight);
      boundingbox.css('width', boxwidth);
   }

   //did we hit the ground?
   if(boxbottom >= $("#land").offset().top)
   {
      playerDead();
      return;
   }

   //have they tried to escape through the ceiling? :o
   var ceiling = $("#ceiling");
   if(boxtop <= (ceiling.offset().top + ceiling.height())){
      gs.position = 0;
      gs.velocity = 0;
   }

   //we can't go any further without a pipe
   if(gs.pipes[0] === undefined){
      return;
   }

   //determine the bounding box of the next pipes inner area
   var nextpipe = gs.pipes.filter(p => boxleft <= p.dataLeft + pipewidth )[0];
   var nextpipeupper = nextpipe.children(".pipe_upper");

   var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
   var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
   pipeleft = nextpipe.dataLeft; // for some reason it starts at the inner pipes offset, not the outer pipes.
   var piperight = pipeleft + pipewidth;
   var pipebottom = pipetop + pipeheight;

   if(gs.debugmode && render)
   {
      var boundingbox = $("#pipebox");
      boundingbox.css('left', pipeleft);
      boundingbox.css('top', pipetop);
      boundingbox.css('height', pipeheight);
      boundingbox.css('width', pipewidth);
   }

   //have we gotten inside the pipe yet?
   if(boxright > pipeleft)
   {
      //we're within the pipe, have we passed between upper and lower pipes?
      if(boxtop > pipetop && boxbottom < pipebottom)
      {
         //yeah! we're within bounds

      }
      else
      {
         //no! we touched the pipe
         playerDead();
         return;
      }
   }

   const passedPipes = gs.pipes.indexOf(nextpipe);
   //have we passed the imminent danger?
   if(passedPipes > 0)
   {
      for (let i = 0; i < passedPipes; i++) {
         if (gs.pipes[i].done) continue;
         //and score a point
         playerScore(gs, render);
         gs.pipes[i].done = true;
      }
   }

   gs.pipes.forEach(p => {
      p.dataLeft -= 4;
   });

   //Update gameState every frame
   updateGameState(gs, render);
}

//Handle space bar
$(document).keydown(function(e){
   //space bar!
   if(e.keyCode === 32){
      let gs = getGameState();

      //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
      if(gs.currentState === states.ScoreScreen){
         $("#replay").click();
      }
      else{
         bot.getAction(gs, true);
         screenClick();
      }
   }
});

$('#speed').change((e) => changeSpeed(e.target.value));
$('#learnRate').change(e => changeLearnRate(e.target.value));
$('#goodReward').change(e => changeGoodReward(e.target.value));
$('#badReward').change(e => changeBadReward(e.target.value));
$('#saveModel').on('click', () => {
   const modelId = Date.now();
   bot.saveModel(modelId).then(() => alert('Model saved as ' + modelId))
   .catch(() => alert("Unable to save model" + modelId));
});
$('#loadModel').on('click', () => {location.href = 'http://localhost:5000/ui/#!/2';});

function screenClick()
{
   let gs = getGameState();
   if(gs.currentState === states.GameScreen)
   {
      playerJump(gs);
      updateGameState(gs);
   }
   else if(gs.currentState === states.SplashScreen)
   {
      startGame();
   }
}

function changeGoodReward(newGoodReward) {
   bot.rewards['good'] = parseFloat(newGoodReward);
}
function changeBadReward(newbadReward) {
   bot.rewards['bad'] = parseFloat(newbadReward);
}
function changeLearnRate(newLearnRate) {
   bot.learnRate = parseFloat(newLearnRate);
}
function changeSpeed(newSpeed) {
   stopGameLoop();
   newSpeed = parseInt(newSpeed);
   if (newSpeed === 1) {
      speed = 2;
   } else if (newSpeed === 2) {
      speed = 10;
   } else if (newSpeed === 3) {
      speed = 500;
   } else {
      speed = 10000;
   }
   startGameLoop();
}

function playerJump(gs)
{
   gs.velocity = jump;
   //play jump sound
   if (speed <= 2) {
      soundJump.stop();
      soundJump.play();
   }
}

function setNumber(element, erase, score) {
   const elemscore = $(element);
   elemscore.empty();

   if(erase){
      return;
   }
   if (score === NaN) debugger;
   const digits = score.toString().split('');
   for(var i = 0; i < digits.length; i++) {
      elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
   }
}

function setBigScore(erase, gs)
{
   setNumber('#bigscore', erase, gs.score);
}

function setBigMaxFrame(erase, gs) {
   setNumber('#bigmaxframe', erase, maxFrame);
}

function setAvgScore(erase, gs)
{
   // Compute rolling avg
   const avg = Math.ceil(gs.scores.reduce((g, s) => g + s, 0) / (gs.scores.length||1));
   setNumber('#avgscore', erase, avg);
}

function setRunCounter(erase, gs) {
   setNumber('#runcounter', erase, gs.runCounter);
}

function setSmallScore(gs)
{
   var elemscore = $("#currentscore");
   elemscore.empty();

   var digits = gs.score.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setHighScore()
{
   var elemscore = $("#highscore");
   elemscore.empty();

   var digits = highscore.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setMedal(gs)
{
   var elemmedal = $("#medal");
   elemmedal.empty();

   if(gs.score < 10)
      //signal that no medal has been won
      return false;

   if(gs.score >= 10)
      medal = "bronze";
   if(gs.score >= 20)
      medal = "silver";
   if(gs.score >= 30)
      medal = "gold";
   if(gs.score >= 40)
      medal = "platinum";

   elemmedal.append('<img src="assets/medal_' + medal +'.png" alt="' + medal +'">');

   //signal that a medal has been won
   return true;
}

function playerDead()
{
   //stop animating everything!
   $(".animated").css('animation-play-state', 'paused');
   $(".animated").css('-webkit-animation-play-state', 'paused');

   let gs = getGameState();
   let player = gs.getPlayer();

   //drop the bird to the floor
   var playerbottom = player.position().top + player.width(); //we use width because he'll be rotated 90 deg
   var floor = flyArea;
   var movey = Math.max(0, floor - playerbottom);
   player.transition({ y: movey + 'px', rotate: 90}, 1000, 'easeInOutCubic');

   //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
   updateGameState({
      ...gs,
      currentState:states.ScoreScreen
   });

   //destroy our gameloops
   stopGameLoop();

   bot.updateQValues(false);
   // keep most recent scores to compute rolling avg score
   gs.scores.splice(0, Math.max(0, gs.scores.length - 19));
   gs.scores.push(gs.score);
   showSplash();
   startGame();
   return;
   //mobile browsers don't support buzz bindOnce event
   if(isIncompatible.any())
   {
      //skip right to showing score
      showScore(gs);
   }
   else
   {
      //play the hit sound (then the dead sound) and then show score
      if (speed <= 2) {
         soundHit.play().bindOnce("ended", function() {
            soundDie.play().bindOnce("ended", function() {
               showScore(gs);
            });
         });
      }

   }
}

function showScore(gs)
{
   //unhide us
   $("#scoreboard").css("display", "block");

   //remove the big score
   setBigScore(true, gs);
   setBigMaxFrame(true, gs);
   setRunCounter(false, gs);
   setAvgScore(false, gs);


   //have they beaten their high score?
   if(gs.score > highscore)
   {
      //yeah!
      highscore = gs.score;
      //save it!
      setCookie("highscore", highscore, 999);
   }

   //update the scoreboard
   setSmallScore(gs);
   setHighScore();
   var wonmedal = setMedal(gs);

   //SWOOSH!
   if (speed <= 2) {
      soundSwoosh.stop();
      soundSwoosh.play();
   }

   //show the scoreboard
   $("#scoreboard").css({ y: '40px', opacity: 0 }); //move it down so we can slide it up
   $("#replay").css({ y: '40px', opacity: 0 });
   $("#scoreboard").transition({ y: '0px', opacity: 1}, 600, 'ease', function() {
      //When the animation is done, animate in the replay button and SWOOSH!
      if (speed <= 2) {
         soundSwoosh.stop();
         soundSwoosh.play();
         $("#replay").transition({ y: '0px', opacity: 1}, 600, 'ease');
      }

      //also animate in the MEDAL! WOO!
      if(wonmedal)
      {
         $("#medal").css({ scale: 2, opacity: 0 });
         $("#medal").transition({ opacity: 1, scale: 1 }, 1200, 'ease');
      }
   });

   //make the replay button clickable
   replayclickable = true;
}

$("#replay").click(function() {
   //make sure we can only click once
   if(!replayclickable)
      return;
   else
      replayclickable = false;
   //SWOOSH!
   if (speed <= 2) {
      soundSwoosh.stop();
      soundSwoosh.play();
   }

   //fade out the scoreboard
   $("#scoreboard").transition({ y: '-40px', opacity: 0}, 1000, 'ease', function() {
      //when that's done, display us back to nothing
      $("#scoreboard").css("display", "none");

      //start the game over!
      showSplash();
   });
});

function playerScore(gs)
{
   gs.score += 1;


   //play score sound
   if (speed <= 2) {
      soundScore.stop();
      soundScore.play();
   }
   setBigScore(false,gs);
   setBigMaxFrame(false, gs);
   setRunCounter(false, gs);
   setAvgScore(false, gs);
}

function updatePipes(speed, gs) {
   if (gs.pipes.length > 0 && gs.pipes[0].dataLeft < -100 && gs.pipes[0].done) {
      gs.pipes.splice(0, 1);
   }
   gs.pipes.forEach(p => {
      p.css('left', p.dataLeft + 'px');
   });
}
function createPipe() {
   let gs = getGameState();
   //Do any pipes need removal?
   $(".pipe").filter(function() { return $(this).position().left <= -100; }).remove();

   //add a new pipe (top height + bottom height  + pipeheight === flyArea) and put it in our tracker
   var padding = 80;
   var constraint = flyArea - pipeheight - (padding * 2); //double padding (for top and bottom)
   var topheight = Math.floor((Math.random()*constraint) + padding); //add lower padding
   var bottomheight = (flyArea - pipeheight) - topheight;
   var spawnPos = 900;
   var newpipe = $(`<div class="pipe animated" style="left: ${spawnPos}px;"><div class="pipe_upper" style="height: ${topheight}px;"></div><div class="pipe_lower" style="height: ${bottomheight}px;"></div></div>`);
   $("#flyarea").append(newpipe);
   newpipe.dataLeft = spawnPos;
   gs.pipes.push(newpipe);
}

var isIncompatible = {
   Android: function() {
   return navigator.userAgent.match(/Android/i);
   },
   BlackBerry: function() {
   return navigator.userAgent.match(/BlackBerry/i);
   },
   iOS: function() {
   return navigator.userAgent.match(/iPhone|iPad|iPod/i);
   },
   Opera: function() {
   return navigator.userAgent.match(/Opera Mini/i);
   },
   Safari: function() {
   return (navigator.userAgent.match(/OS X.*Safari/) && ! navigator.userAgent.match(/Chrome/));
   },
   Windows: function() {
   return navigator.userAgent.match(/IEMobile/i);
   },
   any: function() {
   return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
   }
};
