var paint = false;
var sys = !paint;
var anneal = true;
var airdeath = true;

var ENUM;

ENUM = 0;
var P_TYPE_HIGH = ENUM; ENUM++;
var P_TYPE_LOW  = ENUM; ENUM++;

ENUM = 0;
var L_TYPE_BALLOON = ENUM; ENUM++;
var L_TYPE_FLAG    = ENUM; ENUM++;

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
      var high_x = Math.ceil (x);
      var low_y  = Math.floor(y);
      var high_y = Math.ceil (y);

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
    self.x = self.sx*stage.dispCanv.canvas.width-(self.w/2);
    self.y = self.sy*stage.dispCanv.canvas.height-(self.h/2);

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
        self.sx = evt.doX/stage.dispCanv.canvas.width;
        self.sy = evt.doY/stage.dispCanv.canvas.height;
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

    self.complete = false;
  }

  self.cur_level;
  self.levels;

  self.pmap;
  self.vfield;
  self.afield;
  self.balloon;
  self.brush;
  self.psys;
  self.dragging_sys;

  self.p_type = P_TYPE_LOW;
  self.p_type_toggle_h;
  self.p_type_toggle_l;

  self.p_store_h;
  self.p_store_l;

  self.presser;
  self.hoverer;
  self.dragger;


  self.ready = function()
  {
    self.presser = new Presser({source:stage.dispCanv.canvas});
    self.hoverer = new Hoverer({source:stage.dispCanv.canvas});
    self.dragger = new Dragger({source:stage.dispCanv.canvas});

    self.cur_level = 0;
    self.levels = [];

    self.pmap = new HeightMap(20,20);
    self.vfield = new VecField2d(30,30);
    self.afield = new AirField(5000);
    self.balloon = new Balloon();

    if(paint)
    {
      self.brush = new Brush(stage.dispCanv.canvas.width,stage.dispCanv.canvas.height,self);
      self.dragger.register(self.brush);
    }
    if(sys)
    {
      self.psys = [];
      self.psys.push(new PSys(0.6,0.5,0.1,-0.1,self));
      self.psys.push(new PSys(0.4,0.5,0.1, 0.1,self));
      for(var i = 0; i < self.psys.length; i++)
      {
        self.hoverer.register(self.psys[i]);
        self.dragger.register(self.psys[i]);
      }
    }

    if(paint)
    {
      self.p_type_toggle_h = new ToggleBox(10,10,20,20, false, function(o) { self.p_type = !o; self.p_type_toggle_l.on =  self.p_type; });
      self.p_type_toggle_l = new ToggleBox(40,10,20,20,  true, function(o) { self.p_type =  o; self.p_type_toggle_h.on = !self.p_type; });
      self.presser.register(self.p_type_toggle_h)
      self.presser.register(self.p_type_toggle_l)
    }
    if(sys)
    {
      function fdstart(evt) {  };
      function fdrag(evt) { self.dragging_sys.drag(evt); };
      function fdfinish() { if(self.dragging_sys) self.dragging_sys.dragFinish(); };

      self.p_store_h = new BinBox(10,10,20,20, fdstart, fdrag, fdfinish,
        function(evt)
        {
          var p = new PSys(0.,0.,0.1,0.1,self);
          self.psys.push(p);
          self.hoverer.register(p);
          self.dragger.register(p);
          p.dragStart(evt);
        },
        function()
        {
          var p = self.dragging_sys;
          self.hoverer.unregister(p);
          self.dragger.unregister(p);
          for(var i = 0; i < self.psys.length; i++)
            if(self.psys[i] == p) self.psys.splice(i,1);
          self.dragging_sys = undefined;
        });
      self.p_store_l = new BinBox(40,10,20,20, fdstart, fdrag, fdfinish,
        function(evt)
        {
          var p = new PSys(0.,0.,0.1,-0.1,self);
          self.psys.push(p);
          self.hoverer.register(p);
          self.dragger.register(p);
          p.dragStart(evt);
        },
        function()
        {
          var p = self.dragging_sys;
          self.hoverer.unregister(p);
          self.dragger.unregister(p);
          for(var i = 0; i < self.psys.length; i++)
            if(self.psys[i] == p) self.psys.splice(i,1);
          self.dragging_sys = undefined;
        })
      self.presser.register(self.p_store_h);
      self.presser.register(self.p_store_l);
      self.dragger.register(self.p_store_h);
      self.dragger.register(self.p_store_l);
    }


    //MYLEVELS
    var l;

    l = new Level();
    l.type = L_TYPE_BALLOON;
    l.start = new Checkpoint(0.1,0.1,0.1,0.1);
    l.checkpoints.push(new Checkpoint(0.5,0.5,0.1,0.1));
    self.levels.push(l);

    l = new Level();
    l.type = L_TYPE_FLAG;
    l.flags.push(new Flag(0.5,0.5,0.1,0.1));
    self.levels.push(l);

    self.beginLevel(0);
  };

  self.beginLevel = function(l)
  {
    self.cur_level = l;
    var l = self.levels[self.cur_level];

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
    }
    if(l.type == L_TYPE_FLAG)
    {
      var f;
      for(var i = 0; i < l.flags.length; i++)
      {
        f = l.flags[i];
        f.cache_x = f.x*stage.drawCanv.canvas.width;
        f.cache_y = f.y*stage.drawCanv.canvas.height;
        f.goal_cache_xd = f.goal_xd*stage.drawCanv.canvas.width+f.cache_x;
        f.goal_cache_yd = f.goal_yd*stage.drawCanv.canvas.height+f.cache_y;

        f.goal_cache_l = Math.sqrt(f.goal_xd*f.goal_xd+f.goal_yd*f.goal_yd);
        f.goal_cache_t = Math.atan2(f.goal_yd/f.goal_cache_l,f.goal_xd/f.goal_cache_l);
      }
    }
  }

  self.ticks = 0;
  self.tick = function()
  {
    self.presser.flush();
    self.hoverer.flush();
    self.dragger.flush();

    /*
    // pressure
    */
    if(anneal)
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
            var xd = (j/self.pmap.w)-self.psys[k].sx;
            var yd = (i/self.pmap.h)-self.psys[k].sy;
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
        self.afield.partxs[i] += x/100 + ((Math.random()-0.5)/200);
        self.afield.partys[i] += y/100 + ((Math.random()-0.5)/200);
        if(self.afield.partxs[i] < 0 || self.afield.partxs[i] > 1) self.afield.partts[i] = 0;
        if(self.afield.partys[i] < 0 || self.afield.partys[i] > 1) self.afield.partts[i] = 0;
      }
    }

    /*
    // game objs
    */
    var l = self.levels[self.cur_level];
    if(l.type == L_TYPE_BALLOON)
    {
      //balloon
      x = self.vfield.x_map.sample(self.balloon.x,self.balloon.y);
      y = self.vfield.y_map.sample(self.balloon.x,self.balloon.y);
      self.balloon.x += x/200;// + ((Math.random()-0.5)/200);
      self.balloon.y += y/200;// + ((Math.random()-0.5)/200);
      //checkpoints
      var c;
      for(var i = 0; i < l.checkpoints.length; i++)
      {
        c = l.checkpoints[i];
        if(objIntersectsObj(self.balloon,c))
          c.met = true;
        else c.met = false;
      }
    }
    if(l.type == L_TYPE_FLAG)
    {
      //flags
      var cart = {x:0,y:0};
      var polar = {dir:0,len:0};
      var f;
      for(var i = 0; i < l.flags.length; i++)
      {
        f = l.flags[i];
        self.vfield.sampleFill(f.x,f.y,cart);
        f.xd = cart.x/10;
        f.yd = cart.y/10;
        self.vfield.samplePolarFill(f.x,f.y,polar);
        if(f.goal_cache_l < polar.len && Math.abs(f.goal_cache_t-polar.dir) < 0.1)
          f.met = true;
        else f.met = false;
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
        canv.drawLine(x,y,x+self.vfield.x_map.data[index]*10,y+self.vfield.y_map.data[index]*10);
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
        if(f.met)
        canv.context.strokeStyle = "#00FF00";
        else
        canv.context.strokeStyle = "#FF0000";
        canv.context.beginPath();
        canv.context.moveTo(f.cache_x,f.cache_y);
        canv.context.lineTo(f.cache_x+(f.xd*canv.canvas.width),f.cache_y+(f.yd*canv.canvas.height));
        canv.context.stroke();
      }
    }

    /*
    // UI
    */
    if(paint)
    {
      self.p_type_toggle_h.draw(canv);
      self.p_type_toggle_l.draw(canv);
    }
    if(sys)
    {
      self.p_store_h.draw(canv);
      self.p_store_l.draw(canv);
    }
  };

  self.cleanup = function()
  {
  };

};

