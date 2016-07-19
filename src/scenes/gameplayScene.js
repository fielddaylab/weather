var default_complete = false;
var paint = false;
var sys = !paint;
var anneal = true;
var airdeath = true;
var tools = false;
var tools_explicit = false;
var save_state = true;
var save_cookie = false;
var save_url = !save_cookie;
var placer_debug = false;

var vec_length = 5;
var flag_length = 20;

var click_aud;
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
var green_flag_tip_img;
var green_flag_tail_img;
var dotted_flag_tip_img;
var dotted_flag_tail_img;

var blue = "#76DAE2";

var global_bg_alpha;
var global_blurb_up;
var global_ticks;
var drawCanv;

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

var GamePlayScene = function(game, stage)
{
  var self = this;
  drawCanv = stage.drawCanv;

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

    self.cache_w = self.w*stage.drawCanv.width;
    self.cache_h = self.h*stage.drawCanv.height;
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
      click_aud.play();
      self.drag(evt);
    }
    self.drag = function(evt)
    {
      clampDrag(evt);
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
  var PSys = function(x,y,r,delta,visible,scene)
  {
    var self = this;
    self.start_sx = x;
    self.start_sy = y;
    self.r = r;
    self.w = 30;
    self.h = 30;
    self.visible = visible;

    self.delta = delta;
    if(self.delta > 0) self.img = icon_h_img;
    else self.img = icon_l_img;

    self.reset = function()
    {
      self.sx = self.start_sx;
      self.sy = self.start_sy;
      self.x = self.sx*stage.drawCanv.width-(self.w/2);
      self.y = self.sy*stage.drawCanv.height-(self.h/2);
      self.dragging = false;
      self.hovering = false;
      self.dragged = false;
    }
    self.reset();

    self.dragging = false;
    self.hovering = false;
    self.dragged = false;

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
      click_aud.play();
      if(scene.dragging_sys || scene.dragging_tool) return;
      scene.dragging_sys = self;
      self.dragging = true;
      self.dragged = true;
    }
    self.drag = function(evt)
    {
      clampDrag(evt);
      if(self.dragging)
      {
        self.sx = evt.doX/stage.drawCanv.width;
        self.sy = evt.doY/stage.drawCanv.height;
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
      if(!self.visible) return;
      if(scene.cur_level >= 5)
      {
        if(!self.dragged)
        {
          canv.context.font = "20px stump";
          canv.context.textAlign = "right";
          canv.outlineText("Drag ->",self.x-20,self.y+self.h/2+10+Math.sin(global_ticks/10)*5,"#000000","#FFFFFF");
        }
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
    self.x = self.sx*stage.drawCanv.width-self.w-5;
    self.y = self.sy*stage.drawCanv.height-self.h-5;
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
      click_aud.play();
      if(scene.dragging_tool || scene.dragging_sys) return;
      scene.dragging_tool = self;
      self.dragging = true;
    }
    self.drag = function(evt)
    {
      clampDrag(evt);
      if(self.dragging)
      {
        self.sx = (evt.doX+(self.w/2)+5)/stage.drawCanv.width;
        self.sy = (evt.doY+(self.h/2)+5)/stage.drawCanv.height;
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
      canv.context.font = "20px Open Sans";
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
      canv.context.strokeRect(self.sx*canv.width-sample_size/2,self.sy*canv.height-sample_size/2,sample_size,sample_size);

      if(self.explicit)
      {
        canv.context.font = "20px Open Sans";
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
      click_aud.play();
      if(self.level_i == 0 || self.req_level.complete)
      {
        scene.beginLevel(self.level_i);
        scene.setMode(GAME_MODE_PLAY);
        if(self.level.new_blurbs && self.level.new_blurbs.length > 0)
        {
          scene.blurb.loadDialog(self.level.new_blurbs, stage.drawCanv);
          scene.setMode(GAME_MODE_BLURB);
        }
        else if(self.level.text_0 && self.level.text_0 != "")
        {
          scene.blurb.loadLegacy(self.level.text_0, self.level.text_1, stage.drawCanv);
          scene.setMode(GAME_MODE_BLURB);
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

  var ClipBoard = function(w,h,scene,levels)
  {
    var self = this;

    self.w = w;
    self.h = h;
    self.pretend_y = 20;
    self.desired_y = 20;

    self.buttons = [];
    self.dismiss_button = new ButtonBox(self.w-20-20,20,20,20, function(on) { scene.setMode(GAME_MODE_PLAY); }); self.buttons.push(self.dismiss_button);
    self.dismiss_button.draw = function(canv) { return; }

    for(var i = 0; i < 9; i++)
    {
      var b;
      var bs = 80;

      b = new LevelButtonBox(i,bs,scene);
      if(i == 0)
      {
        b.x = scene.dc.width/2-(bs/2);
        b.y = 200;
      }
      else if(i < 5)
      {
        b.x = scene.dc.width/2-(bs*2+60)+((i-1)*(bs+40));
        b.y = 200+bs+40;
      }
      else
      {
        b.x = scene.dc.width/2-(bs*2+60)+((i-5)*(bs+40));
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
          canv.context.drawImage(lvl_button_outline_img,this.x-s,this.y-s,this.w+s*2,this.h+s*2);
        }
        canv.context.drawImage(lvl_button_img,this.x,this.y,this.w,this.h);
      }
      else
      {
        canv.context.drawImage(lvl_button_fade_img,this.x,this.y,this.w,this.h);
        canv.context.drawImage(lvl_button_lock_img,this.x+this.w-40,this.y-20,60,60);
      }
      if(levels[this.level_i].complete)
      {
        canv.context.drawImage(lvl_button_check_img,this.x+20,this.y+20,this.h-40,this.h-40);
      }
      else
      {
        canv.context.font = "70px stump";
        canv.context.fillStyle = "#FFFFFF";
        canv.context.textAlign = "center";
        canv.context.fillText(this.title,this.x+this.w/2,this.y+this.h-10);
      }

    }
    for(var i = 0; i < self.buttons.length; i++)
    {
      var b = self.buttons[i];
      b.def_y = b.y-self.pretend_y;
      if(i != 0) //for dismiss button, I know, hack
        b.draw = draw;
    }

    self.draw = function(canv)
    {
      global_bg_alpha = (1-((self.pretend_y*10)/self.h));
      canv.context.fillStyle = "rgba(118,218,227,"+global_bg_alpha+")";
      canv.context.fillRect(0,0,self.w,self.h);

      canv.context.font = "100px stump";
      canv.context.textAlign = "center";
      canv.context.fillStyle = "#FFFFFF";
      canv.context.fillText("Levels",self.w/2,150+self.pretend_y);

      canv.strokeStyle = "#000000";

      for(var i = 0; i < self.buttons.length; i++)
        self.buttons[i].draw(canv);
    }

    self.tick = function()
    {
      if(self.desired_y != self.y)
      {
        if(Math.abs(self.desired_y-self.pretend_y) < 1) self.pretend_y = self.desired_y;
        else self.pretend_y = lerp(self.pretend_y, self.desired_y, 0.2);

        for(var i = 0; i < self.buttons.length; i++)
        {
          var b = self.buttons[i];
          b.y = b.def_y+self.pretend_y;
        }
      }
    }

    self.register = function(clicker)
    {
      for(var i = 0; i < self.buttons.length; i++)
        clicker.register(self.buttons[i]);
    }
  }

  var Blurb = function(scene)
  {
    var self = this;
    setBox(self,p(0.812987012987013,drawCanv.width),p(0.8046875,drawCanv.height),p(0.11168831168831168,drawCanv.width),p(0.0546875,drawCanv.height));

    self.txt = "";
    self.lines;
    self.img = "";
    self.img_x = 0;
    self.img_y = 0;
    self.img_w = 0;
    self.img_h = 0;
    self.img_el;

    self.text_x = p(0.21948051948051947,drawCanv.width);
    self.text_y = p(0.7515625,drawCanv.height);
    self.text_width = p(0.5324675324675324,drawCanv.width);

    var box_height = 188;

    self.loadDialog = function(dialog, canv)
    {
      var first_line = dialog[0];
      self.img = first_line[0];
      self.txt = first_line[1];
      self.rest_lines = dialog.slice(1);
      self.canv = canv;
      self.format(canv);
      scene.setMode(GAME_MODE_BLURB);
    };

    self.loadLegacy = function(text_0, text_1, canv)
    {
      var dialog = [['scout', text_0]];
      if(text_1 && text_1 != "")
        dialog.push(['scout', text_1]);
      self.loadDialog(dialog, canv);
    };

    self.format = function(canv)
    {
      self.lines = [];
      var found = 0;
      var searched = 0;
      var tentative_search = 0;

      canv.context.font = "20px Open Sans";

      //stage.drawCanv.context.font=whaaaat;
      while(found < self.txt.length)
      {
        searched = self.txt.indexOf(" ",found);
        if(searched == -1) searched = self.txt.length;
        tentative_search = self.txt.indexOf(" ",searched+1);
        if(tentative_search == -1) tentative_search = self.txt.length;
        while(canv.context.measureText(self.txt.substring(found,tentative_search)).width < self.text_width && searched != self.txt.length)
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
        switch(self.img)
        {
          case 'francis':
            self.img_x = p(0,canv.width);
            self.img_y = p(0.55,canv.height);
            self.img_w = p(0.2,drawCanv.width);
            self.img_h = p(0.4247159090909091,drawCanv.height);
            break;
          case 'honey':
            self.img_x = p(0,canv.width);
            self.img_y = p(0.55,canv.height);
            self.img_w = p(0.23,drawCanv.width);
            self.img_h = p(0.4,drawCanv.height);
            break;
          case 'jack':
            self.img_x = p(0,canv.width);
            self.img_y = p(0.6,canv.height);
            self.img_w = p(0.23,drawCanv.width);
            self.img_h = p(0.368,drawCanv.height);
            break;
          case 'scout':
          default:
            self.img_x = p(0.02987012987012987,canv.width);
            self.img_y = p(0.5,canv.height);
            self.img_w = p(0.14675324675324675,drawCanv.width);
            self.img_h = p(0.4671875,drawCanv.height);
            break;
        }
      }
      else
        self.img_el = undefined;
    }

    self.draw = function(canv)
    {
      global_bg_alpha = (1-((20*10)/canv.height));
      canv.context.fillStyle = "rgba(118,218,227,"+global_bg_alpha+")";
      canv.context.fillRect(0,0,canv.width,canv.height);
      var box_height = 188;
      canv.context.fillStyle = blue;
      canv.context.fillRect(0,canv.height-box_height,canv.width,box_height);

      canv.context.font = "20px Open Sans";
      canv.context.textAlign = "left";
      canv.context.fillStyle = "#FFFFFF";
      for(var i = 0; i < self.lines.length; i++)
        canv.context.fillText(self.lines[i],self.text_x,self.text_y+((i+1)*24),self.text_width);

      if(self.img_el)
        canv.context.drawImage(self.img_el, self.img_x, self.img_y, self.img_w, self.img_h);

      canv.context.lineWidth = 3;
      canv.context.strokeStyle = "#5CABB3";
      canv.context.beginPath();
      canv.context.moveTo(p(0.7688311688311689,drawCanv.width),p(0.75,drawCanv.height));
      canv.context.lineTo(p(0.7688311688311689,drawCanv.width),p(0.96875,drawCanv.height));
      canv.context.stroke();
      canv.context.lineWidth = 1;

      canv.context.drawImage(next_button_img,self.x,self.y,self.w,self.h);
    }

    self.click = function(evt)
    {
      click_aud.play();
      if (self.rest_lines && self.rest_lines.length > 0)
        self.loadDialog(self.rest_lines, self.canv);
      else
        scene.setMode(GAME_MODE_PLAY);
    }
  }

  var Flag = function(x,y,xd,yd,scene)
  {
    var self = this;

    self.w = 27;
    self.h = 27;

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
      self.x = self.sx*stage.drawCanv.width-(self.w/2);
      self.y = self.sy*stage.drawCanv.height-(self.h/2);
      self.dragging = false;
      self.hovering = false;
      self.dragged = false;
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
    self.dragged = false;

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
      click_aud.play();
      if(scene.dragging_flag) return;
      scene.dragging_flag = self;
      self.dragging = true;
      self.dragged = true;
    }
    self.drag = function(evt)
    {
      clampDrag(evt);
      if(self.dragging)
      {
        if(platform == "MOBILE")
        {
          evt.doY -= 30;
          if(evt.doY < 0) evt.doY = 0;
        }
        self.sx = evt.doX/stage.drawCanv.width;
        self.sy = evt.doY/stage.drawCanv.height;
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

      self.cache_x = self.sx*canv.width;
      self.cache_y = self.sy*canv.height;

      //line
      canv.context.lineWidth = 2;
      canv.context.strokeStyle = "#FFFFFF";
      canv.context.setLineDash([5,5]);
      canv.context.beginPath();
      canv.context.moveTo(self.cache_x-self.goal_cache_xd,self.cache_y-self.goal_cache_yd);
      canv.context.lineTo(self.cache_x+self.goal_cache_xd,self.cache_y+self.goal_cache_yd);
      canv.context.stroke();
      canv.context.setLineDash([0,0]);

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

      //if(self.hovering || self.dragging)
      if(scene.cur_level < 5)
      {
        canv.context.beginPath();
        canv.context.arc(self.x+self.w/2,self.y+self.h/2,self.w/2,0,2*Math.PI);
        canv.context.stroke();

        if(!self.dragged)
        {
          canv.context.font = "20px stump";
          canv.context.textAlign = "right";
          canv.outlineText("Drag ->",self.x-20,self.y+self.h/2+10+Math.sin(global_ticks/10)*5,"#000000","#FFFFFF");
        }
      }

      //line
      if(self.met) canv.context.strokeStyle = "#86E11B";
      else         canv.context.strokeStyle = "#BF1717";
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
      if(self.met) canv.context.drawImage(green_flag_tip_img,-l,-l,2*l,2*l);
      else         canv.context.drawImage(flag_tip_img,-l,-l,2*l,2*l);
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
      if(self.met) canv.context.drawImage(green_flag_tail_img,-l,-l,2*l,2*l);
      else         canv.context.drawImage(flag_tail_img,-l,-l,2*l,2*l);
      canv.context.restore();
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
  self.next_button;
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
  self.placer_dragger;
  self.placer_clicker;
  self.placer;

  self.ready = function()
  {
    global_bg_alpha = 0;
    global_blurb_up = false;
    global_ticks = 0;

    self.dc = stage.drawCanv;
    click_aud = new Aud("assets/click_0.wav");
    click_aud.load();
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
    green_flag_tip_img = new Image(); green_flag_tip_img.src = "assets/vane-tip-green.png";
    green_flag_tail_img = new Image(); green_flag_tail_img.src = "assets/vane-tail-green.png";
    dotted_flag_tip_img = new Image(); dotted_flag_tip_img.src = "assets/dotted-vane-tip.png";
    dotted_flag_tail_img = new Image(); dotted_flag_tail_img.src = "assets/dotted-vane-tail.png";
    next_button_img = new Image(); next_button_img.src = "assets/nextbtn-white.png";

    self.menu_clicker = new Clicker({source:stage.dispCanv.canvas});
    self.bin_presser = new Presser({source:stage.dispCanv.canvas});
    self.bin_dragger = new Dragger({source:stage.dispCanv.canvas});
    self.play_clicker = new Clicker({source:stage.dispCanv.canvas});
    self.play_presser = new Presser({source:stage.dispCanv.canvas});
    self.play_hoverer = new Hoverer({source:stage.dispCanv.canvas});
    self.play_dragger = new Dragger({source:stage.dispCanv.canvas});
    self.blurb_clicker = new Clicker({source:stage.dispCanv.canvas});
    if(placer_debug)
    {
      self.placer_dragger = new Dragger({source:stage.dispCanv.canvas});
      self.placer_clicker = new Clicker({source:stage.dispCanv.canvas});
    }

    self.cur_level = 0;
    self.levels = [];

    //MYLEVELS
    var l;

    //playground
    l = new Level();
    l.type = L_TYPE_NONE;
    l.psys.push(new PSys(0.4,0.5,0.1,-0.1,true,self));
    l.psys.push(new PSys(0.6,0.5,0.1, 0.1,true,self));
    l.new_blurbs = [
      ["francis", "The wind simulator helps you see how high and low pressure systems affect the wind."],
      ["honey", "I wanna play!"],
      ["francis", "Okay, but be sure to pay attention to what happens when you add and move the H and L. They can get that wind blowing!"],
      ["honey", "What are those?"],
      ["francis", "The H and the L are the HIGH and the LOW pressure systems."],
    ];
    l.text_0 = "This is a wind simulator. This simulator will help you observe how interactions between high and low pressure systems affect the speed and direction of wind. Before you start Level 1, just play around a little.";
    l.text_1 = "You can see that the map shows a high-pressure system (H) and a low-pressure system (L). Drag around these pressure systems, and see what happens to the directions of speed of the wind. When you are ready to begin Level 1, click menu.";
    self.levels.push(l);

    //blow north
    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.3,0.5,0.0,-1.5,self));
    l.psys.push(new PSys(0.4,0.5,0.1,-0.1,true,self));
    l.psys.push(new PSys(0.6,0.5,0.1, 0.1,true,self));
    l.new_blurbs = [
      ["francis", "The arrows are like flags and they point in the direction the wind is blowing."],
      ["francis", "Here, the white arrow is pointing the way you want the wind to blow: north. The arrow's length shows how fast the wind is blowing."],
      ["francis", "I'm pretty good at figuring out where the wind is blowing. Your turn!"],
    ];
    l.text_0 = "The white arrow points in the direction you want the wind to blow - north - and its length indicates how fast it is blowing.";
    l.text_1 = "Drag the vane around the map to find a position where the wind is blowing strongly north.";
    self.levels.push(l);

    //blow east
    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.3,0.5,1.5,0.0,self));
    l.psys.push(new PSys(0.5,0.4,0.1,-0.1,true,self));
    l.psys.push(new PSys(0.5,0.6,0.1, 0.1,true,self));
    l.new_blurbs = [
      ["francis", "Wanna see if you can find a place where the wind is blowing strongly to the east?"],
    ];
    l.text_0 = "The white arrow points in the direction you want the wind to blow - east - and its length indicates how fast it is blowing.";
    l.text_1 = "Drag the vane around the map to find a position where the wind is blowing strongly east.";
    self.levels.push(l);

    //blow south (laterally surrounded L)
    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.6,0.6,0.0,1.0,self));
    l.psys.push(new PSys(0.5,0.5,0.1,-0.1,true,self));
    l.psys.push(new PSys(0.3,0.5,0.1, 0.1,true,self));
    l.psys.push(new PSys(0.7,0.5,0.1, 0.1,true,self));
    l.new_blurbs = [
      ["honey", "I totally get it now! I bet you can find a place where the wind is blowing to the south now."],
    ];
    l.text_0 = "The white arrow points in the direction you want the wind to blow - south - and its length indicates how fast it is blowing.";
    l.text_1 = "Drag the vane around the map to find a position where the wind is blowing strongly south.";
    self.levels.push(l);

    //full circle of flags
    l = new Level();
    l.type = L_TYPE_FLAG;
    var i = 0;
    l.flags.push(new Flag(0.33,0.8-(i/6)*0.7,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    l.flags.push(new Flag(0.33,0.8-(i/6)*0.7,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    l.flags.push(new Flag(0.33,0.8-(i/6)*0.7,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    l.flags.push(new Flag(0.33,0.8-(i/6)*0.7,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    l.flags.push(new Flag(0.33,0.8-(i/6)*0.7,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    l.flags.push(new Flag(0.33,0.8-(i/6)*0.7,Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2),self)); i++;
    i = 0;
    l.psys.push(new PSys(0.5,0.5,0.1, -0.1,true,self));
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,true,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,false,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,true,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,false,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,true,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,false,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,true,self)); i++;
    l.psys.push(new PSys(0.5+(Math.cos(i/8*Math.PI*2)*0.3),0.5+(Math.sin(i/8*Math.PI*2)*0.3),0.1, 0.1,false,self)); i++;
    l.psys.push(new PSys(0.1,0.1,0.1, 0.1,false,self));
    l.psys.push(new PSys(0.9,0.1,0.1, 0.1,false,self));
    l.psys.push(new PSys(0.1,0.9,0.1, 0.1,false,self));
    l.psys.push(new PSys(0.9,0.9,0.1, 0.1,false,self));
    l.psys.push(new PSys(0.1,0.5,0.1, 0.1,false,self));
    l.psys.push(new PSys(0.5,0.1,0.1, 0.1,false,self));
    l.psys.push(new PSys(0.9,0.5,0.1, 0.1,false,self));
    l.psys.push(new PSys(0.5,0.9,0.1, 0.1,false,self));
    l.new_blurbs = [
      ["honey", "Whoa, that's so many arrows! I don't think I can do this!!"],
      ["francis", "Yeah, it looks like more but it's the same idea as before. There is a trick if you need help. You can turn on the Vector (click the EYE) to see the direction the wind is going."],
    ];
    l.text_0 = "Drag each vane to a position where it matches its white arrow.";
    l.text_1 = "Click the eye to enable different visualizations for the wind- Can you see the underlying pattern of wind motion?";
    self.levels.push(l);

    //use systems
    l = new Level();
    l.type = L_TYPE_SYS;
    l.flags.push(new Flag(0.5,0.5,-2.0,0.0,self));
    l.psys.push(new PSys(0.2,0.5,0.1,-0.1,true,self));
    l.psys.push(new PSys(0.8,0.5,0.1, 0.1,true,self));
    l.new_blurbs = [
      ["francis", "You've got the hang of moving the arrows to find the wind's direction. Now you get to be in charge of moving the wind around! Move the high-pressure and low-pressure systems to blow the flags."],
    ];
    l.text_0 = "Drag the high-pressure and low-pressure systems to blow the red vane in the same speed and direction as the white vane.";
    l.text_1 = "Make sure to use both types of systems!";
    self.levels.push(l);

    //use systems- at an angle
    l = new Level();
    l.type = L_TYPE_SYS;
    l.flags.push(new Flag(0.5,0.5,2.0,2.0,self));
    l.psys.push(new PSys(0.2,0.5,0.1,-0.1,true,self));
    l.psys.push(new PSys(0.8,0.5,0.1, 0.1,true,self));
    l.new_blurbs = [
      ["honey", "Easy peasy. This one looks just like the last one."],
    ];
    l.text_1 = "Just as you did in the previous level, drag the high-pressure and low-pressure systems to blow the red vane in the same speed and direction as the white.";
    self.levels.push(l);

    //cyclone
    l = new Level();
    l.type = L_TYPE_SYS;
    l.flags.push(new Flag(0.40,0.5,0.0,1.5,self));
    l.flags.push(new Flag(0.60,0.5,0.0,-1.5,self));
    l.psys.push(new PSys(0.2,0.2,0.1, 0.1,true,self));
    l.psys.push(new PSys(0.2,0.4,0.1,-0.1,true,self));
    l.psys.push(new PSys(0.2,0.6,0.1, 0.1,true,self));
    l.psys.push(new PSys(0.2,0.8,0.1,-0.1,true,self));
    l.new_blurbs = [
      ["francis", "See if you can create a cyclone—like a tornado. You'll need three pressure systems to get one going."],
    ];
    l.text_0 = "Place the high-pressure and low-pressure systems to create a cyclone (also called a tornado) in the directions indicated by the white vanes.";
    l.text_1 = "You should only need three pressure systems to create a cyclone.";
    self.levels.push(l);

    //anticyclone
    l = new Level();
    l.type = L_TYPE_SYS;
    l.flags.push(new Flag(0.5,0.35,1.5,0.0,self));
    l.flags.push(new Flag(0.5,0.65,-1.5,0.0,self));
    l.psys.push(new PSys(0.2,0.2,0.1,-0.1,true,self));
    l.psys.push(new PSys(0.2,0.4,0.1, 0.1,true,self));
    l.psys.push(new PSys(0.2,0.6,0.1,-0.1,true,self));
    l.psys.push(new PSys(0.2,0.8,0.1, 0.1,true,self));
    l.new_blurbs = [
      ["honey", "Wait a minute, this cyclone looks different—it's going in the opposite direction!"],
    ];
    l.text_0 = "Again, try to create a cyclone - This time, in the opposite direction!";
    l.text_1 = "Notice difference in severity from your previous cyclone?";
    self.levels.push(l);

    if(save_state)
    {
      var levels_string;
      if(save_cookie) levels_string = document.cookie;
      else if(save_url) levels_string = document.location.hash.substring(1);
      if(levels_string && levels_string.indexOf("LEVELS=") != -1)
      {
        console.log("Reading levels:"+levels_string);
        levels_string = (levels_string.substr(levels_string.indexOf("LEVELS=")+7,self.levels.length)).split('');
        for(var i = 0; i < self.levels.length; i++)
        {
          var c = parseInt(levels_string[i]);
          if(!isNaN(c) && c > 0) self.levels[i].complete = true;
        }
      }
    }

    self.clip = new ClipBoard(stage.drawCanv.width,stage.drawCanv.height,self,self.levels);
    self.clip.register(self.menu_clicker);
    self.blurb = new Blurb(self);
    self.blurb_clicker.register(self.blurb);

    window.addEventListener('menuButton', function(){ click_aud.play(); self.setMode(GAME_MODE_MENU); }, false);

    self.next_button = new ButtonBox(stage.drawCanv.width/2-100,50,200,100, function(on) { if(self.levels[self.cur_level].complete_this_round) { click_aud.play(); self.setMode(GAME_MODE_MENU); }});
    self.play_clicker.register(self.next_button);

    self.options_button = new ButtonBox(stage.drawCanv.width-130,stage.drawCanv.height-100,40,40, function(on) { click_aud.play(); self.options_open = !self.options_open; if(self.options_open) self.options_dir = -1; else self.options_dir = 1; });
    self.play_clicker.register(self.options_button);

    self.quality_button = new ButtonBox(stage.drawCanv.width-280,100,40,40, function(on)
    {
      if(!self.options_open) return;
      click_aud.play();
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
    self.vec_button = new ButtonBox(stage.drawCanv.width-280,180,40,40, function(on) { if(!self.options_open) return; click_aud.play(); self.vec_mode = !self.vec_mode; });
    self.air_button = new ButtonBox(stage.drawCanv.width-280,230,40,40, function(on) { if(!self.options_open) return; click_aud.play(); self.air_mode = !self.air_mode; });
    self.help_button = new ButtonBox(stage.drawCanv.width-280,280,40,40, function(on)
    {
      if(!self.options_open) return;
      click_aud.play();
      var l = self.levels[self.cur_level];
      if(l.new_blurbs && l.new_blurbs.length > 0)
      {
        scene.blurb.loadDialog(l.new_blurbs, stage.drawCanv);
        scene.setMode(GAME_MODE_BLURB);
      }
      else if(l.text_0 && l.text_0 != "")
      {
        scene.blurb.loadLegacy(l.text_0, l.text_1, stage.drawCanv);
        scene.setMode(GAME_MODE_BLURB);
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

    self.pmap = self.pmap_lq;
    self.vfield = self.vfield_lq;
    self.afield = self.afield_lq;

    self.balloon = new Balloon();

    if(paint)
    {
      self.brush = new Brush(stage.drawCanv.width,stage.drawCanv.height,self);
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
          var p = new PSys(0.,0.,0.1,0.1,true,self);
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
          var p = new PSys(0.,0.,0.1,-0.1,true,self);
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
    self.quality_mode = false;
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

    if(placer_debug)
    {
      self.placer = new Placer({},10,10,100,100,self);
      self.placer_dragger.register(self.placer);
      self.placer_clicker.register(self.placer);
    }
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

    if(self.game_mode == GAME_MODE_MENU) self.clip.desired_y = 20;
    if(self.game_mode == GAME_MODE_PLAY) self.clip.desired_y = stage.drawCanv.height;
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

  self.tick = function()
  {
    if(placer_debug)
    {
      self.placer_dragger.flush();
      self.placer_clicker.flush();
    }
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
    if(self.options_x > stage.drawCanv.width)     self.options_x = stage.drawCanv.width;
    if(self.options_x < stage.drawCanv.width-300) self.options_x = stage.drawCanv.width-300;

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
        if(!l.complete)
        {
          l.complete = true;
          if(save_state)
          {
            var levels_string = "LEVELS=";
            for(var i = 0; i < self.levels.length; i++)
            {
              if(self.levels[i].complete) levels_string += "1";
              else                        levels_string += "0";
            }
            if(save_cookie) document.cookie = levels_string;
            else if(save_url) document.location.hash = levels_string;
            console.log("Wrote levels:"+levels_string);
          }
        }
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

    global_ticks++;
  };

  self.draw = function()
  {
    var canv = stage.drawCanv;

    canv.context.drawImage(screen_bg_img,0,20,canv.width,canv.height-20);

    var x_space;
    var y_space;
    var x;
    var y;
    var index;
    /*
    // pressure height map
    */
    x_space = canv.width / self.pmap.w;
    y_space = canv.height / self.pmap.h;
    var px = 0;
    var py = 1;
    if(self.quality_mode)
    {
      py = 3;
      px = 1;
    }
    //starts at p, ends at -p to not draw borders (they leak out the sides of the assets)
    for(var i = py; i < self.pmap.h-py; i++)
    {
      for(var j = px; j < self.pmap.w-px; j++)
      {
        y = y_space*i;
        x = x_space*j;
        index = self.pmap.iFor(j,i);
        var color = .8-(self.pmap.data[index]*.8);
        canv.context.fillStyle = "rgba(0,0,0,"+color+")";
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
      x_space = canv.width / self.vfield.w;
      y_space = canv.height / self.vfield.h;
      //starts at p, ends at -p to not draw borders (they leak out the sides of the assets)
      for(var i = py; i < self.vfield.h-py; i++)
      {
        for(var j = px; j < self.vfield.w-px; j++)
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
      {
        if(self.afield.partxs[i] < 0.05 || self.afield.partxs[i] > 0.95 || self.afield.partys[i] < 0.05 || self.afield.partys[i] > 0.95) continue;
        canv.context.fillRect(self.afield.partxs[i]*canv.width-1,self.afield.partys[i]*canv.height-1,2,2);
      }
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
      //canv.context.fillStyle = "#FF0000";
      //canv.context.fillRect((self.balloon.x*canv.width)-(self.balloon.cache_w/2),(self.balloon.y*canv.height)-(self.balloon.cache_h/2),self.balloon.cache_w,self.balloon.cache_h);
    }

    /*
    // UI
    */
    canv.context.lineWidth = 0.5;
    if(paint)
    {
      self.p_type_toggle_h.draw(canv);
      self.p_type_toggle_l.draw(canv);
      canv.context.font = "20px Open Sans";
      canv.outlineText("H",self.p_type_toggle_h.x,self.p_type_toggle_h.y+self.p_type_toggle_h.h,"#FFFFFF","#000000");
      canv.outlineText("L",self.p_type_toggle_l.x,self.p_type_toggle_l.y+self.p_type_toggle_l.h,"#000000","#FFFFFF");
      canv.context.drawImage(button_h,self.p_type_toggle_h.x,self.p_type_toggle_h.y+self.p_type_toggle_h.h);
      canv.context.drawImage(button_l,self.p_type_toggle_l.x,self.p_type_toggle_l.y+self.p_type_toggle_l.h);
      canv.context.font = "15px Open Sans";
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
    if(self.options_x < canv.width-65)
      canv.context.fillRect(self.options_x,30,(canv.width-65)-self.options_x,canv.height-60);
    if(self.options_open)
    {
      canv.context.font = "25px Open Sans";
      canv.context.fillStyle = "#FFFFFF";
      canv.context.textAlign = "left";

      canv.context.drawImage(icon_close_img,self.options_x+170,self.options_button.y,self.options_button.w,self.options_button.h);

      if(!self.quality_mode) canv.context.drawImage(icon_check_img,         self.options_x+20,self.quality_button.y,self.quality_button.w,self.quality_button.h);
      else                   canv.context.drawImage(icon_check_selected_img,self.options_x+20,self.quality_button.y,self.quality_button.w,self.quality_button.h);
      canv.context.fillText("High Def.",self.options_x+80,self.quality_button.y+self.quality_button.h-10);
      if(!self.vec_mode) canv.context.drawImage(icon_check_img,         self.options_x+20,self.vec_button.y,self.vec_button.w,self.vec_button.h);
      else               canv.context.drawImage(icon_check_selected_img,self.options_x+20,self.vec_button.y,self.vec_button.w,self.vec_button.h);
      canv.context.fillText("Vectors",self.options_x+80,self.vec_button.y+self.vec_button.h-10);
      if(!self.air_mode) canv.context.drawImage(icon_check_img,         self.options_x+20,self.air_button.y,self.air_button.w,self.air_button.h);
      else               canv.context.drawImage(icon_check_selected_img,self.options_x+20,self.air_button.y,self.air_button.w,self.air_button.h);
      canv.context.fillText("Particles",self.options_x+80,self.air_button.y+self.air_button.h-10);

      canv.context.font = "15px Open Sans";
      canv.context.fillText("(uncheck for Chromebook)",self.options_x+20,self.quality_button.y+self.quality_button.h+25);
/*
      canv.context.drawImage(icon_check_img,         self.options_x+20,self.quality_button.y,self.quality_button.w,self.quality_button.h);
      canv.outlineText("Help",self.options_x+80,self.help_button.y+self.help_button.h-10,"#000000","#FFFFFF");
*/
    }
    else
      canv.context.drawImage(icon_eye_img,self.options_button.x,self.options_button.y+5,self.options_button.w,self.options_button.h-10);

    canv.context.drawImage(screen_cover_img,0,20,canv.width,canv.height-20);

    if(self.levels[self.cur_level].complete_this_round)
    {
      canv.context.drawImage(next_button_img,canv.width/2-158/2,80+Math.sin(global_ticks/10)*10,158,56);
    }
    else if(self.levels[self.cur_level].timer > 0)
    {
      canv.context.font = "30px stump";
      canv.context.textAlign = "center";
      canv.outlineText("Hold it!",canv.width/2,100+Math.sin(global_ticks/10)*10,"#000000","#FFFFFF");
      canv.context.font = "20px stump";
      canv.context.textAlign = "left";
      canv.outlineText(""+(Math.round(30-((self.levels[self.cur_level].timer/self.levels[self.cur_level].req_timer)*30))/10),canv.width/2-10,130+Math.sin(global_ticks/10)*10,"#000000","#FFFFFF");
    }

    self.clip.draw(canv);

    if(self.game_mode == GAME_MODE_BLURB)
    {
      global_blurb_up = true;
      self.blurb.draw(canv);
    }
    else global_blurb_up = false;

    if(placer_debug)
    {
      self.placer.draw(canv);
    }
  };

  self.cleanup = function()
  {
  };

  var clampDrag = function(evt)
  {
    var xpad = 65;
    var ypad = 75;
    if(evt.doX < xpad)                 evt.doX = xpad;
    if(evt.doX > drawCanv.width-xpad)  evt.doX = drawCanv.width-xpad;
    if(evt.doY < ypad)                 evt.doY = ypad;
    if(evt.doY > drawCanv.height-ypad) evt.doY = drawCanv.height-ypad;
  }

};

