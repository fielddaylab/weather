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
  var Brush = function(w,h, scene)
  {
    var self = this;
    self.x = 0;
    self.y = 0;
    self.w = w;
    self.h = h;

    self.r = 0.1;
    self.delta = 0.02;

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

  var ENUM;

  self.presser;

  self.pmap;
  self.vfield;
  self.afield;
  self.brush;

  ENUM = 0;
  var P_TYPE_HIGH = ENUM; ENUM++;
  var P_TYPE_LOW  = ENUM; ENUM++;
  self.p_type = P_TYPE_LOW;
  self.p_type_toggle_h;
  self.p_type_toggle_l;

  self.ready = function()
  {
    self.presser = new Presser({source:stage.dispCanv.canvas});
    self.dragger = new Dragger({source:stage.dispCanv.canvas});

    var cells_x = 20;
    var cells_y = 20;
    self.pmap = new HeightMap(cells_x,cells_y);
    self.vfield = new VecField2d(25,25);
    self.afield = new AirField(5000);
    self.brush = new Brush(stage.dispCanv.canvas.width,stage.dispCanv.canvas.height,self);
    self.dragger.register(self.brush);

    self.p_type_toggle_h = new ToggleBox(10,10,20,20, false, function(o) { self.p_type = !o; self.p_type_toggle_l.on =  self.p_type; });
    self.p_type_toggle_l = new ToggleBox(40,10,20,20,  true, function(o) { self.p_type =  o; self.p_type_toggle_h.on = !self.p_type; });
    self.presser.register(self.p_type_toggle_h)
    self.presser.register(self.p_type_toggle_l)
  };

  self.ticks = 0;
  self.tick = function()
  {
    self.presser.flush();
    self.dragger.flush();

    //self.pmap.anneal(0.001);
    self.brush.tick();

    //calc wind
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

    //update particles
    var x;
    var y;
    for(var i = 0; i < self.afield.n; i++)
    {
      self.afield.partts[i] -= 0.01;
      if(self.afield.partts[i] <= 0)
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

    self.ticks++;
  };

  self.draw = function()
  {
    var canv = stage.drawCanv;
    canv.context.lineWidth = 0.5;

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
        var color = Math.round(self.pmap.data[index]*255);
        canv.context.fillStyle = "rgba("+color+","+color+","+color+",1)";
        canv.context.fillRect(x,y,x_space+1,y_space+1);
        //canv.context.strokeStyle = "#ff0000";
        //canv.context.strokeRect(x,y,x_space,y_space);
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

    self.p_type_toggle_h.draw(canv);
    self.p_type_toggle_l.draw(canv);
  };

  self.cleanup = function()
  {
  };

};

