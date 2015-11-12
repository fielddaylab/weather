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
      ret.dir = Math.atan2(y_val,x_val);

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
      ret.dir = Math.atan2(y_val,x_val);

      return ret;
    }

    self.iFor = self.x_map.iFor;
  }

  self.ready = function()
  {
  };

  self.tick = function()
  {
  };

  self.draw = function()
  {
  };

  self.cleanup = function()
  {
  };

};

