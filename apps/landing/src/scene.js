/** Original pixel terrace, drawn at native resolution. No assets or runtime dependencies. */
document.querySelectorAll('#friends-scene, #terrace-scene').forEach(canvas => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const panoramic = W > 384;
  const ink = '#182333';
  let active = true, visible = true, paused = false, frame = 0, elapsed = 0, last = 0;
  let pointer = { x: 0, y: 0 }, drift = { x: 0, y: 0 }, scrollDepth = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');

  function rect(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function poly(g, points, color) {
    g.fillStyle = color;
    g.beginPath();
    points.forEach(([x, y], i) => i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y)));
    g.closePath(); g.fill();
  }
  function line(g, points, color, width = 1) {
    g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'square'; g.lineJoin = 'miter';
    g.beginPath();
    points.forEach(([x, y], i) => i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y)));
    g.stroke();
  }
  function layer(draw) {
    const c = document.createElement('canvas'); c.width = W + 24; c.height = H + 12;
    const g = c.getContext('2d'); g.translate(12, 6); draw(g); return c;
  }
  const sky = layer(g => {
    const colors = ['#71819f','#9293ae','#b3a0b1','#d7acb0','#edb4a2','#f6c899','#f9dca8'];
    colors.forEach((color, i) => rect(g, -12, i * 22 - 6, W + 24, 24, color));
    rect(g, -12, 148, W + 24, H, '#e5b19c');
    // A stepped sun and thin, hand-dithered clouds.
    poly(g, [[238,50],[244,44],[270,44],[276,50],[280,56],[280,78],[274,85],[243,85],[236,78],[236,56]], '#ffe3a6');
    rect(g, 236, 67, 44, 2, '#f9cf9b'); rect(g, 241, 78, 35, 2, '#f9cf9b');
    for (const [x,y,w] of [[32,41,45],[54,38,25],[195,29,42],[272,101,49],[119,70,30]]) {
      rect(g,x,y,w,2,'#e7bcc0'); rect(g,x+8,y-2,w-13,2,'#e7bcc0');
    }
    for (let i=0;i<95;i++) {
      const x=(i*71+13)%W, y=83+(i*17)%60;
      rect(g,x,y,1,1, i%2 ? '#eebda7' : '#f7d0a1');
    }
  });
  const city = layer(g => {
    const blocks = [[5,106,31,50],[33,90,26,66],[57,119,22,42],[80,100,35,62],[112,122,30,42],[145,98,28,62],[170,118,36,45],[208,104,25,60],[233,115,32,46],[268,92,32,76],[306,112,30,55],[337,96,45,73]];
    if (panoramic) blocks.push(...blocks.map(([x,y,w,h])=>[x+384,y-8,w,h+8]));
    blocks.forEach(([x,y,w,h],i) => {
      rect(g,x,y,w,h,i%2 ? '#998e9b':'#a5959e');
      rect(g,x-2,y-2,w+4,3,'#8c8496');
      rect(g,x+w-4,y,4,h,'#887f92');
      for(let a=x+5;a<x+w-5;a+=9) for(let b=y+8;b<y+h-5;b+=12) rect(g,a,b,3,5,(a+b)%3 ? '#c5a49c':'#edd19c');
      if(i%3===0){rect(g,x+7,y-10,2,9,'#887f92');rect(g,x+4,y-9,9,1,'#887f92');}
    });
    rect(g,0,150,W,18,'#807b8c');
  });
  const terrace = layer(g => {
    // The little corner café: tiled roof, warm window, striped awning.
    rect(g,-12,74,78,125,'#d1b5a0');rect(g,-12,75,80,5,'#f1d4b0');rect(g,59,80,7,120,'#9f827f');
    for(let y=83;y<195;y+=12){rect(g,-12,y,73,1,'#bd9e91');for(let x=-6;x<58;x+=18)rect(g,x+(y%24?8:0),y,1,12,'#bd9e91');}
    rect(g,2,105,44,63,ink);rect(g,5,108,38,57,'#df9f67');rect(g,7,110,32,34,'#f7d493');
    rect(g,22,108,3,57,'#634d55');rect(g,5,136,38,3,'#634d55');rect(g,4,166,44,4,'#73565a');
    rect(g,9,150,10,3,'#ffdf99');rect(g,29,149,9,5,'#c87e5b');
    poly(g,[[-12,78],[65,78],[75,101],[-12,101]],ink);
    for(let x=-10;x<66;x+=16){poly(g,[[x,80],[x+8,80],[x+17,98],[x+7,98]],'#e66457');poly(g,[[x+8,80],[x+16,80],[x+24,98],[x+17,98]],'#f6dbc0');}
    rect(g,-12,99,89,4,'#633e48');
    rect(g,66,113,20,2,ink);rect(g,82,113,2,10,ink);rect(g,69,123,28,17,ink);rect(g,71,125,24,13,'#ffd56a');
    g.fillStyle=ink;g.font='bold 7px monospace';g.fillText('MATES',73,134);
    // Balustrade and perspective paving.
    rect(g,-12,186,W+24,9,'#394252');rect(g,-12,187,W+24,2,'#79818b');
    for(let x=73;x<W;x+=24){rect(g,x,166,3,28,'#464658');rect(g,x+1,165,1,29,'#847b88');}
    rect(g,67,165,W,3,'#4f4e60');rect(g,67,165,W,1,'#a2949c');
    rect(g,-12,195,W+24,105,'#bf8d7c');
    for(let y=204;y<300;y+=16){rect(g,-12,y,W+24,1,'#a97670');rect(g,-12,y+1,W+24,1,'#d49e83');}
    for(let x=-120;x<W+170;x+=42)line(g,[[W/2+(x-W/2)*.3,195],[x,300]],'#a97670');
    // Planters behind the group.
    for(const x of [58,W-55]){
      rect(g,x,184,29,22,'#784f51');rect(g,x-2,182,33,5,'#bf7864');rect(g,x+3,190,3,13,'#a96357');
      for(let i=0;i<7;i++){const xx=x+5+i*3,yy=153+(i*11)%18;line(g,[[x+14,184],[xx,yy]],'#3c5650',2);poly(g,[[xx,yy+8],[xx-5,yy+3],[xx-4,yy-3],[xx+2,yy],[xx+4,yy+7]],i%2?'#69826b':'#4b6b5d');}
    }
  });

  function mug(x,y,side) {
    rect(ctx,x-5,y-11,10,14,ink);rect(ctx,x-3,y-8,6,10,'#edab47');rect(ctx,x-3,y-10,7,3,'#fff0c9');
    rect(ctx,x-2,y-6,2,7,'#ffda6e');rect(ctx,x+2,y-5,1,6,'#c67542');
    rect(ctx,x+(side>0?4:-8),y-7,4,8,ink);rect(ctx,x+(side>0?5:-7),y-5,2,4,'#e0b391');
    rect(ctx,x-2,y-13,4,2,'#fff0c9');
  }
  const people = [
    {x:104,y:143,shirt:'#4e72bd',shadow:'#354c87',light:'#7798d2',skin:'#e8ab7f',shade:'#b87b60',hair:'#3b2d35',hairLight:'#65434a',style:0,side:1,pants:'#353d55'},
    {x:158,y:137,shirt:'#d87256',shadow:'#a14a47',light:'#ef9b72',skin:'#9e674f',shade:'#754c43',hair:'#25252e',hairLight:'#47404a',style:1,side:-1,pants:'#414b60'},
    {x:225,y:141,shirt:'#eac65d',shadow:'#b58c42',light:'#ffe092',skin:'#edba91',shade:'#c48b70',hair:'#694335',hairLight:'#a36c46',style:2,side:1,pants:'#4e5b6a'},
    {x:278,y:135,shirt:'#5b8b77',shadow:'#3c6059',light:'#8aac87',skin:'#c58a67',shade:'#96614f',hair:'#302c39',hairLight:'#4d4657',style:3,side:-1,pants:'#3b3c50'}
  ];
  if (panoramic) people.forEach(p => { p.x += 196; });

  function person(p,t,index) {
    const bounce = Math.sin(t*1.6+index)*.7;
    ctx.save();ctx.translate(p.x,Math.round(p.y+bounce));
    // Hair silhouette, shoulders, neck and clothes, each with pixel-sized highlights.
    if(p.style===2){poly(ctx,[[-11,-9],[-8,-16],[6,-16],[12,-9],[13,25],[7,30],[-12,25]],ink);rect(ctx,-10,-8,20,30,p.hair);rect(ctx,-8,-5,3,24,p.hairLight);}
    if(p.style===3){rect(ctx,7,-11,8,15,ink);rect(ctx,9,-9,5,11,p.hairLight);}
    rect(ctx,-5,12,10,12,ink);rect(ctx,-3,12,7,10,p.skin);rect(ctx,-3,13,7,3,p.shade);
    poly(ctx,[[-8,20],[-16,24],[-19,35],[-15,58],[14,58],[18,33],[12,24],[7,20]],ink);
    poly(ctx,[[-8,22],[-14,26],[-16,36],[-12,56],[12,56],[15,33],[10,26],[5,22],[0,28]],p.shirt);
    poly(ctx,[[-12,31],[-6,28],[-5,55],[-12,55],[-14,38]],p.shadow);
    rect(ctx,7,29,3,24,p.light);rect(ctx,-2,33,2,21,p.light);rect(ctx,-2,40,2,1,ink);rect(ctx,-2,48,2,1,ink);
    if(index===0){rect(ctx,3,32,6,5,p.shadow);rect(ctx,4,32,4,1,p.light);}
    if(index===1){rect(ctx,-6,27,9,3,'#f3b096');rect(ctx,-8,31,12,3,'#f3b096');}
    if(index===2){rect(ctx,-6,30,12,10,'#ffe3a0');rect(ctx,-4,33,8,2,p.shadow);}
    if(index===3){rect(ctx,-5,27,9,3,'#d9d3ac');rect(ctx,-3,31,5,21,'#d9d3ac');}
    // Jeans, seams and sneakers.
    poly(ctx,[[-13,55],[13,55],[12,84],[9,111],[0,111],[-1,78],[-5,110],[-15,110],[-15,79]],ink);
    poly(ctx,[[-11,58],[10,58],[9,83],[7,108],[2,108],[1,74],[-4,73],[-7,107],[-12,107],[-12,79]],p.pants);
    rect(ctx,-10,63,2,31,'#687186');rect(ctx,6,67,2,34,'#687186');rect(ctx,-11,59,20,3,ink);rect(ctx,-2,59,3,2,'#c9aa7e');
    rect(ctx,-16,108,11,6,ink);rect(ctx,0,109,14,6,ink);rect(ctx,-16,110,10,3,'#e8d4b8');rect(ctx,2,111,12,3,'#e8d4b8');
    // Resting arm, elbow and fingers.
    line(ctx,[[-p.side*12,29],[-p.side*20,44],[-p.side*15,58]],ink,9);
    line(ctx,[[-p.side*12,29],[-p.side*19,44]],p.shirt,6);
    line(ctx,[[-p.side*18,44],[-p.side*15,57]],p.skin,5);rect(ctx,-p.side*15-2,55,5,5,p.skin);
    // Face: ears, warm shadow, nose, eyebrows, a smile and blinking eyes.
    poly(ctx,[[-9,-10],[-5,-14],[6,-14],[11,-8],[10,9],[6,16],[-4,16],[-9,10]],ink);
    poly(ctx,[[-7,-7],[-4,-11],[6,-11],[9,-6],[8,9],[5,13],[-3,13],[-7,8]],p.skin);
    rect(ctx,-7,-5,3,14,p.shade);rect(ctx,5,8,3,3,p.shade);rect(ctx,-10,1,3,6,p.skin);rect(ctx,9,1,2,5,p.shade);
    poly(ctx,[[-10,-6],[-9,-12],[-5,-16],[5,-16],[10,-12],[12,-5],[7,-4],[4,-8],[-2,-6],[-5,-1],[-8,-1]],p.hair);
    rect(ctx,-5,-13,9,2,p.hairLight);rect(ctx,-8,-10,4,3,p.hairLight);rect(ctx,6,-10,3,3,p.hairLight);
    if(p.style===1){for(const [x,y] of [[-10,-8],[-7,-15],[-2,-17],[5,-16],[9,-11]]){rect(ctx,x,y,5,5,p.hair);rect(ctx,x+1,y,2,1,p.hairLight);}}
    if(p.style===2){rect(ctx,-9,-7,4,14,p.hair);rect(ctx,8,-6,3,17,p.hair);rect(ctx,9,1,1,13,p.hairLight);}
    rect(ctx,-3,1,3,1,p.shade);rect(ctx,4,1,3,1,p.shade);
    const blink = (t+index*.8)%5.2>5.04;
    rect(ctx,-2,3,2,blink?1:2,ink);rect(ctx,5,3,2,blink?1:2,ink);rect(ctx,2,5,2,3,p.shade);
    rect(ctx,0,10,5,2,ink);rect(ctx,1,10,3,1,'#ffe7d1');
    if(index===0){rect(ctx,-4,2,6,4,ink);rect(ctx,4,2,5,4,ink);rect(ctx,-3,3,3,2,p.skin);rect(ctx,5,3,2,2,p.skin);rect(ctx,2,3,2,1,ink);}
    // A gentle coordinated toast, with forearms moving towards each other.
    // Hold the contact pose briefly so the toast reads like a sprite animation.
    const toast = Math.min(1, (1-Math.cos(t*1.65))*.6);
    const handX = p.side*(23+toast*4), handY = 26-toast*7;
    line(ctx,[[p.side*12,28],[p.side*20,39],[handX,handY]],ink,9);
    line(ctx,[[p.side*12,28],[p.side*19,36]],p.shirt,6);
    line(ctx,[[p.side*20,36],[handX,handY]],p.skin,5);
    rect(ctx,handX-3,handY-4,6,6,p.skin);rect(ctx,handX-2,handY-4,2,4,p.shade);
    mug(handX,handY-5,p.side);
    ctx.restore();
  }

  function table(x,y) {
    rect(ctx,x-1,y+6,4,56,ink);rect(ctx,x+1,y+7,1,53,'#78636a');
    poly(ctx,[[x-18,y+61],[x-4,y+56],[x+5,y+56],[x+18,y+61],[x+18,y+64],[x-18,y+64]],ink);
    poly(ctx,[[x-28,y-3],[x-22,y-8],[x+22,y-8],[x+28,y-3],[x+28,y+3],[x+20,y+7],[x-21,y+7],[x-28,y+3]],ink);
    poly(ctx,[[x-25,y-3],[x-20,y-6],[x+20,y-6],[x+25,y-3],[x+25,y+1],[x+18,y+3],[x-20,y+3],[x-25,y+1]],'#b37657');
    rect(ctx,x-20,y-5,37,1,'#dda37a');rect(ctx,x-16,y-1,26,1,'#c58b62');rect(ctx,x+8,y+1,12,1,'#865948');
    rect(ctx,x-13,y-9,8,2,'#f1d4ae');rect(ctx,x+6,y-10,6,3,'#ece1c1');
    rect(ctx,x+8,y-19,3,8,'#55735d');rect(ctx,x+9,y-22,2,6,'#728967');rect(ctx,x+6,y-14,7,2,'#55735d');
  }

  function plant(x,y,t,flip=false) {
    ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
    rect(ctx,-15,10,30,30,ink);poly(ctx,[[-13,12],[13,12],[10,38],[-10,38]],'#a95d4f');rect(ctx,-12,14,4,21,'#d38c6b');rect(ctx,-16,8,32,6,ink);rect(ctx,-14,9,28,3,'#dd9c78');
    for(let i=0;i<7;i++){
      const sway=Math.sin(t*.8+i)*1.5, tipX=(i-3)*9+sway, tipY=-20-(i*13)%28;
      line(ctx,[[0,9],[tipX*.4,-8],[tipX,tipY]],'#314d48',2);
      poly(ctx,[[tipX,tipY+12],[tipX-7,tipY+3],[tipX-6,tipY-6],[tipX-1,tipY-10],[tipX+4,tipY-4],[tipX+5,tipY+3]],i%2?'#4d7963':'#355c50');
      line(ctx,[[tipX,tipY+8],[tipX-1,tipY-6]],'#78926f');
    }ctx.restore();
  }

  function render(t) {
    ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,W,H);
    const dx=Math.round(drift.x),dy=Math.round(drift.y + scrollDepth);
    ctx.drawImage(sky,-12+Math.round(dx*.3),-6+Math.round(dy*.2));
    ctx.drawImage(city,-12+Math.round(dx*.65),-6+Math.round(dy*.4));
    ctx.drawImage(terrace,-12,-6);
    // Two small clouds and distant birds drift behind the festoon and friends.
    const cloudX = ((t * 1.4 + 110) % (W + 100)) - 50;
    rect(ctx,cloudX,24,35,2,'#e7bcc0');rect(ctx,cloudX+7,22,22,2,'#e7bcc0');
    const birdX = ((t * 5 + 300) % (W + 50)) - 25;
    const wing = Math.sin(t * 3) > 0 ? -2 : 0;
    for (let i=0;i<2;i++) line(ctx,[[birdX+i*14-3,86+i*7+wing],[birdX+i*14,88+i*7],[birdX+i*14+3,86+i*7+wing]],'#827888');
    // Festoon wire and warm bulbs, using a stepped sag rather than vector curves.
    const wire=[];for(let x=0;x<=W;x+=8)wire.push([x,35+Math.sin(x/W*Math.PI)*26]);line(ctx,wire,ink,2);
    for(let x=18;x<W;x+=33){const y=35+Math.sin(x/W*Math.PI)*26;rect(ctx,x,y,1,6,ink);rect(ctx,x-2,y+5,5,7,'#624745');rect(ctx,x-1,y+6,3,4,'#ffe29a');if(Math.sin(t*1.3+x)>.2){rect(ctx,x-3,y+6,1,3,'#e8c09c');rect(ctx,x+3,y+6,1,3,'#e8c09c');}}
    for(let i=0;i<6;i++){const x=96+i*43,y=22+(i*17)%38;if(Math.sin(t*.6+i)>0){rect(ctx,x,y,1,3,'#ffebc4');rect(ctx,x-1,y+1,3,1,'#ffebc4');}}
    // Subtle ground shadows anchor the friends and café tables.
    for(const p of people){rect(ctx,p.x-19,p.y+112,35,4,'#986c68');rect(ctx,p.x-13,p.y+116,24,2,'#ae7b6e');}
    people.forEach((p,i)=>person(p,t,i));
    table(134+(panoramic?196:0),204);table(252+(panoramic?196:0),201);
    if(panoramic){
      // Empty café seats give the group room to breathe in the wider composition.
      for(const x of [117,627]){
        rect(ctx,x-21,209,3,46,ink);rect(ctx,x+18,209,3,46,ink);
        rect(ctx,x-21,210,42,3,'#d4a17d');rect(ctx,x-21,221,42,3,'#d4a17d');
        rect(ctx,x-23,233,48,5,ink);rect(ctx,x-20,234,42,2,'#b37657');
        rect(ctx,x-21,238,3,29,ink);rect(ctx,x+19,238,3,29,ink);
      }
      table(167,209);table(581,209);
      // A blue bicycle leaning against the railing, in the app's palette.
      for(const x of [687,736]){
        poly(ctx,[[x-13,237],[x-10,229],[x-3,225],[x+5,225],[x+12,231],[x+14,239],[x+10,248],[x+2,252],[x-7,249],[x-13,243]],ink);
        poly(ctx,[[x-10,237],[x-8,231],[x-2,228],[x+4,228],[x+9,233],[x+11,239],[x+8,246],[x+2,249],[x-5,246],[x-10,242]],'#bf8d7c');
      }
      line(ctx,[[687,239],[704,215],[714,239],[687,239],[726,217],[736,239]],'#416eae',3);
      line(ctx,[[704,215],[701,208],[707,208]],ink,2);line(ctx,[[726,217],[723,205],[731,204]],ink,2);
    }
    // Tiny clink flashes appear only when mugs meet.
    if((1-Math.cos(t*1.65))*.5>.88){for(const [baseX,y] of [[132,152],[252,148]]){const x=baseX+(panoramic?196:0);rect(ctx,x,y-3,1,5,'#ffe7ad');rect(ctx,x-2,y-1,5,1,'#ffe7ad');rect(ctx,x-5,y-6,2,1,'#ffe7ad');rect(ctx,x+5,y-5,1,2,'#ffe7ad');}}
    ctx.save();ctx.translate(Math.round(dx*.3),Math.round(dy*-.25));
    plant(24,253,t);plant(W-23,244,t,true);ctx.restore();
    // A sleepy café cat, tucked into the foreground.
    poly(ctx,[[306,279],[304,272],[309,266],[308,260],[313,262],[318,261],[321,258],[323,266],[329,270],[331,278]],ink);
    poly(ctx,[[308,277],[307,272],[312,268],[312,264],[319,264],[322,268],[327,272],[328,277]],'#d49768');
    rect(ctx,313,266,2,1,ink);rect(ctx,319,266,2,1,ink);rect(ctx,316,269,2,1,'#9c5c50');
    const tail = Math.round(Math.sin(t*1.2)*2);
    line(ctx,[[329,276],[336,275],[338,271+tail],[336,268+tail]],ink,3);
  }
  function running(){return active&&visible&&!paused&&!motion.matches;}
  function loop(now) {
    frame=0;if(!running())return;
    if(now-last>=50){const dt=last?Math.min(now-last,100):50;last=now;elapsed+=dt/1000;drift.x+=(pointer.x-drift.x)*.12;drift.y+=(pointer.y-drift.y)*.12;render(elapsed);}
    frame=requestAnimationFrame(loop);
  }
  function sync(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;if(running())frame=requestAnimationFrame(loop);else{drift={x:0,y:0};if(paused||motion.matches)scrollDepth=0;render(elapsed);}}
  const composition = canvas.closest('.scene-composition, .terrace-panorama');
  composition.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=canvas.getBoundingClientRect();pointer={x:Math.max(-6,Math.min(6,((e.clientX-r.left)/r.width-.5)*12)),y:Math.max(-3,Math.min(3,((e.clientY-r.top)/r.height-.5)*6))};});
  composition.addEventListener('pointerleave',()=>{pointer={x:0,y:0};});
  document.addEventListener('mates:depth',e=>{
    if(!visible)return;
    const bounds=canvas.getBoundingClientRect();
    scrollDepth=e.detail.paused?0:Math.max(-1,Math.min(1,(innerHeight/2-bounds.top-bounds.height/2)/innerHeight))*5;
  });
  document.addEventListener('visibilitychange',()=>{active=!document.hidden;sync();});
  document.addEventListener('mates:motion',e=>{paused=e.detail.paused;sync();});
  motion.addEventListener('change',sync);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{rootMargin:'80px'}).observe(canvas);
  render(1.6);sync();
});
