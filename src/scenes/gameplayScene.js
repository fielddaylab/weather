var default_complete = false;
var paint = false;
var sys = !paint;
var anneal = true;
var airdeath = true;

var vec_length = 10;
var flag_length = 10;

var ENUM;

ENUM = 0;
var P_TYPE_HIGH = ENUM; ENUM++;
var P_TYPE_LOW  = ENUM; ENUM++;

ENUM = 0;
var L_TYPE_NONE       = ENUM; ENUM++;
var L_TYPE_FLAG       = ENUM; ENUM++;
var L_TYPE_BALLOON    = ENUM; ENUM++;

ENUM = 0;
var PP_MODE_PLAY  = ENUM; ENUM++;
var PP_MODE_PAUSE = ENUM; ENUM++;

ENUM = 0;
var GAME_MODE_MENU  = ENUM; ENUM++;
var GAME_MODE_PLAY  = ENUM; ENUM++;
var GAME_MODE_BLURB = ENUM; ENUM++;

var GamePlayScene = function(game, stage)
{
  var self = this;

  //index:  0 refers to first, 1 refers to second, 0.5 refers to "the value between first and second"
  //sample: both 0 AND 1 refer to, identically, "the value between last and first", 0.5 refers to "the value between first and last"
  function indexToSample (i,n) { return   (i+0.5)/n;       }
  function indexToSampleW(i,n) { return (((i+0.5)/n)+1)%1; }
  function sampleToIndex (s,n) { return   (s*n)-0.5;       }
  function sampleToIndexW(s,n) { return (((s*n)-0.5)+n)%n; }

  function decw(i,n) { return ((i-1)+n)%n; };
  function incw(i,n) { return (i+1)%n; };

  var HeightMap = function(w,h)
  {
    var self = this;
    self.w = w;
    self.h = h;
    self.buffs = [];
    self.buffs[0] = [];
    self.buffs[1] = [];
    for(var i = 0; i < w*h; i++) self.buffs[0][i] = self.buffs[1][i] = 0.5+Math.random()*0.5;
    self.buff = 0;
    self.data = self.buffs[self.buff];

    self.iFor = function(x,y) { return (y*w)+x; }
    self.anneal = function(t)
    {
      var oldb = self.buff;
      var newb = (self.buff+1)%2;
      for(var y = 0; y < h; y++)
      {
        for(var x = 0; x < w; x++)
        {
          var index = self.iFor(x,y);
          self.buffs[newb][index] = self.buffs[oldb][index];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(decw(x,w),y)];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(incw(x,w),y)];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(x,decw(y,h))];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(x,incw(y,h))];
          self.buffs[newb][index] /= 5;
          self.buffs[newb][index] = lerp(self.buffs[oldb][index],self.buffs[newb][index],t);
        }
      }
      self.buff = (self.buff+1)%2;
      self.data = self.buffs[self.buff];
    }
    self.sample = function(x,y)
    {
      x = sampleToIndexW(x,self.w);
      y = sampleToIndexW(y,self.h);
      var low_x  = Math.floor(x);
      var high_x = Math.ceil (x)%self.w;
      var low_y  = Math.floor(y);
      var high_y = Math.ceil (y)%self.h;

      var tl = self.data[self.iFor( low_x, low_y)];
      var tr = self.data[self.iFor(high_x, low_y)];
      var bl = self.data[self.iFor( low_x,high_y)];
      var br = self.data[self.iFor(high_x,high_y)];

      var t = lerp(tl,tr,x%1);
      var b = lerp(bl,br,x%1);
      return lerp(t,b,y%1);
    }
    self.takeValsFromHmap = function(hmap)
    {
      for(var y = 0; y < self.h; y++)
      {
        for(var x = 0; x < self.w; x++)
        {
          var index = self.iFor(x,y);
          self.data[index] = hmap.sample(indexToSampleW(x,self.w),indexToSampleW(y,self.h));
        }
      }
    }
  }
  var VecField2d = function(w,h)
  {
    var self = this;
    self.w = w;
    self.h = h;
    self.x_map = new HeightMap(w,h);
    self.y_map = new HeightMap(w,h);

    self.sample = function(x,y)
    {
      return {x:self.x_map.sample(x,y),y:self.y_map.sample(x,y)};
    }
    self.sampleFill = function(x,y,obj)
    {
      obj.x = self.x_map.sample(x,y);
      obj.y = self.y_map.sample(x,y);
      return obj;
    }
    self.samplePolar = function(x,y)
    {
      var x_val = self.x_map.sample(x,y);
      var y_val = self.y_map.sample(x,y);

      var ret = {dir:0,len:0};
      ret.len = Math.sqrt(x_val*x_val+y_val*y_val);
      x_val /= ret.len;
      y_val /= ret.len;
      if(ret.len < 0.001) ret.dir = 0;
      else ret.dir = Math.atan2(y_val,x_val);

      return ret;
    }
    self.samplePolarFill = function(x,y,obj)
    {
      var x_val = self.x_map.sample(x,y);
      var y_val = self.y_map.sample(x,y);

      obj.len = Math.sqrt(x_val*x_val+y_val*y_val);
      x_val /= obj.len;
      y_val /= obj.len;
      if(obj.len < 0.001) obj.dir = 0;
      else obj.dir = Math.atan2(y_val,x_val);

      return obj;
    }
    self.polarAtIndex = function(i)
    {
      var x_val = self.x_map.data[i];
      var y_val = self.y_map.data[i];

      var ret = {dir:0,len:0};
      ret.len = Math.sqrt(x_val*x_val+y_val*y_val);
      x_val /= ret.len;
      y_val /= ret.len;
      if(ret.len < 0.001) ret.dir = 0;
      else ret.dir = Math.atan2(y_val,x_val);

      return ret;
    }
    self.polarAtIndexFill = function(i,obj)
    {
      var x_val = self.x_map.data[i];
      var y_val = self.y_map.data[i];

      obj.len = Math.sqrt(x_val*x_val+y_val*y_val);
      x_val /= obj.len;
      y_val /= obj.len;
      if(obj.len < 0.001) obj.dir = 0;
      else obj.dir = Math.atan2(y_val,x_val);

      return obj;
    }

    self.iFor = self.x_map.iFor;
  }
  var AirField = function(n)
  {
    var self = this;
    self.partxs = [];
    self.partys = [];
    self.partts = [];
    self.n = n;
    for(var i = 0; i < self.n; i++)
    {
      self.partxs[i] = Math.random();
      self.partys[i] = Math.random();
      self.partts[i] = Math.random();
    }
  }
  var Balloon = function()
  {
    var self = this;
    self.x = 0.2;
    self.y = 0.2;
    self.w = 0.02;
    self.h = 0.02;

    self.cache_w = self.w*stage.drawCanv.canvas.width;
    self.cache_h = self.h*stage.drawCanv.canvas.height;
  }
  var Brush = function(w,h, scene)
  {
    var self = this;
    self.x = 0;
    self.y = 0;
    self.w = w;
    self.h = h;

    self.r = 0.1;
    self.delta = 0.2;

    self.down = false;

    self.last_evt;

    self.dragStart = function(evt)
    {
      self.drag(evt);
    }
    self.drag = function(evt)
    {
      self.last_evt = evt;
      self.down = true;
    }
    self.dragFinish = function(evt)
    {
      self.down = false;
    }

    self.tick = function()
    {
      if(!self.down) return;
      for(var i = 0; i < scene.pmap.h; i++)
      {
        for(var j = 0; j < scene.pmap.w; j++)
        {
          var index = i*scene.pmap.w+j;
          var xd = ((indexToSample(j,scene.pmap.w)*self.w)-self.last_evt.doX)/self.w; //-1 - 1
          var yd = ((indexToSample(i,scene.pmap.h)*self.h)-self.last_evt.doY)/self.h; //-1 - 1
          var d = (xd*xd + yd*yd) / (self.r*self.r);
          if(d > 1) continue;

               if(scene.p_type == P_TYPE_HIGH) scene.pmap.data[index] += (1-(d*d*d*d))*self.delta*1;
          else if(scene.p_type == P_TYPE_LOW)  scene.pmap.data[index] += (1-(d*d*d*d))*self.delta*-1;

          if(scene.pmap.data[index] > 1) scene.pmap.data[index] = 1;
          if(scene.pmap.data[index] < 0) scene.pmap.data[index] = 0;
        }
      }

    }
  }
  var PSys = function(x,y,r,delta,scene)
  {
    var self = this;
    self.sx = x;
    self.sy = y;
    self.r = r;
    self.w = 20;
    self.h = 20;
    self.x = self.sx*stage.drawCanv.canvas.width-(self.w/2);
    self.y = self.sy*stage.drawCanv.canvas.height-(self.h/2);

    self.delta = delta;
    if(self.delta > 0)
    {
      self.text = "H";
      self.color_fill = "#FFFFFF";
      self.color_stroke = "#000000";
    }
    else
    {
      self.text = "L";
      self.color_fill = "#000000";
      self.color_stroke = "#FFFFFF";
    }

    self.dragging = false;
    self.hovering = false;

    self.hover = function()
    {
      self.hovering = true;
    }
    self.unhover = function()
    {
      self.hovering = false;
    }
    self.dragStart = function(evt)
    {
      if(scene.dragging_sys) return;
      scene.dragging_sys = self;
      self.dragging = true;
    }
    self.drag = function(evt)
    {
      if(self.dragging)
      {
        self.sx = evt.doX/stage.drawCanv.canvas.width;
        self.sy = evt.doY/stage.drawCanv.canvas.height;
        self.x = evt.doX-(self.w/2);
        self.y = evt.doY-(self.h/2);
      }
    }
    self.dragFinish = function(evt)
    {
      self.dragging = false;
      scene.dragging_sys = undefined;
    }

    self.draw = function(canv)
    {
      stage.drawCanv.context.font = "30px arial";
      canv.outlineText(self.text,self.x+self.w/2-10,self.y+self.h/2+10,self.color_fill,self.color_stroke);

      if(self.hovering || self.dragging)
      {
        canv.context.lineWidth = 3;
        canv.context.strokeStyle = self.color_fill;
        canv.context.strokeRect(self.x-5,self.y-5,self.w+10,self.h+10);
      }
    }
  }

  var ClipBoard = function(x,y,w,h,scene,levels)
  {
    var self = this;

    self.canv;

    self.x = x;
    self.y = y;
    self.w = w;
    self.h = h;
    self.desired_y = y;

    self.canv = new Canv(
      {
        width:self.w,
        height:self.h,
        fillStyle:"#000000",
        strokeStyle:"#000000",
        smoothing:true
      }
    );

    self._dirty = true;

    self.buttons = [];
    self.dismiss_button = new ButtonBox(self.w-20-20,20,20,20, function(on) { scene.setMode(GAME_MODE_PLAY); }); self.buttons.push(self.dismiss_button);
    self.dismiss_button.draw = function(canv)
    {
      if(this.down) canv.context.strokeStyle = "#00F400";
      else          canv.context.strokeStyle = "#000000";

      canv.context.fillStyle = "#00F400";

      canv.context.fillRect(this.off_x,this.off_y,this.w,this.h);
      canv.context.strokeRect(this.off_x+0.5,this.off_y+0.5,this.w,this.h);
    }

    var bs = 70;
    var b;
    //must manually unroll because js is terrible
      b = new ButtonBox(20+((bs+10)*0),20+((bs+10)*0),bs,bs,
        function(on)
        {
          if(self.buttons[0+1].level == 0 || levels[self.buttons[0+1].level-1].complete)
          {
            scene.beginLevel(self.buttons[0+1].level);
            scene.setMode(GAME_MODE_PLAY);
          }
        });
      b.level = 0;
      b.title_a = "Lvl 0";
      b.title_b = "Playground";
      self.buttons.push(b);

      b = new ButtonBox(20+((bs+10)*1),20+((bs+10)*0),bs,bs,
        function(on)
        {
          if(self.buttons[1+1].level == 0 || levels[self.buttons[1+1].level-1].complete)
          {
            scene.beginLevel(self.buttons[1+1].level);
            scene.setMode(GAME_MODE_PLAY);
          }
        });
      b.level = 1;
      b.title_a = "Lvl 1";
      b.title_b = "Easy Flag";
      self.buttons.push(b);

      b = new ButtonBox(20+((bs+10)*2),20+((bs+10)*0),bs,bs,
        function(on)
        {
          if(self.buttons[2+1].level == 0 || levels[self.buttons[2+1].level-1].complete)
          {
            scene.beginLevel(self.buttons[2+1].level);
            scene.setMode(GAME_MODE_PLAY);
          }
        });
      b.level = 2;
      b.title_a = "Lvl 2";
      b.title_b = "Angled Flag";
      self.buttons.push(b);

      b = new ButtonBox(20+((bs+10)*3),20+((bs+10)*0),bs,bs,
        function(on)
        {
          if(self.buttons[3+1].level == 0 || levels[self.buttons[3+1].level-1].complete)
          {
            scene.beginLevel(self.buttons[3+1].level);
            scene.setMode(GAME_MODE_PLAY);
          }
        });
      b.level = 3;
      b.title_a = "Lvl 3";
      b.title_b = "Cyclone";
      self.buttons.push(b);

      b = new ButtonBox(20+((bs+10)*4),20+((bs+10)*0),bs,bs,
        function(on)
        {
          if(self.buttons[4+1].level == 0 || levels[self.buttons[4+1].level-1].complete)
          {
            scene.beginLevel(self.buttons[4+1].level);
            scene.setMode(GAME_MODE_PLAY);
          }
        });
      b.level = 4;
      b.title_a = "Lvl 4";
      b.title_b = "Anti Cyclone";
      self.buttons.push(b);

      b = new ButtonBox(20+((bs+10)*5),20+((bs+10)*0),bs,bs,
        function(on)
        {
          if(self.buttons[5+1].level == 0 || levels[self.buttons[5+1].level-1].complete)
          {
            scene.beginLevel(self.buttons[5+1].level);
            scene.setMode(GAME_MODE_PLAY);
          }
        });
      b.level = 5;
      b.title_a = "Lvl 5";
      b.title_b = "Balloon";
      self.buttons.push(b);

    //quick hack to fix clicker even though on separate canv
    var draw = function(canv)
    {
      if(this.down) canv.context.strokeStyle = "#00F400";
      else          canv.context.strokeStyle = "#000000";

      if(this.level == 0 || levels[this.level-1].complete)
        canv.context.fillStyle = "#00F400";
      else
        canv.context.fillStyle = "#FF8800";

      canv.context.fillRect(this.off_x,this.off_y,this.w,this.h);
      canv.context.strokeRect(this.off_x+0.5,this.off_y+0.5,this.w,this.h);
      canv.context.fillStyle = "#000000";
      canv.context.fillText(this.title_a,this.off_x+10,this.off_y+20);
      canv.context.fillText(this.title_b,this.off_x+10,this.off_y+50);
    }
    for(var i = 0; i < self.buttons.length; i++)
    {
      var b = self.buttons[i];

      b.off_x = b.x;
      b.off_y = b.y;
      b.x = b.off_x+self.x;
      b.y = b.off_y+self.y;

      if(i != 0) //for dismiss button, I know, hack
        b.draw = draw;
    }

    self.draw = function(canv)
    {
      if(self.isDirty())
      {
        self.canv.clear();

        self.canv.context.fillStyle = "#000000";
        self.canv.context.fillRect(0,0,self.w,self.h);
        self.canv.context.fillStyle = "#FFFFFF";
        self.canv.context.fillRect(10,10,self.w-20,self.h-10);

        self.canv.strokeStyle = "#000000";

        for(var i = 0; i < self.buttons.length; i++)
          self.buttons[i].draw(self.canv);
      }

      if(self.y < canv.canvas.height) //if on screen
        canv.context.drawImage(self.canv.canvas, 0, 0, self.w, self.h, self.x, self.y, self.w, self.h);
    }

    self.tick = function()
    {
      if(self.desired_y != self.y)
      {
        if(Math.abs(self.desired_y-self.y) < 1) self.y = self.desired_y;
        else self.y = lerp(self.y, self.desired_y, 0.2);

        for(var i = 0; i < self.buttons.length; i++)
        {
          var b = self.buttons[i];
          b.x = b.off_x+self.x;
          b.y = b.off_y+self.y;
        }
      }
    }

    self.register = function(clicker)
    {
      for(var i = 0; i < self.buttons.length; i++)
        clicker.register(self.buttons[i]);
    }

    self.dirty   = function() { self._dirty = true; }
    self.cleanse = function()
    {
      self._dirty = false;
    }
    self.isDirty = function() { return self._dirty; }
  }

  var Blurb = function(scene)
  {
    var self = this;
    self.x = 0;
    self.y = 0;
    self.w = 0;
    self.h = 0;
    self.txt = "";
    self.lines;
    self.txt_x = 0;
    self.txt_y = 0;
    self.txt_w = 0;
    self.txt_h = 0;
    self.img = "";
    self.img_x = 0;
    self.img_y = 0;
    self.img_w = 0;
    self.img_h = 0;
    self.img_el;

    self.format = function(canv)
    {
      self.lines = [];
      var found = 0;
      var searched = 0;
      var tentative_search = 0;

      //stage.drawCanv.context.font=whaaaat;
      while(found < self.txt.length)
      {
        searched = self.txt.indexOf(" ",found);
        if(searched == -1) searched = self.txt.length;
        tentative_search = self.txt.indexOf(" ",searched+1);
        if(tentative_search == -1) tentative_search = self.txt.length;
        while(canv.context.measureText(self.txt.substring(found,tentative_search)).width < self.txt_w && searched != self.txt.length)
        {
          searched = tentative_search;
          tentative_search = self.txt.indexOf(" ",searched+1);
          if(tentative_search == -1) tentative_search = self.txt.length;
        }
        if(self.txt.substring(searched, searched+1) == " ") searched++;
        self.lines.push(self.txt.substring(found,searched));
        found = searched;
      }

      if(self.img && self.img.length)
      {
        self.img_el = new Image();
        self.img_el.src = "assets/"+self.img+".png";
      }
      else
        self.img_el = undefined;
    }

    self.draw = function(canv)
    {
      stage.drawCanv.context.font = "16px arial";
      canv.context.fillStyle = "#FFFFFF";
      canv.context.fillRect(self.x,self.y,self.w,self.h);
      canv.context.strokeStyle = "#000000";
      canv.context.strokeRect(self.x,self.y,self.w,self.h);

      canv.context.fillStyle = "#000000";
      for(var i = 0; i < self.lines.length; i++)
        canv.context.fillText(self.lines[i],self.txt_x,self.txt_y+(i*15),self.txt_w);

      if(self.img_el)
        canv.context.drawImage(self.img_el, self.img_x, self.img_y, self.img_w, self.img_h);

      canv.context.fillText("(click to dismiss)",self.x+10,self.y+self.h-10,self.w);
    }

    self.click = function(evt)
    {
      scene.setMode(GAME_MODE_PLAY);
    }
  }

  var Checkpoint = function(x,y,w,h)
  {
    var self = this;
    //normalized vals
    self.x = x;
    self.y = y;
    self.w = w;
    self.h = h;

    //actual map vals
    self.cache_x = 0;
    self.cache_y = 0;
    self.cache_w = 0;
    self.cache_h = 0;

    self.met = false;
  }
  var Flag = function(x,y,xd,yd)
  {
    var self = this;

    //normalized vals
    self.x = x;
    self.y = y;
    self.xd = 0.;
    self.yd = 0.;
    self.goal_xd = xd;
    self.goal_yd = yd;

    //actual map vals
    self.cache_x = 0;
    self.cache_y = 0;
    self.goal_cache_xd = 0;
    self.goal_cache_yd = 0;

    self.cache_t = 0;
    self.cache_l = 0;
    self.goal_cache_t = 0;
    self.goal_cache_l = 0;

    self.met = false;
  }
  var Level = function()
  {
    var self = this;
    self.type = L_TYPE_BALLOON;

    //L_TYPE_BALLOON
    self.start = {x:0,y:0}; //just use a checkpoint if you want
    self.checkpoints = [];

    //L_TYPE_FLAG
    self.flags = [];

    self.complete = default_complete;
  }

  self.game_mode;
  self.pp_mode;
  self.cur_level;
  self.levels;

  self.pmap;
  self.vfield;
  self.afield;
  self.balloon;
  self.brush;
  self.psys;
  self.dragging_sys;

  self.clip;
  self.menu_button;
  self.pp_button;
  self.blurb;

  self.p_type = P_TYPE_LOW;
  self.p_type_toggle_h;
  self.p_type_toggle_l;

  self.p_store_h;
  self.p_store_l;

  self.menu_clicker;
  self.play_clicker;
  self.play_presser;
  self.play_hoverer;
  self.play_dragger;
  self.blurb_clicker;

  self.ready = function()
  {
    self.menu_clicker = new Clicker({source:stage.dispCanv.canvas});
    self.play_clicker = new Clicker({source:stage.dispCanv.canvas});
    self.play_presser = new Presser({source:stage.dispCanv.canvas});
    self.play_hoverer = new Hoverer({source:stage.dispCanv.canvas});
    self.play_dragger = new Dragger({source:stage.dispCanv.canvas});
    self.blurb_clicker = new Clicker({source:stage.dispCanv.canvas});

    self.cur_level = 0;
    self.levels = [];

    self.clip = new ClipBoard(20,20,stage.drawCanv.canvas.width-40,stage.drawCanv.canvas.height-20,self,self.levels);
    self.clip.register(self.menu_clicker);
    self.blurb = new Blurb(self);
    self.blurb_clicker.register(self.blurb);

    self.menu_button = new ButtonBox(stage.drawCanv.canvas.width-10-20,10,20,20, function(on) { self.setMode(GAME_MODE_MENU); });
    self.play_clicker.register(self.menu_button);

    self.pp_button = new ButtonBox(stage.drawCanv.canvas.width/2-10,10,20,20, function(on) { self.pp_mode = !self.pp_mode; });
    self.play_clicker.register(self.pp_button);

    self.pmap = new HeightMap(20,20);
    self.vfield = new VecField2d(30,30);
    self.afield = new AirField(2000);
    self.balloon = new Balloon();

    if(paint)
    {
      self.brush = new Brush(stage.drawCanv.canvas.width,stage.drawCanv.canvas.height,self);
      self.play_dragger.register(self.brush);
    }
    if(sys)
    {
      self.psys = [];
      self.psys.push(new PSys(0.2,0.5,0.1,-0.1,self));
      self.psys.push(new PSys(0.8,0.5,0.1, 0.1,self));
      for(var i = 0; i < self.psys.length; i++)
      {
        self.play_hoverer.register(self.psys[i]);
        self.play_dragger.register(self.psys[i]);
      }
    }

    if(paint)
    {
      self.p_type_toggle_h = new ToggleBox(10,10,20,20, false, function(o) { self.p_type = !o; self.p_type_toggle_l.on =  self.p_type; });
      self.p_type_toggle_l = new ToggleBox(40,10,20,20,  true, function(o) { self.p_type =  o; self.p_type_toggle_h.on = !self.p_type; });
      self.play_presser.register(self.p_type_toggle_h)
      self.play_presser.register(self.p_type_toggle_l)
    }
    if(sys)
    {
      function fdstart(evt) {  };
      function fdrag(evt) { if(self.dragging_sys) self.dragging_sys.drag(evt); };
      function fdfinish() { if(self.dragging_sys) self.dragging_sys.dragFinish(); };

      self.p_store_h = new BinBox(10,10,20,20, fdstart, fdrag, fdfinish,
        function(evt)
        {
          var p = new PSys(0.,0.,0.1,0.1,self);
          self.psys.push(p);
          self.play_hoverer.register(p);
          self.play_dragger.register(p);
          p.dragStart(evt);
        },
        function()
        {
          var p = self.dragging_sys;
          self.play_hoverer.unregister(p);
          self.play_dragger.unregister(p);
          for(var i = 0; i < self.psys.length; i++)
            if(self.psys[i] == p) self.psys.splice(i,1);
          self.dragging_sys = undefined;
        });
      self.p_store_l = new BinBox(40,10,20,20, fdstart, fdrag, fdfinish,
        function(evt)
        {
          var p = new PSys(0.,0.,0.1,-0.1,self);
          self.psys.push(p);
          self.play_hoverer.register(p);
          self.play_dragger.register(p);
          p.dragStart(evt);
        },
        function()
        {
          var p = self.dragging_sys;
          self.play_hoverer.unregister(p);
          self.play_dragger.unregister(p);
          for(var i = 0; i < self.psys.length; i++)
            if(self.psys[i] == p) self.psys.splice(i,1);
          self.dragging_sys = undefined;
        })
      self.play_presser.register(self.p_store_h);
      self.play_presser.register(self.p_store_l);
      self.play_dragger.register(self.p_store_h);
      self.play_dragger.register(self.p_store_l);
    }


    //MYLEVELS
    var l;

    l = new Level();
    l.type = L_TYPE_NONE;
    l.flags.push(new Flag(0.5,0.5,-2.0,0.0));
    self.levels.push(l);

    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.5,0.5,-2.0,0.0));
    self.levels.push(l);

    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.5,0.5,2.0,2.0));
    self.levels.push(l);

    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.4,0.5,0.0,2.0));
    l.flags.push(new Flag(0.6,0.5,0.0,-2.0));
    self.levels.push(l);

    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.5,0.4,2.0,0.0));
    l.flags.push(new Flag(0.5,0.6,-2.0,0.0));
    self.levels.push(l);

    l = new Level();
    l.type = L_TYPE_BALLOON;
    l.start = new Checkpoint(0.1,0.1,0.1,0.1);
    l.checkpoints.push(new Checkpoint(0.5,0.5,0.1,0.1));
    self.levels.push(l);

    self.pp_mode = true;
    self.beginLevel(0);
    self.levels[self.cur_level].complete = true;
    self.setMode(GAME_MODE_MENU);

  /*
    var b = new Blurb();
    b.x = 10;
    b.y = 10;
    b.w = 300;
    b.h = 300;
    b.txt = "bananarama";
    b.lines;
    b.txt_x = 0;
    b.txt_y = 0;
    b.txt_w = 0;
    b.txt_h = 0;
    b.img = "";
    b.img_x = 0;
    b.img_y = 0;
    b.img_w = 0;
    b.img_h = 0;

    setTimeout(function(){ self.popBlurb(b); },1000);
  */
  };

  self.setMode = function(mode)
  {
    self.menu_clicker.ignore();
    self.play_clicker.ignore();
    self.play_presser.ignore();
    self.play_hoverer.ignore();
    self.play_dragger.ignore();
    self.blurb_clicker.ignore();

    self.game_mode = mode;

    self.clip.dirty();
    if(self.game_mode == GAME_MODE_MENU) self.clip.desired_y = 20;
    if(self.game_mode == GAME_MODE_PLAY) self.clip.desired_y = 500;
  }

  self.beginLevel = function(l)
  {
    self.cur_level = l;
    var l = self.levels[self.cur_level];

    if(l.type == L_TYPE_FLAG)
    {
      var f;
      for(var i = 0; i < l.flags.length; i++)
      {
        f = l.flags[i];
        f.cache_x = f.x*stage.drawCanv.canvas.width;
        f.cache_y = f.y*stage.drawCanv.canvas.height;
        f.goal_cache_xd = f.cache_x+f.goal_xd*flag_length;
        f.goal_cache_yd = f.cache_y+f.goal_yd*flag_length;

        f.goal_cache_l = Math.sqrt(f.goal_xd*f.goal_xd+f.goal_yd*f.goal_yd);
        f.goal_cache_t = Math.atan2(f.goal_yd/f.goal_cache_l,f.goal_xd/f.goal_cache_l);
      }
    }
    if(l.type == L_TYPE_BALLOON)
    {
      var c;
      for(var i = 0; i < l.checkpoints.length; i++)
      {
        c = l.checkpoints[i];
        c.cache_w = c.w*stage.drawCanv.canvas.width;
        c.cache_h = c.h*stage.drawCanv.canvas.height;
        c.cache_x = c.x*stage.drawCanv.canvas.width;
        c.cache_y = c.y*stage.drawCanv.canvas.height;
      }
      self.balloon.x = l.start.x;
      self.balloon.y = l.start.y;
    }
  }

  self.popBlurb = function(blurb)
  {
    self.blurb.x = blurb.x;
    self.blurb.y = blurb.y;
    self.blurb.w = blurb.w;
    self.blurb.h = blurb.h;
    self.blurb.txt = blurb.txt;
    if(blurb.txt_x || blurb.txt_y || blurb.txt_w || blurb.txt_h) //if any properties set on blurb text pos
    {
      self.blurb.txt_x = blurb.txt_x;
      self.blurb.txt_y = blurb.txt_y;
      self.blurb.txt_w = blurb.txt_w;
      self.blurb.txt_h = blurb.txt_h;
    }
    else //otherwise assume full text area
    {
      self.blurb.txt_x = blurb.x+10;
      self.blurb.txt_y = blurb.y+15;
      self.blurb.txt_w = blurb.w-10;
      self.blurb.txt_h = blurb.h-30;
    }
    self.blurb.img = blurb.img;
    self.blurb.img_x = blurb.img_x;
    self.blurb.img_y = blurb.img_y;
    self.blurb.img_w = blurb.img_w;
    self.blurb.img_h = blurb.img_h;
    self.blurb.format(stage.drawCanv);
    self.setMode(GAME_MODE_BLURB);
  }

  self.ticks = 0;
  self.tick = function()
  {
    if(self.game_mode == GAME_MODE_MENU)
    {
      self.menu_clicker.flush();
    }
    else if(self.game_mode == GAME_MODE_PLAY)
    {
      self.play_clicker.flush();
      self.play_presser.flush();
      self.play_hoverer.flush();
      self.play_dragger.flush();
    }
    else if(self.game_mode == GAME_MODE_BLURB)
    {
      self.blurb_clicker.flush();
    }

    self.clip.tick();

    /*
    // pressure
    */
    if(anneal && self.pp_mode)
    {
      self.pmap.anneal(0.10);
    }
    if(paint)
    {
      self.brush.tick();
    }
    if(sys)
    {
      index = 0;
      for(var i = 0; i < self.pmap.h; i++)
      {
        for(var j = 0; j < self.pmap.w; j++)
        {
          for(var k = 0; k < self.psys.length; k++)
          {
            var xd = indexToSample(j,self.pmap.w)-self.psys[k].sx;
            var yd = indexToSample(i,self.pmap.h)-self.psys[k].sy;
            var d = (xd*xd + yd*yd) / (self.psys[k].r*self.psys[k].r);
            if(d < 1) self.pmap.data[index] += (1-(d*d*d*d))*self.psys[k].delta;
          }

          if(self.pmap.data[index] > 1) self.pmap.data[index] = 1;
          if(self.pmap.data[index] < 0) self.pmap.data[index] = 0;

          index++;
        }
      }
    }

    /*
    // wind
    */
    for(var i = 0; i < self.vfield.h; i++)
    {
      for(var j = 0; j < self.vfield.w; j++)
      {
        var lowest_t  = 0; var lowest_p  = 1;
        var highest_t = 0; var highest_p = 0;
        var x = indexToSampleW(j,self.vfield.w);
        var y = indexToSampleW(i,self.vfield.h);
        var d = 0.05;
        var p = 0;
        for(var t = 0; t < Math.PI*2; t += 0.1)
        {
          p = self.pmap.sample(x+Math.cos(t)*d,y+Math.sin(t)*d);
          if(p < lowest_p)  { lowest_t  = t; lowest_p  = p; }
          if(p > highest_p) { highest_t = t; highest_p = p; }
        }

        var index = self.vfield.iFor(j,i);

        theta = self.vfield.polarAtIndex(index).dir;

        //rotate slightly ccw
        lowest_t -= 0.4;
        highest_t -= 0.4;

        var t = lerp(lowest_t,highest_t,0.5);
        var lx = Math.cos(lowest_t);
        var ly = Math.sin(lowest_t);
        var x = Math.cos(t);
        var y = Math.sin(t);
        if((-lx)*(y-ly) - (-ly)*(x-lx) > 0) t = (t+Math.PI)%(2*Math.PI);

        var new_t = clerp(theta,t,0.1);
        var new_l = Math.abs(highest_p-lowest_p)*(1-lowest_p)*5;

        self.vfield.x_map.data[index] = Math.cos(new_t)*new_l;
        self.vfield.y_map.data[index] = Math.sin(new_t)*new_l;
      }
    }

    /*
    // air
    */
    var x;
    var y;
    if(self.pp_mode)
    {
      for(var i = 0; i < self.afield.n; i++)
      {
        self.afield.partts[i] -= 0.01;
        if(airdeath && self.afield.partts[i] <= 0)
        {
          self.afield.partts[i] = 1;
          self.afield.partxs[i] = Math.random();
          self.afield.partys[i] = Math.random();
        }
        else
        {
          x = self.vfield.x_map.sample(self.afield.partxs[i],self.afield.partys[i]);
          y = self.vfield.y_map.sample(self.afield.partxs[i],self.afield.partys[i]);
          self.afield.partxs[i] += x/100;// + ((Math.random()-0.5)/200);
          self.afield.partys[i] += y/100;// + ((Math.random()-0.5)/200);
          if(self.afield.partxs[i] < 0 || self.afield.partxs[i] > 1) self.afield.partts[i] = 0;
          if(self.afield.partys[i] < 0 || self.afield.partys[i] > 1) self.afield.partts[i] = 0;
        }
      }
    }

    /*
    // game objs
    */
    if(self.pp_mode)
    {
      var l = self.levels[self.cur_level];
      if(l.type == L_TYPE_FLAG)
      {
        //flags
        var cart = {x:0,y:0};
        var polar = {dir:0,len:0};
        var f;
        var all_met = true;
        var t_tolerance = 0.2;
        for(var i = 0; i < l.flags.length; i++)
        {
          f = l.flags[i];
          self.vfield.sampleFill(f.x,f.y,cart);
          f.xd = cart.x;
          f.yd = cart.y;
          self.vfield.samplePolarFill(f.x,f.y,polar);
          var t_diff = Math.abs(f.goal_cache_t-polar.dir);
          if(f.goal_cache_l < polar.len && (t_diff < t_tolerance || t_diff > (3.141592*2)-t_tolerance)) f.met = true;
          else f.met = false;
          all_met = all_met && f.met;
        }
        if(all_met) l.complete = true;
      }
      if(l.type == L_TYPE_BALLOON)
      {
        //balloon
        x = self.vfield.x_map.sample(self.balloon.x,self.balloon.y);
        y = self.vfield.y_map.sample(self.balloon.x,self.balloon.y);
        self.balloon.x += x/200;// + ((Math.random()-0.5)/200);
        self.balloon.y += y/200;// + ((Math.random()-0.5)/200);
        while(self.balloon.x > 1) self.balloon.x -= 1;
        while(self.balloon.x < 0) self.balloon.x += 1;
        while(self.balloon.y > 1) self.balloon.y -= 1;
        while(self.balloon.y < 0) self.balloon.y += 1;
        //checkpoints
        var c;
        var all_met = true;
        for(var i = 0; i < l.checkpoints.length; i++)
        {
          c = l.checkpoints[i];
          if(objIntersectsObj(self.balloon,c)) c.met = true;
          all_met = all_met && c.met;
        }
        if(all_met) l.complete = true;
      }
    }

    self.ticks++;
  };

  var USA = new Image();
  USA.src = "assets/usa.png";
  self.draw = function()
  {
    var canv = stage.drawCanv;
    canv.context.lineWidth = 0.5;

    canv.context.drawImage(USA,0,0,canv.canvas.width,canv.canvas.height);

    var x_space;
    var y_space;
    var x;
    var y;
    var index;
    /*
    // pressure height map
    */
    x_space = canv.canvas.width / self.pmap.w;
    y_space = canv.canvas.height / self.pmap.h;
    for(var i = 0; i < self.pmap.h; i++)
    {
      for(var j = 0; j < self.pmap.w; j++)
      {
        y = y_space*i;
        x = x_space*j;
        index = self.pmap.iFor(j,i);
        //var color = Math.round(self.pmap.data[index]*255);
        //canv.context.fillStyle = "rgba("+color+","+color+","+color+",0.2)";
        var color = .8-(self.pmap.data[index]*.8);
        canv.context.fillStyle = "rgba(0,0,0,"+color+")";
        canv.context.fillRect(x,y,x_space,y_space);
      }
    }

    /*
    // vectors
    */
    canv.context.fillStyle = "#555599";
    canv.context.strokeStyle = "#0000FF";
    x_space = canv.canvas.width / self.vfield.w;
    y_space = canv.canvas.height / self.vfield.h;
    for(var i = 0; i < self.vfield.h; i++)
    {
      for(var j = 0; j < self.vfield.w; j++)
      {
        y = y_space*i+(y_space/2);
        x = x_space*j+(x_space/2);
        index = self.vfield.iFor(j,i);
        canv.context.fillRect(x-1,y-1,2,2);
        canv.drawLine(x,y,x+self.vfield.x_map.data[index]*vec_length,y+self.vfield.y_map.data[index]*vec_length);
      }
    }

    /*
    // air
    */
    canv.context.fillStyle = "#8888FF";
    for(var i = 0; i < self.afield.n; i++)
      canv.context.fillRect(self.afield.partxs[i]*canv.canvas.width-1,self.afield.partys[i]*canv.canvas.height-1,2,2);

    /*
    // pressure systems
    */
    if(sys)
    {
      for(var i = 0; i < self.psys.length; i++)
        self.psys[i].draw(canv);
    }

    /*
    // game objs
    */
    var l = self.levels[self.cur_level];
    if(l.type == L_TYPE_FLAG)
    {
      //flags
      canv.context.lineWidth = 2;
      var f;
        //goal
      canv.context.strokeStyle = "#00FF00";
      for(var i = 0; i < l.flags.length; i++)
      {
        f = l.flags[i];
        canv.context.beginPath();
        canv.context.moveTo(f.cache_x,f.cache_y);
        canv.context.lineTo(f.goal_cache_xd,f.goal_cache_yd);
        canv.context.stroke();
      }
        //flag
      for(var i = 0; i < l.flags.length; i++)
      {
        f = l.flags[i];
        if(f.met) canv.context.strokeStyle = "#00FF00";
        else canv.context.strokeStyle = "#FF0000";
        canv.context.beginPath();
        canv.context.moveTo(f.cache_x,f.cache_y);
        canv.context.lineTo(f.cache_x+(f.xd*flag_length),f.cache_y+(f.yd*flag_length));
        canv.context.stroke();
      }
    }
    if(l.type == L_TYPE_BALLOON)
    {
      //checkpoints
      var c;
      for(var i = 0; i < l.checkpoints.length; i++)
      {
        c = l.checkpoints[i];
        if(c.met)
        canv.context.fillStyle = "#00FF00";
        else
        canv.context.fillStyle = "#FF0000";
        canv.context.fillRect(c.cache_x,c.cache_y,c.cache_w,c.cache_h);
      }
      //balloon
      canv.context.fillStyle = "#FF0000";
      canv.context.fillRect((self.balloon.x*canv.canvas.width)-(self.balloon.cache_w/2),(self.balloon.y*canv.canvas.height)-(self.balloon.cache_h/2),self.balloon.cache_w,self.balloon.cache_h);
    }

    /*
    // UI
    */
    if(paint)
    {
      self.p_type_toggle_h.draw(canv);
      self.p_type_toggle_l.draw(canv);
      stage.drawCanv.context.font = "20px arial";
      canv.outlineText("H",self.p_type_toggle_h.x,self.p_type_toggle_h.y+self.p_type_toggle_h.h,"#FFFFFF","#000000");
      canv.outlineText("L",self.p_type_toggle_l.x,self.p_type_toggle_l.y+self.p_type_toggle_l.h,"#000000","#FFFFFF");
      stage.drawCanv.context.font = "15px arial";
      canv.outlineText("Toggle Brush",self.p_type_toggle_h.x,self.p_type_toggle_h.y+self.p_type_toggle_l.h*2,"#000000","#FFFFFF");
    }
    if(sys)
    {
      self.p_store_h.draw(canv);
      self.p_store_l.draw(canv);
      stage.drawCanv.context.font = "20px arial";
      canv.outlineText("H",self.p_store_h.x,self.p_store_h.y+self.p_store_h.h,"#FFFFFF","#000000");
      canv.outlineText("L",self.p_store_l.x,self.p_store_l.y+self.p_store_l.h,"#000000","#FFFFFF");
      stage.drawCanv.context.font = "15px arial";
      canv.outlineText("Drag To Create/Destroy",self.p_store_h.x,self.p_store_h.y+self.p_store_h.h*2,"#000000","#FFFFFF");
    }

    self.pp_button.draw(canv);
    canv.outlineText("Play/Pause",self.pp_button.x,self.pp_button.y+self.pp_button.h*2,"#000000","#FFFFFF");
    self.menu_button.draw(canv);
    canv.outlineText("Menu",self.menu_button.x,self.menu_button.y+self.menu_button.h*2,"#000000","#FFFFFF");

    self.clip.draw(canv);

    if(self.game_mode == GAME_MODE_BLURB)
      self.blurb.draw(canv);

    self.clip.cleanse();
  };

  self.cleanup = function()
  {
  };

};

