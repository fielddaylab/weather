var GamePlayScene = function(game, stage)
{
  var self = this;

  var HeightMap = function(w,h)
  {
    var self = this;
    self.w = w;
    self.h = h;
    self.buffs = [];
    self.buffs[0] = [];
    self.buffs[1] = [];
    for(var i = 0; i < w*h; i++) self.buffs[0][i] = Math.random();
    for(var i = 0; i < w*h; i++) self.buffs[1][i] = Math.random();
    self.buff = 0;
    self.data = self.buffs[self.buff];

    self.iFor = function(x,y) { return (y*w)+x; }
    self.anneal = function()
    {
      var oldb = self.buff;
      var newb = (self.buff+1)%2;
      for(var y = 0; y < h; y++)
      {
        for(var x = 0; x < w; x++)
        {
          var index = self.iFor(x,y);
          self.buffs[newb][index] = self.buffs[oldb][index];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(((x-1)+w)%w,y)];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(((x+1)+w)%w,y)];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(x,((y-1)+h)%h)];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(x,((y+1)+h)%h)];
          self.buffs[newb][index] /= 5;
        }
      }
      self.buff = (self.buff+1)%2;
    }
    self.sample = function(x,y)
    {
      x = x*self.w;
      y = y*self.h;
      var low_x  = Math.floor(x-0.5+self.w)%self.w;
      var high_x = Math.ceil( x-0.5+self.w)%self.w;
      var low_y  = Math.floor(y-0.5+self.h)%self.h;
      var high_y = Math.ceil( y-0.5+self.h)%self.h;

      var tl = self.data[self.iFor( low_x, low_y)];
      var tr = self.data[self.iFor(high_x, low_y)];
      var bl = self.data[self.iFor( low_x,high_y)];
      var br = self.data[self.iFor(high_x,high_y)];
      var t = lerp(tl,tr,(x+.5)%1);
      var b = lerp(bl,br,(x+.5)%1);

      return lerp(t,b,(y+.5)%1);
    }
    self.takeValsFromHmap = function(hmap)
    {
      for(var y = 0; y < self.h; y++)
      {
        for(var x = 0; x < self.w; x++)
        {
          var index = self.iFor(x,y);
          self.data[index] = hmap.sample(x/self.w,y/self.h);
        }
      }
    }
  }
  var VecField2d = function(w,h)
  {
    var self = this;
    self.w = w;
    self.h = h;
    self.data = [];
    for(var i = 0; i < w*h*2; i++)
    {
      if(i%2)
        self.data[i] = Math.sin(i/200)*5;
      else
        self.data[i] = Math.cos(i/200)*5;
    }

    self.iFor = function(x,y) { return (y*(w*2))+(x*2); }
    self.applyForce = function(xs,ys,xe,ye)
    {
      for(var i = 0; i < h; i++)
      {
        for(var j = 0; j < w; j++)
        {

        }
      }
    }
  }

  self.hmap;
  self.vfield;


  self.ready = function()
  {
    self.lowfhmap = new HeightMap(10,10);
    self.hmap = new HeightMap(200,200);
    self.hmap.takeValsFromHmap(self.lowfhmap);
    self.hmap.anneal();
    self.hmap.anneal();
    self.hmap.anneal();
    self.hmap.anneal();

    self.vfield = new VecField2d(50,50);
  };

  self.tick = function()
  {
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

    x_space = canv.canvas.width / self.hmap.w;
    y_space = canv.canvas.height / self.hmap.h;
    for(var i = 0; i < self.hmap.h; i++)
    {
      for(var j = 0; j < self.hmap.w; j++)
      {
        y = y_space*i;
        x = x_space*j;
        index = self.hmap.iFor(j,i);
        var color = Math.round(self.hmap.data[index]*255);
        canv.context.fillStyle = "rgba("+color+","+color+","+color+",1)";
        canv.context.fillRect(x,y,x_space,y_space);
      }
    }

    x_space = canv.canvas.width / self.vfield.w;
    y_space = canv.canvas.height / self.vfield.h;
    for(var i = 0; i < self.vfield.h; i++)
    {
      for(var j = 0; j < self.vfield.w; j++)
      {
        y = y_space*i;
        x = x_space*j;
        index = self.vfield.iFor(j,i);
        canv.context.strokeStyle = "#ff0000";
        canv.context.strokeRect(x-0.5+x_space/2,y-0.5+y_space/2,1,1);
        canv.context.strokeStyle = "#000000";
        canv.drawLine(x+x_space/2,y+y_space/2,x+self.vfield.data[index]+x_space/2,y+self.vfield.data[index+1]+y_space/2);
      }
    }
  };

  self.cleanup = function()
  {
  };

};

