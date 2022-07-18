//------------------------YouTube-3DSage----------------------------------------
//Full video: https://www.youtube.com/watch?v=w0Bm4IA-Ii8
//WADS to move player, E open door after picking up the key

import { lost } from './textures/lost.js'
import { sky } from './textures/sky.js'
import { sprites } from './textures/sprites.js'
import { All_Textures } from './textures/textures.js'
import { title } from './textures/title.js'
import { won } from './textures/won.js'


//


const canvas = document.createElement('canvas')

canvas.width = 960
canvas.height = 640

document.body.append(canvas)

const ctx = canvas.getContext('2d')!

//

let pointSize = 0
const glPointSize = (p: number) => pointSize = p|0

const glColor3ub = (red: number, green: number, blue: number) => {
  ctx.fillStyle = `#${[red, green, blue].map(s => (s|0).toString(16).padStart(2, '0')).join('')}`
}

const glColor3f = (red: number, green: number, blue: number) =>
  glColor3ub(
    (red * 255) | 0, (green * 255) | 0, (blue * 255) | 0
  )

const glVertex2i = (x: number, y: number) => {
  ctx.fillRect(x|0, y|0, pointSize, pointSize)
}

//
const degToRad = (a: number) => a * Math.PI / 180
const FixAng = (a: number) => { if (a > 359) { a -= 360; } if (a < 0) { a += 360; } return a; }

let px = 0, py = 0, pdx = 0, pdy = 0, pa = 0;
let frame1 = 0, frame2 = 0, fps = 0;
let gameState = 0, timer = 0; //game state. init, start screen, game loop, win/lose
let fade = 0;             //the 3 screens can fade up from black

type ButtonKeys = {
  w: number
  a: number
  d: number
  s: number
}

let Keys: Partial<ButtonKeys> = {}

//-----------------------------MAP----------------------------------------------
const mapX = 8      //map width
const mapY = 8      //map height
const mapS = 64      //map cube size

//Edit these 3 arrays with values 0-4 to create your own level! 
const mapW =          //walls
  [
    1, 1, 1, 1, 2, 2, 2, 2,
    6, 0, 0, 1, 0, 0, 0, 2,
    1, 0, 0, 4, 0, 2, 0, 2,
    1, 5, 4, 5, 0, 0, 0, 2,
    2, 0, 0, 0, 0, 0, 0, 1,
    2, 0, 0, 0, 0, 1, 0, 1,
    2, 0, 0, 0, 0, 0, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 1,
  ];

const mapF =          //floors
  [
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 2, 2, 2, 0,
    0, 0, 0, 0, 6, 0, 2, 0,
    0, 0, 8, 0, 2, 7, 6, 0,
    0, 0, 2, 0, 0, 0, 0, 0,
    0, 0, 2, 0, 8, 0, 0, 0,
    0, 1, 1, 1, 1, 0, 8, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
  ];

const mapC =          //ceiling
  [
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 4, 2, 4, 0, 0, 0, 0,
    0, 0, 2, 0, 0, 0, 0, 0,
    0, 0, 2, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
  ];

type Sprite = {
  type: number
  state: number
  map: number
  x: number
  y: number
  z: number
}

const sp: Sprite[] = []

for( let i = 0; i < 4; i++ ){
  sp[ i ] = { type: 0, state: 0, map: 0, x: 0, y: 0, z: 0 }
}

const depth = Array<number>(120).fill(0);      //hold wall line depth to compare for sprite depth

const drawSprite = () => {
  let x = 0, y = 0, s = 0;
  if (px < sp[0].x + 30 && px > sp[0].x - 30 && py < sp[0].y + 30 && py > sp[0].y - 30) { sp[0].state = 0; } //pick up key 	
  if (px < sp[3].x + 30 && px > sp[3].x - 30 && py < sp[3].y + 30 && py > sp[3].y - 30) { gameState = 4; } //enemy kills

  //enemy attack
  let spx = sp[3].x >> 6, spy = sp[3].y >> 6;          //normal grid position
  let spx_add = (sp[3].x + 15) >> 6, spy_add = (sp[3].y + 15) >> 6; //normal grid position plus     offset
  let spx_sub = (sp[3].x - 15) >> 6, spy_sub = (sp[3].y - 15) >> 6; //normal grid position subtract offset
  if (sp[3].x > px && mapW[spy * 8 + spx_sub] == 0) { sp[3].x -= 0.04 * fps; }
  if (sp[3].x < px && mapW[spy * 8 + spx_add] == 0) { sp[3].x += 0.04 * fps; }
  if (sp[3].y > py && mapW[spy_sub * 8 + spx] == 0) { sp[3].y -= 0.04 * fps; }
  if (sp[3].y < py && mapW[spy_add * 8 + spx] == 0) { sp[3].y += 0.04 * fps; }

  for (s = 0; s < 4; s++) {
    let sx = sp[s].x - px; //temp float variables
    let sy = sp[s].y - py;
    let sz = sp[s].z;

    let CS = Math.cos(degToRad(pa)), SN = Math.sin(degToRad(pa)); //rotate around origin
    let a = sy * CS + sx * SN;
    let b = sx * CS - sy * SN;
    sx = a; sy = b;

    sx = (sx * 108.0 / sy) + (120 / 2); //convert to screen x,y
    sy = (sz * 108.0 / sy) + (80 / 2);

    let scale = (32 * 80 / b) | 0;   //scale sprite based on distance
    if (scale < 0) { scale = 0; } if (scale > 120) { scale = 120; }

    //texture
    let t_x = 0, t_y = 31, t_x_step = 31.5 / scale, t_y_step = 32.0 / scale;

    for (x = (sx - scale / 2)|0; x < sx + scale / 2; x++) {
      t_y = 31;
      for (y = 0; y < scale; y++) {
        if (sp[s].state == 1 && x > 0 && x < 120 && b < depth[x]) {
          let pixel = ((t_y | 0) * 32 + (t_x | 0)) * 3 + (sp[s].map * 32 * 32 * 3);
          let red = sprites[pixel + 0];
          let green = sprites[pixel + 1];
          let blue = sprites[pixel + 2];
          if (red !== 255 && green !== 0 && blue !== 255) //dont draw if purple
          {
            glPointSize(8); glColor3ub(red, green, blue); glVertex2i(x * 8, sy * 8 - y * 8); //draw point 
          }
          t_y -= t_y_step; if (t_y < 0) { t_y = 0; }
        }
      }
      t_x += t_x_step;
    }
  }
}


//---------------------------Draw Rays and Walls--------------------------------
const drawRays2D = () => {
  let r = 0, mx = 0, my = 0, mp = 0, dof = 0, side = 0;

  let vx = 0, vy = 0, rx = 0, ry = 0, ra = 0, xo = 0, yo =0 , disV = 0, disH = 0;

  ra = FixAng(pa + 30);                                                              //ray set back 30 degrees

  for (r = 0; r < 120; r++) {
    let vmt = 0, hmt = 0;                                                              //vertical and horizontal map texture number 
    //---Vertical--- 
    dof = 0; side = 0; disV = 100000;
    let Tan = Math.tan(degToRad(ra));
    if (Math.cos(degToRad(ra)) > 0.001) { rx = ((px >> 6) << 6) + 64; ry = (px - rx) * Tan + py; xo = 64; yo = -xo * Tan; }//looking left
    else if (Math.cos(degToRad(ra)) < -0.001) { rx = ((px >> 6) << 6) - 0.0001; ry = (px - rx) * Tan + py; xo = -64; yo = -xo * Tan; }//looking right
    else { rx = px; ry = py; dof = 8; }                                                  //looking up or down. no hit  

    while (dof < 8) {
      mx = (rx) >> 6; my = (ry) >> 6; mp = my * mapX + mx;
      if (mp > 0 && mp < mapX * mapY && mapW[mp] > 0) { vmt = mapW[mp] - 1; dof = 8; disV = Math.cos(degToRad(ra)) * (rx - px) - Math.sin(degToRad(ra)) * (ry - py); }//hit         
      else { rx += xo; ry += yo; dof += 1; }                                               //check next horizontal
    }
    vx = rx; vy = ry;

    //---Horizontal---
    dof = 0; disH = 100000;
    Tan = 1.0 / Tan;
    if (Math.sin(degToRad(ra)) > 0.001) { ry = ((py >> 6) << 6) - 0.0001; rx = (py - ry) * Tan + px; yo = -64; xo = -yo * Tan; }//looking up 
    else if (Math.sin(degToRad(ra)) < -0.001) { ry = ((py >> 6) << 6) + 64; rx = (py - ry) * Tan + px; yo = 64; xo = -yo * Tan; }//looking down
    else { rx = px; ry = py; dof = 8; }                                                   //looking straight left or right

    while (dof < 8) {
      mx = (rx) >> 6; my = (ry) >> 6; mp = my * mapX + mx;
      if (mp > 0 && mp < mapX * mapY && mapW[mp] > 0) { hmt = mapW[mp] - 1; dof = 8; disH = Math.cos(degToRad(ra)) * (rx - px) - Math.sin(degToRad(ra)) * (ry - py); }//hit         
      else { rx += xo; ry += yo; dof += 1; }                                               //check next horizontal
    }

    let shade = 1;
    glColor3f(0, 0.8, 0);
    if (disV < disH) { hmt = vmt; shade = 0.5; rx = vx; ry = vy; disH = disV; glColor3f(0, 0.6, 0); }//horizontal hit first

    let ca = FixAng(pa - ra); disH = disH * Math.cos(degToRad(ca));                            //fix fisheye 
    let lineH = (mapS * 640) / (disH);
    let ty_step = 32.0 / lineH;
    let ty_off = 0;
    if (lineH > 640) { ty_off = (lineH - 640) / 2.0; lineH = 640; }                            //line height and limit
    let lineOff = 320 - (lineH >> 1);                                               //line offset

    depth[r] = disH; //save this line's depth
    //---draw walls---
    let y = 0;
    let ty = ty_off * ty_step;//+hmt*32;
    let tx = 0;
    if (shade == 1) { tx = (rx / 2.0) % 32; if (ra > 180) { tx = 31 - tx; } }
    else { tx = (ry / 2.0) % 32; if (ra > 90 && ra < 270) { tx = 31 - tx; } }
    for (y = 0; y < lineH; y++) {
      let pixel = ((ty | 0) * 32 + (tx | 0)) * 3 + (hmt * 32 * 32 * 3);
      let red = All_Textures[pixel + 0] * shade;
      let green = All_Textures[pixel + 1] * shade;
      let blue = All_Textures[pixel + 2] * shade;
      glPointSize(8); glColor3ub(red, green, blue); glVertex2i(r * 8, y + lineOff);
      ty += ty_step;
    }

    //---draw floors---
    for (y = lineOff + lineH; y < 640; y++) {
      let dy = y - (640 / 2.0), deg = degToRad(ra), raFix = Math.cos(degToRad(FixAng(pa - ra)));
      tx = px / 2 + Math.cos(deg) * 158 * 2 * 32 / dy / raFix;
      ty = py / 2 - Math.sin(deg) * 158 * 2 * 32 / dy / raFix;
      let mp = mapF[((ty / 32.0) | 0) * mapX + ((tx / 32.0) | 0)] * 32 * 32;
      let pixel = (((ty) & 31) * 32 + ((tx) & 31)) * 3 + mp * 3;
      let red = All_Textures[pixel + 0] * 0.7;
      let green = All_Textures[pixel + 1] * 0.7;
      let blue = All_Textures[pixel + 2] * 0.7;
      glPointSize(8); glColor3ub(red, green, blue); glVertex2i(r * 8, y); 

      //---draw ceiling---
      mp = mapC[((ty / 32.0) | 0) * mapX + ((tx / 32.0) | 0)] * 32 * 32;
      pixel = (((ty) & 31) * 32 + ((tx) & 31)) * 3 + mp * 3;
      red = All_Textures[pixel + 0];
      green = All_Textures[pixel + 1];
      blue = All_Textures[pixel + 2];
      if (mp > 0) { glPointSize(8); glColor3ub(red, green, blue); glVertex2i(r * 8, 640 - y); }
    }

    ra = FixAng(ra - 0.5);                                                               //go to next ray, 60 total
  }
}//-----------------------------------------------------------------------------


const drawSky = () =>     //draw sky and rotate based on player rotation
{
  let x = 0, y = 0;
  for (y = 0; y < 40; y++) {
    for (x = 0; x < 120; x++) {
      let xo = (pa * 2 - x) | 0; if (xo < 0) { xo += 120; } xo = xo % 120; //return 0-120 based on player angle
      let pixel = (y * 120 + xo) * 3;
      let red = sky[pixel + 0];
      let green = sky[pixel + 1];
      let blue = sky[pixel + 2];
      glPointSize(8); glColor3ub(red, green, blue); glVertex2i(x * 8, y * 8);
    }
  }
}

const screen = (v: number) => //draw any full screen image. 120x80 pixels
{
  let x = 0, y = 0;
  let T: number[] = []; 
  if (v == 1) { T = title; }
  if (v == 2) { T = won; }
  if (v == 3) { T = lost; }
  for (y = 0; y < 80; y++) {
    for (x = 0; x < 120; x++) {
      let pixel = (y * 120 + x) * 3;
      let red = T[pixel + 0] * fade;
      let green = T[pixel + 1] * fade;
      let blue = T[pixel + 2] * fade;
      glPointSize(8); glColor3ub(red, green, blue); glVertex2i(x * 8, y * 8); 
    }
  }
  if (fade < 1) { fade += 0.001 * fps; }
  if (fade > 1) { fade = 1; }
}


const init = () => //init all variables when game starts
{
  //glClearColor(0.3, 0.3, 0.3, 0);
  px = 150; py = 400; pa = 90;
  pdx = Math.cos(degToRad(pa)); pdy = -Math.sin(degToRad(pa));                                 //init player
  mapW[19] = 4; mapW[26] = 4; //close doors

  sp[0].type = 1; sp[0].state = 1; sp[0].map = 0; sp[0].x = 1.5 * 64; sp[0].y = 5 * 64; sp[0].z = 20; //key
  sp[1].type = 2; sp[1].state = 1; sp[1].map = 1; sp[1].x = 1.5 * 64; sp[1].y = 4.5 * 64; sp[1].z = 0; //light 1
  sp[2].type = 2; sp[2].state = 1; sp[2].map = 1; sp[2].x = 3.5 * 64; sp[2].y = 4.5 * 64; sp[2].z = 0; //light 2
  sp[3].type = 3; sp[3].state = 1; sp[3].map = 2; sp[3].x = 2.5 * 64; sp[3].y = 2 * 64; sp[3].z = 20; //enemy
}


const display = (time: number) => {
  //frames per second
  frame2 = time; fps = (frame2 - frame1); frame1 = time;

  canvas.width = canvas.width

  if (gameState == 0) { init(); fade = 0; timer = 0; gameState = 1; } //init game
  if (gameState == 1) { screen(1); timer += 1 * fps; if (timer > 2000) { fade = 0; timer = 0; gameState = 2; } } //start screen
  if (gameState == 2) //The main game loop
  {
    //buttons
    if (Keys.a === 1) { 
      pa += 0.2 * fps; pa = FixAng(pa); pdx = Math.cos(degToRad(pa)); pdy = -Math.sin(degToRad(pa)); 
    }

    if (Keys.d === 1) {    
      pa -= 0.2 * fps; pa = FixAng(pa); pdx = Math.cos(degToRad(pa)); pdy = -Math.sin(degToRad(pa)); 
    }

    let xo = 0; if (pdx < 0) { xo = -20; } else { xo = 20; }                                    //x offset to check map
    let yo = 0; if (pdy < 0) { yo = -20; } else { yo = 20; }                                    //y offset to check map
    let ipx = px / 64.0, ipx_add_xo = (px + xo) / 64.0, ipx_sub_xo = (px - xo) / 64.0;             //x position and offset
    let ipy = py / 64.0, ipy_add_yo = (py + yo) / 64.0, ipy_sub_yo = (py - yo) / 64.0;             //y position and offset

    if (Keys.w === 1)                                                                  //move forward
    {
      if (mapW[(ipy|0) * mapX + (ipx_add_xo|0)] === 0) { px += pdx * 0.2 * fps; }
      if (mapW[(ipy_add_yo|0) * mapX + (ipx|0)] === 0) { py += pdy * 0.2 * fps; }
    }
    if (Keys.s === 1)                                                                  //move backward
    {
      if (mapW[(ipy|0) * mapX + (ipx_sub_xo|0)] == 0) { px -= pdx * 0.2 * fps; }
      if (mapW[(ipy_sub_yo|0 )* mapX + (ipx|0)] == 0) { py -= pdy * 0.2 * fps; }
    }
    drawSky();
    drawRays2D();
    drawSprite();

    if (px >> 6 == 1 && py >> 6 == 1) { fade = 0; timer = 0; gameState = 3; } //Entered block 1, Win game!!
  }

  if (gameState == 3) { screen(2); timer += 1 * fps; if (timer > 2000) { fade = 0; timer = 0; gameState = 0; } } //won screen
  if (gameState == 4) { screen(3); timer += 1 * fps; if (timer > 2000) { fade = 0; timer = 0; gameState = 0; } } //lost screen

  requestAnimationFrame(display)
}


const resize = (w: number, h: number) =>                                                       //screen window rescaled, snap back
{
  //glutReshapeWindow(960, 640);
}

init()
requestAnimationFrame(display)

addEventListener('resize', () => resize(innerWidth, innerHeight))
addEventListener('keydown', e => {
  console.log( 'down', e.code )
  if (e.code === 'KeyA') { Keys.a = 1; }
  if (e.code === 'KeyD') { Keys.d = 1; }
  if (e.code === 'KeyW') { Keys.w = 1; }
  if (e.code === 'KeyS') { Keys.s = 1; }

  if (e.code === 'KeyE' && sp[0].state == 0)             //open doors
  {
    let xo = 0; if (pdx < 0) { xo = -25; } else { xo = 25; }
    let yo = 0; if (pdy < 0) { yo = -25; } else { yo = 25; }
    let ipx = px / 64.0, ipx_add_xo = (px + xo) / 64.0;
    let ipy = py / 64.0, ipy_add_yo = (py + yo) / 64.0;
    if (mapW[(ipy_add_yo|0) * mapX + (ipx_add_xo|0)] == 4) { mapW[(ipy_add_yo|0) * mapX + (ipx_add_xo|0)] = 0; }
  }
})
addEventListener('keyup', e => {
  console.log( 'up', e.code )
  if (e.code === 'KeyA') { Keys.a = 0; }
  if (e.code === 'KeyD') { Keys.d = 0; }
  if (e.code === 'KeyW') { Keys.w = 0; }
  if (e.code === 'KeyS') { Keys.s = 0; }
})
