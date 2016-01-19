var default_complete = false;
var paint = false;
var sys = !paint;
var anneal = true;
var airdeath = true;
var tools = false;
var tools_explicit = false;

var vec_length = 5;
var flag_length = 20;

var yard_logo_img;
var menu_img;
var screen_bg_img;
var screen_cover_img;
var button_h_img;
var button_l_img;
var icon_check_img;
var icon_close_img;
var icon_eye_img;
var icon_check_selected_img;
var icon_h_img;
var icon_l_img;
var icon_trash_img;
var icon_trash_open_img;
var tall_img;
var lvl_button_img;
var lvl_button_fade_img;
var lvl_button_outline_img;
var lvl_button_lock_img;
var lvl_button_check_img;
var flag_tip_img;
var flag_tail_img;
var dotted_flag_tip_img;
var dotted_flag_tail_img;

var blue = "#76DAE2";

var ENUM;

ENUM = 0;
var P_TYPE_HIGH = ENUM; ENUM++;
var P_TYPE_LOW  = ENUM; ENUM++;

ENUM = 0;
var L_TYPE_NONE = ENUM; ENUM++;
var L_TYPE_FLAG = ENUM; ENUM++;
var L_TYPE_SYS  = ENUM; ENUM++;

ENUM = 0;
var GAME_MODE_MENU  = ENUM; ENUM++;
var GAME_MODE_PLAY  = ENUM; ENUM++;
var GAME_MODE_BLURB = ENUM; ENUM++;

    var cartToPolar = function(cart,polar)
    {
      polar.len = Math.sqrt((cart.x*cart.x)+(cart.y*cart.y));
      polar.dir = Math.atan2(cart.y,cart.x);
    }
    var polarToCart = function(polar,cart)
    {
      cart.x = Math.cos(polar.dir)*polar.len;
      cart.y = Math.sin(polar.dir)*polar.len;
    }


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
    self.sample_index = function(x,y)
    {
      return self.data[self.iFor(x,y)];
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
    self.x = 0.5;
    self.y = 0.5;
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
    self.start_sx = x;
    self.start_sy = y;
    self.r = r;
    self.w = 40;
    self.h = 40;

    self.delta = delta;
    if(self.delta > 0) self.img = icon_h_img;
    else self.img = icon_l_img;

    self.reset = function()
    {
      self.sx = self.start_sx;
      self.sy = self.start_sy;
      self.x = self.sx*stage.drawCanv.canvas.width-(self.w/2);
      self.y = self.sy*stage.drawCanv.canvas.height-(self.h/2);
      self.dragging = false;
      self.hovering = false;
    }
    self.reset();

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
      if(scene.dragging_sys || scene.dragging_tool) return;
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
      if(self.hovering || self.dragging)
      {
        canv.context.lineWidth = 3;
        canv.context.strokeStyle = self.color_stroke;
        canv.context.strokeRect(self.x-5,self.y-5,self.w+10,self.h+10);
      }
      canv.context.drawImage(self.img,self.x-10,self.y-10,self.w+20,self.h+20);
    }
  }
  var Tool = function(x,y,scene)
  {
    var self = this;
    self.sx = x;
    self.sy = y;
    self.w = 20;
    self.h = 20;
    self.x = self.sx*stage.drawCanv.canvas.width-self.w-5;
    self.y = self.sy*stage.drawCanv.canvas.height-self.h-5;
    self.name = "Tool";
    self.explicit = tools_explicit;

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
      if(scene.dragging_tool || scene.dragging_sys) return;
      scene.dragging_tool = self;
      self.dragging = true;
    }
    self.drag = function(evt)
    {
      if(self.dragging)
      {
        self.sx = (evt.doX+(self.w/2)+5)/stage.drawCanv.canvas.width;
        self.sy = (evt.doY+(self.h/2)+5)/stage.drawCanv.canvas.height;
        self.x = evt.doX-self.w/2;
        self.y = evt.doY-self.h/2;
      }
    }
    self.dragFinish = function(evt)
    {
      self.dragging = false;
      scene.dragging_tool = undefined;
    }

    self.draw = function(canv)
    {
      canv.context.font = "30px arial";
      canv.outlineText(self.name,self.x+self.w/2-10,self.y+self.h/2+10,"#FFFFFF","#000000");

      if(self.hovering || self.dragging)
      {
        canv.context.lineWidth = 3;
        canv.context.strokeStyle = "#FFFFFF";
        canv.context.strokeRect(self.x-5,self.y-5,self.w+10,self.h+10);
      }

      canv.context.lineWidth = 1;
      canv.context.strokeStyle = "#FF0000";
      var sample_size = 4;
      canv.context.strokeRect(self.sx*canv.canvas.width-sample_size/2,self.sy*canv.canvas.height-sample_size/2,sample_size,sample_size);

      if(self.explicit)
      {
        canv.context.font = "20px arial";
        canv.outlineText(self.measure(),self.x+self.w+10,self.y+self.h+10,"#FFFFFF","#000000");
      }
      else
      {
        canv.context.fillStyle = "#00FF00";
        var m = self.h*self.measure();
        canv.context.fillRect(self.x-10,self.y+self.h-m,8,m);
        canv.context.strokeStyle = "#000000";
        canv.context.strokeRect(self.x-10,self.y,8,self.h);
      }
    }

    self.measure = function() //"override" this...
    {
      return 0;
    }
  }

  var LevelButtonBox = function(i, bs, scene)
  {
    var self;
    function callback(on)
    {
      if(self.level_i == 0 || self.req_level.complete)
      {
        scene.beginLevel(self.level_i);
        scene.setMode(GAME_MODE_PLAY);
        if(self.level.text_0 && self.level.text_0 != "")
        {
          var b_0 = new Blurb(scene);
          b_0.txt = self.level.text_0;
          setTimeout(function(){ scene.popBlurb(b_0); },200);
          if(self.level.text_1 && self.level.text_1 != "")
          {
            var b_1 = new Blurb(scene);
            b_1.txt = self.level.text_1;
            b_0.click = function(evt) { scene.popBlurb(b_1); };
          }
        }
      }
    }

    var self = new ButtonBox(20+((bs+10)*i),20+((bs+10)*0),bs,bs,callback);
    self.level_i = i;
    self.level = scene.levels[self.level_i];
    if(self.level_i > 0)
      self.req_level = scene.levels[self.level_i-1];
    if(i == 0) self.title = "P";
    else self.title = self.level_i;
    return self;
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
      return;
      if(this.down) canv.context.strokeStyle = "#00F400";
      else          canv.context.strokeStyle = "#000000";

      canv.context.fillStyle = "#00F400";

      canv.context.fillRect(this.off_x,this.off_y,this.w,this.h);
      canv.context.strokeRect(this.off_x+0.5,this.off_y+0.5,this.w,this.h);
    }

    for(var i = 0; i < 9; i++)
    {
      var b;
      var bs = 80;

      b = new LevelButtonBox(i,bs,scene);
      if(i == 0)
      {
        b.x = self.canv.canvas.width/2-(bs/2);
        b.y = 200;
      }
      else if(i < 5)
      {
        b.x = self.canv.canvas.width/2-(bs*2+60)+((i-1)*(bs+40));
        b.y = 200+bs+40;
      }
      else
      {
        b.x = self.canv.canvas.width/2-(bs*2+60)+((i-5)*(bs+40));
        b.y = 200+(bs+40)*2;
      }
      self.buttons.push(b);
    }

    //quick hack to fix clicker even though on separate canv
    var draw = function(canv)
    {
      if(this.level_i == 0 || levels[this.level_i-1].complete)
      {
        if(!levels[this.level_i].complete)
        {
          var s = (((Math.sin(scene.ticks/20)+1)/4)+0.5)*10;
          canv.context.drawImage(lvl_button_outline_img,this.off_x-s,this.off_y-s,this.w+s*2,this.h+s*2);
        }
        canv.context.drawImage(lvl_button_img,this.off_x,this.off_y,this.w,this.h);
      }
      else
      {
        canv.context.drawImage(lvl_button_fade_img,this.off_x,this.off_y,this.w,this.h);
        canv.context.drawImage(lvl_button_lock_img,this.off_x+this.w-40,this.off_y-20,60,60);
      }
      if(levels[this.level_i].complete)
      {
        canv.context.drawImage(lvl_button_check_img,this.off_x+20,this.off_y+20,this.h-40,this.h-40);
      }
      else
      {
        canv.context.font = "70px stump";
        canv.context.fillStyle = "#FFFFFF";
        canv.context.textAlign = "center";
        canv.context.fillText(this.title,this.off_x+this.w/2,this.off_y+this.h-10);
      }

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

        self.canv.context.font = "100px stump";
        self.canv.context.textAlign = "center";
        self.canv.context.fillStyle = "#FFFFFF";
        self.canv.context.fillText("Levels",self.w/2,150);

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
      return;
      self._dirty = false;
    }
    self.isDirty = function() { return self._dirty; }
  }

  var Blurb = function(scene)
  {
    var self = this;
    self.x = scene.dc.canvas.width-200;
    self.y = scene.dc.canvas.height-200;
    self.w = 100;
    self.h = 50;

    self.txt = "";
    self.lines;
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
      var width = canv.canvas.width-420;

      canv.context.font = "25px Open Sans";

      //stage.drawCanv.context.font=whaaaat;
      while(found < self.txt.length)
      {
        searched = self.txt.indexOf(" ",found);
        if(searched == -1) searched = self.txt.length;
        tentative_search = self.txt.indexOf(" ",searched+1);
        if(tentative_search == -1) tentative_search = self.txt.length;
        while(canv.context.measureText(self.txt.substring(found,tentative_search)).width < width && searched != self.txt.length)
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
      var box_height = 300;
      canv.context.fillStyle = blue;
      canv.context.fillRect(0,canv.canvas.height-box_height,canv.canvas.width,box_height);

      canv.context.font = "25px Open Sans";
      canv.context.textAlign = "left";
      for(var i = 0; i < self.lines.length; i++)
      {
        canv.context.fillStyle = "#000000";
        canv.context.fillText(self.lines[i],200-1,canv.canvas.height-box_height+50+((i+1)*40)-1,canv.canvas.width-420);
        canv.context.fillStyle = "#FFFFFF";
        canv.context.fillText(self.lines[i],200,canv.canvas.height-box_height+50+((i+1)*40),canv.canvas.width-420);
      }

      //if(self.img_el)
        //canv.context.drawImage(self.img_el, self.img_x, self.img_y, self.img_w, self.img_h);

      canv.context.fillStyle = "#CCCCCC";
      canv.context.fillRect(self.x,self.y+10,self.w,self.h);
      canv.context.fillStyle = "#FFFFFF";
      canv.context.fillRect(self.x,self.y,self.w,self.h);
      canv.context.fillStyle = "#000000";
      canv.context.font = "30px stump";
      canv.context.fillText("Ok!",self.x+10,self.y+self.h-10,self.w);
      canv.context.font = "12px stump";

      canv.context.drawImage(tall_img,50,canv.canvas.height-350,120,320);
    }

    self.click = function(evt)
    {
      scene.setMode(GAME_MODE_PLAY);
    }
  }

  var Flag = function(x,y,xd,yd,scene)
  {
    var self = this;

    self.w = 20;
    self.h = 20;

    //normalized vals
    self.start_sx = x;
    self.start_sy = y;
    self.xd = 0.;
    self.yd = 0.;
    self.goal_xd = xd;
    self.goal_yd = yd;

    self.reset = function()
    {
      self.sx = self.start_sx;
      self.sy = self.start_sy;
      self.x = self.sx*stage.drawCanv.canvas.width-(self.w/2);
      self.y = self.sy*stage.drawCanv.canvas.height-(self.h/2);
      self.dragging = false;
      self.hovering = false;
      self.met = false;
    }
    self.reset();

    self.cache = function()
    {
      var tip_cart = {x:0,y:0};
      var polar = {dir:0,len:0};
      var head_cart = {x:0,y:0};

      self.goal_cache_xd = self.goal_xd*flag_length;
      self.goal_cache_yd = self.goal_yd*flag_length;

      tip_cart.x = self.goal_xd;
      tip_cart.y = self.goal_yd;

      cartToPolar(tip_cart,polar);
      polar.len *= 0.9;
      polar.dir += 0.1;
      polarToCart(polar,head_cart);
      self.goal_cache_head_cw_x = head_cart.x*flag_length;
      self.goal_cache_head_cw_y = head_cart.y*flag_length;

      polar.dir -= 0.2;
      polarToCart(polar,head_cart);
      self.goal_cache_head_ccw_x = head_cart.x*flag_length;
      self.goal_cache_head_ccw_y = head_cart.y*flag_length;

      self.goal_cache_l = Math.sqrt(self.goal_xd*self.goal_xd+self.goal_yd*self.goal_yd);
      self.goal_cache_t = Math.atan2(self.goal_yd/self.goal_cache_l,self.goal_xd/self.goal_cache_l);
    }
    self.cache();

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
      if(scene.dragging_flag) return;
      scene.dragging_flag = self;
      self.dragging = true;
    }
    self.drag = function(evt)
    {
      if(self.dragging)
      {
        if(platform == "MOBILE")
        {
          evt.doY -= 30;
          if(evt.doY < 0) evt.doY = 0;
        }
        self.sx = evt.doX/stage.drawCanv.canvas.width;
        self.sy = evt.doY/stage.drawCanv.canvas.height;
        self.x = evt.doX-(self.w/2);
        self.y = evt.doY-(self.h/2);
      }
    }
    self.dragFinish = function(evt)
    {
      self.dragging = false;
      scene.dragging_flag = undefined;
    }

    self.draw = function(canv)
    {
      var tip_cart = {x:0,y:0};
      var polar = {dir:0,len:0};
      var head_cart = {x:0,y:0};
      var tmp_vec = {x:0,y:0};

      self.cache_x = self.sx*canv.canvas.width;
      self.cache_y = self.sy*canv.canvas.height;

      if(self.met)
      {
        canv.context.lineWidth = 5;
        canv.context.strokeStyle = "#00FF00";
      }
      else
      {
        canv.context.lineWidth = 1;
        canv.context.strokeStyle = "#FFFFFF";
      }

      //line
      canv.context.beginPath();
      canv.context.moveTo(self.cache_x-self.goal_cache_xd,self.cache_y-self.goal_cache_yd);
      canv.context.lineTo(self.cache_x+self.goal_cache_xd,self.cache_y+self.goal_cache_yd);
      canv.context.stroke();

      //head
      canv.context.save();
      tmp_vec.x = self.cache_x+self.goal_cache_xd;
      tmp_vec.y = self.cache_y+self.goal_cache_yd;
      canv.context.translate(tmp_vec.x,tmp_vec.y);
      tmp_vec.x -= self.cache_x;
      tmp_vec.y -= self.cache_y;
      var l = Math.sqrt((tmp_vec.x*tmp_vec.x)+(tmp_vec.y*tmp_vec.y));
      tmp_vec.x /= l;
      tmp_vec.y /= l
      l /= 4;
      if(l > 10) l = 10;
      canv.context.rotate(Math.atan2(tmp_vec.y,tmp_vec.x)+3.141592/2);
      canv.context.drawImage(dotted_flag_tip_img,-l,-l,2*l,2*l);
      canv.context.restore();

      //tail
      canv.context.save();
      tmp_vec.x = self.cache_x-self.goal_cache_xd;
      tmp_vec.y = self.cache_y-self.goal_cache_yd;
      canv.context.translate(tmp_vec.x,tmp_vec.y);
      tmp_vec.x -= self.cache_x;
      tmp_vec.y -= self.cache_y;
      var l = Math.sqrt((tmp_vec.x*tmp_vec.x)+(tmp_vec.y*tmp_vec.y));
      tmp_vec.x /= l;
      tmp_vec.y /= l
      l /= 4;
      if(l > 10) l = 10;
      canv.context.rotate(Math.atan2(tmp_vec.y,tmp_vec.x)-3.141592/2);
      canv.context.drawImage(dotted_flag_tail_img,-l,-l,2*l,2*l);
      canv.context.restore();



      //line
      canv.context.strokeStyle = "#BF1717";
      canv.context.lineWidth = 3;
      canv.context.beginPath();
      canv.context.moveTo(self.cache_x-(self.xd*flag_length),self.cache_y-(self.yd*flag_length));
      canv.context.lineTo(self.cache_x+(self.xd*flag_length),self.cache_y+(self.yd*flag_length));
      canv.context.stroke();

      //head
      canv.context.save();
      tmp_vec.x = self.cache_x+(self.xd*flag_length);
      tmp_vec.y = self.cache_y+(self.yd*flag_length);
      canv.context.translate(tmp_vec.x,tmp_vec.y);
      tmp_vec.x -= self.cache_x;
      tmp_vec.y -= self.cache_y;
      var l = Math.sqrt((tmp_vec.x*tmp_vec.x)+(tmp_vec.y*tmp_vec.y));
      tmp_vec.x /= l;
      tmp_vec.y /= l
      l /= 4;
      if(l > 10) l = 10;
      canv.context.rotate(Math.atan2(tmp_vec.y,tmp_vec.x)+3.141592/2);
      canv.context.drawImage(flag_tip_img,-l,-l,2*l,2*l);
      canv.context.restore();

      //tail
      canv.context.save();
      tmp_vec.x = self.cache_x-(self.xd*flag_length);
      tmp_vec.y = self.cache_y-(self.yd*flag_length);
      canv.context.translate(tmp_vec.x,tmp_vec.y);
      tmp_vec.x -= self.cache_x;
      tmp_vec.y -= self.cache_y;
      var l = Math.sqrt((tmp_vec.x*tmp_vec.x)+(tmp_vec.y*tmp_vec.y));
      tmp_vec.x /= l;
      tmp_vec.y /= l
      l /= 4;
      if(l > 10) l = 10;
      canv.context.rotate(Math.atan2(tmp_vec.y,tmp_vec.x)-3.141592/2);
      canv.context.drawImage(flag_tail_img,-l,-l,2*l,2*l);
      canv.context.restore();

      if(self.hovering || self.dragging)
      {
        canv.context.lineWidth = 3;
        canv.context.strokeStyle = "#FFFFFF";
        canv.context.beginPath();
        canv.context.arc(self.x+self.w/2,self.y+self.h/2,self.w/2,0,2*Math.PI);
        canv.context.stroke();
      }
    }
  }
  var Level = function()
  {
    var self = this;
    self.type = L_TYPE_FLAG;

    self.flags = [];
    self.psys = [];

    self.timer = 0;
    self.req_timer = 100;
    self.complete = default_complete;
    self.complete_this_round = false;

    self.text_0 = "";
    self.text_1 = "";
  }

  self.game_mode;
  self.options_optn;
  self.quality_mode;
  self.vec_mode;
  self.air_mode;
  self.cur_level;
  self.levels;

  self.pmap;
  self.vfield;
  self.afield;
  self.balloon;
  self.brush;
  self.psys;
  self.flags;
  self.dragging_sys;
  self.dragging_flag;
  self.tools;
  self.dragging_tool;

  self.clip;
  self.menu_button;
  self.options_button;
  self.quality_button;
  self.vec_button;
  self.air_button;
  self.help_button;
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
    self.dc = stage.drawCanv;
    yard_logo_img = new Image(); yard_logo_img.src = "assets/theyard-logo.png";
    menu_img = new Image(); menu_img.src = "assets/icon-menu.png";
    screen_bg_img = new Image(); screen_bg_img.src = "assets/main-screen.png";
    screen_cover_img = new Image(); screen_cover_img.src = "assets/main-screen_cover.png";
    button_h_img = new Image(); button_h_img.src = "assets/button-h.png";
    button_l_img = new Image(); button_l_img.src = "assets/button-l.png";
    icon_check_img = new Image(); icon_check_img.src = "assets/icon-checkbox.png";
    icon_close_img = new Image(); icon_close_img.src = "assets/icon-close.png";
    icon_eye_img = new Image(); icon_eye_img.src = "assets/icon-eye.png";
    icon_check_selected_img = new Image(); icon_check_selected_img.src = "assets/icon-checkbox-selected.png";
    icon_h_img = new Image(); icon_h_img.src = "assets/icon-h.png";
    icon_l_img = new Image(); icon_l_img.src = "assets/icon-l.png";
    icon_trash_img = new Image(); icon_trash_img.src = "assets/icon-trash-open.png";
    icon_trash_open_img = new Image(); icon_trash_open_img.src = "assets/icon-trash.png";
    tall_img = new Image(); tall_img.src = "assets/scout.png";
    lvl_button_img = new Image(); lvl_button_img.src = "assets/level-bg.png";
    lvl_button_fade_img = new Image(); lvl_button_fade_img.src = "assets/fade-level-bg.png";
    lvl_button_outline_img = new Image(); lvl_button_outline_img.src = "assets/level-bg-outline.png";
    lvl_button_lock_img = new Image(); lvl_button_lock_img.src = "assets/icon-locked.png";
    lvl_button_check_img = new Image(); lvl_button_check_img.src = "assets/icon-check.png";
    flag_tip_img = new Image(); flag_tip_img.src = "assets/vane-tip.png";
    flag_tail_img = new Image(); flag_tail_img.src = "assets/vane-tail.png";
    dotted_flag_tip_img = new Image(); dotted_flag_tip_img.src = "assets/dotted-vane-tip.png";
    dotted_flag_tail_img = new Image(); dotted_flag_tail_img.src = "assets/dotted-vane-tail.png";

    self.menu_clicker = new Clicker({source:stage.dispCanv.canvas});
    self.bin_presser = new Presser({source:stage.dispCanv.canvas});
    self.bin_dragger = new Dragger({source:stage.dispCanv.canvas});
    self.play_clicker = new Clicker({source:stage.dispCanv.canvas});
    self.play_presser = new Presser({source:stage.dispCanv.canvas});
    self.play_hoverer = new Hoverer({source:stage.dispCanv.canvas});
    self.play_dragger = new Dragger({source:stage.dispCanv.canvas});
    self.blurb_clicker = new Clicker({source:stage.dispCanv.canvas});

    self.cur_level = 0;
    self.levels = [];

    //MYLEVELS
    var l;

    //playground
    l = new Level();
    l.type = L_TYPE_NONE;
    l.psys.push(new PSys(0.4,0.5,0.1,-0.1,self));
    l.psys.push(new PSys(0.6,0.5,0.1, 0.1,self));
    l.text_0 = "This is a playground. Drag around the Pressure Systems or the meteorological tools. When ready to begin, hit Menu.";
    self.levels.push(l);

    //blow north
    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.3,0.5,0.0,-1.5,self));
    l.psys.push(new PSys(0.4,0.5,0.1,-0.1,self));
    l.psys.push(new PSys(0.6,0.5,0.1, 0.1,self));
    l.text_0 = "Drag the flag around the map to find a position where the wind is blowing strongly north (as indicated by the green flag).";
    self.levels.push(l);

    //blow east
    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.3,0.5,1.5,0.0,self));
    l.psys.push(new PSys(0.5,0.4,0.1,-0.1,self));
    l.psys.push(new PSys(0.5,0.6,0.1, 0.1,self));
    l.text_0 = "Drag the flag around the map to find a position where the wind is blowing strongly east (as indicated by the green flag).";
    self.levels.push(l);

    //blow south (laterally surrounded L)
    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.6,0.6,0.0,1.0,self));
    l.psys.push(new PSys(0.5,0.5,0.1,-0.1,self));
    l.psys.push(new PSys(0.3,0.5,0.1, 0.1,self));
    l.psys.push(new PSys(0.7,0.5,0.1, 0.1,self));
    l.text_0 = "Drag the flag around the map to find a position where the wind is blowing strongly south (as indicated by the green flag).";
    self.levels.push(l);

    //full circle of flags
    l = new Level();
    l.type = L_TYPE_FLAG;
    var i = 0;
    l.flags.push(new Flag(0.33,0.9-(i/6)*0.9,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    l.flags.push(new Flag(0.33,0.9-(i/6)*0.9,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    l.flags.push(new Flag(0.33,0.9-(i/6)*0.9,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    l.flags.push(new Flag(0.33,0.9-(i/6)*0.9,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    l.flags.push(new Flag(0.33,0.9-(i/6)*0.9,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    l.flags.push(new Flag(0.33,0.9-(i/6)*0.9,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    i = 0;
    l.psys.push(new PSys(0.5,0.5,0.1, -0.1,self));
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,self)); i++;
    l.psys.push(new PSys(0.1,0.1,0.1, 0.1,self));
    l.psys.push(new PSys(0.9,0.1,0.1, 0.1,self));
    l.psys.push(new PSys(0.1,0.9,0.1, 0.1,self));
    l.psys.push(new PSys(0.9,0.9,0.1, 0.1,self));
    l.psys.push(new PSys(0.1,0.5,0.1, 0.1,self));
    l.psys.push(new PSys(0.5,0.1,0.1, 0.1,self));
    l.psys.push(new PSys(0.9,0.5,0.1, 0.1,self));
    l.psys.push(new PSys(0.5,0.9,0.1, 0.1,self));
    l.text_0 = "Drag all the flags to find a position where the blowing red flag matches the green.";
    l.text_1 = "Clicking 'Vec' to visualize the wind vectors around the map might prove helpful! (Try to see underlying shape.)";
    self.levels.push(l);

    //use systems
    l = new Level();
    l.type = L_TYPE_SYS;
    l.flags.push(new Flag(0.5,0.5,-2.0,0.0,self));
    l.psys.push(new PSys(0.2,0.5,0.1,-0.1,self));
    l.psys.push(new PSys(0.8,0.5,0.1, 0.1,self));
    l.text_0 = "Drag the High and Low Pressure Systems to blow the red flag in the same speed/direction as the green flag.";
    l.text_1 = "Make sure to use both the L and the H! (and use the visualizers!)";
    self.levels.push(l);

    //use systems- at an angle
    l = new Level();
    l.type = L_TYPE_SYS;
    l.flags.push(new Flag(0.5,0.5,2.0,2.0,self));
    l.psys.push(new PSys(0.2,0.5,0.1,-0.1,self));
    l.psys.push(new PSys(0.8,0.5,0.1, 0.1,self));
    l.text_1 = "Again, drag the High and Low Pressure Systems to blow the red flag in the same speed/direction as the green flag.";
    l.text_0 = "(This is the same as last time, just a different direction).";
    self.levels.push(l);

    //cyclone
    l = new Level();
    l.type = L_TYPE_SYS;
    l.flags.push(new Flag(0.40,0.5,0.0,1.5,self));
    l.flags.push(new Flag(0.60,0.5,0.0,-1.5,self));
    l.psys.push(new PSys(0.2,0.2,0.1, 0.1,self));
    l.psys.push(new PSys(0.2,0.4,0.1,-0.1,self));
    l.psys.push(new PSys(0.2,0.6,0.1, 0.1,self));
    l.psys.push(new PSys(0.2,0.8,0.1,-0.1,self));
    l.text_0 = "Place the High and Low Pressure Systems to create a cyclone in the direction indicated by the green flags.";
    l.text_1 = "You should only need 3 systems to solve.";
    self.levels.push(l);

    //anticyclone
    l = new Level();
    l.type = L_TYPE_SYS;
    l.flags.push(new Flag(0.5,0.35,1.5,0.0,self));
    l.flags.push(new Flag(0.5,0.65,-1.5,0.0,self));
    l.psys.push(new PSys(0.2,0.2,0.1,-0.1,self));
    l.psys.push(new PSys(0.2,0.4,0.1, 0.1,self));
    l.psys.push(new PSys(0.2,0.6,0.1,-0.1,self));
    l.psys.push(new PSys(0.2,0.8,0.1, 0.1,self));
    l.text_0 = "Again, try to create a cyclone. (This time, in the opposite direction.)";
    l.text_1 = "Notice differences in severity from the previous.";
    self.levels.push(l);

    self.clip = new ClipBoard(20,20,stage.drawCanv.canvas.width-40,stage.drawCanv.canvas.height-20,self,self.levels);
    self.clip.register(self.menu_clicker);
    self.blurb = new Blurb(self);
    self.blurb_clicker.register(self.blurb);

    self.menu_button = new ButtonBox(stage.drawCanv.canvas.width-60,10,20,20, function(on) { self.setMode(GAME_MODE_MENU); });
    self.play_clicker.register(self.menu_button);

    self.options_button = new ButtonBox(stage.drawCanv.canvas.width-150,100,40,40, function(on) { self.options_open = !self.options_open; if(self.options_open) self.options_dir = -1; else self.options_dir = 1; });
    self.play_clicker.register(self.options_button);

    self.quality_button = new ButtonBox(stage.drawCanv.canvas.width-280,200,40,40, function(on)
    {
      if(!self.options_open) return;
      self.quality_mode = !self.quality_mode;
      if(self.quality_mode)
      {
        self.pmap = self.pmap_hq;
        self.vfield = self.vfield_hq;
        self.afield = self.afield_hq;
      }
      else
      {
        self.pmap = self.pmap_lq;
        self.vfield = self.vfield_lq;
        self.afield = self.afield_lq;
      }
    });
    self.vec_button = new ButtonBox(stage.drawCanv.canvas.width-280,250,40,40, function(on) { if(!self.options_open) return; self.vec_mode = !self.vec_mode; });
    self.air_button = new ButtonBox(stage.drawCanv.canvas.width-280,300,40,40, function(on) { if(!self.options_open) return;self.air_mode = !self.air_mode; });
    self.help_button = new ButtonBox(stage.drawCanv.canvas.width-280,350,40,40, function(on)
    {
      if(!self.options_open) return;
      var l = self.levels[self.cur_level];
      if(l.text_0 && l.text_0 != "")
      {
        var b_0 = new Blurb(self);
        b_0.txt = l.text_0;
        if(l.text_1 && l.text_1 != "")
        {
          var b_1 = new Blurb(self);
          b_1.txt = l.text_1;
          b_0.click = function(evt) { self.popBlurb(b_1); };
        }
        self.popBlurb(b_0);
      }
    });
    self.play_clicker.register(self.quality_button);
    self.play_clicker.register(self.vec_button);
    self.play_clicker.register(self.air_button);
    self.play_clicker.register(self.help_button);

    self.pmap_hq = new HeightMap(40,40);
    self.vfield_hq = new VecField2d(40,40);
    self.afield_hq = new AirField(2000);

    self.pmap_lq = new HeightMap(10,10);
    self.vfield_lq = new VecField2d(20,20);
    self.afield_lq = new AirField(1000);

    self.pmap = self.pmap_hq;
    self.vfield = self.vfield_hq;
    self.afield = self.afield_hq;

    self.balloon = new Balloon();

    if(paint)
    {
      self.brush = new Brush(stage.drawCanv.canvas.width,stage.drawCanv.canvas.height,self);
      self.play_dragger.register(self.brush);
    }
    if(sys)
    {
      self.psys = [];
    }
    self.flags = [];
    var min_pressure = 1000;
    var max_pressure = 1030;
    if(tools)
    {
      var polar = {dir:0,len:0};

      self.tools = [];

      var Barometer = new Tool(0.1,0.7,self);
      Barometer.name = "Barometer";
      if(tools_explicit)
        Barometer.measure = function() { return (min_pressure+Math.round(self.pmap.sample(Barometer.sx,Barometer.sy)*(max_pressure-min_pressure)))+"mb"; };
      else
        Barometer.measure = function() { return self.pmap.sample(Barometer.sx,Barometer.sy); };
      self.tools.push(Barometer);

      var Anemometer = new Tool(0.1,0.8,self);
      Anemometer.name = "Anemometer";
      if(tools_explicit)
        Anemometer.measure = function() { self.vfield.samplePolarFill(Anemometer.sx,Anemometer.sy,polar); return Math.round(polar.len*(80/4)*10)/10+"mph"; };
      else
        Anemometer.measure = function() { self.vfield.samplePolarFill(Anemometer.sx,Anemometer.sy,polar); return polar.len/4; };
      self.tools.push(Anemometer);

      var Vane = new Tool(0.1,0.9,self);
      Vane.name = "Vane";
      Vane.explicit = true;
      Vane.measure = function() {
        self.vfield.samplePolarFill(Vane.sx,Vane.sy,polar);
        var tau = 2*Math.PI;
        var d = polar.dir;
        d *= -1;
        d += tau;
        d %= tau;
        //return d;
             if(d < tau/16*1)  return "E";
        else if(d < tau/16*3)  return "NE";
        else if(d < tau/16*5)  return "N";
        else if(d < tau/16*7)  return "NW";
        else if(d < tau/16*9)  return "W";
        else if(d < tau/16*11) return "SW";
        else if(d < tau/16*13) return "S";
        else if(d < tau/16*15) return "SE";
        else                       return "E";
      };
      self.tools.push(Vane);

      for(var i = 0; i < self.tools.length; i++)
      {
        self.play_dragger.register(self.tools[i]);
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

      self.p_store_h = new BinBox(100,90,60,60, fdstart, fdrag, fdfinish,
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
      self.p_store_l = new BinBox(180,90,60,60, fdstart, fdrag, fdfinish,
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
      self.bin_presser.register(self.p_store_h);
      self.bin_presser.register(self.p_store_l);
      self.bin_dragger.register(self.p_store_h);
      self.bin_dragger.register(self.p_store_l);
    }

    self.options_open = false;
    self.options_dir = 0;
    self.options_x = 9999;
    self.quality_mode = true;
    self.vec_mode = false;
    self.air_mode = false;
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
    self.bin_presser.ignore();
    self.bin_dragger.ignore();
    self.play_clicker.ignore();
    self.play_presser.ignore();
    self.play_hoverer.ignore();
    self.play_dragger.ignore();
    self.blurb_clicker.ignore();

    self.game_mode = mode;

    self.clip.dirty();
    if(self.game_mode == GAME_MODE_MENU) self.clip.desired_y = 20;
    if(self.game_mode == GAME_MODE_PLAY) self.clip.desired_y = stage.drawCanv.canvas.height;
  }

  self.beginLevel = function(l)
  {
    self.vec_mode = false;
    self.air_mode = true;

    //clear out any on-map data
      //flags
    if(self.levels[self.cur_level].type == L_TYPE_FLAG)
    {
      for(var i = 0; i < self.flags.length; i++)
      {
        self.play_hoverer.unregister(self.flags[i]);
        self.play_dragger.unregister(self.flags[i]);
      }
    }
    self.flags = [];
      //sys
    if(self.levels[self.cur_level].type == L_TYPE_SYS || self.levels[self.cur_level].type == L_TYPE_NONE)
    {
      for(var i = 0; i < self.psys.length; i++)
      {
        self.play_hoverer.unregister(self.psys[i]);
        self.play_dragger.unregister(self.psys[i]);
      }
    }
    self.psys = [];

    //set new level
    self.cur_level = l;
    var l = self.levels[self.cur_level];

    //flags
    var f;
    for(var i = 0; i < l.flags.length; i++)
    {
      f = l.flags[i];
      f.met = false;

      self.flags.push(f);
      f.reset();
      if(l.type == L_TYPE_FLAG)
      {
        self.play_hoverer.register(f);
        self.play_dragger.register(f);
      }
    }

    //sys
    var s;
    for(var i = 0; i < l.psys.length; i++)
    {
      s = l.psys[i];
      self.psys.push(s);
      s.reset();
      if(l.type == L_TYPE_SYS || l.type == L_TYPE_NONE)
      {
        self.play_hoverer.register(s);
        self.play_dragger.register(s);
      }
    }
    l.timer = 0;
    l.complete_this_round = false;
  }

  self.popBlurb = function(blurb)
  {
    self.blurb.txt = blurb.txt;
    self.blurb.img = blurb.img;
    self.blurb.img_x = blurb.img_x;
    self.blurb.img_y = blurb.img_y;
    self.blurb.img_w = blurb.img_w;
    self.blurb.img_h = blurb.img_h;
    self.blurb.format(stage.drawCanv);
    self.blurb.click = blurb.click;
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
      if(self.cur_level == 0)
      {
        self.bin_presser.flush();
        self.bin_dragger.flush();
      }
      self.play_clicker.flush();
      self.play_presser.flush();
      self.play_hoverer.flush();
      self.play_dragger.flush();
    }
    else if(self.game_mode == GAME_MODE_BLURB)
    {
      self.blurb_clicker.flush();
    }

    self.options_x += self.options_dir*20;
    if(self.options_x > stage.drawCanv.canvas.width)     self.options_x = stage.drawCanv.canvas.width;
    if(self.options_x < stage.drawCanv.canvas.width-300) self.options_x = stage.drawCanv.canvas.width-300;

    self.clip.tick();

    /*
    // pressure
    */
    if(anneal)
      self.pmap.anneal(0.10);
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
        var x = indexToSample(j,self.vfield.w);
        var y = indexToSample(i,self.vfield.h);
        var d = 0.05;
        var p = 0;
        for(var t = 0; t < Math.PI*2; t += 0.6)
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
    if(self.air_mode)
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

    var cart = {x:0,y:0};
    var polar = {dir:0,len:0};

    var f;
    var all_met = true;
    var t_tolerance = 0.2;
    for(var i = 0; i < self.flags.length; i++)
    {
      f = self.flags[i];
      self.vfield.sampleFill(f.sx,f.sy,cart);
      f.xd = cart.x;
      f.yd = cart.y;
      self.vfield.samplePolarFill(f.sx,f.sy,polar);
      var t_diff = Math.abs(f.goal_cache_t-polar.dir);
      if(f.goal_cache_l < polar.len && (t_diff < t_tolerance || t_diff > (3.141592*2)-t_tolerance)) f.met = true;
      else f.met = false;
      all_met = all_met && f.met;
    }
    var l = self.levels[self.cur_level];
    if(all_met)
    {
      l.timer++;
      if(l.timer > l.req_timer || self.cur_level == 0)
      {
        l.complete = true;
        l.complete_this_round = true;
      }
    }
    else l.timer = 0;

    /*
    //playground stuff
    */
    if(self.cur_level == 0)
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
    }

    self.ticks++;
  };

  var USA = new Image();
  USA.src = "assets/usa.png";
  self.draw = function()
  {
    var canv = stage.drawCanv;

    canv.context.drawImage(screen_bg_img,0,0,canv.canvas.width,canv.canvas.height);

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
        if(true || self.quality_mode)
        {
          var color = .8-(self.pmap.data[index]*.8);
          canv.context.fillStyle = "rgba(0,0,0,"+color+")";
        }
        else
        {
          var color = Math.round(self.pmap.data[index]*255);
          canv.context.fillStyle = "rgba("+color+","+color+","+color+",1.0)";
        }
        canv.context.fillRect(x,y,x_space,y_space);
      }
    }

    /*
    // vectors
    */
    if(self.vec_mode)
    {
      canv.context.lineWidth = 1.0;
      canv.context.strokeStyle = "#FF00FF";
      canv.context.fillStyle = "#550055";
      x_space = canv.canvas.width / self.vfield.w;
      y_space = canv.canvas.height / self.vfield.h;
      for(var i = 0; i < self.vfield.h; i++)
      {
        for(var j = 0; j < self.vfield.w; j++)
        {
          y = y_space*i+(y_space/2);
          x = x_space*j+(x_space/2);
          index = self.vfield.iFor(j,i);
          if(Math.abs(self.vfield.x_map.data[index]) > 0.1 && Math.abs(self.vfield.x_map.data[index]) > 0.1)
          {
            canv.context.fillRect(x-1,y-1,2,2);
            canv.drawLine(x,y,x+self.vfield.x_map.data[index]*vec_length,y+self.vfield.y_map.data[index]*vec_length);
          }
        }
      }
    }

    /*
    // air
    */
    if(self.air_mode)
    {
      canv.context.fillStyle = "#8888FF";
      for(var i = 0; i < self.afield.n; i++)
        canv.context.fillRect(self.afield.partxs[i]*canv.canvas.width-1,self.afield.partys[i]*canv.canvas.height-1,2,2);
    }

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
    for(var i = 0; i < self.flags.length; i++)
      self.flags[i].draw(canv);

    /*
    // playground stuff
    */
    if(self.cur_level == 0)
    {
      //tools
      if(tools)
      {
        for(var i = 0; i < self.tools.length; i++)
          self.tools[i].draw(canv);
      }
      //balloon
      canv.context.fillStyle = "#FF0000";
      canv.context.fillRect((self.balloon.x*canv.canvas.width)-(self.balloon.cache_w/2),(self.balloon.y*canv.canvas.height)-(self.balloon.cache_h/2),self.balloon.cache_w,self.balloon.cache_h);
    }

    /*
    // UI
    */
    canv.context.lineWidth = 0.5;
    if(paint)
    {
      self.p_type_toggle_h.draw(canv);
      self.p_type_toggle_l.draw(canv);
      canv.context.font = "20px arial";
      canv.outlineText("H",self.p_type_toggle_h.x,self.p_type_toggle_h.y+self.p_type_toggle_h.h,"#FFFFFF","#000000");
      canv.outlineText("L",self.p_type_toggle_l.x,self.p_type_toggle_l.y+self.p_type_toggle_l.h,"#000000","#FFFFFF");
      canv.context.drawImage(button_h,self.p_type_toggle_h.x,self.p_type_toggle_h.y+self.p_type_toggle_h.h);
      canv.context.drawImage(button_l,self.p_type_toggle_l.x,self.p_type_toggle_l.y+self.p_type_toggle_l.h);
      canv.context.font = "15px arial";
      canv.outlineText("Toggle Brush",self.p_type_toggle_h.x,self.p_type_toggle_h.y+self.p_type_toggle_l.h*2,"#000000","#FFFFFF");
    }
    if(sys)
    {
      if(self.cur_level == 0)
      {
        canv.context.drawImage(button_h_img,self.p_store_h.x,self.p_store_h.y,self.p_store_h.w,self.p_store_h.h);
        canv.context.drawImage(button_l_img,self.p_store_l.x,self.p_store_l.y,self.p_store_l.w,self.p_store_l.h);
      }
    }

    canv.context.fillStyle = "rgba(0,0,0,0.5)";
    canv.context.fillRect(self.options_x,0,canv.canvas.width,canv.canvas.height);
    if(self.options_open)
    {
      canv.context.font = "25px Open Sans";
      canv.context.fillStyle = "#FFFFFF";
      canv.context.textAlign = "left";

      canv.context.drawImage(icon_close_img,self.options_x+150,self.options_button.y,self.options_button.w,self.options_button.h);

      if(!self.quality_mode) canv.context.drawImage(icon_check_img,         self.options_x+20,self.quality_button.y,self.quality_button.w,self.quality_button.h);
      else                   canv.context.drawImage(icon_check_selected_img,self.options_x+20,self.quality_button.y,self.quality_button.w,self.quality_button.h);
      canv.context.fillText("Quality",self.options_x+80,self.quality_button.y+self.quality_button.h-10);
      if(!self.vec_mode) canv.context.drawImage(icon_check_img,         self.options_x+20,self.vec_button.y,self.vec_button.w,self.vec_button.h);
      else               canv.context.drawImage(icon_check_selected_img,self.options_x+20,self.vec_button.y,self.vec_button.w,self.vec_button.h);
      canv.context.fillText("Vectors",self.options_x+80,self.vec_button.y+self.vec_button.h-10);
      if(!self.air_mode) canv.context.drawImage(icon_check_img,         self.options_x+20,self.air_button.y,self.air_button.w,self.air_button.h);
      else               canv.context.drawImage(icon_check_selected_img,self.options_x+20,self.air_button.y,self.air_button.w,self.air_button.h);
      canv.context.fillText("Particles",self.options_x+80,self.air_button.y+self.air_button.h-10);
/*
      canv.context.drawImage(icon_check_img,         self.options_x+20,self.quality_button.y,self.quality_button.w,self.quality_button.h);
      canv.outlineText("Help",self.options_x+80,self.help_button.y+self.help_button.h-10,"#000000","#FFFFFF");
*/
    }
    else
      canv.context.drawImage(icon_eye_img,self.options_button.x,self.options_button.y+5,self.options_button.w,self.options_button.h-10);

    if(self.levels[self.cur_level].complete_this_round)
    {
      canv.context.font = "30px stump";
      canv.context.textAlign = "center";
      canv.outlineText("Complete!",canv.canvas.width/2,100+Math.sin(self.ticks/10)*10,"#000000","#FFFFFF");
    }
    else if(self.levels[self.cur_level].timer > 0)
    {
      canv.context.font = "30px stump";
      canv.context.textAlign = "right";
      canv.outlineText("Time to Complete: ",canv.canvas.width/2+100,100+Math.sin(self.ticks/10)*10,"#000000","#FFFFFF");
      canv.context.textAlign = "left";
      canv.outlineText(" "+(Math.round(30-((self.levels[self.cur_level].timer/self.levels[self.cur_level].req_timer)*30))/10),canv.canvas.width/2+100,100+Math.sin(self.ticks/10)*10,"#000000","#FFFFFF");
    }

    canv.context.drawImage(screen_cover_img,0,0,canv.canvas.width,canv.canvas.height);

    canv.context.fillStyle = blue;
    canv.context.fillRect(0,0,canv.canvas.width,40);
    canv.context.drawImage(yard_logo_img,10,7,70,25);
    canv.context.fillStyle = "#FFFFFF";
    canv.context.font = "25px stump";
    canv.context.textAlign = "right";
    canv.context.fillText("The Wind Generator",canv.canvas.width-70,30);
    canv.context.drawImage(menu_img,self.menu_button.x,self.menu_button.y,self.menu_button.w,self.menu_button.h);

    self.clip.draw(canv);

    if(self.game_mode == GAME_MODE_BLURB)
      self.blurb.draw(canv);

    self.clip.cleanse();
  };

  self.cleanup = function()
  {
  };

};

